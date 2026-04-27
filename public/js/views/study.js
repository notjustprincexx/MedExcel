// Study / Library View
// --- STUDY UI LOGIC ---
        window.openPracticeMobile = function() {
            if (window.innerWidth < 1024) {
                document.getElementById('libraryPanel').classList.add('hidden');
                document.getElementById('studyPracticePanel').classList.add('active');
            }
        }

        window.closePracticeMobile = function() {
            window.exitStudyQuizMode();
            if (window.innerWidth < 1024) {
                document.getElementById('libraryPanel').classList.remove('hidden');
                document.getElementById('studyPracticePanel').classList.remove('active');
            }
            document.getElementById('studyPracticeArea').innerHTML = `
                <div class="text-center text-[var(--text-muted)] flex flex-col items-center fade-in">
                    <div class="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center mb-6 text-3xl text-[var(--accent-btn)]"><i class="fas fa-layer-group"></i></div>
                    <h3 class="text-xl font-bold text-[var(--text-main)] mb-2">Ready to Study?</h3>
                    <p class="text-[15px] font-medium">Select a deck from your library to begin.</p>
                </div>
            `;
            currentQuiz = null;
        }

        window.promptDelete = function(e, id) { e.stopPropagation(); window.quizToDelete = id; document.getElementById('deleteModalBackdrop').classList.add('show'); };

        window.enterStudyQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = 'translateY(100%)';
            Object.assign(document.getElementById('studyPracticePanel').style, { position:'fixed', inset:'0', zIndex:'200', background:'var(--bg-body)' });
            const header = document.getElementById('studyPracticeHeader');
            if (header) header.style.display = 'none';
            Object.assign(document.getElementById('studyPracticeArea').style, { padding:'0', alignItems:'stretch', justifyContent:'flex-start' });
        };
        window.exitStudyQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = '';
            Object.assign(document.getElementById('studyPracticePanel').style, { position:'', inset:'', zIndex:'', background:'' });
            const header = document.getElementById('studyPracticeHeader');
            if (header) header.style.display = '';
            Object.assign(document.getElementById('studyPracticeArea').style, { padding:'', alignItems:'', justifyContent:'' });
        };

        window.startPractice = function(exam) {
            isExamMode = exam;
            currentQuestionIndex = 0;
            examScore = 0;
            // Reset answered state for all questions
            if (currentQuiz && currentQuiz.questions) {
                currentQuiz.questions.forEach(q => { q.answered = false; });
            }
            window.enterStudyQuizMode();
            window.renderStudyQuestion();
        }

        window.renderStudyQuestion = function() {
            if (!currentQuiz || !currentQuiz.questions) return;
            if (currentQuestionIndex >= currentQuiz.questions.length) { window.finishStudyQuiz(); return; }

            const q = currentQuiz.questions[currentQuestionIndex];
            const area = document.getElementById('studyPracticeArea');
            const progressPercent = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
            const isMCQSession = currentQuiz.type && currentQuiz.type.includes("Multiple");

            const safeQuestion = window.escapeHTML(q.text || q.front || q.question || "No question");
            const safeAnswer   = window.escapeHTML(q.back  || q.answer || (q.options && q.correct !== undefined ? q.options[q.correct] : '') || '');

            let contentHTML = '';

            if (isMCQSession) {
                let optionsHTML = '<div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;width:100%;">';
                q.options.forEach((opt, idx) => {
                    const key = String.fromCharCode(65 + idx);
                    optionsHTML += `<button class="study-mcq-opt" data-idx="${idx}" style="width:100%;text-align:left;padding:0.75rem 0.875rem;border-radius:var(--radius-md);background:var(--bg-body);border:1px solid var(--border-glass);display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;color:var(--text-main);transition:border-color 0.15s;"><span style="font-weight:600;color:var(--text-muted);background:var(--bg-surface);border:1px solid var(--border-glass);width:1.625rem;height:1.625rem;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:0.75rem;flex-shrink:0;margin-top:0.125rem;">${key}</span><span style="flex:1;font-size:0.9rem;line-height:1.4;padding-top:0.125rem;font-weight:500;">${window.escapeHTML(opt)}</span></button>`;
                });
                optionsHTML += '</div>';
                contentHTML = `
                    <div style="flex:1;background:var(--bg-surface);border-radius:var(--radius-card);padding:1rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;min-height:0;overflow:hidden;">
                        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;padding-right:0.25rem;" class="hide-scroll">
                            <h3 style="font-weight:700;color:var(--text-main);font-size:0.9375rem;line-height:1.6;margin-bottom:1rem;flex-shrink:0;">${safeQuestion}</h3>
                            ${optionsHTML}
                            <div id="studyExplanationArea" style="display:none;flex-direction:column;gap:0.75rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-glass);flex-shrink:0;"></div>
                        </div>
                    </div>`;
            } else {
                contentHTML = `
                    <div id="studyFlashcardEl" style="flex:1;position:relative;perspective:1000px;cursor:pointer;min-height:0;width:100%;">
                        <div id="studyFlipInner" style="position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 0.5s var(--ease-snap);border-radius:var(--radius-card);">
                            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:var(--radius-card);padding:1.5rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow-y:auto;background:var(--bg-surface);z-index:2;transform:rotateY(0deg);">
                                <span style="position:absolute;top:1.5rem;font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Question</span>
                                <h3 style="font-weight:600;font-size:1.125rem;line-height:1.5;margin-top:1rem;color:var(--text-main);">${safeQuestion}</h3>
                                <p style="position:absolute;bottom:1.25rem;font-size:0.8125rem;font-weight:500;display:flex;align-items:center;gap:0.375rem;color:var(--text-muted);"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:var(--radius-card);padding:1.5rem;border:1px solid var(--border-glass);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow-y:auto;background:var(--accent-btn);transform:rotateY(180deg);box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);z-index:1;">
                                <span style="position:absolute;top:1.5rem;font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:var(--btn-text);opacity:0.7;">Answer</span>
                                <p style="font-weight:600;font-size:1.125rem;line-height:1.5;margin-top:1rem;color:var(--btn-text);">${safeAnswer}</p>
                                <p style="position:absolute;bottom:1.25rem;font-size:0.8125rem;font-weight:500;display:flex;align-items:center;gap:0.375rem;color:var(--btn-text);opacity:0.8;"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                        </div>
                    </div>`;
            }

            const isLast = currentQuestionIndex === currentQuiz.questions.length - 1;
            const nextDisabled = isMCQSession && !q.answered;

            area.innerHTML = `
                <div style="display:flex;flex-direction:column;height:100%;width:100%;padding:1.25rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);box-sizing:border-box;max-width:680px;margin:0 auto;" class="fade-in">
                    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;flex-shrink:0;">
                        <button onclick="window.closePracticeMobile()" style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;flex-shrink:0;transition:0.2s;" ontouchstart="this.style.transform='scale(0.9)'" ontouchend="this.style.transform=''"><i class="fas fa-arrow-left"></i></button>
                        <h2 style="font-size:0.75rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;flex:1;">${isMCQSession ? 'MCQ Session' : 'Flashcard Session'}</h2>
                        <span style="font-size:0.8125rem;font-weight:600;color:var(--text-main);">${currentQuestionIndex + 1} / ${currentQuiz.questions.length}</span>
                    </div>
                    <div style="width:100%;height:6px;background:var(--bg-body);border-radius:100px;overflow:hidden;margin-bottom:1rem;border:1px solid var(--border-glass);flex-shrink:0;">
                        <div style="height:100%;background:var(--accent-btn);border-radius:100px;transition:width 0.4s var(--ease-snap);width:${progressPercent}%;"></div>
                    </div>
                    ${contentHTML}
                    <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-shrink:0;">
                        <button id="studyPrevBtn" style="flex:1;padding:1rem;border-radius:var(--radius-btn);font-size:0.9375rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);${currentQuestionIndex === 0 ? 'opacity:0.4;cursor:not-allowed;' : ''}">Previous</button>
                        <button id="studyNextBtn" ${nextDisabled ? 'disabled' : ''} style="flex:1;padding:1rem;border-radius:var(--radius-btn);font-size:0.9375rem;font-weight:700;border:none;background:var(--accent-btn);color:var(--btn-text);${nextDisabled ? 'opacity:0.4;cursor:not-allowed;' : 'cursor:pointer;'}">${isLast ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
            `;

            // Attach event listeners
            if (isMCQSession) {
                const btns = area.querySelectorAll('.study-mcq-opt');
                btns.forEach(btn => btn.addEventListener('click', () => window.handleStudyMCQSelection(btn, q, btns)));
            } else {
                const fc = document.getElementById('studyFlashcardEl');
                fc.addEventListener('click', () => {
                    const inner = document.getElementById('studyFlipInner');
                    inner.style.transform = inner.style.transform.includes('180deg') ? 'rotateY(0deg)' : 'rotateY(180deg)';
                });
            }

            const prevBtn = document.getElementById('studyPrevBtn');
            const nextBtn = document.getElementById('studyNextBtn');

            prevBtn.addEventListener('click', () => {
                if (currentQuestionIndex > 0) { currentQuestionIndex--; window.renderStudyQuestion(); }
            });
            nextBtn.addEventListener('click', async () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        window.renderStudyQuestion();
    } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.8';
        nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:0.375rem;font-size:0.875rem;"></i>Saving...';
        await window.finishStudyQuiz();
    }
});
        }

        window.handleStudyMCQSelection = function(selectedBtn, q, allBtns) {
            if (q.answered) return;
            q.answered = true;

            const selectedIdx = parseInt(selectedBtn.dataset.idx);
            const isCorrect = selectedIdx === q.correct;
            if (isCorrect) examScore++;

            allBtns.forEach(btn => {
                const idx = parseInt(btn.dataset.idx);
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
                if (idx === q.correct) {
                    btn.style.background = 'rgba(16,185,129,0.1)';
                    btn.style.borderColor = 'rgba(16,185,129,0.3)';
                    btn.style.color = 'var(--accent-green)';
                    btn.querySelector('span').style.borderColor = 'rgba(16,185,129,0.3)';
                    btn.querySelector('span').style.color = 'var(--accent-green)';
                } else if (idx === selectedIdx) {
                    btn.style.background = 'rgba(239,68,68,0.1)';
                    btn.style.borderColor = 'rgba(239,68,68,0.3)';
                    btn.style.color = 'var(--accent-red)';
                    btn.querySelector('span').style.borderColor = 'rgba(239,68,68,0.3)';
                    btn.querySelector('span').style.color = 'var(--accent-red)';
                } else {
                    btn.style.opacity = '0.4';
                }
            });

            const expl = document.getElementById('studyExplanationArea');
            expl.innerHTML = `
                <div style="font-size:0.8125rem;font-weight:700;margin-bottom:0.375rem;">
                    ${isCorrect ? '<span style="color:var(--accent-green)"><i class="fas fa-check-circle"></i> Correct!</span>' : '<span style="color:var(--accent-red)"><i class="fas fa-times-circle"></i> Incorrect</span>'}
                </div>
                ${q.explanation ? `<div style="background:var(--bg-body);padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);color:var(--text-main);font-size:0.875rem;line-height:1.5;"><span style="font-weight:700;color:var(--text-muted);display:block;margin-bottom:0.25rem;font-size:0.7rem;text-transform:uppercase;">Explanation</span>${window.escapeHTML(q.explanation)}</div>` : ''}
            `;
            expl.style.display = 'flex';

            // Unlock Next button
const nextBtn = document.getElementById('studyNextBtn');
if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';
    nextBtn.style.cursor = 'pointer';
} 

            setTimeout(() => { expl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
        }

        window.finishStudyQuiz = async function() {
            const isMCQSession = currentQuiz.type && currentQuiz.type.includes("Multiple");
            const totalXP = isMCQSession ? examScore * 10 + 20 : (currentQuiz.questions ? currentQuiz.questions.length * 5 : 20);
            await window.addXP(totalXP);

            if (!currentQuiz.stats) currentQuiz.stats = { bestScore: 0, attempts: 0, lastScore: 0 };
            currentQuiz.stats.attempts++;
            currentQuiz.stats.lastScore = examScore;
            if (isMCQSession) {
                if (examScore > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = examScore;
            } else {
                // Flashcard session — treat completing the deck as full score
                const total = currentQuiz.questions ? currentQuiz.questions.length : 0;
                if (total > currentQuiz.stats.bestScore) currentQuiz.stats.bestScore = total;
            }

            if (window.currentUser) {
                try {
                    const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                    await updateDoc(doc(window.db, "users", window.currentUser.uid, "quizzes", currentQuiz.id.toString()), { stats: currentQuiz.stats });
                    localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(window.quizzes));
                } catch(e) { console.error("Cloud stats sync failed", e); }
            }

            const area = document.getElementById('studyPracticeArea');
            const total = currentQuiz.questions ? currentQuiz.questions.length : 0;
            const percentage = total > 0 ? Math.round((examScore / total) * 100) : 100;
            let stars = 1; if (percentage >= 80) stars = 3; else if (percentage >= 50) stars = 2;
            const starsHTML = [1,2,3].map(s => `<i class="fas fa-star" style="font-size:1.75rem;color:${s <= stars ? 'var(--accent-yellow)' : 'var(--border-color)'};filter:${s <= stars ? 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' : 'none'};"></i>`).join('');

            area.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;height:100%;width:100%;padding:2rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);box-sizing:border-box;max-width:500px;margin:0 auto;" class="fade-in">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;width:100%;">
                        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">${starsHTML}</div>
                        <h2 style="font-size:1.75rem;font-weight:800;color:var(--text-main);margin-bottom:0.5rem;text-align:center;">${isMCQSession ? 'Quiz Complete!' : 'Review Complete!'}</h2>
                        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:2rem;">${currentQuiz.title}</p>
                        <div style="display:flex;gap:0.75rem;width:100%;">
                            ${isMCQSession ? `
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Score</div>
                                <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);">${examScore}<span style="font-size:0.9rem;color:var(--text-muted);font-weight:500;"> / ${total}</span></div>
                            </div>
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Accuracy</div>
                                <div style="font-size:1.75rem;font-weight:800;color:${percentage >= 80 ? 'var(--accent-green)' : percentage >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'};">${percentage}%</div>
                            </div>` : `
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Cards Reviewed</div>
                                <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);">${total}</div>
                            </div>`}
                            <div style="flex:1;border-radius:var(--radius-card);border:1px solid var(--border-glass);background:var(--bg-surface);padding:1.25rem 0.5rem;text-align:center;">
                                <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">XP Earned</div>
                                <div style="font-size:1.75rem;font-weight:800;color:var(--text-main);"><i class="fas fa-bolt" style="color:var(--accent-yellow);font-size:1.25rem;"></i> ${totalXP}</div>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.75rem;width:100%;">
                        <button onclick="window.startPractice(false)" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:none;background:var(--accent-btn);color:var(--btn-text);">Try Again</button>
                        <button onclick="window.closePracticeMobile()" style="width:100%;padding:1.125rem;border-radius:var(--radius-btn);font-size:1rem;font-weight:700;cursor:pointer;border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);">Back to Library</button>
                    </div>
                </div>
            `;
        } 