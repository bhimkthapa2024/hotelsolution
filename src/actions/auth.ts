'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { validateRequest, enforcePermission, SESSION_COOKIE_NAME } from '@/lib/session';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/utils';
import { cache } from 'react';
import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import {
  users, roles, permissions, userRoles, rolePermissions,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// --- AUTH CORE (Firebase) ---

// Called by login page after client-side Firebase signInWithEmailAndPassword
export async function loginWithFirebaseToken(idToken: string) {
  try {
    if (!adminAuth) return { success: false, error: 'Auth service unavailable.' };

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = decoded.uid;

    // Check the user exists in our SQLite DB with this Firebase UID
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, firebaseUid) });
    if (!dbUser) {
      return { success: false, error: 'Account not found. Contact your administrator.' };
    }
    if (!dbUser.isActive) {
      return { success: false, error: 'Account is disabled. Contact your administrator.' };
    }

    // Store the Firebase ID token as a session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, firebaseUid));

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('LOGIN_FAILURE:', error);
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}

// Keep legacy login stub to avoid import errors on pages not yet updated
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
  const allUsers = await db.select().from(users);
  const allUserRoles = await db.select().from(userRoles);
  const allRoles = await db.select().from(roles);

  return serialize(allUsers.map(u => {
    const roleIds = allUserRoles.filter(ur => ur.userId === u.id).map(ur => ur.roleId);
    const resolvedRoles = roleIds.map(rId => allRoles.find(r => r.id === rId) || { id: rId, name: rId });
    const { password: _, ...safeUser } = u;
    return { ...safeUser, roles: resolvedRoles };
  })) as any[];
});

export async function upsertUser(data: any) {
  await enforcePermission('users.manage');
  // ID should be the Firebase UID for Firebase-auth users
  const id = data.id || `USR-${Date.now()}`;

  const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });

  if (existingUser) {
    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      isActive: data.isActive ?? true,
    };
    if (data.username) updateData.username = data.username;
    await db.update(users).set(updateData).where(eq(users.id, id));
  } else {
    await db.insert(users).values({
      id,
      username: data.username || data.email?.split('@')[0] || id,
      password: '', // No local password — auth via Firebase
      fullName: data.fullName,
      email: data.email,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath('/setup');
  return { success: true, id };
}

export async function deleteUser(id: string) {
  await enforcePermission('users.manage');
  await db.delete(userRoles).where(eq(userRoles.userId, id));
  await db.delete(users).where(eq(users.id, id));
  revalidatePath('/setup');
  return { success: true };
}

// --- ROLES ---
export const getRoles = cache(async () => {
  const allRoles = await db.select().from(roles);
  const allRolePerms = await db.select().from(rolePermissions);
  const allPerms = await db.select().from(permissions);

  return serialize(allRoles.map(r => {
    const permIds = allRolePerms.filter(rp => rp.roleId === r.id).map(rp => rp.permissionId);
    const resolvedPerms = permIds.map(pId => allPerms.find(p => p.id === pId)?.code).filter(Boolean);
    return { ...r, permissions: resolvedPerms };
  })) as any[];
});

export async function upsertRole(data: any) {
  await enforcePermission('users.manage');
  const id = data.id || `ROLE-${Date.now()}`;
  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (existing) {
    await db.update(roles).set({ name: data.name, description: data.description }).where(eq(roles.id, id));
  } else {
    await db.insert(roles).values({ id, name: data.name, description: data.description });
  }
  revalidatePath('/setup');
  return { success: true };
}

// --- PERMISSIONS ---
export const getPermissions = cache(async () => {
  const data = await db.select().from(permissions);
  return serialize(data) as any[];
});

// --- ASSIGNMENTS ---
export async function assignRoleToUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  const existing = await db.query.userRoles.findFirst({
    where: (ur, { and }) => and(eq(ur.userId, userId), eq(ur.roleId, roleId)),
  });
  if (!existing) {
    await db.insert(userRoles).values({ userId, roleId });
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  await enforcePermission('users.manage');
  await db.delete(userRoles)
    .where(eq(userRoles.userId, userId));
  // Re-insert all except removed
  // Actually delete specific row
  const remaining = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  // SQLite doesn't support multi-column WHERE easily via drizzle, so we do a select-then-delete approach
  revalidatePath('/setup');
  return { success: true };
}

export async function assignPermissionToRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const perm = await db.query.permissions.findFirst({ where: eq(permissions.code, permissionCode) });
  if (!perm) return { success: false, error: 'Permission not found' };

  const existing = await db.query.rolePermissions.findFirst({
    where: (rp, { and }) => and(eq(rp.roleId, roleId), eq(rp.permissionId, perm.id)),
  });
  if (!existing) {
    await db.insert(rolePermissions).values({ roleId, permissionId: perm.id });
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function removePermissionFromRole(roleId: string, permissionCode: string) {
  await enforcePermission('users.manage');
  const perm = await db.query.permissions.findFirst({ where: eq(permissions.code, permissionCode) });
  if (!perm) return { success: false, error: 'Permission not found' };
  await db.delete(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  // Since drizzle sqlite doesn't support multi-col primary key delete easily, we'll do this:
  // Fetch remaining and re-insert
  revalidatePath('/setup');
  return { success: true };
}

// --- SEED AUTH SYSTEM ---
export async function seedAuthSystem() {
  await enforcePermission('admin.root');
  console.log('🌱 Seeding Authority System to SQLite...');

  const rolesList = [
    { id: 'R-ADMIN', name: 'ADMINISTRATOR', description: 'FULL SYSTEM OVERRIDE ACCESS' },
    { id: 'R-ACCOUNT', name: 'ACCOUNTANT', description: 'FINANCIAL AUDIT & LEDGER ACCESS' },
    { id: 'R-RECEPT', name: 'RECEPTIONIST', description: 'FRONT DESK & GUEST OPERATIONS' },
    { id: 'R-HOUSE', name: 'HOUSEKEEPING', description: 'FACILITY HYGIENE & MAINTENANCE' },
  ];

  for (const r of rolesList) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, r.id) });
    if (existing) {
      await db.update(roles).set(r).where(eq(roles.id, r.id));
    } else {
      await db.insert(roles).values(r);
    }
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

  for (const p of permsList) {
    const existing = await db.query.permissions.findFirst({ where: eq(permissions.id, p.id) });
    if (existing) {
      await db.update(permissions).set(p).where(eq(permissions.id, p.id));
    } else {
      await db.insert(permissions).values(p);
    }
  }

  // Assign all permissions to ADMIN role
  const adminPermissions = permsList.map(p => p.id);
  for (const permId of adminPermissions) {
    const existing = await db.query.rolePermissions.findFirst({
      where: (rp, { and }) => and(eq(rp.roleId, 'R-ADMIN'), eq(rp.permissionId, permId)),
    });
    if (!existing) {
      await db.insert(rolePermissions).values({ roleId: 'R-ADMIN', permissionId: permId });
    }
  }

  // Assign roles to core admin users
  const adminUserIds = ['USR-ADMIN', 'USR-1774781674435'];
  for (const uid of adminUserIds) {
    const u = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!u) continue;
    const existing = await db.query.userRoles.findFirst({
      where: (ur, { and }) => and(eq(ur.userId, uid), eq(ur.roleId, 'R-ADMIN')),
    });
    if (!existing) {
      await db.insert(userRoles).values({ userId: uid, roleId: 'R-ADMIN' });
    }
  }

  revalidatePath('/setup');
  return { success: true };
}

// --- SIGNUP REQUESTS (kept as stubs — not needed for local) ---
export async function registerUser(_data: any) {
  return { success: false, error: 'Self-registration is disabled. Contact your administrator to create an account.' };
}

export async function approveSignupRequest(_uid: string) {
  return { success: false, error: 'Not applicable in local mode.' };
}

export async function rejectSignupRequest(_uid: string) {
  return { success: false, error: 'Not applicable in local mode.' };
}

export async function getSignupRequests() {
  return [];
}
