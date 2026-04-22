// ייבוא ה-SDK ישירות מהרשת (מתאים לעבודה בדפדפן/GitHub)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// הגדרות הפרויקט שלך (הדבקתי כאן את המפתחות ששלחת)
const firebaseConfig = {
  apiKey: "AIzaSyB7D3zvsVJKq0tWCOGYFJ4Q5xs89VQm7i8",
  authDomain: "tlv2099.firebaseapp.com",
  projectId: "tlv2099",
  storageBucket: "tlv2099.firebasestorage.app",
  messagingSenderId: "150961778925",
  appId: "1:150961778925:web:b5f804c8ae9f3a139a5ce4"
};

// אתחול האפליקציה
const app = initializeApp(firebaseConfig);

// ייצוא השירותים כדי שנוכל להשתמש בהם בדפים אחרים
export const db = getFirestore(app);
export const auth = getAuth(app);
