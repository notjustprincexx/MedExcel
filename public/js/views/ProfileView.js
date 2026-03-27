// js/views/ProfileView.js
import { auth, db } from '../app.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const ProfileView = {
    render: async () => {
        return `
            <style>
                .glass-panel { background: #0B1120; border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); }
                .achievement-unlocked { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
                .achievement-locked { filter: grayscale(100%); opacity: 0.4; border-color: rgba(255, 255, 255, 0.05); }
                
                /* Modal Styles */
                .modal-backdrop { position: absolute; inset: 0; background: rgba(5, 10, 21, 0.8); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: 0.3s; }
                .modal-backdrop.show { opacity: 1; visibility: visible; }
                .modal-content { background: #0B1120; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.5rem; width: 100%; max-width: 320px; transform: scale(0.95); transition: 0.3s; text-align: center; }
                .modal-backdrop.show .modal-content { transform: scale(1); }
            </style>

            <div id="logoutModalBackdrop" class="modal-backdrop">
                <div class="modal-content">
                    <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-500 text-xl"><i class="fas fa-sign-out-alt"></i></div>
                    <h3 class="text-lg font-bold text-white mb-2">Log Out</h3>
                    <p class="text-slate-400 text-sm mb-6">Are you sure you want to sign out of your account?</p>
                    <button id="confirmLogoutBtn" class="w-full p-3 bg-red-500 text-white rounded-xl font-medium mb-2 active:scale-95 transition-transform">Yes, Log Out</button>
                    <button id="cancelLogoutBtn" class="w-full p-3 bg-transparent text-slate-400 rounded-xl font-medium hover:text-white transition-colors">Cancel</button>
                </div>
            </div>

            <header class="pt-6 pb-4 px-6 flex items-center bg-[#050A15]/90 backdrop-blur-md border-b border-white/5 shrink-0 sticky top-0 z-40">
                <h1 class="text-2xl font-extrabold flex-1 tracking-tight">Profile</h1>
            </header>

            <div class="flex-1 px-5 pt-6 space-y-6 max-w-2xl mx-auto w-full">
                
                <section class="glass-panel rounded-3xl p-6 shadow-lg flex flex-col items-center text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
                    
                    <div class="relative z-10 mb-4">
                        <div class="w-24 h-24 rounded-full border-4 border-[#0B1120] bg-[#050A15] flex items-center justify-center text-3xl font-bold text-slate-300 shadow-xl">
                            <span id="userInitial">?</span>
                        </div>
                        <div id="planBadge" class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg whitespace-nowrap bg-slate-800 border-slate-600 text-white">
                            Loading...
                        </div>
                    </div>

                    <h2 id="userName" class="text-xl font-bold text-white leading-tight">Loading...</h2>
                    <p id="userEmail" class="text-sm text-slate-400 mb-5">...</p>

                    <div class="flex items-center justify-center gap-6 w-full pt-5 border-t border-white/5">
                        <div class="text-center">
                            <p class="text-[10px] text-slate-500 uppercase font-extrabold mb-1 tracking-widest">Study Streak</p>
                            <p class="text-xl font-bold text-orange-500"><i class="fas fa-fire mr-1.5 text-orange-500/80"></i><span id="streakCount">0</span></p>
                        </div>
                        <div class="w-px h-8 bg-white/10"></div>
                        <div class="text-center">
                            <p class="text-[10px] text-slate-500 uppercase font-extrabold mb-1 tracking-widest">Member Since</p>
                            <p class="text-sm font-bold text-slate-300 mt-1" id="memberSince">--</p>
                        </div>
                    </div>
                </section>

                <section class="glass-panel rounded-3xl p-6 shadow-lg">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <i class="fas fa-chart-line text-blue-400"></i> Usage & Plan
                        </h3>
                        <span class="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-300 font-bold uppercase tracking-wider">Daily</span>
                    </div>

                    <div class="bg-[#050A15] rounded-2xl p-5 border border-white/5 mb-5 shadow-inner">
                        <div class="flex justify-between items-end mb-3">
                            <div>
                                <p class="text-3xl font-black text-white" id="usageCount">0</p>
                                <p class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">Generations Used</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold text-blue-400" id="usageRemaining">...</p>
                            </div>
                        </div>
                        <div class="w-full h-2 bg-[#0B1120] rounded-full overflow-hidden border border-white/5">
                            <div id="usageProgressBar" class="h-full bg-blue-500 transition-all duration-700 ease-out" style="width: 0%;"></div>
                        </div>
                    </div>

                    <button id="upgradeBtn" class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-transform active:scale-95 uppercase tracking-wider text-sm">
                        Upgrade Plan
                    </button>
                </section>

                <section class="glass-panel rounded-3xl p-6 shadow-lg">
                    <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <i class="fas fa-trophy text-yellow-500"></i> Achievements
                    </h3>
                    <div id="achievementsGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-3"></div>
                </section>

                <section class="glass-panel rounded-3xl p-6 shadow-lg mb-8">
                    <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <i class="fas fa-cog text-slate-400"></i> Settings
                    </h3>
                    
                    <div class="space-y-3">
                        <button id="btnLogout" class="w-full flex items-center justify-between p-4 bg-[#050A15] hover:bg-white/5 rounded-2xl border border-white/5 transition-colors group">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                    <i class="fas fa-sign-out-alt text-xs"></i>
                                </div>
                                <span class="text-sm font-bold text-slate-200">Log Out</span>
                            </div>
                        </button>
                    </div>
                </section>

            </div>
        `;
    },

    afterRender: async () => {
        // Achievement Config
        const MASTER_ACHIEVEMENTS = [
            { id: "first_quiz", title: "First Steps", desc: "Generated your first set", icon: "fa-seedling" },
            { id: "streak_3", title: "On Fire", desc: "3 day study streak", icon: "fa-fire" },
            { id: "accuracy_80", title: "Sharpshooter", desc: "Averaged 80%+ accuracy", icon: "fa-bullseye" },
            { id: "mcq_100", title: "Century Club", desc: "Answered 100 MCQs", icon: "fa-check-double" },
            { id: "elite_member", title: "Elite Scholar", desc: "Subscribed to Elite", icon: "fa-crown" },
            { id: "night_owl", title: "Night Owl", desc: "Studied past midnight", icon: "fa-moon" }
        ];

        function renderAchievements(unlockedIds) {
            const grid = document.getElementById('achievementsGrid');
            grid.innerHTML = "";
            MASTER_ACHIEVEMENTS.forEach(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                const stateClass = isUnlocked ? "achievement-unlocked bg-[#0B1120]" : "achievement-locked bg-[#050A15]";
                const iconColor = isUnlocked ? "text-blue-400" : "text-slate-600";
                
                grid.innerHTML += `
                    <div class="${stateClass} border rounded-2xl p-4 flex flex-col items-center text-center transition-all relative overflow-hidden">
                        ${!isUnlocked ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-[#050A15]/80"><i class="fas fa-lock text-slate-500 text-xl"></i></div>` : ''}
                        <div class="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-2 ${iconColor}">
                            <i class="fas ${ach.icon} text-lg"></i>
                        </div>
                        <h4 class="text-xs font-bold text-white mb-1">${ach.title}</h4>
                        <p class="text-[9px] text-slate-400 leading-tight">${ach.desc}</p>
                    </div>
                `;
            });
        }

// js/views/ProfileView.js (Replace the afterRender function)
    afterRender: async () => {
        // Achievement Config
        const MASTER_ACHIEVEMENTS = [
            { id: "first_quiz", title: "First Steps", desc: "Generated your first set", icon: "fa-seedling" },
            { id: "streak_3", title: "On Fire", desc: "3 day study streak", icon: "fa-fire" },
            { id: "accuracy_80", title: "Sharpshooter", desc: "Averaged 80%+ accuracy", icon: "fa-bullseye" },
            { id: "mcq_100", title: "Century Club", desc: "Answered 100 MCQs", icon: "fa-check-double" },
            { id: "elite_member", title: "Elite Scholar", desc: "Subscribed to Elite", icon: "fa-crown" },
            { id: "night_owl", title: "Night Owl", desc: "Studied past midnight", icon: "fa-moon" }
        ];

        function renderAchievements(unlockedIds) {
            const grid = document.getElementById('achievementsGrid');
            grid.innerHTML = "";
            MASTER_ACHIEVEMENTS.forEach(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                const stateClass = isUnlocked ? "achievement-unlocked bg-[#0B1120]" : "achievement-locked bg-[#050A15]";
                const iconColor = isUnlocked ? "text-blue-400" : "text-slate-600";
                
                grid.innerHTML += `
                    <div class="${stateClass} border rounded-2xl p-4 flex flex-col items-center text-center transition-all relative overflow-hidden">
                        ${!isUnlocked ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-[#050A15]/80"><i class="fas fa-lock text-slate-500 text-xl"></i></div>` : ''}
                        <div class="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-2 ${iconColor}">
                            <i class="fas ${ach.icon} text-lg"></i>
                        </div>
                        <h4 class="text-xs font-bold text-white mb-1">${ach.title}</h4>
                        <p class="text-[9px] text-slate-400 leading-tight">${ach.desc}</p>
                    </div>
                `;
            });
        }

        const activeUser = window.currentUser;
        if (activeUser) {
            const email = activeUser.email || "";
            const name = activeUser.displayName || email.split("@")[0] || "User";
            
            document.getElementById("userName").textContent = name;
            document.getElementById("userEmail").textContent = email;
            document.getElementById("userInitial").textContent = email ? email.charAt(0).toUpperCase() : "?";

            try {
                let userRef = doc(db, "users", activeUser.uid);
                let userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    document.getElementById("streakCount").textContent = userData.streak || 0;
                    if (userData.createdAt) {
                        const dateObj = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
                        document.getElementById("memberSince").textContent = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                    }

                    const plan = userData.plan || "free";
                    const today = new Date().toISOString().split("T")[0];
                    const isToday = userData.lastDailyReset === today;
                    const dailyUsage = isToday ? (userData.dailyUsage || userData.planUsed || 0) : 0;
                    
                    const badge = document.getElementById('planBadge');
                    if (plan === "elite") {
                        badge.className = "absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg whitespace-nowrap bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
                        badge.innerHTML = `<i class="fas fa-crown mr-1"></i> Elite`;
                        document.getElementById('upgradeBtn').classList.add('hidden');
                    } else if (plan === "premium") {
                        badge.className = "absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg whitespace-nowrap bg-blue-600 border-blue-400 text-white";
                        badge.innerHTML = `<i class="fas fa-star mr-1"></i> Premium`;
                    } else {
                        badge.className = "absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg whitespace-nowrap bg-slate-700 border-slate-500 text-white";
                        badge.textContent = "Free Plan";
                    }

                    const maxLimits = { free: 5, premium: 30, elite: 50 };
                    const limit = maxLimits[plan];
                    const remaining = Math.max(0, limit - dailyUsage);
                    const percentage = Math.min(100, (dailyUsage / limit) * 100);

                    document.getElementById('usageCount').textContent = dailyUsage;
                    document.getElementById('usageRemaining').textContent = `${remaining} left`;
                    document.getElementById('usageProgressBar').style.width = `${percentage}%`;
                    
                    if(plan === "elite") {
                        document.getElementById('usageRemaining').classList.replace('text-blue-400', 'text-yellow-500');
                        document.getElementById('usageProgressBar').classList.replace('bg-blue-500', 'bg-yellow-500');
                    }

                    renderAchievements(userData.achievements || []);
                } else {
                    throw new Error("Doc does not exist");
                }
            } catch (e) {
                // FALLBACK IF FIRESTORE FAILS (Clears the infinite "Loading...")
                console.warn("Firestore fetch error:", e);
                document.getElementById('planBadge').textContent = "Free Plan";
                document.getElementById('planBadge').className = "absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg whitespace-nowrap bg-slate-700 border-slate-500 text-white";
                document.getElementById('usageCount').textContent = "0";
                document.getElementById('usageRemaining').textContent = "5 left";
                document.getElementById('usageRemaining').className = "text-sm font-bold text-slate-300";
                document.getElementById('usageProgressBar').style.width = "0%";
                document.getElementById("streakCount").textContent = "0";
                renderAchievements([]);
            }
        }

        // --- Logout & Modal Logic ---
        const logoutBackdrop = document.getElementById('logoutModalBackdrop');
        document.getElementById('btnLogout').addEventListener('click', () => logoutBackdrop.classList.add('show'));
        document.getElementById('cancelLogoutBtn').addEventListener('click', () => logoutBackdrop.classList.remove('show'));

        document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
            document.getElementById('confirmLogoutBtn').textContent = "Logging out...";
            try { await signOut(auth); } catch(e) {}
            // Route changing handled in app.js listener
        });
    }

        // --- Logout & Modal Logic ---
        const logoutBackdrop = document.getElementById('logoutModalBackdrop');
        
        document.getElementById('btnLogout').addEventListener('click', () => {
            logoutBackdrop.classList.add('show');
        });

        document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
            logoutBackdrop.classList.remove('show');
        });

        document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
            document.getElementById('confirmLogoutBtn').textContent = "Logging out...";
            try { 
                await signOut(auth); 
                // LocalStorage clearing and routing is handled automatically 
                // by the onAuthStateChanged listener in app.js!
            } catch(e) {
                console.error("Logout failed", e);
                alert("Could not log out at this time.");
            }
        });
    }
};