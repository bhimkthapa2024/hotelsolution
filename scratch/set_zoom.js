import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setZoomDefault() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const configRef = db.collection('config').doc('main');
    await configRef.update({
      "display.fontSize": 19,
      "display.density": 1.2,
      "display.internalPadding": 1.2,
      "display.sidebarWidth": 260 // Scale sidebar width too
    });
    console.log('✅ UI Configuration updated to 125% Scale (Default View).');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

setZoomDefault();
