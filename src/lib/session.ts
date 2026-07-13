import { cookies } from "next/headers";
import { cache } from "react";
import { adminAuth } from "./firebase-admin";
import { db } from "./db";
import { User, Role } from "@/drizzle/schema";

const SESSION_COOKIE = 'hotel_session';

export const validateRequest = cache(async () => {
  let token: string | null = null;
  try {
    token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return { user: null, session: null };
  }

  if (!token) return { user: null, session: null };

  try {
    if (!adminAuth) return { user: null, session: null };
    const decoded = await adminAuth.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const userDoc = await db.collection('users').doc(firebaseUid).get();
    if (!userDoc.exists) return { user: null, session: null };

    const dbUser = userDoc.data() as User;
    if (!dbUser.isActive) return { user: null, session: null };

    const roleIds = dbUser.roles || [];
    let permCodes: string[] = [];
    const resolvedRoles: string[] = [];

    for (const roleId of roleIds) {
      const roleDoc = await db.collection('roles').doc(roleId).get();
      if (roleDoc.exists) {
        const roleData = roleDoc.data() as Role;
        resolvedRoles.push(roleData.name);
        if (roleData.permissions) {
          permCodes.push(...roleData.permissions);
        }
      }
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
  } catch (error: any) {
    if (error?.code !== 'auth/id-token-expired') {
      console.error('[session] validateRequest error:', error);
    }
    return { user: null, session: null };
  }
});

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

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
