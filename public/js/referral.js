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