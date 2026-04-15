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