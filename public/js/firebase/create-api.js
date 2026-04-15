// Create Generation API Logic
        const generateBtn = document.getElementById('generateBtn');
        const aiLoader = document.getElementById('aiLoader');
        const loadingText = document.getElementById('loadingText');
        const loadingMessages = ["Analyzing document structure...", "Extracting key concepts...", "Formulating questions...", "Reviewing accuracy...", "Almost there..."];
        let messageInterval = null;

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                if (!window.selectedFile) return;
                if (!window.currentUser) { window.showLoginModal(); return; }
                
                const requestedItems = parseInt(document.getElementById('itemSlider').value, 10);
                if (requestedItems > window.allowedMaxItems) {
                    const wantToUpgrade = await window.showCustomUpgradeModal(window.allowedMaxItems);
                    if (wantToUpgrade) window.navigateTo('view-payment'); return;
                }

                generateBtn.disabled = true; 
                generateBtn.style.background = 'var(--bg-surface)'; generateBtn.style.color = 'var(--text-muted)';
                aiLoader.classList.add('show');
                document.getElementById('createBackBtn').style.display = 'none';
                if (window.lottieAnimation) window.lottieAnimation.play();
                
                // NEW PROGRESS BAR LOGIC
                const ESTIMATED_SECS = 30;
                let scanElapsed = 0;
                const scanProgressBar = document.getElementById('scanProgressBar');
                const scanElapsedLabel = document.getElementById('scanElapsedLabel');
                const scanEstLabel = document.getElementById('scanEstLabel');
                if(scanProgressBar) {
                    scanProgressBar.style.transition = 'none';
                    scanProgressBar.style.width = '0%';
                }
                if(scanElapsedLabel) scanElapsedLabel.textContent = '0s elapsed';
                if(scanEstLabel) scanEstLabel.textContent = `~${ESTIMATED_SECS}s remaining`;
                setTimeout(() => { if(scanProgressBar) scanProgressBar.style.transition = 'width 1s linear'; }, 50);
                
                window.scanProgressInterval = setInterval(() => {
                    scanElapsed++;
                    const progress = Math.min(90, (scanElapsed / ESTIMATED_SECS) * 100);
                    if(scanProgressBar) scanProgressBar.style.width = progress + '%';
                    if(scanElapsedLabel) scanElapsedLabel.textContent = `${scanElapsed}s elapsed`;
                    const remaining = Math.max(0, ESTIMATED_SECS - scanElapsed);
                    if(scanEstLabel) scanEstLabel.textContent = remaining > 0 ? `~${remaining}s remaining` : 'Almost done...';
                }, 1000);
                
                let msgIndex = 0; if(loadingText) loadingText.style.opacity = 0;
                setTimeout(() => { if(loadingText) { loadingText.textContent = loadingMessages[0]; loadingText.style.opacity = 1; } }, 300);
                messageInterval = setInterval(() => { if(loadingText) { loadingText.style.opacity = 0; setTimeout(() => { msgIndex = (msgIndex + 1) % loadingMessages.length; loadingText.textContent = loadingMessages[msgIndex]; loadingText.style.opacity = 1; }, 300); } }, 3500); 

                try {
                    const uniqueFileName = Date.now() + '_' + window.selectedFile.name;
                    const securePath = `uploads/${window.currentUser.email || window.currentUser.uid}/${uniqueFileName}`;
                    const storageReference = ref(storage, securePath);
                    await uploadBytes(storageReference, window.selectedFile);
                    
                    const generateQuizFunction = httpsCallable(functions, 'generateQuizFromFile');
                    const response = await generateQuizFunction({ filePath: securePath, fileName: window.selectedFile.name, quizType: window.globalQuizType, topicFocus: document.getElementById('topicFocus').value, numberOfItems: requestedItems });
                    
                    const payload = response.data;
                    const cards = payload.cards || payload.flashcards || payload.items || payload.questions;
                    if (!cards || !Array.isArray(cards) || cards.length === 0) throw new Error("Generation returned empty data.");

                    // ADDED SAFETY FILTER HERE to ignore blank/undefined cards from the AI
                    generatedCards = cards.filter(card => card != null && typeof card === 'object').map(card => {
                        let frontText = card.front || card.question || ""; let backText = card.back || card.answer || "No answer provided";
                        if (card.options) {
                            const cleanBack = String(backText).trim().toUpperCase();
                            if (Array.isArray(card.options)) { if (cleanBack.length === 1 && /^[A-E]$/.test(cleanBack)) { const idx = cleanBack.charCodeAt(0) - 65; if (card.options[idx]) backText = card.options[idx]; } }
                            else if (typeof card.options === 'object') { if (cleanBack.length <= 2 && card.options[cleanBack]) backText = card.options[cleanBack]; else { for (const [key, value] of Object.entries(card.options)) { if (String(key).trim().toUpperCase() === cleanBack || String(key).trim() === cleanBack) { backText = value; break; } } } }
                        }
                        return { ...card, front: frontText, back: backText, answer: backText, answered: false };
                    });
                    window.generatedCards = generatedCards;

                    if (generatedCards.length === 0) throw new Error("AI returned invalid card formats.");

                    currentCardIndex = 0; window.currentCardIndex = 0; sessionScore = 0; isMCQMode = window.globalQuizType === "Multiple Choice"; window.isMCQMode = isMCQMode;
                    const subjectName = document.getElementById('topicFocus').value || "General Subject";
                    const newQuiz = {
                        id: Date.now(), title: window.selectedFile.name.split('.')[0] + " Quiz", subject: subjectName, favorite: false, stats: { bestScore: 0, attempts: 0, lastScore: 0 },
                        questions: generatedCards.map(card => {
                            let optionsArr = [], correctIdx = 0; const question = card.front || card.question || ""; const answer = card.back || card.answer || "No answer provided";
                            if (card.options && typeof card.options === 'object') { const keys = Object.keys(card.options); optionsArr = Object.values(card.options); for (let i = 0; i < keys.length; i++) { if (window.checkAnswerMatch(keys[i], optionsArr[i], answer)) { correctIdx = i; break; } } } 
                            else { optionsArr = [answer !== "No answer provided" ? answer : "True", "False"]; }
                            return { text: question, options: optionsArr, correct: correctIdx, explanation: card.explanation || "" };
                        }), type: window.globalQuizType
                    };

                    try { await setDoc(doc(db, "users", window.currentUser.uid, "quizzes", newQuiz.id.toString()), newQuiz); } catch(e) {}
                    let existingQuizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + window.currentUser.uid)) || [];
                    existingQuizzes.push(newQuiz); localStorage.setItem('medexcel_quizzes_' + window.currentUser.uid, JSON.stringify(existingQuizzes));
                    window.quizzes = existingQuizzes;

                    if (window.lottieAnimation) window.lottieAnimation.stop(); clearInterval(messageInterval); clearInterval(window.scanProgressInterval);
                    aiLoader.classList.remove('show');
                    document.getElementById('setupView').style.display = 'none';
                    document.getElementById('interactiveView').style.display = 'flex';
                    window.enterQuizMode();
                    window.renderCreateCurrentCard();
                    
                } catch (error) {
                    console.error("Error generating quiz:", error);
                    if (window.lottieAnimation) window.lottieAnimation.stop(); clearInterval(messageInterval); clearInterval(window.scanProgressInterval);
                    alert("Generation Error: " + error.message);
                    aiLoader.classList.remove('show');
                    generateBtn.disabled = false; generateBtn.style.background = 'var(--accent-btn)'; generateBtn.style.color = 'var(--btn-text)';
                    document.getElementById('createBackBtn').style.display = 'flex';
                }
            });
        }

        

        /* =========================================
