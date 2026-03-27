// js/views/CreateView.js
import { auth, storage, functions, db } from '../app.js';
import { getDoc, doc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { httpsCallableFromURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

export const CreateView = {
    render: async () => {
        return `
            <div id="aiLoader" class="loader-screen hidden-loader fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col items-center justify-center transition-opacity" style="opacity:0; pointer-events:none;">
                <div class="text-center flex flex-col items-center">
                    <div class="w-16 h-16 mb-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <div class="text-blue-400 font-bold tracking-widest text-sm mb-2 uppercase">MedExcel is processing...</div>
                    <div class="text-slate-400 text-xs" id="loadingText">Uploading file to secure storage...</div>
                </div>
            </div>

            <div id="upgradeModalBackdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] hidden flex items-center justify-center opacity-0 transition-opacity duration-300">
                <div id="upgradeModal" class="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-[320px] w-full transform scale-95 transition-transform duration-300 shadow-2xl text-center relative overflow-hidden">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
                        <i class="fas fa-crown text-2xl text-yellow-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Unlock More Items</h3>
                    <p class="text-slate-400 text-sm mb-8 leading-relaxed">
                        Your current plan limits you to <span id="modalLimitSpan" class="font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded"></span> items. Upgrade to generate more!
                    </p>
                    <div class="flex flex-col gap-3">
                        <button id="modalUpgradeBtn" class="w-full py-3.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-950 rounded-xl font-bold transition-all active:scale-[0.98]">Upgrade Now</button>
                        <button id="modalCancelBtn" class="w-full py-3 text-slate-400 hover:text-white font-bold rounded-xl transition-colors active:scale-[0.98]">Maybe Later</button>
                    </div>
                </div>
            </div>

            <header class="pt-6 pb-4 px-6 flex items-center gap-4 bg-[#050814]/90 backdrop-blur-md z-10 border-b border-white/5 flex-shrink-0 sticky top-0">
                <h1 class="text-xl font-bold flex-1 text-white">Create AI Quiz</h1>
            </header>

            <main class="flex-1 overflow-y-auto pb-24 px-6 pt-6 flex flex-col">
                <div id="setupView" class="space-y-8">
                    <div id="planBadgeContainer"></div>

                    <div id="uploadSection">
                        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">1. Upload Source Material</h2>
                        <div id="dropZone" class="border-2 border-dashed border-slate-600 rounded-3xl p-8 bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 relative overflow-hidden transition-all">
                            <input type="file" id="fileInput" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt" />
                            <div class="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400 transition-all" id="uploadIcon">
                                <i class="fas fa-cloud-upload-alt text-2xl"></i>
                            </div>
                            <h3 class="font-bold text-lg mb-1 text-white" id="uploadTitle">Tap to Upload File</h3>
                            <p class="text-slate-400 text-xs" id="uploadSubtitle">Supports PDF, PPTX, DOCX, or TXT (Max 10MB)</p>
                        </div>
                    </div>

                    <div id="configSection" class="opacity-40 pointer-events-none transition-opacity duration-300">
                        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">2. Quiz Settings</h2>
                        <div class="space-y-4">
                            <div class="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 focus-within:border-blue-500 transition-colors">
                                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Topic Focus (Optional)</label>
                                <input type="text" id="topicFocus" placeholder="e.g., Mechanism of Action" class="w-full bg-transparent text-white outline-none text-sm placeholder-slate-500">
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <button class="type-btn active bg-blue-600 border-blue-500 border-2 text-white p-3 rounded-xl text-sm font-bold transition">Flashcards</button>
                                <button class="type-btn bg-slate-800 border-slate-700 border-2 text-slate-400 p-3 rounded-xl text-sm font-bold transition hover:bg-slate-700">Multiple Choice</button>
                            </div>

                            <div class="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
                                <div class="flex justify-between items-center mb-3">
                                    <label class="text-xs text-slate-400 font-bold uppercase block">Number of Items <span id="maxLimitText" class="text-slate-500 font-normal lowercase"></span></label>
                                    <span id="sliderValue" class="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg transition-colors">5</span>
                                </div>
                                <input type="range" id="itemSlider" min="1" max="30" value="5" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                            </div>
                        </div>
                    </div>

                    <button id="generateBtn" disabled class="w-full bg-slate-800 text-slate-500 font-extrabold text-sm py-4 rounded-2xl transition-all uppercase tracking-widest opacity-50 cursor-not-allowed">
                        Generate Content
                    </button>
                </div>

                <div id="interactiveView" class="hidden flex-1 flex flex-col justify-center"></div>
            </main>
        `;
    },

    afterRender: async () => {
        // State
        let userPlan = "free";
        let allowedMaxItems = 5;
        let selectedFile = null;
        let quizType = "Flashcards";
        let generatedCards = [];
        let currentCardIndex = 0;
        let isMCQMode = false;
        const MAX_FILE_SIZE = 10 * 1024 * 1024; 
        const ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt'];

        const escapeHTML = (str) => {
            if (!str) return '';
            return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
        };

        // UI Setup based on User Plan
        if (window.currentUser) {
            try {
                const userDoc = await getDoc(doc(db, "users", window.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    userPlan = data.plan || "free";
                    
                    if (userPlan === "elite") { allowedMaxItems = 30; } 
                    else if (userPlan === "premium") { allowedMaxItems = 20; } 
                    else { allowedMaxItems = 5; }

                    document.getElementById('maxLimitText').textContent = `(Your limit: ${allowedMaxItems})`;
                    document.getElementById('planBadgeContainer').innerHTML = `<div class="text-[10px] font-bold uppercase tracking-wider inline-block px-3 py-1 rounded-full border text-blue-400 border-blue-500/50 bg-blue-500/10 mb-2">Current Plan: ${userPlan}</div>`;
                }
            } catch (e) { console.warn(e); }
        }

        // Modal Logic
        const showUpgradeModal = (limit) => {
            return new Promise((resolve) => {
                const backdrop = document.getElementById('upgradeModalBackdrop');
                const modal = document.getElementById('upgradeModal');
                document.getElementById('modalLimitSpan').textContent = limit;
                
                backdrop.classList.remove('hidden');
                requestAnimationFrame(() => {
                    backdrop.classList.remove('opacity-0');
                    modal.classList.remove('scale-95');
                    modal.classList.add('scale-100');
                });

                const closeAndResolve = (result) => {
                    backdrop.classList.add('opacity-0');
                    modal.classList.remove('scale-100');
                    modal.classList.add('scale-95');
                    setTimeout(() => {
                        backdrop.classList.add('hidden');
                        resolve(result);
                    }, 300); 
                };

                document.getElementById('modalUpgradeBtn').onclick = () => closeAndResolve(true);
                document.getElementById('modalCancelBtn').onclick = () => closeAndResolve(false);
            });
        };

        // DOM Listeners
        const itemSlider = document.getElementById('itemSlider');
        const sliderValue = document.getElementById('sliderValue');
        
        itemSlider.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (val > allowedMaxItems) {
                sliderValue.innerHTML = `${val} <i class="fas fa-lock text-[10px] ml-1"></i>`;
                sliderValue.classList.replace('text-blue-400', 'text-yellow-500');
                sliderValue.classList.replace('bg-blue-500/10', 'bg-yellow-500/10');
            } else {
                sliderValue.textContent = val;
                sliderValue.classList.replace('text-yellow-500', 'text-blue-400');
                sliderValue.classList.replace('bg-yellow-500/10', 'bg-blue-500/10');
            }
        });

        itemSlider.addEventListener('change', async (e) => {
            let val = parseInt(e.target.value, 10);
            if (val > allowedMaxItems) {
                const upgrade = await showUpgradeModal(allowedMaxItems);
                if (upgrade) { window.location.hash = '#/profile'; } // Redirect to profile to upgrade
                else {
                    e.target.value = allowedMaxItems;
                    sliderValue.textContent = allowedMaxItems;
                }
            }
        });

        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => {
                    b.classList.remove('active', 'bg-blue-600', 'border-blue-500', 'text-white');
                    b.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-400');
                });
                const target = e.currentTarget;
                target.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-400');
                target.classList.add('active', 'bg-blue-600', 'border-blue-500', 'text-white');
                quizType = target.textContent.trim();
            });
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const ext = file.name.split('.').pop().toLowerCase();
                
                if (!ALLOWED_EXTENSIONS.includes(ext)) return alert("Invalid file type.");
                if (file.size > MAX_FILE_SIZE) return alert("File is too large.");
                
                selectedFile = file;
                document.getElementById('uploadTitle').innerHTML = `<i class="fas fa-file-alt text-blue-400 mr-2"></i> ${escapeHTML(file.name)}`;
                document.getElementById('uploadSubtitle').textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
                document.getElementById('configSection').classList.remove('opacity-40', 'pointer-events-none');
                
                const btn = document.getElementById('generateBtn');
                btn.disabled = false;
                btn.className = "w-full bg-blue-600 text-white font-extrabold text-sm py-4 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-[0.98]";
            }
        });

        // Interactive UI Render
        const renderCard = () => {
            const card = generatedCards[currentCardIndex];
            const interactiveView = document.getElementById('interactiveView');
            isMCQMode = quizType === "Multiple Choice";

            let html = `
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-sm font-bold text-slate-400 tracking-widest uppercase">${isMCQMode ? 'Quiz Mode' : 'Flashcards'}</h2>
                    <span class="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full text-blue-400 border border-slate-700">${currentCardIndex + 1} / ${generatedCards.length}</span>
                </div>
                <div id="cardContainer" class="flex-1 flex flex-col justify-center min-h-[350px]">
            `;

            if (isMCQMode) {
                let optionsHTML = '<div class="space-y-3 mt-6">';
                for (const [key, value] of Object.entries(card.options || {})) {
                    optionsHTML += `
                        <button class="mcq-option w-full text-left p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500 transition-all flex items-center gap-3" data-key="${key}" data-value="${escapeHTML(value)}">
                            <span class="font-bold text-blue-500 bg-blue-500/10 w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0">${key}</span>
                            <span class="text-slate-300 flex-1 text-sm leading-relaxed">${escapeHTML(value)}</span>
                        </button>`;
                }
                optionsHTML += '</div>';

                html += `
                    <div class="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 shadow-xl w-full">
                        <h3 class="font-bold text-white text-lg leading-relaxed">Q: ${escapeHTML(card.question)}</h3>
                        ${optionsHTML}
                        <div id="explanationArea" class="hidden mt-6 pt-5 border-t border-slate-700 text-sm"></div>
                    </div>`;
            } else {
                html += `
                    <div id="flashcardElement" class="group perspective-1000 w-full h-[350px] cursor-pointer">
                        <div class="flip-inner relative w-full h-full transform-style-3d shadow-xl rounded-3xl transition-transform duration-500">
                            <div class="absolute inset-0 backface-hidden bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col items-center justify-center text-center">
                                <span class="absolute top-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Question</span>
                                <h3 class="font-bold text-blue-400 text-xl leading-relaxed">${escapeHTML(card.question)}</h3>
                            </div>
                            <div class="absolute inset-0 backface-hidden bg-blue-600 rounded-3xl p-8 border border-blue-500 flex flex-col items-center justify-center text-center rotate-y-180" style="transform: rotateY(180deg);">
                                <span class="absolute top-6 text-[10px] uppercase tracking-widest text-blue-200 font-bold">Answer</span>
                                <p class="text-white text-lg font-medium leading-relaxed">${escapeHTML(card.answer)}</p>
                            </div>
                        </div>
                    </div>`;
            }

            html += `</div>
                <div id="navigationControls" class="flex justify-between gap-4 mt-8">
                    <button id="prevBtn" class="flex-1 bg-slate-800 text-slate-300 font-bold py-4 rounded-xl border border-slate-700 disabled:opacity-30" ${currentCardIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <button id="nextBtn" class="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl border border-blue-500">Next</button>
                </div>
                <button id="saveStudyBtn" class="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm py-4 rounded-2xl hidden shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">Save & Finish Session</button>
            `;
            
            interactiveView.innerHTML = html;

            // Listeners
            if (isMCQMode) {
                const buttons = interactiveView.querySelectorAll('.mcq-option');
                buttons.forEach(btn => btn.addEventListener('click', () => {
                    if (card.answered) return;
                    card.answered = true;
                    
                    const selectedKey = btn.dataset.key;
                    buttons.forEach(b => {
                        const isCorrect = String(card.answer).toLowerCase().includes(String(b.dataset.key).toLowerCase());
                        b.disabled = true;
                        if (isCorrect) { b.classList.add('bg-emerald-900/40', 'border-emerald-500', 'text-emerald-400'); } 
                        else if (b.dataset.key === selectedKey) { b.classList.add('bg-red-900/40', 'border-red-500', 'text-red-400'); }
                    });
                    const expl = document.getElementById('explanationArea');
                    expl.innerHTML = `<span class="block text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Explanation</span><p class="text-slate-300 text-sm">${escapeHTML(card.explanation || 'No explanation provided.')}</p>`;
                    expl.classList.remove('hidden');
                }));
            } else {
                const fc = document.getElementById('flashcardElement');
                const inner = fc.querySelector('.flip-inner');
                fc.addEventListener('click', () => {
                    if (inner.style.transform === 'rotateY(180deg)') { inner.style.transform = 'rotateY(0deg)'; } 
                    else { inner.style.transform = 'rotateY(180deg)'; }
                });
            }

            document.getElementById('prevBtn').addEventListener('click', () => { currentCardIndex--; renderCard(); });
            document.getElementById('nextBtn').addEventListener('click', () => {
                if (currentCardIndex < generatedCards.length - 1) { currentCardIndex++; renderCard(); } 
                else {
                    document.getElementById('navigationControls').classList.add('hidden');
                    const saveBtn = document.getElementById('saveStudyBtn');
                    saveBtn.classList.remove('hidden');
                    saveBtn.addEventListener('click', async () => {
                        saveBtn.disabled = true; saveBtn.innerText = "Saving to Library...";
                        try {
                            const batch = writeBatch(db);
                            const subjectName = document.getElementById('topicFocus').value || selectedFile.name.split('.')[0];
                            generatedCards.forEach(c => {
                                batch.set(doc(collection(db, "mcqs")), {
                                    subject: subjectName, text: c.question || "", options: c.options ? Object.values(c.options) : [],
                                    explanation: c.explanation || "", userId: window.currentUser.uid, type: quizType, createdAt: new Date().toISOString()
                                });
                            });
                            await batch.commit();
                            window.location.hash = "#/library";
                        } catch (err) { alert("Failed to save."); saveBtn.disabled = false; }
                    });
                }
            });
        };

        // Generation Execution
        document.getElementById('generateBtn').addEventListener('click', async () => {
            if (!selectedFile || !window.currentUser) return;
            const requestedItems = parseInt(itemSlider.value, 10);
            
            const loader = document.getElementById('aiLoader');
            loader.style.opacity = '1'; loader.style.pointerEvents = 'auto';
            
            try {
                const securePath = `uploads/${window.currentUser.uid}/${Date.now()}_${selectedFile.name}`;
                await uploadBytes(ref(storage, securePath), selectedFile);
                
                document.getElementById('loadingText').textContent = `MedExcel AI is generating ${quizType}...`;
                // UPDATE THIS URL TO YOUR ACTUAL CLOUD FUNCTION URL IF NEEDED
                const generateQuizFunction = httpsCallableFromURL(functions, 'https://generatequizfromfile-w2b2eq6c5q-uc.a.run.app');
                
                const response = await generateQuizFunction({
                    filePath: securePath, fileName: selectedFile.name, quizType: quizType, 
                    topicFocus: document.getElementById('topicFocus').value, numberOfItems: requestedItems
                });
                
                const cards = response.data.cards || response.data.flashcards || response.data.items || response.data.questions;
                if(!cards || cards.length === 0) throw new Error("No data returned");
                generatedCards = cards.map(card => ({ ...card, answered: false }));
                currentCardIndex = 0;
                
                document.getElementById('setupView').classList.add('hidden');
                document.getElementById('interactiveView').classList.remove('hidden');
                renderCard();
            } catch (error) {
                console.error("Error:", error);
                alert("Generation failed. Please try again.");
            } finally {
                loader.style.opacity = '0'; loader.style.pointerEvents = 'none';
            }
        });
    }
};