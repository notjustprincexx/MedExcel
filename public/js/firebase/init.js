import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
        import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

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

        window.db   = db;
        window.auth = auth;

        // Expose Firestore helpers so non-module scripts can call them
        window._doc       = doc;
        window._updateDoc = updateDoc;
        window._deleteDoc = deleteDoc;
        window._setDoc    = setDoc;
        window._signOut   = signOut;

        // Expose critical Firebase functions
        window.logoutUser = async function() {
            const savedTheme = localStorage.getItem('medexcel_theme');
            try { await signOut(auth); } catch (e) {}
            localStorage.clear();
            if (savedTheme) localStorage.setItem('medexcel_theme', savedTheme);
            window.location.replace("index.html");
        };

        window.sendPasswordReset = async function() {
            if (!window.currentUser || !window.currentUser.email) {
                alert("No email associated with this account.");
                return;
            }

            const email = window.currentUser.email;
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert("Invalid email address on this account.");
                return;
            }

            // Loading state
            const row      = document.getElementById('changePasswordRow');
            const label    = document.getElementById('changePasswordLabel');
            const chevron  = document.getElementById('changePasswordChevron');
            if (row)     row.style.pointerEvents = 'none';
            if (label)   { label.textContent = 'Sending…'; label.style.color = 'var(--text-muted)'; }
            if (chevron) chevron.className = 'fas fa-spinner fa-spin';

            try {
                const res = await fetch("https://us-central1-medxcel.cloudfunctions.net/sendResetEmail", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Server error (${res.status})`);
                }

                if (label)   { label.textContent = 'Email sent!'; label.style.color = 'var(--accent-green)'; }
                if (chevron) chevron.className = 'fas fa-check';
                setTimeout(() => {
                    if (label)   { label.textContent = 'Change Password'; label.style.color = 'var(--text-main)'; }
                    if (chevron) chevron.className = 'fas fa-chevron-right';
                    if (row)     row.style.pointerEvents = '';
                }, 3000);

            } catch(e) {
                if (label)   { label.textContent = 'Change Password'; label.style.color = 'var(--text-main)'; }
                if (chevron) chevron.className = 'fas fa-chevron-right';
                if (row)     row.style.pointerEvents = '';
                alert("Failed to send reset email: " + e.message);
            }
        };

        window.confirmDeleteAccount = window.showDeleteAccountModal;

        document.getElementById('confirmLogoutBtn').onclick = window.logoutUser;
        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            if (window.quizToDelete !== null && window.currentUser) {
                try {
                    await deleteDoc(doc(db, "users", window.currentUser.uid, "quizzes", window.quizToDelete.toString()));
                    window.quizzes = window.quizzes.filter(q => q.id !== window.quizToDelete);
                    localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes));
                    const activeTab = document.querySelector('.tab-btn.active').dataset.filter;
                    window.renderLibrary(activeTab, document.getElementById('librarySearchInput').value);
                    window.closeGlobalModal('deleteModalBackdrop');
                    if (window.currentQuiz && window.currentQuiz.id === window.quizToDelete) { window.closePracticeMobile(); }
                    window.quizToDelete = null;
                } catch(e) { console.error("Could not delete from cloud", e); }
            }
        });

        // Returns the ISO date string of the current week's Monday (used as reset key)
        function _getWeekKey() {
            const now = new Date();
            const day = now.getDay(); // 0=Sun
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.getFullYear(), now.getMonth(), diff);
            return monday.toISOString().split('T')[0];
        }

        window.addXP = async function(amount) {
            if (amount <= 0) return;
            window.userStats.xp += amount;

            // Weekly XP — reset each Monday
            const uid = window.currentUser?.uid || 'guest';
            const weekKey = _getWeekKey();
            const storedWeekKey = localStorage.getItem('medexcel_weekkey_' + uid);
            if (storedWeekKey !== weekKey) {
                window.userStats.weeklyXp = 0;
                localStorage.setItem('medexcel_weekkey_' + uid, weekKey);
            }
            window.userStats.weeklyXp = (window.userStats.weeklyXp || 0) + amount;

            localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));
            if (window.currentUser) {
                try {
                    let dName = window.currentUser.displayName || (window.currentUser.email ? window.currentUser.email.split('@')[0] : "User");
                    await setDoc(doc(db, "users", window.currentUser.uid), { 
                        uid: window.currentUser.uid, 
                        xp: window.userStats.xp, 
                        weeklyXp: window.userStats.weeklyXp,
                        displayName: dName 
                    }, { merge: true });
                } catch (e) { console.error("Failed to sync XP", e); }
            }
            // Update UI elements
            const uiXP1 = document.getElementById('studyXpDisplay'); if(uiXP1) uiXP1.textContent = window.formatXP(window.userStats.xp);
            const uiXP2 = document.getElementById('currentUserXp'); if(uiXP2) uiXP2.textContent = window.formatXP(window.userStats.xp);

            // Keep cached leaderboard data in sync so This Week tab reflects latest XP immediately
            if (window.currentUser && Array.isArray(window._lbUsers)) {
                const meIdx = window._lbUsers.findIndex(u => u.uid === window.currentUser.uid);
                const dName = window.currentUser.displayName || (window.currentUser.email ? window.currentUser.email.split('@')[0] : 'User');
                if (meIdx >= 0) {
                    window._lbUsers[meIdx].xp       = window.userStats.xp;
                    window._lbUsers[meIdx].weeklyXp  = window.userStats.weeklyXp;
                } else {
                    window._lbUsers.push({ uid: window.currentUser.uid, displayName: dName, xp: window.userStats.xp, weeklyXp: window.userStats.weeklyXp, avatarIndex: null });
                }
            }
        };

        window.syncUserStreak = async function(uid, streakCount, lastDate) {
            try { await updateDoc(doc(window.db, "users", uid), { streak: streakCount, lastCheckIn: lastDate }); } 
            catch(e) { console.error("Failed to sync streak to cloud", e); }
        };
