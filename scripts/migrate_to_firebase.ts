import admin from 'firebase-admin';
import { db as sqlite } from '../src/lib/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("❌ ERROR: FIREBASE_PRIVATE_KEY is missing from .env.local");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = admin.auth();
const firestore = admin.firestore();

async function migrate() {
  console.log("🚀 STARTING FIREBASE MIGRATION PROTOCOL...");

  try {
    // 1. Fetch all data from SQLite
    console.log("📦 Extracting data from SQLite...");
    const users = await sqlite.select().from(schema.users);
    const roles = await sqlite.select().from(schema.roles);
    const permissions = await sqlite.select().from(schema.permissions);
    
    // 2. Clear or Setup Roles/Permissions in Firestore
    console.log("🛠️ Setting up Global Authority Registry (Roles/Permissions)...");
    for (const p of permissions) {
      await firestore.collection('permissions').doc(p.id).set(p);
    }
    for (const r of roles) {
      // Get permissions for this role
      const rolePerms = await sqlite.select({ 
        code: schema.permissions.code 
      })
      .from(schema.rolePermissions)
      .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.rolePermissions.roleId, r.id));
      
      await firestore.collection('roles').doc(r.id).set({
        ...r,
        permissions: rolePerms.map(p => p.code)
      });
    }

    // 3. Migrate Users
    console.log("👤 Migrating Operators...");
    for (const user of users) {
      const email = user.email || `${user.username.toLowerCase()}@hotel.internal`;
      console.log(`  - Processing: ${user.username} -> ${email}`);

      try {
        // Create or Update Auth Identity
        let authUser;
        try {
          authUser = await auth.createUser({
            uid: user.id,
            email: email,
            password: 'PASSWORD123',
            displayName: user.fullName || user.username,
          });
        } catch (e: any) {
          if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
             authUser = await auth.getUserByEmail(email);
          } else {
            throw e;
          }
        }

        // Fetch specifically assigned roles for this user
        const userRoles = await sqlite.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
        const roleIds = userRoles.map(ur => ur.roleId);

        // Fetch aggregated permissions for these roles
        let aggregatedPermissions: string[] = [];
        if (roleIds.length > 0) {
           for(const rid of roleIds) {
             const roleDoc = await firestore.collection('roles').doc(rid).get();
             const roleData = roleDoc.data();
             if (roleData?.permissions) {
                aggregatedPermissions = [...aggregatedPermissions, ...roleData.permissions];
             }
           }
        }
        
        // Special Case: ROOT ADMIN
        if (user.username === 'ADMIN') {
          aggregatedPermissions.push('admin.root');
        }

        // Create Firestore User Document
        await firestore.collection('users').doc(user.id).set({
          uid: user.id,
          username: user.username,
          fullName: user.fullName,
          email: email,
          isActive: user.isActive,
          roles: roleIds,
          permissions: Array.from(new Set(aggregatedPermissions)),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`    ✅ Synced: ${user.username}`);
      } catch (err) {
        console.error(`    ❌ Failed: ${user.username}`, err);
      }
    }

    console.log("\n✨ MIGRATION PROTOCOL SUCCESSFUL");
  } catch (globalError) {
    console.error("💀 CRITICAL MIGRATION FAILURE:", globalError);
  } finally {
    process.exit(0);
  }
}

migrate();
