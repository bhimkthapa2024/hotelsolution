'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { validateRequest, enforcePermission, SESSION_COOKIE_NAME } from '@/lib/session';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/utils';
import { cache } from 'react';
import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import { User, Role, Permission } from '@/drizzle/schema'; 

// --- AUTH CORE (Firebase) ---

export async function loginWithFirebaseToken(idToken: string) {
  try {
    if (!adminAuth) return { success: false, error: 'Auth service unavailable.' };

    const decoded = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = decoded.uid;

    const userDoc = await db.collection('users').doc(firebaseUid).get();
    if (!userDoc.exists) {
      return { success: false, error: 'Account not found. Contact your administrator.' };
    }
    const dbUser = userDoc.data() as User;
    if (!dbUser.isActive) {
      return { success: false, error: 'Account is disabled. Contact your administrator.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    await db.collection('users').doc(firebaseUid).update({ lastLogin: new Date().toISOString() });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('LOGIN_FAILURE:', error);
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}

export async function login(_username: string, _password: string) {
  return { success: false, error: 'Local login is disabled. Use Firebase Authentication.' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return redirect('/login');
}

export async function getCurrentUser() {
  const { user } = await validateRequest();
  return user;
}

// --- USERS ---
export const getUsers = cache(async () => {
  const snapshot = await db.collection('users').get();
  const allUsers = snapshot.docs.map(doc => doc.data() as User);
  
  const rolesSnap = await db.collection('roles').get();
  const allRoles = rolesSnap.docs.map(doc => doc.data() as Role);

  return serialize(allUsers.map(u => {
    const resolvedRoles = (u.roles || []).map(rId => allRoles.find(r => r.id === rId) || { id: rId, name: rId });
    const { password: _, ...safeUser } = u;
    return { ...safeUser, roles: resolvedRoles };
  })) as any[];
});

export async function upsertUser(data: any) {
  await enforcePermission('users.manage');
  const id = data.id || `USR-${Date.now()}`;

  const docRef = db.collection('users').doc(id);
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      isActive: data.isActive ?? true,
    };
    if (data.username) updateData.username = data.username;
    await docRef.update(updateData);
  } else {
    await docRef.set({
      id,
      username: data.username || data.email?.split('@')[0] || id,
      password: '',
      fullName: data.fullName,
      email: data.email,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
      roles: [],
    });
  }

  revalidatePath('/setup');
  return { success: true, id };
}

export async function deleteUser(id: string) {
  await enforcePermission('users.manage');
  await db.collection('users').doc(id).delete();
  revalidatePath('/setup');
  return { success: true };
}

// --- ROLES ---
export const getRoles = cache(async () => {
  const rolesSnap = await db.collection('roles').get();
  return serialize(rolesSnap.docs.map(doc => doc.data())) as any[];
});

export async function upsertRole(data: any) {
  await enforcePermission('users.manage');
  const id = data.id || `ROLE-${Date.now()}`;
  const docRef = db.collection('roles').doc(id);
  const existing = await docRef.get();
  
  if (existing.exists) {
    await docRef.update({ name: data.name, description: data.description });
  } else {
    await docRef.set({ id, name: data.name, description: data.description, permissions: [] });
  }
  revalidatePath('/setup');
  return { success: true };
}

// --- PERMISSIONS ---
export const getPermissions = cache(async () => {
  const snap = await db.collection('permissions').get();
  return serialize(snap.docs.map(doc => doc.data())) as any[];
});

// --- ASSIGNMENTS ---
export async function assignRoleToUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const userData = userSnap.data() as User;
    const roles = userData.roles || [];
    if (!roles.includes(roleId)) {
      await userRef.update({ roles: [...roles, roleId] });
    }
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const userData = userSnap.data() as User;
    const roles = (userData.roles || []).filter(r => r !== roleId);
    await userRef.update({ roles });
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function assignPermissionToRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const roleRef = db.collection('roles').doc(roleId);
  const roleSnap = await roleRef.get();
  if (roleSnap.exists) {
    const roleData = roleSnap.data() as Role;
    const perms = roleData.permissions || [];
    if (!perms.includes(permissionCode)) {
      await roleRef.update({ permissions: [...perms, permissionCode] });
    }
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function removePermissionFromRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const roleRef = db.collection('roles').doc(roleId);
  const roleSnap = await roleRef.get();
  if (roleSnap.exists) {
    const roleData = roleSnap.data() as Role;
    const perms = (roleData.permissions || []).filter(p => p !== permissionCode);
    await roleRef.update({ permissions: perms });
  }
  revalidatePath('/setup');
  return { success: true };
}

// --- SEED AUTH SYSTEM ---
export async function seedAuthSystem() {
  await enforcePermission('admin.root');
  console.log('🌱 Seeding Authority System to Firestore...');

  const batch = db.batch();

  const rolesList = [
    { id: 'R-ADMIN', name: 'ADMINISTRATOR', description: 'FULL SYSTEM OVERRIDE ACCESS' },
    { id: 'R-ACCOUNT', name: 'ACCOUNTANT', description: 'FINANCIAL AUDIT & LEDGER ACCESS' },
    { id: 'R-RECEPT', name: 'RECEPTIONIST', description: 'FRONT DESK & GUEST OPERATIONS' },
    { id: 'R-HOUSE', name: 'HOUSEKEEPING', description: 'FACILITY HYGIENE & MAINTENANCE' },
  ];

  for (const r of rolesList) {
    const ref = db.collection('roles').doc(r.id);
    batch.set(ref, { ...r, permissions: r.id === 'R-ADMIN' ? ['admin.root'] : [] }, { merge: true });
  }

  const permsList = [
    { id: 'admin.root', code: 'admin.root', description: 'UNRESTRICTED_ACCESS: SYSTEM_OVERRIDE' },
    { id: 'admin.audit', code: 'admin.audit', description: 'Authority to close business day and rollover ledgers' },
    { id: 'dashboard.view', code: 'dashboard.view', description: 'Access to analytics and summary metrics' },
    { id: 'setup.manage', code: 'setup.manage', description: 'Configure property, inventory, and accounts' },
    { id: 'users.manage', code: 'users.manage', description: 'Authorize operators and define authority tiers' },
    { id: 'sales.post', code: 'sales.post', description: 'Post new entries to guest folios' },
    { id: 'expense.post', code: 'expense.post', description: 'Post new procurement expenses and supplier invoices' },
    { id: 'sales.void', code: 'sales.void', description: 'Reverse or cancel existing folio entries' },
    { id: 'reception.checkin', code: 'reception.checkin', description: 'Process guest arrivals and room assignments' },
    { id: 'reception.checkout', code: 'reception.checkout', description: 'Process departures and final settlements' },
    { id: 'housekeeping.view', code: 'housekeeping.view', description: 'View real-time room readiness registry' },
    { id: 'housekeeping.update', code: 'housekeeping.update', description: 'Modify room hygiene and maintenance states' },
    { id: 'housekeeping.audit', code: 'housekeeping.audit', description: 'Generate physical hygiene status reports' },
    { id: 'reports.view', code: 'reports.view', description: 'Access financial audits and performance flux' },
    { id: 'ledger.view', code: 'ledger.view', description: 'Access ledger and journal entries' },
  ];

  const adminPermissions = permsList.map(p => p.code);

  for (const p of permsList) {
    const ref = db.collection('permissions').doc(p.id);
    batch.set(ref, p, { merge: true });
  }

  // Assign all permissions to ADMIN role
  const adminRoleRef = db.collection('roles').doc('R-ADMIN');
  batch.set(adminRoleRef, { permissions: adminPermissions }, { merge: true });

  const adminUserIds = ['USR-ADMIN', 'USR-1774781674435'];
  for (const uid of adminUserIds) {
    const uRef = db.collection('users').doc(uid);
    batch.set(uRef, { roles: ['R-ADMIN'] }, { merge: true });
  }

  await batch.commit();

  revalidatePath('/setup');
  return { success: true };
}

export async function registerUser(_data: any) {
  return { success: false, error: 'Self-registration is disabled. Contact your administrator to create an account.' };
}

export async function approveSignupRequest(_uid: string) {
  return { success: false, error: 'Not applicable.' };
}

export async function rejectSignupRequest(_uid: string) {
  return { success: false, error: 'Not applicable.' };
}

export async function getSignupRequests() {
  return [];
}
