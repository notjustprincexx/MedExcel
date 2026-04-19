import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, deleteDoc, serverTimestamp, where, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
        window._firestoreGetDoc = getDoc;

        // Expose Firestore helpers so non-module scripts can call them
        window._doc       = doc;
        window._updateDoc = updateDoc;
        window._deleteDoc = deleteDoc;
        window._setDoc    = setDoc;
        window._signOut   = signOut;

        // Expose critical Firebase functions
        let _isLoggingOut = false;

        window.logoutUser = async function() {
            if (_isLoggingOut) return;
            _isLoggingOut = true;
            const savedTheme        = localStorage.getItem('medexcel_theme');
            const savedCoachMarks   = localStorage.getItem('medexcel_onboarding_v1');
            const savedOnboarding   = localStorage.getItem('medexcel_personalized_onboarding_done');
            const savedHasAccount   = localStorage.getItem('medexcel_has_account');
            try { await signOut(auth); } catch (e) {}
            localStorage.clear();
            if (savedTheme)      localStorage.setItem('medexcel_theme', savedTheme);
            if (savedCoachMarks) localStorage.setItem('medexcel_onboarding_v1', savedCoachMarks);
            if (savedOnboarding) localStorage.setItem('medexcel_personalized_onboarding_done', savedOnboarding);
            if (savedHasAccount) localStorage.setItem('medexcel_has_account', savedHasAccount);
            // nativeUser is intentionally NOT preserved — clears it so index.html won't redirect back to homepage
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
                    window._lbUsers.push({ uid: window.currentUser.uid, displayName: dName, xp: window.userStats.xp, weeklyXp: window.userStats.weeklyXp, avatarIndex: null, photoBase64: localStorage.getItem("medexcel_photo_" + window.currentUser.uid) || null });
                }
            }
        };

        window.syncUserStreak = async function(uid, streakCount, lastDate) {
            try { await updateDoc(doc(window.db, "users", uid), { streak: streakCount, lastCheckIn: lastDate }); } 
            catch(e) { console.error("Failed to sync streak to cloud", e); }
        };

        // Render Achievements Logic
        const MASTER_ACHIEVEMENTS = [
            { id: "first_quiz", title: "First Steps", desc: "First set", icon: "fa-seedling" }, { id: "streak_3", title: "On Fire", desc: "3 day streak", icon: "fa-fire" },
            { id: "accuracy_80", title: "Sharpshooter", desc: "80%+ accuracy", icon: "fa-bullseye" }, { id: "mcq_100", title: "Century", desc: "100 MCQs", icon: "fa-check-double" },
            { id: "elite_member", title: "Elite", desc: "Subscribed", icon: "fa-crown" }, { id: "night_owl", title: "Night Owl", desc: "Late study", icon: "fa-moon" }
        ];

        window.renderAchievements = function(unlockedIds) {
            const grid = document.getElementById('achievementsGrid'); if(!grid) return;
            grid.innerHTML = "";
            MASTER_ACHIEVEMENTS.forEach(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                const stateClass = isUnlocked ? "border-[var(--accent-btn)] bg-[var(--bg-body)] shadow-[0_0_15px_rgba(167,139,250,0.1)]" : "border-[var(--border-color)] bg-[var(--bg-body)] opacity-50 grayscale";
                const iconColor = isUnlocked ? "text-[var(--accent-btn)]" : "text-[var(--text-muted)]";
                grid.innerHTML += `<div class="${stateClass} border rounded-2xl p-3 flex flex-col items-center text-center transition-all relative overflow-hidden">${!isUnlocked ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-surface)]/50"><i class="fas fa-lock text-[var(--text-muted)]"></i></div>` : ''}<div class="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-1.5 ${iconColor}"><i class="fas ${ach.icon} text-sm"></i></div><h4 class="text-[10px] font-bold text-[var(--text-main)] mb-0.5">${ach.title}</h4><p class="text-[8px] text-[var(--text-muted)] leading-tight">${ach.desc}</p></div>`;
            });
        };

        // Render Library Logic
        window.renderLibrary = function(filter = 'all', searchQuery = '') {
            const container = document.getElementById('quizContainer'); if(!container) return;
            container.innerHTML = ''; 
            let filtered = window.quizzes.filter(q => q.title && q.title.toLowerCase().includes(searchQuery.toLowerCase()));
            if (filter === 'favorites') filtered = filtered.filter(q => q.favorite);
            else if (filter === 'mcqs') filtered = filtered.filter(q => q.type && q.type.includes("Multiple"));
            else if (filter === 'flashcards') filtered = filtered.filter(q => !q.type || !q.type.includes("Multiple"));
            
            if (filtered.length === 0) {
                container.innerHTML = `<div class="text-center py-10 fade-in"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center"><i class="fas fa-box-open text-2xl text-[var(--text-muted)]"></i></div><p class="text-sm font-medium text-[var(--text-muted)]">No sets found.</p></div>`;
                return;
            }

            // Sort newest first
            const sorted = filtered.slice().reverse();

            // quiz.id is Date.now() at creation — use it as the timestamp
            function getDateLabel(id) {
                const d = new Date(typeof id === 'number' ? id : parseInt(id));
                if (isNaN(d.getTime())) return 'Earlier';
                const today = new Date(); today.setHours(0,0,0,0);
                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                const dDay = new Date(d); dDay.setHours(0,0,0,0);
                if (dDay.getTime() === today.getTime()) return 'Today';
                if (dDay.getTime() === yesterday.getTime()) return 'Yesterday';
                return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
            }

            const groups = [];
            const seenLabels = {};
            sorted.forEach(quiz => {
                const label = getDateLabel(quiz.id);
                if (!seenLabels[label]) { seenLabels[label] = true; groups.push({ label, items: [] }); }
                groups[groups.length - 1].items.push(quiz);
            });

            groups.forEach(group => {
                container.innerHTML += `<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;padding:0.875rem 0 0.375rem;margin-bottom:0.25rem;">${group.label}</div>`;
                group.items.forEach(quiz => {
                    const qLength = quiz.questions ? quiz.questions.length : 0;
                    const isMCQ = quiz.type && quiz.type.includes("Multiple");
                    const itemLabel = isMCQ ? "Questions" : "Cards";
                    const iconSvg = isMCQ
                        ? `<svg viewBox="0 0 64 64" fill="none" style="width:38px;height:38px;"><rect x="12" y="10" width="40" height="48" rx="6" fill="#8b5cf6"/><rect x="24" y="6" width="16" height="8" rx="2" fill="#fbbf24"/><circle cx="32" cy="7" r="3" fill="#fbbf24"/><path d="M22 28L26 32L34 24" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.8"/><path d="M22 42L26 46L34 38" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.8"/><rect x="38" y="27" width="10" height="3" rx="1.5" fill="white" opacity="0.3"/><rect x="38" y="41" width="10" height="3" rx="1.5" fill="white" opacity="0.3"/></svg>`
                        : `<svg viewBox="0 0 64 64" fill="none" style="width:38px;height:38px;"><rect x="8" y="18" width="28" height="38" rx="4" transform="rotate(-15 8 18)" fill="#ec4899"/><rect x="20" y="14" width="28" height="38" rx="4" transform="rotate(-5 20 14)" fill="#facc15"/><rect x="30" y="12" width="28" height="38" rx="4" transform="rotate(10 30 12)" fill="#8b5cf6"/><rect x="38" y="24" width="12" height="3" rx="1.5" fill="white" opacity="0.4" transform="rotate(10 38 24)"/><rect x="38" y="32" width="12" height="3" rx="1.5" fill="white" opacity="0.4" transform="rotate(10 38 32)"/></svg>`;
                    container.innerHTML += `
                        <div class="quiz-item fade-in group" onclick="window.loadQuizOverview(${quiz.id})">
                            <div class="w-14 h-14 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)] flex items-center justify-center relative shrink-0 overflow-hidden">
                                ${iconSvg}
                                ${quiz.favorite ? '<div class="absolute top-0 right-0 w-3 h-3 bg-[var(--accent-yellow)] rounded-bl-lg"></div>' : ''}
                            </div>
                            <div class="flex-1 min-w-0 py-1">
                                <h3 class="font-bold text-[var(--text-main)] text-base truncate mb-1.5">${quiz.title}</h3>
                                <div class="flex items-center gap-2 text-[var(--text-muted)] text-[12px] font-semibold">
                                    <span class="bg-[var(--bg-body)] border border-[var(--border-color)] px-2 py-0.5 rounded-md truncate max-w-[110px]">${quiz.subject || 'General'}</span>
                                    <span class="shrink-0">${qLength} ${itemLabel}</span>
                                </div>
                            </div>
                            <button onclick="window.promptDelete(event, ${quiz.id})" class="p-2.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors shrink-0 opacity-0 group-hover:opacity-100 lg:opacity-60"><i class="fas fa-trash-alt"></i></button>
                        </div>`;
                });
            });
        };

        window.loadQuizOverview = function(id) {
            currentQuiz = window.currentQuiz = window.quizzes.find(q => q.id === id); window.openPracticeMobile();
            const area = document.getElementById('studyPracticeArea');
            const qLength = currentQuiz.questions ? currentQuiz.questions.length : 0;
            const bScore = currentQuiz.stats ? currentQuiz.stats.bestScore : 0;
            const attempts = currentQuiz.stats ? currentQuiz.stats.attempts : 0;
            const isMCQ = currentQuiz.type && currentQuiz.type.includes("Multiple");
            const itemLabel = isMCQ ? "Questions" : "Cards";

            area.innerHTML = `
                <div class="card-panel fade-in w-full max-w-2xl">
                    <div class="flex justify-between items-start mb-4">
                        <span class="bg-[var(--bg-glass)] text-[var(--accent-btn)] text-xs font-extrabold px-3 py-1.5 rounded-md uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-tag"></i> ${currentQuiz.subject}</span>
                        <button onclick="window.toggleFavoriteCurrent()" class="text-xl p-2 -m-2 transition-colors ${currentQuiz.favorite ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-yellow)]'}"><i class="fas fa-star"></i></button>
                    </div>
                    <h2 class="text-3xl font-bold text-[var(--text-main)] mb-2 tracking-tight">${currentQuiz.title}</h2>
                    <p class="text-[15px] font-medium text-[var(--text-muted)] mb-8"><i class="fas fa-layer-group mr-1.5"></i>${qLength} ${itemLabel}</p>
                    <div class="grid grid-cols-2 gap-3 mb-8">
                        <div class="bg-[var(--bg-body)] p-5 rounded-2xl border border-[var(--border-color)]">
                            <p class="text-[11px] text-[var(--text-muted)] uppercase font-extrabold tracking-widest mb-1">Previous Best</p>
                            <p class="text-2xl font-bold text-[var(--text-main)]">${bScore} <span class="text-sm text-[var(--text-muted)] font-medium">/ ${qLength}</span></p>
                        </div>
                        <div class="bg-[var(--bg-body)] p-5 rounded-2xl border border-[var(--border-color)]">
                            <p class="text-[11px] text-[var(--text-muted)] uppercase font-extrabold tracking-widest mb-1">Total Attempts</p>
                            <p class="text-2xl font-bold text-[var(--text-main)]">${attempts}</p>
                        </div>
                    </div>
                    <button onclick="window.startPractice(false)" class="w-full bg-[var(--accent-btn)] text-[var(--btn-text)] font-bold py-3.5 rounded-full border-none cursor-pointer transition-transform active:scale-95 text-[17px] flex items-center justify-center gap-2"><i class="fas fa-play text-sm"></i> Begin Session</button>
                </div>`;
        };

        window.toggleFavoriteCurrent = async function() {
            if (window.currentQuiz && window.currentUser) {
                window.currentQuiz.favorite = !window.currentQuiz.favorite;
                try { 
                    if (window._updateDoc && window._doc) {
                        await window._updateDoc(window._doc(window.db, "users", window.currentUser.uid, "quizzes", window.currentQuiz.id.toString()), { favorite: window.currentQuiz.favorite }); 
                    }
                    localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes)); 
                } catch(e) {}
                window.loadQuizOverview(window.currentQuiz.id);
                const activeTabEl = document.querySelector('.tab-btn.active');
                if (activeTabEl) window.renderLibrary(activeTabEl.dataset.filter, document.getElementById('librarySearchInput').value);
            }
        };

        // Leaderboard Logic
        // Leaderboard colour palette for user initials
        const LB_COLORS = [
            ['#7c3aed','#ede9fe'],['#0369a1','#e0f2fe'],['#065f46','#d1fae5'],
            ['#9a3412','#ffedd5'],['#be185d','#fce7f3'],['#1e40af','#dbeafe'],
            ['#854d0e','#fef9c3'],['#4d7c0f','#ecfccb'],['#155e75','#cffafe'],
        ];
        function lbColorFor(name) {
            let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
            return LB_COLORS[Math.abs(h) % LB_COLORS.length];
        }

        // Build an avatar element for a leaderboard user
        function lbAvatarHTML(user, size, currentUserId) {
            const isMe = user.uid === currentUserId;

            // Check custom photo first (base64)
            let photoBase64 = user.photoBase64 || null;
            if (isMe && !photoBase64) {
                photoBase64 = localStorage.getItem('medexcel_photo_' + (currentUserId || 'guest'));
            }
            if (photoBase64) {
                return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${photoBase64}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='?';"></div>`;
            }

            // Fall back to spritesheet avatar
            let avatarIndex = user.avatarIndex ?? null;
            if (isMe && avatarIndex === null) {
                const saved = localStorage.getItem('medexcel_avatar_' + (currentUserId || 'guest'));
                if (saved !== null) avatarIndex = parseInt(saved);
            }
            if (avatarIndex !== null && AVATAR_GRID) {
                const a = AVATAR_GRID[parseInt(avatarIndex)];
                if (a) return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;background-image:url('${AVATAR_IMAGE_PATH}');background-size:300% 300%;background-position:${a.col*50}% ${a.row*50}%;flex-shrink:0;"></div>`;
            }
            const [bg, fg] = lbColorFor(user.displayName || '?');
            const initial = window.getInitial ? window.getInitial(user.displayName) : (user.displayName||'?').charAt(0).toUpperCase();
            return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.35)}px;color:${fg};flex-shrink:0;">${initial}</div>`;
        }

        // Tab state
        window._lbTab = 'alltime';
        window._lbUsers = [];
        window._lbUserId = null;

        window.switchLbTab = function(tab) {
            window._lbTab = tab;
            const allBtn    = document.getElementById('lbTabAllTime');
            const wkBtn     = document.getElementById('lbTabWeek');
            const grpBtn    = document.getElementById('lbTabGroups');
            const podium    = document.getElementById('podiumContainer');
            const ranked    = document.getElementById('lbRankedSection');
            const grpPanel  = document.getElementById('groupsPanel');
            const rankBar   = document.getElementById('yourRankBar');

            [allBtn, wkBtn, grpBtn].forEach(btn => {
                if (!btn) return;
                btn.style.background = 'transparent';
                btn.style.color      = 'var(--text-muted)';
                btn.style.boxShadow  = 'none';
            });

            if (tab === 'groups') {
                if (grpBtn) { grpBtn.style.background='var(--accent-btn)'; grpBtn.style.color='var(--btn-text)'; grpBtn.style.boxShadow='0 2px 8px rgba(139,92,246,0.3)'; }
                if (podium)   podium.style.display  = 'none';
                if (ranked)   ranked.style.display  = 'none';
                if (grpPanel) grpPanel.style.display = 'flex';
                if (rankBar)  rankBar.style.display  = 'none';
                window.loadMyGroups();
                return;
            }

            // Back to leaderboard tabs
            if (podium)   podium.style.display  = 'flex';
            if (ranked)   ranked.style.display  = '';
            if (grpPanel) grpPanel.style.display = 'none';

            if (tab === 'alltime') {
                if (allBtn) { allBtn.style.background='var(--accent-btn)'; allBtn.style.color='var(--btn-text)'; allBtn.style.boxShadow='0 2px 8px rgba(139,92,246,0.3)'; }
            } else {
                if (wkBtn) { wkBtn.style.background='var(--accent-btn)'; wkBtn.style.color='var(--btn-text)'; wkBtn.style.boxShadow='0 2px 8px rgba(139,92,246,0.3)'; }
            }

            if (tab === 'week' && window._lbUserId) {
                window.loadLeaderboard(window._lbUserId);
            } else if (window._lbUsers.length) {
                window.renderLeaderboardDOM(window._lbUsers, window._lbUserId);
            }
        };

        window.loadLeaderboard = async function(currentUserId) {
            window._lbUserId = currentUserId;
            try {
                const uiXP = document.getElementById('currentUserXp');
                if (uiXP) { uiXP.classList.remove('skeleton'); uiXP.style.cssText=''; uiXP.textContent = window.formatXP(window.userStats?.xp || 0); }
                const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(50));
                const snap = await getDocs(q);
                let fetched = [];
                snap.forEach(d => {
                    const data = d.data();
                    if (data.xp && data.xp > 0) fetched.push({
                        uid: d.id,
                        displayName: data.displayName || data.email?.split('@')[0] || "User",
                        xp: data.xp,
                        weeklyXp: data.weeklyXp || 0,
                        avatarIndex: data.avatarIndex ?? null,
                        photoBase64: data.photoBase64 || null,
                    });
                });
                window._lbUsers = fetched;
                window.renderLeaderboardDOM(fetched, currentUserId);
            } catch(e) {
                const lc = document.getElementById('leaderboardList');
                if (lc) {
                    lc.innerHTML = e.message?.includes("index")
                        ? `<div style="text-align:center;color:#f59e0b;padding:1.5rem;font-size:0.875rem;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Firebase index required.</div>`
                        : `<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-size:0.875rem;">Failed to load leaderboard.</div>`;
                }
            }
        };

        window.renderLeaderboardDOM = function(allUsers, currentUserId) {
            const useWeekly = window._lbTab === 'week';
            // Sort by the right XP field
            let users = [...allUsers].sort((a,b) => (useWeekly ? b.weeklyXp - a.weeklyXp : b.xp - a.xp));
            // Filter out zero weekly XP if in weekly mode
            if (useWeekly) users = users.filter(u => u.weeklyXp > 0);

            const listContainer = document.getElementById('leaderboardList');
            const skeletons = ['name1','xp1','avatarBox1','name2','xp2','avatarBox2','name3','xp3','avatarBox3'];
            skeletons.forEach(id => { const el = document.getElementById(id); if (el) { el.classList.remove('skeleton'); el.style.width='auto'; el.style.height='auto'; } });

            // Empty state
            if (users.length === 0) {
                ['name1','name2','name3'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='---'; });
                ['xp1','xp2','xp3'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=''; });
                listContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem 1rem;font-size:0.875rem;font-weight:500;">${useWeekly ? 'No activity this week yet — go study!' : 'No users have earned XP yet!'}</div>`;
                document.getElementById('yourRankBar').style.display = 'none';
                return;
            }

            const xpField = useWeekly ? 'weeklyXp' : 'xp';

            // --- Podium top 3 ---
            const podiumSlots = [
                { nameId:'name1', xpId:'xp1', boxId:'avatarBox1', avatarId:'avatar1' },
                { nameId:'name2', xpId:'xp2', boxId:'avatarBox2', avatarId:'avatar2' },
                { nameId:'name3', xpId:'xp3', boxId:'avatarBox3', avatarId:'avatar3' },
            ];
            const podiumOrder = [users[0], users[1], users[2]]; // 1st, 2nd, 3rd
            podiumSlots.forEach((slot, i) => {
                const u = podiumOrder[i];
                const nameEl = document.getElementById(slot.nameId);
                const xpEl   = document.getElementById(slot.xpId);
                const boxEl  = document.getElementById(slot.boxId);
                if (!u) { if(nameEl) nameEl.textContent='—'; if(xpEl) xpEl.textContent=''; return; }
                if (nameEl) nameEl.textContent = u.displayName;
                if (xpEl)   xpEl.textContent   = window.formatXP(u[xpField]);
                if (boxEl) {
                    const size = i === 0 ? 76 : 56;
                    boxEl.innerHTML = lbAvatarHTML(u, size, currentUserId);
                }
            });

            // --- Ranked list (ranks 4–10) ---
            listContainer.innerHTML = '';
            if (users.length <= 3) {
                listContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:1.5rem 1rem;font-size:0.8125rem;">Only ${users.length} user${users.length===1?'':'s'} so far. Be the one to break in!</div>`;
            }

            let currentUserRank = -1;
            users.forEach((user, index) => {
                const rank = index + 1;
                if (user.uid === currentUserId) currentUserRank = rank;
                if (rank <= 3 || rank > 10) return; // podium already shown, cap at 10

                const isMe = user.uid === currentUserId;
                const avatarHTML = lbAvatarHTML(user, 40, currentUserId);
                const [bg] = lbColorFor(user.displayName);
                const rowBg = isMe ? 'background:rgba(139,92,246,0.1);border-color:var(--accent-btn);' : 'background:transparent;border-color:var(--border-color);';
                const nameCls = isMe ? 'color:var(--accent-btn);' : 'color:var(--text-main);';

                listContainer.innerHTML += `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0.75rem;border-radius:0.875rem;border:1px solid;${rowBg}animation:fadeIn 0.3s ease-out forwards;opacity:0;animation-delay:${(index-3)*0.04}s;">
                        <div style="display:flex;align-items:center;gap:0.875rem;flex:1;min-width:0;">
                            <span style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);width:20px;text-align:center;flex-shrink:0;">${rank}</span>
                            ${avatarHTML}
                            <div style="min-width:0;flex:1;">
                                <div style="font-size:0.875rem;font-weight:700;${nameCls}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${user.displayName}
                                    ${isMe ? '<span style="font-size:0.625rem;margin-left:6px;padding:2px 7px;background:var(--accent-btn);color:var(--btn-text);border-radius:9999px;font-weight:800;vertical-align:middle;">YOU</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div style="flex-shrink:0;margin-left:0.75rem;text-align:right;">
                            <span style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);">${window.formatXP(user[xpField])}</span>
                        </div>
                    </div>`;
            });

            // --- Pinned Your Rank Bar ---
            const bar = document.getElementById('yourRankBar');
            if (currentUserRank > 0 && bar) {
                const me = users[currentUserRank - 1];
                const saved = localStorage.getItem('medexcel_avatar_' + (window.currentUser?.uid || 'guest'));
                const avatarWrap = document.getElementById('yourRankAvatarWrap');
                if (avatarWrap) {
                    if (saved !== null && AVATAR_GRID) {
                        const a = AVATAR_GRID[parseInt(saved)];
                        if (a) avatarWrap.innerHTML = `<div style="width:100%;height:100%;background-image:url('${AVATAR_IMAGE_PATH}');background-size:300% 300%;background-position:${a.col*50}% ${a.row*50}%;"></div>`;
                    } else {
                        avatarWrap.textContent = window.getInitial ? window.getInitial(me.displayName) : me.displayName.charAt(0).toUpperCase();
                    }
                }
                const rankNameEl = document.getElementById('yourRankName');
                const rankXpEl   = document.getElementById('yourRankXp');
                const rankNumEl  = document.getElementById('yourRankNum');
                if (rankNameEl) rankNameEl.textContent = me.displayName;
                if (rankXpEl)   rankXpEl.textContent   = window.formatXP(me[xpField]) + ' XP';
                if (rankNumEl)  rankNumEl.textContent   = `#${currentUserRank}`;
                bar.style.display = 'block';
            } else if (bar) {
                bar.style.display = 'none';
            }
        };
        
        // Create Generation API Logic
        const generateBtn = document.getElementById('generateBtn');
        const aiLoader = document.getElementById('aiLoader');
        const loadingText = document.getElementById('loadingText');
        const loadingMessages = ["Analyzing document structure...", "Extracting key concepts...", "Formulating questions...", "Reviewing accuracy...", "Almost there..."];
        let messageInterval = null;

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                if (!window.selectedFile) return;
                if (!window.currentUser) { window.showLoginModal(); return; }
                
                const requestedItems = parseInt(document.getElementById('itemSlider').value, 10);
                if (requestedItems > window.allowedMaxItems) {
                    const wantToUpgrade = await window.showCustomUpgradeModal(window.allowedMaxItems);
                    if (wantToUpgrade) window.navigateTo('view-payment'); return;
                }

                generateBtn.disabled = true; 
                generateBtn.style.background = 'var(--bg-surface)'; generateBtn.style.color = 'var(--text-muted)';
                aiLoader.classList.add('show');
                document.getElementById('createBackBtn').style.display = 'none';
                if (window.lottieAnimation) window.lottieAnimation.play();
                
                // NEW PROGRESS BAR LOGIC
                const ESTIMATED_SECS = 30;
                let scanElapsed = 0;
                const scanProgressBar = document.getElementById('scanProgressBar');
                const scanElapsedLabel = document.getElementById('scanElapsedLabel');
                const scanEstLabel = document.getElementById('scanEstLabel');
                if(scanProgressBar) {
                    scanProgressBar.style.transition = 'none';
                    scanProgressBar.style.width = '0%';
                }
                if(scanElapsedLabel) scanElapsedLabel.textContent = '0s';
                if(scanEstLabel) scanEstLabel.textContent = `~${ESTIMATED_SECS}s left`;
                setTimeout(() => { if(scanProgressBar) scanProgressBar.style.transition = 'width 1s linear'; }, 50);
                
                window.scanProgressInterval = setInterval(() => {
                    scanElapsed++;
                    const progress = Math.min(90, (scanElapsed / ESTIMATED_SECS) * 100);
                    if(scanProgressBar) scanProgressBar.style.width = progress + '%';
                    if(scanElapsedLabel) scanElapsedLabel.textContent = `${scanElapsed}s`;
                    const remaining = Math.max(0, ESTIMATED_SECS - scanElapsed);
                    if(scanEstLabel) scanEstLabel.textContent = remaining > 0 ? `~${remaining}s left` : 'Almost done...';
                }, 1000);
                
                let msgIndex = 0; if(loadingText) loadingText.style.opacity = 0;
                setTimeout(() => { if(loadingText) { loadingText.textContent = loadingMessages[0]; loadingText.style.opacity = 1; } }, 300);
                messageInterval = setInterval(() => { if(loadingText) { loadingText.style.opacity = 0; setTimeout(() => { msgIndex = (msgIndex + 1) % loadingMessages.length; loadingText.textContent = loadingMessages[msgIndex]; loadingText.style.opacity = 1; }, 300); } }, 3500); 

                try {
                    const uniqueFileName = Date.now() + '_' + window.selectedFile.name;
                    const securePath = `uploads/${window.currentUser.email || window.currentUser.uid}/${uniqueFileName}`;
                    const storageReference = ref(storage, securePath);
                    await uploadBytes(storageReference, window.selectedFile);
                    
                    const generateQuizFunction = httpsCallable(functions, 'generateQuizFromFile');
                    const response = await generateQuizFunction({ filePath: securePath, fileName: window.selectedFile.name, quizType: window.globalQuizType, topicFocus: document.getElementById('topicFocus').value, numberOfItems: requestedItems });
                    
                    const payload = response.data;
                    const cards = payload.cards || payload.flashcards || payload.items || payload.questions;
                    if (!cards || !Array.isArray(cards) || cards.length === 0) throw new Error("Generation returned empty data.");

                    // ADDED SAFETY FILTER HERE to ignore blank/undefined cards from the AI
                    generatedCards = cards.filter(card => card != null && typeof card === 'object').map(card => {
                        let frontText = card.front || card.question || ""; let backText = card.back || card.answer || "No answer provided";
                        if (card.options) {
                            const cleanBack = String(backText).trim().toUpperCase();
                            if (Array.isArray(card.options)) { if (cleanBack.length === 1 && /^[A-E]$/.test(cleanBack)) { const idx = cleanBack.charCodeAt(0) - 65; if (card.options[idx]) backText = card.options[idx]; } }
                            else if (typeof card.options === 'object') { if (cleanBack.length <= 2 && card.options[cleanBack]) backText = card.options[cleanBack]; else { for (const [key, value] of Object.entries(card.options)) { if (String(key).trim().toUpperCase() === cleanBack || String(key).trim() === cleanBack) { backText = value; break; } } } }
                        }
                        return { ...card, front: frontText, back: backText, answer: backText, answered: false };
                    });
                    window.generatedCards = generatedCards;

                    if (generatedCards.length === 0) throw new Error("AI returned invalid card formats.");

                    currentCardIndex = 0; window.currentCardIndex = 0; sessionScore = 0; isMCQMode = window.globalQuizType === "Multiple Choice"; window.isMCQMode = isMCQMode;
                    const subjectName = document.getElementById('topicFocus').value || "General Subject";
                    const deckNameEl = document.getElementById('deckNameInput');
                    const deckName = deckNameEl && deckNameEl.value.trim()
                        ? deckNameEl.value.trim()
                        : window.selectedFile.name.split('.')[0].replace(/[-_]/g, ' ');
                    const newQuiz = {
                        id: Date.now(), title: deckName, subject: subjectName, favorite: false, stats: { bestScore: 0, attempts: 0, lastScore: 0 },
                        questions: generatedCards.map(card => {
                            let optionsArr = [], correctIdx = 0; const question = card.front || card.question || ""; const answer = card.back || card.answer || "No answer provided";
                            if (card.options && typeof card.options === 'object') { const keys = Object.keys(card.options); optionsArr = Object.values(card.options); for (let i = 0; i < keys.length; i++) { if (window.checkAnswerMatch(keys[i], optionsArr[i], answer)) { correctIdx = i; break; } } } 
                            else { optionsArr = [answer !== "No answer provided" ? answer : "True", "False"]; }
                            return { text: question, options: optionsArr, correct: correctIdx, explanation: card.explanation || "" };
                        }), type: window.globalQuizType
                    };

                    try { await setDoc(doc(db, "users", window.currentUser.uid, "quizzes", newQuiz.id.toString()), newQuiz); } catch(e) {}
                    let existingQuizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + window.currentUser.uid)) || [];
                    existingQuizzes.push(newQuiz); localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(existingQuizzes));
                    window.quizzes = existingQuizzes;

                    if (window.lottieAnimation) window.lottieAnimation.stop(); clearInterval(messageInterval); clearInterval(window.scanProgressInterval);
                    aiLoader.classList.remove('show');
                    document.getElementById('setupView').style.display = 'none';
                    document.getElementById('interactiveView').style.display = 'flex';
                    // Clear deck name input for next session
                    const deckNameClear = document.getElementById('deckNameInput');
                    if (deckNameClear) { deckNameClear.value = ''; deckNameClear.style.borderColor = 'var(--border-glass)'; }
                    window._fromCreateFlow = true;
                    window.enterQuizMode();
                    window.renderCreateCurrentCard();
                    
                } catch (error) {
                    console.error("Error generating quiz:", error);
                    if (window.lottieAnimation) window.lottieAnimation.stop(); clearInterval(messageInterval); clearInterval(window.scanProgressInterval);
                    alert("Generation Error: " + error.message);
                    aiLoader.classList.remove('show');
                    generateBtn.disabled = false; generateBtn.style.background = 'var(--accent-btn)'; generateBtn.style.color = 'var(--btn-text)';
                    document.getElementById('createBackBtn').style.display = 'flex';
                }
            });
        }

        

        /* =========================================
           AVATAR PICKER
           =========================================
           HOW TO USE:
           Set AVATAR_IMAGE_PATH to the relative or absolute path of your
           avatar grid image (the 3×3 character sheet).
           e.g. "assets/avatars.jpg" or "https://yourcdn.com/avatars.jpg"
        ========================================= */
        const AVATAR_IMAGE_PATH = "avatar.svg";

        // 9 avatars in a 3×3 grid. Each entry is [col, row] (0-indexed).
        const AVATAR_GRID = [
            { col: 0, row: 0, label: "Intern" },
            { col: 1, row: 0, label: "Scholar" },
            { col: 2, row: 0, label: "Clinician" },
            { col: 0, row: 1, label: "Resident" },
            { col: 1, row: 1, label: "Surgeon" },
            { col: 2, row: 1, label: "Focus" },
            { col: 0, row: 2, label: "Consultant" },
            { col: 1, row: 2, label: "Medic" },
            { col: 2, row: 2, label: "Classic" },
        ];

        window.openAvatarPicker = function() {
            let backdrop = document.getElementById('avatarPickerBackdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'avatarPickerBackdrop';
                backdrop.className = 'modal-backdrop';
                backdrop.style.cssText = 'align-items: flex-end;';
                backdrop.innerHTML = `
                    <div style="width:100%;max-width:480px;background:var(--bg-surface);border-radius:var(--radius-card) var(--radius-card) 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);transform:translateY(100%);opacity:0;transition:0.4s var(--ease-snap);" id="avatarPickerSheet">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                            <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-main);">Choose Your Avatar</h3>
                            <button onclick="window.closeAvatarPicker()" style="background:var(--bg-hover);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:var(--text-muted);font-size:1rem;">✕</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;" id="avatarGrid">
                        ${AVATAR_GRID.map((a, i) => `
                            <button onclick="window.selectAvatar(${i})" id="avatarOption${i}" style="
                                background:var(--bg-body);
                                border:2px solid var(--border-color);
                                border-radius:1rem;
                                padding:0.5rem;
                                cursor:pointer;
                                display:flex;
                                flex-direction:column;
                                align-items:center;
                                gap:0.5rem;
                                transition:border-color 0.2s,transform 0.15s;
                                -webkit-tap-highlight-color:transparent;
                            " onmousedown="this.style.transform='scale(0.94)'" onmouseup="this.style.transform=''" ontouchstart="this.style.transform='scale(0.94)'" ontouchend="this.style.transform=''">
                                <div style="
                                    width:64px;height:64px;border-radius:50%;overflow:hidden;
                                    background-image:url('${AVATAR_IMAGE_PATH}');
                                    background-size:300% 300%;
                                    background-position:${a.col * 50}% ${a.row * 50}%;
                                    flex-shrink:0;
                                "></div>
                                <span style="font-size:0.6875rem;font-weight:600;color:var(--text-muted);">${a.label}</span>
                            </button>
                        `).join('')}
                        <!-- Upload photo tile -->
                        <button onclick="window.triggerPhotoUpload()" id="avatarUploadBtn" style="
                            background:var(--bg-body);
                            border:2px dashed var(--border-color);
                            border-radius:1rem;
                            padding:0.5rem;
                            cursor:pointer;
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            gap:0.5rem;
                            transition:border-color 0.2s,transform 0.15s;
                            -webkit-tap-highlight-color:transparent;
                        " onmousedown="this.style.transform='scale(0.94)'" onmouseup="this.style.transform=''" ontouchstart="this.style.transform='scale(0.94)'" ontouchend="this.style.transform=''">
                            <div id="avatarUploadPreview" style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i class="fas fa-camera" style="font-size:1.5rem;color:var(--text-muted);"></i>
                            </div>
                            <span style="font-size:0.6875rem;font-weight:600;color:var(--text-muted);">Upload</span>
                        </button>
                        </div>
                        <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="window.handleAvatarFileSelect(this)">
                    </div>
                `;
                backdrop.addEventListener('click', (e) => { if (e.target === backdrop) window.closeAvatarPicker(); });
                document.body.appendChild(backdrop);
            }

            // Highlight currently selected
            const saved = localStorage.getItem('medexcel_avatar_' + (window.currentUser?.uid || 'guest'));
            AVATAR_GRID.forEach((_, i) => {
                const btn = document.getElementById(`avatarOption${i}`);
                if (btn) btn.style.borderColor = (String(i) === saved) ? 'var(--accent-btn)' : 'var(--border-color)';
            });

            backdrop.style.display = 'flex';
            requestAnimationFrame(() => {
                backdrop.style.opacity = '1';
                const sheet = document.getElementById('avatarPickerSheet');
                if (sheet) { sheet.style.transform = 'translateY(0)'; sheet.style.opacity = '1'; }
            });
        };

        window.closeAvatarPicker = function() {
            const backdrop = document.getElementById('avatarPickerBackdrop');
            const sheet = document.getElementById('avatarPickerSheet');
            if (sheet) { sheet.style.transform = 'translateY(100%)'; sheet.style.opacity = '0'; }
            if (backdrop) { backdrop.style.opacity = '0'; setTimeout(() => { backdrop.style.display = 'none'; }, 400); }
        };

        // ── Photo upload functions ──────────────────────────────────────
        window.triggerPhotoUpload = function() {
            const input = document.getElementById('avatarFileInput');
            if (input) input.click();
        };

        window.handleAvatarFileSelect = async function(input) {
            const file = input.files[0];
            if (!file || !window.currentUser) return;

            // Validate — images only
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (JPG, PNG, etc.)');
                input.value = ''; return;
            }
            if (file.size > 15 * 1024 * 1024) {
                alert('Image is too large. Please choose a smaller photo.');
                input.value = ''; return;
            }

            const uploadBtn = document.getElementById('avatarUploadBtn');
            const preview   = document.getElementById('avatarUploadPreview');
            if (uploadBtn) { uploadBtn.style.borderColor = 'var(--accent-btn)'; uploadBtn.style.opacity = '0.6'; }
            if (preview)   { preview.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--accent-btn);"></i>'; }

            try {
                // Compress to ~80x80 JPEG base64 — keeps size under 5KB
                const base64 = await new Promise((resolve, reject) => {
                    const img = new Image();
                    const url = URL.createObjectURL(file);
                    img.onload = () => {
                        const SIZE = 80;
                        const canvas = document.createElement('canvas');
                        canvas.width = SIZE; canvas.height = SIZE;
                        const ctx = canvas.getContext('2d');
                        // Square crop from center
                        const side = Math.min(img.width, img.height);
                        const sx = (img.width  - side) / 2;
                        const sy = (img.height - side) / 2;
                        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
                        URL.revokeObjectURL(url);
                        // Quality 0.6 at 80px ≈ 3-5KB
                        resolve(canvas.toDataURL('image/jpeg', 0.6));
                    };
                    img.onerror = reject;
                    img.src = url;
                });

                const uid = window.currentUser.uid;

                // Save base64 directly to Firestore — no Storage bucket needed
                await updateDoc(doc(db, 'users', uid), { photoBase64: base64, avatarIndex: null });
                localStorage.setItem('medexcel_photo_' + uid, base64);
                localStorage.removeItem('medexcel_avatar_' + uid);

                // Show preview
                if (preview) preview.innerHTML = `<img src="${base64}" style="width:64px;height:64px;object-fit:cover;border-radius:50%;">`;
                if (uploadBtn) { uploadBtn.style.opacity = '1'; }

                window.applyAvatar();
                setTimeout(() => window.closeAvatarPicker(), 400);

            } catch(e) {
                console.error('[Avatar Upload]', e);
                if (uploadBtn) { uploadBtn.style.borderColor = 'var(--border-color)'; uploadBtn.style.opacity = '1'; }
                if (preview)   { preview.innerHTML = '<i class="fas fa-camera" style="font-size:1.5rem;color:var(--text-muted);"></i>'; }
            }
            input.value = '';
        };

        window.selectAvatar = function(index) {
            localStorage.setItem('medexcel_avatar_' + (window.currentUser?.uid || 'guest'), String(index));
            // Save to Firestore so other users can see it in the leaderboard
            if (window.currentUser?.uid) {
                try { updateDoc(doc(db, "users", window.currentUser.uid), { avatarIndex: index }).catch(() => {}); } catch(e) {}
            }
            window.applyAvatar();
            // Highlight in picker
            AVATAR_GRID.forEach((_, i) => {
                const btn = document.getElementById(`avatarOption${i}`);
                if (btn) btn.style.borderColor = (i === index) ? 'var(--accent-btn)' : 'var(--border-color)';
            });
            setTimeout(() => window.closeAvatarPicker(), 350);
        };

        window.applyAvatar = function() {
            const uid = window.currentUser?.uid || 'guest';
            const photoURL = localStorage.getItem('medexcel_photo_' + uid);
            const saved = localStorage.getItem('medexcel_avatar_' + uid);
            const wrap = document.getElementById('profileAvatarWrap');
            const homeBtn = document.getElementById('homeAvatarBtn');
            const initial = document.getElementById('userInitial');
            const storedInitial = initial ? initial.textContent : (document.getElementById('homeAvatarInitial') ? document.getElementById('homeAvatarInitial').textContent : '?');

            // Custom photo takes priority
            if (photoURL) {
                const imgStyle = `width:100%;height:100%;object-fit:cover;border-radius:50%;`;
                if (wrap) {
                    wrap.style.background = 'var(--bg-surface)';
                    wrap.style.border = '2px solid var(--accent-btn)';
                    wrap.innerHTML = `<img src="${photoURL}" style="${imgStyle}" onerror="this.style.display='none';">`;
                }
                if (homeBtn) {
                    homeBtn.style.borderColor = 'var(--accent-btn)';
                    homeBtn.innerHTML = `<img src="${photoURL}" style="${imgStyle}" onerror="this.style.display='none';">`;
                }
                return;
            }

            if (saved !== null) {
                const a = AVATAR_GRID[parseInt(saved)];
                if (a) {
                    const bgStyle = `background-image:url('${AVATAR_IMAGE_PATH}');background-size:300% 300%;background-position:${a.col * 50}% ${a.row * 50}%;width:100%;height:100%;`;
                    // Profile page avatar
                    if (wrap) {
                        wrap.style.background = 'var(--bg-surface)';
                        wrap.style.border = '2px solid var(--accent-btn)';
                        wrap.innerHTML = `<div style="${bgStyle}"></div>`;
                    }
                    // Home header avatar
                    if (homeBtn) {
                        homeBtn.style.borderColor = 'var(--accent-btn)';
                        homeBtn.innerHTML = `<div style="${bgStyle}"></div>`;
                    }
                    return;
                }
            }
            // Fallback: show initial
            if (wrap) {
                wrap.style.background = '';
                wrap.style.border = '';
                wrap.innerHTML = `<span id="userInitial">${storedInitial}</span>`;
            }
            if (homeBtn) {
                homeBtn.style.borderColor = 'var(--border-color)';
                homeBtn.innerHTML = `<span id="homeAvatarInitial">${storedInitial}</span>`;
            }
        };

        // Apply on load
        document.addEventListener('DOMContentLoaded', window.applyAvatar);

        // Initialize User Data (Master Hub)
        window.initUserUI = async function(user) {
            try {
                // Mark that this device has a real account — persists through logout
                // Used by index.html to skip the carousel for returning users
                localStorage.setItem('medexcel_has_account', '1');

                let savedName = user.displayName || (user.email ? user.email.split("@")[0] : "User");

                // ── STEP 1: Paint UI instantly from localStorage cache ──────────
                const cachedStats   = JSON.parse(localStorage.getItem('medexcel_user_stats')) || {};
                const cachedStreak  = JSON.parse(localStorage.getItem('medexcel_streak_' + user.uid)) || { count: 0, lastDate: null };
                const cachedQuizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + user.uid)) || [];

                // Name instantly
                const greetingTitleEl = document.getElementById('greetingTitle');
                if(greetingTitleEl) { greetingTitleEl.classList.remove('skeleton'); greetingTitleEl.style.width='auto'; greetingTitleEl.style.height='auto'; greetingTitleEl.innerHTML = `Hi, ${savedName} ${window.getTimeEmoji()}`; }
                const uNameEl = document.getElementById("userName"); if(uNameEl) uNameEl.textContent = savedName;
                const uEmailEl = document.getElementById("userEmail"); if(uEmailEl) uEmailEl.textContent = user.email || "";
                const uInitEl = document.getElementById("userInitial"); if(uInitEl) uInitEl.textContent = user.email ? user.email.charAt(0).toUpperCase() : "?";
                const uHomeInit = document.getElementById("homeAvatarInitial"); if(uHomeInit) uHomeInit.textContent = user.email ? user.email.charAt(0).toUpperCase() : "?";
                window.applyAvatar();

                // Streak instantly from cache
                const headerDisplay = document.getElementById('headerStreakDisplay');
                if(headerDisplay) { headerDisplay.classList.remove('skeleton'); headerDisplay.style.width='auto'; headerDisplay.style.height='auto'; headerDisplay.textContent = cachedStreak.count || 0; }

                // Library + home cards instantly from cache
                if(cachedQuizzes.length > 0) {
                    window.quizzes = cachedQuizzes;
                    window.updateHomeContinueCard();
                    window.renderLibrary('all', '');
                }

                // XP instantly from cache
                if(cachedStats.xp) window.updateProfileXP(cachedStats.xp);

                // ── STEP 2: Fetch quizzes + user doc in parallel ───────────────
                const userRef = doc(db, "users", user.uid);
                const [qSnapResult, userDocResult] = await Promise.all([
                    getDocs(collection(db, "users", user.uid, "quizzes")).catch(() => null),
                    getDoc(userRef).catch(() => null)
                ]);

                // Update quizzes from Firestore
                if(qSnapResult) {
                    let loadedQuizzes = []; qSnapResult.forEach(d => loadedQuizzes.push(d.data()));
                    loadedQuizzes.sort((a,b) => a.id - b.id); window.quizzes = loadedQuizzes;
                    localStorage.setItem('medexcel_quizzes_' + user.uid, JSON.stringify(window.quizzes));
                } else { window.quizzes = cachedQuizzes; }

                let userDoc = userDocResult;
                let data;

                if (userDoc.exists()) {
                    data = userDoc.data();
                    window._cachedUserData = data;

                    // ── BAN CHECK — must run before anything else ──
                    if (data.banned === true) {
                        try { await signOut(auth); } catch(e) {}
                        const _t = localStorage.getItem('medexcel_theme');
                        localStorage.clear();
                        if (_t) localStorage.setItem('medexcel_theme', _t);
                        window.location.replace('index.html?banned=1');
                        return;
                    }

                    // ── DAILY ACTIVE TRACKING ──
                    const _dauKey = new Date().toISOString().split('T')[0];
                    setDoc(doc(db, 'dailyActive', _dauKey), { uids: { [user.uid]: true } }, { merge: true }).catch(() => {});

                    // ── PENDING GROUP JOIN (from deep link) ──
                    const pendingCode = sessionStorage.getItem('medexcel_pending_group') || localStorage.getItem('medexcel_pending_group');
                    if (pendingCode) {
                        sessionStorage.removeItem('medexcel_pending_group');
                        localStorage.removeItem('medexcel_pending_group');
                        try {
                            const q = query(collection(db, 'groups'), where('inviteCode', '==', pendingCode));
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                const groupDoc = snap.docs[0];
                                const groupData = groupDoc.data();
                                const alreadyMember = groupData.members?.[user.uid];
                                const memberCount = Object.keys(groupData.members || {}).length;
                                if (!alreadyMember && memberCount < 10) {
                                    await updateDoc(doc(db, 'groups', groupDoc.id), {
                                        memberUids: arrayUnion(user.uid),
                                        [`members.${user.uid}`]: {
                                            name: data.displayName || user.email?.split('@')[0] || 'User',
                                            xp: data.xp || 0,
                                            joinedAt: new Date().toISOString()
                                        }
                                    });
                                    // Show success toast after a short delay
                                    setTimeout(() => {
                                        if (typeof window.showToast === 'function') {
                                            window.showToast(`✅ Joined "${groupData.name}"! Go to Leaders → Groups to see it.`);
                                        } else {
                                            const t = document.createElement('div');
                                            t.textContent = `✅ Joined "${groupData.name}"!`;
                                            t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;';
                                            document.body.appendChild(t);
                                            setTimeout(() => t.remove(), 4000);
                                        }
                                    }, 1500);
                                }
                            }
                        } catch(e) { console.warn('Auto-join failed:', e); }
                    }
                    // Sync Firestore avatar → localStorage so it shows correctly on any device or after account switch
                    if (data.photoBase64) {
                        localStorage.setItem('medexcel_photo_' + user.uid, data.photoBase64);
                    }
                    if (data.avatarIndex !== undefined && data.avatarIndex !== null && !data.photoBase64) {
                        localStorage.setItem('medexcel_avatar_' + user.uid, data.avatarIndex.toString());
                    }
                    // Sync onboardingDone from Firestore — prevents re-showing after reinstall
                    if (data.onboardingDone) {
                        localStorage.setItem('medexcel_personalized_onboarding_done', '1');
                    }

                    // Check for pending avatar from onboarding
                    const pendingAvatar = localStorage.getItem('medexcel_pending_avatar');
                    const savedAvatar   = localStorage.getItem('medexcel_avatar_' + user.uid);
                    const savedPhoto    = localStorage.getItem('medexcel_photo_' + user.uid);

                    if (pendingAvatar !== null && pendingAvatar !== '') {
                        // New user just finished onboarding — apply their randomly assigned avatar
                        localStorage.setItem('medexcel_avatar_' + user.uid, pendingAvatar);
                        localStorage.removeItem('medexcel_pending_avatar');
                        try { updateDoc(doc(db, 'users', user.uid), { avatarIndex: parseInt(pendingAvatar) }).catch(()=>{}); } catch(e) {}
                    } else if (pendingAvatar === '') {
                        // User chose "prefer not to say" — clear any old avatar
                        localStorage.removeItem('medexcel_pending_avatar');
                    } else if (!savedAvatar && !savedPhoto && data.defaultAvatar !== undefined && data.defaultAvatar !== null) {
                        // Returning user — apply from Firestore profile
                        localStorage.setItem('medexcel_avatar_' + user.uid, String(data.defaultAvatar));
                    }
                    window.applyAvatar();

                    // Send login notification email — only on fresh login, not session restore
                    if (sessionStorage.getItem('medexcel_just_logged_in')) {
                        sessionStorage.removeItem('medexcel_just_logged_in');
                        const _emailToNotify = user.email || data.email
                            || (localStorage.getItem('nativeUser') ? JSON.parse(localStorage.getItem('nativeUser')||'{}').email : null);
                        if (_emailToNotify) {
                            try {
                                fetch("https://us-central1-medxcel.cloudfunctions.net/sendLoginEmail", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        email: _emailToNotify,
                                        displayName: user.displayName || data.displayName || null,
                                        uid: user.uid
                                    })
                                }).catch(() => {});
                            } catch(e) {}
                        }
                    }

                    // Load and apply onboarding profile data
                    const profileData = data.studyProgram ? data : JSON.parse(localStorage.getItem('medexcel_user_profile') || '{}');
                    window.userProfile = {
                        studyProgram:    profileData.studyProgram    || null,
                        studyLevel:      profileData.studyLevel      || null,
                        studyGoal:       profileData.studyGoal       || null,
                        studyTime:       profileData.studyTime       || null,
                        dailyTarget:     profileData.dailyTarget     || 20,
                        reminderTime:    profileData.reminderTime    || '20:00',
                        reminderEnabled: profileData.reminderEnabled !== false,
                        onboardingDone:  profileData.onboardingDone  || false
                    };

                    // Profile data stored in window.userProfile — used silently by the app
                } else {
                    // New user — provision their Firestore document now with safe defaults
                    data = {
                        uid: user.uid,
                        email: user.email || "",
                        displayName: savedName,
                        xp: 0,
                        streak: 0,
                        lastCheckIn: null,
                        plan: "free",
                        planUsed: 0,
                        dailyUsage: 0,
                        lastDailyReset: "",
                        achievements: [],
                        createdAt: serverTimestamp()
                    };
                    try { await setDoc(userRef, data, { merge: true }); } catch(e) { console.warn("Could not create user doc:", e); }
                }

                // Store profile globally for rest of app
                window.userProfile = {
                    studyProgram:    data.studyProgram    || null,
                    studyLevel:      data.studyLevel      || null,
                    studyGoal:       data.studyGoal       || null,
                    studyTime:       data.studyTime       || null,
                    dailyTarget:     data.dailyTarget     || 20,
                    reminderTime:    data.reminderTime    || '20:00',
                    reminderEnabled: data.reminderEnabled !== false,
                    onboardingDone:  data.onboardingDone  || false
                };

                // ---- UI updates — always run for both new and existing users ----

                // Home Greeting — already painted from cache above, just refresh name if Firestore has better displayName
                const greetingTitle = document.getElementById('greetingTitle');
                if(greetingTitle) greetingTitle.innerHTML = `Hi, ${savedName} ${window.getTimeEmoji()}`;

                // Streak logic
                const storageKey = 'medexcel_streak_' + user.uid;
                let localStreak = JSON.parse(localStorage.getItem(storageKey));
                if (data.lastCheckIn) { localStreak = { count: data.streak || 0, lastDate: data.lastCheckIn }; localStorage.setItem(storageKey, JSON.stringify(localStreak)); }
                if (!localStreak) localStreak = { count: 0, lastDate: null };

                window.userStats = { xp: data.xp || 0, weeklyXp: data.weeklyXp || 0, level: 1, streak: localStreak.count, count: localStreak.count, lastDate: localStreak.lastDate };

                // Seed week key so addXP doesn't wipe weeklyXp on first call this session
                const _wkKey = (function() {
                    const now = new Date(); const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    const mon = new Date(now.getFullYear(), now.getMonth(), diff);
                    return mon.toISOString().split('T')[0];
                })();
                if (!localStorage.getItem('medexcel_weekkey_' + user.uid)) {
                    localStorage.setItem('medexcel_weekkey_' + user.uid, _wkKey);
                }
                localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));

                const todayStr = new Date().toDateString(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const yesterdayStr = yesterday.toDateString();
                if (localStreak.lastDate === todayStr) { hasCheckedInToday = true; currentStreakCount = localStreak.count; }
                else if (localStreak.lastDate === yesterdayStr) { hasCheckedInToday = false; currentStreakCount = localStreak.count + 1; }
                else { hasCheckedInToday = false; currentStreakCount = 1; }

                const headerFireIcon = document.getElementById('headerFireIcon');
                if (!hasCheckedInToday) { if(headerDisplay) headerDisplay.textContent = Math.max(0, currentStreakCount - 1); if(headerFireIcon) headerFireIcon.style.opacity = '0.4'; setTimeout(() => { if (localStorage.getItem('medexcel_onboarding_v1')) { window.openStreakModal(); } else { window._pendingStreakModal = true; } }, 500); }
                else { if(headerDisplay) headerDisplay.textContent = currentStreakCount; if(headerFireIcon) headerFireIcon.style.opacity = '1'; }

                // Profile & limits UI
                const pStreak = document.getElementById("profileStreakCount"); if(pStreak) pStreak.textContent = currentStreakCount;
                const studyStreak = document.getElementById("studyStreakDisplay"); if(studyStreak) studyStreak.textContent = `${currentStreakCount} Day`;
                const sXp = document.getElementById("studyXpDisplay"); if(sXp) sXp.textContent = window.formatXP(data.xp || 0);
                if (data.createdAt) {
                    let memberDate = null;
                    // Handle Firestore Timestamp
                    if (data.createdAt.toDate) memberDate = data.createdAt.toDate();
                    // Handle ISO string (e.g. stored as new Date().toISOString())
                    else if (typeof data.createdAt === 'string') memberDate = new Date(data.createdAt);
                    // Handle plain JS Date stored as millis
                    else if (typeof data.createdAt === 'number') memberDate = new Date(data.createdAt);
                    
                    const memberSince = document.getElementById("memberSince");
                    if (memberSince && memberDate && !isNaN(memberDate)) {
                        memberSince.textContent = memberDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                    }
                }

                window.userPlan = data.plan || "free";
                const isToday = data.lastDailyReset === new Date().toISOString().split("T")[0];
                const dailyUsage = isToday ? (data.planUsed || data.dailyUsage || 0) : 0;
                const barEl = document.getElementById('usageProgressBar'); const usageCountEl = document.getElementById('usageCount');
                if(usageCountEl) usageCountEl.textContent = dailyUsage;

                const planConfig = {
                    premium: { max: 30, cap: 30, bar: "#3b82f6" },
                    free:    { max: 5,  cap:  5, bar: "#94a3b8" }
                };
                const pc = planConfig[window.userPlan] || planConfig.free;
                window.allowedMaxItems = pc.max;
                if(barEl) { barEl.style.width = `${Math.min(100, (dailyUsage / pc.cap) * 100)}%`; barEl.style.background = pc.bar; }
                // Update both maxLimitText (create slider) and maxLimitDisplay (profile)
                const maxText = document.getElementById('maxLimitText'); if(maxText) maxText.textContent = `(Max: ${window.allowedMaxItems})`;
                const maxDisp = document.getElementById('maxLimitDisplay'); if(maxDisp) maxDisp.textContent = pc.cap;

                // Plan icon, XP level, achievements, library
                window.updatePlanIcon(window.userPlan);
                window.updateProfileXP(data.xp || 0);
                window.renderAchievements(data.achievements || []);
                window.updateHomeContinueCard();
                window.renderLibrary('all', '');

                // ---- REFERRAL SYSTEM INIT ----
                // 1. Ensure user has a referral code (backfill for existing users)
                if (!data.referralCode && user.uid) {
                    const myCode = user.uid.substring(0, 8).toUpperCase();
                    try { await updateDoc(userRef, { referralCode: myCode, referralCount: data.referralCount || 0 }); data.referralCode = myCode; } catch(e) {}
                }

                // 2. Load referral data into UI
                if (typeof window.loadReferralData === 'function') window.loadReferralData(data);

                // 3. Apply any active referral boost to limits
                if (typeof window.applyReferralBoost === 'function') window.applyReferralBoost(data);

                // 4. Process pending referral attribution (runs once for users who were referred)
                if (data.referredBy && !data.referralProcessed && data.referredBy !== data.referralCode) {
                    try {
                        // Find referrer by their referralCode field
                        const { query: fsQuery, where, collection: fsCollection, increment: fsIncrement } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                        const refQuery = fsQuery(fsCollection(db, "users"), where("referralCode", "==", data.referredBy));
                        const { getDocs: gds } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                        const refSnap = await gds(refQuery);
                        if (!refSnap.empty) {
                            const referrerDoc = refSnap.docs[0];
                            const referrerData = referrerDoc.data();
                            const newCount = (referrerData.referralCount || 0) + 1;
                            // Determine reward to apply
                            const rewards = [
                                { at: 20, type: 'ambassador',   xp: 0,    days: 0    },
                                { at: 10, type: 'month_premium', xp: 0,    days: 30   },
                                { at: 5,  type: 'week_premium',  xp: 0,    days: 7    },
                                { at: 3,  type: 'limit_2x',      xp: 0,    days: 7    },
                                { at: 1,  type: 'xp',            xp: 500,  days: 0    },
                            ];
                            const rewardToApply = rewards.find(r => newCount === r.at);
                            let referrerUpdate = { referralCount: newCount };
                            if (rewardToApply) {
                                if (rewardToApply.xp > 0) {
                                    referrerUpdate.xp = (referrerData.xp || 0) + rewardToApply.xp;
                                }
                                if (rewardToApply.days > 0) {
                                    const expiry = new Date();
                                    expiry.setDate(expiry.getDate() + rewardToApply.days);
                                    referrerUpdate.referralBoostExpiry = expiry.toISOString();
                                    referrerUpdate.referralBoostType   = rewardToApply.type;
                                }
                                if (rewardToApply.type === 'ambassador') {
                                    referrerUpdate.referralBoostType = 'ambassador';
                                }
                            }
                            await updateDoc(doc(db, "users", referrerDoc.id), referrerUpdate);
                        }
                        // Mark as processed so we don't double-count
                        await updateDoc(userRef, { referralProcessed: true });
                    } catch(e) { console.warn("Referral attribution failed (will retry):", e); }
                }

                // ---- BROADCAST ANNOUNCEMENT CHECK ----
                // Reads announcements/latest — skipped if cancelled or already seen
                try {
                    const annSnap = await getDoc(doc(db, 'announcements', 'latest'));
                    if (annSnap.exists()) {
                        const ann = annSnap.data();
                        if (ann.sentAt && !ann.cancelled) {
                            const shownKey = 'medexcel_ann_' + ann.sentAt;
                            if (!localStorage.getItem(shownKey)) {
                                localStorage.setItem(shownKey, '1');
                                setTimeout(() => {
                                    if (typeof window.showAnnouncement === 'function') {
                                        window.showAnnouncement(ann);
                                    }
                                }, 2500);
                            }
                        }
                    }
                } catch(e) {}

                // ---- MAINTENANCE MODE + FORCE UPDATE CHECK ----
                try {
                    const configSnap = await getDoc(doc(db, 'config', 'app'));
                    if (configSnap.exists()) {
                        const cfg = configSnap.data();

                        // Maintenance mode — admins bypass
                        if (cfg.maintenance === true && (data.role || '') !== 'admin') {
                            setTimeout(() => {
                                if (typeof window.showMaintenanceBanner === 'function') {
                                    window.showMaintenanceBanner();
                                }
                            }, 500);
                        }

                        // Force update — safe version using redirect, not reload
                        // Admins always bypass
                        if (cfg.forceUpdateVersion && (data.role || '') !== 'admin') {
                            const serverVersion = String(cfg.forceUpdateVersion);
                            const cachedVersion = localStorage.getItem('medexcel_app_version');
                            if (cachedVersion !== serverVersion) {
                                // Save version FIRST synchronously, then navigate
                                // Using href with ?v= prevents the old page from being in history
                                // and ensures the browser fetches a completely fresh page
                                localStorage.setItem('medexcel_app_version', serverVersion);
                                window.location.href = 'homepage.html?v=' + serverVersion;
                                return;
                            }
                        }
                    }
                } catch(e) {}

            } catch(e) { console.warn("Init Error:", e); }
        };

        // ── Nickname Editor ──────────────────────────────────────────────
        window.openNicknameEditor = async function() {
            const backdrop = document.getElementById('nicknameBackdrop');
            const sheet    = document.getElementById('nicknameSheet');
            const subtitle = document.getElementById('nicknameSubtitle');
            const input    = document.getElementById('nicknameInput');
            const saveBtn  = document.getElementById('saveNicknameBtn');
            if (!backdrop || !sheet) return;

            // Check 7-day cooldown
            if (window.currentUser) {
                try {
                    const userSnap = await getDoc(doc(db, "users", window.currentUser.uid));
                    if (userSnap.exists()) {
                        const lastChanged = userSnap.data().nicknameChangedAt;
                        if (lastChanged) {
                            const daysSince = (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24);
                            if (daysSince < 7) {
                                const daysLeft = Math.ceil(7 - daysSince);
                                if (subtitle) subtitle.textContent = `You can change your nickname again in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`;
                                if (input) { input.disabled = true; input.style.opacity = '0.5'; }
                                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.4'; saveBtn.style.cursor = 'not-allowed'; }
                            } else {
                                if (subtitle) subtitle.textContent = 'You can change your nickname once every 7 days.';
                                if (input) { input.disabled = false; input.style.opacity = '1'; input.value = window.currentUser.displayName || ''; }
                                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
                            }
                        } else {
                            if (subtitle) subtitle.textContent = 'You can change your nickname once every 7 days.';
                            if (input) { input.disabled = false; input.style.opacity = '1'; input.value = window.currentUser.displayName || ''; }
                            if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
                        }
                    }
                } catch(e) {}
            }

            // Show backdrop, then on next frame add .open so CSS transition fires
            backdrop.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                backdrop.classList.add('open');
                sheet.classList.add('open');
            }));
        };

        window.closeNicknameEditor = function() {
            const backdrop = document.getElementById('nicknameBackdrop');
            const sheet    = document.getElementById('nicknameSheet');
            if (sheet) sheet.classList.remove('open');
            if (backdrop) {
                backdrop.classList.remove('open');
                setTimeout(() => { backdrop.style.display = 'none'; }, 200);
            }
        };

        window.saveNickname = async function() {
            const input   = document.getElementById('nicknameInput');
            const saveBtn = document.getElementById('saveNicknameBtn');
            const newName = input ? input.value.trim() : '';

            if (!newName || newName.length < 2) {
                input.style.borderColor = '#f87171';
                return;
            }
            if (!window.currentUser) return;

            if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

            try {
                const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                await updateProfile(window.currentUser, { displayName: newName });
                await updateDoc(doc(db, "users", window.currentUser.uid), {
                    displayName: newName,
                    nicknameChangedAt: new Date().toISOString()
                });

                // Update UI everywhere
                const uName = document.getElementById('userName'); if(uName) uName.textContent = newName;
                const greet = document.getElementById('greetingTitle'); if(greet) greet.innerHTML = `Hi, ${newName} ${window.getTimeEmoji ? window.getTimeEmoji() : ''}`;

                window.closeNicknameEditor();
            } catch(e) {
                if (saveBtn) { saveBtn.textContent = 'Save Nickname'; saveBtn.disabled = false; }
                alert('Failed to save: ' + e.message);
            }
        };

        // Close on backdrop tap
        document.getElementById('nicknameBackdrop')?.addEventListener('click', function(e) {
            if (e.target === this) window.closeNicknameEditor();
        });

        // Top level Firebase Auth listener
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                window.currentUser = firebaseUser;
                await window.initUserUI(firebaseUser);
                window.loadLeaderboard(firebaseUser.uid);
                if (window.initPush) window.initPush(firebaseUser.uid);
            } else {
                if (_isLoggingOut) return;
                window.currentUser = null;
                const _authTheme      = localStorage.getItem('medexcel_theme');
                const _coachMarks     = localStorage.getItem('medexcel_onboarding_v1');
                const _onboardingDone = localStorage.getItem('medexcel_personalized_onboarding_done');
                const _hasAccount     = localStorage.getItem('medexcel_has_account');
                localStorage.clear();
                if (_authTheme)    localStorage.setItem('medexcel_theme', _authTheme);
                if (_coachMarks)   localStorage.setItem('medexcel_onboarding_v1', _coachMarks);
                if (_onboardingDone) localStorage.setItem('medexcel_personalized_onboarding_done', _onboardingDone);
                if (_hasAccount)   localStorage.setItem('medexcel_has_account', _hasAccount);
                window.location.replace("index.html");
            }
        });

        // ── GROUPS ──────────────────────────────────────────────────────────

        function genInviteCode() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
            return code;
        }

        window.closeModal = function(id) {
            const el = document.getElementById(id);
            if (!el) return;
            const sheet = el.querySelector('.bottom-sheet');
            if (sheet) sheet.classList.remove('open');
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, 420);
        };

        window.showCreateGroupModal = function() {
            const bd = document.getElementById('createGroupBackdrop');
            const sheet = document.getElementById('createGroupSheet');
            const inp = document.getElementById('createGroupNameInput');
            if (inp) inp.value = '';
            bd.style.display = 'flex';
            requestAnimationFrame(() => {
                bd.style.opacity = '1';
                if (sheet) sheet.classList.add('open');
            });
        };

        window.showJoinGroupModal = function() {
            const bd = document.getElementById('joinGroupBackdrop');
            const sheet = document.getElementById('joinGroupSheet');
            const inp = document.getElementById('joinGroupCodeInput');
            const err = document.getElementById('joinGroupError');
            if (inp) inp.value = '';
            if (err) err.textContent = '';
            bd.style.display = 'flex';
            requestAnimationFrame(() => {
                bd.style.opacity = '1';
                if (sheet) sheet.classList.add('open');
            });
        };

        window.createGroup = async function() {
            const name = document.getElementById('createGroupNameInput')?.value.trim();
            if (!name) { alert('Please enter a group name.'); return; }
            const btn = document.getElementById('createGroupBtn');
            btn.textContent = 'Creating...'; btn.disabled = true;
            try {
                const user = window.currentUser;
                const userData = window._cachedUserData || {};
                const inviteCode = genInviteCode();
                const groupRef = doc(collection(db, 'groups'));
                await setDoc(groupRef, {
                    name,
                    inviteCode,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString(),
                    memberUids: [user.uid],
                    members: {
                        [user.uid]: {
                            name: userData.displayName || user.email?.split('@')[0] || 'User',
                            xp: userData.xp || 0,
                            joinedAt: new Date().toISOString()
                        }
                    }
                });
                window.closeModal('createGroupBackdrop');
                window.loadMyGroups();
            } catch(e) {
                alert('Failed to create group: ' + e.message);
            } finally {
                btn.textContent = 'Create Group'; btn.disabled = false;
            }
        };

        window.joinGroup = async function() {
            const code = document.getElementById('joinGroupCodeInput')?.value.trim().toUpperCase();
            const err  = document.getElementById('joinGroupError');
            if (!code || code.length !== 6) { err.textContent = 'Enter a valid 6-digit code.'; return; }
            const btn = document.getElementById('joinGroupBtn');
            btn.textContent = 'Joining...'; btn.disabled = true;
            err.textContent = '';
            try {
                const user = window.currentUser;
                const userData = window._cachedUserData || {};
                const q = query(collection(db, 'groups'), where('inviteCode', '==', code));
                const snap = await getDocs(q);
                if (snap.empty) { err.textContent = 'No group found with that code.'; btn.textContent='Join Group'; btn.disabled=false; return; }
                const groupDoc = snap.docs[0];
                const groupData = groupDoc.data();
                const memberCount = Object.keys(groupData.members || {}).length;
                if (memberCount >= 10) { err.textContent = 'This group is full (10 members max).'; btn.textContent='Join Group'; btn.disabled=false; return; }
                if (groupData.members?.[user.uid]) { err.textContent = "You're already in this group."; btn.textContent='Join Group'; btn.disabled=false; return; }
                await updateDoc(doc(db, 'groups', groupDoc.id), {
                    memberUids: arrayUnion(user.uid),
                    [`members.${user.uid}`]: {
                        name: userData.displayName || user.email?.split('@')[0] || 'User',
                        xp: userData.xp || 0,
                        joinedAt: new Date().toISOString()
                    }
                });
                window.closeModal('joinGroupBackdrop');
                window.loadMyGroups();
            } catch(e) {
                err.textContent = 'Failed to join: ' + e.message;
            } finally {
                btn.textContent = 'Join Group'; btn.disabled = false;
            }
        };

        window.loadMyGroups = async function() {
            const container = document.getElementById('myGroupsList');
            if (!container) return;
            container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.875rem;">Loading...</div>`;
            try {
                const user = window.currentUser;
                const q = query(collection(db, 'groups'), where('memberUids', 'array-contains', user.uid));
                const snap = await getDocs(q);
                if (snap.empty) {
                    container.innerHTML = `
                        <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
                            <i class="fas fa-users" style="font-size:2rem;margin-bottom:0.75rem;display:block;opacity:0.3;"></i>
                            <p style="font-size:0.9rem;font-weight:600;">No groups yet</p>
                            <p style="font-size:0.8rem;opacity:0.7;margin-top:0.25rem;">Create or join a group to study together</p>
                        </div>`;
                    return;
                }
                container.innerHTML = '';
                snap.forEach(d => {
                    const g = d.data();
                    const count = Object.keys(g.members || {}).length;
                    container.innerHTML += `
                        <div onclick="window.openGroupDetail('${d.id}')" style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:1rem;padding:1rem 1.125rem;display:flex;align-items:center;gap:0.875rem;cursor:pointer;" ontouchstart="this.style.opacity='0.7'" ontouchend="this.style.opacity='1'">
                            <div style="width:44px;height:44px;border-radius:50%;background:rgba(139,92,246,0.12);border:1.5px solid rgba(139,92,246,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i class="fas fa-users" style="color:var(--accent-btn);font-size:1rem;"></i>
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.9375rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHTML(g.name)}</div>
                                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${count} member${count !== 1 ? 's' : ''}</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:0.75rem;flex-shrink:0;"></i>
                        </div>`;
                });
            } catch(e) {
                container.innerHTML = `<div style="text-align:center;padding:2rem;color:#f87171;font-size:0.875rem;">Failed to load groups.</div>`;
            }
        };

        window._currentGroupId = null;
        window._currentGroupData = null;

        window.openGroupDetail = async function(groupId) {
            window._currentGroupId = groupId;
            const backdrop = document.getElementById('groupDetailBackdrop');
            backdrop.style.display = 'block';
            document.getElementById('groupDetailName').textContent = 'Loading...';
            document.getElementById('groupDetailMeta').textContent = '';
            document.getElementById('groupMembersList').innerHTML = '';
            document.getElementById('groupDecksList').innerHTML = '';
            const lbEl   = document.getElementById('groupLeaderboard');
            const feedEl = document.getElementById('groupScoreFeed');
            if (lbEl)   lbEl.innerHTML   = '';
            if (feedEl) feedEl.innerHTML = '';
            try {
                const currentUid = window.currentUser?.uid;
                const [groupSnap, decksSnap, feedSnap] = await Promise.all([
                    getDoc(doc(db, 'groups', groupId)),
                    getDocs(collection(db, 'groups', groupId, 'sharedDecks')),
                    getDocs(query(collection(db, 'groups', groupId, 'scoreFeed'), orderBy('scoredAt', 'desc'), limit(20))).catch(() => ({ empty: true, docs: [] }))
                ]);
                if (!groupSnap.exists()) return;
                const g = groupSnap.data();
                window._currentGroupData = g;
                const memberUids  = Object.keys(g.members || {});
                const memberCount = memberUids.length;
                document.getElementById('groupDetailName').textContent = g.name;
                document.getElementById('groupDetailMeta').innerHTML = `${memberCount} member${memberCount !== 1 ? 's' : ''} \u00b7 Code: <span onclick="window.showShareGroupCode()" style="background:rgba(139,92,246,0.15);color:var(--accent-btn);padding:0.15rem 0.5rem;border-radius:0.375rem;font-weight:800;letter-spacing:0.1em;cursor:pointer;">${g.inviteCode}</span>`;

                // Show delete for creator, leave for everyone else
                const deleteBtn = document.getElementById('deleteGroupBtn');
                const leaveBtn  = document.getElementById('leaveGroupBtn');
                if (deleteBtn) deleteBtn.style.display = g.createdBy === currentUid ? 'flex' : 'none';
                if (leaveBtn)  leaveBtn.style.display  = g.createdBy !== currentUid ? 'flex' : 'none';

                // Fetch live user docs for streak + weeklyXp
                const userDocs = await Promise.all(memberUids.map(uid => getDoc(doc(db, 'users', uid)).catch(() => null)));
                const liveData = {};
                userDocs.forEach((snap, i) => { if (snap?.exists()) liveData[memberUids[i]] = snap.data(); });

                const ranked = memberUids.map(uid => ({
                    uid,
                    name:      g.members[uid]?.name  || 'User',
                    xp:        liveData[uid]?.xp        || g.members[uid]?.xp || 0,
                    weeklyXp:  liveData[uid]?.weeklyXp  || 0,
                    streak:    liveData[uid]?.streak     || 0
                })).sort((a, b) => b.weeklyXp - a.weeklyXp);

                // ── Group Leaderboard ──
                if (lbEl) {
                    if (ranked.every(u => u.weeklyXp === 0)) {
                        lbEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.8rem;opacity:0.7;">No activity this week yet \u2014 go study!</div>`;
                    } else {
                        const medals = ['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
                        lbEl.innerHTML = ranked.map((u, i) => `
                            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:${u.uid===currentUid?'rgba(139,92,246,0.08)':'var(--bg-surface)'};border:1px solid ${u.uid===currentUid?'rgba(139,92,246,0.2)':'var(--border-color)'};border-radius:0.875rem;">
                                <div style="font-size:0.875rem;width:20px;text-align:center;flex-shrink:0;">${medals[i]||('#'+(i+1))}</div>
                                <div style="width:34px;height:34px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent-btn);flex-shrink:0;">${u.name[0].toUpperCase()}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.875rem;font-weight:700;color:var(--text-main);">${window.escapeHTML(u.name)}${u.uid===currentUid?' <span style="font-size:0.65rem;color:var(--accent-btn);">(you)</span>':''}</div>
                                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:1px;">
                                        <span style="font-size:0.72rem;color:var(--text-muted);">${window.formatXP(u.weeklyXp)} this week</span>
                                        ${u.streak>0?`<span style="font-size:0.72rem;color:#f97316;">\ud83d\udd25 ${u.streak}</span>`:''}
                                    </div>
                                </div>
                            </div>`).join('');
                    }
                }

                // ── Score Feed ──
                if (feedEl) {
                    if (feedSnap.empty) {
                        feedEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.8rem;opacity:0.7;">No activity yet. Study a shared deck to appear here!</div>`;
                    } else {
                        feedEl.innerHTML = feedSnap.docs.map(d => {
                            const f = d.data();
                            const timeAgo = window.timeAgo ? window.timeAgo(f.scoredAt) : '';
                            const emoji = f.percentage >= 80 ? '\ud83d\udd25' : f.percentage >= 50 ? '\ud83d\udcaa' : '\ud83d\udcd6';
                            const scoreColor = f.percentage>=80?'var(--accent-green)':f.percentage>=50?'var(--accent-yellow)':'var(--accent-red)';
                            return `
                            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:0.875rem;">
                                <div style="width:34px;height:34px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent-btn);flex-shrink:0;">${(f.memberName||'?')[0].toUpperCase()}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.8125rem;color:var(--text-main);line-height:1.4;"><strong>${window.escapeHTML(f.memberName||'Someone')}</strong> scored <strong style="color:${scoreColor};">${f.percentage}%</strong> on <em>${window.escapeHTML(f.deckTitle||'a deck')}</em> ${emoji}</div>
                                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">${timeAgo}</div>
                                </div>
                            </div>`;
                        }).join('');
                    }
                }

                // ── Members ──
                document.getElementById('groupMembersList').innerHTML = ranked.map(({ uid, name, xp, streak }) => `
                    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:0.875rem;">
                        <div style="width:38px;height:38px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent-btn);flex-shrink:0;">${name[0].toUpperCase()}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:0.875rem;font-weight:700;color:var(--text-main);">${window.escapeHTML(name)}${uid===currentUid?' <span style="font-size:0.7rem;color:var(--accent-btn);">(you)</span>':''}</div>
                            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:1px;">
                                <span style="font-size:0.75rem;color:var(--text-muted);">${window.formatXP(xp)}</span>
                                ${streak>0?`<span style="font-size:0.72rem;color:#f97316;">\ud83d\udd25 ${streak} day streak</span>`:''}
                            </div>
                        </div>
                        ${uid===g.createdBy?'<span style="font-size:0.65rem;font-weight:700;background:rgba(139,92,246,0.1);color:var(--accent-btn);padding:0.2rem 0.5rem;border-radius:9999px;">Admin</span>':''}
                    </div>`).join('');

                // ── Shared Decks ──
                const decksList = document.getElementById('groupDecksList');
                if (decksSnap.empty) {
                    decksList.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.875rem;opacity:0.7;">No decks shared yet. Be the first!</div>`;
                } else {
                    decksList.innerHTML = '';
                    decksSnap.forEach(d => {
                        const dk = d.data();
                        const myScore = dk.scores?.[currentUid];
                        const isMCQ   = dk.type && dk.type.includes('Multiple');
                        decksList.innerHTML += `
                            <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:1rem;padding:1rem;display:flex;align-items:center;gap:0.875rem;">
                                <div style="width:44px;height:44px;border-radius:0.875rem;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                    <i class="fas ${isMCQ?'fa-clipboard-list':'fa-layer-group'}" style="color:${isMCQ?'#8b5cf6':'#60a5fa'};font-size:1.1rem;"></i>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.875rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHTML(dk.title||'Untitled')}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">by ${window.escapeHTML(dk.sharedByName||'Someone')}</div>
                                </div>
                                ${myScore?`<span style="font-size:0.8rem;font-weight:700;color:var(--accent-green);">${myScore.percentage}%</span>`:`<button onclick="window.studyGroupDeck('${d.id}','${groupId}')" style="font-size:0.75rem;font-weight:700;background:var(--accent-btn);color:var(--btn-text);border:none;border-radius:9999px;padding:0.375rem 0.75rem;cursor:pointer;">Study</button>`}
                            </div>`;
                    });
                }
            } catch(e) {
                document.getElementById('groupDetailName').textContent = 'Error loading group';
                console.error('Group detail error:', e);
            }
        };

        window.leaveGroup = async function() {
            const groupId = window._currentGroupId;
            const groupName = document.getElementById('groupDetailName')?.textContent || 'this group';
            if (!groupId) return;

            const confirmed = await new Promise(resolve => {
                const sheet = document.createElement('div');
                sheet.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;';
                sheet.innerHTML = `
                    <div style="width:100%;background:var(--bg-surface);border-radius:1.5rem 1.5rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);">
                        <div style="width:36px;height:4px;border-radius:9999px;background:var(--border-color);margin:0 auto 1.25rem;"></div>
                        <div style="width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                            <i class="fas fa-sign-out-alt" style="color:#f87171;font-size:1.25rem;"></i>
                        </div>
                        <h3 style="font-size:1.125rem;font-weight:800;color:var(--text-main);text-align:center;margin-bottom:0.375rem;">Leave "${groupName}"?</h3>
                        <p style="font-size:0.875rem;color:var(--text-muted);text-align:center;margin-bottom:1.75rem;line-height:1.5;">You can rejoin anytime with the invite code.</p>
                        <button id="_leaveConfirm" style="width:100%;padding:1rem;border-radius:9999px;border:none;background:#f87171;color:white;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:0.625rem;">Yes, Leave Group</button>
                        <button id="_leaveCancel" style="width:100%;padding:1rem;border-radius:9999px;border:none;background:transparent;color:var(--text-muted);font-size:0.9375rem;font-weight:600;cursor:pointer;">Cancel</button>
                    </div>`;
                document.body.appendChild(sheet);
                sheet.querySelector('#_leaveConfirm').onclick = () => { sheet.remove(); resolve(true); };
                sheet.querySelector('#_leaveCancel').onclick  = () => { sheet.remove(); resolve(false); };
                sheet.onclick = (e) => { if (e.target === sheet) { sheet.remove(); resolve(false); } };
            });

            if (!confirmed) return;
            try {
                const uid = window.currentUser.uid;
                const groupRef = doc(db, 'groups', groupId);
                const snap = await getDoc(groupRef);
                if (!snap.exists()) return;
                const members = snap.data().members || {};
                delete members[uid];
                await updateDoc(groupRef, { members, memberUids: Object.keys(members) });
                window.closeGroupDetail();
                window.loadMyGroups();
            } catch(e) {
                alert('Failed to leave group: ' + e.message);
            }
        };

        window.closeGroupDetail = function() {
            document.getElementById('groupDetailBackdrop').style.display = 'none';
            window._currentGroupId = null;
        };

        // Called by MainActivity when a deep link arrives while app is open
        window.handlePendingGroupJoin = async function() {
            const pendingCode = sessionStorage.getItem('medexcel_pending_group') || localStorage.getItem('medexcel_pending_group');
            if (!pendingCode || !window.currentUser) return;
            sessionStorage.removeItem('medexcel_pending_group');
            localStorage.removeItem('medexcel_pending_group');
            try {
                const q = query(collection(db, 'groups'), where('inviteCode', '==', pendingCode));
                const snap = await getDocs(q);
                if (snap.empty) return;
                const groupDoc = snap.docs[0];
                const groupData = groupDoc.data();
                const user = window.currentUser;
                const userData = window._cachedUserData || {};
                if (groupData.members?.[user.uid]) return; // already member
                if (Object.keys(groupData.members || {}).length >= 10) return; // full
                await updateDoc(doc(db, 'groups', groupDoc.id), {
                    memberUids: arrayUnion(user.uid),
                    [`members.${user.uid}`]: {
                        name: userData.displayName || user.email?.split('@')[0] || 'User',
                        xp: userData.xp || 0,
                        joinedAt: new Date().toISOString()
                    }
                });
                const t = document.createElement('div');
                t.textContent = `✅ Joined "${groupData.name}"!`;
                t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;';
                document.body.appendChild(t);
                setTimeout(() => t.remove(), 4000);
            } catch(e) { console.warn('handlePendingGroupJoin failed:', e); }
        };

        window.deleteGroup = async function() {
            const groupId = window._currentGroupId;
            const groupName = document.getElementById('groupDetailName')?.textContent || 'this group';
            if (!groupId) return;
            if (!confirm(`Delete "${groupName}"? This cannot be undone and all shared decks will be lost.`)) return;
            try {
                await deleteDoc(doc(db, 'groups', groupId));
                window.closeGroupDetail();
                window.loadMyGroups();
            } catch(e) {
                alert('Failed to delete group: ' + e.message);
            }
        };

        window.showShareGroupCode = async function() {
            const g = window._currentGroupData;
            if (!g) return;
            const code = g.inviteCode;
            const name = g.name;
            const encodedName = encodeURIComponent(name);
            const link = `https://medxcel.web.app/index.html?code=${code}&name=${encodedName}`;
            const appLink = `medxcel://auth?code=${code}`;
            const message = `Join my MedExcel study group "${name}"!\n\nTap the link to join automatically:\n${link}\n\nOr enter code manually: ${code}`;

            // Capacitor native share (same as referral link)
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const { Share } = window.Capacitor.Plugins;
                    await Share.share({
                        title: `Join ${name} on MedExcel`,
                        text: message,
                        url: link,
                        dialogTitle: 'Invite to study group'
                    });
                } catch(e) {
                    if (e.message && !e.message.includes('cancel')) {
                        navigator.clipboard?.writeText(link).catch(() => {});
                        const toast = document.createElement('div');
                        toast.textContent = 'Invite link copied!';
                        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.75rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:600;z-index:9999;border:1px solid rgba(139,92,246,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.4);';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2500);
                    }
                }
                return;
            }

            // Web fallback
            if (navigator.share) {
                try { await navigator.share({ title: `Join ${name} on MedExcel`, text: message, url: link }); } catch(e) {}
                return;
            }

            // Copy fallback
            navigator.clipboard?.writeText(link).catch(() => {});
            const toast = document.createElement('div');
            toast.textContent = 'Invite link copied!';
            toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.75rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:600;z-index:9999;border:1px solid rgba(139,92,246,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.4);';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        };

        window.showShareDeckToGroup = function() {
            const list = document.getElementById('shareDeckList');
            if (!list) return;
            const quizzes = window.quizzes || [];
            if (quizzes.length === 0) { alert('You have no decks to share.'); return; }
            list.innerHTML = quizzes.slice().reverse().map(q => `
                <div onclick="window.shareDeckToGroup('${q.id}')" style="display:flex;align-items:center;gap:0.75rem;padding:0.875rem;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:0.875rem;cursor:pointer;transition:0.15s;" ontouchstart="this.style.opacity='0.7'" ontouchend="this.style.opacity='1'">
                    <i class="fas ${q.type?.includes('Multiple') ? 'fa-clipboard-list' : 'fa-layer-group'}" style="color:${q.type?.includes('Multiple')?'#8b5cf6':'#60a5fa'};font-size:1rem;flex-shrink:0;"></i>
                    <span style="font-size:0.875rem;font-weight:600;color:var(--text-main);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHTML(q.title||'Untitled')}</span>
                </div>`).join('');
            const bd = document.getElementById('shareDeckBackdrop');
            const sheet = bd?.querySelector('.bottom-sheet');
            bd.style.display = 'flex';
            requestAnimationFrame(() => {
                bd.style.opacity = '1';
                if (sheet) sheet.classList.add('open');
            });
        };

        window.shareDeckToGroup = async function(deckId) {
            const groupId = window._currentGroupId;
            if (!groupId) return;
            const quiz = window.quizzes.find(q => q.id == deckId);
            if (!quiz) return;
            const userData = window._cachedUserData || {};
            try {
                await setDoc(doc(db, 'groups', groupId, 'sharedDecks', String(deckId)), {
                    title: quiz.title,
                    type: quiz.type,
                    questions: quiz.questions,
                    subject: quiz.subject,
                    sharedBy: window.currentUser.uid,
                    sharedByName: userData.displayName || window.currentUser.email?.split('@')[0] || 'User',
                    sharedAt: new Date().toISOString(),
                    scores: {}
                });

                // Notify all other group members
                try {
                    const sendNotif = httpsCallable(functions, 'sendToUserById');
                    const groupSnap2 = await getDoc(doc(db, 'groups', groupId));
                    if (groupSnap2.exists()) {
                        const members = groupSnap2.data().members || {};
                        const senderName = userData.displayName || window.currentUser.email?.split('@')[0] || 'Someone';
                        const notifPromises = Object.keys(members)
                            .filter(uid => uid !== window.currentUser.uid)
                            .map(uid => sendNotif({ userId: uid, title: '📚 New deck shared!', body: `${senderName} shared "${quiz.title}" in your group`, data: { type: 'group_deck' } }).catch(() => {}));
                        await Promise.all(notifPromises);
                    }
                } catch(e) {}
                window.closeModal('shareDeckBackdrop');
                window.openGroupDetail(groupId); // refresh
            } catch(e) {
                alert('Failed to share deck: ' + e.message);
            }
        };

        window.studyGroupDeck = async function(deckId, groupId) {
            const snap = await getDoc(doc(db, 'groups', groupId, 'sharedDecks', deckId));
            if (!snap.exists()) return;
            const dk = snap.data();
            const currentUid = window.currentUser?.uid;
            // If user already has a score on this deck, mark attempts > 0 so no XP is awarded again
            const existingScore = dk.scores?.[currentUid];
            const tempQuiz = {
                id: deckId,
                title: dk.title,
                type: dk.type,
                questions: dk.questions,
                subject: dk.subject,
                favorite: false,
                stats: {
                    bestScore: existingScore ? existingScore.score : 0,
                    attempts: existingScore ? 1 : 0,
                    lastScore: existingScore ? existingScore.score : 0
                },
                _groupId: groupId,
                _isGroupDeck: true
            };
            window.setCurrentQuiz(tempQuiz);
            window.closeGroupDetail();
            navigateTo('view-study');
            setTimeout(() => {
                window.openPracticeMobile();
                const area = document.getElementById('studyPracticeArea');
                const qLength = tempQuiz.questions ? tempQuiz.questions.length : 0;
                const isMCQ = tempQuiz.type && tempQuiz.type.includes('Multiple');
                const itemLabel = isMCQ ? 'Questions' : 'Cards';
                const prevScore = existingScore ? `<p class="text-sm mb-8" style="color:var(--accent-green);font-weight:600;">Your best: ${existingScore.percentage}%</p>` : `<p class="text-sm text-[var(--text-muted)] mb-8">Shared by ${window.escapeHTML(dk.sharedByName || 'a group member')}</p>`;
                area.innerHTML = `
                    <div class="card-panel fade-in w-full max-w-2xl">
                        <div class="flex justify-between items-start mb-4">
                            <span class="bg-[var(--bg-glass)] text-[var(--accent-btn)] text-xs font-extrabold px-3 py-1.5 rounded-md uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-users"></i> Group Deck</span>
                        </div>
                        <h2 class="text-3xl font-bold text-[var(--text-main)] mb-2 tracking-tight">${window.escapeHTML(tempQuiz.title)}</h2>
                        <p class="text-[15px] font-medium text-[var(--text-muted)] mb-4"><i class="fas fa-layer-group mr-1.5"></i>${qLength} ${itemLabel}</p>
                        ${prevScore}
                        <button onclick="window.startPractice(false)" class="w-full bg-[var(--accent-btn)] text-[var(--btn-text)] font-bold py-3.5 rounded-full border-none cursor-pointer transition-transform active:scale-95 text-[17px] flex items-center justify-center gap-2"><i class="fas fa-play text-sm"></i> Begin Session</button>
                    </div>`;
            }, 150);
        };