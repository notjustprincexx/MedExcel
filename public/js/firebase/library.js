// Render Achievements Logic
        const MASTER_ACHIEVEMENTS = [
            { id: "first_quiz", title: "First Steps", desc: "First set", icon: "fa-seedling" }, { id: "streak_3", title: "On Fire", desc: "3 day streak", icon: "fa-fire" },
            { id: "accuracy_80", title: "Sharpshooter", desc: "80%+ accuracy", icon: "fa-bullseye" }, { id: "mcq_100", title: "Century", desc: "100 MCQs", icon: "fa-check-double" },
            { id: "elite_member", title: "Elite", desc: "Subscribed", icon: "fa-crown" }, { id: "night_owl", title: "Night Owl", desc: "Late study", icon: "fa-moon" }
        ];

        window.renderAchievements = function(unlockedIds) {
            const grid = document.getElementById('achievementsGrid'); if(!grid) return;
            grid.innerHTML = "";
            MASTER_ACHIEVEMENTS.forEach(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                const stateClass = isUnlocked ? "border-[var(--accent-btn)] bg-[var(--bg-body)] shadow-[0_0_15px_rgba(167,139,250,0.1)]" : "border-[var(--border-color)] bg-[var(--bg-body)] opacity-50 grayscale";
                const iconColor = isUnlocked ? "text-[var(--accent-btn)]" : "text-[var(--text-muted)]";
                grid.innerHTML += `<div class="${stateClass} border rounded-2xl p-3 flex flex-col items-center text-center transition-all relative overflow-hidden">${!isUnlocked ? `<div class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-surface)]/50"><i class="fas fa-lock text-[var(--text-muted)]"></i></div>` : ''}<div class="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-1.5 ${iconColor}"><i class="fas ${ach.icon} text-sm"></i></div><h4 class="text-[10px] font-bold text-[var(--text-main)] mb-0.5">${ach.title}</h4><p class="text-[8px] text-[var(--text-muted)] leading-tight">${ach.desc}</p></div>`;
            });
        };

        // Render Library Logic
        window.renderLibrary = function(filter = 'all', searchQuery = '') {
            const container = document.getElementById('quizContainer'); if(!container) return;
            container.innerHTML = ''; 
            let filtered = window.quizzes.filter(q => q.title && q.title.toLowerCase().includes(searchQuery.toLowerCase()));
            if (filter === 'favorites') filtered = filtered.filter(q => q.favorite);
            else if (filter === 'mcqs') filtered = filtered.filter(q => q.type && q.type.includes("Multiple"));
            else if (filter === 'flashcards') filtered = filtered.filter(q => !q.type || !q.type.includes("Multiple"));
            
            if (filtered.length === 0) {
                container.innerHTML = `<div class="text-center py-10 fade-in"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center"><i class="fas fa-box-open text-2xl text-[var(--text-muted)]"></i></div><p class="text-sm font-medium text-[var(--text-muted)]">No sets found.</p></div>`;
                return;
            }

            filtered.slice().reverse().forEach(quiz => {
                const qLength = quiz.questions ? quiz.questions.length : 0;
                const isMCQ = quiz.type && quiz.type.includes("Multiple");
                const itemLabel = isMCQ ? "Questions" : "Cards";
                const iconSvg = isMCQ
                    ? `<svg viewBox="0 0 64 64" fill="none" style="width:38px;height:38px;"><rect x="12" y="10" width="40" height="48" rx="6" fill="#8b5cf6"/><rect x="24" y="6" width="16" height="8" rx="2" fill="#fbbf24"/><circle cx="32" cy="7" r="3" fill="#fbbf24"/><path d="M22 28L26 32L34 24" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.8"/><path d="M22 42L26 46L34 38" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.8"/><rect x="38" y="27" width="10" height="3" rx="1.5" fill="white" opacity="0.3"/><rect x="38" y="41" width="10" height="3" rx="1.5" fill="white" opacity="0.3"/></svg>`
                    : `<svg viewBox="0 0 64 64" fill="none" style="width:38px;height:38px;"><rect x="8" y="18" width="28" height="38" rx="4" transform="rotate(-15 8 18)" fill="#ec4899"/><rect x="20" y="14" width="28" height="38" rx="4" transform="rotate(-5 20 14)" fill="#facc15"/><rect x="30" y="12" width="28" height="38" rx="4" transform="rotate(10 30 12)" fill="#8b5cf6"/><rect x="38" y="24" width="12" height="3" rx="1.5" fill="white" opacity="0.4" transform="rotate(10 38 24)"/><rect x="38" y="32" width="12" height="3" rx="1.5" fill="white" opacity="0.4" transform="rotate(10 38 32)"/></svg>`;
                
                container.innerHTML += `
                    <div class="quiz-item fade-in group" onclick="window.loadQuizOverview(${quiz.id})">
                        <div class="w-14 h-14 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)] flex items-center justify-center relative shrink-0 overflow-hidden">
                            ${iconSvg}
                            ${quiz.favorite ? '<div class="absolute top-0 right-0 w-3 h-3 bg-[var(--accent-yellow)] rounded-bl-lg"></div>' : ''}
                        </div>
                        <div class="flex-1 min-w-0 py-1">
                            <h3 class="font-bold text-[var(--text-main)] text-base truncate mb-1.5">${quiz.title}</h3>
                            <div class="flex items-center gap-2 text-[var(--text-muted)] text-[12px] font-semibold">
                                <span class="bg-[var(--bg-body)] border border-[var(--border-color)] px-2 py-0.5 rounded-md truncate max-w-[110px]">${quiz.subject || 'General'}</span>
                                <span class="shrink-0">${qLength} ${itemLabel}</span>
                            </div>
                        </div>
                        <button onclick="window.promptDelete(event, ${quiz.id})" class="p-2.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors shrink-0 opacity-0 group-hover:opacity-100 lg:opacity-60"><i class="fas fa-trash-alt"></i></button>
                    </div>`;
            });
        };

        window.loadQuizOverview = function(id) {
            currentQuiz = window.currentQuiz = window.quizzes.find(q => q.id === id); window.openPracticeMobile();
            const area = document.getElementById('studyPracticeArea');
            const qLength = currentQuiz.questions ? currentQuiz.questions.length : 0;
            const bScore = currentQuiz.stats ? currentQuiz.stats.bestScore : 0;
            const attempts = currentQuiz.stats ? currentQuiz.stats.attempts : 0;
            const isMCQ = currentQuiz.type && currentQuiz.type.includes("Multiple");
            const itemLabel = isMCQ ? "Questions" : "Cards";

            area.innerHTML = `
                <div class="card-panel fade-in w-full max-w-2xl">
                    <div class="flex justify-between items-start mb-4">
                        <span class="bg-[var(--bg-glass)] text-[var(--accent-btn)] text-xs font-extrabold px-3 py-1.5 rounded-md uppercase tracking-wider flex items-center gap-1.5"><i class="fas fa-tag"></i> ${currentQuiz.subject}</span>
                        <button onclick="window.toggleFavoriteCurrent()" class="text-xl p-2 -m-2 transition-colors ${currentQuiz.favorite ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-yellow)]'}"><i class="fas fa-star"></i></button>
                    </div>
                    <h2 class="text-3xl font-bold text-[var(--text-main)] mb-2 tracking-tight">${currentQuiz.title}</h2>
                    <p class="text-[15px] font-medium text-[var(--text-muted)] mb-8"><i class="fas fa-layer-group mr-1.5"></i>${qLength} ${itemLabel}</p>
                    <div class="grid grid-cols-2 gap-3 mb-8">
                        <div class="bg-[var(--bg-body)] p-5 rounded-2xl border border-[var(--border-color)]">
                            <p class="text-[11px] text-[var(--text-muted)] uppercase font-extrabold tracking-widest mb-1">Previous Best</p>
                            <p class="text-2xl font-bold text-[var(--text-main)]">${bScore} <span class="text-sm text-[var(--text-muted)] font-medium">/ ${qLength}</span></p>
                        </div>
                        <div class="bg-[var(--bg-body)] p-5 rounded-2xl border border-[var(--border-color)]">
                            <p class="text-[11px] text-[var(--text-muted)] uppercase font-extrabold tracking-widest mb-1">Total Attempts</p>
                            <p class="text-2xl font-bold text-[var(--text-main)]">${attempts}</p>
                        </div>
                    </div>
                    <button onclick="window.startPractice(false)" class="w-full bg-[var(--accent-btn)] text-[var(--btn-text)] font-bold py-3.5 rounded-full border-none cursor-pointer transition-transform active:scale-95 text-[17px] flex items-center justify-center gap-2"><i class="fas fa-play text-sm"></i> Begin Session</button>
                </div>`;
        };

        window.toggleFavoriteCurrent = async function() {
            if (window.currentQuiz && window.currentUser) {
                window.currentQuiz.favorite = !window.currentQuiz.favorite;
                try { 
                    if (window._updateDoc && window._doc) {
                        await window._updateDoc(window._doc(window.db, "users", window.currentUser.uid, "quizzes", window.currentQuiz.id.toString()), { favorite: window.currentQuiz.favorite }); 
                    }
                    localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes)); 
                } catch(e) {}
                window.loadQuizOverview(window.currentQuiz.id);
                const activeTabEl = document.querySelector('.tab-btn.active');
                if (activeTabEl) window.renderLibrary(activeTabEl.dataset.filter, document.getElementById('librarySearchInput').value);
            }
        };
