const admin = require('firebase-admin');

// טעינת מפתח האבטחה מה-GitHub Secrets
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateEnergy() {
  const playersRef = db.collection('players');
  // מחפשים רק שחקנים שהאנרגיה שלהם פחות מ-100
  const snapshot = await playersRef.where('energy', '<', 100).get();

  if (snapshot.empty) {
    console.log('No players need energy recovery.');
    return;
  }

  const batch = db.batch();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    // הוספת 5 נקודות אנרגיה, מקסימום 100
    const newEnergy = Math.min(100, (data.energy || 0) + 5);
    batch.update(doc.ref, { energy: newEnergy });
  });

  await batch.commit();
  console.log(`Updated energy for ${snapshot.size} players.`);
}

updateEnergy().catch(console.error);
