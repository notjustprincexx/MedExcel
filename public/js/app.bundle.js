        window.userStats = JSON.parse(localStorage.getItem('medexcel_user_stats')) || { xp: 0, level: 1, streak: 0, count: 0, lastDate: null };
        window.quizzes = [];
        window.userPlan = "free";
        window.allowedMaxItems = 20;

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

            const recent = quizzes.slice().reverse().slice(0, 3);
            const iconColors = ['bg-purple-500/10 text-purple-400', 'bg-pink-500/10 text-pink-400', 'bg-blue-500/10 text-blue-400'];
            const icons = ['fas fa-layer-group', 'fas fa-cards-blank', 'fas fa-brain'];

            container.innerHTML = recent.map((quiz, i) => {
                if (quiz._pending) {
                    return `<div class="flex items-center justify-between bg-[var(--bg-surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border-glass)]" style="overflow:hidden;">
                        <div class="flex items-center min-w-0" style="flex:1;">
                            <div class="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mr-4 shrink-0" style="animation:_skelPulse 1.3s ease-in-out infinite;">
                                <i class="fas fa-spinner" style="color:var(--accent-btn);animation:spin 1s linear infinite;"></i>
                            </div>
                            <div class="flex flex-col min-w-0" style="flex:1;">
                                <span class="text-[15px] font-bold text-[var(--text-main)] truncate">${window.escapeHTML(quiz.title || 'Generating…')}</span>
                                <span class="text-[12px] text-[var(--text-muted)]" style="animation:_skelPulse 1.3s ease-in-out infinite;">Generating your quiz…</span>
                            </div>
                        </div>
                    </div>`;
                }
                const isMCQ = quiz.type && quiz.type.includes('Multiple');
                const count = quiz.questions ? quiz.questions.length : 0;
                const best = quiz.stats ? quiz.stats.bestScore : 0;
                const attempts = quiz.stats ? quiz.stats.attempts : 0;
                const pct = count > 0 && attempts > 0 ? Math.round((best / count) * 100) : null;
                const pctLabel = pct === null ? 'New' : `+${pct}%`;
                const pctColor = pct === null ? 'var(--accent-btn)' : pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--text-muted)';
                const isMCQIcon = isMCQ;
                const label = isMCQ ? 'Questions' : 'Cards';

                return `<a href="javascript:void(0)" onclick="(function(){navigateTo('view-study');setTimeout(function(){if(window.loadQuizOverview)window.loadQuizOverview(${JSON.stringify(quiz.id)});},80);})()"
                    class="flex items-center justify-between bg-[var(--bg-surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border-glass)]">
                    <div class="flex items-center min-w-0">
                        <div class="mr-4 shrink-0" style="width:40px;height:40px;">
                            ${isMCQIcon
                                ? '<svg width="40" height="40" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A855F7"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient><linearGradient id="rfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7E22CE"/><stop offset="100%" stop-color="#581C87"/></linearGradient><linearGradient id="rw3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E2E8F0"/></linearGradient><filter id="rds"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#4C1D95" flood-opacity="0.15"/></filter><filter id="res"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#581C87" flood-opacity="0.3"/></filter></defs><path d="M 140 60 H 300 L 420 180 V 420 Q 420 460 380 460 H 140 Q 100 460 100 420 V 100 Q 100 60 140 60 Z" fill="url(#rdg)" filter="url(#rds)"/><path d="M 300 60 V 140 Q 300 180 340 180 H 420 Z" fill="url(#rfg)"/><path d="M 140 62 H 298 M 102 100 V 420" stroke="#D8B4FE" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5"/><g filter="url(#res)" fill="url(#rw3)"><circle cx="180" cy="180" r="28"/><rect x="230" y="166" width="110" height="28" rx="14"/><circle cx="180" cy="260" r="28"/><rect x="230" y="246" width="110" height="28" rx="14"/><circle cx="180" cy="340" r="28"/><rect x="230" y="326" width="110" height="28" rx="14"/></g></svg>'
                                : '<svg width="40" height="40" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="416" height="416" rx="96" fill="#7C3AED"/><rect x="120" y="140" width="168" height="232" rx="32" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 204 256)"/><rect x="216" y="128" width="168" height="232" rx="32" fill="#FFFFFF" transform="rotate(18 300 244)"/></svg>'
                            }
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
            if (typeof window.renderStudyFocusCard === 'function') window.renderStudyFocusCard();
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
                const attempted = window.quizzes.filter(q => q.stats && q.stats.attempts > 0);
                const lastAttempted = attempted.length > 0
                    ? attempted.reduce((a, b) => {
                        const ta = a.stats?.lastAttemptedAt ? new Date(a.stats.lastAttemptedAt).getTime() : a.id;
                        const tb = b.stats?.lastAttemptedAt ? new Date(b.stats.lastAttemptedAt).getTime() : b.id;
                        return ta > tb ? a : b;
                      })
                    : null;
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
                    ? '<svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A855F7"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient><linearGradient id="cfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7E22CE"/><stop offset="100%" stop-color="#581C87"/></linearGradient><linearGradient id="cw3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E2E8F0"/></linearGradient><filter id="cds"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#4C1D95" flood-opacity="0.15"/></filter><filter id="ces"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#581C87" flood-opacity="0.25"/></filter></defs><path d="M 140 60 H 300 L 420 180 V 420 Q 420 460 380 460 H 140 Q 100 460 100 420 V 100 Q 100 60 140 60 Z" fill="url(#cdg)" filter="url(#cds)"/><path d="M 300 60 V 140 Q 300 180 340 180 H 420 Z" fill="url(#cfg)"/><path d="M 140 62 H 298 M 102 100 V 420" stroke="#D8B4FE" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5"/><g filter="url(#ces)" fill="url(#cw3)"><circle cx="180" cy="180" r="28"/><rect x="230" y="166" width="110" height="28" rx="14"/><circle cx="180" cy="260" r="28"/><rect x="230" y="246" width="110" height="28" rx="14"/><circle cx="180" cy="340" r="28"/><rect x="230" y="326" width="110" height="28" rx="14"/></g></svg>'
                    : '<svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="416" height="416" rx="96" fill="#7C3AED"/><rect x="120" y="140" width="168" height="232" rx="32" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 204 256)"/><rect x="216" y="128" width="168" height="232" rx="32" fill="#FFFFFF" transform="rotate(18 300 244)"/></svg>';
                cIconBox.style.color = isMCQ ? '#8b5cf6' : '#60a5fa';
                cTitle.textContent = lastQuiz.title || 'Untitled';

                if (attempts === 0) {
                    cProgress.textContent = `${totalQs} items`;
                    cProgress.style.background = 'rgba(139,92,246,0.1)';
                    cProgress.style.color = 'var(--accent-btn)';
                    cMeta.innerHTML = `<span>${lastQuiz.subject || 'GENERAL'}</span> • <span>Not started</span>`;
                } else if (isMCQ) {
                    const lastPct = totalQs > 0 ? Math.round((lastScore / totalQs) * 100) : 0;
                    const bestPct = totalQs > 0 ? Math.round((bestScore / totalQs) * 100) : 0;
                    cProgress.textContent = `${lastPct}%`;
                    cProgress.style.background = lastPct >= 80 ? 'rgba(52,211,153,0.12)' : lastPct >= 50 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)';
                    cProgress.style.color = lastPct >= 80 ? 'var(--accent-green)' : lastPct >= 50 ? 'var(--accent-yellow)' : '#f87171';
                    cMeta.innerHTML = `<span>Best: ${bestPct}%</span> • <span>${attempts} attempt${attempts !== 1 ? 's' : ''}</span>`;
                } else {
                    cProgress.textContent = `${totalQs} cards`;
                    cProgress.style.background = 'rgba(96,165,250,0.12)';
                    cProgress.style.color = '#60a5fa';
                    cMeta.innerHTML = `<span>Reviewed ${attempts}×</span> • <span>${lastQuiz.subject || 'GENERAL'}</span>`;
                }
            } else {
                cIconBox.innerHTML = '<svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="416" height="416" rx="96" fill="#7C3AED"/><rect x="120" y="140" width="168" height="232" rx="32" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 204 256)"/><rect x="216" y="128" width="168" height="232" rx="32" fill="#FFFFFF" transform="rotate(18 300 244)"/></svg>';
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

        function navigateTo(targetViewId) {
            document.querySelectorAll('.app-view').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });

            const target = document.getElementById(targetViewId);
            if (target) {
                target.classList.add('active');
                target.style.display = 'flex';
            } else {
                console.error("View not found: " + targetViewId);
            }

            const nav = document.getElementById('globalBottomNav');
            if (nav) {
                if (targetViewId === 'view-payment') {
                    nav.classList.add('hidden');
                } else {
                    nav.classList.remove('hidden');
                    updateNavIcons(targetViewId);
                }
            }

            try {
                if (targetViewId === 'view-study' && typeof window.renderLibrary === 'function') window.renderLibrary();
                if (targetViewId === 'view-profile' && typeof window.updateThemeUI === 'function') window.updateThemeUI();
                if (targetViewId === 'view-create' && typeof window.goBackToSelection === 'function') window.goBackToSelection();
                if (targetViewId === 'view-payment' && typeof window.loadGeoPricing === 'function') window.loadGeoPricing();
            } catch(e) { console.warn("View init skipped:", e); }

            window.scrollTo(0, 0);
            try { history.pushState(null, null, '#' + targetViewId.replace('view-', '')); }
            catch(e) { window.location.hash = targetViewId.replace('view-', ''); }
        }

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

        window.addEventListener('DOMContentLoaded', initRouter);
        window.addEventListener('popstate', initRouter);

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

        window.updatePlanIcon = function(plan) {
            const freeCard    = document.getElementById('planCardFree');
            const premCard    = document.getElementById('planCardPremium');
            const expiryLbl   = document.getElementById('subscriptionExpiryLabel');
            const iconEl      = document.getElementById('planIcon');

            if (plan === 'premium' || plan === 'premium_trial' || plan === 'elite') {
                if (freeCard) freeCard.style.display = 'none';
                if (premCard) premCard.style.display = 'block';
                const usageFree = document.getElementById('usageCount')?.textContent || '0';
                const premUsage = document.getElementById('usageCountPremium');
                const premBar   = document.getElementById('usageProgressBarPremium');
                const premMax   = document.getElementById('maxLimitDisplayPremium');
                if (premUsage) premUsage.textContent = usageFree;
                if (premMax)   premMax.textContent   = '30';
                if (premBar)   premBar.style.width   = `${Math.min(100, (parseInt(usageFree) / 30) * 100)}%`;
                const expiry = window._cachedUserData?.subscriptionExpiry;
                if (expiryLbl && expiry) {
                    const d = new Date(expiry);
                    expiryLbl.textContent = `Renews ${d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}`;
                } else if (expiryLbl) {
                    expiryLbl.textContent = 'Premium active';
                }
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

            const planBadge = document.getElementById('planBadgeText');
            if (planBadge) planBadge.textContent = plan === 'premium' ? 'Premium' : 'Free';
        };

        window.showCancelSubscriptionSheet = function() {
            const expiry = window._cachedUserData?.subscriptionExpiry;
            const expiryStr = expiry
                ? new Date(expiry).toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' })
                : 'the end of your billing period';

            const sheet = document.createElement('div');
            sheet.id = 'cancelSubscriptionSheet';
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
                    <button onclick="document.getElementById('cancelSubscriptionSheet').remove()" style="width:100%;padding:0.9375rem;border-radius:9999px;border:none;background:var(--bg-body);color:var(--text-muted);font-size:0.9375rem;font-weight:600;cursor:pointer;">
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
                    if (window._cachedUserData) {
                        window._cachedUserData.subscriptionCancelled = true;
                        if (result.data.expiresAt) {
                            window._cachedUserData.subscriptionExpiry = result.data.expiresAt;
                        }
                    }
                    document.getElementById('cancelSubscriptionSheet')?.remove();
                    const expiryForToast = result.data.expiresAt || window._cachedUserData?.subscriptionExpiry;
                    const expiryLabel = expiryForToast
                        ? `until ${new Date(expiryForToast).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}`
                        : 'until your billing period ends';
                    const t = document.createElement('div');
                    t.textContent = `✓ Subscription cancelled. Access continues ${expiryLabel}.`;
                    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.8rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;';
                    document.body.appendChild(t);
                    setTimeout(() => t.remove(), 5000);
                    if (typeof window.updatePlanIcon === 'function') window.updatePlanIcon(window.userPlan);
                    const cancelBtn = document.querySelector('#subscriptionManageRow button');
                    if (cancelBtn) { cancelBtn.textContent = 'Cancelled'; cancelBtn.style.color = 'var(--text-muted)'; cancelBtn.disabled = true; }
                }
            } catch(e) {
                console.error('Cancel subscription error:', e);
                if (e.code === 'functions/failed-precondition') {
                    if (window._cachedUserData) window._cachedUserData.subscriptionCancelled = true;
                    document.getElementById('cancelSubscriptionSheet')?.remove();
                    const expiryForToast = window._cachedUserData?.subscriptionExpiry;
                    const expiryLabel = expiryForToast
                        ? `until ${new Date(expiryForToast).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}`
                        : 'until your billing period ends';
                    const t = document.createElement('div');
                    t.textContent = `✓ Subscription cancelled. Access continues ${expiryLabel}.`;
                    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:white;padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.8rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;';
                    document.body.appendChild(t);
                    setTimeout(() => t.remove(), 5000);
                    if (typeof window.updatePlanIcon === 'function') window.updatePlanIcon(window.userPlan);
                    const cancelBtn = document.querySelector('#subscriptionManageRow button');
                    if (cancelBtn) { cancelBtn.textContent = 'Cancelled'; cancelBtn.style.color = 'var(--text-muted)'; cancelBtn.disabled = true; }
                } else {
                    btn.textContent = 'Failed — try again';
                    btn.disabled = false;
                }
            }
        };

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
                if (window.currentUser) {
                    try {
                        const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js");
                        const fns = getFunctions(window.auth?.app, "us-central1");
                        await httpsCallable(fns, "deleteUserData")();
                    } catch(e) { console.warn("[DeleteAccount] Firestore cleanup failed:", e.message); }
                }
                if (window.currentUser) {
                    try {
                        await window.currentUser.delete();
                    } catch(e) {
                        if (e.code === 'auth/requires-recent-login') {
                            if (btn) { btn.textContent = 'Delete My Account'; btn.disabled = false; btn.style.opacity = '1'; }
                            alert("For security, please sign out and sign back in before deleting your account.");
                            return;
                        }
                        throw e;
                    }
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

function _showLegalSheet(title, htmlContent) {
            const sheetId = 'legalSheet_' + Date.now();
            const sheet = document.createElement('div');
            sheet.id = sheetId;
            sheet.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
            sheet.innerHTML = `
                <div style="width:100%;max-height:88vh;background:var(--bg-surface);border-radius:1.5rem 1.5rem 0 0;display:flex;flex-direction:column;overflow:hidden;">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:1.125rem 1.25rem;border-bottom:1px solid var(--border-color);flex-shrink:0;">
                        <h3 style="font-size:1rem;font-weight:800;color:var(--text-main);margin:0;">${title}</h3>
                        <button id="legalCloseBtn_${sheetId}" style="background:var(--bg-body);border:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);font-size:1.125rem;line-height:1;">×</button>
                    </div>
                    <div style="overflow-y:auto;padding:1.25rem;flex:1;-webkit-overflow-scrolling:touch;">
                        ${htmlContent}
                    </div>
                </div>`;
            document.body.appendChild(sheet);
            document.getElementById('legalCloseBtn_' + sheetId).addEventListener('click', () => sheet.remove());
            sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
        }

        const _termsHTML = `
            <div style="font-size:0.8125rem;color:var(--text-main);line-height:1.75;">
                <p style="color:var(--text-muted);margin-bottom:1.25rem;">Last updated: April 2025</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">1. Acceptance of Terms</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">By creating an account or using MedExcel, you agree to these Terms. If you do not agree, please do not use the app.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">2. Description of Service</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">MedExcel is an AI-powered study platform designed to help medical students create flashcards and practice questions from their study materials. MedExcel is intended for educational purposes only.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">3. Medical Disclaimer</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">Content generated by MedExcel is AI-generated and intended solely for study purposes. It does not constitute medical advice, diagnosis, or treatment. Always consult qualified medical professionals for clinical decisions.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">4. User Accounts</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">You are responsible for maintaining the security of your account. You must be at least 16 years old to use MedExcel. You agree not to share your account with others or use another user's account.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">5. Subscriptions & Payments</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">Paid plans are processed via Paystack. Premium plans are auto-renewing subscriptions — your payment method is automatically charged at the start of each billing period until you cancel. You may cancel at any time from your Account settings; cancelling stops the next renewal and your premium access continues until the end of the period you have already paid for. We do not offer refunds for partially used billing periods. If a renewal payment fails, your account is downgraded to the free plan until payment is retried successfully.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">6. Acceptable Use</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">You agree not to share your account, attempt to reverse-engineer the app, upload harmful or copyrighted content, or use the app for any purpose other than personal study.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">7. Intellectual Property</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">MedExcel and its content, design, and code are owned by MedExcel. You retain ownership of the study materials you upload. You grant MedExcel a limited licence to process your uploads solely to provide the service.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">8. Limitation of Liability</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">MedExcel is provided "as is". We are not liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the 3 months prior to any claim.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">9. Changes to Terms</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">We may update these Terms from time to time. Continued use of MedExcel after changes constitutes acceptance of the updated Terms.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">10. Governing Law</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">These Terms are governed by the laws of the Federal Republic of Nigeria.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">11. Contact</h4>
                <p style="color:var(--text-muted);margin-bottom:0;">Questions? Contact us at medexcel.app@gmail.com.</p>
            </div>`;

        const _privacyHTML = `
            <div style="font-size:0.8125rem;color:var(--text-main);line-height:1.75;">
                <p style="color:var(--text-muted);margin-bottom:1.25rem;">Last updated: April 2025</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">1. What We Collect</h4>
                <ul style="color:var(--text-muted);margin:0 0 1rem 1.25rem;padding:0;">
                    <li style="margin-bottom:0.3rem;"><strong style="color:var(--text-main);">Account data</strong> — name, email, profile photo</li>
                    <li style="margin-bottom:0.3rem;"><strong style="color:var(--text-main);">Study data</strong> — quizzes, flashcards, XP, streaks, usage stats</li>
                    <li style="margin-bottom:0.3rem;"><strong style="color:var(--text-main);">Uploaded content</strong> — temporarily stored, deleted immediately after processing</li>
                    <li style="margin-bottom:0.3rem;"><strong style="color:var(--text-main);">Payment references</strong> — transaction IDs only, no card details</li>
                    <li style="margin-bottom:0.3rem;"><strong style="color:var(--text-main);">Device data</strong> — FCM tokens for push notifications</li>
                </ul>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">2. How We Use Your Data</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">To provide and improve MedExcel, process payments, send study reminders and security notifications, and respond to support. We do not use your data for advertising.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">3. Data Storage</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">Stored on Google Firebase (Firestore & Firebase Storage) with enterprise-grade security. Uploaded files are permanently deleted immediately after quiz generation.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">4. Third-Party Services</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">Google Firebase, Paystack, Google Gemini, Groq AI, and Google Cloud Text-to-Speech. We share only the minimum data necessary with each.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">5. We Never Sell Your Data</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">We do not sell, rent, or trade your personal information to any third party.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">6. Your Rights (NDPR)</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">You have the right to access, correct, or delete your data. Delete your account anytime from the Profile page — all data is permanently removed within 30 days.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">7. Data Retention</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">Data is retained while your account is active. Deletion removes all associated data within 30 days.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">8. Children</h4>
                <p style="color:var(--text-muted);margin-bottom:1rem;">MedExcel is not intended for users under 16. We do not knowingly collect data from children under 16.</p>

                <h4 style="font-weight:700;margin-bottom:0.5rem;">9. Contact</h4>
                <p style="color:var(--text-muted);margin-bottom:0;">Privacy questions? Contact us at medexcel.app@gmail.com.</p>
            </div>`;

        window.showTerms = function() { _showLegalSheet('Terms of Service', _termsHTML); };
        window.showPrivacyPolicy = function() { _showLegalSheet('Privacy Policy', _privacyHTML); };

        window._showOnboardingTerms = function() { window.location.href = 'terms.html'; };
        window._showOnboardingPrivacy = function() { window.location.href = 'privacy.html'; };

        window.showContactSupport = function() {
            const user = window._cachedUserData || {};
            const userEmail = window.currentUser?.email || '';

            document.getElementById('contactSupportSheet')?.remove();

            const sheet = document.createElement('div');
            sheet.id = 'contactSupportSheet';
            sheet.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
            sheet.innerHTML = `
                <div style="width:100%;max-height:92vh;background:var(--bg-surface);border-radius:1.5rem 1.5rem 0 0;display:flex;flex-direction:column;overflow:hidden;">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:1.125rem 1.25rem;border-bottom:1px solid var(--border-color);flex-shrink:0;">
                        <h3 style="font-size:1rem;font-weight:800;color:var(--text-main);margin:0;">Contact Support</h3>
                        <button id="supportCloseBtn" style="background:var(--bg-body);border:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);font-size:1.25rem;line-height:1;">×</button>
                    </div>
                    <div style="overflow-y:auto;padding:1.25rem;flex:1;-webkit-overflow-scrolling:touch;">
                        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1.25rem;line-height:1.55;">We typically respond within 24–48 hours. A confirmation will be sent to your email.</p>

                        <div style="margin-bottom:1rem;">
                            <label style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:0.375rem;">Category</label>
                            <select id="supportCategory" style="width:100%;padding:0.75rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);background:var(--bg-body);color:var(--text-main);font-size:0.875rem;font-weight:600;outline:none;-webkit-appearance:none;">
                                <option value="Bug Report">Bug Report</option>
                                <option value="Billing & Subscription">Billing & Subscription</option>
                                <option value="Account Issue">Account Issue</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="AI Generation Issue">AI Generation Issue</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div style="margin-bottom:1rem;">
                            <label style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:0.375rem;">Message</label>
                            <textarea id="supportMessage" placeholder="Describe your issue in detail..." style="width:100%;min-height:140px;padding:0.875rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);background:var(--bg-body);color:var(--text-main);font-size:0.875rem;line-height:1.6;outline:none;resize:none;font-family:inherit;box-sizing:border-box;"></textarea>
                        </div>

                        <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1.25rem;">Sending as: <strong style="color:var(--text-main);">${userEmail || 'your account email'}</strong></p>

                        <button id="supportSendBtn" onclick="window._submitSupportForm()" style="width:100%;padding:1rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:0.9375rem;font-weight:700;cursor:pointer;">Send Message</button>
                    </div>
                </div>`;

            document.body.appendChild(sheet);
            document.getElementById('supportCloseBtn').addEventListener('click', () => sheet.remove());
            sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
        };

        window._submitSupportForm = async function() {
            const btn = document.getElementById('supportSendBtn');
            const message = document.getElementById('supportMessage')?.value?.trim();
            const category = document.getElementById('supportCategory')?.value;

            if (!message || message.length < 10) {
                document.getElementById('supportMessage').style.borderColor = '#f87171';
                return;
            }

            btn.textContent = 'Sending…';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            try {
                const user = window._cachedUserData || {};
                let _supToken = '';
                try { _supToken = await window.currentUser.getIdToken(); } catch(_) {}
                const res = await fetch('https://us-central1-medxcel.cloudfunctions.net/sendSupportEmail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _supToken },
                    body: JSON.stringify({
                        name: user.displayName || user.nickname || '',
                        email: window.currentUser?.email || '',
                        uid: window.currentUser?.uid || '',
                        category,
                        message
                    })
                });

                const data = await res.json();

                if (data.success) {
                    document.getElementById('contactSupportSheet')?.remove();
                    const toast = document.createElement('div');
                    toast.textContent = "Message sent. We'll get back to you soon.";
                    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--bg-surface);color:var(--text-main);padding:0.875rem 1.25rem;border-radius:9999px;font-size:0.8rem;font-weight:600;z-index:9999;border:1px solid rgba(52,211,153,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.3);white-space:nowrap;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 4000);
                } else {
                    throw new Error(data.error || 'Failed');
                }
            } catch(e) {
                btn.textContent = 'Failed — try again';
                btn.disabled = false;
                btn.style.opacity = '1';
                console.error('Support email error:', e);
            }
        };

        window.getInitial = function(name) { return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'; }

        const _errorLogCache = new Map();
        window.logClientError = async function(source, error, context = {}) {
            try {
                const message = error?.message || String(error);
                const cacheKey = source + ':' + message.substring(0, 60);
                const now = Date.now();
                if (_errorLogCache.has(cacheKey) && (now - _errorLogCache.get(cacheKey)) < 5 * 60 * 1000) return;
                _errorLogCache.set(cacheKey, now);

                if (!window.db || !window._addDoc || !window._collection) return;
                const { _addDoc, _collection, db } = window;
                await _addDoc(_collection(db, 'errorLogs'), {
                    source,
                    message,
                    uid: window.currentUser?.uid || null,
                    context,
                    platform: 'client',
                    userAgent: navigator.userAgent.substring(0, 100),
                    count: 1,
                    firstSeen: now,
                    lastSeen: now,
                    resolved: false,
                });
            } catch(e) {  }
        };
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

        window.refreshGensRemaining = function() {
            const label = document.getElementById('gensRemainingLabel');
            if (!label) return;
            const cap  = (window.userPlan === 'premium' || window.userPlan === 'premium_trial') ? 30 : 5;
            const used = parseInt(document.getElementById('usageCount')?.textContent || '0');
            label.textContent = Math.max(0, cap - used);
        };

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

        const REFERRAL_SHARE_MESSAGE = (code, link) =>
            `🩺 I've been using MedExcel to study smarter — it generates MCQs and flashcards from my notes using AI.\n\nDownload the app and enter my code *${code}* when signing up — we both get rewards!\n\nGet MedExcel: ${link}`;

        window.shareReferralLink = async function(source) {
            const code = window._userReferralCode || '';
            if (!code) return;
            const link = `https://medxcel.web.app?ref=${code}`;
            const message = REFERRAL_SHARE_MESSAGE(code, link);

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
                    if (e.message && !e.message.includes('cancel')) {
                        window.copyReferralLink(source);
                    }
                }
                return;
            }

            if (navigator.share) {
                try {
                    await navigator.share({ title: 'Join me on MedExcel', text: message, url: link });
                } catch(e) {
                    if (e.name !== 'AbortError') window.copyReferralLink(source);
                }
                return;
            }

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

            const pCount = document.getElementById('profileReferralCount');
            if (pCount) pCount.innerHTML = `${count} <span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">referred</span>`;

            window.renderReferralTiers('profileReferralTiers', count);

            const boostExpiry = userData.referralBoostExpiry;
            const boostType   = userData.referralBoostType;
            const rewardEl    = document.getElementById('profileActiveReward');
            const rewardTxt   = document.getElementById('profileActiveRewardText');
            const _isPerm     = boostExpiry === 'permanent';
            const _isActive   = boostExpiry && (_isPerm || new Date(boostExpiry) > new Date());
            if (rewardEl && _isActive) {
                const expiryDate = _isPerm ? 'Forever' : new Date(boostExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const labels = {
                    limit_2x:      `2× daily limit active — expires ${expiryDate}`,
                    week_premium:  `Premium access active — expires ${expiryDate}`,
                    month_premium: `Premium access active — expires ${expiryDate}`,
                    ambassador:    `Ambassador status — permanent boost active`,
                };
                if (rewardTxt) rewardTxt.textContent = labels[boostType] || `Referral reward active — expires ${expiryDate}`;
                rewardEl.style.display = 'block';
            } else if (rewardEl) {
                rewardEl.style.display = 'none';
            }
        };

        window.applyReferralBoost = function(userData) {
            const boostExpiry = userData.referralBoostExpiry;
            const boostType   = userData.referralBoostType;
            const isPermanent = boostExpiry === 'permanent';
            if (!boostExpiry) return;
            if (!isPermanent && new Date(boostExpiry) <= new Date()) return;

            if (boostType === 'limit_2x' && window.userPlan === 'free') {
                window.allowedMaxItems = 40;
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = "(Max: 40 — Referral Boost)";
            } else if (boostType === 'week_premium' || boostType === 'month_premium') {
                window.allowedMaxItems = 50;
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = '(Max: 50 — Referral Reward)';
            } else if (boostType === 'ambassador') {
                window.allowedMaxItems = 50;
                const maxText = document.getElementById('maxLimitText');
                if (maxText) maxText.textContent = '(Max: 50 — Ambassador)';
            }
        };

window.showCustomUpgradeModal = function(maxAllowed) {
            return new Promise(resolve => {
                const backdrop = document.getElementById('upgradeModalBackdrop');
                const sheet    = document.getElementById('upgradeModalSheet');
                if (!backdrop || !sheet) { resolve(true); return; }

                const used = parseInt(document.getElementById('usageCount')?.textContent || '0');
                const cap  = (window.userPlan === 'premium' || window.userPlan === 'premium_trial') ? 30 : maxAllowed || 5;
                document.getElementById('upgUsageLabel').textContent = `${used} / ${cap}`;
                document.getElementById('upgUsageBar').style.width = '100%';
                document.getElementById('upgModalSubtitle').textContent =
                    `You've used all ${cap} free generations today.`;

                const count = parseInt(document.getElementById('profileReferralCount')?.textContent || '0');
                window.renderReferralTiers('upgModalTiers', count);
                const code  = window._userReferralCode || '';
                const upgLink = document.getElementById('upgReferralLinkDisplay');
                if (upgLink) upgLink.textContent = code ? `medxcel.web.app?ref=${code}` : 'Loading...';

                backdrop.style.display = 'flex';
                backdrop.style.opacity = '1';
                requestAnimationFrame(() => {
                    sheet.style.transform = 'translateY(0)';
                    sheet.style.opacity   = '1';
                });

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

        document.getElementById('upgradeModalBackdrop')?.addEventListener('click', function(e) {
            if (e.target === this) window.closeUpgradeModal();
        });

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
                if (window.Android && window.Android.saveTheme) {
                    window.Android.saveTheme(themeName);
                }
            });
        }

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

            setTimeout(() => {
                const w = carousel.offsetWidth;
                carousel.scrollTo({ left: w * 0.09, behavior: 'smooth' });
                setTimeout(() => carousel.scrollTo({ left: 0, behavior: 'smooth' }), 550);
            }, 1400);

            const _profile   = JSON.parse(localStorage.getItem('medexcel_user_profile') || '{}');
            const _userTarget = (window.userProfile && window.userProfile.dailyTarget) || _profile.dailyTarget || 0;

            function _makeChallenge(goal, msg) {
                const xp = goal <= 10 ? 50 : goal <= 20 ? 100 : goal <= 30 ? 125 : 150;
                return { goal, xp, challenge: goal + ' questions today', msg };
            }

            const dailyChallenges = _userTarget > 0 ? [
                _makeChallenge(_userTarget, 'Sunday reset — stay consistent'),
                _makeChallenge(_userTarget, 'Start the week strong'),
                _makeChallenge(_userTarget, 'Build on yesterday'),
                _makeChallenge(_userTarget, 'Midweek momentum'),
                _makeChallenge(_userTarget, 'Almost at the finish line'),
                _makeChallenge(_userTarget, 'Finish the week on fire'),
                _makeChallenge(_userTarget, 'The best never rest'),
            ] : [
                { goal: 10, xp: 50,  challenge: '10 questions today',          msg: 'Sunday reset — light and steady' },
                { goal: 15, xp: 75,  challenge: 'Crush 15 MCQs',               msg: 'Start the week strong' },
                { goal: 20, xp: 100, challenge: '20 flashcards today',         msg: 'Build on yesterday' },
                { goal: 25, xp: 125, challenge: 'Answer 25 questions',         msg: 'Midweek momentum' },
                { goal: 20, xp: 100, challenge: '20 questions today',          msg: 'Almost at the finish line' },
                { goal: 20, xp: 100, challenge: 'End the week — 20 questions', msg: 'Finish the week on fire' },
                { goal: 15, xp: 75,  challenge: 'Weekend warrior — 15',        msg: 'The best never rest' },
            ];

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

                localStorage.setItem(_challengeKey(), String(done));

                const xpKey = 'medexcel_challenge_xp_' + new Date().toDateString();
                if (pct >= 100 && !localStorage.getItem(xpKey)) {
                    localStorage.setItem(xpKey, '1');
                    if (window.addXP) {
                        window.addXP(dc.xp);
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

            window.updatePromoUsage = function() {
                const plan   = window.userPlan || 'free';
                const cap    = (plan === 'premium' || plan === 'premium_trial') ? 30 : 5;
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

(function() {
            var KEY = 'medexcel_onboarding_v1';
            if (localStorage.getItem(KEY)) return;

            var _doctorImg = new Image();
            _doctorImg.src = 'doctor.svg';

            var STEPS = [
                { target: null,                text: "Hi! 👋 I'm your MedExcel guide. Let me quickly show you around!", btn: "Let's go →" },
                { target: 'nav-create',        text: "Generate AI flashcards & MCQs from your notes, PDFs or YouTube links.", btn: "Got it →" },
                { target: 'studyFocusCard',    text: "Study Focus 🎯 We analyse your history and tell you exactly what to review next.", btn: "Got it →" },
                { target: 'nav-study',         text: "Your Library 📚 All your generated decks live here — searchable and organised.", btn: "Got it →" },
                { target: 'headerStreakBadge', text: "Check in daily to keep your streak alive and earn XP 🔥", btn: "Got it →" },
                { target: 'nav-leaderboard',   text: "See how you rank globally or compete in a Study Group with friends 🏆", btn: "Got it →" },
                { target: 'nav-profile',       text: "Track achievements, invite friends for rewards, and manage your plan here.", btn: "Got it →" },
                { target: null,                text: "You're all set! Consistency beats cramming. Let's ace those exams! 🎯", btn: "Start studying!" }
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
                ctx.globalCompositeOperation = 'destination-out';
                var r=12, x=rect.x, y=rect.y, w=rect.w, h=rect.h;
                ctx.beginPath();
                ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
                ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
                ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
                ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
                ctx.closePath(); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
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
                var wrap = document.createElement('div');
                wrap.style.cssText = 'position:absolute;left:' + leftPx + 'px;width:22px;height:12px;' +
                    (dir === 'down' ? 'bottom:-12px;' : 'top:-12px;');

                if (dir === 'down') {
                    var outer = document.createElement('div');
                    outer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;' +
                        'border-left:11px solid transparent;border-right:11px solid transparent;' +
                        'border-top:12px solid rgba(139,92,246,0.55);';
                    var inner = document.createElement('div');
                    inner.style.cssText = 'position:absolute;top:0;left:1.5px;width:0;height:0;' +
                        'border-left:9.5px solid transparent;border-right:9.5px solid transparent;' +
                        'border-top:11px solid #18181b;';
                    wrap.appendChild(outer);
                    wrap.appendChild(inner);
                } else {
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
                var old = ov.querySelector('.ob-tt');
                if (old) old.remove();

                var tt = document.createElement('div');
                tt.className = 'ob-tt';

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

                var dotsWrap = tt.querySelector('.ob-dots-wrap');
                STEPS.forEach(function(_, i) {
                    var d = document.createElement('div');
                    d.style.cssText = 'height:5px;border-radius:9999px;' +
                        'background:' + (i===cur ? '#8b5cf6' : 'rgba(139,92,246,0.2)') +
                        ';width:' + (i===cur ? '14px' : '5px') + ';';
                    dotsWrap.appendChild(d);
                });

                ov.appendChild(tt);

                tt.querySelector('.ob-skip-btn').onclick = done;
                tt.querySelector('.ob-next-btn').onclick = advance;

                if (!rect) {
                    tt.style.width = (W - 48) + 'px';
                    tt.style.left  = '24px';
                    tt.style.top   = Math.round(H * 0.14) + 'px';
                    return;
                }

                var ttW = Math.round(W * 0.62);
                tt.style.width = ttW + 'px';

                var pad = 12;
                var cx = rect.x + rect.w / 2;
                var ttH = tt.offsetHeight || 130;
                var spaceAbove = rect.y - pad;

                var isNavTarget = rect.y > H * 0.75;
                var left;
                if (isNavTarget) {
                    left = pad;
                } else {
                    left = Math.max(pad, Math.min(W - ttW - pad, cx - ttW / 2));
                }

                var tailLeft = Math.max(14, Math.min(ttW - 26, cx - left - 11));

                if (spaceAbove >= ttH + 14) {
                    tt.style.top = (rect.y - ttH - 12) + 'px';
                    tt.appendChild(makeTail('down', tailLeft));
                } else {
                    tt.style.top = (rect.y + rect.h + 12) + 'px';
                    tt.appendChild(makeTail('up', tailLeft));
                }
                tt.style.left = left + 'px';
            }

            function showStep(idx) {
                cur = idx;
                var s = STEPS[idx];

                if (!s.target) {
                    doc.style.height = '44%'; doc.style.bottom = '0'; doc.style.maxHeight = '290px';
                } else {
                    doc.style.height = '20%'; doc.style.bottom = '65px'; doc.style.maxHeight = '150px';
                }

                if (s.target) {
                    var el = document.getElementById(s.target);
                    if (el) {
                        el.scrollIntoView({ behavior: 'instant', block: 'center' });

                        setTimeout(function() {
                            var r = el.getBoundingClientRect(), p = 10;
                            var rect = { x:r.left-p, y:r.top-p, w:r.width+p*2, h:r.height+p*2 };
                            drawCutout(rect);
                            makeTooltip(s, rect);

                            var oldZone = ov.querySelector('.ob-tapzone');
                            if (oldZone) oldZone.remove();

                            var zone = document.createElement('div');
                            zone.className = 'ob-tapzone';
                            zone.style.cssText = 'position:absolute;z-index:9;cursor:pointer;' +
                                'left:' + rect.x + 'px;top:' + rect.y + 'px;' +
                                'width:' + rect.w + 'px;height:' + rect.h + 'px;';
                            zone.onclick = advance;
                            ov.appendChild(zone);
                        }, 120);
                    }
                } else {
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
                var homeMain = document.querySelector('.home-main');
                if (homeMain) homeMain.scrollTop = 0;
                if (typeof navigateTo==='function') navigateTo('view-home');
                localStorage.setItem(KEY, '1');
                if (window._pendingStreakModal) {
                    window._pendingStreakModal = false;
                    setTimeout(function(){ if(typeof window.openStreakModal==='function') window.openStreakModal(); }, 600);
                }
            }

            var fired = false;
            function fire() {
                if (!fired) {
                    if (window._personalizedOnboardingOpen === true) {
                        setTimeout(fire, 400); return;
                    }
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

let currentStreakCount = 0;
        let hasCheckedInToday = false;

        window.commitStreakOnAction = function() {
            if (hasCheckedInToday || !window.currentUser) return;
            const uid      = window.currentUser.uid;
            const todayStr = new Date().toDateString();

            const history = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
            if (!history.includes(todayStr)) {
                history.push(todayStr);
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
                localStorage.setItem('medexcel_checkin_history_' + uid, JSON.stringify(history.filter(d => new Date(d) >= cutoff)));
            }

            window.userStats.streak   = currentStreakCount;
            window.userStats.count    = currentStreakCount;
            window.userStats.lastDate = todayStr;
            localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));
            hasCheckedInToday = true;

            const hDisplay = document.getElementById('headerStreakDisplay');
            if (hDisplay) hDisplay.textContent = currentStreakCount;
            const hIcon = document.getElementById('headerFireIcon');
            if (hIcon) hIcon.style.opacity = '1';

            if (window.syncUserStreak) window.syncUserStreak(uid, currentStreakCount, todayStr);
            if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();

            if (localStorage.getItem('medexcel_onboarding_v1')) {
                const _iv = document.getElementById('interactiveView');
                const _onResultsPage = _iv && _iv.style.display !== 'none' && _iv.innerHTML.trim() !== '';
                if (_onResultsPage) {
                    window._pendingStreakModal = true;
                } else {
                    setTimeout(() => window.openStreakModal(), 600);
                }
            }
        };

        function buildCalendarRow() {
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const today = new Date();
            const currentDayIndex = (today.getDay() + 6) % 7;

            const weekDates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - currentDayIndex + i);
                d.setHours(0, 0, 0, 0);
                weekDates.push(d);
            }

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
            if (hasCheckedInToday) {
                checkedInSet.add(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toDateString());
            }

            const states = weekDates.map((d, i) => {
                const ds = d.toDateString();
                if (i < currentDayIndex) {
                    return checkedInSet.has(ds) ? 'done' : 'missed';
                } else if (i === currentDayIndex) {
                    return checkedInSet.has(ds) ? 'done' : 'active';
                }
                return 'future';
            });

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
                    const freezeIcon = document.getElementById('freezeIcon');
                    if (freezeIcon) { freezeIcon.style.color = '#63b3ed'; freezeIcon.className = 'fas fa-snowflake'; }
                    if (freezeTitle) freezeTitle.textContent = 'Streak Freeze Available!';
                    if (freezeDesc)  freezeDesc.textContent  = 'Protects your streak for 1 missed day';
                    if (freezeBtn)   { freezeBtn.style.display = 'block'; freezeBtn.textContent = 'Use Freeze'; freezeBtn.disabled = false; freezeBtn.style.opacity = '1'; }
                } else if (freezesUsed > 0 && freezesUsed >= freezesEarned) {
                    const freezeIcon = document.getElementById('freezeIcon');
                    if (freezeIcon) { freezeIcon.style.color = '#94a3b8'; freezeIcon.className = 'fas fa-snowflake'; }
                    if (freezeTitle) freezeTitle.textContent = 'Freeze Used';
                    if (freezeDesc)  freezeDesc.textContent  = daysToNextFreeze + ' more days to earn your next freeze';
                    if (freezeBtn)   freezeBtn.style.display = 'none';
                } else {
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

        window.useStreakFreeze = function() {
            const uid = window.currentUser ? window.currentUser.uid : 'guest';
            const freezeBtn = document.getElementById('freezeBtn');
            const freezeTitle = document.getElementById('freezeTitle');
            const freezeDesc = document.getElementById('freezeDesc');

            const used = parseInt(localStorage.getItem('medexcel_freezes_used_' + uid) || '0');
            localStorage.setItem('medexcel_freezes_used_' + uid, String(used + 1));

            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const history = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
            if (!history.includes(yesterday.toDateString())) {
                history.push(yesterday.toDateString());
                localStorage.setItem('medexcel_checkin_history_' + uid, JSON.stringify(history));
            }

            if (window.currentUser && window.syncUserStreak) {
                window.syncUserStreak(window.currentUser.uid, currentStreakCount, new Date().toDateString());
            }

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
            _inQuizStreak = 0;
            window._streakBonusXP = 0;
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

        let _inQuizStreak = 0;
        window._streakBonusXP = window._streakBonusXP || 0;

        if (!document.getElementById('_studyRewardKf')) {
            const _s = document.createElement('style');
            _s.id = '_studyRewardKf';
            _s.textContent = `
                @keyframes _studyCorrectPulse {
                    0%   { transform: scale(1);    }
                    40%  { transform: scale(1.025);}
                    100% { transform: scale(1);    }
                }
                @keyframes _studyStreakIn {
                    0%   { opacity: 0; transform: translateY(-4px) scale(0.92); }
                    100% { opacity: 1; transform: translateY(0)    scale(1);    }
                }
                @keyframes _studyStreakOut {
                    0%   { opacity: 1; transform: translateY(0)    scale(1);    }
                    100% { opacity: 0; transform: translateY(-4px) scale(0.96); }
                }
            `;
            document.head.appendChild(_s);
        }

        window.handleStudyMCQSelection = function(selectedBtn, q, allBtns) {
            if (q.answered) return;
            q.answered = true;

            const selectedIdx = parseInt(selectedBtn.dataset.idx);
            const isCorrect = selectedIdx === q.correct;
            if (isCorrect) examScore++;
            window._todayStudiedItems = (window._todayStudiedItems || 0) + 1;
            if (window.updatePromoTodayProgress) window.updatePromoTodayProgress();

            if (isCorrect) {
                try {
                    if (window.Capacitor?.Plugins?.Haptics) {
                        window.Capacitor.Plugins.Haptics.impact({ style: 'Light' });
                    } else if (navigator.vibrate) {
                        navigator.vibrate(8);
                    }
                } catch(_) {}
                _inQuizStreak++;
            } else {
                _inQuizStreak = 0;
            }

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
                    if (idx === selectedIdx) {
                        btn.style.animation = '_studyCorrectPulse 250ms ease-out';
                    }
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

            const _existingStreak = document.getElementById('studyStreakChip');
            if (_existingStreak) _existingStreak.remove();
            if (_inQuizStreak >= 3) {
                let _msg, _color, _bonus;
                if (_inQuizStreak >= 20) {
                    const opts = ['👑 Legendary', '👑 Untouchable', '👑 Unreal run'];
                    _msg = opts[_inQuizStreak % opts.length];
                    _color = '#a855f7'; _bonus = 60;
                } else if (_inQuizStreak >= 15) {
                    const opts = ['💎 Flawless', '💎 In the zone', '💎 Locked in'];
                    _msg = opts[_inQuizStreak % opts.length];
                    _color = '#06b6d4'; _bonus = 40;
                } else if (_inQuizStreak >= 10) {
                    const opts = ['⚡ Unstoppable', '⚡ On a tear', '⚡ Double digits!'];
                    _msg = opts[_inQuizStreak % opts.length];
                    _color = '#eab308'; _bonus = 25;
                } else if (_inQuizStreak >= 7) {
                    const opts = ['🚀 On fire', '🚀 Streaking', '🚀 Cooking now'];
                    _msg = opts[_inQuizStreak % opts.length];
                    _color = '#ef4444'; _bonus = 15;
                } else if (_inQuizStreak >= 5) {
                    const opts = [`🔥 ${_inQuizStreak} in a row!`, '🔥 Heating up', '🔥 Nice run'];
                    _msg = opts[_inQuizStreak % opts.length];
                    _color = '#f97316'; _bonus = 10;
                } else {
                    _msg = `🔥 ${_inQuizStreak} in a row`;
                    _color = '#f97316'; _bonus = 5;
                }
                window._streakBonusXP = (window._streakBonusXP || 0) + _bonus;

                const chip = document.createElement('div');
                chip.id = 'studyStreakChip';
                chip.style.cssText = `
                    position: fixed;
                    top: 64px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-8px);
                    color: ${_color};
                    font-size: 0.85rem;
                    font-weight: 700;
                    pointer-events: none;
                    opacity: 0;
                    z-index: 99999;
                    white-space: nowrap;
                    text-align: center;
                    text-shadow: 0 1px 6px rgba(0,0,0,0.4);
                    transition: opacity 220ms ease, transform 220ms ease;
                `;
                chip.innerHTML = `${_msg} <span style="color:#fbbf24;font-size:0.78rem;">+${_bonus} XP</span>`;
                document.body.appendChild(chip);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    chip.style.opacity = '1';
                    chip.style.transform = 'translateX(-50%) translateY(0)';
                }));
                setTimeout(() => {
                    chip.style.opacity = '0';
                    chip.style.transform = 'translateX(-50%) translateY(-6px)';
                }, 1600);
                setTimeout(() => chip.remove(), 1850);
            }

            const expl = document.getElementById('studyExplanationArea');
            expl.innerHTML = `
                <div style="font-size:0.8125rem;font-weight:700;margin-bottom:0.375rem;">
                    ${isCorrect ? '<span style="color:var(--accent-green)"><i class="fas fa-check-circle"></i> Correct!</span>' : '<span style="color:var(--accent-red)"><i class="fas fa-times-circle"></i> Incorrect</span>'}
                </div>
                ${q.explanation ? `<div style="background:var(--bg-body);padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);color:var(--text-main);font-size:0.875rem;line-height:1.5;"><span style="font-weight:700;color:var(--text-muted);display:block;margin-bottom:0.25rem;font-size:0.7rem;text-transform:uppercase;">Explanation</span>${window.escapeHTML(q.explanation)}</div>` : ''}
            `;
            expl.style.display = 'flex';

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

            const _streakBonus = window._streakBonusXP || 0;
            const totalXP = isFirstAttempt
                ? (isMCQSession ? examScore * 10 + 20 + _streakBonus : (currentQuiz.questions ? currentQuiz.questions.length * 5 : 20))
                : 0;
            window._streakBonusXP = 0;
            if (totalXP > 0) await window.addXP(totalXP);
            window.commitStreakOnAction?.();

            currentQuiz.stats.attempts++;
            currentQuiz.stats.lastScore = examScore;
            if (isMCQSession) {
                if (examScore > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = examScore;
            } else {
                const _fcTotal = currentQuiz.questions ? currentQuiz.questions.length : 0;
                if (_fcTotal > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = _fcTotal;
            }
            currentQuiz.stats.lastAttemptedAt = new Date().toISOString();

            try {
                const _logKey  = 'medexcel_studylog_' + (window.currentUser?.uid || 'guest');
                const _logDate = new Date().toISOString().split('T')[0];
                const _log     = JSON.parse(localStorage.getItem(_logKey) || '{}');
                if (!_log[_logDate]) _log[_logDate] = { questions: 0, sessions: 0 };
                _log[_logDate].questions += (currentQuiz.questions?.length || 0);
                _log[_logDate].sessions  += 1;
                const _trimmed = {};
                Object.keys(_log).sort().slice(-30).forEach(k => _trimmed[k] = _log[k]);
                localStorage.setItem(_logKey, JSON.stringify(_trimmed));
            } catch(_le) {}

            if (window.currentUser) {
                try {
                    const { updateDoc, doc, collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                    if (!currentQuiz._isGroupDeck) {
                        await updateDoc(doc(window.db, "users", window.currentUser.uid, "quizzes", currentQuiz.id.toString()), { stats: currentQuiz.stats });
                        localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes));
                        if (isMCQSession) {
                            const qCount = currentQuiz.questions ? currentQuiz.questions.length : 0;
                            const prev = window._cachedUserData?.totalQuestionsAnswered || 0;
                            const newTotal = prev + qCount;
                            updateDoc(doc(window.db, 'users', window.currentUser.uid), { totalQuestionsAnswered: newTotal }).catch(() => {});
                            if (window._cachedUserData) window._cachedUserData.totalQuestionsAnswered = newTotal;
                        }
                    }
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
                        const deckRef = doc(window.db, 'groups', currentQuiz._groupId, 'sharedDecks', String(currentQuiz.id));
                        await updateDoc(deckRef, {
                            [`scores.${window.currentUser.uid}`]: { score: examScore, percentage: pct, date: new Date().toISOString() }
                        }).catch(() => {});
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

                if (typeof window.checkAchievements === 'function') {
                    const now = new Date();
                    const hour = now.getHours();
                    const qCount = currentQuiz.questions ? currentQuiz.questions.length : 0;
                    const pct3 = qCount > 0 ? Math.round((examScore / qCount) * 100) : 0;
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
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem 1.5rem;min-height:0;">
                            <div style="display:flex;gap:0;align-items:center;justify-content:center;width:100%;height:114px;">
                                <div id="star1" style="width:60px;height:60px;opacity:0;transform:scale(0) rotate(-20deg);transition:opacity 0.45s cubic-bezier(0.34,1.56,0.64,1),transform 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.1s;margin-right:-6px;flex-shrink:0;">
                                    ${stars >= 1 ? '<svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss1" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs1"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss1" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss1" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss1" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss1" fill="url(#bgs1)" stroke="url(#bgs1)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs1)"><use href="#ss1" fill="url(#tgs1)" stroke="url(#tgs1)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss1d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs1d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs1d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs1d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss1d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss1d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss1d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss1d" fill="url(#bgs1d)" stroke="url(#bgs1d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs1d)"><use href="#ss1d" fill="url(#tgs1d)" stroke="url(#tgs1d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}
                                </div>
                                <div id="star2" style="width:100px;height:100px;opacity:0;transform:scale(0) rotate(0deg);transition:opacity 0.45s cubic-bezier(0.34,1.56,0.64,1),transform 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.25s;z-index:1;margin-top:-14px;flex-shrink:0;">
                                    ${stars >= 2 ? '<svg width="100" height="100" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss2" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs2"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss2" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss2" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss2" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss2" fill="url(#bgs2)" stroke="url(#bgs2)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs2)"><use href="#ss2" fill="url(#tgs2)" stroke="url(#tgs2)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="100" height="100" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss2d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs2d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs2d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs2d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss2d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss2d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss2d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss2d" fill="url(#bgs2d)" stroke="url(#bgs2d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs2d)"><use href="#ss2d" fill="url(#tgs2d)" stroke="url(#tgs2d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}
                                </div>
                                <div id="star3" style="width:60px;height:60px;opacity:0;transform:scale(0) rotate(20deg);transition:opacity 0.45s cubic-bezier(0.34,1.56,0.64,1),transform 0.45s cubic-bezier(0.34,1.56,0.64,1);transition-delay:0.15s;margin-left:-6px;flex-shrink:0;">
                                    ${stars >= 3 ? '<svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss3" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs3"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss3" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss3" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss3" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss3" fill="url(#bgs3)" stroke="url(#bgs3)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs3)"><use href="#ss3" fill="url(#tgs3)" stroke="url(#tgs3)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="ss3d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgs3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgs3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chs3d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#ss3d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#ss3d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#ss3d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#ss3d" fill="url(#bgs3d)" stroke="url(#bgs3d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chs3d)"><use href="#ss3d" fill="url(#tgs3d)" stroke="url(#tgs3d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}
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
                    const s1 = document.getElementById('star1');
                    const s2 = document.getElementById('star2');
                    const s3 = document.getElementById('star3');
                    if (s1) { s1.style.opacity = '1'; s1.style.transform = 'scale(1) rotate(0deg)'; }
                    if (s2) { s2.style.opacity = '1'; s2.style.transform = 'scale(1) rotate(0deg)'; }
                    if (s3) { s3.style.opacity = '1'; s3.style.transform = 'scale(1) rotate(0deg)'; }
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

window.openCreateView = function(type) {
            window.globalQuizType = type;
            document.getElementById('selectionView').style.display = 'none';
            document.getElementById('setupView').style.display = 'flex';
            document.getElementById('createHeaderTitle').textContent = `Create ${type}`;
            document.getElementById('createBackBtn').style.display = 'flex';
        };

        window.switchSourceTab = function(tab) {
            const dropZone    = document.getElementById('dropZone');
            const pasteZone   = document.getElementById('pasteZone');
            const youtubeZone = document.getElementById('youtubeZone');

            ['tabUpload','tabPaste','tabYoutube'].forEach(id => {
                const b = document.getElementById(id);
                if (!b) return;
                b.style.borderColor = 'var(--border-glass)';
                b.style.color = 'var(--text-muted)';
            });

            const accentColors = { upload: '#8b5cf6', paste: '#64748b', youtube: '#ef4444' };
            const activeBtn = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (activeBtn) {
                activeBtn.style.borderColor = accentColors[tab] || 'var(--accent-btn)';
                activeBtn.style.color = accentColors[tab] || 'var(--accent-btn)';
            }

            if (dropZone)    dropZone.style.display    = tab === 'upload'  ? 'flex'  : 'none';
            if (pasteZone)   pasteZone.style.display   = tab === 'paste'   ? 'block' : 'none';
            if (youtubeZone) youtubeZone.style.display = tab === 'youtube' ? 'block' : 'none';

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
                const nameInputYt = document.getElementById('deckNameInput');
                if (nameInputYt && !nameInputYt.value.trim()) {
                    nameInputYt.value = 'YouTube — ' + window._youtubeVideoId;
                    nameInputYt.style.borderColor = 'var(--accent-btn)';
                }
                document.getElementById('configSection').style.opacity = '1';
                document.getElementById('configSection').style.pointerEvents = 'auto';
                { const _c = document.getElementById('configLockCatcher'); if (_c) _c.style.display = 'none'; }
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

        window.handlePasteInput = function(ta) {
            const text = ta.value;
            const count = text.length;
            const charCount = document.getElementById('pasteCharCount');
            if (charCount) charCount.textContent = count.toLocaleString();

            ta.style.borderColor = count > 20 ? 'var(--border-active)' : 'var(--border-glass)';

            if (count > 20) {
                const blob = new Blob([text], { type: 'text/plain' });
                window.selectedFile = new File([blob], 'pasted-text.txt', { type: 'text/plain' });
                window._sourceIsPaste = true;
                const nameInputPaste = document.getElementById('deckNameInput');
                if (nameInputPaste && !nameInputPaste.value.trim()) {
                    const words = text.trim().split(/\s+/).slice(0, 5).join(' ');
                    nameInputPaste.value = words.length > 3 ? words + '…' : 'Pasted Notes';
                    nameInputPaste.style.borderColor = 'var(--accent-btn)';
                }

                document.getElementById('configSection').style.opacity = '1';
                document.getElementById('configSection').style.pointerEvents = 'auto';
                { const _c = document.getElementById('configLockCatcher'); if (_c) _c.style.display = 'none'; }
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
            const catcher = document.getElementById('configLockCatcher');
            if (catcher) catcher.style.display = 'block';
        };

        window._showUploadFirstHint = function() {
            if (typeof window.showToast === 'function') {
                window.showToast('Upload your study material first to continue', 'info');
            }
            const dz = document.getElementById('dropZone');
            if (dz) {
                if (!document.getElementById('_dzHighlightKf')) {
                    const s = document.createElement('style');
                    s.id = '_dzHighlightKf';
                    s.textContent = `
                        @keyframes _dzHighlight {
                            0%   { transform: scale(1);    border-color: var(--border-glass);   box-shadow: 0 0 0 0 rgba(167,139,250,0); }
                            30%  { transform: scale(1.02); border-color: var(--accent-btn);     box-shadow: 0 0 0 8px rgba(167,139,250,0.18); }
                            70%  { transform: scale(1.01); border-color: var(--accent-btn);     box-shadow: 0 0 0 4px rgba(167,139,250,0.10); }
                            100% { transform: scale(1);    border-color: var(--border-glass);   box-shadow: 0 0 0 0 rgba(167,139,250,0); }
                        }`;
                    document.head.appendChild(s);
                }
                dz.style.animation = 'none';
                void dz.offsetWidth;
                dz.style.animation = '_dzHighlight 800ms ease-out, uploadPulse 2s ease-in-out infinite 800ms';
                dz.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        window._isConfigLocked = function() {
            const cfg = document.getElementById('configSection');
            return !!cfg && cfg.style.pointerEvents === 'none';
        };

        document.addEventListener('DOMContentLoaded', function() {
            const slider = document.getElementById('itemSlider');
            const deckName = document.getElementById('deckNameInput');

            const _interceptIfLocked = (e) => {
                if (window._isConfigLocked && window._isConfigLocked()) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (slider) slider.blur?.();
                    if (deckName) deckName.blur?.();
                    window._showUploadFirstHint();
                    return false;
                }
            };

            if (slider) {
                slider.addEventListener('touchstart', _interceptIfLocked, { passive: false });
                slider.addEventListener('mousedown',  _interceptIfLocked);
                slider.addEventListener('focus',      _interceptIfLocked);
            }
            if (deckName) {
                deckName.addEventListener('focus',     _interceptIfLocked);
                deckName.addEventListener('mousedown', _interceptIfLocked);
                deckName.addEventListener('touchstart', _interceptIfLocked, { passive: false });
            }
        });

        document.addEventListener('DOMContentLoaded', function() {
            const selector = document.getElementById('styleSelector');
            if (selector) {
                selector.addEventListener('click', function(e) {
                    const btn = e.target.closest('.style-btn');
                    if (!btn) return;
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
                });
            }
        });
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
            if (window._pendingStreakModal) {
                window._pendingStreakModal = false;
                setTimeout(function() { if (typeof window.openStreakModal === 'function') window.openStreakModal(); }, 600);
            }
            document.getElementById('setupView').style.display = 'none';
            document.getElementById('interactiveView').style.display = 'none';
            document.getElementById('createHeaderTitle').textContent = "What to create?";
            document.getElementById('createBackBtn').style.display = 'none';

            window.selectedFile     = null;
            window._sourceIsPaste   = false;
            window._sourceIsYoutube = false;
            window._youtubeVideoId  = null;

            const _fi = document.getElementById('fileInput');
            if (_fi) _fi.value = '';
            const _icon = document.getElementById('uploadIconInner');
            if (_icon) { _icon.className = 'fas fa-cloud-upload-alt'; _icon.style.color = ''; _icon.style.animation = ''; }
            const _title = document.getElementById('uploadTitle');
            if (_title) _title.textContent = 'Tap to Upload File';
            const _dz = document.getElementById('dropZone');
            if (_dz) { _dz.style.borderColor = 'var(--border-glass)'; _dz.classList.remove('file-selected'); }
            const _pasteTA = document.getElementById('pasteTextarea');
            if (_pasteTA) { _pasteTA.value = ''; _pasteTA.style.borderColor = 'var(--border-glass)'; }
            const _charCount = document.getElementById('pasteCharCount');
            if (_charCount) _charCount.textContent = '0';
            const _ytInput = document.getElementById('youtubeInput');
            if (_ytInput) { _ytInput.value = ''; _ytInput.style.borderColor = 'var(--border-glass)'; }
            const _ytFb = document.getElementById('youtubeFeedback');
            if (_ytFb) _ytFb.innerHTML = '';
            const _cfg = document.getElementById('configSection');
            if (_cfg) { _cfg.style.opacity = '0.5'; _cfg.style.pointerEvents = 'none'; }
            const _btn = document.getElementById('generateBtn');
            if (_btn) { _btn.disabled = true; _btn.style.background = 'var(--bg-surface)'; _btn.style.color = 'var(--text-muted)'; _btn.style.cursor = 'not-allowed'; }
            document.getElementById('interactiveView').style.display = 'none';

            if (window._pendingCreateType) {
                const type = window._pendingCreateType;
                window._pendingCreateType = null;
                document.getElementById('selectionView').style.display = 'none';
                window.openCreateView(type);
                return;
            }

            document.getElementById('selectionView').style.display = 'flex';
            const _mv = document.getElementById('manualCreateView'); if (_mv) _mv.style.display = 'none';
            const _av = document.getElementById('ankiImportView');   if (_av) _av.style.display = 'none';
            const _bv = document.getElementById('bossFightView');    if (_bv) _bv.style.display = 'none';

            if (_dz) _dz.style.display = 'flex';
            const _pasteZone = document.getElementById('pasteZone');
            if (_pasteZone) _pasteZone.style.display = 'none';
            const _ytZone = document.getElementById('youtubeZone');
            if (_ytZone) _ytZone.style.display = 'none';

            ['tabUpload','tabPaste','tabYoutube'].forEach((id, i) => {
                const b = document.getElementById(id);
                if (!b) return;
                if (i === 0) { b.style.borderColor = '#8b5cf6'; b.style.color = '#8b5cf6'; }
                else         { b.style.borderColor = 'var(--border-glass)'; b.style.color = 'var(--text-muted)'; }
            });

            const _topicInput = document.getElementById('topicFocus');
            if (_topicInput) _topicInput.value = 'direct';
            document.querySelectorAll('.style-btn').forEach((b, i) => {
                if (i === 0) { b.style.borderColor = 'var(--accent-btn)'; b.style.background = 'rgba(167,139,250,0.1)'; b.style.color = 'var(--accent-btn)'; }
                else         { b.style.borderColor = 'var(--border-glass)'; b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; }
            });
        };

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

            (function _wireMaxLimitUpgradeLink() {
                const link = document.getElementById('maxLimitUpgrade');
                if (!link) return;
                const isPremium = ['premium', 'premium_trial', 'elite'].includes(window.userPlan);
                link.style.display = isPremium ? 'none' : 'inline-flex';
                link.onclick = (e) => {
                    e.preventDefault();
                    if (typeof window.navigateTo === 'function') window.navigateTo('view-payment');
                };
                const _pressOn  = () => { link.style.transform = 'scale(0.94)'; link.style.background = 'rgba(167,139,250,0.22)'; };
                const _pressOff = () => { link.style.transform = ''; link.style.background = 'rgba(167,139,250,0.12)'; };
                link.addEventListener('touchstart', _pressOn, { passive: true });
                link.addEventListener('touchend',   _pressOff);
                link.addEventListener('mousedown',  _pressOn);
                link.addEventListener('mouseup',    _pressOff);
                link.addEventListener('mouseleave', _pressOff);
            })();

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
                        hintEl.style.cssText = 'font-size:0.75rem;color:#f97316;text-align:center;margin-top:0.5rem;font-weight:600;line-height:1.45;';
                        itemSlider.parentElement.appendChild(hintEl);
                    }
                    const isPremium = ['premium', 'premium_trial', 'elite'].includes(window.userPlan);
                    hintEl.textContent = isPremium
                        ? '⚠️ Premium is capped at 50'
                        : `⚠️ Free plan max is ${max} questions per deck`;
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
                    const isPremium = ['premium', 'premium_trial', 'elite'].includes(window.userPlan);
                    const maxMB = isPremium ? 50 : 15;
                    if (file.size > maxMB * 1024 * 1024) { alert(`File is too large. Maximum size is ${maxMB}MB${!isPremium ? ' on the free plan. Upgrade to Premium for 50MB.' : '.'}`); fileInput.value = ''; return; }

                    if (file.name.toLowerCase().endsWith('.pdf')) {
                        window.openPdfPageSelector(file);
                        return;
                    }

                    if (file.name.toLowerCase().endsWith('.pptx')) {
                        window.openPptxSlideSelector(file);
                        return;
                    }

                    window._applySelectedFile(file);
                }
            });
        }

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
                { const _c = document.getElementById('configLockCatcher'); if (_c) _c.style.display = 'none'; }
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.style.background = 'var(--accent-btn)';
            btn.style.color = 'var(--btn-text)';
            btn.style.cursor = 'pointer';
        };

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
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 0; justify-content:center; width:100%; margin-bottom: 1.25rem;">
                                <span style="display:inline-block;margin-right:-6px;">${earnedStars >= 1 ? '<svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc1" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc1"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc1" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc1" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc1" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc1" fill="url(#bgc1)" stroke="url(#bgc1)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc1)"><use href="#sc1" fill="url(#tgc1)" stroke="url(#tgc1)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc1d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc1d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc1d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc1d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc1d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc1d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc1d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc1d" fill="url(#bgc1d)" stroke="url(#bgc1d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc1d)"><use href="#sc1d" fill="url(#tgc1d)" stroke="url(#tgc1d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}</span>
                                <span style="display:inline-block;transform:translateY(-14px);z-index:1;position:relative;">${earnedStars >= 2 ? '<svg width="100" height="100" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc2" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc2"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc2" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc2" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc2" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc2" fill="url(#bgc2)" stroke="url(#bgc2)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc2)"><use href="#sc2" fill="url(#tgc2)" stroke="url(#tgc2)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="100" height="100" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc2d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc2d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc2d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc2d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc2d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc2d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc2d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc2d" fill="url(#bgc2d)" stroke="url(#bgc2d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc2d)"><use href="#sc2d" fill="url(#tgc2d)" stroke="url(#tgc2d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}</span>
                                <span style="display:inline-block;margin-left:-6px;">${earnedStars >= 3 ? '<svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc3" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc3"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc3" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc3" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc3" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc3" fill="url(#bgc3)" stroke="url(#bgc3)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc3)"><use href="#sc3" fill="url(#tgc3)" stroke="url(#tgc3)" stroke-width="28" stroke-linejoin="round"/></g></svg>' : '<svg style="filter:grayscale(1);opacity:0.25;" width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><path id="sc3d" d="M 256,80 L 295,170 L 420,185 L 325,260 L 355,380 L 256,320 L 157,380 L 187,260 L 92,185 L 217,170 Z"/><linearGradient id="tgc3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="100%" stop-color="#FFD54F"/></linearGradient><linearGradient id="bgc3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFA726"/><stop offset="100%" stop-color="#EF6C00"/></linearGradient><clipPath id="chc3d"><path d="M 0,0 L 512,0 L 512,235 Q 256,255 0,235 Z"/></clipPath></defs><use href="#sc3d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round" transform="translate(0,4)"/><use href="#sc3d" fill="#3E1700" stroke="#3E1700" stroke-width="48" stroke-linejoin="round"/><use href="#sc3d" fill="none" stroke="#D84315" stroke-width="38" stroke-linejoin="round"/><use href="#sc3d" fill="url(#bgc3d)" stroke="url(#bgc3d)" stroke-width="28" stroke-linejoin="round"/><g clip-path="url(#chc3d)"><use href="#sc3d" fill="url(#tgc3d)" stroke="url(#tgc3d)" stroke-width="28" stroke-linejoin="round"/></g></svg>'}</span>
                            </div>
                            <h2 style="color: var(--accent-yellow); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Quiz Complete!</h2>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center;">
                                <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                    <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                                </div>
                                <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                    <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">AMAZING</div>
                                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bullseye" style="color: var(--accent-green);"></i> <span id="animatedAcc">0</span>%</div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 0.75rem; padding-bottom: 1rem;">
                            <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none;">CLAIM XP</button>
                            <button onclick="window.generateAnother('Multiple Choice')" style="width: 100%; max-width: 320px; background: transparent; color: var(--text-muted); font-size: 0.9375rem; font-weight: 700; padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-glass);">Generate Another MCQ</button>
                        </div>
                    </div>`;
            } else {
                window.finalEarnedXP = generatedCards.length * 5;
                html = `
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; width: 100%;">
                            <div style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 4px solid var(--accent-green); color: var(--accent-green); font-size: 3.5rem;"><i class="fas fa-check"></i></div>
                            <h2 style="color: var(--accent-green); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Review Complete!</h2>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center;">
                                <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                    <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 0.75rem; padding-bottom: 1rem;">
                            <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none;">CLAIM XP</button>
                            <button onclick="window.generateAnother('Flashcards')" style="width: 100%; max-width: 320px; background: transparent; color: var(--text-muted); font-size: 0.9375rem; font-weight: 700; padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-glass);">Generate Another Flashcard</button>
                        </div>
                    </div>`;
            }
            viewContainer.innerHTML = html;
            window.animateValue("animatedXP", 0, window.finalEarnedXP, 1500);
            if (isMCQMode) window.animateValue("animatedAcc", 0, percentage, 1500);
        };

                window.claimAndContinue = async function() {
            const btn = document.querySelector('.btn-claim-xp');
            if (btn) { btn.textContent = "CLAIMING..."; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7'; }
            try { await window.addXP(window.finalEarnedXP); } catch(e) {}
            window.commitStreakOnAction?.();
            window.goBackToSelection();
            window.updateHomeContinueCard();
        };

        window.generateAnother = async function(type) {
            try { await window.addXP(window.finalEarnedXP || 0); } catch(e) {}
            window.commitStreakOnAction?.();

            window.exitQuizMode();
            document.getElementById('interactiveView').style.display = 'none';
            document.getElementById('interactiveView').innerHTML = '';

            window.selectedFile      = null;
            window._sourceIsPaste    = false;
            window._sourceIsYoutube  = false;
            window._youtubeVideoId   = null;

            const _fi = document.getElementById('fileInput');
            if (_fi) _fi.value = '';
            const _icon = document.getElementById('uploadIconInner');
            if (_icon) { _icon.className = 'fas fa-cloud-upload-alt'; _icon.style.color = ''; _icon.style.animation = ''; }
            const _title = document.getElementById('uploadTitle');
            if (_title) _title.textContent = 'Tap to Upload File';
            const _dz = document.getElementById('dropZone');
            if (_dz) { _dz.style.borderColor = 'var(--border-glass)'; _dz.classList.remove('file-selected'); }
            const _cfg = document.getElementById('configSection');
            if (_cfg) { _cfg.style.opacity = '0.5'; _cfg.style.pointerEvents = 'none'; }
            const _btn = document.getElementById('generateBtn');
            if (_btn) { _btn.disabled = true; _btn.style.background = 'var(--bg-surface)'; _btn.style.color = 'var(--text-muted)'; _btn.style.cursor = 'not-allowed'; }

            window.openCreateView(type);
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

window.renderStudyFocusCard = function() {
    const card = document.getElementById('studyFocusCard');
    if (!card) return;

    const quizzes = (window.quizzes || []).filter(function(q) { return !q._pending && q.questions && q.questions.length > 0; });
    const DAY_MS  = 86400000;
    const now     = Date.now();

    if (quizzes.length === 0) {
        card.innerHTML =
            '<div style="display:flex;gap:14px;padding:16px;background:rgba(139,92,246,0.05);' +
            'border:1px solid rgba(139,92,246,0.1);border-radius:var(--radius-card);align-items:center;">' +
                '<div style="width:42px;height:42px;border-radius:50%;background:rgba(139,92,246,0.15);' +
                    'color:#a78bfa;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<i class="fas fa-seedling" style="font-size:0.9rem;"></i>' +
                '</div>' +
                '<div style="flex:1;">' +
                    '<div style="font-size:0.9375rem;font-weight:700;color:var(--text-main);margin-bottom:3px;">No study history yet</div>' +
                    '<div style="font-size:0.8rem;color:var(--text-muted);">Generate your first quiz to start tracking your progress.</div>' +
                '</div>' +
                '<i class="fas fa-chevron-right" style="font-size:0.75rem;color:var(--text-muted);"></i>' +
            '</div>';
        return;
    }

    var attempted = quizzes.filter(function(q) { return q.stats && q.stats.attempts > 0; });
    var scored = attempted.map(function(q) {
        var total   = q.questions.length;
        var pct     = total > 0 ? Math.round((q.stats.bestScore / total) * 100) : 0;
        var lastMs  = q.stats.lastAttemptedAt ? new Date(q.stats.lastAttemptedAt).getTime() : 0;
        var daysAgo = lastMs ? Math.floor((now - lastMs) / DAY_MS) : null;
        return { q: q, pct: pct, daysAgo: daysAgo };
    });

    var weak  = scored.filter(function(s) { return s.pct < 60; }).sort(function(a, b) { return a.pct - b.pct; });
    var stale = scored.filter(function(s) { return s.daysAgo !== null && s.daysAgo >= 5; }).sort(function(a, b) { return b.daysAgo - a.daysAgo; });

    var icon, color, badge, title, sub;
    if (weak.length > 0) {
        icon = 'fa-book-medical'; color = '#8b5cf6'; badge = 'Needs work';
        title = window.escapeHTML(weak[0].q.title || 'Untitled');
        sub   = 'Best score ' + weak[0].pct + '%' + (weak[0].daysAgo !== null ? ' · ' + (weak[0].daysAgo === 0 ? 'today' : weak[0].daysAgo + 'd ago') : '');
    } else if (stale.length > 0) {
        icon = 'fa-rotate-left'; color = '#8b5cf6'; badge = 'Due for review';
        title = window.escapeHTML(stale[0].q.title || 'Untitled');
        sub   = 'Not studied in ' + stale[0].daysAgo + ' day' + (stale[0].daysAgo !== 1 ? 's' : '') + ' · ' + stale[0].pct + '% best';
    } else {
        icon = 'fa-chart-line'; color = '#34d399'; badge = 'On track';
        title = 'All decks looking good';
        sub   = 'Tap to see your full progress report';
    }

    card.innerHTML =
        '<div style="display:flex;gap:14px;padding:16px;background:rgba(139,92,246,0.05);' +
        'border:1px solid rgba(139,92,246,0.1);border-radius:var(--radius-card);align-items:center;">' +
            '<div style="width:44px;height:44px;flex-shrink:0;border-radius:11px;overflow:hidden;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="44" height="44">' +
                    '<defs>' +
                        '<clipPath id="sfm2"><rect x="30" y="30" width="340" height="340" rx="60" ry="60"/></clipPath>' +
                        '<filter id="sfsh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.1"/></filter>' +
                    '</defs>' +
                    '<g clip-path="url(#sfm2)">' +
                        '<rect x="0" y="0" width="400" height="400" fill="#2D51CA"/>' +
                        '<g transform="translate(130,160) rotate(-15)"><rect x="-45" y="-60" width="90" height="120" rx="8" fill="#F8F9FA" filter="url(#sfsh)"/><rect x="-25" y="-35" width="50" height="6" rx="3" fill="#E2E5EA"/><rect x="-25" y="-15" width="30" height="6" rx="3" fill="#E2E5EA"/><rect x="-25" y="5" width="40" height="6" rx="3" fill="#E2E5EA"/></g>' +
                        '<g transform="translate(190,140) rotate(-5)"><rect x="-55" y="-65" width="110" height="130" rx="8" fill="#FFFFFF" filter="url(#sfsh)"/><rect x="-35" y="-40" width="70" height="6" rx="3" fill="#E2E5EA"/><rect x="-35" y="-20" width="50" height="6" rx="3" fill="#E2E5EA"/><rect x="-35" y="0" width="80" height="6" rx="3" fill="#E2E5EA"/><rect x="-35" y="20" width="40" height="6" rx="3" fill="#E2E5EA"/></g>' +
                        '<g transform="translate(260,160) rotate(10)"><rect x="-50" y="-60" width="100" height="120" rx="8" fill="#F0F2F6" filter="url(#sfsh)"/><rect x="-30" y="-35" width="60" height="6" rx="3" fill="#D8DCE4"/><rect x="-30" y="-15" width="40" height="6" rx="3" fill="#D8DCE4"/></g>' +
                        '<path d="M 0,220 C 150,160 250,130 400,180 L 400,400 L 0,400 Z" fill="#7582FA"/>' +
                        '<path d="M 0,240 C 100,210 220,250 400,280 L 400,400 L 0,400 Z" fill="#F8C747"/>' +
                    '</g>' +
                '</svg>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' +
                    '<span style="font-size:0.9375rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</span>' +
                    '<span style="font-size:0.6rem;font-weight:700;color:' + color + ';background:' + color + '18;padding:2px 7px;border-radius:9999px;white-space:nowrap;flex-shrink:0;">' + badge + '</span>' +
                '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-muted);">' + sub + '</div>' +
            '</div>' +
            '<i class="fas fa-chevron-right" style="font-size:0.75rem;color:var(--text-muted);flex-shrink:0;"></i>' +
        '</div>';
};

window.openProgressSheet = function() {
    var existing = document.getElementById('_progressPage');
    if (existing) { existing.remove(); }

    var quizzes  = (window.quizzes || []).filter(function(q) { return !q._pending && q.questions && q.questions.length > 0; });
    var DAY_MS   = 86400000;
    var now      = Date.now();
    var logKey   = 'medexcel_studylog_' + (window.currentUser ? window.currentUser.uid : 'guest');
    var log      = JSON.parse(localStorage.getItem(logKey) || '{}');

    var attempted    = quizzes.filter(function(q) { return q.stats && q.stats.attempts > 0; });
    var totalSessions = Object.values(log).reduce(function(s, d) { return s + (d.sessions || 0); }, 0);
    var totalQs      = Object.values(log).reduce(function(s, d) { return s + (d.questions || 0); }, 0);
    var avgScore     = attempted.length > 0
        ? Math.round(attempted.reduce(function(s, q) { return s + (q.questions.length > 0 ? (q.stats.bestScore / q.questions.length) * 100 : 0); }, 0) / attempted.length)
        : null;

    var ringPct   = avgScore !== null ? avgScore : 0;
    var R         = 54;
    var circ      = 2 * Math.PI * R;
    var dashArr   = (ringPct / 100 * circ).toFixed(1) + ' ' + circ.toFixed(1);
    var ringColor = ringPct >= 80 ? '#34d399' : ringPct >= 60 ? '#fbbf24' : ringPct >= 40 ? '#fb923c' : '#8b5cf6';
    var ringLabel = avgScore !== null ? avgScore + '%' : '—';
    var ringDesc  = avgScore !== null ? 'Avg score' : 'No attempts yet';

    var days = [];
    for (var i = 6; i >= 0; i--) {
        var d   = new Date(now - i * DAY_MS);
        var key = d.toISOString().split('T')[0];
        var lbl = d.toLocaleDateString(undefined, { weekday: 'short' });
        days.push({ label: lbl, val: (log[key] && log[key].questions) || 0, isToday: i === 0 });
    }
    var maxVal = Math.max.apply(null, days.map(function(d) { return d.val; }).concat([20]));
    var bars   = days.map(function(d) {
        var h   = Math.max(4, Math.round((d.val / maxVal) * 100));
        var col = d.isToday ? '#8b5cf6' : d.val > 0 ? 'rgba(139,92,246,0.4)' : 'var(--border-glass)';
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">' +
            '<div style="width:100%;display:flex;align-items:flex-end;justify-content:center;height:100px;">' +
                '<div style="width:clamp(8px,60%,26px);height:' + h + 'px;background:' + col + ';border-radius:6px 6px 0 0;transition:height 0.5s ease;"></div>' +
            '</div>' +
            '<span style="font-size:0.625rem;font-weight:' + (d.isToday ? '700' : '600') + ';color:' + (d.isToday ? '#8b5cf6' : 'var(--text-muted)') + ';">' + d.label + '</span>' +
            (d.val > 0 ? '<span style="font-size:0.55rem;color:var(--text-muted);">' + d.val + '</span>' : '<span style="font-size:0.55rem;color:transparent;">0</span>') +
        '</div>';
    }).join('');

    var deckRows = quizzes.map(function(q) {
        var total   = q.questions.length;
        var pct     = (q.stats && q.stats.attempts > 0) ? Math.round((q.stats.bestScore / total) * 100) : null;
        var lastMs  = (q.stats && q.stats.lastAttemptedAt) ? new Date(q.stats.lastAttemptedAt).getTime() : 0;
        var daysAgo = lastMs ? Math.floor((now - lastMs) / DAY_MS) : null;
        var col     = pct === null ? 'var(--text-muted)' : pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';
        var pctTxt  = pct === null ? 'New' : pct + '%';
        var when    = daysAgo === null ? 'Never' : daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo + 'd ago';
        var isMCQ   = q.type && q.type.includes('Multiple');
        return { q: q, pct: pct === null ? -1 : pct, col: col, pctTxt: pctTxt, when: when, total: total, isMCQ: isMCQ };
    }).sort(function(a, b) { return a.pct - b.pct; });

    var deckHTML = deckRows.length === 0
        ? '<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:2rem 0;">Generate your first quiz to see it here</p>'
        : deckRows.map(function(r) {
            var barW = r.pct < 0 ? 0 : r.pct;
            var _rid = String(r.q.id);
            return '<div style="padding:14px 0;border-bottom:1px solid var(--border-glass);cursor:pointer;" onclick="window._openProgressDeck(\''+_rid+'\')">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
                    '<div style="width:36px;height:36px;border-radius:10px;background:' + r.col + '18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                        (r.isMCQ ? '<svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mbg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7B2CF3"/><stop offset="100%" stop-color="#4B0F9B"/></linearGradient><linearGradient id="mwp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E2E2E9"/></linearGradient><linearGradient id="mbp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6976F3"/><stop offset="100%" stop-color="#515CE4"/></linearGradient><linearGradient id="mpp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B27BFF"/><stop offset="100%" stop-color="#884CFF"/></linearGradient><filter id="mps2"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#2D0A66" flood-opacity="0.85"/></filter></defs><rect x="42" y="42" width="428" height="428" rx="100" fill="#F3F3F6"/><rect x="48" y="48" width="416" height="416" rx="96" fill="url(#mbg2)"/><rect x="116" y="116" width="280" height="280" rx="56" fill="url(#mwp2)" filter="url(#mps2)"/><rect x="152" y="152" width="164" height="36" rx="18" fill="url(#mbp2)"/><rect x="210" y="210" width="150" height="36" rx="18" fill="url(#mpp2)"/><rect x="152" y="268" width="164" height="36" rx="18" fill="url(#mbp2)"/><rect x="210" y="326" width="150" height="36" rx="18" fill="url(#mpp2)"/></svg>' : '<svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="416" height="416" rx="96" fill="#7C3AED"/><rect x="120" y="140" width="168" height="232" rx="32" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 204 256)"/><rect x="216" y="128" width="168" height="232" rx="32" fill="#FFFFFF" transform="rotate(18 300 244)"/></svg>') +
                    '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-size:0.875rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + window.escapeHTML(r.q.title || 'Untitled') + '</div>' +
                        '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;">' + r.total + ' items · ' + r.when + '</div>' +
                    '</div>' +
                    '<span style="font-size:1rem;font-weight:800;color:' + r.col + ';flex-shrink:0;">' + r.pctTxt + '</span>' +
                '</div>' +
                '<div style="width:100%;height:4px;background:var(--border-glass);border-radius:9999px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + barW + '%;background:' + r.col + ';border-radius:9999px;transition:width 0.6s ease;"></div>' +
                '</div>' +
            '</div>';
        }).join('');

    var sugg = deckRows.find(function(d) { return d.pct >= 0 && d.pct < 60; })
        || deckRows.find(function(d) { return d.q.stats && d.q.stats.lastAttemptedAt && Math.floor((now - new Date(d.q.stats.lastAttemptedAt).getTime()) / DAY_MS) >= 5; })
        || (deckRows.length > 0 ? deckRows[deckRows.length - 1] : null);

    var suggSection = sugg ? (
        '<div style="margin-bottom:2rem;">' +
            '<h3 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Suggested Next</h3>' +
            '<div onclick="window._openProgressDeck(\''+ String(sugg.q.id) +'\')" style="display:flex;align-items:center;gap:14px;padding:16px;' +
                'background:linear-gradient(135deg,rgba(139,92,246,0.12),rgba(139,92,246,0.05));' +
                'border:1px solid rgba(139,92,246,0.25);border-radius:16px;cursor:pointer;">' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:0.7rem;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Study Now</div>' +
                    '<div style="font-size:1rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + window.escapeHTML(sugg.q.title || 'Untitled') + '</div>' +
                    '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;">' + (sugg.pct < 0 ? 'Not attempted yet' : 'Best score ' + sugg.pctTxt) + '</div>' +
                '</div>' +
                '<div style="width:44px;height:44px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(139,92,246,0.4);">' +
                    '<i class="fas fa-play" style="font-size:0.875rem;color:white;margin-left:3px;"></i>' +
                '</div>' +
            '</div>' +
        '</div>'
    ) : '';

    var page = document.createElement('div');
    page.id = '_progressPage';
    page.style.cssText = 'position:fixed;inset:0;z-index:9500;background:var(--bg-body);overflow-y:auto;transform:translateX(100%);transition:transform 0.32s cubic-bezier(0.19,1,0.22,1);';
    page.className = 'hide-scroll';

    page.innerHTML =
        '<div style="position:sticky;top:0;z-index:10;background:var(--bg-body);padding:calc(env(safe-area-inset-top,0px) + 14px) 20px 14px;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<button onclick="window._closeProgressPage()" style="width:36px;height:36px;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-main);font-size:0.875rem;flex-shrink:0;">' +
                    '<i class="fas fa-arrow-left"></i>' +
                '</button>' +
                '<h1 style="font-size:1.125rem;font-weight:800;color:var(--text-main);margin:0;letter-spacing:-0.02em;">Progress</h1>' +
            '</div>' +
        '</div>' +

        '<div style="padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 2rem);">' +

            '<div style="display:flex;flex-direction:column;align-items:center;padding:2rem 1rem;margin-bottom:1.75rem;">' +
                '<div style="position:relative;width:140px;height:140px;">' +
                    '<svg width="140" height="140" style="transform:rotate(-90deg);">' +
                        '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--border-glass)" stroke-width="10"/>' +
                        '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + ringColor + '" stroke-width="10" stroke-linecap="round" ' +
                            'stroke-dasharray="' + dashArr + '" style="transition:stroke-dasharray 0.8s ease;"/>' +
                    '</svg>' +
                    '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                        '<span style="font-size:2rem;font-weight:800;color:var(--text-main);line-height:1;">' + ringLabel + '</span>' +
                        '<span style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-top:4px;">' + ringDesc + '</span>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:1rem;text-align:center;">Performance Overview</p>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:2rem;">' +
                '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:14px 8px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:800;color:var(--text-main);">' + totalSessions + '</div>' +
                    '<div style="font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Sessions</div>' +
                '</div>' +
                '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:14px 8px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:800;color:var(--text-main);">' + totalQs + '</div>' +
                    '<div style="font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Questions</div>' +
                '</div>' +
                '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:14px 8px;text-align:center;">' +
                    '<div style="font-size:1.5rem;font-weight:800;color:var(--text-main);">' + (avgScore !== null ? avgScore + '%' : '—') + '</div>' +
                    '<div style="font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Avg Score</div>' +
                '</div>' +
            '</div>' +

            '<div style="margin-bottom:2rem;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
                    '<h3 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin:0;">Learning Statistics</h3>' +
                    '<span style="font-size:0.72rem;font-weight:600;color:var(--accent-btn);">This Week</span>' +
                '</div>' +
                '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:20px 16px 14px;">' +
                    '<div style="display:flex;gap:6px;align-items:flex-end;height:120px;">' + bars + '</div>' +
                    '<div style="margin-top:10px;font-size:0.7rem;color:var(--text-muted);text-align:center;letter-spacing:0.02em;">Questions studied per day</div>' +
                '</div>' +
            '</div>' +

            suggSection +

            (function() {
                var subjectMap = {};
                quizzes.forEach(function(q) {
                    var subj = (q.subject || 'General').toUpperCase().trim();
                    if (!subjectMap[subj]) subjectMap[subj] = { total: 0, scoreSum: 0, count: 0, attempts: 0 };
                    subjectMap[subj].count++;
                    if (q.stats && q.stats.attempts > 0) {
                        subjectMap[subj].attempts++;
                        var pct = q.questions.length > 0 ? Math.round((q.stats.bestScore / q.questions.length) * 100) : 0;
                        subjectMap[subj].scoreSum += pct;
                    }
                });
                var subjects = Object.keys(subjectMap).sort(function(a, b) {
                    var pa = subjectMap[a].attempts > 0 ? subjectMap[a].scoreSum / subjectMap[a].attempts : 101;
                    var pb = subjectMap[b].attempts > 0 ? subjectMap[b].scoreSum / subjectMap[b].attempts : 101;
                    return pa - pb;
                });
                if (subjects.length === 0) return '';
                var rows = subjects.map(function(subj) {
                    var s   = subjectMap[subj];
                    var avg = s.attempts > 0 ? Math.round(s.scoreSum / s.attempts) : null;
                    var col = avg === null ? 'var(--text-muted)' : avg >= 80 ? '#34d399' : avg >= 60 ? '#fbbf24' : '#f87171';
                    var bar = avg !== null ? avg : 0;
                    var lbl = avg !== null ? avg + '%' : 'Not attempted';
                    var sub = s.count + ' deck' + (s.count !== 1 ? 's' : '') + (s.attempts > 0 ? ' · ' + s.attempts + ' attempted' : '');
                    return '<div style="margin-bottom:14px;">' +
                        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
                            '<div>' +
                                '<div style="font-size:0.875rem;font-weight:700;color:var(--text-main);">' + subj + '</div>' +
                                '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;">' + sub + '</div>' +
                            '</div>' +
                            '<span style="font-size:0.9375rem;font-weight:800;color:' + col + ';flex-shrink:0;margin-left:12px;">' + lbl + '</span>' +
                        '</div>' +
                        '<div style="width:100%;height:6px;background:var(--border-glass);border-radius:9999px;overflow:hidden;">' +
                            '<div style="height:100%;width:' + bar + '%;background:' + col + ';border-radius:9999px;transition:width 0.6s ease;"></div>' +
                        '</div>' +
                    '</div>';
                }).join('');
                return '<div style="margin-bottom:2rem;">' +
                    '<h3 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Subject Breakdown</h3>' +
                    '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:18px 16px;">' +
                        rows +
                    '</div>' +
                '</div>';
            })() +

            (function() {
                var uid        = window.currentUser ? window.currentUser.uid : 'guest';
                var history    = JSON.parse(localStorage.getItem('medexcel_checkin_history_' + uid) || '[]');
                var historySet = new Set(history);
                var streak     = (window.userStats && window.userStats.count) || 0;
                var consistency = 0;
                if (history.length > 0) {
                    var studied14 = 0;
                    for (var i = 0; i < 14; i++) {
                        var d14 = new Date(now - i * DAY_MS);
                        if (historySet.has(d14.toDateString())) studied14++;
                    }
                    consistency = Math.round((studied14 / 14) * 100);
                }

                var cells = [];
                for (var w = 27; w >= 0; w--) {
                    var dc = new Date(now - w * DAY_MS);
                    var isToday  = w === 0;
                    var studied  = historySet.has(dc.toDateString());
                    var isFuture = w < 0;
                    var col;
                    if (isToday && studied)   col = '#8b5cf6';
                    else if (isToday)         col = 'rgba(139,92,246,0.25)';
                    else if (studied)         col = 'rgba(139,92,246,0.6)';
                    else                      col = 'var(--border-glass)';
                    cells.push('<div style="width:28px;height:28px;border-radius:6px;background:' + col + ';flex-shrink:0;" title="' + dc.toDateString() + '"></div>');
                }

                var rows4 = '';
                var dayLabels = '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
                    ['M','T','W','T','F','S','S'].map(function(l) {
                        return '<div style="width:28px;text-align:center;font-size:0.6rem;font-weight:700;color:var(--text-muted);">' + l + '</div>';
                    }).join('') + '</div>';
                for (var row = 0; row < 4; row++) {
                    rows4 += '<div style="display:flex;gap:6px;margin-bottom:6px;">';
                    for (var col2 = 0; col2 < 7; col2++) {
                        rows4 += cells[row * 7 + col2] || '<div style="width:28px;height:28px;"></div>';
                    }
                    rows4 += '</div>';
                }

                var consistencyColor = consistency >= 70 ? '#34d399' : consistency >= 40 ? '#fbbf24' : '#f87171';

                return '<div style="margin-bottom:2rem;">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
                        '<h3 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin:0;">Study Calendar</h3>' +
                        '<div style="display:flex;align-items:center;gap:6px;">' +
                            '<i class="fas fa-fire" style="font-size:0.75rem;color:#fb923c;"></i>' +
                            '<span style="font-size:0.8rem;font-weight:700;color:var(--text-main);">' + streak + ' day streak</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:16px;padding:18px 16px;">' +
                        dayLabels + rows4 +
                        '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:space-between;">' +
                            '<div>' +
                                '<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">14-Day Consistency</div>' +
                                '<div style="font-size:1.25rem;font-weight:800;color:' + consistencyColor + ';margin-top:2px;">' + consistency + '%</div>' +
                            '</div>' +
                            '<div style="display:flex;align-items:center;gap:8px;">' +
                                '<div style="display:flex;align-items:center;gap:4px;">' +
                                    '<div style="width:10px;height:10px;border-radius:3px;background:rgba(139,92,246,0.6);"></div>' +
                                    '<span style="font-size:0.65rem;color:var(--text-muted);">Studied</span>' +
                                '</div>' +
                                '<div style="display:flex;align-items:center;gap:4px;">' +
                                    '<div style="width:10px;height:10px;border-radius:3px;background:var(--border-glass);"></div>' +
                                    '<span style="font-size:0.65rem;color:var(--text-muted);">Missed</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            })() +

        '</div>';

    document.body.appendChild(page);
    requestAnimationFrame(function() { page.style.transform = 'translateX(0)'; });
};

window._closeProgressPage = function() {
    var page = document.getElementById('_progressPage');
    if (!page) return;
    page.style.transform = 'translateX(100%)';
    setTimeout(function() { page.remove(); }, 320);
};

window._openProgressDeck = function(quizId) {
    window._closeProgressPage();
    var quiz = (window.quizzes || []).find(function(q) { return String(q.id) === String(quizId); });
    if (quiz) {
        window.currentQuiz = quiz;
        window.navigateTo('view-study');
    }
};

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
                    const _upgLink = document.getElementById('maxLimitUpgrade');
                    if (_upgLink) _upgLink.style.display = 'none';

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
                window.logClientError?.('verifyPayment', e, { plan: selectedPlan });
                if (btn)  { btn.textContent = "Verify failed — contact support"; btn.disabled = false; }
                if (iBtn) { iBtn.textContent = "✓ I've paid — Activate"; iBtn.disabled = false; }
            }
        };

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

            const PLAN_CODES = {
                'premium':         'PLN_jcgt20vstjvnf0p',
                'premium_yearly':  'PLN_kjs8v6kzn39cjnp',
                'premium_trial':   'PLN_yegmmewhvf8dw5p',
                'premium_exam':    'PLN_zkdzu95bbxthyn2',
            };
            const planCode = PLAN_CODES[plan];
            if (!planCode) {
                console.error('[Payment] Unknown plan:', plan);
                return;
            }

            var ref = "medx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

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
                    plan:       planCode,
                    ref:        ref,
                    channels:   ['card'],
                    metadata:   { uid: window.currentUser.uid || "", plan: plan },
                    onSuccess: async function(transaction) {
                        await window._activatePremium(transaction.reference);
                    },
                    onCancel: function() {
                    }
                });
                handler.openIframe();
            } catch(err) {
                console.error("Paystack inline error:", err);
                var errBanner = document.getElementById("payErrorBanner"); if (errBanner) { errBanner.textContent = "Payment could not be initialized. Check your connection and try again."; errBanner.style.display = "block"; } else { alert("Payment could not be initialized. Check your connection and try again."); }
            }
        };

        (function checkPendingOnLoad() {
            try {
                const savedRef = localStorage.getItem('medx_pending_ref');
                if (!savedRef) return;
                var attempts = 0;
                var poll = setInterval(async function() {
                    attempts++;
                    if (attempts > 20) { clearInterval(poll); return; }
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
                            const saved = parseInt(savedRef.split('_')[1] || '0', 10);
                            if (Date.now() - saved > 86400000) { localStorage.removeItem('medx_pending_ref'); localStorage.removeItem('medx_pending_plan'); }
                        }
                    } catch(e) {
                        const code = e?.code || '';
                        const _permanent = code === 'functions/failed-precondition'
                                        || code === 'functions/not-found'
                                        || code === 'functions/invalid-argument'
                                        || code === 'functions/permission-denied';
                        if (_permanent) {
                            localStorage.removeItem('medx_pending_ref');
                            localStorage.removeItem('medx_pending_plan');
                            console.log('[MedXcel] Pending ref cleared — payment did not complete');
                        } else {
                            console.log('[MedXcel] Recovery deferred (transient):', code || e?.message || 'unknown');
                            const _saved = parseInt(savedRef.split('_')[1] || '0', 10);
                            if (Date.now() - _saved > 86400000) {
                                localStorage.removeItem('medx_pending_ref');
                                localStorage.removeItem('medx_pending_plan');
                            }
                        }
                    }
                }, 500);
            } catch(_) {}
        })();

        window.initPush = async function (userId) {
            if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
                console.log("[Push] Not a native platform — skipping.");
                return;
            }

            const { PushNotifications } = window.Capacitor.Plugins;
            if (!PushNotifications) {
                console.error("[Push] Plugin missing — run: npm i @capacitor/push-notifications && npx cap sync");
                return;
            }

            PushNotifications.addListener("registration", async (token) => {
                const fcmToken = (token.value || "").trim();
                console.log("[Push] ✅ FCM token received:", fcmToken);

                const uid = userId || window.currentUser?.uid || null;
                if (!uid) {
                    console.error("[Push] No userId at token-save time — aborting.");
                    return;
                }

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

            const permStatus = await PushNotifications.requestPermissions();
            console.log("[Push] Permission:", permStatus.receive);
            if (permStatus.receive !== "granted") {
                console.warn("[Push] Permission not granted — notifications disabled.");
                return;
            }

            await PushNotifications.register();
            console.log("[Push] register() called — awaiting token event...");
        };
(function () {

    let _cards   = [];
    let _idx     = 0;
    let _saving  = false;
    window._mcTitle   = '';
    window._mcSubject = '';

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
    (function(){
        var ab=document.getElementById('mcImportAnkiBtn');
        if(ab) ab.onclick=function(){window._mcImport('anki');};
    })();
    }

    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

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

    window._mcNav = function (dir) {
        _flush();
        const next = _idx + dir;
        if (next < 0 || next >= _cards.length) return;
        _idx = next;
        _render();
    };

    window._mcAdd = function () {
        _flush();
        const card = _cards[_idx];
        if (!card.front.trim() || !card.back.trim()) return;

        if (_idx < _cards.length - 1) {
            _idx++;
            _render();
            return;
        }
        _cards.push({ front: '', back: '' });
        _idx = _cards.length - 1;
        _render();
        setTimeout(() => document.getElementById('mcFrontInput')?.focus(), 60);
    };

    window._mcDelete = function () {
        _flush();
        if (_cards.length <= 1) return;
        _cards.splice(_idx, 1);
        _idx = Math.max(0, Math.min(_idx, _cards.length - 1));
        _render();
    };

    window._mcBack = function () {
        _flush();
        const hasContent = _cards.some(c => c.front.trim() || c.back.trim());
        if (!hasContent) { _exit(); return; }

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

        try {
            if (window.currentUser && window.db) {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                await setDoc(doc(window.db, 'users', window.currentUser.uid, 'quizzes', String(newQuiz.id)), newQuiz);
            }
        } catch (e) { console.warn('[ManualCreate] Firestore save error:', e); }

        const uid   = window.currentUser?.uid || 'guest';
        const store = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid) || '[]');
        store.push(newQuiz);
        localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(store));
        window.quizzes = store;

        try { await window.addXP(valid.length * 5); } catch (e) {}
        window.commitStreakOnAction?.();

        _saving = false;
        _exit();
        window.updateHomeContinueCard?.();
        window.navigateTo('view-study');

        setTimeout(() => {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:var(--accent-btn);color:var(--btn-text);padding:0.625rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:700;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            t.textContent = `${valid.length} card${valid.length !== 1 ? 's' : ''} saved`;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2500);
        }, 350);
    };

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

(function () {

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

    function _fullPayload(u8, pageSize, cellPos, totalPayloadLen) {
        const reservedBytes = u8[20];
        const usable = pageSize - reservedBytes;
        const maxLocal = usable - 35;
        const minLocal = Math.floor((usable - 12) * 32 / 255) - 23;

        if (totalPayloadLen <= maxLocal) {
            return u8.slice(cellPos, cellPos + totalPayloadLen);
        }

        let localSize = minLocal + ((totalPayloadLen - minLocal) % (usable - 4));
        if (localSize > maxLocal) localSize = minLocal;

        const chunks = [u8.slice(cellPos, cellPos + localSize)];

        const dv = new DataView(u8.buffer, u8.byteOffset);
        let ovflPage = dv.getUint32(cellPos + localSize, false);

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
            const pl = _varint(u8, p); p = pl.next;
            const ri = _varint(u8, p); p = ri.next;
            try {
                const payload = _fullPayload(u8, pageSize, p, pl.v);
                rows.push(_record(payload));
            } catch(e) {  }
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
    let _parsed = null;

    window.openAnkiImport = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        _parsed = null;
        _renderAnkiPicker();
        _ankiEnter();
    };

    function _ankiEnter() {
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
    }

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
      <div style="width:3.5rem;height:4.75rem;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="52" height="69"><defs><linearGradient id="abg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#8c8c8c"/><stop offset="100%" stop-color="#383838"/></linearGradient><linearGradient id="agl" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/></linearGradient><linearGradient id="asg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#a3dffc"/><stop offset="100%" stop-color="#147cd6"/></linearGradient><clipPath id="arc"><rect x="20" y="20" width="260" height="360" rx="55"/></clipPath><path id="ast" d="M 0,-50 L 11.2,-15.5 L 47.6,-15.5 L 18.2,5.9 L 29.4,40.5 L 0,19.1 L -29.4,40.5 L -18.2,5.9 L -47.6,-15.5 L -11.2,-15.5 Z"/></defs><rect x="15" y="15" width="270" height="370" rx="60" fill="url(#abg)" stroke="#000000" stroke-width="18"/><path d="M 0,0 L 300,0 L 300,240 C 200,160 100,120 0,130 Z" fill="url(#agl)" clip-path="url(#arc)"/><use href="#ast" transform="translate(135,260) scale(1.65) rotate(-12)" fill="url(#asg)" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/><use href="#ast" transform="translate(205,115) scale(0.8) rotate(15)" fill="url(#asg)" stroke="#ffffff" stroke-width="11" stroke-linejoin="round"/></svg>
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
        window._renderAnkiPicker = _renderAnkiPicker;
    }

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

    function _parseTSV(text) {
        if (!text.trim()) return [];
        const cards = [];
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (!t || t.startsWith('#')) continue;
            const tabIdx = t.indexOf('\t');
            if (tabIdx === -1) continue;
            const front = _stripHTML(t.substring(0, tabIdx).trim());
            const back  = _stripHTML(t.substring(tabIdx + 1).trim());
            if (front && back) cards.push({ front, back, tags: '' });
        }
        return cards;
    }

    window._ankiPasteImport = function() {
        const text  = document.getElementById('ankiPasteArea')?.value || '';
        const cards = _parseTSV(text);
        if (!cards.length) return;
        _parsed = { cards, deckName: 'Anki Import' };
        _renderAnkiPreview();
    };

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
        window._renderAnkiPicker = _renderAnkiPicker;
    }

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

        try {
            if (window.currentUser && window.db) {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                await setDoc(doc(window.db, 'users', window.currentUser.uid, 'quizzes', String(newQuiz.id)), newQuiz);
            }
        } catch(e) { console.warn('[AnkiImport] Firestore error:', e); }

        const uid   = window.currentUser?.uid || 'guest';
        const store = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid) || '[]');
        store.push(newQuiz);
        localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(store));
        window.quizzes = store;

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

    window._ankiBack = _ankiExit;

    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

})();
(function () {

    let _questions  = [];
    let _qIdx       = 0;
    let _bossHP     = 100;
    let _playerHP   = 100;
    let _timer      = null;
    let _timeLeft   = 10;
    let _answered   = false;
    let _deckTitle  = '';
    let _xpDelta    = 0;

    const TOTAL_Q    = 15;
    const BOSS_MAX   = 100;
    const PLAYER_MAX = 100;
    const TIME_PER_Q = 10;

    const DMG_CORRECT_BASE  = 15;
    const DMG_CORRECT_QUICK = 5;
    const DMG_WRONG_PLAYER  = 20;
    const XP_WIN            = 50;
    const XP_LOSE           = -15;

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

    function _enter() {
        document.getElementById('globalBottomNav')?.style.setProperty('transform','translateY(100%)');
        const mv = document.getElementById('bossFightView');
        Object.assign(mv.style, {
            display:'flex', position:'fixed', inset:'0', zIndex:'300',
            background:'#0f0720', flexDirection:'column', overflowY:'auto',
            overflow:'hidden', overflowY:'auto',
            opacity:'0', transform:'translateY(20px)',
            transition:'opacity .22s ease, transform .22s ease',
        });
        requestAnimationFrame(() => { mv.style.opacity='1'; mv.style.transform='translateY(0)'; });
        const _themeMeta = document.querySelector('meta[name="theme-color"]');
        if (_themeMeta) _themeMeta.content = '#0f0720';
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try { const { StatusBar } = window.Capacitor.Plugins; StatusBar.setBackgroundColor({ color: '#0f0720' }); StatusBar.setStyle({ style: 'DARK' }); } catch(e) {}
        }
    }

    function _exit() {
        const mv = document.getElementById('bossFightView');
        if (!mv) return;
        mv.style.opacity='0'; mv.style.transform='translateY(20px)';
        setTimeout(() => { mv.style.display='none'; mv.style.transition=''; }, 230);
        const _isLight = localStorage.getItem('medexcel_theme') !== 'dark';
        const _tm = document.querySelector('meta[name="theme-color"]');
        if (_tm) _tm.content = _isLight ? '#f1f5f9' : '#09090b';
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try { window.syncStatusBar(_isLight); } catch(e) {}
        }
        const nav = document.getElementById('globalBottomNav');
        if (nav) nav.style.transform = '';
        if (_timer) { clearInterval(_timer); _timer = null; }
    }

    function _showNoDeckModal() {
        const existing = document.getElementById('bossNoDeckBackdrop');
        if (existing) existing.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'bossNoDeckBackdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = 'display:flex;opacity:0;align-items:center;justify-content:center;';

        backdrop.innerHTML = `
            <div id="bossNoDeckContent" style="
                background:var(--bg-surface);border:1px solid var(--border-color);
                border-radius:var(--radius-card);padding:2rem 1.5rem 1.5rem;
                width:calc(100% - 2rem);max-width:340px;text-align:center;
                transform:scale(0.88);opacity:0;
                transition:transform 0.4s var(--ease-snap),opacity 0.3s ease;
                position:relative;">
                <div style="display:inline-flex;align-items:center;justify-content:center;
                            width:72px;height:72px;border-radius:50%;
                            background:linear-gradient(135deg,#7c3aed,#a78bfa);
                            margin:0 auto 1.125rem;
                            box-shadow:0 8px 24px rgba(124,58,237,0.3);">
                    <i class="fas fa-dragon" style="font-size:1.875rem;color:#fff;"></i>
                </div>
                <h2 style="font-size:1.25rem;font-weight:800;color:var(--text-main);margin-bottom:0.5rem;letter-spacing:-0.02em;">
                    No deck to fight yet
                </h2>
                <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.55;margin-bottom:1.5rem;">
                    Boss Fight needs a deck with at least <strong style="color:var(--text-main);">5 questions</strong>. Generate one and come back to earn XP.
                </p>
                <div style="display:flex;flex-direction:column;gap:0.5rem;">
                    <button id="bossNoDeckCreateBtn" style="
                        width:100%;padding:0.875rem;border-radius:var(--radius-btn);border:none;
                        background:var(--accent-btn);color:var(--btn-text);
                        font-size:0.9375rem;font-weight:700;cursor:pointer;font-family:inherit;
                        display:flex;align-items:center;justify-content:center;gap:0.5rem;
                        transition:transform 0.15s ease;-webkit-tap-highlight-color:transparent;"
                        onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform=''"
                        ontouchstart="this.style.transform='scale(0.97)'" ontouchend="this.style.transform=''">
                        <i class="fas fa-wand-magic-sparkles"></i> Generate a Deck
                    </button>
                    <button id="bossNoDeckCloseBtn" style="
                        width:100%;padding:0.75rem;border-radius:var(--radius-btn);border:none;
                        background:transparent;color:var(--text-muted);
                        font-size:0.875rem;font-weight:600;cursor:pointer;font-family:inherit;
                        -webkit-tap-highlight-color:transparent;">
                        Maybe later
                    </button>
                </div>
            </div>`;

        document.body.appendChild(backdrop);

        requestAnimationFrame(() => {
            backdrop.style.opacity = '1';
            const c = document.getElementById('bossNoDeckContent');
            if (c) { c.style.opacity = '1'; c.style.transform = 'scale(1)'; }
        });

        const close = () => {
            const c = document.getElementById('bossNoDeckContent');
            if (c) { c.style.opacity = '0'; c.style.transform = 'scale(0.92)'; }
            backdrop.style.opacity = '0';
            setTimeout(() => backdrop.remove(), 350);
        };
        document.getElementById('bossNoDeckCloseBtn')?.addEventListener('click', close);
        document.getElementById('bossNoDeckCreateBtn')?.addEventListener('click', () => {
            close();
            if (typeof window.navigateTo === 'function') {
                setTimeout(() => window.navigateTo('view-create'), 200);
            }
        });
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    }

    window.openBossFight = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        const quizzes = (window.quizzes || []).filter(q => q.questions && q.questions.length >= 5);
        if (!quizzes.length) {
            _showNoDeckModal();
            return;
        }
        _injectStyles();
        _renderDeckPicker(quizzes);
        _enter();
    };

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
                <div style="width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  ${(q.type && q.type.includes('Multiple')) ? '<svg width="36" height="36" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A855F7"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient><linearGradient id="bfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7E22CE"/><stop offset="100%" stop-color="#581C87"/></linearGradient><linearGradient id="bw3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E2E8F0"/></linearGradient><filter id="bds"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#4C1D95" flood-opacity="0.2"/></filter><filter id="bes"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#581C87" flood-opacity="0.25"/></filter></defs><path d="M 140 60 H 300 L 420 180 V 420 Q 420 460 380 460 H 140 Q 100 460 100 420 V 100 Q 100 60 140 60 Z" fill="url(#bdg)" filter="url(#bds)"/><path d="M 300 60 V 140 Q 300 180 340 180 H 420 Z" fill="url(#bfg)"/><path d="M 140 62 H 298 M 102 100 V 420" stroke="#D8B4FE" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5"/><g filter="url(#bes)" fill="url(#bw3)"><circle cx="180" cy="180" r="28"/><rect x="230" y="166" width="110" height="28" rx="14"/><circle cx="180" cy="260" r="28"/><rect x="230" y="246" width="110" height="28" rx="14"/><circle cx="180" cy="340" r="28"/><rect x="230" y="326" width="110" height="28" rx="14"/></g></svg>' : '<svg width="36" height="36" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="48" y="48" width="416" height="416" rx="96" fill="#7C3AED"/><rect x="120" y="140" width="168" height="232" rx="32" fill="#FFFFFF" opacity="0.6" transform="rotate(-20 204 256)"/><rect x="216" y="128" width="168" height="232" rx="32" fill="#FFFFFF" transform="rotate(18 300 244)"/></svg>'}
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
  <div style="display:flex;align-items:center;gap:.75rem;padding:1rem 1.125rem .875rem;background:#0f0720;flex-shrink:0;border-bottom:none;">
    <button onclick="window._bossExit()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:rgba(255,255,255,.12);border:none;display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;transition:transform .1s;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left" style="font-size:.875rem;"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:white;margin:0;flex:1;">Boss Fight</h2>
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

        if (!document.getElementById('bossFadeStyle')) {
            const st = document.createElement('style');
            st.id = 'bossFadeStyle';
            st.textContent = '@keyframes bossFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
            document.head.appendChild(st);
        }

        window._bossExit = _exit;
    }

    window._bossStartFight = function(deckId) {
        const quiz = (window.quizzes||[]).find(q => String(q.id) === String(deckId));
        if (!quiz) return;

        const pool = [...quiz.questions].sort(() => Math.random()-.5).slice(0, TOTAL_Q);
        _questions  = pool;
        _qIdx       = 0;
        _bossHP     = BOSS_MAX;
        _playerHP   = PLAYER_MAX;
        _xpDelta    = 0;
        _deckTitle  = quiz.title;

        _renderFight();
    };

    function _bossSVG(size, extra) {
        const s = size || 64;
        return `<img src="boss.svg" style="width:${s}px;height:${s}px;${extra||''}display:inline-block;object-fit:contain;" alt="Boss">`;
    }

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
  <div style="background:#0f0720;padding:.875rem 1rem .75rem;flex-shrink:0;">

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

    window._bossAnswer = function(idx) {
        if (_answered) return;
        _answered = true;
        if (_timer) { clearInterval(_timer); _timer = null; }

        const q       = _questions[_qIdx];
        const correct = q.correct;
        const isRight = idx === correct;
        const quick   = _timeLeft >= (TIME_PER_Q - 4);

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

    function _endFight(won) {
        if (_timer) { clearInterval(_timer); _timer = null; }
        let xp = XP_LOSE;
        if (won) {
            const today = new Date().toDateString();
            const key   = 'boss_wins_' + today;
            const wins  = parseInt(localStorage.getItem(key) || '0');
            if (wins < 3) {
                localStorage.setItem(key, wins + 1);
                xp = XP_WIN;
            } else {
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

    window._bossConfirmExit = function() {
        if (_timer) clearInterval(_timer);
        _answered = true;

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
        _qIdx = 0; _bossHP = BOSS_MAX; _playerHP = PLAYER_MAX; _xpDelta = 0; _answered = false;
        _questions = [..._questions].sort(() => Math.random() - 0.5);
        if (_timer) { clearInterval(_timer); _timer = null; }
        _renderFight();
    };

    window._bossExitToHome = function() {
        _exit();
        window.navigateTo?.('view-home');
        window.updateHomeContinueCard?.();
    };

    function _esc(s) {
        return String(s||'').replace(/[&<>"']/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

})();

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
        _ensureShimmer();
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

    function _ensureShimmer() {
        if (document.getElementById('_pdfShimmerKf')) return;
        const s = document.createElement('style');
        s.id = '_pdfShimmerKf';
        s.textContent =
            '@keyframes _pdfShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}' +
            '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
    }

    async function _renderGrid(mv) {
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100%;">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);flex-shrink:0;position:sticky;top:0;z-index:5;">
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
    style="display:grid;grid-template-columns:1fr 1fr;gap:0.875rem;padding:1rem;flex:1;">
  </div>

  <!-- Footer -->
  <div style="padding:0.875rem 1.125rem 0.875rem;background:var(--bg-body);border-top:1px solid var(--border-glass);position:sticky;bottom:0;z-index:5;">
    <button id="pdfContinueBtn" onclick="window._pdfConfirm()"
      style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:1rem;font-weight:700;cursor:pointer;">
      Continue with ${_totalPages} pages
    </button>
  </div>

</div>`;

        _ensureShimmer();
        const grid = mv.querySelector('#pdfThumbGrid');

        for (let pageNum = 1; pageNum <= _totalPages; pageNum++) {
            const wrapper = document.createElement('div');
            wrapper.id = `pdfPage_${pageNum}`;
            wrapper.style.cssText = 'position:relative;border-radius:0.75rem;overflow:hidden;cursor:pointer;border:2.5px solid var(--accent-btn);background:var(--bg-surface);transition:border-color 0.15s,opacity 0.15s;';
            wrapper.onclick = () => window._pdfTogglePage(pageNum);

            const skel = document.createElement('div');
            skel.id = `pdfSkel_${pageNum}`;
            skel.style.cssText = 'width:100%;padding-bottom:133%;background:linear-gradient(90deg,var(--bg-surface) 25%,var(--border-glass) 50%,var(--bg-surface) 75%);background-size:200% 100%;animation:_pdfShimmer 1.3s infinite linear;';

            const img = document.createElement('img');
            img.id = `pdfImg_${pageNum}`;
            img.style.cssText = 'width:100%;height:auto;display:none;';
            img.alt = `Page ${pageNum}`;

            const checkEl = document.createElement('div');
            checkEl.id = `pdfCheck_${pageNum}`;
            checkEl.style.cssText = 'position:absolute;bottom:0.5rem;right:0.5rem;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--accent-btn);display:flex;align-items:center;justify-content:center;transition:opacity 0.15s;';
            checkEl.innerHTML = '<i class="fas fa-check" style="font-size:0.6rem;color:white;"></i>';

            const pageLabel = document.createElement('div');
            pageLabel.style.cssText = 'position:absolute;top:0.375rem;left:0.5rem;font-size:0.6rem;font-weight:700;color:white;background:rgba(0,0,0,0.45);padding:2px 6px;border-radius:9999px;';
            pageLabel.textContent = pageNum;

            wrapper.appendChild(skel);
            wrapper.appendChild(img);
            wrapper.appendChild(checkEl);
            wrapper.appendChild(pageLabel);
            grid.appendChild(wrapper);
        }

        _refreshUI();

        (async () => {
            const BATCH_SIZE = 8;
            for (let start = 1; start <= _totalPages; start += BATCH_SIZE) {
                const batch = [];
                for (let p = start; p < start + BATCH_SIZE && p <= _totalPages; p++) {
                    batch.push(_renderPageThumb(p));
                }
                await Promise.all(batch);
            }
        })();
    }

    async function _renderPageThumb(pageNum) {
        try {
            const page     = await _pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const scale    = 200 / viewport.width;
            const scaled   = page.getViewport({ scale });

            const canvas   = document.createElement('canvas');
            canvas.width   = Math.round(scaled.width);
            canvas.height  = Math.round(scaled.height);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise;

            const img  = document.getElementById(`pdfImg_${pageNum}`);
            const skel = document.getElementById(`pdfSkel_${pageNum}`);
            if (img && skel) {
                img.src           = canvas.toDataURL('image/jpeg', 0.6);
                img.style.display = 'block';
                skel.style.display = 'none';
            }
        } catch (_e) {
            const skel = document.getElementById(`pdfSkel_${pageNum}`);
            if (skel) { skel.style.animation = 'none'; skel.style.background = 'var(--bg-surface)'; }
        }
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
            display:'block', position:'fixed', inset:'0', zIndex:'350',
            background:'var(--bg-body)', overflowY:'auto', overflowX:'hidden',
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

(function () {

    let _pptxFile       = null;
    let _slidesData     = [];
    let _selectedSlides = new Set();
    let _totalSlides    = 0;

    let _jszipReady = null;
    function _loadJSZip() {
        if (_jszipReady) return _jszipReady;
        _jszipReady = new Promise((resolve, reject) => {
            if (typeof JSZip !== 'undefined') { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(s);
        });
        return _jszipReady;
    }

    window.openPptxSlideSelector = async function (file) {
        _pptxFile       = file;
        _selectedSlides = new Set();
        _slidesData     = [];

        const mv = _getOverlay();
        _ensureShimmer();
        mv.innerHTML = _loadingHTML(file.name);
        _show(mv);

        try {
            await _loadJSZip();
            const zip = await JSZip.loadAsync(file);

            const slideEntries = Object.keys(zip.files)
                .filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
                .sort((a, b) => {
                    const na = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
                    const nb = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
                    return na - nb;
                });

            if (slideEntries.length === 0) {
                throw new Error('No slides found in this file. It may not be a valid .pptx.');
            }

            _totalSlides = slideEntries.length;

            for (let i = 0; i < slideEntries.length; i++) {
                const xml = await zip.files[slideEntries[i]].async('string');
                const texts = [];
                const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
                let m;
                while ((m = re.exec(xml)) !== null) {
                    const t = _decodeXmlEntities(m[1]).trim();
                    if (t) texts.push(t);
                }
                const title = texts[0] || '(Untitled slide)';
                const body  = texts.slice(1).join(' • ');
                _slidesData.push({ num: i + 1, title, body });
                _selectedSlides.add(i + 1);
            }

            _renderGrid(mv);
        } catch (e) {
            console.error('[PptxSlideSelector]', e);
            mv.innerHTML = _errorHTML(e.message);
        }
    };

    function _decodeXmlEntities(s) {
        return s
            .replace(/&lt;/g,  '<')
            .replace(/&gt;/g,  '>')
            .replace(/&quot;/g,'"')
            .replace(/&apos;/g,"'")
            .replace(/&amp;/g, '&');
    }

    function _ensureShimmer() {
        if (document.getElementById('_pptxAnimKf')) return;
        const s = document.createElement('style');
        s.id = '_pptxAnimKf';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
    }

    function _renderGrid(mv) {
        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100%;">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;border-bottom:1px solid var(--border-glass);background:var(--bg-body);flex-shrink:0;position:sticky;top:0;z-index:5;">
    <button onclick="window._pptxSelectorBack()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-times"></i>
    </button>
    <div style="flex:1;">
      <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0;">Select slides</h2>
      <p style="font-size:0.75rem;color:var(--text-muted);margin:0;" id="pptxSelCount">${_totalSlides} of ${_totalSlides} selected</p>
    </div>
    <button onclick="window._pptxToggleAll()" id="pptxToggleAllBtn"
      style="font-size:0.75rem;font-weight:700;color:var(--accent-btn);background:transparent;border:none;cursor:pointer;padding:0.25rem 0.5rem;">
      Deselect all
    </button>
  </div>

  <!-- Grid (single column — text cards read better stacked than side-by-side) -->
  <div id="pptxSlideGrid"
    style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem;flex:1;">
  </div>

  <!-- Footer -->
  <div style="padding:0.875rem 1.125rem 0.875rem;background:var(--bg-body);border-top:1px solid var(--border-glass);position:sticky;bottom:0;z-index:5;">
    <button id="pptxContinueBtn" onclick="window._pptxConfirm()"
      style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-size:1rem;font-weight:700;cursor:pointer;">
      Continue with ${_totalSlides} slides
    </button>
  </div>

</div>`;

        const grid = mv.querySelector('#pptxSlideGrid');

        for (const slide of _slidesData) {
            const wrapper = document.createElement('div');
            wrapper.id = `pptxSlide_${slide.num}`;
            wrapper.style.cssText = 'position:relative;border-radius:0.75rem;padding:0.875rem 1rem;cursor:pointer;border:2px solid var(--accent-btn);background:var(--bg-surface);transition:border-color 0.15s,opacity 0.15s;';
            wrapper.onclick = () => window._pptxToggleSlide(slide.num);

            const slideLabel = document.createElement('div');
            slideLabel.style.cssText = 'font-size:0.6875rem;font-weight:700;color:var(--accent-btn);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.375rem;';
            slideLabel.textContent = `Slide ${slide.num}`;

            const titleEl = document.createElement('div');
            titleEl.style.cssText = 'font-size:0.9375rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;line-height:1.3;word-break:break-word;';
            titleEl.textContent = slide.title;

            const bodyEl = document.createElement('div');
            bodyEl.style.cssText = 'font-size:0.8125rem;color:var(--text-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;padding-right:2rem;';
            bodyEl.textContent = slide.body || '(no body text)';

            const checkEl = document.createElement('div');
            checkEl.id = `pptxCheck_${slide.num}`;
            checkEl.style.cssText = 'position:absolute;top:0.75rem;right:0.75rem;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--accent-btn);display:flex;align-items:center;justify-content:center;transition:opacity 0.15s;';
            checkEl.innerHTML = '<i class="fas fa-check" style="font-size:0.6rem;color:white;"></i>';

            wrapper.appendChild(slideLabel);
            wrapper.appendChild(titleEl);
            wrapper.appendChild(bodyEl);
            wrapper.appendChild(checkEl);
            grid.appendChild(wrapper);
        }

        _refreshUI();
    }

    window._pptxToggleSlide = function (num) {
        if (_selectedSlides.has(num)) _selectedSlides.delete(num);
        else _selectedSlides.add(num);
        _refreshUI();
    };

    window._pptxToggleAll = function () {
        if (_selectedSlides.size === _totalSlides) _selectedSlides.clear();
        else for (let i = 1; i <= _totalSlides; i++) _selectedSlides.add(i);
        _refreshUI();
    };

    function _refreshUI() {
        const count = _selectedSlides.size;

        const countEl = document.getElementById('pptxSelCount');
        if (countEl) countEl.textContent = `${count} of ${_totalSlides} selected`;

        const toggleBtn = document.getElementById('pptxToggleAllBtn');
        if (toggleBtn) toggleBtn.textContent = count === _totalSlides ? 'Deselect all' : 'Select all';

        const continueBtn = document.getElementById('pptxContinueBtn');
        if (continueBtn) {
            continueBtn.disabled       = count === 0;
            continueBtn.style.opacity  = count === 0 ? '0.45' : '1';
            continueBtn.style.cursor   = count === 0 ? 'not-allowed' : 'pointer';
            continueBtn.textContent    = count === 0
                ? 'Select at least one slide'
                : `Continue with ${count} slide${count !== 1 ? 's' : ''}`;
        }

        for (const slide of _slidesData) {
            const wrapper  = document.getElementById(`pptxSlide_${slide.num}`);
            const checkEl  = document.getElementById(`pptxCheck_${slide.num}`);
            const selected = _selectedSlides.has(slide.num);
            if (wrapper) {
                wrapper.style.borderColor = selected ? 'var(--accent-btn)' : 'var(--border-glass)';
                wrapper.style.opacity     = selected ? '1' : '0.45';
            }
            if (checkEl) checkEl.style.opacity = selected ? '1' : '0';
        }
    }

    window._pptxConfirm = async function () {
        if (_selectedSlides.size === 0) return;

        const btn = document.getElementById('pptxContinueBtn');
        if (btn) { btn.textContent = 'Preparing slides…'; btn.disabled = true; btn.style.opacity = '0.65'; }

        try {
            let finalFile;

            if (_selectedSlides.size === _totalSlides) {
                finalFile = _pptxFile;
            } else {
                const sortedNums = [..._selectedSlides].sort((a, b) => a - b);
                const chunks = sortedNums.map(num => {
                    const s = _slidesData.find(d => d.num === num);
                    if (!s) return '';
                    const head = `--- Slide ${num} ---`;
                    const body = [s.title, s.body].filter(Boolean).join('\n');
                    return `${head}\n${body}`;
                });
                const text = chunks.join('\n\n');

                if (text.trim().length < 20) {
                    throw new Error('The selected slides have almost no text. Pick slides with more content.');
                }

                const blob = new Blob([text], { type: 'text/plain' });
                const baseName = _pptxFile.name.replace(/\.pptx$/i, '');
                finalFile = new File([blob], `${baseName}_slides.txt`, { type: 'text/plain' });
            }

            _hide(_getOverlay());
            window._applySelectedFile(finalFile);

        } catch (e) {
            console.error('[PptxSlideSelector] Confirm error:', e);
            if (btn) {
                btn.textContent = e.message || 'Something went wrong — try again';
                btn.disabled = false; btn.style.opacity = '1';
                btn.style.background = 'rgba(239,68,68,0.1)'; btn.style.color = '#f87171';
            }
            setTimeout(() => {
                if (btn) {
                    btn.style.background = 'var(--accent-btn)'; btn.style.color = 'var(--btn-text)';
                    btn.textContent = `Continue with ${_selectedSlides.size} slide${_selectedSlides.size !== 1 ? 's' : ''}`;
                }
            }, 3000);
        }
    };

    window._pptxSelectorBack = function () {
        _hide(_getOverlay());
        _pptxFile = null; _slidesData = []; _selectedSlides.clear();
    };

    function _getOverlay() {
        let mv = document.getElementById('pptxSlideSelectorView');
        if (!mv) {
            mv = document.createElement('div');
            mv.id = 'pptxSlideSelectorView';
            document.body.appendChild(mv);
        }
        return mv;
    }

    function _show(mv) {
        Object.assign(mv.style, {
            display:'block', position:'fixed', inset:'0', zIndex:'350',
            background:'var(--bg-body)', overflowY:'auto', overflowX:'hidden',
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
            <p style="font-size:0.9375rem;font-weight:600;color:var(--text-main);margin:0;">Reading slides…</p>
            <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">${name}</p>
        </div>`;
    }

    function _errorHTML(msg) {
        return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;gap:1rem;padding:2rem;text-align:center;">
            <i class="fas fa-exclamation-circle" style="font-size:2.5rem;color:#f87171;"></i>
            <p style="font-size:0.9375rem;font-weight:600;color:var(--text-main);margin:0;">Couldn't read slides</p>
            <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">${msg}</p>
            <button onclick="window._pptxSelectorBack()" style="margin-top:0.5rem;padding:0.75rem 1.5rem;border-radius:var(--radius-btn);border:none;background:var(--accent-btn);color:var(--btn-text);font-weight:700;cursor:pointer;">Go back</button>
        </div>`;
    }

})();
