import { db } from '../src/lib/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { hash } from "@node-rs/argon2";

async function main() {
  console.log("EXEC_AUTH_RESET: RESETTING ADMINISTRATIVE IDENTITY HASH...");
  
  const uid = 'USR-ADMIN';
  const passwordHash = await hash('PASSWORD123', {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });

  const adminExists = await db.select().from(schema.users).where(eq(schema.users.username, 'ADMIN')).get();
  
  if (adminExists) {
    await db.update(schema.users).set({
      password: passwordHash,
      fullName: 'SYSTEM ADMINISTRATOR',
      email: 'admin@property.com',
    }).where(eq(schema.users.id, adminExists.id));
    console.log("- IDENTITY_HASH_REPAIRED: ADMIN / PASSWORD123");
  } else {
    await db.insert(schema.users).values({
      id: uid,
      username: 'ADMIN',
      password: passwordHash,
      fullName: 'SYSTEM ADMINISTRATOR',
      email: 'admin@property.com',
      createdAt: new Date().toISOString()
    });
    console.log("- IDENTITY_HEAD_ESTABLISHED: ADMIN / PASSWORD123");
    await db.insert(schema.userRoles).values({ userId: uid, roleId: 'R-ADMIN' }).catch(() => {});
  }

  console.log("EXEC_AUTH_RESET: PROTOCOL_COMPLETE");
  process.exit(0);
}

main().catch(console.error);
