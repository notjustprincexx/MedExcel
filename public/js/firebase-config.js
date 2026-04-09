import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyADgcz_naQ_5tpXcpI8tSvm1b4RVLDrlaw",
    authDomain: "medxcel.firebaseapp.com",
    projectId: "medxcel",
    storageBucket: "medxcel.firebasestorage.app",
    messagingSenderId: "649180317389",
    appId: "1:649180317389:web:f6b9a7053a37853ea04b84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Global Auth State Management & Anonymous Fallback
onAuthStateChanged(auth, (user) => {
    if (!user && localStorage.getItem("nativeUser")) {
        signInAnonymously(auth).catch(console.error);
    }
});