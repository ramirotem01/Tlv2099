import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const mainBtn = document.getElementById('main-btn');
const toggleAuth = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');

let isLoginMode = true;

// החלפה בין מצב כניסה להרשמה
toggleAuth.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    formTitle.innerText = isLoginMode ? "TLV2099: כניסת צייד" : "TLV2099: גיוס צייד חדש";
    mainBtn.innerText = isLoginMode ? "כניסה למערכת" : "הירשם והתחל לצוד";
    usernameInput.style.display = isLoginMode ? "none" : "block";
    toggleAuth.innerText = isLoginMode ? "אין לך חשבון? הירשם כאן" : "כבר רשום? היכנס כאן";
});

mainBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value;

    if (isLoginMode) {
        // התחברות
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("ברוך הבא צייד!");
            window.location.href = "dashboard.html"; // נעבור לדף הבא שנבנה
        } catch (error) {
            alert("שגיאה בכניסה: " + error.message);
        }
    } else {
        // הרשמה
        if (!username) return alert("בחר כינוי צייד!");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // יצירת פרופיל ראשוני ב-Firestore
            await setDoc(doc(db, "players", user.uid), {
                username: username,
                level: 1,
                xp: 0,
                coins: 100,
                energy: 100,
                lastUpdate: new Date()
            });

            alert("החשבון נוצר! צא לדרך.");
            window.location.href = "dashboard.html";
        } catch (error) {
            alert("שגיאה בהרשמה: " + error.message);
        }
    }
});
