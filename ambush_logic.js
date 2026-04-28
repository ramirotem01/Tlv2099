const admin = require('firebase-admin');

// בדיקת קיום הסוד
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ שגיאה: הסוד FIREBASE_SERVICE_ACCOUNT לא הוגדר ב-GitHub Secrets!");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error("❌ שגיאה: לא ניתן היה לפענח את ה-Service Account JSON:", e.message);
    process.exit(1);
}

const db = admin.firestore();

async function startAmbushProcess() {
    const now = admin.firestore.Timestamp.now();
    const hoursLimit = 24; 
    const timeThreshold = Date.now() - (hoursLimit * 60 * 60 * 1000);
    
    const batch = db.batch();
    
    // אובייקט לניהול סטטיסטיקות ללוגים
    const stats = {
        totalScanned: 0,
        eligible: 0,
        skippedEnergy: 0,
        skippedTime: 0,
        updated: 0,
        errors: 0
    };

    console.log("------------------------------------------");
    console.log("🔍 התחלת סריקת שחקנים למארב...");

    try {
        // שליפת כל השחקנים (סינון לוגי יתבצע בקוד למניעת בעיות אינדקס)
        const playersSnap = await db.collection('players').get();
        stats.totalScanned = playersSnap.size;

        // שליפת מפלצות
        const monstersSnap = await db.collection('monsters').get();
        const monsters = monstersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (monsters.length === 0) {
            console.error("❌ עצירה: אוסף ה-monsters ריק! לא ניתן לבצע מארב ללא מפלצות.");
            return;
        }

        for (const playerDoc of playersSnap.docs) {
            const player = playerDoc.data();
            const playerName = player.username || playerDoc.id;

            // 1. בדיקת אנרגיה (חייב להיות 100)
            if (player.energy !== 100) {
                stats.skippedEnergy++;
                continue; 
            }

            // 2. בדיקת זמן (עבר 24 שעות)
            const lastAmbush = player.lastAmbushDate ? player.lastAmbushDate.toMillis() : 0;
            if (lastAmbush > timeThreshold) {
                stats.skippedTime++;
                continue;
            }

            // אם הגענו לכאן, השחקן מתאים למארב
            stats.eligible++;
            console.log(`⚔️ מבצע מארב לשחקן: ${playerName}`);

            try {
                // בחירת מפלצת
                const relevantMonsters = monsters.filter(m => (m.maxLevel || 99) >= (player.level || 1));
                const selectedMonster = relevantMonsters.length > 0 
                    ? relevantMonsters[Math.floor(Math.random() * relevantMonsters.length)]
                    : monsters[0];

                // לוגיקת קרב
                const pAtk = player.attack || 10;
                const mAtk = (Math.random() * 20) + ((player.level || 1) * 6);
                const winChance = pAtk / (pAtk + mAtk);
                const didWin = Math.random() < winChance;

                let damage = 0;
                let loot = 0;

                if (didWin) {
                    loot = Math.floor(Math.random() * 30) + 10;
                    console.log(`   🏆 תוצאה: ניצחון! זכה ב-${loot} זוזים.`);
                } else {
                    damage = Math.floor(Math.random() * 20) + 15;
                    console.log(`   💀 תוצאה: הפסד! ספג ${damage} נזק.`);
                }

                // עדכון שחקן
                batch.update(playerDoc.ref, {
                    energy: Math.max(0, 100 - damage),
                    coins: admin.firestore.FieldValue.increment(loot),
                    lastAmbushDate: now,
                    lastHpUpdate: now
                });

                // יצירת נוטיפיקציה
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    targetUserId: playerDoc.id,
                    title: didWin ? "ניצחון במארב! ⚔️" : "הותקפת במארב! 💀",
                    message: didWin 
                        ? `הבסת את ${selectedMonster.name} וזכית ב-${loot} זוזים!` 
                        : `הופתעת על ידי ${selectedMonster.name} ואיבדת ${damage} HP.`,
                    type: "AMBUSH",
                    isRead: false,
                    createdAt: now
                });

                stats.updated++;

            } catch (err) {
                console.error(`   ❌ שגיאה בעיבוד שחקן ${playerName}:`, err.message);
                stats.errors++;
            }
        }

        // ביצוע העדכון בבת אחת
        if (stats.updated > 0) {
            await batch.commit();
        }

        // דו"ח סיכום סופי
        console.log("------------------------------------------");
        console.log("📊 דו\"ח סיכום פעילות מארב:");
        console.log(`✅ סה"כ שחקנים שנסרקו: ${stats.totalScanned}`);
        console.log(`⏩ דולגו (אנרגיה נמוכה מ-100%): ${stats.skippedEnergy}`);
        console.log(`⏩ דולגו (טרם עברו 24 שעות): ${stats.skippedTime}`);
        console.log(`🎯 שחקנים שנמצאו מתאימים: ${stats.eligible}`);
        console.log(`🚀 שחקנים שעודכנו בהצלחה: ${stats.updated}`);
        if (stats.errors > 0) console.log(`⚠️ שגיאות בעיבוד: ${stats.errors}`);
        console.log("------------------------------------------");

    } catch (error) {
        console.error("❌ שגיאה קריטית בתהליך המארב:", error);
    }
}

startAmbushProcess();
