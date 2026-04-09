import { auth } from '../firebase.js';

export let windowHomeRotator = null;

export const HomeView = {
    render: () => {
        return `
            <style>
                .header-bar { padding: 1.5rem 1.25rem 1rem; display: flex; align-items: center; justify-content: space-between; z-index: 10; position: sticky; top: 0; background: var(--header-bg); backdrop-filter: blur(16px); }
                .greeting-title { font-size: 1.15rem; font-weight: 700; flex: 1; margin: 0; display: flex; align-items: center; }
                .streak-badge { display: flex; align-items: center; gap: 0.375rem; padding: 0.4rem 0.875rem; border-radius: 9999px; background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.15); color: var(--accent-orange); font-size: 0.9375rem; font-weight: 700; cursor: pointer; }
                .main-content { padding: 0.5rem 1.25rem 2rem; display: flex; flex-direction: column; gap: 1.75rem; }
                .section-title { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem;}
                .promo-carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1rem; }
                .promo-consultation-card { min-width: 100%; scroll-snap-align: center; background: #4A1D96; border-radius: 1.5rem; padding: 1.5rem; display: flex; align-items: center; position: relative; overflow: hidden; min-height: 160px; color: white;}
                .promo-bg-shape { position: absolute; top: 0; right: 0; bottom: 0; left: 40%; background: #6D28D9; transform: skewX(-15deg); z-index: 1; }
                .promo-text-area { position: relative; z-index: 2; width: 60%; }
                .promo-doctor-img { position: absolute; bottom: 0; right: -5%; height: 120%; max-height: 190px; z-index: 2; pointer-events: none; }
                .promo-dots-container { display: flex; justify-content: center; gap: 6px; margin-top: 0.75rem; }
                .promo-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-glass); transition: all 0.3s; }
                .promo-dot.active { width: 16px; border-radius: 100px; background: var(--accent-btn); }
                .continue-card { padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-glass); text-decoration: none; }
                .promo-banner { display: flex; gap: 1rem; padding: 1.25rem; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.1); border-radius: var(--radius-card); }
            </style>
            <div id="streakModalBackdrop" class="ok-backdrop" aria-hidden="true">
                <div class="streak-dialog" id="streakDialog">
                    <div id="modalStreakLottie" style="width: 80px; height: 80px; margin-bottom: 0.5rem;"></div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem; letter-spacing: -0.02em;">Day <span id="modalDayCount">1</span></div>
                    <h3 class="streak-dialog-title" style="margin-bottom: 1.5rem; color: var(--text-muted);">Keep the fire alive<br>check in today!</h3>
                    <div class="flex justify-center gap-2 w-full mb-6" id="calendarRow"></div>
                    <button id="closeStreakModal" class="btn-checkin">Check in today!</button>
                </div>
            </div>

            <header class="header-bar">
                <h1 id="greetingTitle" class="greeting-title skeleton" style="width: 140px; height: 22px; border-radius: 6px;"></h1>
                <div class="streak-badge" id="headerStreakBadge">
                    <i id="headerFireIcon" class="fas fa-fire"></i>
                    <span id="headerStreakDisplay" class="skeleton" style="width: 16px; height: 18px; border-radius: 4px; display: inline-block;"></span>
                </div>
            </header>

            <main class="main-content">
                <div class="promo-carousel-wrapper">
                    <div class="promo-carousel hide-scroll" id="promoCarousel">
                        <a href="#/study" class="promo-consultation-card">
                            <div class="promo-bg-shape"></div>
                            <div class="promo-text-area">
                                <div class="flex items-center gap-1 mb-1">
                                    <span class="text-3xl font-bold">2x</span>
                                    <span class="text-[0.65rem] font-bold leading-tight">DAILY<br>REWARD</span>
                                </div>
                                <p class="text-sm mb-4 opacity-90">Complete 20 flashcards today to earn double XP!</p>
                                <div class="bg-white/20 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold inline-block">Start Challenge</div>
                            </div>
                            <div class="promo-doctor-img flex items-center text-[5.5rem] opacity-80"><i class="fas fa-bolt"></i></div>
                        </a>
                        <a href="#/create" class="promo-consultation-card" style="background:#0f766e;">
                            <div class="promo-bg-shape" style="background:#14b8a6;"></div>
                            <div class="promo-text-area">
                                <div class="flex items-center gap-1 mb-1">
                                    <span class="text-3xl font-bold">AI</span>
                                    <span class="text-[0.65rem] font-bold leading-tight">DECK<br>BUILDER</span>
                                </div>
                                <p class="text-sm mb-4 opacity-90">Turn your notes into study decks in seconds.</p>
                                <div class="bg-white/20 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold inline-block">Create Now</div>
                            </div>
                            <div class="promo-doctor-img flex items-center text-[5rem] opacity-80"><i class="fas fa-magic"></i></div>
                        </a>
                    </div>
                    <div class="promo-dots-container" id="carouselIndicators">
                        <div class="promo-dot active"></div><div class="promo-dot"></div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <h2 class="section-title">Continue Studying</h2>
                    <a href="#/study" class="continue-card">
                        <div class="flex items-center gap-4 flex-1 min-w-0">
                            <div id="continueIconBox" class="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl shrink-0 skeleton">
                                <i class="fas fa-layer-group"></i>
                            </div>
                            <div class="flex flex-col justify-center flex-1 min-w-0">
                                <h3 id="continueTitle" class="font-bold text-[var(--text-main)] truncate skeleton" style="width:100px;height:16px;"></h3>
                                <p class="text-xs font-medium text-[var(--text-muted)] uppercase mt-1 skeleton" id="continueMeta" style="width:60px;height:12px;"></p>
                            </div>
                        </div>
                        <div class="bg-blue-500/15 text-blue-500 text-xs font-bold px-2 py-1.5 rounded-md ml-3 skeleton" id="continueProgressText" style="width:40px;height:24px;"></div>
                    </a>
                </div>

                <div class="flex flex-col gap-3">
                    <h2 class="section-title">Weekly Target</h2>
                    <div class="promo-banner">
                        <div class="w-10 h-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center text-xl shrink-0"><i class="fas fa-bullseye"></i></div>
                        <div>
                            <h4 id="targetTitle" class="text-sm font-bold text-[var(--text-main)] mb-1 transition-opacity duration-300">Study Consistency</h4>
                            <p id="targetDesc" class="text-xs text-[var(--text-muted)] leading-relaxed transition-opacity duration-300">You're on track to hit your goals. Keep reviewing materials daily to build long-term retention.</p>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },
    mount: () => {
        const carousel = document.getElementById('promoCarousel');
        const indicators = document.querySelectorAll('.promo-dot');
        if(carousel && indicators.length > 0) {
            carousel.addEventListener('scroll', () => {
                const activeIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
                indicators.forEach((dot, idx) => dot.classList.toggle('active', idx === activeIndex));
            });
        }

        if (windowHomeRotator) clearInterval(windowHomeRotator);
        const targets = [
            { title: "Study Consistency", desc: "You're on track to hit your goals. Keep reviewing materials daily to build long-term retention." },
            { title: "Daily Streak", desc: "Consistency is key! Complete a quick review today to keep your streak alive." }
        ];
        let targetIdx = 0;
        windowHomeRotator = setInterval(() => {
            targetIdx = (targetIdx + 1) % targets.length;
            const tEl = document.getElementById('targetTitle');
            const dEl = document.getElementById('targetDesc');
            if(tEl && dEl) {
                tEl.style.opacity = '0'; dEl.style.opacity = '0';
                setTimeout(() => {
                    tEl.textContent = targets[targetIdx].title; dEl.textContent = targets[targetIdx].desc;
                    tEl.style.opacity = '1'; dEl.style.opacity = '1';
                }, 300);
            }
        }, 6000);

        let activeUser = auth.currentUser || JSON.parse(localStorage.getItem('nativeUser'));
        const titleEl = document.getElementById('greetingTitle');
        
        if (activeUser && titleEl) {
            const hour = new Date().getHours();
            const emoji = hour < 12 ? '⛅' : hour < 18 ? '☀️' : '🌙';
            const name = activeUser.displayName || activeUser.email?.split('@')[0] || 'User';
            titleEl.textContent = `Hi, ${name} ${emoji}`;
            titleEl.classList.remove('skeleton');

            document.getElementById('headerStreakDisplay').textContent = "1";
            document.getElementById('headerStreakDisplay').classList.remove('skeleton');
            
            document.getElementById('continueTitle').textContent = "Cardiology 101";
            document.getElementById('continueMeta').textContent = "45 ITEMS • ANATOMY";
            document.getElementById('continueProgressText').textContent = "+92%";
            ['continueTitle', 'continueMeta', 'continueProgressText', 'continueIconBox'].forEach(id => 
                document.getElementById(id).classList.remove('skeleton')
            );
        }

        const modal = document.getElementById('streakModalBackdrop');
        const openBtn = document.getElementById('headerStreakBadge');
        const closeBtn = document.getElementById('closeStreakModal');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const days = ['M','T','W','T','F','S','S'];
                let html = '';
                days.forEach((d, i) => {
                    let cls = i < 3 ? 'done' : (i===3 ? 'active' : '');
                    let content = i < 4 ? '<i class="fas fa-check"></i>' : (20+i);
                    html += `<div class="flex flex-col items-center gap-1"><span class="text-xs text-zinc-500 font-bold">${d}</span><div class="day-circle ${cls}">${content}</div></div>`;
                });
                document.getElementById('calendarRow').innerHTML = html;
                
                if(window.lottie && !window.streakLottieAnim) {
                    window.streakLottieAnim = lottie.loadAnimation({ container: document.getElementById('modalStreakLottie'), renderer: 'svg', loop: true, autoplay: true, path: 'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json' });
                }
                modal.classList.add('active');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }
};