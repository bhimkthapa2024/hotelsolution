'use server';

import { auth as adminAuth, db as firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";
import { validateRequest, enforcePermission } from "@/lib/session";
import { redirect } from "next/navigation";
import { serialize } from "@/lib/utils";
import admin from 'firebase-admin';
import { cache } from 'react';

// --- AUTH CORE (FIREBASE) ---

export async function login(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken.email_verified) {
       return { success: false, error: "SECURITY PROTOCOL: Email address unverified." };
    }

    // Enforce Firestore Membership
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
       const byEmail = await firestore.collection('users').where('email', '==', decodedToken.email).get();
       if (byEmail.empty) {
          return { success: false, error: "ACCESS DENIED: User identity not registered in the central system." };
       }
    }

    // Check approval status
    const userData = userDoc.data();
    if (userData?.status === 'pending') {
      return { success: false, error: "PENDING_APPROVAL: Your account is awaiting admin approval. Please wait." };
    }
    if (userData?.status === 'rejected') {
      return { success: false, error: "ACCESS DENIED: Your signup request was rejected. Contact your administrator." };
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    
    (await cookies()).set("__session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("AUTH_PROTOCOL_FAILURE:", error);
    return { success: false, error: "AUTH_PROTOCOL_FAILURE: " + error?.message || error };
  }
}

export async function logout() {
  (await cookies()).delete("__session");
  return redirect("/login");
}

export async function registerUser(data: {
  fullName: string;
  email: string;
  password: string;
  department: string;
}) {
  try {
    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
      emailVerified: false,
    });

    // Generate email verification link
    const verificationLink = await adminAuth.generateEmailVerificationLink(data.email);

    // Store pending user in Firestore with status = 'pending'
    await firestore.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      fullName: data.fullName,
      email: data.email,
      department: data.department,
      status: 'pending',
      roles: [],
      permissions: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also store in signup_requests collection for admin review
    await firestore.collection('signup_requests').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName: data.fullName,
      email: data.email,
      department: data.department,
      status: 'pending',
      verificationLink,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('REGISTER_ERROR:', error);
    if (error.code === 'auth/email-already-exists') {
      return { success: false, error: 'This email is already registered.' };
    }
    return { success: false, error: error.message || 'Registration failed.' };
  }
}

export async function approveSignupRequest(uid: string) {
  await enforcePermission('users.manage');
  await firestore.collection('users').doc(uid).update({
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await firestore.collection('signup_requests').doc(uid).update({ status: 'approved' });
  revalidatePath('/setup');
  return { success: true };
}

export async function rejectSignupRequest(uid: string) {
  await enforcePermission('users.manage');
  await firestore.collection('signup_requests').doc(uid).update({ status: 'rejected' });
  await firestore.collection('users').doc(uid).update({
    status: 'rejected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  revalidatePath('/setup');
  return { success: true };
}

export const getSignupRequests = cache(async () => {
  const snap = await firestore.collection('signup_requests').orderBy('requestedAt', 'desc').get();
  return serialize(snap.docs.map(d => ({ id: d.id, ...d.data() }))) as any[];
});

export async function getCurrentUser() {
  const { user } = await validateRequest();
  return user;
}

// --- USERS ---
export const getUsers = cache(async () => {
  const [usersSnap, rolesSnap] = await Promise.all([
    firestore.collection('users').get(),
    firestore.collection('roles').get()
  ]);

  const roles = rolesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const users = usersSnap.docs.map(doc => {
    const data = doc.data();
    const resolvedRoles = (data.roles || []).map((roleId: string) => 
      roles.find(r => r.id === roleId) || { id: roleId, name: roleId }
    );
    return { id: doc.id, ...data, roles: resolvedRoles };
  });

  return serialize(users) as any[];
});

export async function upsertUser(data: any) {
  await enforcePermission('users.manage');
  const id = data.id || `USR-${Date.now()}`;
  const userRef = firestore.collection('users').doc(id);

  // If a password is provided, update it in Firebase Auth
  if (data.password) {
    try {
      await adminAuth.updateUser(id, { password: data.password }).catch(async (e) => {
        if (e.code === 'auth/user-not-found') {
          return adminAuth.createUser({
            uid: id,
            email: data.email,
            password: data.password,
            displayName: data.fullName
          });
        }
        throw e;
      });
    } catch (err) {
      console.error("AUTH_SYNC_ERROR:", err);
    }
  }

  const { password, ...metaData } = data; // Don't store password in Firestore
  await userRef.set({
    ...metaData,
    id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  revalidatePath('/setup');
  return { success: true, id };
}

// --- ROLES ---

export const getRoles = cache(async () => {
  const snapshot = await firestore.collection('roles').get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return serialize(data) as any[];
});

export async function upsertRole(data: any) {
  await enforcePermission('users.manage');
  const id = data.id || `ROLE-${Date.now()}`;
  await firestore.collection('roles').doc(id).set(data, { merge: true });
  revalidatePath('/setup');
  return { success: true };
}

// --- PERMISSIONS ---
export const getPermissions = cache(async () => {
  const snapshot = await firestore.collection('permissions').get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return serialize(data) as any[];
});

// --- ASSIGNMENTS ---
export async function assignRoleToUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  const userRef = firestore.collection('users').doc(userId);
  await userRef.update({
    roles: admin.firestore.FieldValue.arrayUnion(roleId)
  });
  
  // Also sync aggregate permissions
  const roleDoc = await firestore.collection('roles').doc(roleId).get();
  const perms = roleDoc.data()?.permissions || [];
  if (perms.length > 0) {
    await userRef.update({
      permissions: admin.firestore.FieldValue.arrayUnion(...perms)
    });
  }

  revalidatePath('/setup');
  return { success: true };
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  const userRef = firestore.collection('users').doc(userId);
  await userRef.update({
    roles: admin.firestore.FieldValue.arrayRemove(roleId)
  });
  revalidatePath('/setup');
  return { success: true };
}

export async function assignPermissionToRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const roleRef = firestore.collection('roles').doc(roleId);
  await roleRef.update({
    permissions: admin.firestore.FieldValue.arrayUnion(permissionCode)
  });
  revalidatePath('/setup');
  return { success: true };
}

export async function removePermissionFromRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const roleRef = firestore.collection('roles').doc(roleId);
  await roleRef.update({
    permissions: admin.firestore.FieldValue.arrayRemove(permissionCode)
  });
  revalidatePath('/setup');
  return { success: true };
}

export async function seedAuthSystem() {
  await enforcePermission('admin.root');
  console.log("🌱 Seeding Authority System to Firestore...");
  
  const roles = [
    {
      id: 'R-ADMIN', 
      name: 'ADMINISTRATOR', 
      description: 'FULL SYSTEM OVERRIDE ACCESS', 
      permissions: ['admin.root', 'setup.manage', 'users.manage', 'dashboard.view', 'sales.post', 'expense.post', 'sales.void', 'reports.view', 'housekeeping.view', 'housekeeping.update', 'housekeeping.audit', 'admin.audit'] 
    },
    { 
      id: 'R-ACCOUNT', 
      name: 'ACCOUNTANT', 
      description: 'FINANCIAL AUDIT & LEDGER ACCESS', 
      permissions: ['dashboard.view', 'reports.view', 'admin.audit', 'ledger.view', 'expense.post'] 
    },
    { 
      id: 'R-RECEPT', 
      name: 'RECEPTIONIST', 
      description: 'FRONT DESK & GUEST OPERATIONS', 
      permissions: ['dashboard.view', 'sales.post', 'reception.checkin', 'reception.checkout', 'housekeeping.view'] 
    },
    { 
      id: 'R-HOUSE', 
      name: 'HOUSEKEEPING', 
      description: 'FACILITY HYGIENE & MAINTENANCE', 
      permissions: ['housekeeping.view', 'housekeeping.update'] 
    },
  ];

  for (const r of roles) {
    await firestore.collection('roles').doc(r.id).set(r);
  }

  // FORCE-GRANT ADMIN TO CORE IDENTITIES
  const adminIds = ['USR-ADMIN', 'USR-1774781674435']; // ADMIN and MILEY
  for (const uid of adminIds) {
     await firestore.collection('users').doc(uid).update({
        roles: admin.firestore.FieldValue.arrayUnion('R-ADMIN'),
        permissions: admin.firestore.FieldValue.arrayUnion('admin.root', 'setup.manage', 'admin.audit')
     }).catch(() => null); // Ignore if user doesn't exist yet
  }

  const perms = [
    { id: 'admin.root', name: 'System Root', code: 'admin.root', description: 'UNRESTRICTED_ACCESS: SYSTEM_OVERRIDE' },
    { id: 'admin.audit', name: 'Execute Night Audit', code: 'admin.audit', description: 'Authority to close business day and rollover ledgers' },
    { id: 'dashboard.view', name: 'View Dashboard', code: 'dashboard.view', description: 'Access to analytics and summary metrics' },
    
    // SETUP
    { id: 'setup.manage', name: 'Manage Setup', code: 'setup.manage', description: 'Configure property, inventory, and accounts' },
    { id: 'users.manage', name: 'Manage Users', code: 'users.manage', description: 'Authorize operators and define authority tiers' },

    // SALES / FRONT DESK
    { id: 'sales.post', name: 'Post Transactions', code: 'sales.post', description: 'Post new entries to guest folios' },
    { id: 'expense.post', name: 'Post Expenses', code: 'expense.post', description: 'Post new procurement expenses and supplier invoices' },
    { id: 'sales.void', name: 'Void Transactions', code: 'sales.void', description: 'Reverse or cancel existing folio entries' },
    { id: 'reception.checkin', name: 'Check-In Protocol', code: 'reception.checkin', description: 'Process guest arrivals and room assignments' },
    { id: 'reception.checkout', name: 'Check-Out Protocol', code: 'reception.checkout', description: 'Process departures and final settlements' },

    // HOUSEKEEPING
    { id: 'housekeeping.view', name: 'View Status', code: 'housekeeping.view', description: 'View real-time room readiness registry' },
    { id: 'housekeeping.update', name: 'Update Readiness', code: 'housekeeping.update', description: 'Modify room hygiene and maintenance states' },
    { id: 'housekeeping.audit', name: 'Print Status Audit', code: 'housekeeping.audit', description: 'Generate physical hygiene status reports' },

    // REPORTS
    { id: 'reports.view', name: 'View Reports', code: 'reports.view', description: 'Access financial audits and performance flux' },
  ];

  for (const p of perms) {
    await firestore.collection('permissions').doc(p.id).set(p);
  }

  revalidatePath('/setup');
  return { success: true };
}
