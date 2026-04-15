// State · Router · Utils · Modals · Profile Helpers
// --- GLOBAL VARIABLES & STATE ---
        window.userStats = JSON.parse(localStorage.getItem('medexcel_user_stats')) || { xp: 0, level: 1, streak: 0, count: 0, lastDate: null };
        window.quizzes = [];
        window.userPlan = "free";
        window.allowedMaxItems = 15;
        
        // Study & Create State
        let currentQuiz = null;
        let currentQuestionIndex = 0;
        let isExamMode = false;
        let examScore = 0;
        window.quizToDelete = null;

        window.globalQuizType = "Flashcards";
        window.selectedFile = null;
        let generatedCards = [];
        let currentCardIndex = 0;
        let isMCQMode = false;
        let sessionScore = 0;
        window.updateHomeContinueCard = function() {
            const cTitle = document.getElementById('continueTitle');
            const cMeta = document.getElementById('continueMeta');
            const cProgress = document.getElementById('continueProgressText');
            const cIconBox = document.getElementById('continueIconBox');

            if(!cTitle) return;

            cTitle.classList.remove('skeleton'); cTitle.style.width = 'auto'; cTitle.style.height = 'auto';
            cMeta.classList.remove('skeleton'); cMeta.style.width = 'auto'; cMeta.style.height = 'auto';
            cProgress.classList.remove('skeleton'); cProgress.style.width = 'auto'; cProgress.style.height = 'auto';
            cIconBox.classList.remove('skeleton');
            
            if (window.quizzes && window.quizzes.length > 0) {
                const lastQuiz = window.quizzes[window.quizzes.length - 1]; 
                const totalQs = lastQuiz.questions ? lastQuiz.questions.length : 0;
                const bestScore = lastQuiz.stats ? lastQuiz.stats.bestScore : 0;
                let progress = totalQs > 0 ? Math.round((bestScore / totalQs) * 100) : 0;
                
                cTitle.textContent = lastQuiz.title || 'Untitled';
                cProgress.textContent = `+${progress}%`; 
                cMeta.innerHTML = `<span>${totalQs}</span> items • <span>${lastQuiz.subject || 'GENERAL'}</span>`;
            } else {
                cTitle.textContent = "No recent activity";
                cProgress.textContent = "0%";
                cProgress.style.background = "rgba(128,128,128,0.1)"; cProgress.style.color = "var(--text-muted)";
                cMeta.innerHTML = "<span>0 items</span> • <span>GET STARTED</span>";
            }
        };

        // --- BULLETPROOF ROUTER LOGIC ---
        function navigateTo(targetViewId) {
            // 1. Hide all views securely
            document.querySelectorAll('.app-view').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });
            
            // 2. Show the requested view
            const target = document.getElementById(targetViewId);
            if (target) { 
                target.classList.add('active'); 
                target.style.display = 'flex'; 
            } else {
                console.error("View not found: " + targetViewId);
            }

            // 3. Update bottom navigation icons
            const nav = document.getElementById('globalBottomNav');
            if (nav) {
                if (targetViewId === 'view-payment') {
                    nav.classList.add('hidden');
                } else { 
                    nav.classList.remove('hidden'); 
                    updateNavIcons(targetViewId); 
                }
            }
            
            // 4. Safe Initializations (wrapped in try/catch so they don't break routing)
            try {
                if (targetViewId === 'view-study' && typeof window.renderLibrary === 'function') window.renderLibrary();
                if (targetViewId === 'view-profile' && typeof window.updateThemeUI === 'function') window.updateThemeUI();
                if (targetViewId === 'view-create' && typeof window.goBackToSelection === 'function') window.goBackToSelection();
            } catch(e) { console.warn("View init skipped:", e); }
            
            // 5. Update URL
            window.scrollTo(0, 0);
            try { history.pushState(null, null, '#' + targetViewId.replace('view-', '')); } 
            catch(e) { window.location.hash = targetViewId.replace('view-', ''); }
        }

        // Expose function globally so inline HTML clicks can reach it
        window.navigateTo = navigateTo;

        function updateNavIcons(activeViewId) {
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('active');
                const svg = el.querySelector('svg');
                if(svg) svg.setAttribute('fill', 'none');
            });
            
            const mapping = { 'view-home': 'nav-home', 'view-study': 'nav-study', 'view-create': 'nav-create', 'view-leaderboard': 'nav-leaderboard', 'view-profile': 'nav-profile' };
            const activeNav = document.getElementById(mapping[activeViewId]);
            if (activeNav) {
                activeNav.classList.add('active');
                if(activeViewId !== 'view-create' && activeViewId !== 'view-leaderboard') {
                    const activeSvg = activeNav.querySelector('svg');
                    if(activeSvg) activeSvg.setAttribute('fill', 'currentColor');
                }
            }
        }

        function initRouter() {
            let hash = window.location.hash.replace('#', '');
            if (!hash) hash = 'home';
            const viewId = 'view-' + hash;
            
            const validViews = ['view-home', 'view-study', 'view-create', 'view-leaderboard', 'view-profile', 'view-payment'];
            if (validViews.includes(viewId)) {
                navigateTo(viewId); 
            } else { 
                navigateTo('view-home'); 
            }
        }

        // Initialize Router on load
        window.addEventListener('DOMContentLoaded', initRouter);
        window.addEventListener('popstate', initRouter);


        // --- UTILS & MODALS ---
        window.closeGlobalModal = function(id) {
            const modal = document.getElementById(id);
            if (!modal) return;
            if (id === 'logoutModalBackdrop') {
                const sheet = document.getElementById('logoutSheetInner');
                if(sheet) { sheet.style.transform='translateY(100%)'; sheet.style.opacity='0'; }
                modal.style.opacity = '0';
                setTimeout(() => { modal.style.display='none'; }, 400);
            } else {
                modal.classList.remove('show');
            }
        };
        window.showLoginModal = function() { document.getElementById('loginModalBackdrop').classList.add('show'); };
        window.showLogoutModal = function() {
            const backdrop = document.getElementById('logoutModalBackdrop');
            const sheet = document.getElementById('logoutSheetInner');
            backdrop.style.display = 'flex'; backdrop.style.opacity = '1';
            requestAnimationFrame(() => { if(sheet) { sheet.style.transform='translateY(0)'; sheet.style.opacity='1'; } });
        };

        // Level calculation — exponential growth
        window.getProfileLevel = function(xp) {
            const thresholds = [0, 500, 1200, 2200, 3700, 6000, 9500, 14500, 21500, 31500, 50000];
            let level = 1;
            for (let i = 0; i < thresholds.length; i++) { if (xp >= thresholds[i]) level = i + 1; else break; }
            const cur = xp - thresholds[level - 1];
            const needed = (thresholds[level] || thresholds[level - 1] + 20000) - thresholds[level - 1];
            return { level, cur, needed };
        };

        window.updateProfileXP = function(xp) {
            const { level, cur, needed } = window.getProfileLevel(xp || 0);
            const badge = document.getElementById('profileLevelBadge'); if (badge) badge.textContent = 'LVL ' + level;
            const bar = document.getElementById('profileXpBar'); if (bar) bar.style.width = Math.min(100, (cur / needed) * 100) + '%';
            const label = document.getElementById('profileXpLabel'); if (label) label.textContent = cur.toLocaleString() + ' / ' + needed.toLocaleString();
            const xpEl = document.getElementById('studyXpDisplay'); if (xpEl) xpEl.textContent = (xp || 0).toLocaleString() + ' XP';
        };

        // Plan icon — Free or Premium only
        window.updatePlanIcon = function(plan) {
            const iconEl  = document.getElementById('planIcon');
            const textEl  = document.getElementById('planBadgeText');
            const barEl   = document.getElementById('usageProgressBar');
            const plans = {
                premium: { icon: 'fas fa-gem',  color: '#3b82f6', label: 'Premium', bar: '#3b82f6' },
                free:    { icon: 'fas fa-lock', color: '#64748b', label: 'Free',    bar: '#94a3b8' },
            };
            const p = plans[plan] || plans.free;
            if (iconEl) { iconEl.className = p.icon; iconEl.style.color = p.color; }
            if (textEl) { textEl.textContent = p.label; textEl.style.color = p.color; }
            if (barEl)  barEl.style.background = p.bar;
        };

        // Delete account modal
        window.showDeleteAccountModal = function() {
            const backdrop = document.getElementById('accountDeleteBackdrop');
            const sheet    = document.getElementById('accountDeleteSheet');
            const input    = document.getElementById('deleteAccountInput');
            if (input) input.value = '';
            window.checkDeleteInput();
            backdrop.style.display = 'flex'; backdrop.style.opacity = '1';
            requestAnimationFrame(() => { if (sheet) { sheet.style.transform = 'translateY(0)'; sheet.style.opacity = '1'; } });
        };
        window.closeDeleteAccountModal = function() {
            const backdrop = document.getElementById('accountDeleteBackdrop');
            const sheet    = document.getElementById('accountDeleteSheet');
            if (sheet) { sheet.style.transform = 'translateY(100%)'; sheet.style.opacity = '0'; }
            if (backdrop) { backdrop.style.opacity = '0'; setTimeout(() => backdrop.style.display = 'none', 400); }
        };
        window.checkDeleteInput = function() {
            const input = document.getElementById('deleteAccountInput');
            const btn   = document.getElementById('confirmAccountDeleteBtn');
            if (!input || !btn) return;
            const match = input.value.trim().toLowerCase() === 'delete account';
            btn.disabled = !match;
            btn.style.opacity  = match ? '1'        : '0.35';
            btn.style.cursor   = match ? 'pointer'  : 'not-allowed';
            input.style.borderColor = input.value.length > 0 ? (match ? '#34d399' : '#f87171') : 'var(--border-color)';
        };
        window.executeDeleteAccount = async function() {
            const btn = document.getElementById('confirmAccountDeleteBtn');
            if (btn) { btn.textContent = 'Deleting...'; btn.disabled = true; btn.style.opacity = '0.6'; }
            try {
                if (window.currentUser?.uid && window._deleteDoc && window._doc) {
                    try { await window._deleteDoc(window._doc(window.db, "users", window.currentUser.uid)); } catch(e) {}
                }
                try { if (window._signOut && window.auth) await window._signOut(window.auth); } catch(e) {}
                const _delTheme = localStorage.getItem('medexcel_theme');
                localStorage.clear();
                if (_delTheme) localStorage.setItem('medexcel_theme', _delTheme);
                window.location.replace("index.html");
            } catch(e) {
                if (btn) { btn.textContent = 'Delete My Account'; btn.disabled = false; btn.style.opacity = '1'; }
                alert("Failed to delete account. Please try again.");
            }
        };

        // logout handled by window.showLogoutModal defined above
        
        window.getInitial = function(name) { return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'; }
        window.formatXP = function(xp) { return (xp || 0).toLocaleString() + " XP"; }
        window.escapeHTML = function(str) { return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
        window.getTimeEmoji = function() { const hour = new Date().getHours(); if (hour < 12) return '⛅'; if (hour < 18) return '☀️'; return '🌙'; }

        // =========================================================