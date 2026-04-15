window.initUserUI = async function(user) {
            try {
                let savedName = user.displayName || (user.email ? user.email.split("@")[0] : "User");
                
                // Set Profile texts
                const uNameEl = document.getElementById("userName"); if(uNameEl) uNameEl.textContent = savedName;
                const uEmailEl = document.getElementById("userEmail"); if(uEmailEl) uEmailEl.textContent = user.email || "";
                const uInitEl = document.getElementById("userInitial"); if(uInitEl) uInitEl.textContent = user.email ? user.email.charAt(0).toUpperCase() : "?";
                const uHomeInit = document.getElementById("homeAvatarInitial"); if(uHomeInit) uHomeInit.textContent = user.email ? user.email.charAt(0).toUpperCase() : "?";
                window.applyAvatar();

                // Fetch Quizzes securely
                try {
                    const qSnap = await getDocs(collection(db, "users", user.uid, "quizzes"));
                    let loadedQuizzes = []; qSnap.forEach(d => loadedQuizzes.push(d.data()));
                    loadedQuizzes.sort((a,b) => a.id - b.id); window.quizzes = loadedQuizzes;
                    localStorage.setItem('medexcel_quizzes_' + user.uid, JSON.stringify(window.quizzes));
                } catch(e) { window.quizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + user.uid)) || []; }

                // Fetch Main Doc — create it immediately if this is a new user (e.g. first Google sign-in)
                const userRef = doc(db, "users", user.uid);
                let userDoc = await getDoc(userRef);
                let data;

                if (userDoc.exists()) {
                    data = userDoc.data();
                    // Sync Firestore avatar → localStorage so it shows correctly on any device or after account switch
                    if (data.avatarIndex !== undefined && data.avatarIndex !== null) {
                        localStorage.setItem('medexcel_avatar_' + user.uid, data.avatarIndex.toString());
                        window.applyAvatar();
                    }
                } else {
                    // New user — provision their Firestore document now with safe defaults
                    data = {
                        uid: user.uid,
                        email: user.email || "",
                        displayName: savedName,
                        xp: 0,
                        streak: 0,
                        lastCheckIn: null,
                        plan: "free",
                        planUsed: 0,
                        dailyUsage: 0,
                        lastDailyReset: "",
                        achievements: [],
                        createdAt: serverTimestamp()
                    };
                    try { await setDoc(userRef, data, { merge: true }); } catch(e) { console.warn("Could not create user doc:", e); }
                }

                // ---- UI updates — always run for both new and existing users ----

                // Home Greeting
                const greetingTitle = document.getElementById('greetingTitle');
                if(greetingTitle) { greetingTitle.classList.remove('skeleton'); greetingTitle.style.width='auto'; greetingTitle.style.height='auto'; greetingTitle.innerHTML = `Hi, ${savedName} ${window.getTimeEmoji()}`; }

                // Streak logic
                const storageKey = 'medexcel_streak_' + user.uid;
                let localStreak = JSON.parse(localStorage.getItem(storageKey));
                if (data.lastCheckIn) { localStreak = { count: data.streak || 0, lastDate: data.lastCheckIn }; localStorage.setItem(storageKey, JSON.stringify(localStreak)); }
                if (!localStreak) localStreak = { count: 0, lastDate: null };

                window.userStats = { xp: data.xp || 0, weeklyXp: data.weeklyXp || 0, level: 1, streak: localStreak.count, count: localStreak.count, lastDate: localStreak.lastDate };

                // Seed week key so addXP doesn't wipe weeklyXp on first call this session
                const _wkKey = (function() {
                    const now = new Date(); const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    const mon = new Date(now.getFullYear(), now.getMonth(), diff);
                    return mon.toISOString().split('T')[0];
                })();
                if (!localStorage.getItem('medexcel_weekkey_' + user.uid)) {
                    localStorage.setItem('medexcel_weekkey_' + user.uid, _wkKey);
                }
                localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));

                const todayStr = new Date().toDateString(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const yesterdayStr = yesterday.toDateString();
                if (localStreak.lastDate === todayStr) { hasCheckedInToday = true; currentStreakCount = localStreak.count; }
                else if (localStreak.lastDate === yesterdayStr) { hasCheckedInToday = false; currentStreakCount = localStreak.count + 1; }
                else { hasCheckedInToday = false; currentStreakCount = 1; }

                const headerDisplay = document.getElementById('headerStreakDisplay'); const headerFireIcon = document.getElementById('headerFireIcon');
                if(headerDisplay) { headerDisplay.classList.remove('skeleton'); headerDisplay.style.width='auto'; headerDisplay.style.height='auto'; }
                if (!hasCheckedInToday) { if(headerDisplay) headerDisplay.textContent = Math.max(0, currentStreakCount - 1); if(headerFireIcon) headerFireIcon.style.opacity = '0.4'; setTimeout(() => window.openStreakModal(), 500); }
                else { if(headerDisplay) headerDisplay.textContent = currentStreakCount; if(headerFireIcon) headerFireIcon.style.opacity = '1'; }

                // Profile & limits UI
                const pStreak = document.getElementById("profileStreakCount"); if(pStreak) pStreak.textContent = currentStreakCount;
                const studyStreak = document.getElementById("studyStreakDisplay"); if(studyStreak) studyStreak.textContent = `${currentStreakCount} Day`;
                const sXp = document.getElementById("studyXpDisplay"); if(sXp) sXp.textContent = window.formatXP(data.xp || 0);
                if (data.createdAt && data.createdAt.toDate) { const dateObj = data.createdAt.toDate(); const memberSince = document.getElementById("memberSince"); if(memberSince) memberSince.textContent = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }

                window.userPlan = data.plan || "free";
                const isToday = data.lastDailyReset === new Date().toISOString().split("T")[0];
                const dailyUsage = isToday ? (data.planUsed || data.dailyUsage || 0) : 0;
                const barEl = document.getElementById('usageProgressBar'); const usageCountEl = document.getElementById('usageCount');
                if(usageCountEl) usageCountEl.textContent = dailyUsage;

                const planConfig = {
                    premium: { max: 30, cap: 30, bar: "#3b82f6" },
                    free:    { max: 15, cap:  5, bar: "#94a3b8" }
                };
                const pc = planConfig[window.userPlan] || planConfig.free;
                window.allowedMaxItems = pc.max;
                if(barEl) { barEl.style.width = `${Math.min(100, (dailyUsage / pc.cap) * 100)}%`; barEl.style.background = pc.bar; }
                const maxText = document.getElementById('maxLimitText'); if(maxText) maxText.textContent = `(Max: ${window.allowedMaxItems})`;

                // Plan icon, XP level, achievements, library
                window.updatePlanIcon(window.userPlan);
                window.updateProfileXP(data.xp || 0);
                window.renderAchievements(data.achievements || []);
                window.updateHomeContinueCard();
                window.renderLibrary('all', '');

                // ---- REFERRAL SYSTEM INIT ----
                // 1. Ensure user has a referral code (backfill for existing users)
                if (!data.referralCode && user.uid) {
                    const myCode = user.uid.substring(0, 8).toUpperCase();
                    try { await updateDoc(userRef, { referralCode: myCode, referralCount: data.referralCount || 0 }); data.referralCode = myCode; } catch(e) {}
                }

                // 2. Load referral data into UI
                if (typeof window.loadReferralData === 'function') window.loadReferralData(data);

                // 3. Apply any active referral boost to limits
                if (typeof window.applyReferralBoost === 'function') window.applyReferralBoost(data);

                // 4. Process pending referral attribution (runs once for users who were referred)
                if (data.referredBy && !data.referralProcessed && data.referredBy !== data.referralCode) {
                    try {
                        // Find referrer by their referralCode field
                        const { query: fsQuery, where, collection: fsCollection, increment: fsIncrement } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                        const refQuery = fsQuery(fsCollection(db, "users"), where("referralCode", "==", data.referredBy));
                        const { getDocs: gds } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                        const refSnap = await gds(refQuery);
                        if (!refSnap.empty) {
                            const referrerDoc = refSnap.docs[0];
                            const referrerData = referrerDoc.data();
                            const newCount = (referrerData.referralCount || 0) + 1;
                            // Determine reward to apply
                            const rewards = [
                                { at: 20, type: 'ambassador',   xp: 0,    days: 0    },
                                { at: 10, type: 'month_premium', xp: 0,    days: 30   },
                                { at: 5,  type: 'week_premium',  xp: 0,    days: 7    },
                                { at: 3,  type: 'limit_2x',      xp: 0,    days: 7    },
                                { at: 1,  type: 'xp',            xp: 500,  days: 0    },
                            ];
                            const rewardToApply = rewards.find(r => newCount === r.at);
                            let referrerUpdate = { referralCount: newCount };
                            if (rewardToApply) {
                                if (rewardToApply.xp > 0) {
                                    referrerUpdate.xp = (referrerData.xp || 0) + rewardToApply.xp;
                                }
                                if (rewardToApply.days > 0) {
                                    const expiry = new Date();
                                    expiry.setDate(expiry.getDate() + rewardToApply.days);
                                    referrerUpdate.referralBoostExpiry = expiry.toISOString();
                                    referrerUpdate.referralBoostType   = rewardToApply.type;
                                }
                                if (rewardToApply.type === 'ambassador') {
                                    referrerUpdate.referralBoostType = 'ambassador';
                                }
                            }
                            await updateDoc(doc(db, "users", referrerDoc.id), referrerUpdate);
                        }
                        // Mark as processed so we don't double-count
                        await updateDoc(userRef, { referralProcessed: true });
                    } catch(e) { console.warn("Referral attribution failed (will retry):", e); }
                }
            } catch(e) { console.warn("Init Error:", e); }
        };

        // Top level Firebase Auth listener
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                window.currentUser = firebaseUser;
                await window.initUserUI(firebaseUser);
                window.loadLeaderboard(firebaseUser.uid);
                if (window.initPush) window.initPush(firebaseUser.uid);
            } else {
                window.currentUser = null;
                const _authTheme = localStorage.getItem('medexcel_theme');
                localStorage.clear();
                if (_authTheme) localStorage.setItem('medexcel_theme', _authTheme);
                window.location.replace("index.html");
            }
