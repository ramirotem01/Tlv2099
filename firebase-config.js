// ייבוא הפונקציות הנדרשות מה-SDK של Firebase (גרסת Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// הגדרות הפרויקט שלך ב-Firebase
// כאן תדביק את המפתחות שקיבלת מהקונסול של Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "tlv2099.firebaseapp.com",
  projectId: "tlv2099",
  storageBucket: "tlv2099.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// אתחול האפליקציה
const app = initializeApp(firebaseConfig);

// אתחול השירותים שבהם נשתמש
export const db = getFirestore(app); // מסד הנתונים של השחקנים והמשימות
export const auth = getAuth(app);    // מערכת ההתחברות (Login)
