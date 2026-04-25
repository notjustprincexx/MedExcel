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
                    if (ctaEl) ctaEl.textContent = 'Subscribe Yearly — ₦14,999';
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

            // ── Map MedXcel plan names → Paystack plan codes ─────────────────
            // Price and billing cycle are controlled by the Paystack plan itself.
            var PLAN_CODES = {
                'premium':         'PLN_jcgt20vstjvnf0p', // ₦1,999/month
                'premium_monthly': 'PLN_jcgt20vstjvnf0p', // ₦1,999/month (alias)
                'premium_yearly':  'PLN_kjs8v6kzn39cjnp', // ₦14,999/year
                'premium_trial':   'PLN_yegmmewhvf8dw5p', // ₦250 one-time trial
                'premium_exam':    'PLN_zkdzu95bbxthyn2', // ₦4,999/quarter
            };
            var planCode = PLAN_CODES[plan];
            if (!planCode) {
                console.error('[Payment] Unknown plan:', plan);
                return;
            }

            var ref = "medx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

            // ── Store pending ref so we can recover if the app restarts mid-payment ──
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
                        // ── Always verify server-side — never trust the client callback alone ──
                        // Firestore rules block direct plan writes from the client anyway.
                        try {
                            if (typeof window._activatePremium === 'function') {
                                // app.bundletest.js already defines this — reuse it
                                await window._activatePremium(transaction.reference);
                            } else {
                                // Standalone fallback: call the Cloud Function directly
                                const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js");
                                const fns    = getFunctions(window.auth?.app || window.firebaseApp, "us-central1");
                                const verify = httpsCallable(fns, "verifySubscriptionPayment");
                                const result = await verify({ reference: transaction.reference });
                                if (result.data?.success) {
                                    try { localStorage.removeItem('medx_pending_ref'); localStorage.removeItem('medx_pending_plan'); } catch(_) {}
                                    window._pendingPayRef  = null;
                                    window._pendingPayPlan = null;
                                    const newPlan = result.data.plan;
                                    window.userPlan = newPlan;
                                    if (typeof window.updatePlanIcon === 'function') window.updatePlanIcon(newPlan);
                                    if (typeof window.applyAvatar    === 'function') window.applyAvatar();
                                    var btn = document.getElementById('payCTABtn');
                                    if (btn) { btn.textContent = "✓ You're Premium!"; btn.style.background = "var(--accent-green, #22c55e)"; btn.style.color = "#000"; }
                                    setTimeout(function() { if (typeof navigateTo === 'function') navigateTo('view-home'); }, 1800);
                                }
                            }
                        } catch(e) {
                            console.error('[Payment] Verification failed:', e);
                            // Don't clear pending ref — auto-recovery on next load will retry
                        }
                    },
                    onCancel: function() {
                        // Don't clear pending ref — user may re-open and complete payment
                    }
                });
                handler.openIframe();
            } catch(err) {
                console.error("Paystack error:", err);
                window.openPaymentModal(plan === "elite" ? "https://paystack.shop/pay/lw17s2ggpj" : "https://paystack.shop/pay/5wqjry1l0a");
            }
        };
