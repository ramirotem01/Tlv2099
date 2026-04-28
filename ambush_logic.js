const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ Missing FIREBASE_SERVICE_ACCOUNT secret!");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function startAmbushProcess() {
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const batch = db.batch();

    console.log("🔍 Scanning for eligible players for ambush...");

    try {
        // שליפת שחקנים עם 100% חיים שלא הותקפו יממה
        const playersSnap = await db.collection('players')
            .where('energy', '==', 100)
            .where('lastAmbushDate', '<=', twentyFourHoursAgo)
            .get();

        if (playersSnap.empty) {
            console.log("✅ No players eligible for ambush right now.");
            return;
        }

        // שליפת מפלצות מה-DB
        const monstersSnap = await db.collection('monsters').get();
        const monsters = monstersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const playerDoc of playersSnap.docs) {
            const player = playerDoc.data();
            const playerId = playerDoc.id;

            // סינון מפלצות לפי רמת השחקן
            const relevantMonsters = monsters.filter(m => m.maxLevel >= player.level);
            if (relevantMonsters.length === 0) continue;

            const selectedMonster = relevantMonsters[Math.floor(Math.random() * relevantMonsters.length)];

            // לוגיקת קרב משודרגת לפי האפיון שלך
            const baseAttack = player.attack || 10;
            const atkMod = (player.stats && player.stats.atkMod) ? player.stats.atkMod : 1;
            const defMod = (player.stats && player.stats.defMod) ? player.stats.defMod : 1;
            
            const effectivePlayerPower = baseAttack * atkMod;
            const monsterPower = (Math.random() * 20) + (player.level * 6); // כוח מפלצת מבוסס רמה

            // חישוב סיכוי ניצחון (מושפע מה-defMod של השחקן)
            const winChance = (effectivePlayerPower / (effectivePlayerPower + (monsterPower / defMod)));
            const didWin = Math.random() < winChance;

            let damage = 0;
            let loot = 0;

            if (didWin) {
                loot = Math.floor(Math.random() * 30) + (player.level * 10);
            } else {
                damage = Math.floor((Math.random() * 15) + 15);
            }

            // עדכון השחקן
            batch.update(playerDoc.ref, {
                energy: Math.max(0, 100 - damage),
                coins: (player.coins || 0) + loot,
                lastAmbushDate: now,
                lastHpUpdate: now
            });

            // יצירת הודעת "נתקפת"
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, {
                targetUserId: playerId,
                title: "נתקפת! ⚔️",
                message: didWin 
                    ? `בזמן שישנת, ${selectedMonster.name} ניסתה לתקוף אותך! הבסת אותה ולקחת ${loot} זהב.` 
                    : `בזמן שישנת, הופתעת על ידי ${selectedMonster.name}! ספגת ${damage} נזק.`,
                type: "AMBUSH",
                isRead: false,
                createdAt: now
            });
        }

        await batch.commit();
        console.log(`🚀 Ambush process completed for ${playersSnap.size} players.`);

    } catch (error) {
        console.error("❌ Error during ambush execution:", error);
    }
}

startAmbushProcess();
