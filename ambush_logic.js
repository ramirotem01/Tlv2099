const admin = require('firebase-admin');

// התחברות ל-Firebase באמצעות Secret
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runAmbush() {
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log("מתחיל סריקת שחקנים למארב...");

    try {
        // 1. שליפת שחקנים עם 100% חיים שלא הותקפו ב-24 שעות האחרונות
        const playersRef = db.collection('players');
        const snapshot = await playersRef
            .where('energy', '==', 100)
            .where('lastAmbushDate', '<=', twentyFourHoursAgo)
            .get();

        if (snapshot.empty) {
            console.log("לא נמצאו שחקנים מתאימים למארב.");
            return;
        }

        // 2. שליפת רשימת המפלצות מה-DB (כדי להתאים לרמה)
        const monstersSnap = await db.collection('monsters').get();
        const allMonsters = monstersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        for (const playerDoc of snapshot.docs) {
            const player = playerDoc.data();
            const playerId = playerDoc.id;

            // סינון מפלצות לפי רמת השחקן (maxLevel)
            const relevantMonsters = allMonsters.filter(m => m.maxLevel >= player.level);
            if (relevantMonsters.length === 0) continue;

            const monster = relevantMonsters[Math.floor(Math.random() * relevantMonsters.length)];

            // 3. לוגיקת קרב פשוטה (Combat Logic)
            // נניח כוח מפלצת אקראי מבוסס רמה
            const monsterPower = (Math.random() * 15) + (player.level * 5);
            const playerPower = player.attack || 10;
            
            const winChance = (playerPower / (playerPower + monsterPower));
            const didWin = Math.random() < winChance;

            let damage = 0;
            let loot = 0;
            let resultMessage = "";

            if (didWin) {
                loot = Math.floor(Math.random() * 50) + 20; // זהב אקראי
                resultMessage = `בזמן שלא היית, הותקפת על ידי ${monster.name}! נלחמת בגבורה, הבקעת אותה וזכית ב-${loot} מטבעות זהב.`;
            } else {
                damage = Math.floor(Math.random() * 20) + 10; // נזק אקראי
                resultMessage = `בזמן שלא היית, ${monster.name} הפתיעה אותך במארב! ספגת ${damage} נזק לפני שהצלחת להימלט.`;
            }

            // 4. עדכון ה-DB
            await playersRef.doc(playerId).update({
                energy: Math.max(0, player.energy - damage),
                coins: player.coins + loot,
                lastAmbushDate: now,
                lastHpUpdate: now
            });

            // 5. יצירת הודעה לשחקן
            await db.collection('notifications').add({
                targetUserId: playerId,
                title: "נתקפת! ⚔️",
                message: resultMessage,
                type: "AMBUSH",
                isRead: false,
                createdAt: now
            });

            console.log(`מארב בוצע עבור השחקן: ${player.username}. תוצאה: ${didWin ? 'ניצחון' : 'הפסד'}`);
        }

    } catch (error) {
        console.error("שגיאה בהרצת המארב:", error);
    }
}

runAmbush();
