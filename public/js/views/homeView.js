// js/views/homeView.js
import { auth, db } from '../app.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const HomeView = {
    render: async () => {
        return `
            <div id="streakModalBackdrop" class="fixed inset-0 hidden items-start justify-center z-[99999] bg-black/70 backdrop-blur-sm transition-opacity opacity-0">
                <div class="w-full bg-gradient-to-b from-[#050814] to-[#0f0505] rounded-b-[24px] pt-[calc(env(safe-area-inset-top,0px)+2rem)] px-6 pb-10 transform -translate-y-full transition-transform duration-400 ease-out text-center border-b border-orange-500/15 flex flex-col items-center" id="streakDialog">
                    <div id="modalStreakLottie" style="width: 72px; height: 72px; margin-bottom: 0.25rem;"></div>
                    <div class="text-3xl font-extrabold text-white mb-1">Day <span id="modalDayCount">1</span></div>
                    <h3 class="text-[15px] text-slate-400 font-medium mb-6 leading-relaxed">Keep the fire alive<br>check in today!</h3>
                    <div class="flex justify-center gap-2 w-full mb-10" id="calendarRow"></div>
                    <button id="closeStreakModal" class="w-[90%] max-w-[320px] bg-orange-500 text-white py-4 rounded-full font-extrabold text-lg uppercase tracking-widest shadow-[0_5px_0_#c2410c,0_8px_16px_rgba(249,115,22,0.3)] active:translate-y-[5px] active:shadow-[0_0px_0_#c2410c,0_4px_8px_rgba(249,115,22,0.3)] transition-all block mx-auto">Check in today!</button>
                </div>
            </div>

            <header class="pt-6 pb-4 px-6 flex items-center justify-between z-10 sticky top-0 bg-[#050814]/85 backdrop-blur-md">
                <h1 id="greetingTitle" class="text-lg font-semibold flex-1 whitespace-nowrap truncate">Welcome back</h1>
                <div class="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-orange-500/10 border border-orange-500/15 text-orange-500 text-sm font-extrabold cursor-pointer" id="headerStreakBadge">
                    <i id="headerFireIcon" class="fas fa-fire text-lg"></i>
                    <span id="headerStreakDisplay">0</span>
                </div>
            </header>

            <main class="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 flex flex-col gap-8">
                
                <div id="goProBanner" class="hidden items-center gap-4 py-3 px-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/15 shadow-[0_2px_0_rgba(234,179,8,0.1)] cursor-pointer active:translate-y-[2px] active:shadow-none transition-all">
                    <div id="crownLottieContainer" class="w-12 h-12 flex-shrink-0 opacity-90"></div>
                    <div class="flex-1">
                        <h3 class="text-yellow-300 font-bold text-[15px] mb-0.5">Upgrade to Pro</h3>
                        <p class="text-yellow-300/70 text-xs font-medium">Unlock unlimited AI generations</p>
                    </div>
                    <button id="dismissGoProBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/5 active:scale-95 transition-all z-10"><i class="fas fa-times"></i></button>
                </div>

                <div id="continueStudyingSection" class="hidden">
                    <h2 class="text-xs font-extrabold text-slate-400 mb-3.5 uppercase tracking-widest pl-1">Continue Studying</h2>
                    <a href="#/library" class="block p-5 relative overflow-hidden bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all">
                        <div class="absolute bottom-0 left-0 h-1 bg-white/5 w-full"><div id="continueProgressBar" class="h-full bg-blue-500 transition-all duration-500"></div></div>
                        <div class="flex items-center gap-4 mb-1">
                            <div class="w-12 h-12 flex items-center justify-center flex-shrink-0 drop-shadow-md">
                                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><g transform="translate(32, 32)"><g transform="rotate(45) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#88868A"/></g><g transform="rotate(25) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#D2D0D6"/></g><g transform="rotate(5) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#4CBAD6"/></g></g></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start gap-3 mb-1">
                                    <h3 id="continueTitle" class="font-bold text-sm text-slate-100 line-clamp-2">Quiz Title</h3>
                                    <span id="continueProgressText" class="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">0%</span>
                                </div>
                                <p class="text-slate-400 text-xs font-medium"><span id="continueCardCount">0</span> items • <span id="continueSubject" class="uppercase">Subject</span></p>
                            </div>
                        </div>
                    </a>
                </div>

                <div>
                    <h2 class="text-xs font-extrabold text-slate-400 mb-3.5 uppercase tracking-widest pl-1">Quick Actions</h2>
                    <div class="grid grid-cols-2 gap-3.5">
                        
                        <a href="#/create" class="col-span-2 p-6 relative overflow-hidden flex items-center justify-between rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/40 shadow-[0_5px_0_#1e3a8a,0_10px_20px_-5px_rgba(37,99,235,0.5)] active:translate-y-[5px] active:shadow-[0_0px_0_#1e3a8a,0_4px_8px_-2px_rgba(37,99,235,0.5)] transition-all">
                            <div class="relative z-10">
                                <h3 class="text-lg font-extrabold text-white flex items-center gap-2 mb-1">Generate with AI <i class="fas fa-sparkles text-yellow-300 text-sm"></i></h3>
                                <p class="text-white/80 text-xs font-medium">Upload notes to create materials instantly.</p>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center relative z-10"><i class="fas fa-arrow-right text-white text-sm"></i></div>
                        </a>
                        
                        <a href="#/create" class="p-4 flex flex-col items-start gap-1 text-left bg-[#0a0f1d] border border-white/5 rounded-2xl shadow-[0_3px_0_rgba(255,255,255,0.02),0_4px_12px_rgba(0,0,0,0.4)] hover:bg-[#0f1629] active:translate-y-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all">
                            <div class="w-12 h-12 flex items-center justify-center mb-1"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><g transform="translate(32, 32)"><g transform="rotate(45) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#88868A"/></g><g transform="rotate(25) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#D2D0D6"/></g><g transform="rotate(5) translate(-14, -20)"><rect width="28" height="40" rx="3" fill="#4CBAD6"/></g></g></svg></div>
                            <span class="font-bold text-sm text-slate-200 mt-2">Flashcards</span>
                        </a>

                        <a href="#/create" class="p-4 flex flex-col items-start gap-1 text-left bg-[#0a0f1d] border border-white/5 rounded-2xl shadow-[0_3px_0_rgba(255,255,255,0.02),0_4px_12px_rgba(0,0,0,0.4)] hover:bg-[#0f1629] active:translate-y-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all">
                            <div class="w-12 h-12 flex items-center justify-center mb-1"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><g transform="translate(32, 32)"><g transform="rotate(-5) translate(-18, -22)"><rect width="36" height="44" rx="3" fill="#EAE8EC"/><path d="M0 3 C0 1.34315 1.34315 0 3 0 L33 0 C34.6569 0 36 1.34315 36 3 L36 12 L0 12 Z" fill="#F4A261"/><circle cx="8" cy="20" r="3" fill="#F4A261"/><rect x="14" y="18" width="14" height="4" rx="2" fill="#C5C3C8"/><circle cx="8" cy="30" r="3" fill="#C5C3C8"/><rect x="14" y="28" width="14" height="4" rx="2" fill="#C5C3C8"/><circle cx="8" cy="40" r="3" fill="#C5C3C8"/><rect x="14" y="38" width="10" height="4" rx="2" fill="#C5C3C8"/></g></g></svg></div>
                            <span class="font-bold text-sm text-slate-200 mt-2">MCQ Quiz</span>
                        </a>

                    </div>
                </div>
            </main>
        `;
    },

    afterRender: async () => {
        let currentStreakCount = 0;
        let hasCheckedInToday = false;

        // 1. User Greeting
        if (window.currentUser) {
            let savedName = window.currentUser.displayName || window.currentUser.email?.split("@")[0] || "Guest";
            const greetingTitle = document.getElementById('greetingTitle');
            const hour = new Date().getHours();
            const emoji = hour < 12 ? '⛅' : hour < 18 ? '☀️' : '🌙';
            if (savedName !== "Guest") {
                greetingTitle.innerHTML = `Hi, ${savedName} ${emoji}`;
            } else {
                greetingTitle.innerHTML = `Welcome ${emoji}`;
            }
        }

        // 2. Streak Logic
        const storageKey = 'medexcel_streak_tracker_active';
        let userStats = JSON.parse(localStorage.getItem(storageKey)) || { count: 0, lastDate: null };
        
        const todayStr = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (userStats.lastDate === todayStr) {
            hasCheckedInToday = true;
            currentStreakCount = userStats.count;
        } else if (userStats.lastDate === yesterdayStr) {
            hasCheckedInToday = false;
            currentStreakCount = userStats.count + 1; 
        } else {
            hasCheckedInToday = false;
            currentStreakCount = 1; 
        }

        const headerDisplay = document.getElementById('headerStreakDisplay');
        const headerFireIcon = document.getElementById('headerFireIcon');

        if (!hasCheckedInToday) {
            headerDisplay.textContent = Math.max(0, currentStreakCount - 1);
            headerFireIcon.style.opacity = '0.4'; 
        } else {
            headerDisplay.textContent = currentStreakCount;
            headerFireIcon.style.opacity = '1';
        }

        // 3. Calendar UI Builder
        function buildCalendarRow() {
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const dates = [];
            const today = new Date();
            const currentDayIndex = (today.getDay() + 6) % 7; 
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - currentDayIndex + i);
                dates.push(d.getDate());
            }

            let html = '';
            for(let i=0; i<7; i++) {
                let circleClass = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ";
                let content = dates[i];
                
                if (i < currentDayIndex) {
                    circleClass += "text-orange-500 text-lg";
                    content = '<i class="fas fa-check"></i>';
                } else if (i === currentDayIndex) {
                    if (hasCheckedInToday) {
                        circleClass += "bg-orange-500/10 border border-orange-500/30 text-orange-500 text-lg";
                        content = '<i class="fas fa-check"></i>';
                    } else {
                        circleClass += "bg-orange-500/10 border border-orange-500/30 text-orange-500";
                    }
                } else {
                    circleClass += "bg-white/5 text-slate-500";
                }

                html += `
                <div class="flex flex-col items-center gap-2">
                    <span class="text-[11px] text-slate-400 font-semibold">${labels[i]}</span>
                    <div class="${circleClass}">${content}</div>
                </div>`;
            }
            return html;
        }

        // 4. Streak Modal Logic
        const streakBackdrop = document.getElementById('streakModalBackdrop');
        const streakDialog = document.getElementById('streakDialog');

        function openStreakModal() {
            document.getElementById('calendarRow').innerHTML = buildCalendarRow();
            const btn = document.getElementById('closeStreakModal');
            document.getElementById('modalDayCount').textContent = currentStreakCount;
            
            btn.textContent = hasCheckedInToday ? "Awesome!" : "Check in today!";
            
            streakBackdrop.classList.remove('hidden');
            streakBackdrop.classList.add('flex');
            // Allow display block to render before opacity transition
            void streakBackdrop.offsetWidth; 
            streakBackdrop.classList.remove('opacity-0');
            streakDialog.classList.remove('-translate-y-full');
        }

        if (!hasCheckedInToday) {
            openStreakModal();
        }

        document.getElementById('headerStreakBadge').addEventListener('click', openStreakModal);

        document.getElementById('closeStreakModal').addEventListener('click', () => {
            if (!hasCheckedInToday) {
                userStats.count = currentStreakCount;
                userStats.lastDate = todayStr;
                localStorage.setItem(storageKey, JSON.stringify(userStats));
                hasCheckedInToday = true;
            }

            streakDialog.classList.add('-translate-y-full');
            streakBackdrop.classList.add('opacity-0');
            
            setTimeout(() => {
                streakBackdrop.classList.add('hidden');
                streakBackdrop.classList.remove('flex');
                
                headerDisplay.textContent = currentStreakCount;
                headerFireIcon.style.opacity = '1';
                
                // Optional: CSS bounce class for fire icon
                headerFireIcon.classList.add('scale-125');
                setTimeout(() => headerFireIcon.classList.remove('scale-125'), 300); 
            }, 300); 
        });

        // 5. Pro Banner Logic
        const goProBanner = document.getElementById('goProBanner');
        const dismissBtn = document.getElementById('dismissGoProBtn');
        const snoozeTime = localStorage.getItem('medexcel_gopro_snooze');
        
        // Load Crown Lottie
        if (window.lottie && goProBanner) {
            window.lottie.loadAnimation({
                container: document.getElementById('crownLottieContainer'),
                renderer: 'svg', loop: true, autoplay: true, path: 'crown.json' // Ensure this path is correct on your server
            });
        }

        if (window.currentUser) {
            try {
                let userRef = doc(db, "users", window.currentUser.uid);
                let docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    const plan = docSnap.data().plan || "free";
                    if (plan === "free" && (!snoozeTime || Date.now() > parseInt(snoozeTime, 10))) {
                        goProBanner.classList.remove('hidden');
                        goProBanner.classList.add('flex');
                    }
                }
            } catch(e) {}
        }

        dismissBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            goProBanner.style.opacity = '0';
            goProBanner.style.transform = 'scale(0.95)';
            setTimeout(() => { goProBanner.style.display = 'none'; }, 300);
            
            const snoozeUntil = Date.now() + 259200000; // Snooze for 3 days
            localStorage.setItem('medexcel_gopro_snooze', snoozeUntil.toString());
        });

        goProBanner.addEventListener('click', () => { window.location.hash = "#/profile"; });

        // 6. Continue Studying Logic
        const quizzes = JSON.parse(localStorage.getItem('medexcel_quizzes')) || [];
        const continueSection = document.getElementById('continueStudyingSection');
        if (quizzes.length > 0) {
            const lastQuiz = quizzes[quizzes.length - 1];
            const totalQs = lastQuiz.questions ? lastQuiz.questions.length : 0;
            const bestScore = lastQuiz.stats ? lastQuiz.stats.bestScore : 0;
            let progress = totalQs > 0 ? Math.round((bestScore / totalQs) * 100) : 0;
            
            document.getElementById('continueTitle').textContent = lastQuiz.title || 'Untitled Quiz';
            document.getElementById('continueProgressText').textContent = `${progress}%`;
            document.getElementById('continueProgressBar').style.width = `${progress}%`;
            document.getElementById('continueCardCount').textContent = totalQs;
            document.getElementById('continueSubject').textContent = lastQuiz.subject || 'General';
            continueSection.classList.remove('hidden');
            continueSection.classList.add('block');
        }
    }
};