import { cookies } from "next/headers";
import { cache } from "react";
import { adminAuth } from "./firebase-admin";
import { db } from "./db";
import { users, userRoles, rolePermissions, permissions, roles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = 'hotel_session';

// ─── Session Validation ──────────────────────────────────────────────────────
export const validateRequest = cache(async () => {
  let token: string | null = null;
  try {
    token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return { user: null, session: null };
  }

  if (!token) return { user: null, session: null };

  try {
    // Verify Firebase ID token
    if (!adminAuth) return { user: null, session: null };
    const decoded = await adminAuth.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    // Look up user in SQLite by Firebase UID
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, firebaseUid),
    });

    if (!dbUser || !dbUser.isActive) return { user: null, session: null };

    // Load roles
    const userRoleRows = await db.select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, dbUser.id));
    const roleIds = userRoleRows.map(r => r.roleId);

    // Load permissions
    let permCodes: string[] = [];
    for (const roleId of roleIds) {
      const rp = await db.select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));
      for (const { permissionId } of rp) {
        const perm = await db.query.permissions.findFirst({ where: eq(permissions.id, permissionId) });
        if (perm) permCodes.push(perm.code);
      }
    }

    // Load role names
    const resolvedRoles: string[] = [];
    for (const roleId of roleIds) {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
      if (role) resolvedRoles.push(role.name);
    }

    return {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName || dbUser.username,
        email: dbUser.email || decoded.email || '',
        permissions: permCodes,
        roles: resolvedRoles,
      },
      session: { id: token, fresh: false },
    };
  } catch (error) {
    console.error('[session] validateRequest error:', error);
    return { user: null, session: null };
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function checkPermission(permissionCode: string): Promise<boolean> {
  const { user } = await validateRequest();
  if (!user) return false;
  if (user.permissions.includes('admin.root')) return true;
  return user.permissions.includes(permissionCode);
}

export async function enforcePermission(permissionCode: string): Promise<void> {
  const hasPermission = await checkPermission(permissionCode);
  if (!hasPermission) {
    throw new Error(`UNAUTHORIZED: Missing required clearance [${permissionCode}]`);
  }
}

// ─── Cookie helpers (called from auth actions) ────────────────────────────────
export const SESSION_COOKIE_NAME = SESSION_COOKIE;
