// Home View
// --- HOME UI LOGIC ---
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