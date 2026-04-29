const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ Missing FIREBASE_SERVICE_ACCOUNT");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function assignQuests() {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let assignedCount = 0;

    console.log("🔍 בוחן שחקנים לקבלת משימות חדשות...");

    try {
        const playersSnap = await db.collection('players').get();

        for (const playerDoc of playersSnap.docs) {
            const player = playerDoc.data();
            const playerLevel = player.level || 1;

            // בדיקה אם כבר יש משימה פעילה
            if (player.activeQuest && player.activeQuest.status === 'open') {
                console.log(`⏩ לשחקן ${player.username || playerDoc.id} כבר יש משימה פעילה. מדלג.`);
                continue;
            }

            //  כשתרצה גם קרב ציידים תזחזיר את 2 גם להגרלה הגרלת סוג משימה (1-4)
            const allowedQuests = [1, 3, 4];
            const questType = allowedQuests[Math.floor(Math.random() * allowedQuests.length)];

            let targetValue = 0;
            let questTitle = "";

            switch (questType) {
                case 1: // מסעות ביטקוין
                    targetValue = Math.ceil(playerLevel / (Math.floor(Math.random() * 4) + 2)); // רמה חלקי 2-5
                    questTitle = `בצע ${targetValue} מסעות ביטקוין`;
                    break;
                case 2: // קרבות ציידים (PvP)
                    targetValue = Math.ceil(playerLevel / (Math.floor(Math.random() * 3) + 3)); // רמה חלקי 3-5
                    questTitle = `נצח ${targetValue} קרבות ציידים`;
                    break;
                case 3: // ק"מ באיילון
                    // הגרלת מספר רנדומלי בין 2 ל-4 (כולל)
                    const multiplier = Math.floor(Math.random() * 2) + 2; 
                    targetValue = 500 * playerLevel * multiplier;
                    questTitle = `צבור ${targetValue.toLocaleString()} ק"מ במרוץ איילון`;
                    break;
                case 4: // חיסול מפלצות
                    targetValue = Math.ceil(playerLevel / (Math.floor(Math.random() * 3) + 3)); // רמה חלקי 3-5
                    questTitle = `חסל ${targetValue} מפלצות במפה הטקטית`;
                    break;
            }

            const questData = {
                type: questType,
                title: questTitle,
                target: targetValue,
                current: 0,
                status: 'open',
                assignedAt: now
            };

            // עדכון השחקן
            batch.update(playerDoc.ref, { activeQuest: questData });

            // יצירת הודעה בתיבת ההודעות
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                targetUserId: playerDoc.id,
                title: "משימה חדשה התקבלה! 📜",
                message: `המפקדה הקצתה לך משימה: ${questTitle}. השלם אותה כדי לזכות בבונוס!`,
                type: "QUEST_ASSIGNED",
                isRead: false,
                createdAt: now
            });

            assignedCount++;
            console.log(`✅ משימה הוקצתה ל-${player.username || playerDoc.id}: ${questTitle}`);
        }

        if (assignedCount > 0) {
            await batch.commit();
            console.log(`🚀 סוכם: ${assignedCount} משימות חדשות הופצו.`);
        } else {
            console.log("✨ אין שחקנים חדשים שזקוקים למשימה כרגע.");
        }

    } catch (error) {
        console.error("❌ שגיאה קריטית:", error);
    }
}

assignQuests();
