/*AVATAR PICKER
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
                        </div>
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
            const saved = localStorage.getItem('medexcel_avatar_' + (window.currentUser?.uid || 'guest'));
            const wrap = document.getElementById('profileAvatarWrap');
            const homeBtn = document.getElementById('homeAvatarBtn');
            const initial = document.getElementById('userInitial');
            const storedInitial = initial ? initial.textContent : (document.getElementById('homeAvatarInitial') ? document.getElementById('homeAvatarInitial').textContent : '?');

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
