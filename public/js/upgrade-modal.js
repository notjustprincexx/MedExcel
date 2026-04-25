// Upgrade Modal · Theme Toggle
// UPGRADE MODAL — open / close
        // =========================================================

        window.showCustomUpgradeModal = function(maxAllowed) {
            return new Promise(resolve => {
                const backdrop = document.getElementById('upgradeModalBackdrop');
                const sheet    = document.getElementById('upgradeModalSheet');
                if (!backdrop || !sheet) { resolve(true); return; }

                // Populate usage bar — only meaningful when daily cap is hit
                const used = parseInt(document.getElementById('usageCount')?.textContent || '0');
                const cap  = window.userPlan === 'premium' ? 30 : maxAllowed || 5;
                document.getElementById('upgUsageLabel').textContent = `${used} / ${cap}`;
                document.getElementById('upgUsageBar').style.width = cap > 0 ? `${Math.min(100, Math.round((used / cap) * 100))}%` : '100%';
                document.getElementById('upgModalSubtitle').textContent =
                    used >= cap
                        ? `You've used all ${cap} free generations today.`
                        : `Upgrade to unlock more cards per deck and higher daily limits.`;

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