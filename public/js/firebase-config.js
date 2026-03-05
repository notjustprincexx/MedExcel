import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyADgcz_naQ_5tpXcpI8tSvm1b4RVLDrlaw",
    authDomain: "medxcel.firebaseapp.com",
    projectId: "medxcel",
    storageBucket: "medxcel.firebasestorage.app",
    messagingSenderId: "649180317389",
    appId: "1:649180317389:web:f6b9a7053a37853ea04b84"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");