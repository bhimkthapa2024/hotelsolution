import { db } from '../src/lib/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { hash } from "@node-rs/argon2";

async function main() {
  console.log("EXEC_AUTH_SEED: INITIALIZING ADMINISTRATIVE IDENTITY...");
  
  // 1. ROLES
  const roles = [
    { id: 'R-ADMIN', name: 'ADMINISTRATOR', description: 'FULL SYSTEM OVERRIDE ACCESS' },
    { id: 'R-RECEPT', name: 'RECEPTIONIST', description: 'FRONT DESK & POS OPERATIONS' },
    { id: 'R-ACCOUNT', name: 'ACCOUNTANT', description: 'FINANCIAL AUDIT & LEDGER ACCESS' },
  ];

  for (const r of roles) {
    const exists = await db.select().from(schema.roles).where(eq(schema.roles.id, r.id)).get();
    if (!exists) {
      await db.insert(schema.roles).values(r);
      console.log(`- ROLE_DEPLOYED: ${r.name}`);
    }
  }

  // 2. ADMIN USER
  const adminExists = await db.select().from(schema.users).where(eq(schema.users.username, 'ADMIN')).get();
  if (!adminExists) {
    const uid = 'USR-ADMIN';
    const passwordHash = await hash('PASSWORD123', {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });

    await db.insert(schema.users).values({
      id: uid,
      username: 'ADMIN',
      password: passwordHash,
      fullName: 'SYSTEM ADMINISTRATOR',
      email: 'admin@property.com',
      createdAt: new Date().toISOString()
    });
    console.log("- IDENTITY_HEAD_ESTABLISHED: ADMIN / PASSWORD123");
    
    await db.insert(schema.userRoles).values({ userId: uid, roleId: 'R-ADMIN' });
    console.log("- AUTHORITY_ASSIGNED: R-ADMIN");
  } else {
    console.log("- IDENTITY_ALREADY_EXISTS: SKIP");
  }

  console.log("EXEC_AUTH_SEED: PROTOCOL_COMPLETE");
  process.exit(0);
}

main().catch(console.error);
