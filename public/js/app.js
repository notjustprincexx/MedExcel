import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// ================= 1. FIREBASE INITIALIZATION =================
const firebaseConfig = { 
    apiKey: "AIzaSyADgcz_naQ_5tpXcpI8tSvm1b4RVLDrlaw", 
    authDomain: "medxcel.firebaseapp.com", 
    projectId: "medxcel", 
    storageBucket: "medxcel.firebasestorage.app", 
    messagingSenderId: "649180317389", 
    appId: "1:649180317389:web:f6b9a7053a37853ea04b84"
};
const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "us-central1");

window.currentUser = null;
let userDataProfile = null; // Store fetched firestore data

// ================= 2. SPA ROUTER =================
const views = ['landing', 'home', 'create', 'library', 'profile'];

function handleRouting() {
    let hash = window.location.hash.replace('#', '') || 'landing';
    
    // Redirect logic based on Auth
    if (hash === 'landing' && window.currentUser) hash = 'home';
    if (hash !== 'landing' && !window.currentUser && hash !== 'login' && hash !== 'signup') hash = 'landing';

    // Hide all views
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.classList.remove('active');
    });

    // Show active view
    const activeEl = document.getElementById(`view-${hash}`);
    if(activeEl) activeEl.classList.add('active');

    // Handle Global Nav visibility
    const nav = document.getElementById('global-nav');
    if(hash === 'landing') {
        nav.classList.add('hidden');
    } else {
        nav.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(item => {
            if(item.dataset.target === hash) {
                item.classList.replace('text-slate-500', 'text-blue-500');
            } else {
                item.classList.replace('text-blue-500', 'text-slate-500');
            }
        });
    }

    // Trigger page-specific scripts based on route
    if(hash === 'home') initHomeView();
    if(hash === 'library') initLibraryView();
    if(hash === 'profile') initProfileView();
}
window.addEventListener('hashchange', handleRouting);

// ================= 3. GLOBAL MODALS & UTILS =================
window.showDialog = function(msg, title = "Notice", onConfirm = null) {
    document.getElementById('okTitle').textContent = title;
    document.getElementById('okMessage').textContent = msg;
    const backdrop = document.getElementById('okBackdrop');
    backdrop.classList.add('active');
    
    document.getElementById('okConfirm').onclick = () => {
        backdrop.classList.remove('active');
        if(onConfirm) onConfirm();
    };
    document.getElementById('okCancel').onclick = () => backdrop.classList.remove('active');
}

function showLoader(text = "Loading...") {
    document.getElementById('loaderText').textContent = text;
    document.getElementById('loaderScreen').classList.remove('hidden');
}
function hideLoader() {
    document.getElementById('loaderScreen').classList.add('hidden');
}

// ================= 4. AUTHENTICATION & LANDING LOGIC =================
const savedUserStr = localStorage.getItem("nativeUser");
if (savedUserStr) { try { window.currentUser = JSON.parse(savedUserStr); } catch(e){} }

onAuthStateChanged(auth, async (user) => {
    hideLoader();
    if (user) {
        window.currentUser = user;
        localStorage.setItem("nativeUser", JSON.stringify({ email: user.email, uid: user.uid, displayName: user.displayName }));
        
        // Self-heal user doc
        try {
            let uRef = doc(db, "users", user.uid);
            let snap = await getDoc(uRef);
            if(!snap.exists()) {
                await setDoc(uRef, { email: user.email, uid: user.uid, plan: "free", dailyUsage: 0, planUsed: 0, lastDailyReset: new Date().toISOString().split("T")[0], createdAt: serverTimestamp() }, { merge: true });
            }
            userDataProfile = (await getDoc(uRef)).data();
        } catch(e) {}

        if(!window.location.hash || window.location.hash === '#landing') window.location.hash = '#home';
    } else {
        window.currentUser = null;
        userDataProfile = null;
        localStorage.clear();
        window.location.hash = '#landing';
    }
    handleRouting();
});

// Landing UI Functions
window.isSignupMode = false;
window.toggleLogin = function(show, signup = false) {
    const login = document.getElementById('loginScreen');
    window.isSignupMode = signup;
    if (show) {
        document.getElementById('loginHeading').textContent = signup ? 'Create Account' : 'Welcome Back';
        document.getElementById('signInBtn').textContent = signup ? 'Sign Up' : 'Sign In';
        document.getElementById('nameRow').style.display = signup ? 'block' : 'none';
        login.classList.add('show');
    } else {
        login.classList.remove('show');
    }
}
window.togglePassword = function() {
    const p = document.getElementById('loginPassword');
    p.type = p.type === "password" ? "text" : "password";
}

document.getElementById('signInBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('loginPassword').value;
    const name = document.getElementById('nameInput').value.trim();
    
    if(!email || !pass) return window.showDialog("Please enter email and password.");
    showLoader("Authenticating...");
    
    try {
        if(window.isSignupMode) {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(cred.user, { displayName: name });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch(err) {
        hideLoader();
        window.showDialog(err.message, "Error");
    }
});

window.startGoogleLogin = function() {
    if (window.Android && window.Android.startGoogleSignIn) {
        showLoader("Signing in with Google...");
        window.Android.startGoogleSignIn();
    } else {
        window.showDialog("Native login not available. Please use the mobile app.");
    }
};

window.onNativeLogin = async function(email, uid) {
    showLoader("Syncing account...");
    localStorage.setItem("nativeUser", JSON.stringify({ email, uid, displayName: email.split("@")[0] }));
    try {
        await setDoc(doc(db, "users", uid), { email, uid, plan: "free", dailyUsage: 0, planUsed: 0 }, { merge: true });
    } catch(e) {}
    window.location.hash = '#home';
};

window.logout = async function() {
    showLoader("Logging out...");
    try { await signOut(auth); } catch(e){}
    localStorage.clear();
    window.location.hash = '#landing';
}
document.getElementById('btnLogout').addEventListener('click', () => {
    window.showDialog("Are you sure you want to log out?", "Log Out", () => window.logout());
});

// ================= 5. HOME VIEW LOGIC =================
function initHomeView() {
    if(!window.currentUser) return;
    const name = window.currentUser.displayName || window.currentUser.email.split("@")[0];
    document.getElementById('greetingTitle').innerHTML = `Hi, ${name} 👋`;

    // Quick continue section check
    const quizzes = JSON.parse(localStorage.getItem('medexcel_quizzes')) || [];
    const contSec = document.getElementById('continueStudyingSection');
    if(quizzes.length > 0) {
        const lq = quizzes[quizzes.length-1];
        document.getElementById('continueTitle').textContent = lq.title;
        document.getElementById('continueCardCount').textContent = lq.questions ? lq.questions.length : 0;
        document.getElementById('continueSubject').textContent = lq.subject || 'General';
        contSec.classList.remove('hidden');
    } else {
        contSec.classList.add('hidden');
    }
}

// ================= 6. CREATE/GENERATE VIEW LOGIC =================
let selectedFile = null;
let quizType = "Flashcards";
const allowedMaxItems = 15; // Set dynamically later based on plan if needed

document.getElementById('fileInput').addEventListener('change', (e) => {
    if(e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        document.getElementById('uploadIcon').classList.add('text-blue-500');
        document.getElementById('uploadTitle').textContent = selectedFile.name;
        document.getElementById('uploadSubtitle').textContent = (selectedFile.size/1024/1024).toFixed(2) + " MB";
        document.getElementById('dropZone').classList.add('active');
        document.getElementById('configSection').classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').classList.add('active');
    }
});

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.type-btn').forEach(b => {
            b.classList.remove('active', 'bg-blue-600', 'text-white');
            b.classList.add('text-slate-400');
        });
        e.currentTarget.classList.remove('text-slate-400');
        e.currentTarget.classList.add('active', 'bg-blue-600', 'text-white');
        quizType = e.currentTarget.textContent.trim();
    });
});

document.getElementById('itemSlider').addEventListener('input', (e) => {
    document.getElementById('sliderValue').textContent = e.target.value;
});

document.getElementById('generateBtn').addEventListener('click', async () => {
    if(!selectedFile) return;
    const requestedItems = parseInt(document.getElementById('itemSlider').value, 10);
    
    showLoader("AI is scanning your document...");
    
    try {
        const securePath = `uploads/${window.currentUser.uid}/${Date.now()}_${selectedFile.name}`;
        await uploadBytes(ref(storage, securePath), selectedFile);
        
        const generateFunc = httpsCallable(functions, 'generateQuizFromFile');
        const res = await generateFunc({
            filePath: securePath, fileName: selectedFile.name, quizType: quizType, 
            topicFocus: document.getElementById('topicFocus').value, numberOfItems: requestedItems
        });
        
        const cards = res.data.cards || res.data.items || [];
        if(cards.length === 0) throw new Error("No items generated.");

        // Save locally for "Library/Continue"
        const existing = JSON.parse(localStorage.getItem('medexcel_quizzes')) || [];
        existing.push({ title: selectedFile.name.split('.')[0], subject: document.getElementById('topicFocus').value || 'AI Set', questions: cards });
        localStorage.setItem('medexcel_quizzes', JSON.stringify(existing));

        hideLoader();
        window.showDialog(`Successfully generated ${cards.length} items! Check your Library to practice.`, "Success", () => {
            window.location.hash = '#library';
        });

    } catch(err) {
        hideLoader();
        window.showDialog("Generation failed: " + err.message);
    }
});

// ================= 7. LIBRARY VIEW LOGIC =================
async function initLibraryView() {
    if(!window.currentUser) return;
    try {
        const q = query(collection(db, "mcqs"), where("userId", "==", window.currentUser.uid));
        const snap = await getDocs(q);
        
        let mCount=0, fCount=0;
        const setsMap = new Map();
        
        snap.forEach(doc => {
            const d = doc.data();
            const subj = d.subject || "General Study";
            if(d.type && d.type.includes("Multiple")) mCount++; else fCount++;
            
            if(!setsMap.has(subj)) setsMap.set(subj, { subject: subj, count: 0 });
            setsMap.get(subj).count++;
        });
        
        document.getElementById('totalMcqsCount').textContent = mCount;
        document.getElementById('totalFcCount').textContent = fCount;
        
        const arr = Array.from(setsMap.values());
        document.getElementById('totalSetsText').textContent = `${arr.length} Sets`;
        
        const cont = document.getElementById('allSetsContainer');
        cont.innerHTML = '';
        if(arr.length === 0) cont.innerHTML = `<p class="text-slate-500 text-center text-sm py-4">No AI sets generated yet.</p>`;
        
        arr.forEach(s => {
            cont.innerHTML += `
            <div class="glass-panel p-4 rounded-xl flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-white text-sm">${s.subject}</h3>
                    <p class="text-xs text-slate-400">${s.count} items</p>
                </div>
                <button class="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg text-xs font-bold border border-blue-500/30">Review</button>
            </div>`;
        });

        // Initialize empty dummy chart
        new Chart(document.getElementById('weeklyChart').getContext('2d'), {
            type: 'bar',
            data: { labels: ['M','T','W','T','F','S','S'], datasets: [{ data: [12,45,30,80,25,60,90], backgroundColor: '#3b82f6', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, border: {display: false} } } }
        });

    } catch(e) { console.log(e); }
}

// ================= 8. PROFILE VIEW LOGIC =================
function initProfileView() {
    if(!window.currentUser) return;
    
    document.getElementById('userName').textContent = window.currentUser.displayName || 'Student';
    document.getElementById('userEmail').textContent = window.currentUser.email;
    document.getElementById('profileUserInitial').textContent = window.currentUser.email.charAt(0).toUpperCase();

    if(userDataProfile) {
        document.getElementById('streakCount').textContent = userDataProfile.streak || 0;
        document.getElementById('usageCount').textContent = userDataProfile.dailyUsage || 0;
        const plan = userDataProfile.plan || 'free';
        const limit = plan === 'elite' ? 50 : plan === 'premium' ? 30 : 5;
        const used = userDataProfile.dailyUsage || 0;
        
        document.getElementById('usageRemaining').textContent = `${Math.max(0, limit - used)} left`;
        document.getElementById('usageProgressBar').style.width = `${Math.min(100, (used/limit)*100)}%`;
        
        const badge = document.getElementById('planBadge');
        badge.textContent = plan === 'elite' ? 'Elite' : plan === 'premium' ? 'Premium' : 'Free Plan';
        if(plan !== 'free') badge.classList.replace('bg-slate-700', 'bg-blue-600');
    }
}
// Load Lottie Animations
if (window.lottie) {
    // Landing Page Animations
    const yayContainer = document.getElementById('lottie-yay');
    if(yayContainer) lottie.loadAnimation({ container: yayContainer, renderer: 'svg', loop: true, autoplay: true, path: 'YayJump.json' });
    
    const catContainer = document.getElementById('lottie-cat');
    if(catContainer) lottie.loadAnimation({ container: catContainer, renderer: 'svg', loop: true, autoplay: true, path: 'Blue Working Cat Animation.json' });

    // Main Loader Animation
    const loaderContainer = document.getElementById('lottieLoader');
    if(loaderContainer) lottie.loadAnimation({ container: loaderContainer, renderer: 'svg', loop: true, autoplay: true, path: 'Loader.json' });
}