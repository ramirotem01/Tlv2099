const admin = require('firebase-admin');

// בדיקה שהסוד הוגדר ב-GitHub
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ ERROR: Missing FIREBASE_SERVICE_ACCOUNT secret in GitHub Settings!");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized successfully.");
} catch (err) {
    console.error("❌ ERROR: Failed to parse Service Account JSON:", err.message);
    process.exit(1);
}

const db = admin.firestore();

async function updateEnergy() {
    console.log('📡 Fetching players with energy < 100...');
    const playersRef = db.collection('players');
    const snapshot = await playersRef.where('energy', '<', 100).get();

    if (snapshot.empty) {
        console.log('😴 All players are at 100% energy. Nothing to do.');
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const currentEnergy = data.energy || 0;
        const newEnergy = Math.min(100, currentEnergy + 5);
        
        batch.update(doc.ref, { energy: newEnergy });
        count++;
    });

    await batch.commit();
    console.log(`🚀 Success: Updated energy for ${count} players.`);
}

updateEnergy().catch(err => {
    console.error('❌ Execution Error:', err);
    process.exit(1);
});
