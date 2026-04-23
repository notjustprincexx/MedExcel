/* ── MedExcel Personalized Onboarding ── */
/* Injects full-screen onboarding after login, before homepage loads */

(function() {
    var DONE_KEY = 'medexcel_personalized_onboarding_done';

    var STEPS = [
        {
            id: 'welcome',
            type: 'intro',
            emoji: '👋',
            title: 'Welcome to MedExcel!',
            subtitle: 'The smartest way to study medicine. Let\'s personalise your experience in 60 seconds.',
            btn: 'Get Started'
        },
        {
            id: 'gender',
            type: 'choice',
            emoji: '🧑‍⚕️',
            title: 'Which best describes you?',
            subtitle: 'This helps us pick your default study guide character.',
            options: [
                { value: 'male',   label: 'Male',   icon: '👨‍⚕️' },
                { value: 'female', label: 'Female', icon: '👩‍⚕️' },
                { value: 'other',  label: 'Prefer not to say', icon: '🧑‍⚕️' }
            ]
        },
        {
            id: 'studyProgram',
            type: 'choice',
            emoji: '🏥',
            title: 'What are you studying for?',
            subtitle: 'We\'ll tailor your content to match your programme.',
            options: [
                { value: 'mbbs',     label: 'MBBS / Med School' },
                { value: 'usmle',    label: 'USMLE' },
                { value: 'plab',     label: 'PLAB' },
                { value: 'nursing',  label: 'Nursing' },
                { value: 'pharmacy', label: 'Pharmacy' },
                { value: 'other',    label: 'Other' }
            ]
        },
        {
            id: 'studyLevel',
            type: 'choice',
            emoji: '🎓',
            title: 'What year are you in?',
            subtitle: 'So we can set the right difficulty level for you.',
            options: [
                { value: '1st',      label: '1st Year' },
                { value: '2nd',      label: '2nd Year' },
                { value: '3rd',      label: '3rd Year' },
                { value: '4th',      label: '4th Year' },
                { value: 'final',    label: 'Final Year' },
                { value: 'postgrad', label: 'Post-grad / Resid.' }
            ]
        },
        {
            id: 'studyGoal',
            type: 'choice',
            emoji: '🎯',
            title: 'What\'s your main goal?',
            subtitle: 'We\'ll focus your daily challenges around this.',
            options: [
                { value: 'pass',        label: 'Pass my exams' },
                { value: 'understand',  label: 'Deepen understanding' },
                { value: 'consistency', label: 'Build consistency' },
                { value: 'revise',      label: 'Quick revision' }
            ]
        },
        {
            id: 'studyTime',
            type: 'choice',
            emoji: '⏰',
            title: 'When do you usually study?',
            subtitle: 'We\'ll send your reminders at the right time.',
            options: [
                { value: 'morning',   label: 'Morning 🌅' },
                { value: 'afternoon', label: 'Afternoon ☀️' },
                { value: 'evening',   label: 'Evening 🌆' },
                { value: 'night',     label: 'Night 🌙' }
            ]
        },
        {
            id: 'dailyTarget',
            type: 'choice',
            emoji: '📊',
            title: 'Daily study target?',
            subtitle: 'How many questions or cards do you want to tackle each day?',
            options: [
                { value: '10',  label: '10 items',  sub: 'Easy start' },
                { value: '20',  label: '20 items',  sub: 'Steady pace' },
                { value: '30',  label: '30 items',  sub: 'Serious mode' },
                { value: '50',  label: '50+ items', sub: 'Beast mode' }
            ]
        },
        {
            id: 'reminder',
            type: 'time',
            emoji: '🔔',
            title: 'Set a daily reminder',
            subtitle: 'We\'ll nudge you to study every day so you never break your streak.',
            defaultTime: '20:00'
        },
        {
            id: 'referral',
            type: 'referral',
            emoji: '🎁',
            title: 'Got a referral code?',
            subtitle: "Enter a friend's code to unlock bonus rewards. Tap Skip if you don't have one.",
        },
        {
            id: 'done',
            type: 'outro',
            emoji: '🎉',
            title: 'You\'re all set!',
            subtitle: 'MedExcel is now personalised just for you. Consistency beats cramming — every time.',
            btn: 'Start Studying!'
        }
    ];

    var answers = {};
    var cur = 0;
    var ov, history = [];

    function injectStyles() {
        var s = document.createElement('style');
        s.textContent = `
            #ob-onboard * { box-sizing: border-box; }
            #ob-onboard {
                position: fixed; inset: 0; z-index: 99999;
                background: #f8fafc;
                display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                opacity: 0; transition: opacity 0.3s ease;
            }
            #ob-onboard.light { background: linear-gradient(160deg, #f0f4ff 0%, #f8fafc 60%); }
            .ob-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 20px 0; flex-shrink: 0;
            }
            .ob-back-btn {
                width: 38px; height: 38px; border-radius: 50%;
                background: white; border: 1.5px solid #e2e8f0;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                font-size: 1rem; color: #334155; flex-shrink: 0;
            }
            .ob-skip-link {
                background: none; border: none; color: #8b5cf6;
                font-size: 0.9rem; font-weight: 600; cursor: pointer; padding: 4px 8px;
            }
            .ob-prog-wrap {
                display: flex; gap: 6px; padding: 14px 20px 0; flex-shrink: 0;
            }
            .ob-prog-seg {
                flex: 1; height: 4px; border-radius: 9999px;
                background: #e2e8f0; overflow: hidden;
            }
            .ob-prog-seg-fill {
                height: 100%; border-radius: 9999px;
                background: #8b5cf6; width: 0%;
                transition: width 0.4s ease;
            }
            .ob-step-count {
                text-align: center; font-size: 0.75rem; font-weight: 600;
                color: #94a3b8; padding: 10px 0 0; flex-shrink: 0;
            }
            .ob-body {
                flex: 1; overflow-y: auto; padding: 16px 24px 120px;
                display: flex; flex-direction: column;
            }
            .ob-emoji {
                font-size: 3.5rem; text-align: center; margin-bottom: 12px;
                animation: ob-pop 0.4s cubic-bezier(0.19,1,0.22,1);
            }
            .ob-title {
                font-size: 1.5rem; font-weight: 800; color: #0f172a;
                text-align: center; margin: 0 0 8px; line-height: 1.25;
            }
            .ob-subtitle {
                font-size: 0.875rem; color: #64748b; text-align: center;
                margin: 0 0 24px; line-height: 1.55;
            }
            .ob-options { display: flex; flex-direction: column; gap: 10px; }
            .ob-opt {
                display: flex; align-items: center; justify-content: space-between;
                background: white; border: 1.5px solid #e2e8f0; border-radius: 14px;
                padding: 14px 16px; cursor: pointer;
                transition: all 0.18s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                text-align: left; width: 100%;
            }
            .ob-opt:active { transform: scale(0.98); }
            .ob-opt.selected {
                background: rgba(139,92,246,0.06);
                border-color: #8b5cf6;
                box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
            }
            .ob-opt-left { display: flex; align-items: center; gap: 12px; }
            .ob-opt-icon { font-size: 1.3rem; width: 28px; text-align: center; }
            .ob-opt-text {}
            .ob-opt-label { font-size: 0.9375rem; font-weight: 600; color: #1e293b; }
            .ob-opt-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 1px; }
            .ob-check {
                width: 22px; height: 22px; border-radius: 50%;
                border: 2px solid #cbd5e1; display: flex;
                align-items: center; justify-content: center;
                transition: all 0.18s ease; flex-shrink: 0;
            }
            .ob-opt.selected .ob-check {
                background: #8b5cf6; border-color: #8b5cf6;
            }
            .ob-check-tick {
                width: 10px; height: 10px; opacity: 0; transition: opacity 0.15s;
            }
            .ob-opt.selected .ob-check-tick { opacity: 1; }
            .ob-time-card {
                background: white; border: 1.5px solid #e2e8f0; border-radius: 16px;
                padding: 24px; text-align: center; margin-bottom: 16px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            }
            #ob-time-input {
                background: none; border: none; font-size: 3rem; font-weight: 800;
                color: #8b5cf6; text-align: center; width: 100%; outline: none;
                cursor: pointer;
            }
            .ob-remind-row {
                display: flex; align-items: center; justify-content: space-between;
                background: white; border: 1.5px solid #e2e8f0; border-radius: 14px;
                padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .ob-toggle-track {
                position: relative; width: 46px; height: 26px;
                background: #8b5cf6; border-radius: 9999px; cursor: pointer;
                transition: background 0.2s; flex-shrink: 0;
            }
            .ob-toggle-thumb {
                position: absolute; top: 3px; width: 20px; height: 20px;
                background: white; border-radius: 50%;
                transition: left 0.2s; left: 23px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            }
            .ob-toggle-track.off { background: #cbd5e1; }
            .ob-toggle-track.off .ob-toggle-thumb { left: 3px; }
            .ob-footer {
                position: absolute; bottom: 0; left: 0; right: 0;
                padding: 16px 24px 40px;
                background: linear-gradient(to top, #f8fafc 75%, transparent);
                flex-shrink: 0;
            }
            .ob-main-btn {
                width: 100%; padding: 16px; border: none; border-radius: 14px;
                background: #8b5cf6; color: white; font-size: 1rem; font-weight: 700;
                cursor: pointer; box-shadow: 0 4px 16px rgba(139,92,246,0.35);
                transition: transform 0.15s, box-shadow 0.15s; display: none;
                letter-spacing: 0.01em;
            }
            .ob-main-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(139,92,246,0.3); }
            .ob-content-wrap {
                animation: ob-slidein 0.3s cubic-bezier(0.19,1,0.22,1);
            }
            @keyframes ob-slidein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
            @keyframes ob-pop { from { transform:scale(0.7); opacity:0; } to { transform:scale(1); opacity:1; } }
        `;
        document.head.appendChild(s);
    }

    function build() {
        injectStyles();

        ov = document.createElement('div');
        ov.id = 'ob-onboard';
        ov.className = 'light';

        // Header
        var header = document.createElement('div');
        header.className = 'ob-header';
        header.innerHTML =
            '<button class="ob-back-btn" id="ob-back">&#8592;</button>' +
            '<span style="font-size:0.8rem;font-weight:700;color:#475569;">MedExcel</span>' +
            '<button class="ob-skip-link" id="ob-skip">Skip</button>';
        ov.appendChild(header);

        // Progress segments
        var progWrap = document.createElement('div');
        progWrap.className = 'ob-prog-wrap';
        progWrap.id = 'ob-prog-wrap';
        ov.appendChild(progWrap);

        // Step count
        var stepCount = document.createElement('div');
        stepCount.className = 'ob-step-count';
        stepCount.id = 'ob-step-count';
        ov.appendChild(stepCount);

        // Scrollable body
        var body = document.createElement('div');
        body.className = 'ob-body';
        body.id = 'ob-body';
        ov.appendChild(body);

        // Footer button
        var footer = document.createElement('div');
        footer.className = 'ob-footer';
        footer.innerHTML = '<button class="ob-main-btn" id="ob-main-btn"></button>';
        ov.appendChild(footer);

        document.body.appendChild(ov);

        document.getElementById('ob-back').onclick = goBack;
        document.getElementById('ob-skip').onclick = skipToEnd;
        document.getElementById('ob-main-btn').onclick = handleNext;

        requestAnimationFrame(function() {
            ov.style.opacity = '1';
            renderStep(0);
        });
    }

    function buildProgress(idx) {
        var total = STEPS.length;
        var progWrap = document.getElementById('ob-prog-wrap');
        progWrap.innerHTML = '';
        for (var i = 0; i < total; i++) {
            var seg = document.createElement('div');
            seg.className = 'ob-prog-seg';
            var fill = document.createElement('div');
            fill.className = 'ob-prog-seg-fill';
            fill.style.width = i <= idx ? '100%' : '0%';
            seg.appendChild(fill);
            progWrap.appendChild(seg);
        }
        var sc = document.getElementById('ob-step-count');
        if (sc) sc.textContent = (idx + 1) + ' of ' + total;
    }

    function renderStep(idx) {
        cur = idx;
        var step = STEPS[idx];
        buildProgress(idx);

        var body = document.getElementById('ob-body');
        var mainBtn = document.getElementById('ob-main-btn');
        var backBtn = document.getElementById('ob-back');
        var skipBtn = document.getElementById('ob-skip');

        backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
        skipBtn.style.visibility = (step.type === 'intro' || step.type === 'outro') ? 'hidden' : 'visible';

        // Animate out
        body.style.opacity = '0';
        body.style.transform = 'translateY(8px)';
        body.style.transition = 'opacity 0.15s, transform 0.15s';

        setTimeout(function() {
            body.innerHTML = '';
            var wrap = document.createElement('div');
            wrap.className = 'ob-content-wrap';

            if (step.type === 'intro') {
                wrap.innerHTML =
                    '<div class="ob-emoji">' + step.emoji + '</div>' +
                    '<h1 class="ob-title">' + step.title + '</h1>' +
                    '<p class="ob-subtitle">' + step.subtitle + '</p>';
                mainBtn.textContent = step.btn;
                mainBtn.style.display = 'block';

            } else if (step.type === 'choice') {
                wrap.innerHTML =
                    '<div class="ob-emoji">' + step.emoji + '</div>' +
                    '<h1 class="ob-title">' + step.title + '</h1>' +
                    '<p class="ob-subtitle">' + step.subtitle + '</p>' +
                    '<div class="ob-options" id="ob-opts"></div>';

                body.appendChild(wrap);
                var optsEl = document.getElementById('ob-opts');
                step.options.forEach(function(opt) {
                    var btn = document.createElement('button');
                    btn.className = 'ob-opt' + (answers[step.id] === opt.value ? ' selected' : '');
                    btn.setAttribute('data-val', opt.value);
                    btn.innerHTML =
                        '<div class="ob-opt-left">' +
                            (opt.icon ? '<span class="ob-opt-icon">' + opt.icon + '</span>' : '') +
                            '<div class="ob-opt-text">' +
                                '<div class="ob-opt-label">' + opt.label + '</div>' +
                                (opt.sub ? '<div class="ob-opt-sub">' + opt.sub + '</div>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="ob-check">' +
                            '<svg class="ob-check-tick" viewBox="0 0 10 8" fill="none">' +
                                '<path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
                            '</svg>' +
                        '</div>';
                    btn.onclick = function() {
                        optsEl.querySelectorAll('.ob-opt').forEach(function(b) { b.classList.remove('selected'); });
                        btn.classList.add('selected');
                        answers[step.id] = opt.value;
                        mainBtn.textContent = 'Continue';
                        mainBtn.style.display = 'block';
                    };
                    optsEl.appendChild(btn);
                });

                if (answers[step.id]) {
                    mainBtn.textContent = 'Continue';
                    mainBtn.style.display = 'block';
                } else {
                    mainBtn.style.display = 'none';
                }

                body.style.opacity = '1';
                body.style.transform = 'translateY(0)';
                body.style.transition = 'opacity 0.3s, transform 0.3s';
                return;

            } else if (step.type === 'time') {
                var saved = answers[step.id] || step.defaultTime;
                answers[step.id] = saved;
                answers['reminderEnabled'] = answers['reminderEnabled'] !== false;

                wrap.innerHTML =
                    '<div class="ob-emoji">' + step.emoji + '</div>' +
                    '<h1 class="ob-title">' + step.title + '</h1>' +
                    '<p class="ob-subtitle">' + step.subtitle + '</p>' +
                    '<div class="ob-time-card">' +
                        '<input id="ob-time-input" type="time" value="' + saved + '">' +
                        '<p style="font-size:0.75rem;color:#94a3b8;margin:6px 0 0;">Tap to change</p>' +
                    '</div>' +
                    '<div class="ob-remind-row">' +
                        '<div>' +
                            '<div style="font-size:0.875rem;font-weight:600;color:#1e293b;">Daily reminder</div>' +
                            '<div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Notify me to study every day</div>' +
                        '</div>' +
                        '<div class="ob-toggle-track' + (answers['reminderEnabled'] ? '' : ' off') + '" id="ob-toggle">' +
                            '<div class="ob-toggle-thumb"></div>' +
                        '</div>' +
                    '</div>';

                body.appendChild(wrap);

                document.getElementById('ob-time-input').onchange = function() {
                    answers[step.id] = this.value;
                };
                var toggling = false;
                document.getElementById('ob-toggle').onclick = function() {
                    answers['reminderEnabled'] = !answers['reminderEnabled'];
                    this.classList.toggle('off', !answers['reminderEnabled']);
                    var thumb = this.querySelector('.ob-toggle-thumb');
                    thumb.style.left = answers['reminderEnabled'] ? '23px' : '3px';
                };

                mainBtn.textContent = 'Set Reminder';
                mainBtn.style.display = 'block';

                mainBtn.onclick = async function() {
                    if (answers['reminderEnabled'] !== false) {
                        try {
                            var _pn = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
                            if (_pn) await _pn.requestPermissions();
                        } catch(e) {}
                        // Flag tells firebase.js to call initPush on homepage
                        // to register the FCM token (silent — permission already granted above)
                        localStorage.setItem('medexcel_push_pending', '1');
                    }
                    handleNext();
                };

                body.style.opacity = '1';
                body.style.transform = 'translateY(0)';
                body.style.transition = 'opacity 0.3s, transform 0.3s';
                return;

            } else if (step.type === 'referral') {
                var refVal = answers['referralCode'] || '';
                wrap.innerHTML =
                    '<div class="ob-emoji">' + step.emoji + '</div>' +
                    '<h1 class="ob-title">' + step.title + '</h1>' +
                    '<p class="ob-subtitle">' + step.subtitle + '</p>' +
                    '<div style="background:#F4F3FF;border-radius:20px;padding:20px 16px;margin-bottom:10px;">' +
                        '<input id="ob-ref-input" type="text" placeholder="e.g. PRINCE47" maxlength="20"' +
                        ' style="width:100%;background:white;border:1.5px solid #e2e8f0;border-radius:9999px;' +
                        'padding:14px 18px;font-size:1rem;font-weight:700;font-family:inherit;color:#0f172a;' +
                        'text-transform:uppercase;letter-spacing:0.08em;outline:none;text-align:center;" value="' + refVal + '">' +
                    '</div>' +
                    '<div id="ob-ref-feedback" style="text-align:center;font-size:0.8rem;font-weight:600;min-height:20px;margin-top:4px;color:#8b5cf6;"></div>';

                body.appendChild(wrap);

                var refInp = document.getElementById('ob-ref-input');
                refInp.addEventListener('input', function() {
                    var v = this.value.trim().toUpperCase();
                    this.value = v;
                    answers['referralCode'] = v || null;
                    mainBtn.textContent = v.length > 0 ? 'Claim Code' : 'Skip';
                    document.getElementById('ob-ref-feedback').textContent = '';
                });

                mainBtn.textContent = refVal.length > 0 ? 'Claim Code' : 'Skip';
                mainBtn.style.display = 'block';

                body.style.opacity = '1';
                body.style.transform = 'translateY(0)';
                body.style.transition = 'opacity 0.3s, transform 0.3s';
                return;

            } else if (step.type === 'outro') {
                wrap.innerHTML =
                    '<div class="ob-emoji">' + step.emoji + '</div>' +
                    '<h1 class="ob-title">' + step.title + '</h1>' +
                    '<p class="ob-subtitle">' + step.subtitle + '</p>';
                mainBtn.textContent = step.btn;
                mainBtn.style.display = 'block';
            }

            body.appendChild(wrap);
            body.style.opacity = '1';
            body.style.transform = 'translateY(0)';
            body.style.transition = 'opacity 0.3s, transform 0.3s';
        }, 150);
    }

    function handleNext() {
        if (cur >= STEPS.length - 1) {
            saveAndFinish();
            return;
        }
        history.push(cur);
        renderStep(cur + 1);
    }

    function goBack() {
        if (history.length === 0) return;
        renderStep(history.pop());
    }

    function skipToEnd() {
        saveAndFinish();
    }

    function saveAndFinish() {
        // Determine default avatar based on gender answer
        var gender = answers.gender || 'other';
        var defaultAvatar = gender === 'female' ? 1 : 0; // 0 = male doctor, 1 = female doctor

        var profile = {
            onboardingDone:   true,
            gender:           gender,
            defaultAvatar:    defaultAvatar,
            studyProgram:     answers.studyProgram   || null,
            studyLevel:       answers.studyLevel     || null,
            studyGoal:        answers.studyGoal      || null,
            studyTime:        answers.studyTime      || null,
            dailyTarget:      parseInt(answers.dailyTarget || '20'),
            reminderTime:     answers.reminder       || '20:00',
            reminderEnabled:  answers.reminderEnabled !== false,
            onboardingAt:     new Date().toISOString()
        };

        // Store pending referral code — firebase.js picks it up after login
        if (answers.referralCode) {
            localStorage.setItem('medexcel_pending_referral_code', answers.referralCode.trim().toUpperCase());
        }

        // Save locally
        localStorage.setItem(DONE_KEY, '1');
        localStorage.setItem('medexcel_user_profile', JSON.stringify(profile));
        window.userProfile = profile;

        // Save to Firestore if user is logged in
        function trySaveFirestore() {
            if (window.currentUser && window._updateDoc && window._doc && window.db) {
                window._updateDoc(
                    window._doc(window.db, 'users', window.currentUser.uid),
                    profile
                ).catch(function(e) { console.warn('[Onboarding] Firestore save failed', e); });
                // Set avatar in localStorage for immediate effect
                localStorage.setItem('medexcel_avatar_' + window.currentUser.uid, String(defaultAvatar));
                return true;
            }
            return false;
        }

        if (!trySaveFirestore()) {
            // Retry after auth settles
            var attempts = 0;
            var retry = setInterval(function() {
                if (trySaveFirestore() || attempts++ > 10) clearInterval(retry);
            }, 500);
        }

        // Animate out then go to homepage
        ov.style.opacity = '0';
        ov.style.transition = 'opacity 0.4s ease';
        setTimeout(function() {
            ov.remove();
            // If already logged in go to homepage, else wait for login
            var savedUser = localStorage.getItem('nativeUser');
            if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
                window.location.replace('homepage.html');
            }
            // If not logged in yet, login flow will redirect naturally
        }, 400);
    }

    // Expose for auth flow to call after login
    window.showPersonalizedOnboarding = function() {
        if (!document.getElementById('ob-onboard')) build();
    };
    window.launchPersonalizedOnboarding = window.showPersonalizedOnboarding;
})();
