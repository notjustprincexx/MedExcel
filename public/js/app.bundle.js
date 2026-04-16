/* ── app.js ── */
/* ── js/app.js ── */
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
                const icon = isMCQ ? 'fas fa-clipboard-list' : 'fas fa-layer-group';
                const color = iconColors[i % iconColors.length];
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
            // Update recent decks in sync
            window.renderRecentDecks();
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
        window.escapeHTML = function(str) { return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
        window.getTimeEmoji = function() { const hour = new Date().getHours(); if (hour < 12) return '⛅'; if (hour < 18) return '☀️'; return '🌙'; }

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
            container.innerHTML = '';
            REFERRAL_TIERS.forEach(tier => {
                const done = referralCount >= tier.refs;
                const next = !done && (REFERRAL_TIERS.find(t => !referralCount || referralCount < t.refs)?.refs === tier.refs);
                const pct  = done ? 100 : Math.min(100, Math.round((referralCount / tier.refs) * 100));
                container.innerHTML += `
                    <div style="display:flex;align-items:center;gap:0.625rem;">
                        <div style="width:28px;height:28px;border-radius:8px;background:${done ? tier.color + '20' : 'var(--bg-surface)'};border:1px solid ${done ? tier.color + '40' : 'var(--border-color)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas ${tier.icon}" style="font-size:0.6875rem;color:${done ? tier.color : 'var(--text-muted)'};"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                                <span style="font-size:0.75rem;font-weight:${done ? '700' : '600'};color:${done ? 'var(--text-main)' : 'var(--text-muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tier.refs} referral${tier.refs>1?'s':''} — ${tier.label}</span>
                                <span style="font-size:0.7rem;font-weight:700;color:${done ? tier.color : 'var(--text-muted)'};margin-left:0.5rem;flex-shrink:0;">${done ? '✓' : referralCount + '/' + tier.refs}</span>
                            </div>
                            <div style="width:100%;height:4px;background:var(--bg-surface);border-radius:100px;overflow:hidden;border:1px solid var(--border-color);">
                                <div style="height:100%;width:${pct}%;background:${done ? tier.color : 'var(--text-muted)'};border-radius:100px;transition:width 0.5s ease;"></div>
                            </div>
                        </div>
                    </div>`;
            });
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
            const link    = `https://medxcel.web.app?ref=${code}`;
            window._userReferralCode = code;

            // Profile card
            const pCount = document.getElementById('profileReferralCount');
            if (pCount) pCount.textContent = count + ' referred';
            const pLink = document.getElementById('profileReferralLink');
            if (pLink) pLink.textContent = link || 'No code yet';
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
                window.allowedMaxItems = 30; // 2× of 15
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = '(Max: 30 — Referral Boost)';
            } else if (boostType === 'week_premium' || boostType === 'month_premium') {
                // treat as premium for limit purposes only (Groq still used — server enforces AI model)
                window.allowedMaxItems = 30;
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = '(Max: 30 — Referral Reward)';
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
                const cap  = window.userPlan === 'premium' ? 30 : maxAllowed || 5;
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
                localStorage.setItem('medexcel_theme', isLight ? 'light' : 'dark');
                window.updateThemeUI();
                window.syncStatusBar(isLight);
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
            // Daily challenges rotate by day of week
            const dailyChallenges = [
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
                const cap    = plan === 'premium' ? 30 : 5;
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
            if (!hasCheckedInToday && window.currentUser) {
                // Save check-in to history
                const uid = window.currentUser.uid;
                const history = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
                const todayStr = new Date().toDateString();
                if (!history.includes(todayStr)) {
                    history.push(todayStr);
                    // Keep only last 90 days
                    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
                    const trimmed = history.filter(d => new Date(d) >= cutoff);
                    localStorage.setItem('medexcel_checkin_history_' + uid, JSON.stringify(trimmed));
                }
                window.userStats.count = currentStreakCount;
                window.userStats.lastDate = todayStr;
                localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));
                hasCheckedInToday = true;
                if (window.syncUserStreak) window.syncUserStreak(uid, currentStreakCount, todayStr);
            }
            window.closeGlobalModal('streakModalBackdrop');
            const hDisplay = document.getElementById('headerStreakDisplay');
            if (hDisplay) hDisplay.textContent = currentStreakCount;
            const hIcon = document.getElementById('headerFireIcon');
            if (hIcon) hIcon.style.opacity = '1';
            if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();
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
            const totalXP = isMCQSession ? examScore * 10 + 20 : (currentQuiz.questions ? currentQuiz.questions.length * 5 : 20);
            window.addXP(totalXP);

            if (!currentQuiz.stats) currentQuiz.stats = { bestScore: 0, attempts: 0, lastScore: 0 };
            currentQuiz.stats.attempts++;
            currentQuiz.stats.lastScore = examScore;
            if (examScore > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = examScore;

            if (window.currentUser) {
                try {
                    const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                    await updateDoc(doc(window.db, "users", window.currentUser.uid, "quizzes", currentQuiz.id.toString()), { stats: currentQuiz.stats });
                    localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes));
                } catch(e) { console.error("Cloud stats sync failed", e); }
            }

            const area = document.getElementById('studyPracticeArea');
            const total = currentQuiz.questions ? currentQuiz.questions.length : 0;
            const percentage = total > 0 ? Math.round((examScore / total) * 100) : 100;
            let stars = 1; if (percentage >= 80) stars = 3; else if (percentage >= 50) stars = 2;
            const starsHTML = [1,2,3].map(s => `<i class="fas fa-star" style="font-size:1.75rem;color:${s <= stars ? 'var(--accent-yellow)' : 'var(--border-color)'};filter:${s <= stars ? 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' : 'none'};"></i>`).join('');

            area.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;width:100%;padding:2rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);box-sizing:border-box;max-width:500px;margin:0 auto;" class="fade-in">
                    <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">${starsHTML}</div>
                    <h2 style="font-size:1.75rem;font-weight:800;color:var(--text-main);margin-bottom:0.5rem;text-align:center;">${isMCQSession ? 'Quiz Complete!' : 'Review Complete!'}</h2>
                    <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:2rem;">${currentQuiz.title}</p>
                    <div style="display:flex;gap:0.75rem;width:100%;margin-bottom:2.5rem;">
                        ${isMCQSession ? `
                        <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Score</div>
                            <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);">${examScore}<span style="font-size:0.9rem;color:var(--text-muted);font-weight:500;"> / ${total}</span></div>
                        </div>
                        <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Accuracy</div>
                            <div style="font-size:1.75rem;font-weight:800;color:${percentage >= 80 ? 'var(--accent-green)' : percentage >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'};">${percentage}%</div>
                        </div>` : `
                        <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Cards Reviewed</div>
                            <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);">${total}</div>
                        </div>`}
                        <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                            <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">XP Earned</div>
                            <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);"><i class="fas fa-bolt" style="color:var(--accent-yellow);font-size:1.25rem;"></i> ${totalXP}</div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.75rem;width:100%;margin-top:auto;">
                        <button onclick="window.startPractice(false)" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:none;background:var(--accent-btn);color:var(--btn-text);">Try Again</button>
                        <button onclick="window.closePracticeMobile()" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);">Back to Library</button>
                    </div>
                </div>
            `;
        }

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
            
            // Reset state
            window.selectedFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('uploadIcon').innerHTML = `<i class="fas fa-cloud-upload-alt"></i>`;
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
            itemSlider.addEventListener('input', (e) => {
                let val = parseInt(e.target.value, 10);
                if (val > window.allowedMaxItems) {
                    sliderValue.innerHTML = `${val} <i class="fas fa-lock" style="font-size: 10px;"></i>`;
                    sliderValue.style.color = 'var(--accent-yellow)';
                    sliderValue.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                } else {
                    sliderValue.textContent = val;
                    sliderValue.style.color = 'var(--text-main)';
                    sliderValue.style.borderColor = 'var(--border-glass)';
                }
            });
            itemSlider.addEventListener('change', async (e) => {
                let val = parseInt(e.target.value, 10);
                if (val > window.allowedMaxItems) {
                    const wantToUpgrade = await window.showCustomUpgradeModal(window.allowedMaxItems);
                    if (wantToUpgrade) window.navigateTo('view-payment');
                    else { 
                        e.target.value = window.allowedMaxItems; 
                        sliderValue.textContent = window.allowedMaxItems; 
                        sliderValue.style.color = 'var(--text-main)';
                        sliderValue.style.borderColor = 'var(--border-glass)';
                    }
                }
            });
        }

        const fileInput = document.getElementById('fileInput');
        if(fileInput) {
            fileInput.addEventListener('click', (e) => { if (!window.currentUser) { e.preventDefault(); window.showLoginModal(); } });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 10 * 1024 * 1024) { alert("File is too large. Maximum size is 10MB."); fileInput.value = ''; return; }
                    window.selectedFile = file;
                    document.getElementById('uploadIcon').innerHTML = `<i class="fas fa-file-check" style="color: var(--accent-btn);"></i>`;
                    document.getElementById('uploadTitle').innerHTML = `<span style="color: var(--accent-btn);">${window.escapeHTML(file.name)}</span>`;
                    
                    document.getElementById('dropZone').style.borderColor = 'var(--border-active)';
                    document.getElementById('dropZone').classList.add('file-selected');
                    document.getElementById('configSection').style.opacity = '1';
                    document.getElementById('configSection').style.pointerEvents = 'auto';
                    
                    const btn = document.getElementById('generateBtn');
                    btn.disabled = false;
                    btn.style.background = 'var(--accent-btn)';
                    btn.style.color = 'var(--btn-text)';
                    btn.style.cursor = 'pointer';
                }
            });
        }
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
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 2rem;">CLAIM XP</button>
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
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 2rem;">CLAIM XP</button>
                    </div>`;
            }
            viewContainer.innerHTML = html;
            window.animateValue("animatedXP", 0, window.finalEarnedXP, 1500);
            if (isMCQMode) window.animateValue("animatedAcc", 0, percentage, 1500);
        }
        
        window.claimAndContinue = async function() {
            const btn = document.querySelector('.btn-claim-xp');
            btn.textContent = "CLAIMING..."; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7';
            try { await window.addXP(window.finalEarnedXP); } catch(e) {}
            window.goBackToSelection();
            window.navigateTo('view-home');
            window.updateHomeContinueCard();
        }

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

        window.switchPayPlan = function(plan) {
            try {
                _payCurrentPlan = plan;
                var cM = document.getElementById('pCardMonthly'), cY = document.getElementById('pCardYearly');
                var dealBox = document.getElementById('payDealBox'), ctaEl = document.getElementById('payCTABtn');
                if (!cM || !cY) return;
                if (plan === 'monthly') {
                    cM.classList.add('active'); cY.classList.remove('active');
                    if (dealBox) dealBox.style.display = 'none';
                    clearInterval(_payCdInterval);
                    if (ctaEl) ctaEl.textContent = 'Subscribe Monthly — ₦1,999';
                } else {
                    cM.classList.remove('active'); cY.classList.add('active');
                    if (dealBox) { dealBox.style.display = 'flex'; clearInterval(_payCdInterval); _payTick(); _payCdInterval = setInterval(_payTick, 1000); }
                    if (ctaEl) ctaEl.textContent = 'Subscribe Yearly — ₦17,999';
                }
            } catch(e) { console.warn('switchPayPlan error:', e); }
        };

        window.handlePayCTA = function() {
            try {
                if (_payCurrentPlan === 'monthly') window.startPayment('premium');
                else window.startPayment('premium_yearly');
            } catch(e) { console.warn('handlePayCTA error:', e); }
        };

        // --- PAYMENT UI LOGIC ---
        window.openPaymentModal = function(url) {
            const modal = document.getElementById('paymentModalOverlay');
            const sheet = document.getElementById('paymentSheet');
            const iframe = document.getElementById('paystackIframe');
            iframe.src = url;
            modal.style.display = 'flex';
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

        window.startPayment = function(plan) {
            if (!window.currentUser) { window.showLoginModal(); return; }
            if (plan === "free") { navigateTo("view-home"); return; }

            var displayName = window.currentUser.displayName || window.currentUser.email.split("@")[0] || "";
            var nameParts = displayName.trim().split(" ");
            var firstName = nameParts[0] || "User";
            var lastName  = nameParts.slice(1).join(" ") || ".";
            var email     = window.currentUser.email || "";

            var amounts = {
                premium:         199900,
                premium_monthly: 199900,
                premium_yearly:  1799900,
                elite:           299900
            };
            var amount = amounts[plan];
            if (!amount) return;

            var ref = "medx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

            try {
                var handler = PaystackPop.setup({
                    key:        "pk_live_8d46f32e2edd6f6605c6c0e513e77baabb856dda",
                    email:      email,
                    first_name: firstName,
                    last_name:  lastName,
                    amount:     amount,
                    currency:   "NGN",
                    ref:        ref,
                    channels:   ['card'],
                    metadata:   { uid: window.currentUser.uid || "", plan: plan },
                    onSuccess: function(transaction) {
                        try {
                            if (window.db && window.currentUser && window.currentUser.uid) {
                                var newPlan = (plan === "premium_yearly") ? "premium" : plan.replace("_monthly", "");
                                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
                                    .then(function(m) {
                                        m.updateDoc(m.doc(window.db, "users", window.currentUser.uid), {
                                            plan: newPlan, planRef: transaction.reference, planUpdatedAt: new Date().toISOString()
                                        }).catch(function(){});
                                    }).catch(function(){});
                                window.userPlan = newPlan;
                                window.updatePlanIcon(window.userPlan);
                            }
                        } catch(e) {}
                        var btn = document.getElementById('payCTABtn');
                        if (btn) { btn.textContent = "✓ You're Premium!"; btn.style.background = "var(--accent-green)"; btn.style.color = "#000"; }
                        setTimeout(function() { navigateTo('view-home'); }, 1800);
                    },
                    onCancel: function() {}
                });
                handler.openIframe();
            } catch(err) {
                console.error("Paystack error:", err);
                window.openPaymentModal(plan === "elite" ? "https://paystack.shop/pay/lw17s2ggpj" : "https://paystack.shop/pay/5wqjry1l0a");
            }
        };

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
        };