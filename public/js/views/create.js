// Create View
// --- CREATE UI LOGIC ---

        window.openCreateView = function(type) {
            window.globalQuizType = type;
            document.getElementById('selectionView').style.display = 'none';
            document.getElementById('setupView').style.display = 'flex';
            document.getElementById('createHeaderTitle').textContent = `Create ${type}`;
            document.getElementById('createBackBtn').style.display = 'flex';
        };

        window.enterQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = 'translateY(100%)';
            const header = document.querySelector('#view-create .top-header');
            if (header) header.style.display = 'none';
            Object.assign(document.getElementById('interactiveView').style, { position:'fixed', inset:'0', zIndex:'200', background:'var(--bg-body)', padding:'0', overflowY:'auto' });
        };
        window.exitQuizMode = function() {
            const nav = document.getElementById('globalBottomNav');
            if (nav) nav.style.transform = '';
            const header = document.querySelector('#view-create .top-header');
            if (header) header.style.display = '';
            Object.assign(document.getElementById('interactiveView').style, { position:'', inset:'', zIndex:'', background:'', padding:'', overflowY:'' });
        };

        window.goBackToSelection = function() {
            window.exitQuizMode();
            document.getElementById('setupView').style.display = 'none';
            document.getElementById('interactiveView').style.display = 'none';
            document.getElementById('createHeaderTitle').textContent = "What to create?";
            document.getElementById('createBackBtn').style.display = 'none';

            // If coming from home page MCQ/Flashcard tap, skip selection entirely
            if (window._pendingCreateType) {
                const type = window._pendingCreateType;
                window._pendingCreateType = null;
                // Hide selection so it never shows, then open the setup view directly
                document.getElementById('selectionView').style.display = 'none';
                window.openCreateView(type);
                return;
            }

            // Normal back — show selection screen
            document.getElementById('selectionView').style.display = 'flex';
            
            // Reset state
            window.selectedFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('uploadIcon').innerHTML = `<i class="fas fa-cloud-upload-alt"></i>`;
            document.getElementById('uploadTitle').textContent = "Tap to Upload File";
            document.getElementById('dropZone').style.borderColor = 'var(--border-glass)';
            
            document.getElementById('configSection').style.opacity = '0.5';
            document.getElementById('configSection').style.pointerEvents = 'none';
            
            const btn = document.getElementById('generateBtn');
            btn.disabled = true;
            btn.style.background = 'var(--bg-surface)';
            btn.style.color = 'var(--text-muted)';
            btn.style.cursor = 'not-allowed';
            
            document.getElementById('interactiveView').style.display = 'none';
        };

        // --- LIBRARY FILTER TABS & SEARCH ---
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const searchVal = document.getElementById('librarySearchInput') ? document.getElementById('librarySearchInput').value : '';
                window.renderLibrary(btn.dataset.filter, searchVal);
            });
        });
        const librarySearchInput = document.getElementById('librarySearchInput');
        if (librarySearchInput) {
            librarySearchInput.addEventListener('input', (e) => {
                const activeTabEl = document.querySelector('.tab-btn.active');
                const filter = activeTabEl ? activeTabEl.dataset.filter : 'all';
                window.renderLibrary(filter, e.target.value);
            });
        }

        // --- LOTTIE LOADER INIT ---
        document.addEventListener('DOMContentLoaded', () => {
            const loaderContainer = document.getElementById('lottieLoaderContainer');
            if (loaderContainer && typeof lottie !== 'undefined') {
                try {
                    window.lottieAnimation = lottie.loadAnimation({
                        container: loaderContainer,
                        renderer: 'svg',
                        loop: true,
                        autoplay: false,
                        path: 'scan.json'
                    });
                } catch(e) { window.lottieAnimation = null; }
            }
        });
        const sliderValue = document.getElementById('sliderValue');
        if(itemSlider && sliderValue) {
            itemSlider.addEventListener('input', (e) => {
                let val = parseInt(e.target.value, 10);
                if (val > window.allowedMaxItems) {
                    sliderValue.innerHTML = `${val} <i class="fas fa-lock" style="font-size: 10px;"></i>`;
                    sliderValue.style.color = 'var(--accent-yellow)';
                    sliderValue.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                } else {
                    sliderValue.textContent = val;
                    sliderValue.style.color = 'var(--text-main)';
                    sliderValue.style.borderColor = 'var(--border-glass)';
                }
            });
            itemSlider.addEventListener('change', async (e) => {
                let val = parseInt(e.target.value, 10);
                if (val > window.allowedMaxItems) {
                    const wantToUpgrade = await window.showCustomUpgradeModal(window.allowedMaxItems);
                    if (wantToUpgrade) window.navigateTo('view-payment');
                    else { 
                        e.target.value = window.allowedMaxItems; 
                        sliderValue.textContent = window.allowedMaxItems; 
                        sliderValue.style.color = 'var(--text-main)';
                        sliderValue.style.borderColor = 'var(--border-glass)';
                    }
                }
            });
        }

        const fileInput = document.getElementById('fileInput');
        if(fileInput) {
            fileInput.addEventListener('click', (e) => { if (!window.currentUser) { e.preventDefault(); window.showLoginModal(); } });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 10 * 1024 * 1024) { alert("File is too large. Maximum size is 10MB."); fileInput.value = ''; return; }
                    window.selectedFile = file;
                    document.getElementById('uploadIcon').innerHTML = `<i class="fas fa-file-check" style="color: var(--accent-btn);"></i>`;
                    document.getElementById('uploadTitle').innerHTML = `<span style="color: var(--accent-btn);">${window.escapeHTML(file.name)}</span>`;
                    
                    document.getElementById('dropZone').style.borderColor = 'var(--border-active)';
                    document.getElementById('configSection').style.opacity = '1';
                    document.getElementById('configSection').style.pointerEvents = 'auto';
                    
                    const btn = document.getElementById('generateBtn');
                    btn.disabled = false;
                    btn.style.background = 'var(--accent-btn)';
                    btn.style.color = 'var(--btn-text)';
                    btn.style.cursor = 'pointer';
                }
            });
        }
//// --- NEW INTERACTIVE RENDERER LOGIC (CREATE VIEW) ---

window.checkAnswerMatch = function(selectedKey, selectedValue, correctAnswer) {
    if (!correctAnswer) return false;
    const ans = String(correctAnswer).trim().toLowerCase();
    const k = String(selectedKey).trim().toLowerCase();
    const v = String(selectedValue).trim().toLowerCase();
    return ans === k || ans === v || ans === `${k}. ${v}` || ans.startsWith(k + '.') || ans.startsWith(k + ')');
};

window.handleCreateMCQSelection = function(selectedBtn, cardData, allButtons) {
            if (cardData.answered) return; cardData.answered = true;
            const selectedKey = selectedBtn.dataset.key; let selectedIsCorrect = false;
            const answer = cardData.back || cardData.answer || "No answer provided";

            allButtons.forEach(btn => {
                const key = btn.dataset.key; const value = btn.dataset.value; 
                const isThisCorrect = (String(answer).trim().toLowerCase() === String(value).trim().toLowerCase() || String(answer).trim().toLowerCase().startsWith(String(key).trim().toLowerCase()));
                btn.disabled = true; btn.style.opacity = '0.5';
                if (isThisCorrect) { 
                    btn.style.background = 'rgba(16, 185, 129, 0.1)'; btn.style.borderColor = 'rgba(16, 185, 129, 0.3)'; btn.style.color = 'var(--accent-green)'; btn.style.opacity = '1'; 
                    if (key === selectedKey) { selectedIsCorrect = true; sessionScore++; } 
                } 
                else if (key === selectedKey) { 
                    btn.style.background = 'rgba(239, 68, 68, 0.1)'; btn.style.borderColor = 'rgba(239, 68, 68, 0.3)'; btn.style.color = 'var(--accent-red)'; btn.style.opacity = '1'; 
                }
            });

            const explArea = document.getElementById('createExplanationArea');
            explArea.innerHTML = `<div style="margin-bottom: 0.5rem; font-size: 0.8125rem;">${selectedIsCorrect ? '<span style="color: var(--accent-green); font-weight: 700;"><i class="fas fa-check-circle"></i> Correct</span>' : `<span style="color: var(--accent-red); font-weight: 700;"><i class="fas fa-times-circle"></i> Incorrect</span> <span style="margin-left: 0.5rem; color: var(--text-muted); font-size: 0.75rem;">Answer: <b style="color: var(--text-main);">${window.escapeHTML(answer)}</b></span>`}</div>${cardData.explanation ? `<div style="background: var(--bg-body); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass); color: var(--text-main); font-size: 0.875rem; line-height: 1.5;"><span style="font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.375rem; font-size: 0.75rem; text-transform: uppercase;">Explanation</span> ${window.escapeHTML(cardData.explanation)}</div>` : ''}`;
            explArea.style.display = 'flex'; explArea.classList.add('fade-in');
            setTimeout(() => { explArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
            document.getElementById('createNextBtn').disabled = false; document.getElementById('createNextBtn').style.opacity = '1'; document.getElementById('createNextBtn').style.cursor = 'pointer';
        }

        window.renderCreateCurrentCard = function() {
            const card = generatedCards[currentCardIndex];
            const safeQuestion = window.escapeHTML(card.front || card.question || "No question provided");
            const safeAnswer = window.escapeHTML(card.back || card.answer || "No answer provided");
            const progressPercent = ((currentCardIndex + 1) / generatedCards.length) * 100;
            const viewContainer = document.getElementById('interactiveView');

            let html = `
                <div style="display: flex; flex-direction: column; height: 100%; min-height: 100vh; padding: 1.25rem 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.5rem); box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-shrink: 0;">
                    <button onclick="window.goBackToSelection()" style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background: var(--bg-surface); border: 1px solid var(--border-glass); display: flex; align-items: center; justify-content: center; color: var(--text-main); font-size: 0.875rem; cursor: pointer; flex-shrink: 0; transition: 0.2s;" ontouchstart="this.style.transform='scale(0.9)'" ontouchend="this.style.transform=''"><i class="fas fa-arrow-left"></i></button>
                    <h2 style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; flex: 1;">${isMCQMode ? 'Quiz Mode' : 'Flashcards'}</h2>
                    <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-main);">${currentCardIndex + 1} / ${generatedCards.length}</span>
                </div>
                <div style="width: 100%; height: 6px; background: var(--bg-body); border-radius: 100px; overflow: hidden; margin-bottom: 1rem; border: 1px solid var(--border-glass); flex-shrink: 0;"><div style="height: 100%; background: var(--accent-btn); border-radius: 100px; transition: width 0.4s var(--ease-snap); width: ${progressPercent}%;"></div></div>
            `;

            if (isMCQMode) {
                let optionsHTML = '<div style="display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; width: 100%;">';
                if (card.options && typeof card.options === 'object') {
                    for (const [key, value] of Object.entries(card.options)) {
                        optionsHTML += `<button class="create-mcq-option" data-key="${window.escapeHTML(key)}" data-value="${window.escapeHTML(value)}" style="width: 100%; text-align: left; padding: 0.75rem 0.875rem; border-radius: var(--radius-md); background: var(--bg-body); border: 1px solid var(--border-glass); display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; color: var(--text-main);"><span style="font-weight: 600; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-glass); width: 1.625rem; height: 1.625rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 0.75rem; flex-shrink: 0; margin-top: 0.125rem;">${window.escapeHTML(key)}</span><span style="flex: 1; font-size: 0.875rem; line-height: 1.4; padding-top: 0.125rem; font-weight: 500;">${window.escapeHTML(value)}</span></button>`;
                    }
                }
                optionsHTML += '</div>';

                html += `<div style="flex: 1; background: var(--bg-surface); border-radius: var(--radius-card); padding: 1rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; min-height: 0; overflow: hidden; position: relative;"><div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 0; padding-right: 0.25rem;" class="hide-scroll"><h3 style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem; line-height: 1.5; margin-bottom: 0.875rem; flex-shrink: 0;">${safeQuestion}</h3>${optionsHTML}<div id="createExplanationArea" style="display: none; flex-direction: column; flex-shrink: 0; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-glass);"></div></div></div>`;
            } else {
                html += `
                    <div id="flashcardElement" style="flex: 1; position: relative; perspective: 1000px; cursor: pointer; min-height: 0; width: 100%;">
                        <div id="flipInner" style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s var(--ease-snap); border-radius: var(--radius-card);">
                            <div style="position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: var(--radius-card); padding: 1.5rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow-y: auto; background: var(--bg-surface); z-index: 2; transform: rotateY(0deg);">
                                <span style="position: absolute; top: 1.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Question</span>
                                <h3 style="font-weight: 600; font-size: 1.125rem; line-height: 1.5; margin-top: 1rem; color: var(--text-main);">${safeQuestion}</h3>
                                <p style="position: absolute; bottom: 1.25rem; font-size: 0.8125rem; font-weight: 500; display: flex; align-items: center; gap: 0.375rem; color: var(--text-muted);"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                            <div style="position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; border-radius: var(--radius-card); padding: 1.5rem; border: 1px solid var(--border-glass); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow-y: auto; background: var(--accent-btn); transform: rotateY(180deg); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); z-index: 1;">
                                <span style="position: absolute; top: 1.5rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--btn-text); opacity: 0.7;">Answer</span>
                                <p style="font-weight: 600; font-size: 1.125rem; line-height: 1.5; margin-top: 1rem; color: var(--btn-text);">${safeAnswer}</p>
                                <p style="position: absolute; bottom: 1.25rem; font-size: 0.8125rem; font-weight: 500; display: flex; align-items: center; gap: 0.375rem; color: var(--btn-text); opacity: 0.8;"><i class="fas fa-sync-alt"></i> Tap to flip</p>
                            </div>
                        </div>
                    </div>`;
            }

            html += `
                <div style="display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1rem; flex-shrink: 0;">
                    <button id="createPrevBtn" style="flex: 1; padding: 1rem; border-radius: var(--radius-btn); font-size: 0.9375rem; font-weight: 700; cursor: ${currentCardIndex === 0 ? 'not-allowed' : 'pointer'}; border: 1px solid var(--border-glass); background: var(--bg-surface); color: var(--text-main); opacity: ${currentCardIndex === 0 ? '0.4' : '1'};" ${currentCardIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <button id="createNextBtn" style="flex: 1; padding: 1rem; border-radius: var(--radius-btn); font-size: 0.9375rem; font-weight: 700; cursor: ${(isMCQMode && !card.answered) ? 'not-allowed' : 'pointer'}; border: none; background: var(--accent-btn); color: var(--btn-text); opacity: ${(isMCQMode && !card.answered) ? '0.4' : '1'};" ${(isMCQMode && !card.answered) ? 'disabled' : ''}>${currentCardIndex === generatedCards.length - 1 ? 'Finish' : 'Next'}</button>
                </div>
                </div>
            `;
            viewContainer.innerHTML = html;

            if (isMCQMode) {
                const buttons = viewContainer.querySelectorAll('.create-mcq-option');
                buttons.forEach(btn => btn.addEventListener('click', () => window.handleCreateMCQSelection(btn, card, buttons)));
            } else {
                const fc = document.getElementById('flashcardElement');
                fc.addEventListener('click', () => { const inner = document.getElementById('flipInner'); inner.style.transform = inner.style.transform.includes('180deg') ? 'rotateY(0deg)' : 'rotateY(180deg)'; });
            }
            document.getElementById('createPrevBtn').addEventListener('click', () => { if (currentCardIndex > 0) { currentCardIndex--; window.renderCreateCurrentCard(); } });
            document.getElementById('createNextBtn').addEventListener('click', () => { if (currentCardIndex < generatedCards.length - 1) { currentCardIndex++; window.renderCreateCurrentCard(); } else { window.showCreateResults(); } });
        }

        window.showCreateResults = function() {
            const percentage = generatedCards.length > 0 ? Math.round((sessionScore / generatedCards.length) * 100) : 100;
            const viewContainer = document.getElementById('interactiveView');
            let html = '';

            if (isMCQMode) {
                window.finalEarnedXP = sessionScore * 10;
                let earnedStars = 1; if (percentage >= 80) earnedStars = 3; else if (percentage >= 50) earnedStars = 2;
                html = `
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="display: flex; gap: 0.5rem; font-size: 3.5rem; margin-bottom: 1rem;">
                            <i class="fas fa-star" style="color: ${earnedStars >= 1 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                            <i class="fas fa-star" style="transform: translateY(-10px); color: ${earnedStars >= 2 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                            <i class="fas fa-star" style="color: ${earnedStars >= 3 ? 'var(--accent-yellow)' : 'var(--bg-surface)'};"></i>
                        </div>
                        <h2 style="color: var(--accent-yellow); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Quiz Complete!</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center; margin-bottom: 2.5rem;">
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                            </div>
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">AMAZING</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bullseye" style="color: var(--accent-green);"></i> <span id="animatedAcc">0</span>%</div>
                            </div>
                        </div>
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 2rem;">CLAIM XP</button>
                    </div>`;
            } else {
                window.finalEarnedXP = generatedCards.length * 5;
                html = `
                    <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; width: 100%; padding: 2rem 1rem 1rem;">
                        <div style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 4px solid var(--accent-green); color: var(--accent-green); font-size: 3.5rem;"><i class="fas fa-check"></i></div>
                        <h2 style="color: var(--accent-green); font-size: 2rem; font-weight: 800; margin-bottom: 2rem; text-align: center;">Review Complete!</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; max-width: 500px; justify-content: center; margin-bottom: 2.5rem;">
                            <div style="flex: 1; border-radius: var(--radius-card); border: 1px solid var(--border-glass); background: var(--bg-surface); padding: 1.5rem 0.5rem; text-align: center;">
                                <div style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL XP</div>
                                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);"><i class="fas fa-bolt" style="color: var(--accent-yellow);"></i> <span id="animatedXP">0</span></div>
                            </div>
                        </div>
                        <button onclick="window.claimAndContinue()" class="btn-claim-xp" style="width: 100%; max-width: 320px; background: var(--accent-btn); color: var(--btn-text); font-size: 1.125rem; font-weight: 800; padding: 1.25rem; border-radius: var(--radius-btn); border: none; margin-top: auto; margin-bottom: 2rem;">CLAIM XP</button>
                    </div>`;
            }
            viewContainer.innerHTML = html;
            window.animateValue("animatedXP", 0, window.finalEarnedXP, 1500);
            if (isMCQMode) window.animateValue("animatedAcc", 0, percentage, 1500);
        }
        
        window.claimAndContinue = async function() {
            const btn = document.querySelector('.btn-claim-xp');
            btn.textContent = "CLAIMING..."; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7';
            try { await window.addXP(window.finalEarnedXP); } catch(e) {}
            window.goBackToSelection();
            window.navigateTo('view-home');
            window.updateHomeContinueCard();
        }

        window.animateValue = function(id, start, end, duration) {
            if (start === end) { document.getElementById(id).textContent = end; return; }
            let current = start; let increment = end > start ? 1 : -1;
            let stepTime = Math.abs(Math.floor(duration / Math.max(end - start, 1)));
            if (stepTime < 10) { stepTime = 10; increment = Math.ceil((end - start) / (duration / stepTime)); }
            let obj = document.getElementById(id);
            let timer = setInterval(function() {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) { current = end; clearInterval(timer); }
                obj.textContent = current;
            }, stepTime);
        }