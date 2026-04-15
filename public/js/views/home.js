// Home View
// --- HOME UI LOGIC ---

        // Render last 3 decks dynamically — empty state if none
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
                const pct = count > 0 ? Math.round((best / count) * 100) : 0;
                const pctColor = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--text-muted)';
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
                        <span class="text-[14px] font-bold" style="color:${pctColor}">+${pct}%</span>
                    </div>
                </a>`;
            }).join('');
        };
        // Carousel Sync
        const carousel = document.getElementById('promoCarousel');
        const indicators = document.querySelectorAll('.promo-dot');
        if(carousel && indicators.length > 0) {
            carousel.addEventListener('scroll', () => {
                const scrollPosition = carousel.scrollLeft;
                const cardWidth = carousel.offsetWidth;
                const activeIndex = Math.round(scrollPosition / cardWidth);
                indicators.forEach((dot, index) => {
                    if (index === activeIndex) dot.classList.add('active'); else dot.classList.remove('active');
                });
            });
        }

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
            const dates = [];
            const today = new Date();
            const currentDayIndex = (today.getDay() + 6) % 7; 
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(today); d.setDate(today.getDate() - currentDayIndex + i); dates.push(d.getDate());
            }

            let html = '';
            for(let i=0; i<7; i++) {
                let circleClass = "day-circle";
                let content = dates[i];
                if (i < currentDayIndex) { circleClass += " done"; content = '<i class="fas fa-check"></i>'; } 
                else if (i === currentDayIndex) { circleClass += " active"; if (hasCheckedInToday) content = '<i class="fas fa-check"></i>'; }
                html += `<div class="day-col"><span class="day-label text-xs font-bold text-[var(--text-muted)]">${labels[i]}</span><div class="${circleClass}">${content}</div></div>`;
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
                if (hasCheckedInToday) {
                    titleEl.innerHTML = `You're on fire! 🔥<br>Keep this streak going tomorrow!`;
                } else {
                    titleEl.innerHTML = `${todayMsg.sub}`;
                }
            }
            
            if (!fireLottieAnim) {
                fireLottieAnim = lottie.loadAnimation({
                    container: document.getElementById('modalStreakLottie'),
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: 'fire.json'
                });
            } else {
                fireLottieAnim.play();
            }
            
            document.getElementById('streakModalBackdrop').classList.add('show');
        };

        document.getElementById('closeStreakModal').onclick = () => {
            if (!hasCheckedInToday && window.currentUser) {
                window.userStats.count = currentStreakCount;
                window.userStats.lastDate = new Date().toDateString();
                localStorage.setItem('medexcel_user_stats', JSON.stringify(window.userStats));
                hasCheckedInToday = true;
                if (window.syncUserStreak) window.syncUserStreak(window.currentUser.uid, currentStreakCount, window.userStats.lastDate);
            }
            window.closeGlobalModal('streakModalBackdrop');
            const hDisplay = document.getElementById('headerStreakDisplay');
            if(hDisplay) hDisplay.textContent = currentStreakCount;
            const hIcon = document.getElementById('headerFireIcon');
            if(hIcon) hIcon.style.opacity = '1';
        };