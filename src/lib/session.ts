import { cookies } from "next/headers";
import { cache } from "react";
import { lucia } from "./auth";
import { db } from "./db";
import { users, userRoles, rolePermissions, permissions, roles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const validateRequest = cache(async () => {
  let sessionId: string | null = null;
  try {
    sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  } catch {
    // During static generation or script runs
    sessionId = null;
  }

  if (!sessionId) {
    return { user: null, session: null };
  }

  try {
    const { user: luciaUser, session } = await lucia.validateSession(sessionId);
    if (!luciaUser || !session) return { user: null, session: null };

    // Load full user from DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, luciaUser.id),
    });

    if (!dbUser || !dbUser.isActive) return { user: null, session: null };

    // Load user's roles
    const userRoleRows = await db.select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, dbUser.id));
    const roleIds = userRoleRows.map(r => r.roleId);

    // Load permissions for those roles
    let permCodes: string[] = [];
    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        const rp = await db.select({ permissionId: rolePermissions.permissionId })
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));
        const permIds = rp.map(r => r.permissionId);
        if (permIds.length > 0) {
          for (const permId of permIds) {
            const perm = await db.query.permissions.findFirst({ where: eq(permissions.id, permId) });
            if (perm) permCodes.push(perm.code);
          }
        }
      }
    }

    // Resolve role names
    const resolvedRoles: string[] = [];
    for (const roleId of roleIds) {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
      if (role) resolvedRoles.push(role.name);
    }

    // Session cookie refresh
    if (session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      try {
        (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      } catch { /* ignore */ }
    }

    return {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName || dbUser.username,
        email: dbUser.email || '',
        permissions: permCodes,
        roles: resolvedRoles,
      },
      session,
    };
  } catch (error) {
    console.error('[session] validateRequest error:', error);
    return { user: null, session: null };
  }
});

// Permission Guard Utility
export async function checkPermission(permissionCode: string): Promise<boolean> {
  const { user } = await validateRequest();
  if (!user) return false;
  if (user.permissions.includes('admin.root')) return true;
  return user.permissions.includes(permissionCode);
}

// Throws an error if the user lacks the required permission
export async function enforcePermission(permissionCode: string): Promise<void> {
  const hasPermission = await checkPermission(permissionCode);
  if (!hasPermission) {
    throw new Error(`UNAUTHORIZED: Missing required clearance [${permissionCode}]`);
  }
}
