import { auth } from '../src/lib/firebase-admin';

async function list() {
  try {
    const users = await auth.listUsers();
    console.log(JSON.stringify(users.users.map(u => ({uid: u.uid, email: u.email})), null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

list();
