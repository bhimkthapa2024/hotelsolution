import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function restore() {
  const { db } = await import('../src/lib/firebase-admin');
  
  const middleGroundDisplay = {
    glassEffect: true,
    density: 1.0,
    hoverScale: 0.5,
    internalPadding: 1.0,
    primaryColor: "#0000ed", // Reverting to Blue
    shadowDepth: 0.5,
    textColor: "#020617",
    tracking: -0.01,
    fontFamily: "var(--font-outfit), \"Inter\", sans-serif",
    bgColor: "#f8fafc",
    motionSpeed: 0.4,
    sidebarWidth: 210,
    fontSize: 15, // Standard base
    radius: 12
  };

  try {
    console.log('Synchronizing Firestore config with Balanced State...');
    await db.collection('config').doc('main').set({
      display: middleGroundDisplay,
    }, { merge: true });
    
    console.log('✅ Configuration Balanced.');
  } catch (e) {
    console.error('❌ Balancing Failed:', e);
  }
  process.exit(0);
}

restore();
