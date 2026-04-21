/* ── app.js ── */

/* ── js/app.js ── */
// State · Router · Utils · Modals · Profile Helpers
// --- GLOBAL VARIABLES & STATE ---
        window.userStats = JSON.parse(localStorage.getItem('medexcel_user_stats')) || { xp: 0, level: 1, streak: 0, count: 0, lastDate: null };
        window.quizzes = [];
        window.userPlan = "free";
        window.allowedMaxItems = 20;
        
        // Study & Create State
        let currentQuiz = null;
        window.setCurrentQuiz = function(q) { currentQuiz = window.currentQuiz = q; };
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
        window.renderRecentDecks = function() {
            const container = document.getElementById('recentDecksContainer');
            if (!container) return;

            const quizzes = window.quizzes || [];
            if (quizzes.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center py-6 text-center">
                        <div class="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mb-3 text-xl text-[var(--accent-btn)]">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <p class="text-sm font-medium text-[var(--text-muted)]">No decks yet</p>
                        <p class="text-xs text-[var(--text-muted)] mt-1 opacity-70">Generate your first quiz to see it here</p>
                    </div>`;
                return;
            }

            // Last 3, most recent first
            const recent = quizzes.slice().reverse().slice(0, 3);
            const iconColors = ['bg-purple-500/10 text-purple-400', 'bg-pink-500/10 text-pink-400', 'bg-blue-500/10 text-blue-400'];
            const icons = ['fas fa-layer-group', 'fas fa-cards-blank', 'fas fa-brain'];

            container.innerHTML = recent.map((quiz, i) => {
                const isMCQ = quiz.type && quiz.type.includes('Multiple');
                const count = quiz.questions ? quiz.questions.length : 0;
                const best = quiz.stats ? quiz.stats.bestScore : 0;
                const attempts = quiz.stats ? quiz.stats.attempts : 0;
                const pct = count > 0 && attempts > 0 ? Math.round((best / count) * 100) : null;
                const pctLabel = pct === null ? 'New' : `+${pct}%`;
                const pctColor = pct === null ? 'var(--accent-btn)' : pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--text-muted)';
                const icon  = isMCQ ? 'fas fa-clipboard-list' : 'fas fa-layer-group';
                const color = isMCQ ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400';
                const label = isMCQ ? 'Questions' : 'Cards';

                return `<a href="javascript:void(0)" onclick="navigateTo('view-study')" 
                    class="flex items-center justify-between bg-[var(--bg-surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border-glass)]">
                    <div class="flex items-center min-w-0">
                        <div class="w-12 h-12 rounded-full ${color} flex items-center justify-center text-xl mr-4 shrink-0">
                            <i class="${icon}"></i>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[15px] font-bold text-[var(--text-main)] mb-0.5 truncate">${window.escapeHTML(quiz.title || 'Untitled')}</span>
                            <span class="text-[12px] text-[var(--text-muted)]">${count} ${label} • ${window.escapeHTML(quiz.subject || 'General')}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end shrink-0 ml-3">
                        <span style="font-size:0.875rem;font-weight:700;color:${pctColor};flex-shrink:0;margin-left:0.75rem;">${pctLabel}</span>
                    </div>
                </a>`;
            }).join('');
        };

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
                // Show most recent activity — whichever happened last: creating a deck OR finishing a study session
                const attempted = window.quizzes.filter(q => q.stats && q.stats.attempts > 0);
                const lastAttempted = attempted.length > 0
                    ? attempted.reduce((a, b) => {
                        const ta = a.stats?.lastAttemptedAt ? new Date(a.stats.lastAttemptedAt).getTime() : a.id;
                        const tb = b.stats?.lastAttemptedAt ? new Date(b.stats.lastAttemptedAt).getTime() : b.id;
                        return ta > tb ? a : b;
                      })
                    : null;
                // quiz.id is Date.now() at creation — reliable creation timestamp
                const lastCreated = window.quizzes[window.quizzes.length - 1];
                let lastQuiz;
                if (!lastAttempted) {
                    lastQuiz = lastCreated;
                } else {
                    const attemptedTime = lastAttempted.stats?.lastAttemptedAt
                        ? new Date(lastAttempted.stats.lastAttemptedAt).getTime()
                        : lastAttempted.id;
                    lastQuiz = lastCreated.id > attemptedTime ? lastCreated : lastAttempted;
                }

                const totalQs   = lastQuiz.questions ? lastQuiz.questions.length : 0;
                const attempts  = lastQuiz.stats ? lastQuiz.stats.attempts : 0;
                const lastScore = lastQuiz.stats ? lastQuiz.stats.lastScore : 0;
                const bestScore = lastQuiz.stats ? lastQuiz.stats.bestScore : 0;
                const isMCQ     = lastQuiz.type && lastQuiz.type.includes('Multiple');

                window._continueQuizId = lastQuiz.id;
                cIconBox.innerHTML = isMCQ
                    ? '<i class="fas fa-clipboard-list" style="font-size:1.25rem;"></i>'
                    : '<i class="fas fa-layer-group" style="font-size:1.25rem;"></i>';
                cIconBox.style.color = isMCQ ? '#8b5cf6' : '#60a5fa';
                cTitle.textContent = lastQuiz.title || 'Untitled';

                if (attempts === 0) {
                    // Never attempted — show item count as a nudge
                    cProgress.textContent = `${totalQs} items`;
                    cProgress.style.background = 'rgba(139,92,246,0.1)';
                    cProgress.style.color = 'var(--accent-btn)';
                    cMeta.innerHTML = `<span>${lastQuiz.subject || 'GENERAL'}</span> • <span>Not started</span>`;
                } else if (isMCQ) {
                    // MCQ — show last score percentage, best in meta
                    const lastPct = totalQs > 0 ? Math.round((lastScore / totalQs) * 100) : 0;
                    const bestPct = totalQs > 0 ? Math.round((bestScore / totalQs) * 100) : 0;
                    cProgress.textContent = `${lastPct}%`;
                    cProgress.style.background = lastPct >= 80 ? 'rgba(52,211,153,0.12)' : lastPct >= 50 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)';
                    cProgress.style.color = lastPct >= 80 ? 'var(--accent-green)' : lastPct >= 50 ? 'var(--accent-yellow)' : '#f87171';
                    cMeta.innerHTML = `<span>Best: ${bestPct}%</span> • <span>${attempts} attempt${attempts !== 1 ? 's' : ''}</span>`;
                } else {
                    // Flashcards — show cards reviewed
                    cProgress.textContent = `${totalQs} cards`;
                    cProgress.style.background = 'rgba(96,165,250,0.12)';
                    cProgress.style.color = '#60a5fa';
                    cMeta.innerHTML = `<span>Reviewed ${attempts}×</span> • <span>${lastQuiz.subject || 'GENERAL'}</span>`;
                }
            } else {
                cIconBox.innerHTML = '<i class="fas fa-layer-group" style="font-size:1.25rem;"></i>';
                cIconBox.style.color = '#60a5fa';
                cTitle.textContent = 'No recent activity';
                cProgress.textContent = 'Start';
                cProgress.style.background = 'rgba(139,92,246,0.1)';
                cProgress.style.color = 'var(--accent-btn)';
                cMeta.innerHTML = '<span>Create your first deck</span>';
            }
            window.renderRecentDecks();
        };

        window.openContinueStudying = function() {
            if (window._continueQuizId) {
                navigateTo('view-study');
                setTimeout(() => {
                    if (typeof window.loadQuizOverview === 'function') {
                        window.loadQuizOverview(window._continueQuizId);
                    }
                }, 100);
            } else {
                navigateTo('view-study');
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
                if (targetViewId === 'view-payment' && typeof window.loadGeoPricing === 'function') window.loadGeoPricing();
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
                if(sheet) sheet.classList.remove('open');
                modal.style.opacity = '0';
                setTimeout(() => { modal.style.display='none'; }, 420);
            } else {
                modal.classList.remove('show');
            }
        };
        window.showLoginModal = function() { document.getElementById('loginModalBackdrop').classList.add('show'); };
        window.showLogoutModal = function() {
            const backdrop = document.getElementById('logoutModalBackdrop');
            const sheet = document.getElementById('logoutSheetInner');
            backdrop.style.display = 'flex';
            requestAnimationFrame(() => {
                backdrop.style.opacity = '1';
                if(sheet) sheet.classList.add('open');
            });
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
            if (typeof window.updateRankDisplay === 'function') window.updateRankDisplay(xp || 0);
        };

        // Plan icon — Free or Premium only
        window.updatePlanIcon = function(plan) {
            const freeCard    = document.getElementById('planCardFree');
            const premCard    = document.getElementById('planCardPremium');
            const expiryLbl   = document.getElementById('subscriptionExpiryLabel');
            const iconEl      = document.getElementById('planIcon');

            if (plan === 'premium' || plan === 'premium_trial' || plan === 'elite') {
                if (freeCard) freeCard.style.display = 'none';
                if (premCard) premCard.style.display = 'block';
                // Sync usage to premium elements too
                const usageFree = document.getElementById('usageCount')?.textContent || '0';
                const premUsage = document.getElementById('usageCountPremium');
                const premBar   = document.getElementById('usageProgressBarPremium');
                const premMax   = document.getElementById('maxLimitDisplayPremium');
                if (premUsage) premUsage.textContent = usageFree;
                if (premMax)   premMax.textContent   = '30';
                if (premBar)   premBar.style.width   = `${Math.min(100, (parseInt(usageFree) / 30) * 100)}%`;
                // Expiry label
                const expiry = window._cachedUserData?.subscriptionExpiry;
                if (expiryLbl && expiry) {
                    const d = new Date(expiry);
                    expiryLbl.textContent = `Renews ${d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}`;
                } else if (expiryLbl) {
                    expiryLbl.textContent = 'Premium active';
                }
                // Hide cancel if already cancelled
                const cancelBtn = document.querySelector('#subscriptionManageRow button');
                if (cancelBtn && window._cachedUserData?.subscriptionCancelled) {
                    cancelBtn.textContent = 'Cancelled';
                    cancelBtn.disabled = true;
                    cancelBtn.style.color = 'var(--text-muted)';
                    if (expiryLbl && expiry) {
                        expiryLbl.textContent = `Access until ${new Date(expiry).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}`;
                    }
                }
            } else {
                if (freeCard) freeCard.style.display = 'block';
                if (premCard) premCard.style.display = 'none';
                if (iconEl)   { iconEl.className = 'fas fa-lock'; iconEl.style.color = '#64748b'; }
            }

            // Keep legacy planBadgeText in sync if it exists
            const planBadge = document.getElementById('planBadgeText');
            if (planBadge) planBadge.textContent = plan === 'premium' ? 'Premium' : 'Free';
        };

        window.showCancelSubscriptionSheet = function() {
            const expiry = window._cachedUserData?.subscriptionExpiry;
            const expiryStr = expiry
                ? new Date(expiry).toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' })
                : 'the end of your billing period';

            const sheet = document.createElement('div');
            sheet.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
            sheet.innerHTML = `
                <div style="width:100%;background:var(--bg-surface);border-radius:1.5rem 1.5rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.25rem);">
                    <div style="width:36px;height:4px;border-radius:9999px;background:var(--border-color);margin:0 auto 1.25rem;"></div>
                    <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                        <i class="fas fa-times-circle" style="color:#ef4444;font-size:1.25rem;"></i>
                    </div>
                    <h3 style="font-size:1.125rem;font-weight:800;color:var(--text-main);text-align:center;margin-bottom:0.5rem;">Cancel Premium?</h3>
                    <p style="font-size:0.8125rem;color:var(--text-muted);text-align:center;line-height:1.55;margin-bottom:1.5rem;">
                        You'll keep premium access until <strong style="color:var(--text-main);">${expiryStr}</strong>. After that you'll be moved to the free plan.
                    </p>
                    <button id="confirmCancelBtn" onclick="window.confirmCancelSubscription(this)" style="width:100%;padding:0.9375rem;border-radius:9999px;border:none;background:#ef4444;color:white;font-size:0.9375rem;font-weight:700;cursor:pointer;margin-bottom:0.625rem;">
                        Yes, cancel subscription
                    </button>
                    <button onclick="this.closest('[style*=position\\:fixed]').remove()" style="width:100%;padding:0.9375rem;border-radius:9999px;border:none;background:var(--bg-body);color:var(--text-muted);font-size:0.9375rem;font-weight:600;cursor:pointer;">
                        Keep Premium
                    </button>
                </div>`;
            sheet.onclick = e => { if (e.target === sheet) sheet.remove(); };
            document.body.appendChild(sheet);
        };

        window.confirmCancelSubscription = async function(btn) {
            btn.textContent = 'Cancelling…';
            btn.disabled = true;
            try {
                const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js");
                const fns    = getFunctions(window.auth?.app, "us-central1");
                const cancel = httpsCallable(fns, "cancelSubscription");
                const result = await cancel();
                if (result.data?.success) {
                    // Update local state — premium stays until expiry
                    if (window._cachedUserData) window._cachedUserData.subscriptionCancelled = true;
                    btn.closest('[style*=position\\:fixed]').remove();
                    // Show confirmation toast
                    const t = document.createElement('div');
                    t.textContent = '✓ Subscription cancelled. Access continues until expiry.';
                    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.8rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;';
                    document.body.appendChild(t);
                    setTimeout(() => t.remove(), 5000);
                    // Update cancel button text
                    const cancelBtn = document.querySelector('#subscriptionManageRow button');
                    if (cancelBtn) { cancelBtn.textContent = 'Cancelled'; cancelBtn.style.color = 'var(--text-muted)'; cancelBtn.disabled = true; }
                }
            } catch(e) {
                btn.textContent = 'Failed — try again';
                btn.disabled = false;
                console.error('Cancel subscription error:', e);
            }
        };

        // Delete account modal
        window.showDeleteAccountModal = function() {
            const backdrop = document.getElementById('accountDeleteBackdrop');
            const sheet    = document.getElementById('accountDeleteSheet');
            const input    = document.getElementById('deleteAccountInput');
            if (input) input.value = '';
            window.checkDeleteInput();
            backdrop.style.display = 'flex';
            requestAnimationFrame(() => {
                backdrop.style.opacity = '1';
                if (sheet) sheet.classList.add('open');
            });
        };
        window.closeDeleteAccountModal = function() {
            const backdrop = document.getElementById('accountDeleteBackdrop');
            const sheet    = document.getElementById('accountDeleteSheet');
            if (sheet) sheet.classList.remove('open');
            if (backdrop) { backdrop.style.opacity = '0'; setTimeout(() => backdrop.style.display = 'none', 420); }
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
        window.timeAgo = function(iso) {
            if (!iso) return '';
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (diff < 60)   return 'just now';
            if (diff < 3600) return Math.floor(diff/60) + 'm ago';
            if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
            return Math.floor(diff/86400) + 'd ago';
        };
        window.escapeHTML = function(str) { return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
        window.getTimeEmoji = function() { const hour = new Date().getHours(); if (hour < 12) return '⛅'; if (hour < 18) return '☀️'; return '🌙'; }

        // Refresh the gens-remaining pill on the Create page header
        window.refreshGensRemaining = function() {
            const label = document.getElementById('gensRemainingLabel');
            if (!label) return;
            const cap  = (window.userPlan === 'premium' || window.userPlan === 'premium_trial') ? 30 : 5;
            const used = parseInt(document.getElementById('usageCount')?.textContent || '0');
            label.textContent = Math.max(0, cap - used);
        };

        // =========================================================

/* ── js/referral.js ── */

/* ── referral.js ── */
// Referral System
// REFERRAL SYSTEM — global scope so initUserUI can call it
        // =========================================================

        const REFERRAL_TIERS = [
            { refs: 1,  label: "+500 XP bonus",                icon: "fa-bolt",        color: "#fbbf24", type: "xp"            },
            { refs: 3,  label: "2× daily limit for 7 days",    icon: "fa-layer-group", color: "#3b82f6", type: "limit_2x"      },
            { refs: 5,  label: "1 week Premium access",        icon: "fa-gem",         color: "#a78bfa", type: "week_premium"  },
            { refs: 10, label: "1 month Premium access",       icon: "fa-crown",       color: "#f97316", type: "month_premium" },
            { refs: 20, label: "Ambassador — permanent boost", icon: "fa-star",        color: "#34d399", type: "ambassador"    },
        ];

        window.renderReferralTiers = function(containerId, referralCount) {
            const container = document.getElementById(containerId);
            if (!container) return;
            // Find the next uncompleted tier
            const next = REFERRAL_TIERS.find(t => referralCount < t.refs);
            const allDone = !next;
            if (allDone) {
                container.innerHTML = `<div style="text-align:center;padding:0.5rem;color:#34d399;font-size:0.8rem;font-weight:700;">🎉 All rewards unlocked!</div>`;
                return;
            }
            const pct = Math.min(100, Math.round((referralCount / next.refs) * 100));
            const prev = REFERRAL_TIERS[REFERRAL_TIERS.indexOf(next) - 1];
            container.innerHTML = `
                <div style="background:var(--bg-body);border-radius:0.875rem;padding:0.875rem;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.625rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <div style="width:28px;height:28px;border-radius:8px;background:${next.color}18;border:1px solid ${next.color}33;display:flex;align-items:center;justify-content:center;">
                                <i class="fas ${next.icon}" style="font-size:0.75rem;color:${next.color};"></i>
                            </div>
                            <div>
                                <div style="font-size:0.8rem;font-weight:700;color:var(--text-main);">Next reward</div>
                                <div style="font-size:0.7rem;color:${next.color};font-weight:600;">${next.refs} friends → ${next.label}</div>
                            </div>
                        </div>
                        <span style="font-size:0.8rem;font-weight:800;color:var(--accent-btn);">${referralCount}<span style="color:var(--text-muted);font-weight:500;">/${next.refs}</span></span>
                    </div>
                    <div style="width:100%;height:6px;background:var(--bg-surface);border-radius:9999px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${next.color};border-radius:9999px;transition:width 0.6s ease;"></div>
                    </div>
                    ${prev ? `<div style="margin-top:0.5rem;font-size:0.65rem;color:var(--text-muted);text-align:right;">${next.refs - referralCount} more to go</div>` : ''}
                </div>
                <button onclick="window.showAllReferralTiers(${referralCount})" style="background:none;border:none;color:var(--accent-btn);font-size:0.72rem;font-weight:600;cursor:pointer;padding:0.25rem 0;width:100%;text-align:center;">See all rewards →</button>`;
        };

        window.showAllReferralTiers = function(referralCount) {
            const sheetId = 'referralTiersSheet_' + Date.now();
            const sheet = document.createElement('div');
            sheet.id = sheetId;
            sheet.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;';
            const tiersHTML = REFERRAL_TIERS.map(tier => {
                const done = referralCount >= tier.refs;
                const pct  = done ? 100 : Math.min(100, Math.round((referralCount / tier.refs) * 100));
                return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border-color);">
                    <div style="width:36px;height:36px;border-radius:0.75rem;background:${done ? tier.color + '20' : 'var(--bg-body)'};border:1px solid ${done ? tier.color + '40' : 'var(--border-color)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fas ${done ? 'fa-check' : tier.icon}" style="font-size:0.875rem;color:${done ? tier.color : 'var(--text-muted)'};"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.8125rem;font-weight:${done?'700':'600'};color:${done?'var(--text-main)':'var(--text-muted)'};">${tier.refs} friend${tier.refs>1?'s':''} — ${tier.label}</div>
                        <div style="width:100%;height:4px;background:var(--bg-body);border-radius:9999px;overflow:hidden;margin-top:4px;">
                            <div style="height:100%;width:${pct}%;background:${tier.color};border-radius:9999px;"></div>
                        </div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:700;color:${done?tier.color:'var(--text-muted)'};flex-shrink:0;">${done ? '✓' : referralCount + '/' + tier.refs}</span>
                </div>`;
            }).join('');
            sheet.innerHTML = `
                <div style="width:100%;background:var(--bg-surface);border-radius:1.5rem 1.5rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.25rem);">
                    <div style="width:36px;height:4px;border-radius:9999px;background:var(--border-color);margin:0 auto 1.25rem;"></div>
                    <h3 style="font-size:1.125rem;font-weight:800;color:var(--text-main);margin-bottom:0.25rem;">Referral Rewards</h3>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">Invite friends to earn these rewards</p>
                    ${tiersHTML}
                    <button onclick="document.getElementById('${sheetId}').remove()" style="width:100%;padding:0.875rem;border-radius:9999px;border:none;background:var(--bg-body);color:var(--text-muted);font-size:0.9375rem;font-weight:600;cursor:pointer;margin-top:1rem;">Close</button>
                </div>`;
            sheet.onclick = e => { if (e.target === sheet) sheet.remove(); };
            document.body.appendChild(sheet);
        };

        const REFERRAL_SHARE_MESSAGE = (link) =>
            `🩺 I've been using MedExcel to study smarter — it generates MCQs and flashcards from my notes using AI.\n\nJoin me and we both get rewards! Sign up here:\n${link}`;

        window.shareReferralLink = async function(source) {
            const code = window._userReferralCode || '';
            if (!code) return;
            const link = `https://medxcel.web.app?ref=${code}`;
            const message = REFERRAL_SHARE_MESSAGE(link);

            // Capacitor native share (Android / iOS)
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const { Share } = window.Capacitor.Plugins;
                    await Share.share({
                        title: 'Join me on MedExcel',
                        text: message,
                        url: link,
                        dialogTitle: 'Share your referral link'
                    });
                } catch(e) {
                    // User cancelled — do nothing
                    if (e.message && !e.message.includes('cancel')) {
                        window.copyReferralLink(source);
                    }
                }
                return;
            }

            // Web Share API (modern browsers)
            if (navigator.share) {
                try {
                    await navigator.share({ title: 'Join me on MedExcel', text: message, url: link });
                } catch(e) {
                    if (e.name !== 'AbortError') window.copyReferralLink(source);
                }
                return;
            }

            // Final fallback — just copy
            window.copyReferralLink(source);
        };

        window.copyReferralLink = function(source) {
            const code = window._userReferralCode || '';
            if (!code) return;
            const link = `https://medxcel.web.app?ref=${code}`;
            const btnId = source === 'upg' ? 'upgCopyBtn' : 'profileCopyBtn';
            const btn = document.getElementById(btnId);

            const showFeedback = (success) => {
                if (!btn) return;
                const orig = btn.innerHTML;
                btn.innerHTML = success ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
                btn.style.color = success ? 'var(--accent-green)' : 'var(--accent-red)';
                setTimeout(() => { btn.innerHTML = orig; btn.style.color = 'var(--text-muted)'; }, 2000);
            };

            try {
                navigator.clipboard.writeText(link).then(() => showFeedback(true)).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = link; document.body.appendChild(ta); ta.select();
                    try { document.execCommand('copy'); showFeedback(true); } catch(e) { showFeedback(false); }
                    document.body.removeChild(ta);
                });
            } catch(e) {
                const ta = document.createElement('textarea');
                ta.value = link; document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); showFeedback(true); } catch(e2) { showFeedback(false); }
                document.body.removeChild(ta);
            }
        };

        window.loadReferralData = function(userData) {
            const code    = userData.referralCode || '';
            const count   = userData.referralCount || 0;
            window._userReferralCode = code;

            // Update count display
            const pCount = document.getElementById('profileReferralCount');
            if (pCount) pCount.innerHTML = `${count} <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">referred</span>`;

            // Next reward progress
            window.renderReferralTiers('profileReferralTiers', count);

            // Active reward indicator
            const boostExpiry = userData.referralBoostExpiry;
            const boostType   = userData.referralBoostType;
            const rewardEl    = document.getElementById('profileActiveReward');
            const rewardTxt   = document.getElementById('profileActiveRewardText');
            if (rewardEl && boostExpiry && new Date(boostExpiry) > new Date()) {
                const expiryDate = new Date(boostExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const labels = {
                    limit_2x:      `2× daily limit active — expires ${expiryDate}`,
                    week_premium:  `Premium access active — expires ${expiryDate}`,
                    month_premium: `Premium access active — expires ${expiryDate}`,
                };
                if (rewardTxt) rewardTxt.textContent = labels[boostType] || `Referral reward active — expires ${expiryDate}`;
                rewardEl.style.display = 'block';
            } else if (rewardEl) {
                rewardEl.style.display = 'none';
            }
        };

        // Apply referral boost to limits if active
        window.applyReferralBoost = function(userData) {
            const boostExpiry = userData.referralBoostExpiry;
            const boostType   = userData.referralBoostType;
            if (!boostExpiry || new Date(boostExpiry) <= new Date()) return; // expired or none

            if (boostType === 'limit_2x' && window.userPlan === 'free') {
                window.allowedMaxItems = 40; // 2× of 20
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = "(Max: 40 — Referral Boost)";
            } else if (boostType === 'week_premium' || boostType === 'month_premium') {
                // treat as premium for limit purposes only (Groq still used — server enforces AI model)
                window.allowedMaxItems = 50;
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = '(Max: 50 — Referral Reward)';
            }
        };

        // =========================================================

/* ── upgrade-modal.js ── */
// Upgrade Modal · Theme Toggle
// UPGRADE MODAL — open / close
        // =========================================================

        window.showCustomUpgradeModal = function(maxAllowed) {
            return new Promise(resolve => {
                const backdrop = document.getElementById('upgradeModalBackdrop');
                const sheet    = document.getElementById('upgradeModalSheet');
                if (!backdrop || !sheet) { resolve(true); return; }

                // Populate usage bar
                const used = parseInt(document.getElementById('usageCount')?.textContent || '0');
                const cap  = (window.userPlan === 'premium' || window.userPlan === 'premium_trial') ? 30 : maxAllowed || 5;
                document.getElementById('upgUsageLabel').textContent = `${used} / ${cap}`;
                document.getElementById('upgUsageBar').style.width = '100%';
                document.getElementById('upgModalSubtitle').textContent =
                    `You've used all ${cap} free generations today.`;

                // Referral tiers
                const count = parseInt(document.getElementById('profileReferralCount')?.textContent || '0');
                window.renderReferralTiers('upgModalTiers', count);
                const code  = window._userReferralCode || '';
                const upgLink = document.getElementById('upgReferralLinkDisplay');
                if (upgLink) upgLink.textContent = code ? `medxcel.web.app?ref=${code}` : 'Loading...';

                // Show sheet
                backdrop.style.display = 'flex';
                backdrop.style.opacity = '1';
                requestAnimationFrame(() => {
                    sheet.style.transform = 'translateY(0)';
                    sheet.style.opacity   = '1';
                });

                // Override buttons
                const upgBtn = backdrop.querySelector('button[onclick*="view-payment"]');
                if (upgBtn) {
                    upgBtn.onclick = () => { window.closeUpgradeModal(); resolve(true); };
                }
                const laterBtn = backdrop.querySelector('button[onclick*="closeUpgradeModal"]');
                if (laterBtn) {
                    laterBtn.onclick = () => { window.closeUpgradeModal(); resolve(false); };
                }
            });
        };

        window.closeUpgradeModal = function() {
            const backdrop = document.getElementById('upgradeModalBackdrop');
            const sheet    = document.getElementById('upgradeModalSheet');
            if (!sheet || !backdrop) return;
            sheet.style.transform = 'translateY(100%)';
            sheet.style.opacity   = '0';
            setTimeout(() => { backdrop.style.display = 'none'; backdrop.style.opacity = '0'; }, 400);
        };

        // Close on backdrop tap
        document.getElementById('upgradeModalBackdrop')?.addEventListener('click', function(e) {
            if (e.target === this) window.closeUpgradeModal();
        });

        // Theme Setup
        window.updateThemeUI = function() {
            const isLight = document.documentElement.classList.contains('light-mode');
            const themeText = document.getElementById('themeText');
            const themeIcon = document.getElementById('themeIcon');
            const switchBg = document.getElementById('themeSwitchBg');
            const switchKnob = document.getElementById('themeSwitchKnob');
            
            if(themeText) themeText.innerText = isLight ? 'Light Mode' : 'Dark Mode';
            if(themeIcon) themeIcon.className = isLight ? 'fas fa-sun text-yellow-500 text-lg' : 'fas fa-moon text-indigo-400 text-lg';
            
            if(switchBg && switchKnob) {
                if (isLight) { switchBg.classList.replace('bg-slate-600', 'bg-blue-500'); switchKnob.style.transform = 'translateX(20px)'; } 
                else { switchBg.classList.replace('bg-blue-500', 'bg-slate-600'); switchKnob.style.transform = 'translateX(0)'; }
            }
        };

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if(themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const isLight = document.documentElement.classList.toggle('light-mode');
                const themeName = isLight ? 'light' : 'dark';
                localStorage.setItem('medexcel_theme', themeName);
                window.updateThemeUI();
                window.syncStatusBar(isLight);
                // Tell native Android to save theme for skeleton screen
                if (window.Android && window.Android.saveTheme) {
                    window.Android.saveTheme(themeName);
                }
            });
        }

/* ── home.js ── */
// Home View
// --- HOME UI LOGIC ---

        // Render last 3 decks dynamically — empty state if none
        
        // ── Promo Carousel — auto-rotate + swipe + real data ──────────
        (function initCarousel() {
            const carousel   = document.getElementById('promoCarousel');
            const indicators = document.querySelectorAll('.promo-dot');
            if (!carousel || indicators.length === 0) return;

            const TOTAL = indicators.length;
            let current = 0;
            let startX  = 0;

            function goTo(idx) {
                current = (idx + TOTAL) % TOTAL;
                carousel.scrollTo({ left: current * carousel.offsetWidth, behavior: 'smooth' });
                indicators.forEach((d, i) => d.classList.toggle('active', i === current));
            }

            carousel.addEventListener('scroll', () => {
                const idx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
                if (idx !== current) {
                    current = idx;
                    indicators.forEach((d, i) => d.classList.toggle('active', i === current));
                }
            }, { passive: true });

            carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
            carousel.addEventListener('touchend', e => {
                const diff = startX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
            }, { passive: true });

            // One-time swipe hint — peeks right then snaps back
            setTimeout(() => {
                const w = carousel.offsetWidth;
                carousel.scrollTo({ left: w * 0.09, behavior: 'smooth' });
                setTimeout(() => carousel.scrollTo({ left: 0, behavior: 'smooth' }), 550);
            }, 1400);

            // ── Slide 1: Streak + Check In ───────────────────────────
            // Daily challenges — use user's dailyTarget from onboarding if available
            const _profile   = JSON.parse(localStorage.getItem('medexcel_user_profile') || '{}');
            const _userTarget = (window.userProfile && window.userProfile.dailyTarget) || _profile.dailyTarget || 0;

            function _makeChallenge(goal, msg) {
                const xp = goal <= 10 ? 50 : goal <= 20 ? 100 : goal <= 30 ? 125 : 150;
                return { goal, xp, challenge: goal + ' items today', msg };
            }

            const dailyChallenges = _userTarget > 0 ? [
                // All 7 days use the user's chosen target
                _makeChallenge(_userTarget, 'Sunday reset — stay consistent'),
                _makeChallenge(_userTarget, 'Start the week strong'),
                _makeChallenge(_userTarget, 'Build on yesterday'),
                _makeChallenge(_userTarget, 'Midweek momentum'),
                _makeChallenge(_userTarget, 'Almost at the finish line'),
                _makeChallenge(_userTarget, 'Finish the week on fire'),
                _makeChallenge(_userTarget, 'The best never rest'),
            ] : [
                { goal: 10, xp: 50,  challenge: '10 items today',          msg: 'Sunday reset — light and steady' },
                { goal: 15, xp: 75,  challenge: 'Crush 15 MCQs',           msg: 'Start the week strong' },
                { goal: 20, xp: 100, challenge: '20 flashcards today',     msg: 'Build on yesterday' },
                { goal: 25, xp: 125, challenge: 'Answer 25 questions',     msg: 'Midweek momentum' },
                { goal: 20, xp: 100, challenge: '20 items today',          msg: 'Almost at the finish line' },
                { goal: 20, xp: 100, challenge: 'End the week — 20 items', msg: 'Finish the week on fire' },
                { goal: 15, xp: 75,  challenge: 'Weekend warrior — 15',    msg: 'The best never rest' },
            ];

            // Load today's progress from localStorage (persists across sessions)
            const _challengeKey = () => 'medexcel_challenge_' + new Date().toDateString();
            const _savedProgress = parseInt(localStorage.getItem(_challengeKey()) || '0');
            if (_savedProgress > 0 && !window._todayStudiedItems) {
                window._todayStudiedItems = _savedProgress;
            }

            window.updatePromoTodayProgress = function() {
                const day  = new Date().getDay();
                const dc   = dailyChallenges[day];
                const done = window._todayStudiedItems || 0;
                const pct  = Math.min(100, Math.round((done / dc.goal) * 100));
                const circumference = 119.4;
                const offset = circumference - (circumference * pct / 100);

                const numEl       = document.getElementById('promoTodayNum');
                const msgEl       = document.getElementById('promoTodayMsg');
                const challengeEl = document.getElementById('promoTodayChallenge');
                const labelEl     = document.getElementById('promoDayLabel');
                const ring        = document.getElementById('promoRingFill');

                if (numEl)       numEl.textContent            = done;
                if (challengeEl) challengeEl.textContent      = dc.challenge;
                if (ring)        ring.style.strokeDashoffset  = offset;

                if (msgEl) {
                    if (done === 0)       msgEl.textContent = dc.msg;
                    else if (pct < 50)   msgEl.textContent = 'Good start — keep going!';
                    else if (pct < 100)  msgEl.textContent = 'More than halfway!';
                    else                 msgEl.textContent = 'Challenge complete! +' + dc.xp + ' XP earned';
                }
                if (labelEl) {
                    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                    labelEl.textContent = days[day] + ' Challenge  •  ' + done + '/' + dc.goal;
                }

                // Save progress to localStorage so it persists
                localStorage.setItem(_challengeKey(), String(done));

                // Award XP exactly once when goal is first hit
                const xpKey = 'medexcel_challenge_xp_' + new Date().toDateString();
                if (pct >= 100 && !localStorage.getItem(xpKey)) {
                    localStorage.setItem(xpKey, '1');
                    if (window.addXP) {
                        window.addXP(dc.xp);
                        // Show a brief toast
                        const toast = document.createElement('div');
                        toast.innerHTML = '+' + dc.xp + ' XP 🎉 Daily challenge complete!';
                        Object.assign(toast.style, {
                            position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
                            background:'var(--accent-btn)', color:'white', padding:'0.625rem 1.25rem',
                            borderRadius:'9999px', fontWeight:'700', fontSize:'0.875rem',
                            zIndex:'9999', whiteSpace:'nowrap',
                            animation:'fadeIn 0.3s ease, fadeOut 0.4s 2.5s ease forwards'
                        });
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3000);
                    }
                }
            };
            window.updatePromoTodayProgress();
            setTimeout(window.updatePromoTodayProgress, 2000);

            // ── Slide 2: Last deck ───────────────────────────────────
            window.updatePromoLastDeck = function() {
                const quizzes = window.quizzes || [];
                const last    = quizzes.length > 0 ? quizzes[quizzes.length - 1] : null;
                const nameEl  = document.getElementById('promoLastDeckName');
                const metaEl  = document.getElementById('promoLastDeckMeta');
                if (!nameEl) return;
                if (last) {
                    const count = last.questions ? last.questions.length : 0;
                    const score = last.stats && last.stats.attempts > 0
                        ? Math.round((last.stats.bestScore / count) * 100) + '% best'
                        : 'Not studied yet';
                    nameEl.textContent = (last.title || 'Untitled Deck').toUpperCase();
                    if (metaEl) metaEl.textContent = count + ' items  •  ' + score;
                } else {
                    nameEl.textContent = 'No decks yet';
                    if (metaEl) metaEl.textContent = 'Create your first deck below';
                }
            };
            window.promoSlide2Action = function() {
                const quizzes = window.quizzes || [];
                if (quizzes.length > 0) { window.currentQuiz = window.quizzes = quizzes; window.openPracticeMobile(quizzes[quizzes.length - 1].id); }
                else navigateTo('view-create');
            };
            window.updatePromoLastDeck();
            setTimeout(window.updatePromoLastDeck, 2000);

            // ── Slide 3: Daily usage ─────────────────────────────────
            window.updatePromoUsage = function() {
                const plan   = window.userPlan || 'free';
                const cap    = (plan === 'premium' || plan === 'premium_trial') ? 30 : 5;
                // Read from the profile usageCount element — firebase.js keeps it up to date
                const usageEl = document.getElementById('usageCount');
                const used   = usageEl ? (parseInt(usageEl.textContent) || 0) : 0;
                const left   = Math.max(0, cap - used);
                const usedEl = document.getElementById('promoUsedNum');
                const maxEl  = document.getElementById('promoMaxNum');
                const msgEl  = document.getElementById('promoUsageMsg');
                if (usedEl) usedEl.textContent = used;
                if (maxEl)  maxEl.textContent  = cap;
                if (msgEl) {
                    if (left === 0)      msgEl.textContent = 'Limit reached — upgrade for more';
                    else if (left === 1) msgEl.textContent = '1 generation left today';
                    else                 msgEl.textContent = left + ' generations left today';
                }
            };
            window.updatePromoUsage();
            setTimeout(window.updatePromoUsage, 2500);

        })();


        // ══════════════════════════════════
        // COACH MARKS — GUIDED TOUR
        // ══════════════════════════════════
        (function() {
            var KEY = 'medexcel_onboarding_v1';
            if (localStorage.getItem(KEY)) return;

            var STEPS = [
                { target: null,                text: "Hi! I'm your MedExcel guide 👋  Let me quickly show you how everything works.", btn: "Let's go →" },
                { target: 'nav-create',        text: "Tap here to generate MCQs or flashcards from your notes, PDFs or YouTube.", btn: "Got it →" },
                { target: 'nav-study',         text: "Your Library — all your generated decks live here.", btn: "Got it →" },
                { target: 'headerStreakBadge', text: "Your Streak 🔥  Check in every day to keep it alive and earn XP.", btn: "Got it →" },
                { target: 'nav-leaderboard',   text: "The Leaderboard 🏆  See how you rank against other students.", btn: "Got it →" },
                { target: null,                text: "You're all set! 🎯  Consistency beats cramming. Let's ace those exams!", btn: "Start studying!" }
            ];

            var cur = 0, ov, canvas, ctx, doc, W, H;

            function build() {
                W = window.innerWidth; H = window.innerHeight;

                var style = document.createElement('style');
                style.textContent = '@keyframes ob-pop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}';
                document.head.appendChild(style);

                ov = document.createElement('div');
                ov.style.cssText = 'position:fixed;inset:0;z-index:99999;opacity:0;transition:opacity 0.3s ease;';

                canvas = document.createElement('canvas');
                canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;';
                canvas.width = W; canvas.height = H;
                ctx = canvas.getContext('2d');
                ov.appendChild(canvas);

                var blocker = document.createElement('div');
                blocker.style.cssText = 'position:absolute;inset:0;z-index:2;';
                ov.appendChild(blocker);

                doc = document.createElement('img');
                doc.src = 'doctor.svg';
                doc.style.cssText = 'position:absolute;bottom:0;right:0;z-index:6;pointer-events:none;object-fit:contain;' +
                    'transition:height 0.4s ease,bottom 0.4s ease,transform 0.5s cubic-bezier(0.19,1,0.22,1);transform:translateX(110%);';
                ov.appendChild(doc);

                document.body.appendChild(ov);

                requestAnimationFrame(function() {
                    ov.style.opacity = '1';
                    setTimeout(function() { doc.style.transform = 'translateX(0)'; }, 150);
                    showStep(0);
                });
            }

            function drawCutout(rect) {
                ctx.clearRect(0, 0, W, H);
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(0, 0, W, H);
                if (!rect) return;
                // Punch hole
                ctx.globalCompositeOperation = 'destination-out';
                var r=12, x=rect.x, y=rect.y, w=rect.w, h=rect.h;
                ctx.beginPath();
                ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
                ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
                ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
                ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
                ctx.closePath(); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                // Glow
                ctx.strokeStyle = 'rgba(139,92,246,0.9)'; ctx.lineWidth = 2;
                ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
                ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
                ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
                ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
                ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;
            }

            function makeTail(dir, leftPx) {
                // Container flush against the box edge — no gap
                var wrap = document.createElement('div');
                wrap.style.cssText = 'position:absolute;left:' + leftPx + 'px;width:22px;height:12px;' +
                    (dir === 'down' ? 'bottom:-12px;' : 'top:-12px;');

                if (dir === 'down') {
                    // Outer: border-color triangle pointing down
                    var outer = document.createElement('div');
                    outer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;' +
                        'border-left:11px solid transparent;border-right:11px solid transparent;' +
                        'border-top:12px solid rgba(139,92,246,0.55);';
                    // Inner: bg-color triangle, 1px smaller, shifted down 1px to sit inside border
                    var inner = document.createElement('div');
                    inner.style.cssText = 'position:absolute;top:0;left:1.5px;width:0;height:0;' +
                        'border-left:9.5px solid transparent;border-right:9.5px solid transparent;' +
                        'border-top:11px solid #18181b;';
                    wrap.appendChild(outer);
                    wrap.appendChild(inner);
                } else {
                    // Pointing up
                    var outer = document.createElement('div');
                    outer.style.cssText = 'position:absolute;bottom:0;left:0;width:0;height:0;' +
                        'border-left:11px solid transparent;border-right:11px solid transparent;' +
                        'border-bottom:12px solid rgba(139,92,246,0.55);';
                    var inner = document.createElement('div');
                    inner.style.cssText = 'position:absolute;bottom:0;left:1.5px;width:0;height:0;' +
                        'border-left:9.5px solid transparent;border-right:9.5px solid transparent;' +
                        'border-bottom:11px solid #18181b;';
                    wrap.appendChild(outer);
                    wrap.appendChild(inner);
                }
                return wrap;
            }

            function makeTooltip(step, rect) {
                // Remove old tooltip
                var old = ov.querySelector('.ob-tt');
                if (old) old.remove();

                var tt = document.createElement('div');
                tt.className = 'ob-tt';

                // Build inner HTML — no tail yet
                tt.innerHTML =
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                        '<span style="font-size:0.6rem;font-weight:800;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.07em;">MedExcel Guide</span>' +
                        '<button class="ob-skip-btn" style="background:none;border:none;color:#64748b;font-size:0.7rem;cursor:pointer;padding:2px 8px;">Skip</button>' +
                    '</div>' +
                    '<p style="font-size:0.875rem;font-weight:600;color:#f1f5f9;line-height:1.5;margin:0 0 10px;">' + step.text + '</p>' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<div class="ob-dots-wrap" style="display:flex;gap:4px;align-items:center;"></div>' +
                        '<button class="ob-next-btn" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;' +
                            'padding:8px 16px;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;' +
                            'box-shadow:0 4px 12px rgba(139,92,246,0.4);">' + step.btn + '</button>' +
                    '</div>';

                tt.style.cssText = 'position:absolute;z-index:8;background:#18181b;' +
                    'border:1.5px solid rgba(139,92,246,0.55);border-radius:14px;padding:14px;' +
                    'box-shadow:0 12px 36px rgba(0,0,0,0.7);animation:ob-pop 0.25s ease;';

                // Dots
                var dotsWrap = tt.querySelector('.ob-dots-wrap');
                STEPS.forEach(function(_, i) {
                    var d = document.createElement('div');
                    d.style.cssText = 'height:5px;border-radius:9999px;' +
                        'background:' + (i===cur ? '#8b5cf6' : 'rgba(139,92,246,0.2)') +
                        ';width:' + (i===cur ? '14px' : '5px') + ';';
                    dotsWrap.appendChild(d);
                });

                ov.appendChild(tt);

                // Wire buttons
                tt.querySelector('.ob-skip-btn').onclick = done;
                tt.querySelector('.ob-next-btn').onclick = advance;

                // Position tooltip snug next to highlighted element
                if (!rect) {
                    // Intro/outro — upper center, leave bottom half for doctor
                    tt.style.width = (W - 48) + 'px';
                    tt.style.left  = '24px';
                    tt.style.top   = Math.round(H * 0.14) + 'px';
                    return;
                }

                // Tooltip width — leave right 35% for doctor
                var ttW = Math.round(W * 0.62);
                tt.style.width = ttW + 'px';

                var pad = 12;
                var cx = rect.x + rect.w / 2;
                var ttH = tt.offsetHeight || 130;
                var spaceAbove = rect.y - pad;

                // Horizontal position
                var isNavTarget = rect.y > H * 0.75;
                var left;
                if (isNavTarget) {
                    left = pad; // left-anchored so doctor stays on right
                } else {
                    left = Math.max(pad, Math.min(W - ttW - pad, cx - ttW / 2));
                }

                // Tail offset = element center relative to tooltip left edge, clamped
                var tailLeft = Math.max(14, Math.min(ttW - 26, cx - left - 11));

                // Vertical: tooltip above or below target
                if (spaceAbove >= ttH + 14) {
                    // Tooltip ABOVE target — tail points DOWN toward element
                    tt.style.top = (rect.y - ttH - 12) + 'px';
                    tt.appendChild(makeTail('down', tailLeft));
                } else {
                    // Tooltip BELOW target — tail points UP toward element
                    tt.style.top = (rect.y + rect.h + 12) + 'px';
                    tt.appendChild(makeTail('up', tailLeft));
                }
                tt.style.left = left + 'px';
            }

            function showStep(idx) {
                cur = idx;
                var s = STEPS[idx];

                // Doctor size
                if (!s.target) {
                    doc.style.height = '44%'; doc.style.bottom = '0'; doc.style.maxHeight = '290px';
                } else {
                    doc.style.height = '20%'; doc.style.bottom = '65px'; doc.style.maxHeight = '150px';
                }

                if (s.target) {
                    var el = document.getElementById(s.target);
                    if (el) {
                        var r = el.getBoundingClientRect(), p = 10;
                        var rect = { x:r.left-p, y:r.top-p, w:r.width+p*2, h:r.height+p*2 };
                        drawCutout(rect);
                        makeTooltip(s, rect);

                        // Remove old tap zone
                        var oldZone = ov.querySelector('.ob-tapzone');
                        if (oldZone) oldZone.remove();

                        // Transparent tap zone over the highlighted element
                        var zone = document.createElement('div');
                        zone.className = 'ob-tapzone';
                        zone.style.cssText = 'position:absolute;z-index:9;cursor:pointer;' +
                            'left:' + rect.x + 'px;top:' + rect.y + 'px;' +
                            'width:' + rect.w + 'px;height:' + rect.h + 'px;';
                        zone.onclick = advance;
                        ov.appendChild(zone);
                    }
                } else {
                    // Remove tap zone on non-target steps
                    var oldZone = ov.querySelector('.ob-tapzone');
                    if (oldZone) oldZone.remove();
                    drawCutout(null);
                    makeTooltip(s, null);
                }
            }

            function advance() {
                if (cur >= STEPS.length-1) { done(); return; }
                showStep(cur+1);
            }

            function done() {
                if (ov) { ov.style.opacity='0'; setTimeout(function(){ ov.remove(); },350); }
                if (typeof navigateTo==='function') navigateTo('view-home');
                localStorage.setItem(KEY, '1');
                // Show streak modal now if it was pending
                if (window._pendingStreakModal) {
                    window._pendingStreakModal = false;
                    setTimeout(function(){ if(typeof window.openStreakModal==='function') window.openStreakModal(); }, 600);
                }
            }

            var fired = false;
            function fire() {
                if (!fired) {
                    // Wait if personalized onboarding is open
                    if (window._personalizedOnboardingOpen === true) {
                        setTimeout(fire, 400); return;
                    }
                    // Wait if streak modal is open (check both 'show' and 'open' class)
                    var streakModal = document.getElementById('streakModalBackdrop');
                    if (streakModal && (streakModal.classList.contains('show') || streakModal.classList.contains('open'))) {
                        setTimeout(fire, 800); return;
                    }
                    fired = true;
                    setTimeout(build, 500);
                }
            }
            var t = setInterval(function() {
                var gt = document.getElementById('greetingTitle');
                if (gt && gt.textContent && gt.textContent.length > 3 && !gt.classList.contains('skeleton')) {
                    clearInterval(t); fire();
                }
            }, 250);
            setTimeout(function() { clearInterval(t); fire(); }, 3000);
        })();

        // Weekly Target Rotator
        const targetMessages = [
            { title: "Study Consistency", desc: "You're on track to hit your goals. Keep reviewing materials daily to build long-term retention." },
            { title: "Daily Streak", desc: "Consistency is key! Complete a quick review today to keep your streak alive." },
            { title: "Spaced Repetition", desc: "Don't forget to review older decks. Spaced repetition solidifies your memory." }
        ];
        let currentTargetIdx = 0;
        setInterval(() => {
            currentTargetIdx = (currentTargetIdx + 1) % targetMessages.length;
            const titleEl = document.getElementById('targetTitle');
            const descEl = document.getElementById('targetDesc');
            if(titleEl && descEl) {
                titleEl.style.opacity = '0'; descEl.style.opacity = '0';
                setTimeout(() => {
                    titleEl.textContent = targetMessages[currentTargetIdx].title;
                    descEl.textContent = targetMessages[currentTargetIdx].desc;
                    titleEl.style.opacity = '1'; descEl.style.opacity = '1';
                }, 300);
            }
        }, 5000);

        // Streak Calendar UI
        let currentStreakCount = 0;
        let hasCheckedInToday = false;

        // Called after any real study action (quiz complete, deck generated, boss fight, Anki import)
        window.commitStreakOnAction = function() {
            if (hasCheckedInToday || !window.currentUser) return;
            const uid      = window.currentUser.uid;
            const todayStr = new Date().toDateString();

            // Save to local history
            const history = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
            if (!history.includes(todayStr)) {
                history.push(todayStr);
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
                localStorage.setItem('medexcel_checkin_history_' + uid, JSON.stringify(history.filter(d => new Date(d) >= cutoff)));
            }

            window.userStats.count    = currentStreakCount;
            window.userStats.lastDate = todayStr;
            localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));
            hasCheckedInToday = true;

            // Update header
            const hDisplay = document.getElementById('headerStreakDisplay');
            if (hDisplay) hDisplay.textContent = currentStreakCount;
            const hIcon = document.getElementById('headerFireIcon');
            if (hIcon) hIcon.style.opacity = '1';

            // Sync to Firestore
            if (window.syncUserStreak) window.syncUserStreak(uid, currentStreakCount, todayStr);
            if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();

            // Show celebration modal (only after onboarding is done)
            if (localStorage.getItem('medexcel_onboarding_v1')) {
                setTimeout(() => window.openStreakModal(), 600);
            }
        };

        function buildCalendarRow() {
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const today = new Date();
            const currentDayIndex = (today.getDay() + 6) % 7;

            // Build array of Date objects for this week (Mon–Sun)
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - currentDayIndex + i);
                d.setHours(0, 0, 0, 0);
                weekDates.push(d);
            }

            // Reconstruct check-in days from Firestore data (lastCheckIn + streak count)
            // We don't store per-day history — instead we backfill streak days backwards from lastCheckIn
            const checkedInSet = new Set();
            const lastDate = window.userStats ? window.userStats.lastDate : null;
            const streakCount = currentStreakCount || 0;

            if (lastDate && streakCount > 0) {
                const last = new Date(lastDate);
                last.setHours(0, 0, 0, 0);
                for (let i = 0; i < streakCount; i++) {
                    const d = new Date(last);
                    d.setDate(last.getDate() - i);
                    checkedInSet.add(d.toDateString());
                }
            }
            // Also mark today if already checked in this session
            if (hasCheckedInToday) {
                checkedInSet.add(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toDateString());
            }

            // Determine state for each day
            const states = weekDates.map((d, i) => {
                const ds = d.toDateString();
                if (i < currentDayIndex) {
                    return checkedInSet.has(ds) ? 'done' : 'missed';
                } else if (i === currentDayIndex) {
                    return checkedInSet.has(ds) ? 'done' : 'active';
                }
                return 'future';
            });

            // Build connector map — connect consecutive 'done' days
            let html = '';
            for (let i = 0; i < 7; i++) {
                const prevDone = i > 0 && states[i-1] === 'done';
                const nextDone = i < 6 && states[i+1] === 'done';
                const thisDone = states[i] === 'done';

                let colClass = 'day-col';
                if (thisDone && nextDone) colClass += prevDone ? ' connected-both' : ' connected';
                else if (thisDone && prevDone) colClass += ' connected-left';

                let circleClass = 'day-circle';
                let content = weekDates[i].getDate();

                if (states[i] === 'done') {
                    circleClass += ' done';
                    content = '<i class="fas fa-check"></i>';
                } else if (states[i] === 'active') {
                    circleClass += ' active';
                } else if (states[i] === 'missed') {
                    circleClass += ' missed';
                }

                html += `<div class="${colClass}"><span class="day-label text-xs font-bold text-[var(--text-muted)]">${labels[i]}</span><div class="${circleClass}">${content}</div></div>`;
            }
            return html;
        }

        // Variable to hold the animation so it doesn't duplicate
        var fireLottieAnim = null;

        const streakDailyMessages = [
            { title: "Rest day recharged?", sub: "Sunday reset — show up today<br>and keep that streak burning! 🔥" },
            { title: "New week, new goals!", sub: "Monday energy — check in now<br>and set the tone for the week! 💪" },
            { title: "Two days strong!", sub: "You showed up yesterday.<br>Do it again today — it adds up! ⚡" },
            { title: "Midweek momentum!", sub: "Wednesday warriors don't quit.<br>Stay consistent, stay ahead! 🏆" },
            { title: "Almost at the weekend!", sub: "Thursday push — one more day<br>before you can brag about it! 😅" },
            { title: "Friday fire!", sub: "End the week strong.<br>Check in and protect that streak! 🎯" },
            { title: "Weekend warrior mode!", sub: "Saturday hustle — the best students<br>don't take days off. Let's go! 🚀" }
        ];
        
        window.openStreakModal = function() {
            document.getElementById('calendarRow').innerHTML = buildCalendarRow();
            const btn = document.getElementById('closeStreakModal');
            document.getElementById('modalDayCount').textContent = currentStreakCount;
            btn.textContent = hasCheckedInToday ? "Awesome! 🎉" : "Check in today!";

            const todayMsg = streakDailyMessages[new Date().getDay()];
            const titleEl = document.getElementById('streakDialogTitle');
            if (titleEl) {
                titleEl.innerHTML = hasCheckedInToday
                    ? "You're on fire! 🔥<br>Keep this streak going tomorrow!"
                    : todayMsg.sub;
            }

            // Streak freeze — always visible, 3 states
            const freezeRow   = document.getElementById('streakFreezeRow');
            const freezeTitle = document.getElementById('freezeTitle');
            const freezeDesc  = document.getElementById('freezeDesc');
            const freezeBtn   = document.getElementById('freezeBtn');
            const uid = window.currentUser ? window.currentUser.uid : 'guest';
            const freezesEarned = Math.floor(currentStreakCount / 7);
            const freezesUsed   = parseInt(localStorage.getItem('medexcel_freezes_used_' + uid) || '0');
            const freezeAvailable = freezesEarned > freezesUsed;
            const daysToNextFreeze = 7 - (currentStreakCount % 7);

            if (freezeRow) {
                freezeRow.style.display = 'flex';

                if (freezeAvailable) {
                    // State 1: Freeze ready to use
                    const freezeIcon = document.getElementById('freezeIcon');
                    if (freezeIcon) { freezeIcon.style.color = '#63b3ed'; freezeIcon.className = 'fas fa-snowflake'; }
                    if (freezeTitle) freezeTitle.textContent = 'Streak Freeze Available!';
                    if (freezeDesc)  freezeDesc.textContent  = 'Protects your streak for 1 missed day';
                    if (freezeBtn)   { freezeBtn.style.display = 'block'; freezeBtn.textContent = 'Use Freeze'; freezeBtn.disabled = false; freezeBtn.style.opacity = '1'; }
                } else if (freezesUsed > 0 && freezesUsed >= freezesEarned) {
                    // State 2: Freeze used
                    const freezeIcon = document.getElementById('freezeIcon');
                    if (freezeIcon) { freezeIcon.style.color = '#94a3b8'; freezeIcon.className = 'fas fa-snowflake'; }
                    if (freezeTitle) freezeTitle.textContent = 'Freeze Used';
                    if (freezeDesc)  freezeDesc.textContent  = daysToNextFreeze + ' more days to earn your next freeze';
                    if (freezeBtn)   freezeBtn.style.display = 'none';
                } else {
                    // State 3: Not yet earned — show progress
                    const freezeIcon = document.getElementById('freezeIcon');
                    if (freezeIcon) { freezeIcon.style.color = '#94a3b8'; freezeIcon.className = 'fas fa-snowflake'; }
                    if (freezeTitle) freezeTitle.textContent = 'Streak Freeze';
                    if (freezeDesc) {
                        if (currentStreakCount === 0) {
                            freezeDesc.textContent = 'Reach a 7-day streak to earn a freeze';
                        } else {
                            freezeDesc.innerHTML = '<span style="color:var(--accent-btn);font-weight:700;">' + daysToNextFreeze + ' day' + (daysToNextFreeze > 1 ? 's' : '') + ' away</span> — keep your streak going!';
                        }
                    }
                    if (freezeBtn) freezeBtn.style.display = 'none';
                }
            }

            if (!fireLottieAnim) {
                fireLottieAnim = lottie.loadAnimation({
                    container: document.getElementById('modalStreakLottie'),
                    renderer: 'svg', loop: true, autoplay: true, path: 'fire.json'
                });
            } else {
                fireLottieAnim.play();
            }

            document.getElementById('streakModalBackdrop').classList.add('show');
        };

        // Use streak freeze — marks yesterday as checked-in to protect streak
        window.useStreakFreeze = function() {
            const uid = window.currentUser ? window.currentUser.uid : 'guest';
            const freezeBtn = document.getElementById('freezeBtn');
            const freezeTitle = document.getElementById('freezeTitle');
            const freezeDesc = document.getElementById('freezeDesc');

            // Mark freeze as used
            const used = parseInt(localStorage.getItem('medexcel_freezes_used_' + uid) || '0');
            localStorage.setItem('medexcel_freezes_used_' + uid, String(used + 1));

            // Add yesterday to check-in history
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const history = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
            if (!history.includes(yesterday.toDateString())) {
                history.push(yesterday.toDateString());
                localStorage.setItem('medexcel_checkin_history_' + uid, JSON.stringify(history));
            }

            // Sync to Firestore
            if (window.currentUser && window.syncUserStreak) {
                window.syncUserStreak(window.currentUser.uid, currentStreakCount, new Date().toDateString());
            }

            // Update UI
            if (freezeBtn) { freezeBtn.textContent = 'Used!'; freezeBtn.disabled = true; freezeBtn.style.opacity = '0.5'; }
            if (freezeTitle) freezeTitle.textContent = 'Freeze Used';
            if (freezeDesc) freezeDesc.textContent = 'Your streak is protected!';
            document.getElementById('calendarRow').innerHTML = buildCalendarRow();
        };

        document.getElementById('closeStreakModal').onclick = () => {
            window.closeGlobalModal('streakModalBackdrop');
            const hDisplay = document.getElementById('headerStreakDisplay');
            if (hDisplay) hDisplay.textContent = currentStreakCount;
            const hIcon = document.getElementById('headerFireIcon');
            if (hIcon) hIcon.style.opacity = hasCheckedInToday ? '1' : '0.4';
        };

/* ── study.js ── */
// Study / Library View
// --- STUDY UI LOGIC ---
        window.openPracticeMobile = function() {
            if (window.innerWidth < 1024) {
                document.getElementById('libraryPanel').classList.add('hidden');
                document.getElementById('studyPracticePanel').classList.add('active');
            }
        }

        window.closePracticeMobile = function() {
            window.exitStudyQuizMode();
            if (window.innerWidth < 1024) {
                document.getElementById('libraryPanel').classList.remove('hidden');
                document.getElementById('studyPracticePanel').classList.remove('active');
            }
            document.getElementById('studyPracticeArea').innerHTML = `
                <div class="text-center text-[var(--text-muted)] flex flex-col items-center fade-in">
                    <div class="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mb-6 text-3xl text-[var(--accent-btn)]"><i class="fas fa-layer-group"></i></div>
                    <h3 class="text-xl font-bold text-[var(--text-main)] mb-2">Ready to Study?</h3>
                    <p class="text-[15px] font-medium">Select a deck from your library to begin.</p>
                </div>
            `;
            currentQuiz = null;
        }

        window.promptDelete = function(e, id) { e.stopPropagation(); window.quizToDelete = id; document.getElementById('deleteModalBackdrop').classList.add('show'); };

        window.enterStudyQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = 'translateY(100%)';
            Object.assign(document.getElementById('studyPracticePanel').style, { position:'fixed', inset:'0', zIndex:'200', background:'var(--bg-body)' });
            const header = document.getElementById('studyPracticeHeader');
            if (header) header.style.display = 'none';
            Object.assign(document.getElementById('studyPracticeArea').style, { padding:'0', alignItems:'stretch', justifyContent:'flex-start' });
        };
        window.exitStudyQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = '';
            Object.assign(document.getElementById('studyPracticePanel').style, { position:'', inset:'', zIndex:'', background:'' });
            const header = document.getElementById('studyPracticeHeader');
            if (header) header.style.display = '';
            Object.assign(document.getElementById('studyPracticeArea').style, { padding:'', alignItems:'', justifyContent:'' });
        };

        window.startPractice = function(exam) {
            isExamMode = exam;
            currentQuestionIndex = 0;
            examScore = 0;
            // Reset answered state for all questions
            if (currentQuiz && currentQuiz.questions) {
                currentQuiz.questions.forEach(q => { q.answered = false; });
            }
            window.enterStudyQuizMode();
            window.renderStudyQuestion();
        }

        window.renderStudyQuestion = function() {
            if (!currentQuiz || !currentQuiz.questions) return;
            if (currentQuestionIndex >= currentQuiz.questions.length) { window.finishStudyQuiz(); return; }

            const q = currentQuiz.questions[currentQuestionIndex];
            const area = document.getElementById('studyPracticeArea');
            const progressPercent = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
            const isMCQSession = currentQuiz.type && currentQuiz.type.includes("Multiple");

            const safeQuestion = window.escapeHTML(q.text || q.front || q.question || "No question");
            const safeAnswer   = window.escapeHTML(q.back || q.answer || (q.options && q.correct !== undefined ? q.options[q.correct] : "") || "No answer");

            let contentHTML = '';

            if (isMCQSession) {
                let optionsHTML = '<div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;width:100%;">';
                q.options.forEach((opt, idx) => {
                    const key = String.fromCharCode(65 + idx);
                    optionsHTML += `<button class="study-mcq-opt" data-idx="${idx}" style="width:100%;text-align:left;padding:0.75rem 0.875rem;border-radius:var(--radius-md);background:var(--bg-body);border:1px solid var(--border-glass);display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;color:var(--text-main);transition:border-color 0.15s;"><span style="font-weight:600;color:var(--text-muted);background:var(--bg-surface);border:1px solid var(--border-glass);width:1.625rem;height:1.625rem;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:0.75rem;flex-shrink:0;margin-top:0.125rem;">${key}</span><span style="flex:1;font-size:0.9rem;line-height:1.4;padding-top:0.125rem;font-weight:500;">${window.escapeHTML(opt)}</span></button>`;
                });
                optionsHTML += '</div>';
                contentHTML = `
                    <div style="flex:1;background:var(--bg-surface);border-radius:var(--radius-card);padding:1rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;min-height:0;overflow:hidden;">
                        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;padding-right:0.25rem;" class="hide-scroll">
                            <h3 style="font-weight:700;color:var(--text-main);font-size:0.9375rem;line-height:1.6;margin-bottom:1rem;flex-shrink:0;">${safeQuestion}</h3>
                            ${optionsHTML}
                            <div id="studyExplanationArea" style="display:none;flex-direction:column;gap:0.75rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-glass);flex-shrink:0;"></div>
                        </div>
                    </div>`;
            } else {
                contentHTML = `
                    <div id="studyFlashcardEl" style="flex:1;position:relative;perspective:1000px;cursor:pointer;min-height:0;width:100%;">
                        <div id="studyFlipInner" style="position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 0.5s var(--ease-snap);border-radius:var(--radius-card);">
                            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:var(--radius-card);padding:1.5rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow-y:auto;background:var(--bg-surface);z-index:2;transform:rotateY(0deg);">
                                <span style="position:absolute;top:1.5rem;font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Question</span>
                                <h3 style="font-weight:600;font-size:1.125rem;line-height:1.5;margin-top:1rem;color:var(--text-main);">${safeQuestion}</h3>
                                <p style="position:absolute;bottom:1.25rem;font-size:0.8125rem;font-weight:500;display:flex;align-items:center;gap:0.375rem;color:var(--text-muted);"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:var(--radius-card);padding:1.5rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow-y:auto;background:var(--accent-btn);transform:rotateY(180deg);box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);z-index:1;">
                                <span style="position:absolute;top:1.5rem;font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:var(--btn-text);opacity:0.7;">Answer</span>
                                <p style="font-weight:600;font-size:1.125rem;line-height:1.5;margin-top:1rem;color:var(--btn-text);">${safeAnswer}</p>
                                <p style="position:absolute;bottom:1.25rem;font-size:0.8125rem;font-weight:500;display:flex;align-items:center;gap:0.375rem;color:var(--btn-text);opacity:0.8;"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                        </div>
                    </div>`;
            }

            const isLast = currentQuestionIndex === currentQuiz.questions.length - 1;
            const nextDisabled = isMCQSession && !q.answered;

            area.innerHTML = `
                <div style="display:flex;flex-direction:column;height:100%;width:100%;padding:1.25rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);box-sizing:border-box;max-width:680px;margin:0 auto;" class="fade-in">
                    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;flex-shrink:0;">
                        <button onclick="window.closePracticeMobile()" style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;flex-shrink:0;transition:0.2s;" ontouchstart="this.style.transform='scale(0.9)'" ontouchend="this.style.transform=''"><i class="fas fa-arrow-left"></i></button>
                        <h2 style="font-size:0.75rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;flex:1;">${isMCQSession ? 'MCQ Session' : 'Flashcard Session'}</h2>
                        <span style="font-size:0.8125rem;font-weight:600;color:var(--text-main);">${currentQuestionIndex + 1} / ${currentQuiz.questions.length}</span>
                    </div>
                    <div style="width:100%;height:6px;background:var(--bg-body);border-radius:100px;overflow:hidden;margin-bottom:1rem;border:1px solid var(--border-glass);flex-shrink:0;">
                        <div style="height:100%;background:var(--accent-btn);border-radius:100px;transition:width 0.4s var(--ease-snap);width:${progressPercent}%;"></div>
                    </div>
                    ${contentHTML}
                    <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-shrink:0;">
                        <button id="studyPrevBtn" style="flex:1;padding:1rem;border-radius:var(--radius-btn);font-size:0.9375rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);${currentQuestionIndex === 0 ? 'opacity:0.4;cursor:not-allowed;' : ''}">Previous</button>
                        <button id="studyNextBtn" ${nextDisabled ? 'disabled' : ''} style="flex:1;padding:1rem;border-radius:var(--radius-btn);font-size:0.9375rem;font-weight:700;border:none;background:var(--accent-btn);color:var(--btn-text);${nextDisabled ? 'opacity:0.4;cursor:not-allowed;' : 'cursor:pointer;'}">${isLast ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
            `;

            // Attach event listeners
            if (isMCQSession) {
                const btns = area.querySelectorAll('.study-mcq-opt');
                btns.forEach(btn => btn.addEventListener('click', () => window.handleStudyMCQSelection(btn, q, btns)));
            } else {
                const fc = document.getElementById('studyFlashcardEl');
                fc.addEventListener('click', () => { window._todayStudiedItems = (window._todayStudiedItems || 0) + 1; if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();
                    const inner = document.getElementById('studyFlipInner');
                    inner.style.transform = inner.style.transform.includes('180deg') ? 'rotateY(0deg)' : 'rotateY(180deg)';
                });
            }

            const prevBtn = document.getElementById('studyPrevBtn');
            const nextBtn = document.getElementById('studyNextBtn');

            prevBtn.addEventListener('click', () => {
                if (currentQuestionIndex > 0) { currentQuestionIndex--; window.renderStudyQuestion(); }
            });
            nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        window.renderStudyQuestion();
    } else {
        window.finishStudyQuiz();
    }
});
        }

        window.handleStudyMCQSelection = function(selectedBtn, q, allBtns) {
            if (q.answered) return;
            q.answered = true;

            const selectedIdx = parseInt(selectedBtn.dataset.idx);
            const isCorrect = selectedIdx === q.correct;
            if (isCorrect) examScore++;
            window._todayStudiedItems = (window._todayStudiedItems || 0) + 1;
            if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();

            allBtns.forEach(btn => {
                const idx = parseInt(btn.dataset.idx);
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
                if (idx === q.correct) {
                    btn.style.background = 'rgba(16,185,129,0.1)';
                    btn.style.borderColor = 'rgba(16,185,129,0.3)';
                    btn.style.color = 'var(--accent-green)';
                    btn.querySelector('span').style.borderColor = 'rgba(16,185,129,0.3)';
                    btn.querySelector('span').style.color = 'var(--accent-green)';
                } else if (idx === selectedIdx) {
                    btn.style.background = 'rgba(239,68,68,0.1)';
                    btn.style.borderColor = 'rgba(239,68,68,0.3)';
                    btn.style.color = 'var(--accent-red)';
                    btn.querySelector('span').style.borderColor = 'rgba(239,68,68,0.3)';
                    btn.querySelector('span').style.color = 'var(--accent-red)';
                } else {
                    btn.style.opacity = '0.4';
                }
            });

            const expl = document.getElementById('studyExplanationArea');
            expl.innerHTML = `
                <div style="font-size:0.8125rem;font-weight:700;margin-bottom:0.375rem;">
                    ${isCorrect ? '<span style="color:var(--accent-green)"><i class="fas fa-check-circle"></i> Correct!</span>' : '<span style="color:var(--accent-red)"><i class="fas fa-times-circle"></i> Incorrect</span>'}
                </div>
                ${q.explanation ? `<div style="background:var(--bg-body);padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);color:var(--text-main);font-size:0.875rem;line-height:1.5;"><span style="font-weight:700;color:var(--text-muted);display:block;margin-bottom:0.25rem;font-size:0.7rem;text-transform:uppercase;">Explanation</span>${window.escapeHTML(q.explanation)}</div>` : ''}
            `;
            expl.style.display = 'flex';

            // Unlock Next button
const nextBtn = document.getElementById('studyNextBtn');
if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';
    nextBtn.style.cursor = 'pointer';
} 

            setTimeout(() => { expl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
        }

        window.finishStudyQuiz = async function() {
            const isMCQSession = currentQuiz.type && currentQuiz.type.includes("Multiple");

            if (!currentQuiz.stats) currentQuiz.stats = { bestScore: 0, attempts: 0, lastScore: 0 };
            const isFirstAttempt = currentQuiz.stats.attempts === 0;

            // Only award XP on first completion — replaying is practice, not reward
            const totalXP = isFirstAttempt
                ? (isMCQSession ? examScore * 10 + 20 : (currentQuiz.questions ? currentQuiz.questions.length * 5 : 20))
                : 0;
            if (totalXP > 0) window.addXP(totalXP);
            window.commitStreakOnAction?.();

            currentQuiz.stats.attempts++;
            currentQuiz.stats.lastScore = examScore;
            if (examScore > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = examScore;
            currentQuiz.stats.lastAttemptedAt = new Date().toISOString();

            if (window.currentUser) {
                try {
                    const { updateDoc, doc, collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                    // Save stats (only for non-group decks)
                    if (!currentQuiz._isGroupDeck) {
                        await updateDoc(doc(window.db, "users", window.currentUser.uid, "quizzes", currentQuiz.id.toString()), { stats: currentQuiz.stats });
                        localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes));
                        // Track total MCQ questions answered
                        if (isMCQSession) {
                            const qCount = currentQuiz.questions ? currentQuiz.questions.length : 0;
                            const prev = window._cachedUserData?.totalQuestionsAnswered || 0;
                            const newTotal = prev + qCount;
                            updateDoc(doc(window.db, 'users', window.currentUser.uid), { totalQuestionsAnswered: newTotal }).catch(() => {});
                            if (window._cachedUserData) window._cachedUserData.totalQuestionsAnswered = newTotal;
                        }
                    }
                    // Write to group score feed if this is a group deck
                    if (currentQuiz._isGroupDeck && currentQuiz._groupId) {
                        const total2 = currentQuiz.questions ? currentQuiz.questions.length : 0;
                        const pct = total2 > 0 ? Math.round((examScore / total2) * 100) : 0;
                        const userData = window._cachedUserData || {};
                        const memberName = userData.displayName || window.currentUser.email?.split('@')[0] || 'User';
                        await addDoc(collection(window.db, 'groups', currentQuiz._groupId, 'scoreFeed'), {
                            memberUid: window.currentUser.uid,
                            memberName,
                            deckTitle: currentQuiz.title,
                            score: examScore,
                            total: total2,
                            percentage: pct,
                            scoredAt: new Date().toISOString()
                        });
                        // Update scores on deck doc
                        const deckRef = doc(window.db, 'groups', currentQuiz._groupId, 'sharedDecks', String(currentQuiz.id));
                        await updateDoc(deckRef, {
                            [`scores.${window.currentUser.uid}`]: { score: examScore, percentage: pct, date: new Date().toISOString() }
                        }).catch(() => {});
                        // Notify deck creator
                        try {
                            const deckRef2 = doc(window.db, 'groups', currentQuiz._groupId, 'sharedDecks', String(currentQuiz.id));
                            const deckSnap = await window._firestoreGetDoc(deckRef2);
                            if (deckSnap.exists()) {
                                const creatorUid = deckSnap.data().sharedBy;
                                if (creatorUid && creatorUid !== window.currentUser.uid) {
                                    const { getFunctions: gf, httpsCallable: hc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
                                    const fn = hc(gf(window.auth.app, 'us-central1'), 'sendToUserById');
                                    await fn({ userId: creatorUid, title: '🔥 Score alert!', body: `${memberName} scored ${pct}% on your "${currentQuiz.title}" deck`, data: { type: 'group_score' } }).catch(() => {});
                                }
                            }
                        } catch(e) {}
                    }
                } catch(e) { console.error("Stats sync failed", e); }

                // Check achievements with quiz context
                if (typeof window.checkAchievements === 'function') {
                    const now = new Date();
                    const hour = now.getHours();
                    const qCount = currentQuiz.questions ? currentQuiz.questions.length : 0;
                    const pct3 = qCount > 0 ? Math.round((examScore / qCount) * 100) : 0;
                    // Track groupHighScores for Team Player achievement
                    if (currentQuiz._isGroupDeck && pct3 >= 80 && window.currentUser && window._cachedUserData) {
                        const prev = window._cachedUserData.groupHighScores || 0;
                        const newCount = prev + 1;
                        updateDoc(doc(window.db, 'users', window.currentUser.uid), { groupHighScores: newCount }).catch(() => {});
                        window._cachedUserData.groupHighScores = newCount;
                    }
                    setTimeout(() => window.checkAchievements({
                        isNightOwl:    hour === 0 || hour === 1 || hour === 2 || hour === 3,
                        accuracy:      pct3,
                        isPerfect:     pct3 === 100,
                        questionCount: isMCQSession ? qCount : 0
                    }), 1500);
                }
            }

            const area = document.getElementById('studyPracticeArea');
            const total = currentQuiz.questions ? currentQuiz.questions.length : 0;
            const percentage = total > 0 ? Math.round((examScore / total) * 100) : 100;
            const xpLabel = totalXP > 0 ? `+${totalXP}` : `Already earned`;

            if (isMCQSession) {
                let stars = 1; if (percentage >= 80) stars = 3; else if (percentage >= 50) stars = 2;
                const perfTitle = percentage === 100 ? 'Perfect score!'   :
                                  percentage >= 80  ? 'More, more, more!' :
                                  percentage >= 50  ? 'Good effort!'      : 'Keep going!';
                const perfSub   = percentage === 100 ? "You got every single one. You're unstoppable!" :
                                  percentage >= 80  ? `${examScore} correct out of ${total}? You're on fire!` :
                                  percentage >= 50  ? `${examScore} correct out of ${total}. Review and try again!` :
                                                      `${examScore} correct out of ${total}. Don't give up!`;

                area.innerHTML = `
                    <div style="display:flex;flex-direction:column;height:100%;width:100%;background:var(--bg-body);overflow:hidden;">
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem 1.5rem;">
                            <div style="display:flex;gap:1.25rem;align-items:center;">
                                <div id="star1" style="opacity:0;transform:scale(0) rotate(-20deg);transition:all 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.1s;">
                                    <i class="fas fa-star" style="font-size:3.25rem;color:${stars >= 1 ? '#fbbf24' : 'var(--border-color)'};filter:${stars >= 1 ? 'drop-shadow(0 0 14px rgba(251,191,36,0.8))' : 'none'};"></i>
                                </div>
                                <div id="star2" style="opacity:0;transform:scale(0) rotate(0deg);transition:all 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.25s;">
                                    <i class="fas fa-star" style="font-size:4rem;color:${stars >= 2 ? '#fbbf24' : 'var(--border-color)'};filter:${stars >= 2 ? 'drop-shadow(0 0 18px rgba(251,191,36,0.9))' : 'none'};"></i>
                                </div>
                                <div id="star3" style="opacity:0;transform:scale(0) rotate(20deg);transition:all 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.15s;">
                                    <i class="fas fa-star" style="font-size:3.25rem;color:${stars >= 3 ? '#fbbf24' : 'var(--border-color)'};filter:${stars >= 3 ? 'drop-shadow(0 0 14px rgba(251,191,36,0.8))' : 'none'};"></i>
                                </div>
                            </div>
                        </div>
                        <div style="background:var(--bg-surface);border-radius:1.75rem 1.75rem 0 0;padding:1.75rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.25rem);box-shadow:0 -8px 40px rgba(0,0,0,0.15);">
                            <h2 style="font-size:1.875rem;font-weight:900;color:#fbbf24;text-align:center;margin-bottom:0.5rem;letter-spacing:-0.01em;">${perfTitle}</h2>
                            <p style="color:var(--text-muted);font-size:0.9375rem;text-align:center;line-height:1.55;margin-bottom:1.5rem;">${perfSub}</p>
                            <div style="display:flex;gap:0.625rem;margin-bottom:1.5rem;">
                                <div style="flex:1;border-radius:0.875rem;border:2.5px solid #fbbf24;background:#fbbf2418;padding:0.875rem 0.25rem;text-align:center;">
                                    <div style="font-size:0.55rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#fbbf24;margin-bottom:0.4rem;">Total XP</div>
                                    <div style="font-size:1.5rem;font-weight:900;color:#fbbf24;display:flex;align-items:center;justify-content:center;gap:0.2rem;"><i class="fas fa-bolt" style="font-size:1rem;"></i><span id="animXP">${totalXP > 0 ? '0' : xpLabel}</span></div>
                                </div>
                                <div style="flex:1;border-radius:0.875rem;border:2.5px solid #4ade80;background:#4ade8018;padding:0.875rem 0.25rem;text-align:center;">
                                    <div style="font-size:0.55rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#4ade80;margin-bottom:0.4rem;">${percentage >= 80 ? 'Good' : 'Accuracy'}</div>
                                    <div style="font-size:1.5rem;font-weight:900;color:#4ade80;display:flex;align-items:center;justify-content:center;gap:0.2rem;"><i class="fas fa-bullseye" style="font-size:1rem;"></i><span id="animPct">0</span>%</div>
                                </div>
                                <div style="flex:1;border-radius:0.875rem;border:2.5px solid #38bdf8;background:#38bdf818;padding:0.875rem 0.25rem;text-align:center;">
                                    <div style="font-size:0.55rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#38bdf8;margin-bottom:0.4rem;">Score</div>
                                    <div style="font-size:1.5rem;font-weight:900;color:#38bdf8;display:flex;align-items:center;justify-content:center;gap:0.2rem;"><i class="fas fa-check-circle" style="font-size:1rem;"></i><span id="animScore">0</span></div>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                                <button onclick="window.startPractice(false)" style="width:100%;padding:1.0625rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:none;background:var(--accent-btn);color:var(--btn-text);">Try Again</button>
                                <button onclick="window.closePracticeMobile()" style="width:100%;padding:1rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);">Back to Library</button>
                            </div>
                        </div>
                    </div>`;

                setTimeout(() => {
                    [1,2,3].forEach(s => {
                        const el = document.getElementById('star' + s);
                        if (el) { el.style.opacity = '1'; el.style.transform = 'scale(1) rotate(0deg)'; }
                    });
                }, 80);

                function animateCount(id, target, duration) {
                    const el = document.getElementById(id);
                    if (!el) return;
                    let start = 0;
                    const step = target / (duration / 16);
                    const timer = setInterval(() => {
                        start = Math.min(start + step, target);
                        el.textContent = Math.round(start);
                        if (start >= target) clearInterval(timer);
                    }, 16);
                }
                setTimeout(() => {
                    animateCount('animXP', totalXP, 900);
                animateCount('animPct', percentage, 900);
                animateCount('animScore', examScore, 800);
                }, 400);

            } else {
                // Flashcards — simple clean layout, no stars
                area.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;width:100%;padding:2rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);box-sizing:border-box;max-width:500px;margin:0 auto;" class="fade-in">
                        <div style="width:80px;height:80px;border-radius:50%;background:rgba(52,211,153,0.15);border:3px solid #34d399;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
                            <i class="fas fa-check" style="font-size:2rem;color:#34d399;"></i>
                        </div>
                        <h2 style="font-size:1.75rem;font-weight:900;color:var(--text-main);margin-bottom:0.5rem;text-align:center;">Review Complete!</h2>
                        <p style="color:var(--text-muted);font-size:0.9375rem;text-align:center;margin-bottom:2rem;">${currentQuiz.title}</p>
                        <div style="display:flex;gap:0.75rem;width:100%;margin-bottom:2.5rem;">
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Cards</div>
                                <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);">${total}</div>
                            </div>
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">XP Earned</div>
                                <div style="font-size:1.75rem;font-weight:800;color:var(--accent-yellow);"><i class="fas fa-bolt" style="font-size:1.25rem;"></i> ${xpLabel}</div>
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.75rem;width:100%;margin-top:auto;">
                            <button onclick="window.startPractice(false)" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:none;background:var(--accent-btn);color:var(--btn-text);">Review Again</button>
                            <button onclick="window.closePracticeMobile()" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);">Back to Library</button>
                        </div>
                    </div>`;
            }
        };

/* ── create.js ── */
// Create View
// --- CREATE UI LOGIC ---

        window.openCreateView = function(type) {
            window.globalQuizType = type;
            document.getElementById('selectionView').style.display = 'none';
            document.getElementById('setupView').style.display = 'flex';
            document.getElementById('createHeaderTitle').textContent = `Create ${type}`;
            document.getElementById('createBackBtn').style.display = 'flex';
        };

        // Source tab switching — only touch borderColor and color, never background
        window.switchSourceTab = function(tab) {
            const dropZone    = document.getElementById('dropZone');
            const pasteZone   = document.getElementById('pasteZone');
            const youtubeZone = document.getElementById('youtubeZone');

            // Reset all 3 tabs to inactive
            ['tabUpload','tabPaste','tabYoutube'].forEach(id => {
                const b = document.getElementById(id);
                if (!b) return;
                b.style.borderColor = 'var(--border-glass)';
                b.style.color = 'var(--text-muted)';
            });

            // Activate selected tab with its accent colour — NO background change
            const accentColors = { upload: '#8b5cf6', paste: '#64748b', youtube: '#ef4444' };
            const activeBtn = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (activeBtn) {
                activeBtn.style.borderColor = accentColors[tab] || 'var(--accent-btn)';
                activeBtn.style.color = accentColors[tab] || 'var(--accent-btn)';
            }

            // Show/hide zones
            if (dropZone)    dropZone.style.display    = tab === 'upload'  ? 'flex'  : 'none';
            if (pasteZone)   pasteZone.style.display   = tab === 'paste'   ? 'block' : 'none';
            if (youtubeZone) youtubeZone.style.display = tab === 'youtube' ? 'block' : 'none';

            // Clear stale source state when switching
            if (tab === 'upload') {
                window._sourceIsPaste = false; window._sourceIsYoutube = false;
                if (!window.selectedFile) window._resetGenerateBtn();
            } else if (tab === 'paste') {
                window._sourceIsYoutube = false;
                const ta = document.getElementById('pasteTextarea');
                if (ta && ta.value.trim().length > 20) window.handlePasteInput(ta);
                else { window.selectedFile = null; window._sourceIsPaste = false; window._resetGenerateBtn(); }
            } else if (tab === 'youtube') {
                window._sourceIsPaste = false;
                const inp = document.getElementById('youtubeInput');
                if (inp && window._youtubeVideoId) window.handleYoutubeInput(inp);
                else { window.selectedFile = null; window._sourceIsYoutube = false; window._resetGenerateBtn(); }
            }
        };

        // YouTube URL handler
        window._youtubeVideoId = null;
        window.handleYoutubeInput = function(inp) {
            const url = inp.value.trim();
            const feedback = document.getElementById('youtubeFeedback');
            const wrap = document.getElementById('youtubeInputWrap');
            const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (match) {
                window._youtubeVideoId = match[1];
                window._sourceIsYoutube = true;
                inp.style.borderColor = 'var(--border-active)';
                if (wrap) wrap.style.borderColor = 'var(--border-active)';
                if (feedback) feedback.innerHTML = '<i class="fas fa-check-circle" style="color:var(--accent-green);margin-right:4px;"></i>Valid URL — transcript will be extracted on generate';
                const blob = new Blob(['youtube:' + window._youtubeVideoId], { type: 'text/plain' });
                window.selectedFile = new File([blob], 'youtube-' + window._youtubeVideoId + '.txt', { type: 'text/plain' });
                // Auto-suggest deck name for YouTube
                const nameInputYt = document.getElementById('deckNameInput');
                if (nameInputYt && !nameInputYt.value.trim()) {
                    nameInputYt.value = 'YouTube — ' + window._youtubeVideoId;
                    nameInputYt.style.borderColor = 'var(--accent-btn)';
                }
                document.getElementById('configSection').style.opacity = '1';
                document.getElementById('configSection').style.pointerEvents = 'auto';
                const btn = document.getElementById('generateBtn');
                if (btn) { btn.disabled = false; btn.style.background = 'var(--accent-btn)'; btn.style.color = 'var(--btn-text)'; btn.style.cursor = 'pointer'; }
            } else {
                window._youtubeVideoId = null; window._sourceIsYoutube = false; window.selectedFile = null;
                inp.style.borderColor = url.length > 5 ? '#f87171' : 'var(--border-glass)';
                if (wrap) wrap.style.borderColor = url.length > 5 ? '#f87171' : 'var(--border-glass)';
                if (feedback) feedback.innerHTML = url.length > 5 ? '<i class="fas fa-times-circle" style="color:#f87171;margin-right:4px;"></i>Not a valid YouTube URL' : '';
                window._resetGenerateBtn();
            }
        };

        // Handle paste textarea input
        window.handlePasteInput = function(ta) {
            const text = ta.value;
            const count = text.length;
            const charCount = document.getElementById('pasteCharCount');
            if (charCount) charCount.textContent = count.toLocaleString();

            // Update textarea border color
            ta.style.borderColor = count > 20 ? 'var(--border-active)' : 'var(--border-glass)';

            if (count > 20) {
                // Convert pasted text to a File object so firebase.js works unchanged
                const blob = new Blob([text], { type: 'text/plain' });
                window.selectedFile = new File([blob], 'pasted-text.txt', { type: 'text/plain' });
                window._sourceIsPaste = true;
                // Auto-suggest deck name for paste if empty
                const nameInputPaste = document.getElementById('deckNameInput');
                if (nameInputPaste && !nameInputPaste.value.trim()) {
                    // Use first few words of pasted text as name
                    const words = text.trim().split(/\s+/).slice(0, 5).join(' ');
                    nameInputPaste.value = words.length > 3 ? words + '…' : 'Pasted Notes';
                    nameInputPaste.style.borderColor = 'var(--accent-btn)';
                }

                // Enable config + generate button
                document.getElementById('configSection').style.opacity = '1';
                document.getElementById('configSection').style.pointerEvents = 'auto';
                const btn = document.getElementById('generateBtn');
                if (btn) { btn.disabled = false; btn.style.background = 'var(--accent-btn)'; btn.style.color = 'var(--btn-text)'; btn.style.cursor = 'pointer'; }
            } else {
                window.selectedFile = null;
                window._sourceIsPaste = false;
                window._resetGenerateBtn();
            }
        };

        window._resetGenerateBtn = function() {
            document.getElementById('configSection').style.opacity = '0.5';
            document.getElementById('configSection').style.pointerEvents = 'none';
            const nameInput = document.getElementById('deckNameInput');
            if (nameInput) { nameInput.value = ''; nameInput.style.borderColor = 'var(--border-glass)'; }
            const btn = document.getElementById('generateBtn');
            if (btn) { btn.disabled = true; btn.style.background = 'var(--bg-surface)'; btn.style.color = 'var(--text-muted)'; btn.style.cursor = 'not-allowed'; }
        };

        // Question style selector — use event delegation on container to avoid child element issues
        document.addEventListener('DOMContentLoaded', function() {
            const selector = document.getElementById('styleSelector');
            if (selector) {
                selector.addEventListener('click', function(e) {
                    const btn = e.target.closest('.style-btn');
                    if (!btn) return;
                    // Deactivate all
                    selector.querySelectorAll('.style-btn').forEach(b => {
                        b.style.borderColor = 'var(--border-glass)';
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                    });
                    // Activate selected
                    btn.style.borderColor = 'var(--accent-btn)';
                    btn.style.background = 'rgba(167,139,250,0.1)';
                    btn.style.color = 'var(--accent-btn)';
                    // Update hidden input
                    const input = document.getElementById('topicFocus');
                    if (input) input.value = btn.dataset.style;
                });
            }
        });
        // Keep function available for resets
        window.selectQuestionStyle = function(btn) {
            const selector = document.getElementById('styleSelector');
            if (!selector) return;
            selector.querySelectorAll('.style-btn').forEach(b => {
                b.style.borderColor = 'var(--border-glass)';
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
            });
            btn.style.borderColor = 'var(--accent-btn)';
            btn.style.background = 'rgba(167,139,250,0.1)';
            btn.style.color = 'var(--accent-btn)';
            const input = document.getElementById('topicFocus');
            if (input) input.value = btn.dataset.style;
        };

        window.enterQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = 'translateY(100%)';
            const header = document.querySelector('#view-create .top-header');
            if (header) header.style.display = 'none';
            Object.assign(document.getElementById('interactiveView').style, { position:'fixed', inset:'0', zIndex:'200', background:'var(--bg-body)', padding:'0', overflowY:'auto' });
        };
        window.exitQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = '';
            const header = document.querySelector('#view-create .top-header');
            if (header) header.style.display = '';
            Object.assign(document.getElementById('interactiveView').style, { position:'', inset:'', zIndex:'', background:'', padding:'', overflowY:'' });
        };

        window.goBackToSelection = function() {
            window.exitQuizMode();
            if (typeof window.refreshGensRemaining === 'function') window.refreshGensRemaining();
            document.getElementById('setupView').style.display = 'none';
            document.getElementById('interactiveView').style.display = 'none';
            document.getElementById('createHeaderTitle').textContent = "What to create?";
            document.getElementById('createBackBtn').style.display = 'none';

            // If coming from home page MCQ/Flashcard tap, skip selection entirely
            if (window._pendingCreateType) {
                const type = window._pendingCreateType;
                window._pendingCreateType = null;
                // Hide selection so it never shows, then open the setup view directly
                document.getElementById('selectionView').style.display = 'none';
                window.openCreateView(type);
                return;
            }

            // Normal back — show selection screen
            document.getElementById('selectionView').style.display = 'flex';
            const _mv = document.getElementById('manualCreateView'); if (_mv) _mv.style.display = 'none'; const _av = document.getElementById('ankiImportView'); if (_av) _av.style.display = 'none'; const _bv = document.getElementById('bossFightView'); if (_bv) _bv.style.display = 'none';
            
            // Reset state
            window.selectedFile = null;
            document.getElementById('fileInput').value = '';
            const resetIcon = document.getElementById('uploadIconInner');
            if (resetIcon) { resetIcon.className = 'fas fa-cloud-upload-alt'; resetIcon.style.color = ''; resetIcon.style.animation = ''; }
            document.getElementById('uploadTitle').textContent = "Tap to Upload File";
            document.getElementById('dropZone').style.borderColor = 'var(--border-glass)';
            document.getElementById('dropZone').classList.remove('file-selected');
            document.getElementById('dropZone').style.display = 'flex';
            // Reset paste zone
            const pasteZone = document.getElementById('pasteZone');
            if (pasteZone) pasteZone.style.display = 'none';
            const pasteTA = document.getElementById('pasteTextarea');
            if (pasteTA) { pasteTA.value = ''; pasteTA.style.borderColor = 'var(--border-glass)'; }
            const charCount = document.getElementById('pasteCharCount');
            if (charCount) charCount.textContent = '0';
            window._sourceIsPaste = false;
            // Reset tabs
            // Reset all tabs — only border/color, no background
            ['tabUpload','tabPaste','tabYoutube'].forEach((id, i) => {
                const b = document.getElementById(id);
                if (!b) return;
                if (i === 0) { b.style.borderColor = '#8b5cf6'; b.style.color = '#8b5cf6'; }
                else { b.style.borderColor = 'var(--border-glass)'; b.style.color = 'var(--text-muted)'; }
            });
            
            // Reset style selector to default (Direct & Factual)
            const topicInput = document.getElementById('topicFocus');
            if (topicInput) topicInput.value = 'direct';
            document.querySelectorAll('.style-btn').forEach((b, i) => {
                if (i === 0) { b.style.borderColor = 'var(--accent-btn)'; b.style.background = 'rgba(167,139,250,0.1)'; b.style.color = 'var(--accent-btn)'; }
                else { b.style.borderColor = 'var(--border-glass)'; b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; }
            });
            
            document.getElementById('configSection').style.opacity = '0.5';
            document.getElementById('configSection').style.pointerEvents = 'none';
            
            const btn = document.getElementById('generateBtn');
            btn.disabled = true;
            btn.style.background = 'var(--bg-surface)';
            btn.style.color = 'var(--text-muted)';
            btn.style.cursor = 'not-allowed';
            
            document.getElementById('interactiveView').style.display = 'none';
        };

        // --- LIBRARY FILTER TABS & SEARCH ---
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const searchVal = document.getElementById('librarySearchInput') ? document.getElementById('librarySearchInput').value : '';
                window.renderLibrary(btn.dataset.filter, searchVal);
            });
        });
        const librarySearchInput = document.getElementById('librarySearchInput');
        if (librarySearchInput) {
            librarySearchInput.addEventListener('input', (e) => {
                const activeTabEl = document.querySelector('.tab-btn.active');
                const filter = activeTabEl ? activeTabEl.dataset.filter : 'all';
                window.renderLibrary(filter, e.target.value);
            });
        }

        // --- LOTTIE LOADER INIT ---
        document.addEventListener('DOMContentLoaded', () => {
            const loaderContainer = document.getElementById('lottieLoaderContainer');
            if (loaderContainer && typeof lottie !== 'undefined') {
                try {
                    window.lottieAnimation = lottie.loadAnimation({
                        container: loaderContainer,
                        renderer: 'svg',
                        loop: true,
                        autoplay: false,
                        path: 'scan.json'
                    });
                } catch(e) { window.lottieAnimation = null; }
            }
        });
        const sliderValue = document.getElementById('sliderValue');
        if(itemSlider && sliderValue) {
            function updateSliderHint(val) {
                const max = window.allowedMaxItems;
                let hintEl = document.getElementById('sliderLimitHint');
                if (val > max) {
                    sliderValue.innerHTML = `${val} <i class="fas fa-lock" style="font-size:10px;"></i>`;
                    sliderValue.style.color = '#f97316';
                    sliderValue.style.borderColor = 'rgba(249,115,22,0.5)';
                    if (!hintEl) {
                        hintEl = document.createElement('p');
                        hintEl.id = 'sliderLimitHint';
                        hintEl.style.cssText = 'font-size:0.75rem;color:#f97316;text-align:center;margin-top:0.375rem;font-weight:600;';
                        itemSlider.parentElement.appendChild(hintEl);
                    }
                    const plan = window.userPlan === 'premium' ? 'Premium is capped at 50' : `Free plan max is ${max}. Upgrade for 50`;
                    hintEl.textContent = `⚠️ ${plan}`;
                } else {
                    sliderValue.textContent = val;
                    sliderValue.style.color = 'var(--text-main)';
                    sliderValue.style.borderColor = 'var(--border-glass)';
                    if (hintEl) hintEl.remove();
                }
            }
            itemSlider.addEventListener('input', (e) => updateSliderHint(parseInt(e.target.value, 10)));
            itemSlider.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                if (val > window.allowedMaxItems) {
                    e.target.value = window.allowedMaxItems;
                    updateSliderHint(window.allowedMaxItems);
                }
            });
        }

        const fileInput = document.getElementById('fileInput');
        if(fileInput) {
            fileInput.addEventListener('click', (e) => { if (!window.currentUser) { e.preventDefault(); window.showLoginModal(); } });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const isPremium = window.userPlan === 'premium' || window.userPlan === 'elite';
                    const maxMB = isPremium ? 50 : 15;
                    if (file.size > maxMB * 1024 * 1024) { alert(`File is too large. Maximum size is ${maxMB}MB${!isPremium ? ' on the free plan. Upgrade to Premium for 50MB.' : '.'}`); fileInput.value = ''; return; }

                    // PDFs get the page selector first
                    if (file.name.toLowerCase().endsWith('.pdf')) {
                        window.openPdfPageSelector(file);
                        return;
                    }

                    // All other file types proceed as normal
                    window._applySelectedFile(file);
                }
            });
        }

        // Shared helper — called after page selection or for non-PDF files
        window._applySelectedFile = function(file) {
            window.selectedFile = file;
            const iconEl = document.getElementById('uploadIconInner');
            if (iconEl) { iconEl.className = 'fas fa-file-check'; iconEl.style.color = 'var(--accent-btn)'; iconEl.style.animation = 'none'; }
            document.getElementById('uploadTitle').innerHTML = `<span style="color: var(--accent-btn);">${window.escapeHTML(file.name)}</span>`;
            const nameInput = document.getElementById('deckNameInput');
            if (nameInput && !nameInput.value.trim()) {
                const suggested = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
                nameInput.value = suggested.charAt(0).toUpperCase() + suggested.slice(1);
                nameInput.style.borderColor = 'var(--accent-btn)';
            }
            document.getElementById('dropZone').style.borderColor = 'var(--border-active)';
            document.getElementById('dropZone').classList.add('file-selected');
            document.getElementById('configSection').style.opacity = '1';
            document.getElementById('configSection').style.pointerEvents = 'auto';
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.style.background = 'var(--accent-btn)';
            btn.style.color = 'var(--btn-text)';
            btn.style.cursor = 'pointer';
        };
//// --- NEW INTERACTIVE RENDERER LOGIC (CREATE VIEW) ---

window.checkAnswerMatch = function(selectedKey, selectedValue, correctAnswer) {
    if (!correctAnswer) return false;
    const ans = String(correctAnswer).trim().toLowerCase();
    const k = String(selectedKey).trim().toLowerCase();
    const v = String(selectedValue).trim().toLowerCase();
    const isShortAnswer = ans.length <= 3;
    return ans === k || ans === k + '.' || ans === v ||
        (isShortAnswer && (ans.startsWith(k + '.') || ans.startsWith(k + ')')));
};

window.handleCreateMCQSelection = function(selectedBtn, cardData, allButtons) {
            if (cardData.answered) return; cardData.answered = true;
            const selectedKey = selectedBtn.dataset.key; let selectedIsCorrect = false;
            const answer = cardData.back || cardData.answer || "No answer provided";

            allButtons.forEach(btn => {
                const key = btn.dataset.key; const value = btn.dataset.value;
                const ansLower = String(answer).trim().toLowerCase();
                const keyLower = String(key).trim().toLowerCase();
                const valLower = String(value).trim().toLowerCase();
                // Only use startsWith for short answers (A, B, C, D) — never match full text against a single letter
                const isShortAnswer = ansLower.length <= 3;
                const isThisCorrect = ansLower === keyLower ||
                    ansLower === keyLower + '.' ||
                    ansLower === valLower ||
                    (isShortAnswer && ansLower.startsWith(keyLower));
                btn.disabled = true; btn.style.opacity = '0.5';
                if (isThisCorrect) { 
                    btn.style.background = 'rgba(16, 185, 129, 0.1)'; btn.style.borderColor = 'rgba(16, 185, 129, 0.3)'; btn.style.color = 'var(--accent-green)'; btn.style.opacity = '1'; 
                    if (key === selectedKey) { selectedIsCorrect = true; sessionScore++; } 
                } 
                else if (key === selectedKey) { 
                    btn.style.background = 'rgba(239, 68, 68, 0.1)'; btn.style.borderColor = 'rgba(239, 68, 68, 0.3)'; btn.style.color = 'var(--accent-red)'; btn.style.opacity = '1'; 
                }
            });

            const explArea = document.getElementById('createExplanationArea');
            explArea.innerHTML = `<div style="margin-bottom: 0.5rem; font-size: 0.8125rem;">${selectedIsCorrect ? '<span style="color: var(--accent-green); font-weight: 700;"><i class="fas fa-check-circle"></i> Correct</span>' : `<span style="color: var(--accent-red); font-weight: 700;"><i class="fas fa-times-circle"></i> Incorrect</span> <span style="margin-left: 0.5rem; color: var(--text-muted); font-size: 0.75rem;">Answer: <b style="color: var(--text-main);">${window.escapeHTML(answer)}</b></span>`}</div>${cardData.explanation ? `<div style="background: var(--bg-body); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass); color: var(--text-main); font-size: 0.875rem; line-height: 1.5;"><span style="font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.375rem; font-size: 0.75rem; text-transform: uppercase;">Explanation</span> ${window.escapeHTML(cardData.explanation)}</div>` : ''}`;
            explArea.style.display = 'flex'; explArea.classList.add('fade-in');
            setTimeout(() => { explArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
            document.getElementById('createNextBtn').disabled = false; document.getElementById('createNextBtn').style.opacity = '1'; document.getElementById('createNextBtn').style.cursor = 'pointer';
        }

        window.renderCreateCurrentCard = function() {
            const card = generatedCards[currentCardIndex];
            const safeQuestion = window.escapeHTML(card.front || card.question || "No question provided");
            const safeAnswer = window.escapeHTML(card.back || card.answer || (card.options && card.correct !== undefined ? (Array.isArray(card.options) ? card.options[card.correct] : Object.values(card.options)[card.correct]) : "") || "No answer provided");
            const progressPercent = ((currentCardIndex + 1) / generatedCards.length) * 100;
            const viewContainer = document.getElementById('interactiveView');

            let html = `
                <div style="display: flex; flex-direction: column; height: 100%; min-height: 100vh; padding: 1.25rem 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.5rem); box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-shrink: 0;">
                    <button onclick="window.goBackToSelection()" style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background: var(--bg-surface); border: 1px solid var(--border-glass); display: flex; align-items: center; justify-content: center; color: var(--text-main); font-size: 0.875rem; cursor: pointer; flex-shrink: 0; transition: 0.2s;" ontouchstart="this.style.transform='scale(0.9)'" ontouchend="this.style.transform=''"><i class="fas fa-arrow-left"></i></button>
                    <h2 style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; flex: 1;">${isMCQMode ? 'Quiz Mode' : 'Flashcards'}</h2>
                    <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-main);">${currentCardIndex + 1} / ${generatedCards.length}</span>
                </div>
                <div style="width: 100%; height: 6px; background: var(--bg-body); border-radius: 100px; overflow: hidden; margin-bottom: 1rem; border: 1px solid var(--border-glass); flex-shrink: 0;"><div style="height: 100%; background: var(--accent-btn); border-radius: 100px; transition: width 0.4s var(--ease-snap); width: ${progressPercent}%;"></div></div>
            `;

            if (isMCQMode) {
                let optionsHTML = '<div style="display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; width: 100%;">';
                if (card.options && typeof card.options === 'object') {
                    for (const [key, value] of Object.entries(card.options)) {
                        optionsHTML += `<button class="create-mcq-option" data-key="${window.escapeHTML(key)}" data-value="${window.escapeHTML(value)}" style="width: 100%; text-align: left; padding: 0.75rem 0.875rem; border-radius: var(--radius-md); background: var(--bg-body); border: 1px solid var(--border-glass); display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; color: var(--text-main);"><span style="font-weight: 600; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-glass); width: 1.625rem; height: 1.625rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 0.75rem; flex-shrink: 0; margin-top: 0.125rem;">${window.escapeHTML(key)}</span><span style="flex: 1; font-size: 0.875rem; line-height: 1.4; padding-top: 0.125rem; font-weight: 500;">${window.escapeHTML(value)}</span></button>`;
                    }
                }
                optionsHTML += '</div>';

                html += `<div style="flex: 1; background: var(--bg-surface); border-radius: var(--radius-card); padding: 1rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; min-height: 0; overflow: hidden; position: relative;"><div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 0; padding-right: 0.25rem;" class="hide-scroll"><h3 style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem; line-height: 1.5; margin-bottom: 0.875rem; flex-shrink: 0;">${safeQuestion}</h3>${optionsHTML}<div id="createExplanationArea" style="display: none; flex-direction: column; flex-shrink: 0; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-glass);"></div></div></div>`;
            } else {
                html += `
                    <div id="flashcardElement" style="flex: 1; position: relative; perspective: 1000px; cursor: pointer; min-height: 0; width: 100%;">
                        <div id="flipInner" style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s var(--ease-snap); border-radius: var(--radius-card);">
                            <div style="position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: var(--radius-card); padding: 1.5rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow-y: auto; background: var(--bg-surface); z-index: 2; transform: rotateY(0deg);">
                                <span style="position: absolute; top: 1.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Question</span>
                                <h3 style="font-weight: 600; font-size: 1.125rem; line-height: 1.5; margin-top: 1rem; color: var(--text-main);">${safeQuestion}</h3>
                                <p style="position: absolute; bottom: 1.25rem; font-size: 0.8125rem; font-weight: 500; display: flex; align-items: center; gap: 0.375rem; color: var(--text-muted);"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                            <div style="position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: var(--radius-card); padding: 1.5rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow-y: auto; background: var(--accent-btn); transform: rotateY(180deg); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); z-index: 1;">
                                <span style="position: absolute; top: 1.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--btn-text); opacity: 0.7;">Answer</span>
                                <p style="font-weight: 600; font-size: 1.125rem; line-height: 1.5; margin-top: 1rem; color: var(--btn-text);">${safeAnswer}</p>
                                <p style="position: absolute; bottom: 1.25rem; font-size: 0.8125rem; font-weight: 500; display: flex; align-items: center; gap: 0.375rem; color: var(--btn-text); opacity: 0.8;"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                        </div>
                    </div>`;
            }

            html += `
                <div style="display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1rem; flex-shrink: 0;">
                    <button id="createPrevBtn" style="flex: 1; padding: 1rem; border-radius: var(--radius-btn); font-size: 0.9375rem; font-weight: 700; cursor: ${currentCardIndex === 0 ? 'not-allowed' : 'pointer'}; border: 1px solid var(--border-glass); background: var(--bg-surface); color: var(--text-main); opacity: ${currentCardIndex === 0 ? '0.4' : '1'};" ${currentCardIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <button id="createNextBtn" style="flex: 1; padding: 1rem; border-radius: var(--radius-btn); font-size: 0.9375rem; font-weight: 700; cursor: ${(isMCQMode && !card.answered) ? 'not-allowed' : 'pointer'}; border: none; background: var(--accent-btn); color: var(--btn-text); opacity: ${(isMCQMode && !card.answered) ? '0.4' : '1'};" ${(isMCQMode && !card.answered) ? 'disabled' : ''}>${currentCardIndex === generatedCards.length - 1 ? 'Finish' : 'Next'}</button>
                </div>
                </div>
            `;
            viewContainer.innerHTML = html;

            if (isMCQMode) {
                const buttons = viewContainer.querySelectorAll('.create-mcq-option');
                buttons.forEach(btn => btn.addEventListener('click', () => window.handleCreateMCQSelection(btn, card, buttons)));
            } else {
                const fc = document.getElementById('flashcardElement');
                fc.addEventListener('click', () => { const inner = document.getElementById('flipInner'); inner.style.transform = inner.style.transform.includes('180deg') ? 'rotateY(0deg)' : 'rotateY(180deg)'; });
            }
            document.getElementById('createPrevBtn').addEventListener('click', () => { if (currentCardIndex > 0) { currentCardIndex--; window.renderCreateCurrentCard(); } });
            document.getElementById('createNextBtn').addEventListener('click', () => { if (currentCardIndex < generatedCards.length - 1) { currentCardIndex++; window.renderCreateCurrentCard(); } else { window.showCreateResults(); } });
        }

        window.showCreateResults = function() {
            const percentage = generatedCards.length > 0 ? Math.round((sessionScore / generatedCards.length) * 100) : 100;
            const viewContainer = document.getElementById('interactiveView');
            let html = '';

            if (isMCQMode) {
                window.finalEarnedXP = sessionScore * 10;
                let earnedStars = 1; if (percentage >= 80) earnedStars = 3; else if (percentage >= 50) earnedStars = 2;
                html = `
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="display: flex; gap: 0.5rem; font-size: 3.5rem; margin-bottom: 1rem;">
                            <i class="fas fa-star" style="color: ${earnedStars >= 1 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                            <i class="fas fa-star" style="transform: translateY(-10px); color: ${earnedStars >= 2 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                            <i class="fas fa-star" style="color: ${earnedStars >= 3 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                        </div>
                        <h2 style="color: var(--accent-yellow); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Quiz Complete!</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center; margin-bottom: 2.5rem;">
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                            </div>
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">AMAZING</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bullseye" style="color: var(--accent-green);"></i> <span id="animatedAcc">0</span>%</div>
                            </div>
                        </div>
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 0.75rem;">CLAIM XP</button>
                        <button onclick="window.exitQuizMode(); document.getElementById('interactiveView').style.display='none'; window.openCreateView('Multiple Choice');" style="width: 100%; max-width: 320px; background: transparent; color: var(--text-muted); font-size: 0.9375rem; font-weight: 700; padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-glass); margin-bottom: 2rem;">Generate Another MCQ</button>
                    </div>`;
            } else {
                window.finalEarnedXP = generatedCards.length * 5;
                html = `
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 4px solid var(--accent-green); color: var(--accent-green); font-size: 3.5rem;"><i class="fas fa-check"></i></div>
                        <h2 style="color: var(--accent-green); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Review Complete!</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center; margin-bottom: 2.5rem;">
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                            </div>
                        </div>
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 0.75rem;">CLAIM XP</button>
                        <button onclick="window.exitQuizMode(); document.getElementById('interactiveView').style.display='none'; window.openCreateView('Flashcards');" style="width: 100%; max-width: 320px; background: transparent; color: var(--text-muted); font-size: 0.9375rem; font-weight: 700; padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-glass); margin-bottom: 2rem;">Generate Another Flashcards</button>
                    </div>`;
            }
            viewContainer.innerHTML = html;
            window.animateValue("animatedXP", 0, window.finalEarnedXP, 1500);
            if (isMCQMode) window.animateValue("animatedAcc", 0, percentage, 1500);
        };
        
        window.claimAndContinue = async function() {
            const btn = document.querySelector('.btn-claim-xp');
            btn.textContent = "CLAIMING..."; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7';
            try { await window.addXP(window.finalEarnedXP); } catch(e) {}
            window.commitStreakOnAction?.();
            window.goBackToSelection();
            window.updateHomeContinueCard();
        };

        window.animateValue = function(id, start, end, duration) {
            if (start === end) { document.getElementById(id).textContent = end; return; }
            let current = start; let increment = end > start ? 1 : -1;
            let stepTime = Math.abs(Math.floor(duration / Math.max(end - start, 1)));
            if (stepTime < 10) { stepTime = 10; increment = Math.ceil((end - start) / (duration / stepTime)); }
            let obj = document.getElementById(id);
            let timer = setInterval(function() {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) { current = end; clearInterval(timer); }
                obj.textContent = current;
            }, stepTime);
        }

/* ── payment.js ── */
// Payment View
// ---- PAYMENT PAGE LOGIC ----
        // Defined at top level — NOT inside an IIFE — so a crash elsewhere can't prevent registration
        var _payCurrentPlan = 'monthly';
        var _payCdInterval = null;

        function _payGetCountdownEnd() {
            var end = sessionStorage.getItem('payCountdownEnd');
            if (!end) { end = Date.now() + (23 * 3600000 + 59 * 60000 + 59000); sessionStorage.setItem('payCountdownEnd', end); }
            return parseInt(end);
        }

        function _payTick() {
            try {
                var diff = Math.max(0, _payGetCountdownEnd() - Date.now());
                var h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
                var pad = function(n) { return String(n).padStart(2, '0'); };
                var hEl = document.getElementById('payH'), mEl = document.getElementById('payM'), sEl = document.getElementById('payS');
                if (hEl) hEl.textContent = pad(h);
                if (mEl) mEl.textContent = pad(m);
                if (sEl) sEl.textContent = pad(s);
            } catch(e) {}
        }

        // ── GEO PRICING ─────────────────────────────────────────────────────
        const GEO_PRICES = {
            NG: { currency: 'NGN', symbol: '₦',   monthly: 1999,  yearly: 14999, monthlyKobo: 199900,  yearlyKobo: 1499900, origYearly: 23988, savePct: '37%', perMo: '₦1,249/mo'  },
            GH: { currency: 'GHS', symbol: 'GH₵', monthly: 25,    yearly: 180,   monthlyKobo: 2500,    yearlyKobo: 18000,   origYearly: 300,   savePct: '40%', perMo: 'GH₵15/mo'   },
            KE: { currency: 'KES', symbol: 'KSh', monthly: 250,   yearly: 1800,  monthlyKobo: 25000,   yearlyKobo: 180000,  origYearly: 3000,  savePct: '40%', perMo: 'KSh150/mo'  },
            ZA: { currency: 'ZAR', symbol: 'R',   monthly: 35,    yearly: 260,   monthlyKobo: 3500,    yearlyKobo: 26000,   origYearly: 420,   savePct: '38%', perMo: 'R21.67/mo'  },
            US: { currency: 'USD', symbol: '$',   monthly: 2.5,   yearly: 18,    monthlyKobo: 250,     yearlyKobo: 1800,    origYearly: 30,    savePct: '40%', perMo: '$1.50/mo'   },
            GB: { currency: 'GBP', symbol: '£',   monthly: 2,     yearly: 14,    monthlyKobo: 200,     yearlyKobo: 1400,    origYearly: 24,    savePct: '42%', perMo: '£1.17/mo'   },
        };
        const DEFAULT_GEO = GEO_PRICES.NG;
        window._geoPrice = DEFAULT_GEO;

        window.loadGeoPricing = async function() {
            try {
                const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
                const json = await res.json();
                const cc   = (json.country_code || 'NG').toUpperCase();
                window._geoPrice = GEO_PRICES[cc] || GEO_PRICES.US;
            } catch(e) {
                window._geoPrice = DEFAULT_GEO;
            }
            window.applyGeoPricing();

            // Show first month promo only for free users who have never subscribed
            const userData = window._cachedUserData || {};
            const isAlreadyPremium = window.userPlan === 'premium' || window.userPlan === 'elite';
            const neverSubscribed = !userData.planRef && !userData.subscriptionExpiry;
            const banner = document.getElementById('pFirstMonthBanner');
            if (banner) {
                if (!isAlreadyPremium && neverSubscribed) {
                    banner.style.display = 'block';
                    window.switchPayPlan('trial');
                } else {
                    banner.style.display = 'none';
                    window.switchPayPlan('monthly');
                }
            }
        };

        window.applyGeoPricing = function() {
            const p = window._geoPrice || DEFAULT_GEO;
            const mFmt = `${p.symbol}${p.monthly.toLocaleString()}`;
            const yFmt = `${p.symbol}${p.yearly.toLocaleString()}`;
            const tAmt = p.currency === 'NGN' ? 250 : Math.round(p.monthly * 0.13);
            const tFmt = `${p.symbol}${tAmt.toLocaleString()}`;
            const eAmt = p.currency === 'NGN' ? 4999 : Math.round(p.monthly * 2.5);
            const eFmt = `${p.symbol}${eAmt.toLocaleString()}`;
            const eOrig = `${p.symbol}${(p.monthly * 3).toLocaleString()}`;

            const mPrice  = document.getElementById('pMonthlyPrice');
            const yPrice  = document.getElementById('pYearlyPrice');
            const yOrig   = document.getElementById('pYearlyOrig');
            const ySub    = document.getElementById('pYearlySub');
            const ePrice  = document.getElementById('pExamPrice');
            const eOrigEl = document.getElementById('pExamOrig');
            const eSub    = document.getElementById('pExamSub');
            const cta     = document.getElementById('payCTABtn');
            const tThen   = document.getElementById('pTrialThen');
            const tPrice  = document.getElementById('pTrialPrice');

            if (mPrice)  mPrice.textContent  = mFmt;
            if (yPrice)  yPrice.textContent  = yFmt;
            if (yOrig)   yOrig.textContent   = `${p.symbol}${p.origYearly.toLocaleString()}`;
            if (ySub)    ySub.textContent    = `${p.perMo} · save ${p.savePct}`;
            if (ePrice)  ePrice.textContent  = eFmt;
            if (eOrigEl) eOrigEl.textContent = eOrig;
            if (tThen)   tThen.textContent   = mFmt;
            if (tPrice)  tPrice.textContent  = tFmt;

            if (cta && !cta.disabled) {
                const plan = _payCurrentPlan || 'yearly';
                if (plan === 'trial')        cta.textContent = `Try Premium — ${tFmt} first month`;
                else if (plan === 'monthly') cta.textContent = `Subscribe Monthly — ${mFmt}`;
                else if (plan === 'exam')    cta.textContent = `Get Exam Season — ${eFmt}`;
                else                         cta.textContent = `Get Premium — ${yFmt}/yr`;
            }
        };

        window.switchPayPlan = function(plan) {
            try {
                _payCurrentPlan = plan;
                const p   = window._geoPrice || DEFAULT_GEO;
                const sym = p.symbol;
                const mFmt = sym + p.monthly.toLocaleString();
                const yFmt = sym + p.yearly.toLocaleString();
                const eAmt = p.currency === 'NGN' ? 4999 : Math.round(p.monthly * 2.5);
                const eFmt = sym + eAmt.toLocaleString();
                const tAmt = p.currency === 'NGN' ? 250 : Math.round(p.monthly * 0.13);
                const tFmt = sym + tAmt.toLocaleString();

                // Reset all three cards to idle
                ['Monthly','Yearly','Exam'].forEach(function(n) {
                    var card = document.getElementById('pCard' + n);
                    var check= document.getElementById('pCheck' + n);
                    if (!card) return;
                    if (n === 'Yearly') {
                        card.style.borderColor = 'var(--border-color)';
                        card.style.background  = 'var(--bg-surface)';
                        if (check) { check.style.background='transparent'; check.style.borderColor='var(--border-color)'; check.innerHTML=''; }
                    } else {
                        card.style.borderColor = 'var(--border-color)';
                        if (check) { check.style.background='transparent'; check.style.border='2px solid var(--border-color)'; check.innerHTML=''; }
                    }
                });

                // Trial banner
                var cT  = document.getElementById('pFirstMonthBanner');
                var ckT = document.getElementById('pCheckTrial');
                if (cT)  cT.style.opacity = plan === 'trial' ? '1' : '0.65';
                if (ckT) {
                    if (plan === 'trial') { ckT.style.background='#f97316'; if(ckT.firstElementChild) ckT.firstElementChild.style.background='white'; }
                    else { ckT.style.background='white'; if(ckT.firstElementChild) ckT.firstElementChild.style.background='#f97316'; }
                }

                function activateCard(name) {
                    var card  = document.getElementById('pCard' + name);
                    var check = document.getElementById('pCheck' + name);
                    if (!card) return;
                    card.style.borderColor = 'var(--accent-btn)';
                    if (name === 'Yearly') card.style.background = 'rgba(139,92,246,.08)';
                    if (check) {
                        check.style.background  = 'var(--accent-btn)';
                        check.style.border      = 'none';
                        check.innerHTML = '<i class="fas fa-check" style="color:white;font-size:.5rem;"></i>';
                    }
                }

                var ctaEl = document.getElementById('payCTABtn');

                if (plan === 'trial') {
                    if (ctaEl) ctaEl.textContent = 'Try Premium — ' + tFmt + ' first month';
                } else if (plan === 'monthly') {
                    activateCard('Monthly');
                    if (ctaEl) ctaEl.textContent = 'Subscribe Monthly — ' + mFmt;
                } else if (plan === 'exam') {
                    activateCard('Exam');
                    if (ctaEl) ctaEl.textContent = 'Get Exam Season — ' + eFmt;
                } else {
                    activateCard('Yearly');
                    if (ctaEl) ctaEl.textContent = 'Get Premium — ' + yFmt + '/yr';
                }
            } catch(e) { console.warn('switchPayPlan error:', e); }
        };

        window.handlePayCTA = function() {
            try {
                if (_payCurrentPlan === 'trial')   window.startPayment('premium_trial');
                else if (_payCurrentPlan === 'exam')    window.startPayment('premium_exam');
                else if (_payCurrentPlan === 'monthly') window.startPayment('premium');
                else window.startPayment('premium_yearly');
            } catch(e) { console.warn('handlePayCTA error:', e); }
        };

        // --- PAYMENT UI LOGIC ---

        // Shared verify helper — used by inline popup onSuccess AND fallback iframe path
        window._activatePremium = async function(ref) {
            var btn = document.getElementById('payCTABtn');
            var iBtn = document.getElementById('iframeVerifyBtn');
            if (btn)  { btn.textContent = "Verifying payment…"; btn.disabled = true; }
            if (iBtn) { iBtn.textContent = "Verifying…"; iBtn.disabled = true; }
            try {
                const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js");
                const fns    = getFunctions(window.auth?.app, "us-central1");
                const verify = httpsCallable(fns, "verifySubscriptionPayment");
                const result = await verify({ reference: ref });
                if (result.data?.success) {
                    // Clear stored pending payment
                    try { localStorage.removeItem('medx_pending_ref'); localStorage.removeItem('medx_pending_plan'); } catch(_){}
                    window._pendingPayRef  = null;
                    window._pendingPayPlan = null;

                    const newPlan = result.data.plan;
                    window.userPlan = newPlan;
                    if (typeof window.updatePlanIcon === 'function') window.updatePlanIcon(newPlan);
                    if (typeof window.applyAvatar    === 'function') window.applyAvatar();
                    window.allowedMaxItems = (newPlan === 'premium' || newPlan === 'premium_trial' || newPlan === 'elite') ? 50 : 20;
                    const maxText = document.getElementById('maxLimitText');
                    if (maxText) maxText.textContent = `(Max: ${window.allowedMaxItems})`;

                    if (btn)  { btn.textContent = "✓ You're Premium!"; btn.style.background = "#10b981"; btn.style.color = "#fff"; btn.disabled = false; }
                    if (iBtn) { iBtn.textContent = "✓ Activated!"; iBtn.style.background = "#10b981"; iBtn.disabled = false; }

                    window.closePaymentModal();

                    if (typeof window.showCelebrationModal === 'function') {
                        setTimeout(() => window.showCelebrationModal({
                            typeLabel: '💎 Premium Activated!',
                            title: 'Welcome to Premium',
                            desc: '50 questions per deck · 30 generations/day · Gold ring · All ranks unlocked',
                            glow: '#fbbf24',
                            particleColors: ['#fbbf24','#f97316','#fff','#facc15'],
                            badgeHTML: '<div style="font-size:3.5rem;">💎</div>'
                        }), 300);
                    }
                    setTimeout(() => navigateTo('view-home'), 2500);
                } else {
                    throw new Error(result.data?.message || 'Verification failed');
                }
            } catch(e) {
                console.error("Payment verification error:", e);
                if (btn)  { btn.textContent = "Verify failed — contact support"; btn.disabled = false; }
                if (iBtn) { iBtn.textContent = "✓ I've paid — Activate"; iBtn.disabled = false; }
            }
        };

        // Verify whatever pending ref is stored (called by "I've paid" button in iframe modal)
        window.verifyPendingPayment = async function() {
            const ref = window._pendingPayRef || localStorage.getItem('medx_pending_ref');
            if (!ref) { alert("No pending payment found. If you were charged, use the recovery option on the payment page."); return; }
            await window._activatePremium(ref);
        };

        window.openPaymentModal = function(url) {
            const modal = document.getElementById('paymentModalOverlay');
            const sheet = document.getElementById('paymentSheet');
            const iframe = document.getElementById('paystackIframe');
            const iBtn  = document.getElementById('iframeVerifyBtn');
            iframe.src = url;
            modal.style.display = 'flex';
            // Show "I've paid" button after 8 s — user has had time to complete payment
            if (iBtn) {
                iBtn.style.display = 'none';
                iBtn.textContent = "✓ I've paid — Activate";
                iBtn.disabled = false;
                setTimeout(() => { iBtn.style.display = 'inline-block'; }, 8000);
            }
            setTimeout(() => { modal.style.opacity = '1'; sheet.style.transform = 'translateY(0)'; }, 10);
        };

        window.closePaymentModal = function() {
            const modal = document.getElementById('paymentModalOverlay');
            const sheet = document.getElementById('paymentSheet');
            const iframe = document.getElementById('paystackIframe');
            modal.style.opacity = '0';
            sheet.style.transform = 'translateY(100%)';
            setTimeout(() => { modal.style.display = 'none'; iframe.src = ''; }, 300);
        };

        // Listen for Paystack postMessage from the shop iframe (fires on successful payment)
        window.addEventListener('message', function(e) {
            try {
                if (!e.origin.includes('paystack')) return;
                var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (d && (d.event === 'success' || d.status === 'success') && window._pendingPayRef) {
                    window._activatePremium(window._pendingPayRef);
                }
            } catch(_) {}
        });

        window.startPayment = function(plan) {
            if (!window.currentUser) { window.showLoginModal(); return; }
            if (plan === "free") { navigateTo("view-home"); return; }

            var displayName = window.currentUser.displayName || window.currentUser.email.split("@")[0] || "";
            var nameParts = displayName.trim().split(" ");
            var firstName = nameParts[0] || "User";
            var lastName  = nameParts.slice(1).join(" ") || ".";
            var email     = window.currentUser.email || "";

            const p = window._geoPrice || DEFAULT_GEO;

            // ── Always charge in NGN (Paystack account currency) ─────────────
            // Non-NGN prices are converted to NGN at a fixed rate so foreign
            // cards still work — the user's bank handles the final FX conversion.
            // Sending any other currency causes "Currency not supported" errors.
            const NGN_RATES = { NGN:1, USD:1600, GBP:2050, GHS:110, KES:12, ZAR:85 };
            const rate = NGN_RATES[p.currency] || 1600;

            function toNGNKobo(kobo) {
                if (p.currency === 'NGN') return kobo;
                // kobo here is in the foreign currency's smallest unit (e.g. cents)
                // convert: kobo/100 = display amount in foreign currency
                // × rate = NGN amount, × 100 = NGN kobo
                return Math.round((kobo / 100) * rate * 100);
            }

            const trialAmt = toNGNKobo(p.currency === 'NGN' ? 25000 : Math.round(p.monthlyKobo * 0.132));
            const examAmt  = toNGNKobo(p.currency === 'NGN' ? 499900 : Math.round(p.monthlyKobo * 2.5));

            var amount   = plan === 'premium_yearly' ? toNGNKobo(p.yearlyKobo)
                         : plan === 'premium_trial'  ? trialAmt
                         : plan === 'premium_exam'   ? examAmt
                         : toNGNKobo(p.monthlyKobo);
            var currency = 'NGN'; // always NGN — Paystack account only supports NGN

            var ref = "medx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

            // ── Store pending payment BEFORE attempting PaystackPop ──
            // If PaystackPop throws or the fallback iframe is used, the ref is still
            // available so we can verify after the user completes payment.
            window._pendingPayRef  = ref;
            window._pendingPayPlan = plan;
            try { localStorage.setItem('medx_pending_ref', ref); localStorage.setItem('medx_pending_plan', plan); } catch(_) {}

            try {
                if (typeof PaystackPop === 'undefined') throw new Error('PaystackPop not loaded');
                var handler = PaystackPop.setup({
                    key:        "pk_live_8d46f32e2edd6f6605c6c0e513e77baabb856dda",
                    email:      email,
                    first_name: firstName,
                    last_name:  lastName,
                    amount:     amount,
                    currency:   currency,
                    ref:        ref,
                    channels:   ['card'],
                    metadata:   { uid: window.currentUser.uid || "", plan: plan },
                    onSuccess: async function(transaction) {
                        await window._activatePremium(transaction.reference);
                    },
                    onCancel: function() {
                        // Don't clear pending ref on cancel — user may re-open and complete
                    }
                });
                handler.openIframe();
            } catch(err) {
                console.error("Paystack inline error — using fallback iframe:", err);
                window.openPaymentModal(plan === "elite" ? "https://paystack.shop/pay/lw17s2ggpj" : "https://paystack.shop/pay/5wqjry1l0a");
            }
        };

        // On startup: if a pending ref exists (e.g. app restarted mid-payment), auto-verify
        (function checkPendingOnLoad() {
            try {
                const savedRef = localStorage.getItem('medx_pending_ref');
                if (!savedRef) return;
                // Wait for auth to be ready then attempt silent verification
                var attempts = 0;
                var poll = setInterval(async function() {
                    attempts++;
                    if (attempts > 20) { clearInterval(poll); return; } // give up after 10 s
                    if (!window.currentUser || !window.auth) return;
                    clearInterval(poll);
                    console.log('[MedXcel] Found unverified pending payment, attempting recovery:', savedRef);
                    try {
                        const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js");
                        const fns    = getFunctions(window.auth?.app, "us-central1");
                        const verify = httpsCallable(fns, "verifySubscriptionPayment");
                        const result = await verify({ reference: savedRef });
                        if (result.data?.success) {
                            localStorage.removeItem('medx_pending_ref');
                            localStorage.removeItem('medx_pending_plan');
                            const newPlan = result.data.plan;
                            window.userPlan = newPlan;
                            if (typeof window.updatePlanIcon === 'function') window.updatePlanIcon(newPlan);
                            if (typeof window.applyAvatar    === 'function') window.applyAvatar();
                            console.log('[MedXcel] Auto-recovery succeeded — plan:', newPlan);
                        } else {
                            // Not successful — payment may not have completed, clear after 24 h to avoid stale refs
                            const saved = parseInt(savedRef.split('_')[1] || '0', 10);
                            if (Date.now() - saved > 86400000) { localStorage.removeItem('medx_pending_ref'); localStorage.removeItem('medx_pending_plan'); }
                        }
                    } catch(e) { console.warn('[MedXcel] Auto-recovery check failed silently:', e); }
                }, 500);
            } catch(_) {}
        })();

/* ── push.js ── */
/**
         * initPush(userId)
         * ─────────────────────────────────────────────────────────────────
         * Initialises FCM via the Capacitor native bridge.
         * Called automatically from onAuthStateChanged once the user is
         * confirmed logged-in, so userId is always valid.
         *
         * Flow:
         *   1. Guard — native Capacitor device only
         *   2. Attach 'registration' + 'registrationError' listeners FIRST
         *      (must precede register() — cached tokens fire instantly on Android)
         *   3. Request OS permission
         *   4. Call register() → native FCM token arrives via 'registration' event
         *   5. Save full token to backend (POST /saveToken) + write directly to
         *      Firestore users/{uid}.tokens[] as a belt-and-suspenders backup
         */
        window.initPush = async function (userId) {
            // ── Guard ──────────────────────────────────────────────────────
            if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                console.log("[Push] Not a native platform — skipping.");
                return;
            }

            const { PushNotifications } = window.Capacitor.Plugins;
            if (!PushNotifications) {
                console.error("[Push] Plugin missing — run: npm i @capacitor/push-notifications && npx cap sync");
                return;
            }

            // ── Step 1: attach listeners BEFORE register() ─────────────────
            // On Android, a cached token fires the event almost immediately
            // after register() is called. Adding the listener after register()
            // creates a race condition where the event is missed entirely.
            PushNotifications.addListener("registration", async (token) => {
                // token.value is the raw FCM token string — never truncate it
                const fcmToken = (token.value || "").trim();
                console.log("[Push] ✅ FCM token received:", fcmToken);

                const uid = userId || window.currentUser?.uid || null;
                if (!uid) {
                    console.error("[Push] No userId at token-save time — aborting.");
                    return;
                }

                // ── Save via Cloud Function (primary) ─────────────────────
                try {
                    const res = await fetch(
                        "https://us-central1-medxcel.cloudfunctions.net/saveToken",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token: fcmToken, userId: uid })
                        }
                    );
                    const data = await res.json();
                    console.log("[Push] saveToken response:", res.status, data);
                } catch (err) {
                    console.error("[Push] saveToken fetch failed:", err);
                }

                // ── Write directly to Firestore (backup) ──────────────────
                // Ensures token is stored even if the Cloud Function is cold.
                // arrayUnion deduplicates — safe to call on every app start.
                try {
                    if (window.db) {
                        const { doc, updateDoc, arrayUnion } =
                            await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                        await updateDoc(doc(window.db, "users", uid), {
                            tokens: arrayUnion(fcmToken),
                            fcmUpdatedAt: new Date().toISOString()
                        });
                        console.log("[Push] ✅ Token also written directly to Firestore.");
                    }
                } catch (err) {
                    console.error("[Push] Firestore direct write failed:", err);
                }
            });

            PushNotifications.addListener("registrationError", (err) => {
                console.error("[Push] ❌ Registration error:", JSON.stringify(err));
            });

            // ── Step 2: request OS permission ──────────────────────────────
            const permStatus = await PushNotifications.requestPermissions();
            console.log("[Push] Permission:", permStatus.receive);
            if (permStatus.receive !== "granted") {
                console.warn("[Push] Permission not granted — notifications disabled.");
                return;
            }

            // ── Step 3: register with FCM ───────────────────────────────────
            // This triggers the native FCM registration. Token arrives via the
            // 'registration' listener above (which is already attached).
            await PushNotifications.register();
            console.log("[Push] register() called — awaiting token event...");
        };// Manual Flashcard Creation
// ─────────────────────────────────────────────────────────────────────────────
(function () {

    // ── State ────────────────────────────────────────────────────────────────
    let _cards   = [];    // [{ front: '', back: '' }, ...]
    let _idx     = 0;     // card currently in the editor
    let _saving  = false;
    window._mcTitle   = '';
    window._mcSubject = '';

    // ── Public entry ─────────────────────────────────────────────────────────
    window.openManualCreate = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        _cards   = [{ front: '', back: '' }];
        _idx     = 0;
        _saving  = false;
        window._mcTitle   = '';
        window._mcSubject = '';
        _render();
        _enter();
    };

    // ── Overlay enter / exit ─────────────────────────────────────────────────
    function _enter() {
        document.getElementById('globalBottomNav')?.style.setProperty('transform', 'translateY(100%)');
        const hdr = document.querySelector('#view-create .top-header');
        if (hdr) hdr.style.display = 'none';
        document.getElementById('selectionView').style.display = 'none';
        const mv = document.getElementById('manualCreateView');
        Object.assign(mv.style, {
            display: 'flex', position: 'fixed', inset: '0', zIndex: '300',
            background: 'var(--bg-body)', flexDirection: 'column', overflowY: 'auto',
            opacity: '0', transform: 'translateY(24px)', transition: 'opacity 0.22s ease, transform 0.22s ease',
        });
        requestAnimationFrame(() => { mv.style.opacity = '1'; mv.style.transform = 'translateY(0)'; });
    }

    function _exit() {
        const nav = document.getElementById('globalBottomNav');
        if (nav) nav.style.transform = '';
        const hdr = document.querySelector('#view-create .top-header');
        if (hdr) hdr.style.display = '';
        document.getElementById('manualCreateView').style.display = 'none';
        document.getElementById('selectionView').style.display = 'flex';
    }

    // ── Full render ──────────────────────────────────────────────────────────
    function _render() {
        const mv    = document.getElementById('manualCreateView');
        const card  = _cards[_idx];
        const total = _cards.length;

        const canAdd     = !!(card.front.trim() && card.back.trim());
        const hasSave    = _cards.some(c => c.front.trim() && c.back.trim());
        const onFirst    = _idx === 0;
        const onLast     = _idx === total - 1;

        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;flex-shrink:0;border-bottom:1px solid var(--border-glass);background:var(--bg-body);position:sticky;top:0;z-index:5;">
    <button onclick="window._mcBack()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;flex-shrink:0;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);flex:1;margin:0;">Create Flashcards</h2>
    <span style="font-size:0.7rem;font-weight:700;background:rgba(139,92,246,0.12);color:var(--accent-btn);padding:3px 10px;border-radius:9999px;white-space:nowrap;">
      ${total} card${total !== 1 ? 's' : ''}
    </span>
  </div>

  <!-- ── Scrollable body ───────────────────────────────────────────────── -->
  <div style="flex:1;overflow-y:auto;padding:1.25rem 1.125rem;display:flex;flex-direction:column;gap:1.25rem;padding-bottom:6rem;">

    <!-- Deck info (only on card 0) -->
    ${onFirst ? `
    <div style="display:flex;flex-direction:column;gap:0.625rem;">
      <input id="mcTitleInput" type="text" placeholder="Deck title" maxlength="60"
        value="${_esc(window._mcTitle)}"
        oninput="window._mcTitle=this.value"
        style="width:100%;padding:0.875rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;font-weight:600;box-sizing:border-box;outline:none;-webkit-appearance:none;">
      <input id="mcSubjectInput" type="text" placeholder="Subject  (e.g. Pharmacology)" maxlength="40"
        value="${_esc(window._mcSubject)}"
        oninput="window._mcSubject=this.value"
        style="width:100%;padding:0.75rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.875rem;box-sizing:border-box;outline:none;-webkit-appearance:none;">
    </div>
    <div style="height:1px;background:var(--border-glass);"></div>
    ` : ''}

    <!-- Card nav row -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;">
        Card ${_idx + 1} of ${total}
      </span>
      <div style="display:flex;gap:0.375rem;">
        <button onclick="window._mcNav(-1)" ${onFirst ? 'disabled' : ''}
          style="width:2rem;height:2rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);color:var(--text-main);display:flex;align-items:center;justify-content:center;font-size:0.7rem;cursor:${onFirst ? 'default' : 'pointer'};opacity:${onFirst ? '0.35' : '1'};">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button onclick="window._mcNav(1)" ${onLast ? 'disabled' : ''}
          style="width:2rem;height:2rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);color:var(--text-main);display:flex;align-items:center;justify-content:center;font-size:0.7rem;cursor:${onLast ? 'default' : 'pointer'};opacity:${onLast ? '0.35' : '1'};">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Front -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Front</label>
      <textarea id="mcFrontInput"
        placeholder="Question or term..."
        oninput="window._mcLive('front',this.value)"
        style="width:100%;min-height:5.5rem;padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;line-height:1.55;resize:none;box-sizing:border-box;outline:none;font-family:inherit;-webkit-appearance:none;">${_esc(card.front)}</textarea>
    </div>

    <!-- Back -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Back</label>
      <textarea id="mcBackInput"
        placeholder="Answer or definition..."
        oninput="window._mcLive('back',this.value)"
        style="width:100%;min-height:5.5rem;padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;line-height:1.55;resize:none;box-sizing:border-box;outline:none;font-family:inherit;-webkit-appearance:none;">${_esc(card.back)}</textarea>
    </div>

    <!-- Delete card -->
    ${total > 1 ? `
    <button onclick="window._mcDelete()"
      style="align-self:flex-start;padding:0.375rem 0.875rem;border-radius:9999px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.07);color:#f87171;font-size:0.75rem;font-weight:600;cursor:pointer;">
      <i class="fas fa-trash" style="margin-right:0.375rem;font-size:0.6875rem;"></i>Remove card
    </button>
    ` : ''}

    <!-- Progress dots (max 8 shown) -->
    ${total > 1 ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:0.375rem;flex-wrap:wrap;">
      ${Array.from({ length: Math.min(total, 8) }, (_, i) => {
          const dotIdx = total <= 8 ? i : Math.round(i * (total - 1) / 7);
          const active = total <= 8 ? (i === _idx) : (dotIdx === _idx || (i === 7 && _idx >= dotIdx));
          return `<div style="width:${active ? '20px' : '6px'};height:6px;border-radius:9999px;background:${active ? 'var(--accent-btn)' : 'var(--border-glass)'};transition:width 0.2s ease;"></div>`;
      }).join('')}
      ${total > 8 ? `<span style="font-size:0.65rem;color:var(--text-muted);margin-left:2px;">+${total - 8}</span>` : ''}
    </div>
    ` : ''}


    <!-- Import from another app — compact row at bottom -->
    <div style="display:flex;align-items:center;gap:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border-glass);">
      <span style="font-size:0.7rem;color:var(--text-muted);flex-shrink:0;">Import from Anki:</span>
      <button data-import="anki" id="mcImportAnkiBtn"
        style="display:flex;align-items:center;gap:0.375rem;padding:0.375rem 0.75rem;border-radius:9999px;border:1px solid var(--border-glass);background:var(--bg-surface);cursor:pointer;flex:1;justify-content:center;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:#3c3c3c;flex-shrink:0;"><i class="fas fa-star" style="font-size:8px;color:#5bb0e8;"></i></span>
        <span style="font-size:0.75rem;font-weight:600;color:var(--text-main);">Anki</span>
      </button>
    </div>

  </div><!-- end body -->

  <!-- ── Footer ──────────────────────────────────────────────────────────── -->
  <div style="position:fixed;bottom:0;left:0;right:0;padding:0.875rem 1.125rem calc(env(safe-area-inset-bottom,0px) + 0.875rem);background:var(--bg-body);border-top:1px solid var(--border-glass);display:flex;gap:0.75rem;z-index:10;">

    <!-- Add card -->
    <button id="mcAddBtn" onclick="window._mcAdd()" ${!canAdd ? 'disabled' : ''}
      style="flex:1;padding:0.875rem;border-radius:var(--radius-btn);border:1.5px solid ${canAdd ? 'var(--accent-btn)' : 'var(--border-glass)'};background:transparent;color:${canAdd ? 'var(--accent-btn)' : 'var(--text-muted)'};font-size:0.9375rem;font-weight:700;cursor:${canAdd ? 'pointer' : 'not-allowed'};opacity:${canAdd ? '1' : '0.45'};transition:all 0.2s;">
      <i class="fas fa-plus" style="margin-right:0.375rem;font-size:0.875rem;"></i>Add card
    </button>

    <!-- Save deck -->
    <button id="mcSaveBtn" onclick="window._mcSave()" ${!hasSave ? 'disabled' : ''}
      style="flex:1;padding:0.875rem;border-radius:var(--radius-btn);border:none;background:${hasSave ? 'var(--accent-btn)' : 'var(--bg-surface)'};color:${hasSave ? 'var(--btn-text)' : 'var(--text-muted)'};font-size:0.9375rem;font-weight:700;cursor:${hasSave ? 'pointer' : 'not-allowed'};opacity:${hasSave ? '1' : '0.45'};transition:all 0.2s;">
      Save deck
    </button>
  </div>

</div>`;
    // Wire import buttons — must happen after innerHTML is set
    (function(){
        var ab=document.getElementById('mcImportAnkiBtn');
        if(ab) ab.onclick=function(){window._mcImport('anki');};
    })();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

    // Save textarea values before any action that re-renders
    function _flush() {
        const f = document.getElementById('mcFrontInput');
        const b = document.getElementById('mcBackInput');
        if (f) _cards[_idx].front = f.value;
        if (b) _cards[_idx].back  = b.value;
        const t = document.getElementById('mcTitleInput');
        const s = document.getElementById('mcSubjectInput');
        if (t) window._mcTitle   = t.value;
        if (s) window._mcSubject = s.value;
    }

    // ── Live updates (typing — no re-render) ─────────────────────────────────
    window._mcLive = function (field, value) {
        _cards[_idx][field] = value;
        const canAdd  = !!(  _cards[_idx].front.trim() && _cards[_idx].back.trim());
        const hasSave = _cards.some(c => c.front.trim() && c.back.trim());

        const addBtn  = document.getElementById('mcAddBtn');
        const saveBtn = document.getElementById('mcSaveBtn');
        if (addBtn) {
            addBtn.disabled          = !canAdd;
            addBtn.style.opacity     = canAdd ? '1' : '0.45';
            addBtn.style.color       = canAdd ? 'var(--accent-btn)' : 'var(--text-muted)';
            addBtn.style.borderColor = canAdd ? 'var(--accent-btn)' : 'var(--border-glass)';
            addBtn.style.cursor      = canAdd ? 'pointer' : 'not-allowed';
        }
        if (saveBtn) {
            saveBtn.disabled        = !hasSave;
            saveBtn.style.opacity   = hasSave ? '1' : '0.45';
            saveBtn.style.background = hasSave ? 'var(--accent-btn)' : 'var(--bg-surface)';
            saveBtn.style.color      = hasSave ? 'var(--btn-text)' : 'var(--text-muted)';
            saveBtn.style.cursor     = hasSave ? 'pointer' : 'not-allowed';
        }
    };

    // ── Navigation ───────────────────────────────────────────────────────────
    window._mcNav = function (dir) {
        _flush();
        const next = _idx + dir;
        if (next < 0 || next >= _cards.length) return;
        _idx = next;
        _render();
    };

    // ── Add card ─────────────────────────────────────────────────────────────
    window._mcAdd = function () {
        _flush();
        const card = _cards[_idx];
        if (!card.front.trim() || !card.back.trim()) return;

        // If on a middle card, just advance to next
        if (_idx < _cards.length - 1) {
            _idx++;
            _render();
            return;
        }
        // Append new blank card
        _cards.push({ front: '', back: '' });
        _idx = _cards.length - 1;
        _render();
        setTimeout(() => document.getElementById('mcFrontInput')?.focus(), 60);
    };

    // ── Delete card ──────────────────────────────────────────────────────────
    window._mcDelete = function () {
        _flush();
        if (_cards.length <= 1) return;
        _cards.splice(_idx, 1);
        _idx = Math.max(0, Math.min(_idx, _cards.length - 1));
        _render();
    };

    // ── Back / exit ──────────────────────────────────────────────────────────
    window._mcBack = function () {
        _flush();
        const hasContent = _cards.some(c => c.front.trim() || c.back.trim());
        if (!hasContent) { _exit(); return; }

        // Bottom-sheet confirm instead of browser confirm()
        _showDiscardSheet();
    };

    function _showDiscardSheet() {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
        backdrop.innerHTML = `
<div style="width:100%;background:var(--bg-surface);border-radius:1.25rem 1.25rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);display:flex;flex-direction:column;gap:0.75rem;">
  <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 0.25rem;">Discard deck?</p>
  <p style="font-size:0.875rem;color:var(--text-muted);margin:0 0 0.25rem;line-height:1.5;">Your cards won't be saved.</p>
  <button id="_discardYes" style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:#ef4444;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;">Discard</button>
  <button id="_discardNo"  style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:1px solid var(--border-glass);background:transparent;color:var(--text-main);font-size:1rem;font-weight:600;cursor:pointer;">Keep editing</button>
</div>`;
        document.body.appendChild(backdrop);
        backdrop.querySelector('#_discardYes').onclick = () => { backdrop.remove(); _exit(); };
        backdrop.querySelector('#_discardNo').onclick  = () => backdrop.remove();
        backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    }

    // ── Save deck ────────────────────────────────────────────────────────────
    window._mcSave = async function () {
        if (_saving) return;
        _flush();

        const valid = _cards.filter(c => c.front.trim() && c.back.trim());
        if (!valid.length) return;

        const title   = (window._mcTitle   || '').trim() || 'My Flashcards';
        const subject = (window._mcSubject || '').trim() || 'General';

        _saving = true;
        const btn = document.getElementById('mcSaveBtn');
        if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; btn.style.opacity = '0.65'; }

        const newQuiz = {
            id:       Date.now(),
            title,
            subject,
            favorite: false,
            source:   'manual',
            type:     'Flashcards',
            stats:    { bestScore: 0, attempts: 0, lastScore: 0 },
            questions: valid.map(c => ({
                text:        c.front.trim(),
                options:     [c.back.trim()],
                correct:     0,
                explanation: ''
            }))
        };

        // Firestore
        try {
            if (window.currentUser && window.db) {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                await setDoc(doc(window.db, 'users', window.currentUser.uid, 'quizzes', String(newQuiz.id)), newQuiz);
            }
        } catch (e) { console.warn('[ManualCreate] Firestore save error:', e); }

        // localStorage + in-memory
        const uid   = window.currentUser?.uid || 'guest';
        const store = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid) || '[]');
        store.push(newQuiz);
        localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(store));
        window.quizzes = store;

        // XP (5 per card)
        try { await window.addXP(valid.length * 5); } catch (e) {}
        window.commitStreakOnAction?.();

        _saving = false;
        _exit();
        window.updateHomeContinueCard?.();
        window.navigateTo('view-study');

        // Toast
        setTimeout(() => {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:var(--accent-btn);color:var(--btn-text);padding:0.625rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:700;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            t.textContent = `${valid.length} card${valid.length !== 1 ? 's' : ''} saved`;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2500);
        }, 350);
    };

    // ── Import from manual create ─────────────────────────────────────────────
    window._mcImport = function (target) {
        _flush();
        window._importEntryPoint = 'manual';
        var mv = document.getElementById('manualCreateView');
        if (mv) {
            mv.style.opacity = '0';
            mv.style.transform = 'translateY(24px)';
            setTimeout(function () {
                mv.style.display = 'none';
                window.openAnkiImport();
            }, 180);
        } else {
            window.openAnkiImport();
        }
    };
    window._mcOpenAnki    = function () { window._mcImport('anki'); };

})();

// Anki .apkg Import
// ─────────────────────────────────────────────────────────────────────────────
// Supports .apkg (Anki package) files — no external dependencies except JSZip
// which is loaded on-demand from cdnjs when the user first opens this feature.
// ─────────────────────────────────────────────────────────────────────────────
(function () {

    // ── JSZip loader ─────────────────────────────────────────────────────────
    let _jszipReady = null;
    function _loadJSZip() {
        if (_jszipReady) return _jszipReady;
        _jszipReady = new Promise((resolve, reject) => {
            if (typeof JSZip !== 'undefined') { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload  = resolve;
            s.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(s);
        });
        return _jszipReady;
    }

    // ── SQLite reader with overflow page support ────────────────────────────────
    function _varint(u8, pos) {
        let v = 0;
        for (let i = 0; i < 9; i++) {
            const b = u8[pos + i];
            if (i === 8) { v = v * 256 + b; return { v, next: pos + 9 }; }
            v = v * 128 + (b & 0x7f);
            if (!(b & 0x80)) return { v, next: pos + i + 1 };
        }
        return { v, next: pos + 9 };
    }

    // Concatenate payload across overflow pages into a single Uint8Array
    function _fullPayload(u8, pageSize, cellPos, totalPayloadLen) {
        const reservedBytes = u8[20];
        const usable = pageSize - reservedBytes;
        const maxLocal = usable - 35;
        const minLocal = Math.floor((usable - 12) * 32 / 255) - 23;

        if (totalPayloadLen <= maxLocal) {
            // No overflow — all data is on this page
            return u8.slice(cellPos, cellPos + totalPayloadLen);
        }

        // Calculate how many bytes are stored locally
        let localSize = minLocal + ((totalPayloadLen - minLocal) % (usable - 4));
        if (localSize > maxLocal) localSize = minLocal;

        // Collect local bytes
        const chunks = [u8.slice(cellPos, cellPos + localSize)];

        // Read overflow page number (4 bytes right after local payload)
        const dv = new DataView(u8.buffer, u8.byteOffset);
        let ovflPage = dv.getUint32(cellPos + localSize, false);

        // Follow overflow page chain
        let collected = localSize;
        let safety = 0;
        while (ovflPage > 0 && collected < totalPayloadLen && safety++ < 500) {
            const pageOff = (ovflPage - 1) * pageSize;
            if (pageOff + 4 > u8.length) break;
            const nextPage = dv.getUint32(pageOff, false);
            const dataStart = pageOff + 4;
            const dataLen = Math.min(usable - 4, totalPayloadLen - collected);
            chunks.push(u8.slice(dataStart, dataStart + dataLen));
            collected += dataLen;
            ovflPage = nextPage;
        }

        // Merge chunks
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) { merged.set(c, offset); offset += c.length; }
        return merged;
    }

    function _record(payload) {
        const u8 = payload;
        const hdr = _varint(u8, 0);
        let hp = hdr.next;
        const hdrEnd = hdr.v;
        const types = [];
        while (hp < hdrEnd) {
            const t = _varint(u8, hp);
            types.push(t.v); hp = t.next;
        }
        let dp = hdrEnd;
        const fields = [];
        const dec = new TextDecoder('utf-8');
        for (const type of types) {
            if      (type === 0)              { fields.push(null); }
            else if (type === 1)              { fields.push(u8[dp]); dp += 1; }
            else if (type === 2)              { fields.push((u8[dp]<<8)|u8[dp+1]); dp += 2; }
            else if (type === 3)              { fields.push((u8[dp]<<16)|(u8[dp+1]<<8)|u8[dp+2]); dp += 3; }
            else if (type === 4)              { fields.push(new DataView(u8.buffer, u8.byteOffset+dp, 4).getInt32(0,false)); dp += 4; }
            else if (type === 5)              { dp += 6; fields.push(0); }
            else if (type === 6)              { dp += 8; fields.push(0); }
            else if (type === 7)              { fields.push(new DataView(u8.buffer, u8.byteOffset+dp, 8).getFloat64(0,false)); dp += 8; }
            else if (type === 8)              { fields.push(0); }
            else if (type === 9)              { fields.push(1); }
            else if (type >= 12 && !(type%2)) { const len=(type-12)>>1; fields.push(u8.slice(dp,dp+len)); dp+=len; }
            else if (type >= 13 &&  (type%2)) { const len=(type-13)>>1; fields.push(dec.decode(u8.slice(dp,dp+len))); dp+=len; }
            else                              { fields.push(null); }
        }
        return fields;
    }

    function _readLeaf(u8, pageOffset, isRoot, pageSize, rows) {
        const ho = isRoot ? 100 : pageOffset;
        if (u8[ho] !== 0x0d) return;
        const cellCount = (u8[ho+3]<<8)|u8[ho+4];
        const ptrOff = ho + 8;
        for (let i = 0; i < cellCount; i++) {
            const cp = pageOffset + ((u8[ptrOff+i*2]<<8)|u8[ptrOff+i*2+1]);
            let p = cp;
            const pl = _varint(u8, p); p = pl.next; // total payload length
            const ri = _varint(u8, p); p = ri.next; // row id (skip)
            try {
                const payload = _fullPayload(u8, pageSize, p, pl.v);
                rows.push(_record(payload));
            } catch(e) { /* skip unparseable row */ }
        }
    }

    function _readInterior(u8, pageOffset, isRoot, pageSize, rows) {
        const ho = isRoot ? 100 : pageOffset;
        if (u8[ho] !== 0x05) return;
        const cellCount = (u8[ho+3]<<8)|u8[ho+4];
        const lm = ((u8[ho+8]<<24)|(u8[ho+9]<<16)|(u8[ho+10]<<8)|u8[ho+11]) >>> 0;
        _readBtree(u8, (lm-1)*pageSize, lm===1, pageSize, rows);
        const ptrOff = ho + 12;
        for (let i = 0; i < cellCount; i++) {
            const cp = pageOffset + ((u8[ptrOff+i*2]<<8)|u8[ptrOff+i*2+1]);
            const child = ((u8[cp]<<24)|(u8[cp+1]<<16)|(u8[cp+2]<<8)|u8[cp+3]) >>> 0;
            _readBtree(u8, (child-1)*pageSize, child===1, pageSize, rows);
        }
    }

    function _readBtree(u8, pageOffset, isRoot, pageSize, rows) {
        const ho = isRoot ? 100 : pageOffset;
        if (ho >= u8.length) return;
        const type = u8[ho];
        if      (type === 0x0d) _readLeaf(u8, pageOffset, isRoot, pageSize, rows);
        else if (type === 0x05) _readInterior(u8, pageOffset, isRoot, pageSize, rows);
    }

    function _readTable(u8, pageSize, rootPage) {
        const rows = [];
        _readBtree(u8, (rootPage-1)*pageSize, rootPage===1, pageSize, rows);
        return rows;
    }

    function _parseSQLite(arrayBuffer) {
        const u8 = new Uint8Array(arrayBuffer);
        const dv = new DataView(arrayBuffer);

        // Validate SQLite magic
        const magic = 'SQLite format 3\x00';
        for (let i = 0; i < 16; i++) {
            if (u8[i] !== magic.charCodeAt(i)) throw new Error('Not a valid SQLite file');
        }

        const pageSize = dv.getUint16(16, false) || 65536;

        const schemaRows = [];
        _readBtree(u8, 0, true, pageSize, schemaRows);

        const tableMap = {};
        for (const row of schemaRows) {
            if (row[0] === 'table' && typeof row[1] === 'string') {
                tableMap[row[1]] = row[3];
            }
        }

        const result = {};
        for (const [name, rootPage] of Object.entries(tableMap)) {
            if (typeof rootPage === 'number' && rootPage > 0) {
                result[name] = _readTable(u8, pageSize, rootPage);
            }
        }
        return result;
    }
    // ── HTML strip helper ─────────────────────────────────────────────────────
    function _stripHTML(html) {
        if (!html) return '';
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
    }

    // ── Parse .apkg file → array of {front, back, tags, deckName} ─────────────
    async function _parseApkg(file) {
        await _loadJSZip();
        const zip = await JSZip.loadAsync(file);

        const zipFiles = Object.keys(zip.files);
        const hasAnki21b = zipFiles.some(n => n === 'collection.anki21b');
        let dbBuf = null;
        let deckName = 'Anki Import';

        for (const name of ['collection.anki21', 'collection.anki2']) {
            const f = zip.file(name);
            if (!f) continue;
            try {
                const buf = await f.async('arraybuffer');
                const magic = new Uint8Array(buf, 0, 16);
                const expected = [83,81,76,105,116,101,32,102,111,114,109,97,116,32,51,0];
                if (expected.every((b,i) => magic[i] === b)) { dbBuf = buf; break; }
            } catch(e) {}
        }

        if (!dbBuf && hasAnki21b) {
            throw new Error(
                'This deck uses the new Anki format. In Anki Desktop: ' +
                'File \u2192 Export \u2192 tick "Support older Anki versions" \u2192 Export, then import that file.'
            );
        }
        if (!dbBuf) throw new Error('No readable collection found in this .apkg file.');

        let cards = [];
        try {
            const tables = _parseSQLite(dbBuf);

            if (tables.col && tables.col.length) {
                for (const ci of [8, 9, 7]) {
                    const v = tables.col[0][ci];
                    if (typeof v === 'string' && v.startsWith('{')) {
                        try {
                            const decks = JSON.parse(v);
                            const names = Object.values(decks).map(d => d.name)
                                .filter(n => n && n !== 'Default' && !n.includes('::'));
                            if (names.length) { deckName = names[0]; break; }
                        } catch(e) {}
                    }
                }
            }

            const notes = tables.notes || tables.note || [];
            for (const row of notes) {
                let flds = null;
                for (const idx of [6, 7, 5]) {
                    if (typeof row[idx] === 'string' && row[idx].includes('\x1f')) {
                        flds = row[idx]; break;
                    }
                }
                if (!flds) continue;
                const parts = flds.split('\x1f');
                if (parts.length < 2) continue;
                const front = _stripHTML(parts[0]);
                const back  = _stripHTML(parts[1]);
                if (!front || !back) continue;
                cards.push({ front, back, tags: typeof row[5] === 'string' ? row[5].trim() : '' });
            }
        } catch(e) {
            throw new Error('Could not read this deck: ' + e.message);
        }

        if (cards.length === 0) {
            throw new Error(
                'No cards found. If exported from recent Anki: ' +
                'File \u2192 Export \u2192 tick "Support older Anki versions" \u2192 Export.'
            );
        }

        return { cards, deckName };
    }
    // ── UI state ─────────────────────────────────────────────────────────────
    let _parsed = null; // { cards, deckName }

    // ── Entry point ───────────────────────────────────────────────────────────
    window.openAnkiImport = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        _parsed = null;
        _renderAnkiPicker();
        _ankiEnter();
    };

    function _ankiEnter() {
        // Track which view we came from so back nav can return correctly
        const onCreateView = document.getElementById('view-create')?.classList.contains('active');
        window._ankiFromCreate = onCreateView;
        if (onCreateView) {
            document.getElementById('globalBottomNav')?.style.setProperty('transform', 'translateY(100%)');
            const hdr = document.querySelector('#view-create .top-header');
            if (hdr) hdr.style.display = 'none';
            document.getElementById('selectionView').style.display = 'none';
        }
        const mv = document.getElementById('ankiImportView');
        Object.assign(mv.style, {
            display: 'flex', position: 'fixed', inset: '0', zIndex: '300',
            background: 'var(--bg-body)', flexDirection: 'column', overflowY: 'auto',
            opacity: '0', transform: 'translateY(24px)', transition: 'opacity 0.22s ease, transform 0.22s ease',
        });
        requestAnimationFrame(() => { mv.style.opacity = '1'; mv.style.transform = 'translateY(0)'; });
    }

    function _ankiExit() {
        const mv = document.getElementById('ankiImportView');
        mv.style.opacity = '0'; mv.style.transform = 'translateY(24px)';
        setTimeout(() => { mv.style.display = 'none'; mv.style.transition = ''; }, 220);
        _parsed = null;
        if (window._importEntryPoint === 'manual') {
            window._importEntryPoint = null;
            window.openManualCreate();
        } else if (window._ankiFromCreate) {
            window._ankiFromCreate = false;
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = '';
            const hdr = document.querySelector('#view-create .top-header');
            if (hdr) hdr.style.display = '';
            document.getElementById('selectionView').style.display = 'flex';
        }
        // If from home/library, just close overlay — nav was never hidden
    }

    // ── Screen 1: picker with two tabs (File / Paste text) ───────────────────
    function _renderAnkiPicker(tab) {
        tab = tab || 'file';
        const mv = document.getElementById('ankiImportView');
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);position:sticky;top:0;z-index:5;">
    <button onclick="window._ankiBack()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);flex:1;margin:0;">Import from Anki</h2>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:0;border-bottom:1px solid var(--border-glass);background:var(--bg-body);">
    <button id="ankiTabFile" onclick="window._renderAnkiPicker('file')"
      style="flex:1;padding:0.75rem;font-size:0.875rem;font-weight:700;border:none;background:transparent;cursor:pointer;border-bottom:2px solid ${tab==='file' ? 'var(--accent-btn)' : 'transparent'};color:${tab==='file' ? 'var(--accent-btn)' : 'var(--text-muted)'};">
      .apkg file
    </button>
    <button id="ankiTabPaste" onclick="window._renderAnkiPicker('paste')"
      style="flex:1;padding:0.75rem;font-size:0.875rem;font-weight:700;border:none;background:transparent;cursor:pointer;border-bottom:2px solid ${tab==='paste' ? 'var(--accent-btn)' : 'transparent'};color:${tab==='paste' ? 'var(--accent-btn)' : 'var(--text-muted)'};">
      Paste text
    </button>
  </div>

  <!-- Body -->
  <div style="flex:1;padding:1.25rem 1.125rem;display:flex;flex-direction:column;gap:1.25rem;padding-bottom:5rem;">

    ${tab === 'file' ? `
    <!-- FILE TAB -->
    <label for="ankiFileInput"
      style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:2.5rem 1.5rem;border-radius:var(--radius-card);border:2px dashed var(--border-glass);background:var(--bg-surface);cursor:pointer;text-align:center;">
      <div style="width:3.5rem;height:3.5rem;border-radius:1rem;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-file-import" style="font-size:1.375rem;color:var(--accent-btn);"></i>
      </div>
      <div>
        <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 0.25rem;">Select .apkg file</p>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;line-height:1.5;">Works with Anki 2.0 and older 2.1 exports.</p>
      </div>
      <input type="file" id="ankiFileInput" accept=".apkg,.txt" style="display:none;" onchange="window._ankiFileChosen(this)">
    </label>

    <div style="background:var(--bg-surface);border-radius:var(--radius-card);border:1px solid var(--border-glass);padding:1rem;">
      <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 0.625rem;">How to export</p>
      ${['Open Anki Desktop', 'Right-click a deck → Export', 'Format: Anki Deck Package (.apkg)', 'Transfer .apkg to your phone'].map((s,i)=>`
      <div style="display:flex;gap:0.625rem;align-items:flex-start;${i<3?'margin-bottom:0.5rem':''}">
        <div style="width:1.25rem;height:1.25rem;border-radius:50%;background:rgba(139,92,246,0.12);color:var(--accent-btn);font-size:0.625rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
        <p style="font-size:0.8125rem;color:var(--text-main);margin:0;line-height:1.4;">${s}</p>
      </div>`).join('')}
    </div>
    ` : `
    <!-- PASTE TAB -->
    <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);border-radius:var(--radius-md);padding:0.875rem;">
      <p style="font-size:0.8125rem;color:var(--text-main);margin:0;line-height:1.5;">Works with <b>all Anki versions</b> including the latest. Export as plain text, then paste below.</p>
    </div>

    <div style="background:var(--bg-surface);border-radius:var(--radius-card);border:1px solid var(--border-glass);padding:1rem;">
      <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 0.625rem;">How to export</p>
      ${['Open Anki Desktop', 'Click a deck → Export', 'Format: <b style="color:var(--text-main)">Notes in Plain Text (.txt)</b>', 'Open the .txt file, select all, copy', 'Paste into the box below'].map((s,i)=>`
      <div style="display:flex;gap:0.625rem;align-items:flex-start;${i<4?'margin-bottom:0.5rem':''}">
        <div style="width:1.25rem;height:1.25rem;border-radius:50%;background:rgba(139,92,246,0.12);color:var(--accent-btn);font-size:0.625rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
        <p style="font-size:0.8125rem;color:var(--text-main);margin:0;line-height:1.4;">${s}</p>
      </div>`).join('')}
    </div>

    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Paste exported text</label>
      <textarea id="ankiPasteArea" placeholder="Term&#9;Definition&#10;Term&#9;Definition&#10;..."
        oninput="window._ankiPasteLive(this.value)"
        style="width:100%;min-height:8rem;padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.875rem;line-height:1.55;resize:none;box-sizing:border-box;outline:none;font-family:monospace;-webkit-appearance:none;"></textarea>
      <p id="ankiPasteStatus" style="font-size:0.75rem;color:var(--text-muted);margin:0.375rem 0 0;min-height:1rem;"></p>
    </div>
    `}

  </div>

  ${tab === 'paste' ? `
  <!-- Footer for paste tab -->
  <div style="position:fixed;bottom:0;left:0;right:0;padding:0.875rem 1.125rem calc(env(safe-area-inset-bottom,0px) + 0.875rem);background:var(--bg-body);border-top:1px solid var(--border-glass);z-index:10;">
    <button id="ankiPasteImportBtn" onclick="window._ankiPasteImport()" disabled
      style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:var(--bg-surface);color:var(--text-muted);font-size:1rem;font-weight:700;cursor:not-allowed;opacity:0.45;transition:all 0.2s;">
      Import
    </button>
  </div>
  ` : ''}

</div>`;
        // Expose for tab switching
        window._renderAnkiPicker = _renderAnkiPicker;
    }

    // ── Live paste feedback ───────────────────────────────────────────────────
    window._ankiPasteLive = function(val) {
        const cards = _parseTSV(val);
        const status = document.getElementById('ankiPasteStatus');
        const btn    = document.getElementById('ankiPasteImportBtn');
        if (!val.trim()) {
            if (status) status.textContent = '';
            if (btn) { btn.disabled=true; btn.style.opacity='0.45'; btn.style.background='var(--bg-surface)'; btn.style.color='var(--text-muted)'; btn.style.cursor='not-allowed'; }
            return;
        }
        if (cards.length === 0) {
            if (status) { status.textContent = 'No cards detected — make sure a tab separates term and definition.'; status.style.color='#f87171'; }
            if (btn) { btn.disabled=true; btn.style.opacity='0.45'; btn.style.background='var(--bg-surface)'; btn.style.color='var(--text-muted)'; btn.style.cursor='not-allowed'; }
        } else {
            if (status) { status.textContent = cards.length + ' card' + (cards.length!==1?'s':'') + ' detected'; status.style.color='var(--accent-green)'; }
            if (btn) { btn.disabled=false; btn.style.opacity='1'; btn.style.background='var(--accent-btn)'; btn.style.color='var(--btn-text)'; btn.style.cursor='pointer'; }
        }
    };

    // ── Parse tab-separated text (Anki plain text export) ─────────────────────
    function _parseTSV(text) {
        if (!text.trim()) return [];
        const cards = [];
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (!t || t.startsWith('#')) continue; // skip empty + Anki comment lines
            const tabIdx = t.indexOf('\t');
            if (tabIdx === -1) continue;
            const front = _stripHTML(t.substring(0, tabIdx).trim());
            const back  = _stripHTML(t.substring(tabIdx + 1).trim());
            if (front && back) cards.push({ front, back, tags: '' });
        }
        return cards;
    }

    // ── Import from paste ─────────────────────────────────────────────────────
    window._ankiPasteImport = function() {
        const text  = document.getElementById('ankiPasteArea')?.value || '';
        const cards = _parseTSV(text);
        if (!cards.length) return;
        _parsed = { cards, deckName: 'Anki Import' };
        _renderAnkiPreview();
    };

    // ── File chosen — parse and show preview ──────────────────────────────────
    window._ankiFileChosen = async function (input) {
        const file = input.files[0];
        if (!file) return;
        if (!file.name.endsWith('.apkg')) {
            alert('Please select an .apkg file exported from Anki.');
            return;
        }

        _renderAnkiLoading(file.name);

        try {
            _parsed = await _parseApkg(file);

            if (!_parsed.cards.length) {
                _renderAnkiError('No cards found in this deck. Make sure it contains Basic cards with front and back fields.');
                return;
            }

            _renderAnkiPreview();
        } catch(e) {
            console.error('[AnkiImport]', e);
            _renderAnkiError(e.message || 'Could not read this file. Make sure it is a valid .apkg export from Anki.');
        }
    };

    // ── Screen 2: loading ─────────────────────────────────────────────────────
    function _renderAnkiLoading(filename) {
        const mv = document.getElementById('ankiImportView');
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;padding:2rem;text-align:center;gap:1.5rem;">
  <div style="width:5rem;height:5rem;border-radius:50%;border:3px solid var(--border-glass);border-top-color:var(--accent-btn);animation:spin 0.9s linear infinite;"></div>
  <div>
    <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 0.375rem;">Reading deck</p>
    <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">${_esc(filename)}</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
</div>`;
    }

    // ── Screen 3: preview / confirm ───────────────────────────────────────────
    function _renderAnkiPreview() {
        if (!_parsed) return;
        const { cards, deckName } = _parsed;
        const preview = cards.slice(0, 3);
        const mv = document.getElementById('ankiImportView');

        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);position:sticky;top:0;z-index:5;">
    <button onclick="window._renderAnkiPicker()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);flex:1;margin:0;">Review Import</h2>
    <span style="font-size:0.7rem;font-weight:700;background:rgba(16,185,129,0.12);color:var(--accent-green);padding:3px 10px;border-radius:9999px;">${cards.length} cards</span>
  </div>

  <!-- Body -->
  <div style="flex:1;padding:1.25rem 1.125rem;display:flex;flex-direction:column;gap:1.25rem;padding-bottom:6rem;">

    <!-- Deck title input -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Deck title</label>
      <input id="ankiTitleInput" type="text" value="${_esc(deckName)}" maxlength="60"
        style="width:100%;padding:0.875rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;font-weight:600;box-sizing:border-box;outline:none;">
    </div>

    <!-- Subject input -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Subject</label>
      <input id="ankiSubjectInput" type="text" placeholder="e.g. Pharmacology" maxlength="40"
        style="width:100%;padding:0.75rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.875rem;box-sizing:border-box;outline:none;">
    </div>

    <!-- Stats row -->
    <div style="display:flex;gap:0.75rem;">
      <div style="flex:1;background:var(--bg-surface);border-radius:var(--radius-md);border:1px solid var(--border-glass);padding:0.875rem;text-align:center;">
        <p style="font-size:1.5rem;font-weight:800;color:var(--text-main);margin:0 0 0.125rem;">${cards.length}</p>
        <p style="font-size:0.6875rem;font-weight:600;color:var(--text-muted);margin:0;text-transform:uppercase;">Cards</p>
      </div>
      <div style="flex:1;background:var(--bg-surface);border-radius:var(--radius-md);border:1px solid var(--border-glass);padding:0.875rem;text-align:center;">
        <p style="font-size:1.5rem;font-weight:800;color:var(--accent-green);margin:0 0 0.125rem;">+${cards.length * 5}</p>
        <p style="font-size:0.6875rem;font-weight:600;color:var(--text-muted);margin:0;text-transform:uppercase;">XP earned</p>
      </div>
    </div>

    <!-- Preview cards -->
    <div>
      <p style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 0.625rem;">Preview</p>
      <div style="display:flex;flex-direction:column;gap:0.625rem;">
        ${preview.map((c, i) => `
        <div style="background:var(--bg-surface);border-radius:var(--radius-md);border:1px solid var(--border-glass);padding:0.875rem;">
          <p style="font-size:0.6875rem;font-weight:700;color:var(--accent-btn);margin:0 0 0.25rem;text-transform:uppercase;letter-spacing:0.06em;">Card ${i+1}</p>
          <p style="font-size:0.875rem;font-weight:600;color:var(--text-main);margin:0 0 0.375rem;line-height:1.4;">${_esc(c.front.substring(0, 120))}${c.front.length > 120 ? '…' : ''}</p>
          <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;line-height:1.4;">${_esc(c.back.substring(0, 100))}${c.back.length > 100 ? '…' : ''}</p>
        </div>`).join('')}
        ${cards.length > 3 ? `<p style="font-size:0.8125rem;color:var(--text-muted);text-align:center;margin:0.25rem 0 0;">and ${cards.length - 3} more cards</p>` : ''}
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div style="position:fixed;bottom:0;left:0;right:0;padding:0.875rem 1.125rem calc(env(safe-area-inset-bottom,0px) + 0.875rem);background:var(--bg-body);border-top:1px solid var(--border-glass);z-index:10;">
    <button onclick="window._ankiConfirmImport()"
      style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:1rem;font-weight:700;cursor:pointer;">
      Import ${cards.length} cards
    </button>
  </div>

</div>`;
        // expose for back button
        window._renderAnkiPicker = _renderAnkiPicker;
    }

    // ── Screen 4: error ───────────────────────────────────────────────────────
    function _renderAnkiError(msg) {
        const mv = document.getElementById('ankiImportView');
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;padding:2rem;text-align:center;gap:1.25rem;">
  <div style="width:4rem;height:4rem;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;">
    <i class="fas fa-exclamation-triangle" style="font-size:1.5rem;color:#f87171;"></i>
  </div>
  <div>
    <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 0.5rem;">Could not read deck</p>
    <p style="font-size:0.875rem;color:var(--text-muted);margin:0;line-height:1.5;">${_esc(msg)}</p>
  </div>
  <button onclick="window._renderAnkiPicker(); window._renderAnkiPicker = _renderAnkiPicker;"
    style="padding:0.75rem 2rem;border-radius:var(--radius-btn);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;font-weight:600;cursor:pointer;">
    Try another file
  </button>
</div>`;
        window._renderAnkiPicker = _renderAnkiPicker;
    }

    // ── Save imported deck ────────────────────────────────────────────────────
    window._ankiConfirmImport = async function () {
        if (!_parsed) return;
        const btn = document.querySelector('#ankiImportView button:last-of-type');
        if (btn) { btn.textContent = 'Importing...'; btn.disabled = true; btn.style.opacity = '0.65'; }

        const title   = document.getElementById('ankiTitleInput')?.value.trim()   || _parsed.deckName || 'Anki Import';
        const subject = document.getElementById('ankiSubjectInput')?.value.trim() || 'General';
        const { cards } = _parsed;

        const newQuiz = {
            id:       Date.now(),
            title,
            subject,
            favorite: false,
            source:   'anki',
            type:     'Flashcards',
            stats:    { bestScore: 0, attempts: 0, lastScore: 0 },
            questions: cards.map(c => ({
                text:        c.front,
                options:     [c.back],
                correct:     0,
                explanation: ''
            }))
        };

        // Firestore
        try {
            if (window.currentUser && window.db) {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                await setDoc(doc(window.db, 'users', window.currentUser.uid, 'quizzes', String(newQuiz.id)), newQuiz);
            }
        } catch(e) { console.warn('[AnkiImport] Firestore error:', e); }

        // localStorage + in-memory
        const uid   = window.currentUser?.uid || 'guest';
        const store = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid) || '[]');
        store.push(newQuiz);
        localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(store));
        window.quizzes = store;

        // XP (5 per card, capped at 500 so a huge import doesn't break the economy)
        try { await window.addXP(Math.min(cards.length * 5, 500)); } catch(e) {}
        window.commitStreakOnAction?.();

        _ankiExit();
        window.updateHomeContinueCard?.();
        window.navigateTo('view-study');

        setTimeout(() => {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:var(--accent-btn);color:var(--btn-text);padding:0.625rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:700;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            t.textContent = `${cards.length} cards imported`;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2800);
        }, 350);
    };

    // ── Back ──────────────────────────────────────────────────────────────────
    window._ankiBack = _ankiExit;

    // ── Escape helper ─────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

})();
// ═══════════════════════════════════════════════════════════════════════════
// BOSS FIGHT MODE
// ═══════════════════════════════════════════════════════════════════════════
(function () {

    // ── State ────────────────────────────────────────────────────────────────
    let _questions  = [];   // shuffled subset from chosen deck
    let _qIdx       = 0;    // current question index
    let _bossHP     = 100;
    let _playerHP   = 100;
    let _timer      = null;
    let _timeLeft   = 10;
    let _answered   = false;
    let _deckTitle  = '';
    let _xpDelta    = 0;    // net XP change at end

    const TOTAL_Q    = 15;
    const BOSS_MAX   = 100;
    const PLAYER_MAX = 100;
    const TIME_PER_Q = 10;  // seconds

    // Damage values
    const DMG_CORRECT_BASE  = 15;
    const DMG_CORRECT_QUICK = 5;   // bonus if answered in ≤4s
    const DMG_WRONG_PLAYER  = 20;
    const XP_WIN            = 50;
    const XP_LOSE           = -15;

    // ── CSS (injected once) ──────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('bossStyle')) return;
        const s = document.createElement('style');
        s.id = 'bossStyle';
        s.textContent = `
            @keyframes bossShake {
                0%,100%{transform:translateX(0)}
                20%{transform:translateX(-6px)}
                40%{transform:translateX(6px)}
                60%{transform:translateX(-4px)}
                80%{transform:translateX(4px)}
            }
            @keyframes bossPlayerShake {
                0%,100%{transform:translateX(0)}
                25%{transform:translateX(5px)}
                75%{transform:translateX(-5px)}
            }
            @keyframes bossHPBar {
                from{width:var(--from)}
                to{width:var(--to)}
            }
            @keyframes bossPop {
                0%{transform:scale(0.8);opacity:0}
                60%{transform:scale(1.08)}
                100%{transform:scale(1);opacity:1}
            }
            @keyframes bossDmgFloat {
                0%{transform:translateY(0);opacity:1}
                100%{transform:translateY(-40px);opacity:0}
            }
            @keyframes bossTimerPulse {
                0%,100%{opacity:1}
                50%{opacity:.4}
            }
            @keyframes bossCardIn {
                from{transform:translateY(20px) scale(0.96);opacity:0}
                to{transform:translateY(0) scale(1);opacity:1}
            }
            @keyframes bossLightning {
                0%,100%{opacity:0}
                50%{opacity:1}
            }
            @keyframes bossWin {
                0%{transform:scale(0) rotate(-10deg);opacity:0}
                60%{transform:scale(1.15) rotate(3deg)}
                100%{transform:scale(1) rotate(0);opacity:1}
            }
            .boss-hp-bar {
                height:100%;
                border-radius:inherit;
                transition:width 0.5s cubic-bezier(0.4,0,0.2,1);
            }
            .boss-opt-btn {
                width:100%;text-align:left;padding:.75rem 1rem;
                border-radius:.875rem;border:1.5px solid var(--border-glass);
                background:var(--bg-surface);color:var(--text-main);
                font-size:.875rem;font-weight:600;cursor:pointer;
                transition:border-color .12s,background .12s,transform .1s;
                -webkit-tap-highlight-color:transparent;
            }
            .boss-opt-btn:active{transform:scale(0.98);}
            .boss-opt-btn.correct{border-color:#10b981;background:rgba(16,185,129,.12);color:#10b981;}
            .boss-opt-btn.wrong{border-color:#ef4444;background:rgba(239,68,68,.12);color:#ef4444;}
            .boss-opt-btn.reveal{border-color:#10b981;background:rgba(16,185,129,.08);color:#10b981;}
        `;
        document.head.appendChild(s);
    }

    // ── Enter / Exit overlay ─────────────────────────────────────────────────
    function _enter() {
        document.getElementById('globalBottomNav')?.style.setProperty('transform','translateY(100%)');
        const mv = document.getElementById('bossFightView');
        Object.assign(mv.style, {
            display:'flex', position:'fixed', inset:'0', zIndex:'300',
            background:'var(--bg-body)', flexDirection:'column', overflowY:'auto',
            opacity:'0', transform:'translateY(20px)',
            transition:'opacity .22s ease, transform .22s ease',
        });
        requestAnimationFrame(() => { mv.style.opacity='1'; mv.style.transform='translateY(0)'; });
    }

    function _exit() {
        const mv = document.getElementById('bossFightView');
        if (!mv) return;
        mv.style.opacity='0'; mv.style.transform='translateY(20px)';
        setTimeout(() => { mv.style.display='none'; mv.style.transition=''; }, 230);
        const nav = document.getElementById('globalBottomNav');
        if (nav) nav.style.transform = '';
        if (_timer) { clearInterval(_timer); _timer = null; }
    }

    // ── Entry point ──────────────────────────────────────────────────────────
    window.openBossFight = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        const quizzes = (window.quizzes || []).filter(q => q.questions && q.questions.length >= 5);
        if (!quizzes.length) {
            alert('You need at least one deck with 5+ questions to start a Boss Fight. Generate a deck first!');
            return;
        }
        _injectStyles();
        _renderDeckPicker(quizzes);
        _enter();
    };

    // ── Screen 1: Deck picker ────────────────────────────────────────────────
    function _renderDeckPicker(quizzes) {
        const mv = document.getElementById('bossFightView');

        const deckListHTML = quizzes.length === 0
            ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1.5rem;text-align:center;gap:1rem;flex:1;">
                 <div style="width:64px;height:64px;border-radius:50%;background:rgba(124,58,237,.12);display:flex;align-items:center;justify-content:center;">
                   <i class="fas fa-layer-group" style="font-size:1.5rem;color:#7c3aed;"></i>
                 </div>
                 <div>
                   <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 .375rem;">No decks yet</p>
                   <p style="font-size:.8125rem;color:var(--text-muted);margin:0;line-height:1.5;">Generate a deck from the Create tab first, then come back to fight.</p>
                 </div>
                 <button onclick="window._bossExit();window.navigateTo('view-create');" style="padding:.75rem 1.5rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:.9375rem;font-weight:700;cursor:pointer;">
                   Create a deck
                 </button>
               </div>`
            : quizzes.map((q, i) => `
              <button onclick="window._bossStartFight('${q.id}')"
                style="display:flex;align-items:center;gap:.875rem;background:var(--bg-surface);border:1.5px solid var(--border-glass);border-radius:1rem;padding:1rem 1rem;cursor:pointer;width:100%;text-align:left;transition:border-color .12s,transform .1s;animation:bossFadeUp .25s ease ${i*0.04}s both;"
                ontouchstart="this.style.borderColor='var(--accent-btn)';this.style.transform='scale(0.98)'"
                ontouchend="this.style.borderColor='var(--border-glass)';this.style.transform=''">
                <!-- Deck icon -->
                <div style="width:44px;height:44px;border-radius:.75rem;background:linear-gradient(135deg,#4c1d95,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i class="fas fa-layer-group" style="color:white;font-size:1rem;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:.9375rem;font-weight:700;color:var(--text-main);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(q.title)}</div>
                  <div style="font-size:.75rem;color:var(--text-muted);margin-top:.125rem;display:flex;align-items:center;gap:.375rem;">
                    <span>${q.questions.length} questions</span>
                    <span style="width:3px;height:3px;border-radius:50%;background:var(--border-glass);display:inline-block;"></span>
                    <span>${_esc(q.subject||'General')}</span>
                  </div>
                </div>
                <div style="width:28px;height:28px;border-radius:50%;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i class="fas fa-chevron-right" style="color:#7c3aed;font-size:.6875rem;"></i>
                </div>
              </button>`).join('');

        mv.innerHTML = `
<div style="display:flex;flex-direction:column;height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:.75rem;padding:1rem 1.125rem .875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);flex-shrink:0;">
    <button onclick="window._bossExit()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);cursor:pointer;transition:transform .1s;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left" style="font-size:.875rem;"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0;flex:1;">Boss Fight</h2>
  </div>

  <!-- Boss arena banner -->
  <div style="background:linear-gradient(160deg,#0f0720 0%,#1e0a40 55%,#0f0720 100%);padding:1.25rem 1.25rem 1.125rem;flex-shrink:0;position:relative;overflow:hidden;">
    <!-- Glow -->
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(124,58,237,.3) 0%,transparent 65%);pointer-events:none;"></div>

    <div style="display:flex;align-items:center;gap:1rem;position:relative;">
      <!-- Boss char -->
      <div style="flex-shrink:0;">${_bossSVG(60)}</div>

      <!-- Boss info -->
      <div style="flex:1;">
        <p style="font-size:.625rem;font-weight:800;color:rgba(167,139,250,.7);text-transform:uppercase;letter-spacing:.1em;margin:0 0 .125rem;">Challenge</p>
        <p style="font-size:1.125rem;font-weight:900;color:white;margin:0 0 .5rem;letter-spacing:-.01em;">The Medicus</p>
        <!-- Rules pills -->
        <div style="display:flex;flex-wrap:wrap;gap:.375rem;">
          <span style="font-size:.625rem;font-weight:700;background:rgba(239,68,68,.2);color:#fca5a5;padding:2px 8px;border-radius:9999px;">15 questions</span>
          <span style="font-size:.625rem;font-weight:700;background:rgba(251,191,36,.2);color:#fde68a;padding:2px 8px;border-radius:9999px;">10s per question</span>
          <span style="font-size:.625rem;font-weight:700;background:rgba(16,185,129,.2);color:#6ee7b7;padding:2px 8px;border-radius:9999px;">Win +50 XP</span>
        </div>
      </div>
    </div>

    <!-- VS stat bar -->
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.875rem;">
      <div style="flex:1;background:rgba(255,255,255,.08);border-radius:.5rem;padding:.5rem .75rem;text-align:center;">
        <div style="font-size:.8125rem;font-weight:900;color:#c4b5fd;">💀 100</div>
        <div style="font-size:.55rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-top:1px;">Boss HP</div>
      </div>
      <div style="font-size:.75rem;font-weight:900;color:rgba(255,255,255,.25);">VS</div>
      <div style="flex:1;background:rgba(255,255,255,.08);border-radius:.5rem;padding:.5rem .75rem;text-align:center;">
        <div style="font-size:.8125rem;font-weight:900;color:#6ee7b7;">❤️ 100</div>
        <div style="font-size:.55rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-top:1px;">Your HP</div>
      </div>
    </div>
  </div>

  <!-- Deck list -->
  <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;">
    <div style="padding:.875rem .875rem calc(env(safe-area-inset-bottom,0px) + .875rem);">
      ${quizzes.length > 0 ? `<p style="font-size:.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin:0 0 .625rem;">Choose your deck</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        ${deckListHTML}
      </div>
    </div>
  </div>

</div>`;

        // Inject stagger keyframe if missing
        if (!document.getElementById('bossFadeStyle')) {
            const st = document.createElement('style');
            st.id = 'bossFadeStyle';
            st.textContent = '@keyframes bossFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
            document.head.appendChild(st);
        }

        window._bossExit = _exit;
    }

    // ── Start fight ──────────────────────────────────────────────────────────
    window._bossStartFight = function(deckId) {
        const quiz = (window.quizzes||[]).find(q => String(q.id) === String(deckId));
        if (!quiz) return;

        // Shuffle and take up to TOTAL_Q
        const pool = [...quiz.questions].sort(() => Math.random()-.5).slice(0, TOTAL_Q);
        _questions  = pool;
        _qIdx       = 0;
        _bossHP     = BOSS_MAX;
        _playerHP   = PLAYER_MAX;
        _xpDelta    = 0;
        _deckTitle  = quiz.title;

        _renderFight();
    };

    // ── Boss SVG character ───────────────────────────────────────────────────
    function _bossSVG(size, extra) {
        const s = size || 64;
        return `<svg viewBox="0 0 64 64" fill="none" style="width:${s}px;height:${s}px;${extra||''}display:inline-block;">
            <!-- Shadow/glow base -->
            <ellipse cx="32" cy="60" rx="18" ry="4" fill="rgba(124,58,237,.25)"/>
            <!-- Lab coat body -->
            <rect x="18" y="38" width="28" height="20" rx="4" fill="#e2d9f3"/>
            <!-- Coat lapels -->
            <path d="M32 38 L26 44 L32 46 L38 44 Z" fill="white"/>
            <!-- Red tie -->
            <path d="M32 42 L30 50 L32 52 L34 50 Z" fill="#ef4444"/>
            <!-- Stethoscope -->
            <path d="M24 42 Q20 48 22 54" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <circle cx="22" cy="55" r="2" fill="#374151"/>
            <!-- Neck -->
            <rect x="28" y="33" width="8" height="7" rx="3" fill="#fcd9a0"/>
            <!-- Head -->
            <ellipse cx="32" cy="27" rx="13" ry="13" fill="#fcd9a0"/>
            <!-- Evil eyebrows — angled sharply inward -->
            <path d="M22 21 Q25 18.5 28 20" stroke="#1e1b4b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <path d="M36 20 Q39 18.5 42 21" stroke="#1e1b4b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <!-- Eyes — narrow evil squint -->
            <ellipse cx="26" cy="24" rx="3.5" ry="2.5" fill="white"/>
            <ellipse cx="38" cy="24" rx="3.5" ry="2.5" fill="white"/>
            <ellipse cx="26.5" cy="24.5" rx="2" ry="2" fill="#4c1d95"/>
            <ellipse cx="38.5" cy="24.5" rx="2" ry="2" fill="#4c1d95"/>
            <ellipse cx="27" cy="24" rx=".8" ry=".8" fill="white"/>
            <ellipse cx="39" cy="24" rx=".8" ry=".8" fill="white"/>
            <!-- Evil grin -->
            <path d="M25 32 Q32 38 39 32" stroke="#1e1b4b" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <!-- Teeth -->
            <path d="M27 32.5 Q32 37 37 32.5" fill="white"/>
            <!-- Hair — swept back dramatic villain style -->
            <path d="M19 22 Q20 12 32 14 Q44 12 45 22 Q40 10 32 11 Q24 10 19 22 Z" fill="#1e1b4b"/>
            <!-- Crown/horns hint on hair -->
            <path d="M24 14 L22 8 L26 13" fill="#7c3aed"/>
            <path d="M40 14 L42 8 L38 13" fill="#7c3aed"/>
            <!-- Monocle -->
            <circle cx="38" cy="24" r="5" stroke="#fbbf24" stroke-width="1.2" fill="none"/>
            <line x1="43" y1="24" x2="45" y2="26" stroke="#fbbf24" stroke-width="1.2"/>
        </svg>`;
    }

    // ── Main fight screen ────────────────────────────────────────────────────
    function _renderFight() {
        const mv = document.getElementById('bossFightView');
        const q  = _questions[_qIdx];
        const progress = ((_qIdx) / _questions.length) * 100;
        const bossW  = (_bossHP / BOSS_MAX) * 100;
        const playerW= (_playerHP / PLAYER_MAX) * 100;

        const opts = q.options || [];
        const optsHTML = opts.map((opt, i) => `
            <button class="boss-opt-btn" id="bossOpt_${i}" onclick="window._bossAnswer(${i})">
                <span style="display:inline-block;width:1.5rem;height:1.5rem;border-radius:6px;background:var(--bg-body);text-align:center;line-height:1.5rem;font-size:.7rem;font-weight:800;margin-right:.625rem;flex-shrink:0;">${String.fromCharCode(65+i)}</span>
                ${_esc(String(opt))}
            </button>`).join('');

        mv.innerHTML = `
<div style="display:flex;flex-direction:column;height:100svh;padding-top:env(safe-area-inset-top,0px);background:var(--bg-body);">

  <!-- Arena header -->
  <div style="background:linear-gradient(160deg,#0f0720,#1a0a38);padding:.875rem 1rem .75rem;flex-shrink:0;">

    <!-- Top bar: exit + title -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.625rem;">
      <button onclick="window._bossConfirmExit()"
        style="width:2rem;height:2rem;border-radius:50%;background:rgba(255,255,255,.1);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;flex-shrink:0;"
        ontouchstart="this.style.background='rgba(255,255,255,.2)'" ontouchend="this.style.background='rgba(255,255,255,.1)'">
        <i class="fas fa-times" style="color:rgba(255,255,255,.7);font-size:.8125rem;"></i>
      </button>
      <span style="font-size:.6875rem;font-weight:800;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em;">Boss Fight</span>
      <div style="width:2rem;"></div>
    </div>

    <!-- HP bars row -->
    <div style="display:grid;grid-template-columns:1fr 44px 1fr;align-items:center;gap:.5rem;margin-bottom:.625rem;">

      <!-- Boss HP -->
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;">
          <span style="font-size:.6rem;font-weight:800;color:rgba(167,139,250,.8);text-transform:uppercase;letter-spacing:.06em;">BOSS</span>
          <span id="bossHPLabel" style="font-size:.6rem;font-weight:800;color:#a78bfa;">${_bossHP}</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:9999px;overflow:hidden;">
          <div id="bossHPBar" class="boss-hp-bar" style="width:${bossW}%;background:linear-gradient(90deg,#7c3aed,#a78bfa);"></div>
        </div>
      </div>

      <!-- VS -->
      <div style="text-align:center;font-size:.625rem;font-weight:900;color:rgba(255,255,255,.3);letter-spacing:.08em;">VS</div>

      <!-- Player HP -->
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;">
          <span style="font-size:.6rem;font-weight:800;color:rgba(16,185,129,.8);text-transform:uppercase;letter-spacing:.06em;">YOU</span>
          <span id="playerHPLabel" style="font-size:.6rem;font-weight:800;color:#10b981;">${_playerHP}</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:9999px;overflow:hidden;">
          <div id="playerHPBar" class="boss-hp-bar" style="width:${playerW}%;background:linear-gradient(90deg,#059669,#10b981);"></div>
        </div>
      </div>
    </div>

    <!-- Boss + Timer row -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div id="bossChar" style="animation:bossPop .3s ease both;">${_bossSVG(52)}</div>

      <!-- Question progress -->
      <div style="text-align:center;flex:1;padding:0 .5rem;">
        <div style="font-size:.65rem;color:rgba(255,255,255,.4);margin-bottom:.25rem;">Q ${_qIdx+1} / ${_questions.length}</div>
        <div style="height:3px;background:rgba(255,255,255,.1);border-radius:9999px;">
          <div style="height:100%;width:${progress}%;background:#fbbf24;border-radius:9999px;transition:width .4s ease;"></div>
        </div>
      </div>

      <!-- Timer ring -->
      <div id="bossTimerWrap" style="position:relative;width:44px;height:44px;flex-shrink:0;">
        <svg viewBox="0 0 44 44" style="transform:rotate(-90deg);width:44px;height:44px;">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="3"/>
          <circle id="bossTimerRing" cx="22" cy="22" r="18" fill="none" stroke="#fbbf24" stroke-width="3"
            stroke-dasharray="113.1" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset .9s linear,stroke .3s;"/>
        </svg>
        <div id="bossTimerNum" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.875rem;font-weight:900;color:white;">${TIME_PER_Q}</div>
      </div>
    </div>
  </div>

  <!-- Question + Options -->
  <div style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem;">
    <div id="bossQCard" style="background:var(--bg-surface);border-radius:1rem;border:1px solid var(--border-glass);padding:1rem 1rem .875rem;animation:bossCardIn .25s ease both;">
      <p style="font-size:.9375rem;font-weight:700;color:var(--text-main);line-height:1.5;margin:0;">${_esc(q.text||q.front||'')}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:.5rem;" id="bossOptsWrap">
      ${optsHTML}
    </div>
  </div>

  <!-- Damage float layer -->
  <div id="bossDmgLayer" style="position:fixed;inset:0;pointer-events:none;z-index:400;"></div>
</div>`;

        _startTimer();
    }

    // ── Timer ────────────────────────────────────────────────────────────────
    function _startTimer() {
        _timeLeft = TIME_PER_Q;
        _answered = false;
        if (_timer) clearInterval(_timer);

        const ring    = document.getElementById('bossTimerRing');
        const numEl   = document.getElementById('bossTimerNum');
        const circ    = 113.1;

        _timer = setInterval(() => {
            _timeLeft--;
            if (numEl) numEl.textContent = Math.max(0, _timeLeft);
            if (ring)  ring.style.strokeDashoffset = circ - ((_timeLeft / TIME_PER_Q) * circ);

            // Turn red when ≤3s
            if (_timeLeft <= 3 && ring) {
                ring.style.stroke = '#ef4444';
                if (numEl) { numEl.style.color = '#ef4444'; numEl.style.animation = 'bossTimerPulse .5s ease infinite'; }
            }

            if (_timeLeft <= 0) {
                clearInterval(_timer);
                _timer = null;
                if (!_answered) _bossAnswerTimeout();
            }
        }, 1000);
    }

    // ── Answer handling ───────────────────────────────────────────────────────
    window._bossAnswer = function(idx) {
        if (_answered) return;
        _answered = true;
        if (_timer) { clearInterval(_timer); _timer = null; }

        const q       = _questions[_qIdx];
        const correct = q.correct;
        const isRight = idx === correct;
        const quick   = _timeLeft >= (TIME_PER_Q - 4); // answered within 4s

        // Style buttons
        const btns = document.querySelectorAll('.boss-opt-btn');
        btns.forEach((btn, i) => {
            btn.disabled = true;
            if (i === correct) btn.classList.add('reveal');
            if (i === idx && !isRight) btn.classList.add('wrong');
            if (i === idx && isRight)  btn.classList.add('correct');
        });

        if (isRight) {
            const dmg = DMG_CORRECT_BASE + (quick ? DMG_CORRECT_QUICK : 0);
            _bossHP = Math.max(0, _bossHP - dmg);
            _floatDamage(`-${dmg}`, '#a78bfa', 'boss');
            _shakeEl('bossChar');
            _updateHP('boss', _bossHP);
        } else {
            _playerHP = Math.max(0, _playerHP - DMG_WRONG_PLAYER);
            _floatDamage(`-${DMG_WRONG_PLAYER}`, '#ef4444', 'player');
            _shakeEl('bossTimerWrap');
            _updateHP('player', _playerHP);
        }

        // Check win/lose
        setTimeout(() => {
            if (_bossHP <= 0)     { _endFight(true); return; }
            if (_playerHP <= 0)   { _endFight(false); return; }
            if (_qIdx + 1 >= _questions.length) { _endFight(_bossHP < _playerHP); return; }
            _qIdx++;
            _renderFight();
        }, isRight ? 900 : 1100);
    };

    function _bossAnswerTimeout() {
        if (_answered) return;
        _answered = true;
        _playerHP = Math.max(0, _playerHP - DMG_WRONG_PLAYER);
        _floatDamage('TIME!', '#ef4444', 'player');
        _updateHP('player', _playerHP);
        document.querySelectorAll('.boss-opt-btn').forEach((btn, i) => {
            btn.disabled = true;
            if (i === _questions[_qIdx].correct) btn.classList.add('reveal');
        });
        setTimeout(() => {
            if (_playerHP <= 0) { _endFight(false); return; }
            if (_qIdx + 1 >= _questions.length) { _endFight(_bossHP < _playerHP); return; }
            _qIdx++;
            _renderFight();
        }, 1000);
    }

    // ── Visual helpers ────────────────────────────────────────────────────────
    function _updateHP(who, val) {
        const pct   = (val / (who === 'boss' ? BOSS_MAX : PLAYER_MAX)) * 100;
        const barId = who === 'boss' ? 'bossHPBar' : 'playerHPBar';
        const lblId = who === 'boss' ? 'bossHPLabel' : 'playerHPLabel';
        const bar   = document.getElementById(barId);
        const lbl   = document.getElementById(lblId);
        if (bar) bar.style.width = pct + '%';
        if (lbl) lbl.textContent = val;
    }

    function _shakeEl(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = id === 'bossChar'
            ? 'bossShake .4s ease'
            : 'bossPlayerShake .35s ease';
    }

    function _floatDamage(text, color, who) {
        const layer = document.getElementById('bossDmgLayer');
        if (!layer) return;
        const d = document.createElement('div');
        d.textContent = text;
        const isLeft = who === 'boss';
        d.style.cssText = `
            position:absolute;
            ${isLeft ? 'left:14%' : 'right:14%'};
            top:22%;
            font-size:1.375rem;font-weight:900;color:${color};
            text-shadow:0 2px 8px rgba(0,0,0,.4);
            animation:bossDmgFloat .9s ease forwards;
            pointer-events:none;`;
        layer.appendChild(d);
        setTimeout(() => d.remove(), 950);
    }

    // ── End screen ────────────────────────────────────────────────────────────
    function _endFight(won) {
        if (_timer) { clearInterval(_timer); _timer = null; }
        // ── Daily win cap — max 3 boss wins per day ──────────────────────
        let xp = XP_LOSE;
        if (won) {
            const today = new Date().toDateString();
            const key   = 'boss_wins_' + today;
            const wins  = parseInt(localStorage.getItem(key) || '0');
            if (wins < 3) {
                localStorage.setItem(key, wins + 1);
                xp = XP_WIN;
            } else {
                // Already maxed today — win but no XP
                xp = 0;
            }
        }
        _xpDelta = xp;

        try { if (window.addXP && xp !== 0) window.addXP(xp); } catch(e) {}
        window.commitStreakOnAction?.();

        const mv = document.getElementById('bossFightView');
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;padding:2rem 1.5rem;text-align:center;background:linear-gradient(160deg,#0f0720,#1a0a38 50%,#0f0720);">

  <div style="animation:bossWin .5s cubic-bezier(.34,1.56,.64,1) both;margin-bottom:1rem;">
    ${won
        ? `<div style="font-size:5rem;line-height:1;">🏆</div>`
        : _bossSVG(80)}
  </div>

  <h1 style="font-size:1.875rem;font-weight:900;color:white;margin:0 0 .375rem;letter-spacing:-.02em;">
    ${won ? 'Boss Defeated!' : 'Defeated!'}
  </h1>
  <p style="font-size:.9375rem;color:rgba(167,139,250,.8);margin:0 0 2rem;">
    ${won ? 'You conquered The Medicus.' : 'The Medicus was too strong.'}
  </p>

  <!-- Stats -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;width:100%;max-width:320px;margin-bottom:2rem;">
    <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:.875rem;padding:.875rem .5rem;">
      <div style="font-size:1.25rem;font-weight:900;color:${won?'#10b981':'#ef4444'};">${won?'👑':'💀'}</div>
      <div style="font-size:.625rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em;margin-top:.25rem;">${won?'Victory':'Defeat'}</div>
    </div>
    <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:.875rem;padding:.875rem .5rem;">
      <div style="font-size:1.25rem;font-weight:900;color:${xp>0?'#fbbf24':xp===0?'rgba(255,255,255,.4)':'#ef4444'};">${xp>0?'+':''}${xp===0?'—':xp+' XP'}</div>
      <div style="font-size:.625rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em;margin-top:.25rem;">${xp>0?'XP Earned':xp===0?'Daily limit':'XP Lost'}</div>
    </div>
    <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:.875rem;padding:.875rem .5rem;">
      <div style="font-size:1.25rem;font-weight:900;color:#a78bfa;">${_playerHP}</div>
      <div style="font-size:.625rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em;margin-top:.25rem;">HP Left</div>
    </div>
  </div>

  <!-- Buttons -->
  <button onclick="window._bossRematch()" style="width:100%;max-width:320px;padding:1rem;border-radius:var(--radius-btn);border:none;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;font-size:1rem;font-weight:800;cursor:pointer;margin-bottom:.75rem;">
    ${won ? 'Fight Again' : 'Try Again'}
  </button>
  <button onclick="window._bossExitToHome()" style="width:100%;max-width:320px;padding:1rem;border-radius:var(--radius-btn);border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.7);font-size:.9375rem;font-weight:600;cursor:pointer;">
    Back to Home
  </button>
</div>`;
    }

    // ── Nav ───────────────────────────────────────────────────────────────────
    window._bossConfirmExit = function() {
        // Show a quick confirmation sheet
        if (_timer) clearInterval(_timer);
        _answered = true; // pause the current question

        const sheet = document.createElement('div');
        sheet.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
        sheet.innerHTML = `
<div style="width:100%;background:var(--bg-surface);border-radius:1.25rem 1.25rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);display:flex;flex-direction:column;gap:.75rem;">
  <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0;">Quit Boss Fight?</p>
  <p style="font-size:.875rem;color:var(--text-muted);margin:0;line-height:1.5;">Your progress will be lost and you'll lose <strong style="color:#ef4444;">15 XP</strong>.</p>
  <button id="_bossQuitYes" style="width:100%;padding:.9375rem;border-radius:var(--radius-btn);border:none;background:#ef4444;color:white;font-size:1rem;font-weight:700;cursor:pointer;">Quit anyway</button>
  <button id="_bossQuitNo" style="width:100%;padding:.9375rem;border-radius:var(--radius-btn);border:1px solid var(--border-glass);background:transparent;color:var(--text-main);font-size:1rem;font-weight:600;cursor:pointer;">Keep fighting</button>
</div>`;
        document.body.appendChild(sheet);

        sheet.querySelector('#_bossQuitYes').onclick = function() {
            sheet.remove();
            try { if (window.addXP) window.addXP(-15); } catch(e) {}
            _exit();
        };
        sheet.querySelector('#_bossQuitNo').onclick = function() {
            sheet.remove();
            // Resume timer
            _answered = false;
            _startTimer();
        };
        sheet.addEventListener('click', function(e) {
            if (e.target === sheet) {
                sheet.remove();
                _answered = false;
                _startTimer();
            }
        });
    };

    window._bossRematch = function() {
        _bossStartFight((_questions[0] && window.quizzes || []).find(
            q => q.questions && q.questions.some(qq => qq === _questions[0])
        )?.id || '');
        // Simpler: just re-pick from same questions
        _qIdx=0; _bossHP=BOSS_MAX; _playerHP=PLAYER_MAX; _xpDelta=0;
        _questions = [..._questions].sort(() => Math.random()-.5);
        _renderFight();
    };

    window._bossExitToHome = function() {
        _exit();
        window.navigateTo?.('view-home');
        window.updateHomeContinueCard?.();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s||'').replace(/[&<>"']/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

})();

// PDF Page Selector
// ─────────────────────────────────────────────────────────────────────────────
// Shows a thumbnail grid of all PDF pages so users can pick which pages
// to include before quiz generation. Uses PDF.js for rendering and
// PDF-lib for reconstructing a new PDF from selected pages only.
(function () {

    let _pdfFile       = null;
    let _pdfDoc        = null;
    let _selectedPages = new Set();
    let _totalPages    = 0;

    const PDFJS_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

    function _loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    window.openPdfPageSelector = async function (file) {
        _pdfFile       = file;
        _selectedPages = new Set();
        _pdfDoc        = null;

        const mv = _getOverlay();
        mv.innerHTML = _loadingHTML(file.name);
        _show(mv);

        try {
            await _loadScript(PDFJS_CDN);
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();
            _pdfDoc     = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            _totalPages = _pdfDoc.numPages;

            for (let i = 1; i <= _totalPages; i++) _selectedPages.add(i);

            await _renderGrid(mv);
        } catch (e) {
            console.error('[PdfPageSelector]', e);
            mv.innerHTML = _errorHTML(e.message);
        }
    };

    async function _renderGrid(mv) {
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);position:sticky;top:0;z-index:5;">
    <button onclick="window._pdfSelectorBack()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-times"></i>
    </button>
    <div style="flex:1;">
      <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0;">Select pages</h2>
      <p style="font-size:0.75rem;color:var(--text-muted);margin:0;" id="pdfSelCount">${_totalPages} of ${_totalPages} selected</p>
    </div>
    <button onclick="window._pdfToggleAll()" id="pdfToggleAllBtn"
      style="font-size:0.75rem;font-weight:700;color:var(--accent-btn);background:transparent;border:none;cursor:pointer;padding:0.25rem 0.5rem;">
      Deselect all
    </button>
  </div>

  <!-- Grid -->
  <div id="pdfThumbGrid"
    style="display:grid;grid-template-columns:1fr 1fr;gap:0.875rem;padding:1rem 1rem 7rem;">
  </div>

  <!-- Footer -->
  <div style="position:fixed;bottom:0;left:0;right:0;padding:0.875rem 1.125rem calc(env(safe-area-inset-bottom,0px) + 0.875rem);background:var(--bg-body);border-top:1px solid var(--border-glass);z-index:10;">
    <button id="pdfContinueBtn" onclick="window._pdfConfirm()"
      style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:1rem;font-weight:700;cursor:pointer;">
      Continue with ${_totalPages} pages
    </button>
  </div>

</div>`;

        const grid = mv.querySelector('#pdfThumbGrid');

        for (let pageNum = 1; pageNum <= _totalPages; pageNum++) {
            const wrapper = document.createElement('div');
            wrapper.id = `pdfPage_${pageNum}`;
            wrapper.style.cssText = `
                position:relative;border-radius:0.75rem;overflow:hidden;cursor:pointer;
                border:2.5px solid var(--accent-btn);background:var(--bg-surface);
                transition:border-color 0.15s,opacity 0.15s;`;
            wrapper.onclick = () => window._pdfTogglePage(pageNum);

            // Use img tag so width:100%;height:auto correctly preserves aspect ratio
            const img = document.createElement('img');
            img.style.cssText = 'width:100%;height:auto;display:block;';
            img.alt = `Page ${pageNum}`;

            const checkEl = document.createElement('div');
            checkEl.id = `pdfCheck_${pageNum}`;
            checkEl.style.cssText = `
                position:absolute;bottom:0.5rem;right:0.5rem;
                width:1.5rem;height:1.5rem;border-radius:50%;
                background:var(--accent-btn);display:flex;align-items:center;justify-content:center;
                transition:opacity 0.15s;`;
            checkEl.innerHTML = '<i class="fas fa-check" style="font-size:0.6rem;color:white;"></i>';

            const pageLabel = document.createElement('div');
            pageLabel.style.cssText = `
                position:absolute;top:0.375rem;left:0.5rem;
                font-size:0.6rem;font-weight:700;color:white;
                background:rgba(0,0,0,0.45);padding:2px 6px;border-radius:9999px;`;
            pageLabel.textContent = pageNum;

            wrapper.appendChild(img);
            wrapper.appendChild(checkEl);
            wrapper.appendChild(pageLabel);
            grid.appendChild(wrapper);

            // Render to offscreen canvas then export as img src to preserve aspect ratio
            try {
                const page     = await _pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });
                const targetW  = 300;
                const scale    = targetW / viewport.width;
                const scaled   = page.getViewport({ scale });

                const offscreen   = document.createElement('canvas');
                offscreen.width   = Math.round(scaled.width);
                offscreen.height  = Math.round(scaled.height);
                await page.render({ canvasContext: offscreen.getContext('2d'), viewport: scaled }).promise;
                img.src = offscreen.toDataURL('image/jpeg', 0.85);
            } catch (e) {
                img.style.minHeight = '150px';
            }
        }

        _refreshUI();
    }

    window._pdfTogglePage = function (pageNum) {
        if (_selectedPages.has(pageNum)) _selectedPages.delete(pageNum);
        else _selectedPages.add(pageNum);
        _refreshUI();
    };

    window._pdfToggleAll = function () {
        if (_selectedPages.size === _totalPages) _selectedPages.clear();
        else for (let i = 1; i <= _totalPages; i++) _selectedPages.add(i);
        _refreshUI();
    };

    function _refreshUI() {
        const count = _selectedPages.size;

        const countEl = document.getElementById('pdfSelCount');
        if (countEl) countEl.textContent = `${count} of ${_totalPages} selected`;

        const toggleBtn = document.getElementById('pdfToggleAllBtn');
        if (toggleBtn) toggleBtn.textContent = count === _totalPages ? 'Deselect all' : 'Select all';

        const continueBtn = document.getElementById('pdfContinueBtn');
        if (continueBtn) {
            continueBtn.disabled       = count === 0;
            continueBtn.style.opacity  = count === 0 ? '0.45' : '1';
            continueBtn.style.cursor   = count === 0 ? 'not-allowed' : 'pointer';
            continueBtn.textContent    = count === 0
                ? 'Select at least one page'
                : `Continue with ${count} page${count !== 1 ? 's' : ''}`;
        }

        for (let i = 1; i <= _totalPages; i++) {
            const wrapper  = document.getElementById(`pdfPage_${i}`);
            const checkEl  = document.getElementById(`pdfCheck_${i}`);
            const selected = _selectedPages.has(i);
            if (wrapper) {
                wrapper.style.borderColor = selected ? 'var(--accent-btn)' : 'var(--border-glass)';
                wrapper.style.opacity     = selected ? '1' : '0.45';
            }
            if (checkEl) checkEl.style.opacity = selected ? '1' : '0';
        }
    }

    window._pdfConfirm = async function () {
        if (_selectedPages.size === 0) return;

        const btn = document.getElementById('pdfContinueBtn');
        if (btn) { btn.textContent = 'Building PDF…'; btn.disabled = true; btn.style.opacity = '0.65'; }

        try {
            const sortedPages = [..._selectedPages].sort((a, b) => a - b);
            let finalFile;

            if (sortedPages.length === _totalPages) {
                finalFile = _pdfFile;
            } else {
                await _loadScript(PDFLIB_CDN);
                const { PDFDocument } = PDFLib;

                const originalBytes = await _pdfFile.arrayBuffer();
                const srcDoc        = await PDFDocument.load(originalBytes);
                const newDoc        = await PDFDocument.create();
                const indices       = sortedPages.map(p => p - 1);
                const copied        = await newDoc.copyPages(srcDoc, indices);
                copied.forEach(page => newDoc.addPage(page));

                const newBytes = await newDoc.save();
                const blob     = new Blob([newBytes], { type: 'application/pdf' });
                const baseName = _pdfFile.name.replace(/\.pdf$/i, '');
                finalFile = new File([blob], `${baseName}_pages.pdf`, { type: 'application/pdf' });
            }

            _hide(_getOverlay());
            window._applySelectedFile(finalFile);

        } catch (e) {
            console.error('[PdfPageSelector] Confirm error:', e);
            if (btn) {
                btn.textContent = 'Something went wrong — try again';
                btn.disabled = false; btn.style.opacity = '1';
                btn.style.background = 'rgba(239,68,68,0.1)'; btn.style.color = '#f87171';
            }
            setTimeout(() => {
                if (btn) {
                    btn.style.background = 'var(--accent-btn)'; btn.style.color = 'var(--btn-text)';
                    btn.textContent = `Continue with ${_selectedPages.size} pages`;
                }
            }, 3000);
        }
    };

    window._pdfSelectorBack = function () {
        _hide(_getOverlay());
        _pdfFile = null; _pdfDoc = null; _selectedPages.clear();
    };

    function _getOverlay() {
        let mv = document.getElementById('pdfPageSelectorView');
        if (!mv) {
            mv = document.createElement('div');
            mv.id = 'pdfPageSelectorView';
            document.body.appendChild(mv);
        }
        return mv;
    }

    function _show(mv) {
        Object.assign(mv.style, {
            display:'flex', position:'fixed', inset:'0', zIndex:'350',
            background:'var(--bg-body)', flexDirection:'column', overflowY:'auto',
            opacity:'0', transform:'translateY(24px)', transition:'opacity 0.22s ease, transform 0.22s ease',
        });
        requestAnimationFrame(() => { mv.style.opacity = '1'; mv.style.transform = 'translateY(0)'; });
    }

    function _hide(mv) {
        mv.style.opacity = '0'; mv.style.transform = 'translateY(24px)';
        setTimeout(() => { mv.style.display = 'none'; mv.style.transition = ''; }, 220);
    }

    function _loadingHTML(name) {
        return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;gap:1rem;padding:2rem;">
            <div style="width:2.5rem;height:2.5rem;border:3px solid var(--border-glass);border-top-color:var(--accent-btn);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <p style="font-size:0.9375rem;font-weight:600;color:var(--text-main);margin:0;">Loading pages…</p>
            <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">${name}</p>
        </div>`;
    }

    function _errorHTML(msg) {
        return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;gap:1rem;padding:2rem;text-align:center;">
            <i class="fas fa-exclamation-circle" style="font-size:2.5rem;color:#f87171;"></i>
            <p style="font-size:0.9375rem;font-weight:600;color:var(--text-main);margin:0;">Couldn't load PDF</p>
            <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">${msg}</p>
            <button onclick="window._pdfSelectorBack()" style="margin-top:0.5rem;padding:0.75rem 1.5rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-weight:700;cursor:pointer;">Go back</button>
        </div>`;
    }

})();
