import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function restore() {
  const { db } = await import('../src/lib/firebase-admin');
  
  const perfectDisplay = {
    glassEffect: true,
    density: 1.2,
    hoverScale: 0.3,
    internalPadding: 1.5,
    primaryColor: "#2d2d2f",
    shadowDepth: 0.65,
    textColor: "#020617",
    tracking: 0.07,
    fontFamily: "var(--font-outfit), \"Inter\", sans-serif",
    bgColor: "#f8fafc",
    motionSpeed: 0.5,
    sidebarWidth: 215,
    fontSize: 17,
    radius: 16
  };

  try {
    console.log('Synchronizing Firestore config with Local Perfect State...');
    await db.collection('config').doc('main').set({
      display: perfectDisplay,
      hotelName: "LUXURY VANTAGE",
      // Preserving other non-UI settings
      taxInclusive: false,
      applyServiceCharge: true,
      serviceChargeRate: 10,
      vatRate: 13,
      applyVat: true
    }, { merge: true });
    
    console.log('✅ Configuration Restored Successfully.');
  } catch (e) {
    console.error('❌ Restoration Failed:', e);
  }
  process.exit(0);
}

restore();
