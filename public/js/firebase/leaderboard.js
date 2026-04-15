// Leaderboard Logic
        // Leaderboard colour palette for user initials
        const LB_COLORS = [
            ['#7c3aed','#ede9fe'],['#0369a1','#e0f2fe'],['#065f46','#d1fae5'],
            ['#9a3412','#ffedd5'],['#be185d','#fce7f3'],['#1e40af','#dbeafe'],
            ['#854d0e','#fef9c3'],['#4d7c0f','#ecfccb'],['#155e75','#cffafe'],
        ];
        function lbColorFor(name) {
            let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
            return LB_COLORS[Math.abs(h) % LB_COLORS.length];
        }

        // Build an avatar element for a leaderboard user
        function lbAvatarHTML(user, size, currentUserId) {
            const isMe = user.uid === currentUserId;
            // Use Firestore avatarIndex for all users; fall back to localStorage for current user
            let avatarIndex = user.avatarIndex ?? null;
            if (isMe && avatarIndex === null) {
                const saved = localStorage.getItem('medexcel_avatar_' + (currentUserId || 'guest'));
                if (saved !== null) avatarIndex = parseInt(saved);
            }
            if (avatarIndex !== null && AVATAR_GRID) {
                const a = AVATAR_GRID[parseInt(avatarIndex)];
                if (a) return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;background-image:url('${AVATAR_IMAGE_PATH}');background-size:300% 300%;background-position:${a.col*50}% ${a.row*50}%;flex-shrink:0;"></div>`;
            }
            const [bg, fg] = lbColorFor(user.displayName || '?');
            const initial = window.getInitial ? window.getInitial(user.displayName) : (user.displayName||'?').charAt(0).toUpperCase();
            return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.35)}px;color:${fg};flex-shrink:0;">${initial}</div>`;
        }

        // Tab state
        window._lbTab = 'alltime';
        window._lbUsers = [];
        window._lbUserId = null;

        window.switchLbTab = function(tab) {
            window._lbTab = tab;
            const allBtn = document.getElementById('lbTabAllTime');
            const wkBtn  = document.getElementById('lbTabWeek');
            if (allBtn) {
                const on = tab === 'alltime';
                allBtn.style.background  = on ? 'var(--accent-btn)' : 'transparent';
                allBtn.style.color       = on ? 'var(--btn-text)'   : 'var(--text-muted)';
                allBtn.style.boxShadow   = on ? '0 2px 8px rgba(139,92,246,0.3)' : 'none';
            }
            if (wkBtn) {
                const on = tab === 'week';
                wkBtn.style.background   = on ? 'var(--accent-btn)' : 'transparent';
                wkBtn.style.color        = on ? 'var(--btn-text)'   : 'var(--text-muted)';
                wkBtn.style.boxShadow    = on ? '0 2px 8px rgba(139,92,246,0.3)' : 'none';
            }
            // Re-fetch fresh data when switching to This Week so weeklyXp is current
            if (tab === 'week' && window._lbUserId) {
                window.loadLeaderboard(window._lbUserId);
            } else if (window._lbUsers.length) {
                window.renderLeaderboardDOM(window._lbUsers, window._lbUserId);
            }
        };

        window.loadLeaderboard = async function(currentUserId) {
            window._lbUserId = currentUserId;
            try {
                const uiXP = document.getElementById('currentUserXp');
                if (uiXP) { uiXP.classList.remove('skeleton'); uiXP.style.cssText=''; uiXP.textContent = window.formatXP(window.userStats?.xp || 0); }
                const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(50));
                const snap = await getDocs(q);
                let fetched = [];
                snap.forEach(d => {
                    const data = d.data();
                    if (data.xp && data.xp > 0) fetched.push({
                        uid: d.id,
                        displayName: data.displayName || data.email?.split('@')[0] || "User",
                        xp: data.xp,
                        weeklyXp: data.weeklyXp || 0,
                        avatarIndex: data.avatarIndex ?? null,
                    });
                });
                window._lbUsers = fetched;
                window.renderLeaderboardDOM(fetched, currentUserId);
            } catch(e) {
                const lc = document.getElementById('leaderboardList');
                if (lc) {
                    lc.innerHTML = e.message?.includes("index")
                        ? `<div style="text-align:center;color:#f59e0b;padding:1.5rem;font-size:0.875rem;"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Firebase index required.</div>`
                        : `<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-size:0.875rem;">Failed to load leaderboard.</div>`;
                }
            }
        };

        window.renderLeaderboardDOM = function(allUsers, currentUserId) {
            const useWeekly = window._lbTab === 'week';
            // Sort by the right XP field
            let users = [...allUsers].sort((a,b) => (useWeekly ? b.weeklyXp - a.weeklyXp : b.xp - a.xp));
            // Filter out zero weekly XP if in weekly mode
            if (useWeekly) users = users.filter(u => u.weeklyXp > 0);

            const listContainer = document.getElementById('leaderboardList');
            const skeletons = ['name1','xp1','avatarBox1','name2','xp2','avatarBox2','name3','xp3','avatarBox3'];
            skeletons.forEach(id => { const el = document.getElementById(id); if (el) { el.classList.remove('skeleton'); el.style.width='auto'; el.style.height='auto'; } });

            // Empty state
            if (users.length === 0) {
                ['name1','name2','name3'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='---'; });
                ['xp1','xp2','xp3'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=''; });
                listContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem 1rem;font-size:0.875rem;font-weight:500;">${useWeekly ? 'No activity this week yet — go study!' : 'No users have earned XP yet!'}</div>`;
                document.getElementById('yourRankBar').style.display = 'none';
                return;
            }

            const xpField = useWeekly ? 'weeklyXp' : 'xp';

            // --- Podium top 3 ---
            const podiumSlots = [
                { nameId:'name1', xpId:'xp1', boxId:'avatarBox1', avatarId:'avatar1' },
                { nameId:'name2', xpId:'xp2', boxId:'avatarBox2', avatarId:'avatar2' },
                { nameId:'name3', xpId:'xp3', boxId:'avatarBox3', avatarId:'avatar3' },
            ];
            const podiumOrder = [users[0], users[1], users[2]]; // 1st, 2nd, 3rd
            podiumSlots.forEach((slot, i) => {
                const u = podiumOrder[i];
                const nameEl = document.getElementById(slot.nameId);
                const xpEl   = document.getElementById(slot.xpId);
                const boxEl  = document.getElementById(slot.boxId);
                if (!u) { if(nameEl) nameEl.textContent='—'; if(xpEl) xpEl.textContent=''; return; }
                if (nameEl) nameEl.textContent = u.displayName;
                if (xpEl)   xpEl.textContent   = window.formatXP(u[xpField]);
                if (boxEl) {
                    const size = i === 0 ? 76 : 56;
                    boxEl.innerHTML = lbAvatarHTML(u, size, currentUserId);
                }
            });

            // --- Ranked list (ranks 4–10) ---
            listContainer.innerHTML = '';
            if (users.length <= 3) {
                listContainer.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:1.5rem 1rem;font-size:0.8125rem;">Only ${users.length} user${users.length===1?'':'s'} so far. Be the one to break in!</div>`;
            }

            let currentUserRank = -1;
            users.forEach((user, index) => {
                const rank = index + 1;
                if (user.uid === currentUserId) currentUserRank = rank;
                if (rank <= 3 || rank > 10) return; // podium already shown, cap at 10

                const isMe = user.uid === currentUserId;
                const avatarHTML = lbAvatarHTML(user, 40, currentUserId);
                const [bg] = lbColorFor(user.displayName);
                const rowBg = isMe ? 'background:rgba(139,92,246,0.1);border-color:var(--accent-btn);' : 'background:transparent;border-color:var(--border-color);';
                const nameCls = isMe ? 'color:var(--accent-btn);' : 'color:var(--text-main);';

                listContainer.innerHTML += `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0.75rem;border-radius:0.875rem;border:1px solid;${rowBg}animation:fadeIn 0.3s ease-out forwards;opacity:0;animation-delay:${(index-3)*0.04}s;">
                        <div style="display:flex;align-items:center;gap:0.875rem;flex:1;min-width:0;">
                            <span style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);width:20px;text-align:center;flex-shrink:0;">${rank}</span>
                            ${avatarHTML}
                            <div style="min-width:0;flex:1;">
                                <div style="font-size:0.875rem;font-weight:700;${nameCls}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${user.displayName}
                                    ${isMe ? '<span style="font-size:0.625rem;margin-left:6px;padding:2px 7px;background:var(--accent-btn);color:var(--btn-text);border-radius:9999px;font-weight:800;vertical-align:middle;">YOU</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div style="flex-shrink:0;margin-left:0.75rem;text-align:right;">
                            <span style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);">${window.formatXP(user[xpField])}</span>
                        </div>
                    </div>`;
            });

            // --- Pinned Your Rank Bar ---
            const bar = document.getElementById('yourRankBar');
            if (currentUserRank > 0 && bar) {
                const me = users[currentUserRank - 1];
                const saved = localStorage.getItem('medexcel_avatar_' + (window.currentUser?.uid || 'guest'));
                const avatarWrap = document.getElementById('yourRankAvatarWrap');
                if (avatarWrap) {
                    if (saved !== null && AVATAR_GRID) {
                        const a = AVATAR_GRID[parseInt(saved)];
                        if (a) avatarWrap.innerHTML = `<div style="width:100%;height:100%;background-image:url('${AVATAR_IMAGE_PATH}');background-size:300% 300%;background-position:${a.col*50}% ${a.row*50}%;"></div>`;
                    } else {
                        avatarWrap.textContent = window.getInitial ? window.getInitial(me.displayName) : me.displayName.charAt(0).toUpperCase();
                    }
                }
                const rankNameEl = document.getElementById('yourRankName');
                const rankXpEl   = document.getElementById('yourRankXp');
                const rankNumEl  = document.getElementById('yourRankNum');
                if (rankNameEl) rankNameEl.textContent = me.displayName;
                if (rankXpEl)   rankXpEl.textContent   = window.formatXP(me[xpField]) + ' XP';
                if (rankNumEl)  rankNumEl.textContent   = `#${currentUserRank}`;
                bar.style.display = 'block';
            } else if (bar) {
                bar.style.display = 'none';
            }
        };
