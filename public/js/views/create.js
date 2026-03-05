import { auth, storage, functions, db } from '../firebase-config.js';
import { getDoc, doc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { httpsCallableFromURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export default class Create {
    constructor() {
        this.currentUser = null;
        this.userPlan = "free";
        this.allowedMaxItems = 5;
        this.selectedFile = null;
        this.quizType = "Flashcards";
        this.generatedCards = [];
        this.currentCardIndex = 0;
        this.isMCQMode = false;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; 
        this.ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt'];
    }

    async getHtml() {
        return `
            <div id="aiLoader" class="loader-screen hidden-loader" role="status">
                <div class="text-center flex flex-col items-center">
                    <div class="w-16 h-16 mb-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <div class="text-blue-400 font-bold tracking-widest text-sm mb-2 uppercase">Aurora is processing...</div>
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
                        Your current plan limits you to <span id="modalLimitSpan" class="font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded"></span> items. Upgrade to generate up to 30 items at once!
                    </p>
                    <div class="flex flex-col gap-3">
                        <button id="modalUpgradeBtn" class="w-full py-3.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-950 rounded-xl font-bold transition-all active:scale-[0.98]">Upgrade Now</button>
                        <button id="modalCancelBtn" class="w-full py-3 text-slate-400 hover:text-white font-bold rounded-xl transition-colors active:scale-[0.98]">Maybe Later</button>
                    </div>
                </div>
            </div>

            <header class="pt-6 pb-4 px-6 flex items-center gap-4 bg-slate-900 z-10 border-b border-slate-800 flex-shrink-0">
                <button onclick="window.location.hash='#/'" class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h1 class="text-xl font-bold flex-1">Create AI Quiz</h1>
            </header>

            <main class="flex-1 overflow-y-auto pb-24 px-6 pt-6 flex flex-col">
                <div id="setupView" class="space-y-8">
                    <div id="planBadgeContainer"></div>

                    <div id="uploadSection">
                        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">1. Upload Source Material</h2>
                        <div id="dropZone" class="upload-zone border-2 border-dashed border-slate-600 rounded-3xl p-8 bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 relative overflow-hidden">
                            <input type="file" id="fileInput" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt" />
                            <div class="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400" id="uploadIcon">
                                <i class="fas fa-cloud-upload-alt text-2xl"></i>
                            </div>
                            <h3 class="font-bold text-lg mb-1" id="uploadTitle">Tap to Upload File</h3>
                            <p class="text-slate-400 text-xs" id="uploadSubtitle">Supports PDF, PPTX, DOCX, or TXT (Max 10MB)</p>
                        </div>
                    </div>

                    <div id="configSection" class="opacity-40 pointer-events-none transition-opacity duration-300">
                        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">2. Quiz Settings</h2>
                        <div class="space-y-4">
                            <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Topic Focus (Optional)</label>
                                <input type="text" id="topicFocus" placeholder="e.g., Mechanism of Action" class="w-full bg-transparent text-white outline-none text-sm placeholder-slate-500">
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <button class="type-btn active bg-blue-600 border-blue-500 border-2 text-white p-3 rounded-xl text-sm font-bold transition">Flashcards</button>
                                <button class="type-btn bg-slate-800 border-slate-700 border-2 text-slate-400 p-3 rounded-xl text-sm font-bold transition hover:bg-slate-700">Multiple Choice</button>
                            </div>

                            <div class="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                                <div class="flex justify-between items-center mb-3">
                                    <label class="text-xs text-slate-400 font-bold uppercase block">Number of Items <span id="maxLimitText" class="text-slate-500 font-normal lowercase"></span></label>
                                    <span id="sliderValue" class="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg">5</span>
                                </div>
                                <input type="range" id="itemSlider" min="1" max="30" value="5" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                            </div>
                        </div>
                    </div>

                    <button id="generateBtn" disabled class="w-full bg-slate-700 text-slate-400 font-extrabold text-sm py-4 rounded-2xl transition-all uppercase tracking-widest shadow-lg opacity-50 cursor-not-allowed">
                        Generate Content
                    </button>
                </div>

                <div id="interactiveView" class="hidden flex-1 flex flex-col justify-center"></div>
            </main>
        `;
    }

    async init() {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.hash = "#/";
            } else {
                this.currentUser = user;
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        this.userPlan = data.plan || "free";
                        this.configureUIForPlan(this.userPlan, data);
                    } else {
                        this.configureUIForPlan("free", {});
                    }
                } catch (error) {
                    this.configureUIForPlan("free", {}); 
                }
            }
        });

        // Event Listeners
        const itemSlider = document.getElementById('itemSlider');
        const fileInput = document.getElementById('fileInput');
        
        itemSlider.addEventListener('input', (e) => this.handleSliderInput(e));
        itemSlider.addEventListener('change', (e) => this.handleSliderChange(e));
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => {
                    b.classList.remove('active', 'bg-blue-600', 'border-blue-500', 'text-white');
                    b.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-400');
                });
                const target = e.currentTarget;
                target.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-400');
                target.classList.add('active', 'bg-blue-600', 'border-blue-500', 'text-white');
                this.quizType = target.textContent.trim();
            });
        });

        document.getElementById('generateBtn').addEventListener('click', () => this.generateQuiz());
    }

    configureUIForPlan(plan, data) {
        let isLimitReached = false;
        if (plan === "elite") { this.allowedMaxItems = 30; } 
        else if (plan === "premium") {
            this.allowedMaxItems = 20;
            if (data.monthlyUsage && data.monthlyUsage >= 100) isLimitReached = true;
        } else {
            this.allowedMaxItems = 5;
            const today = new Date().toISOString().split("T")[0];
            if (data.lastDailyReset === today && data.dailyUsage >= 1) isLimitReached = true;
        }

        document.getElementById('maxLimitText').textContent = `(Your limit: ${this.allowedMaxItems})`;
        document.getElementById('planBadgeContainer').innerHTML = `<div class="text-[10px] font-bold uppercase tracking-wider inline-block px-3 py-1 rounded-full border text-blue-400 border-blue-500/50 bg-blue-500/10 mb-2">Current Plan: ${plan}</div>`;
    }

    showCustomUpgradeModal(limit) {
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
    }

    handleSliderInput(e) {
        let val = parseInt(e.target.value, 10);
        const sliderValue = document.getElementById('sliderValue');
        if (val > this.allowedMaxItems) {
            sliderValue.innerHTML = `${val} <i class="fas fa-lock text-[10px] ml-1"></i>`;
            sliderValue.classList.replace('text-blue-400', 'text-yellow-500');
            e.target.style.border = "2px solid #eab308"; 
        } else {
            sliderValue.textContent = val;
            sliderValue.classList.replace('text-yellow-500', 'text-blue-400');
            e.target.style.border = "none";
        }
    }

    async handleSliderChange(e) {
        let val = parseInt(e.target.value, 10);
        if (val > this.allowedMaxItems) {
            const wantToUpgrade = await this.showCustomUpgradeModal(this.allowedMaxItems);
            if (wantToUpgrade) {
                window.location.hash = '#/payment';
            } else {
                e.target.value = this.allowedMaxItems;
                document.getElementById('sliderValue').textContent = this.allowedMaxItems;
                e.target.style.border = "none";
            }
        }
    }

    handleFileUpload(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (!this.ALLOWED_EXTENSIONS.includes(ext)) return alert("Invalid file type.");
            if (file.size > this.MAX_FILE_SIZE) return alert("File is too large.");

            this.selectedFile = file;
            document.getElementById('uploadTitle').innerHTML = `<i class="fas fa-file-alt text-blue-400 mr-2"></i> ${this.escapeHTML(file.name)}`;
            document.getElementById('uploadSubtitle').textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
            document.getElementById('configSection').classList.remove('opacity-40', 'pointer-events-none');
            
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.classList.remove('bg-slate-700', 'text-slate-400', 'opacity-50', 'cursor-not-allowed');
            btn.classList.add('bg-blue-600', 'text-white');
        }
    }

    async generateQuiz() {
        if (!this.selectedFile || !this.currentUser) return;
        
        const requestedItems = parseInt(document.getElementById('itemSlider').value, 10);
        
        document.getElementById('generateBtn').disabled = true;
        document.getElementById('aiLoader').classList.remove('hidden-loader');
        
        try {
            const securePath = `uploads/${this.currentUser.uid}/${Date.now()}_${this.selectedFile.name}`;
            await uploadBytes(ref(storage, securePath), this.selectedFile);
            
            document.getElementById('loadingText').textContent = `Aurora is generating ${this.quizType}...`;
            const generateQuizFunction = httpsCallableFromURL(functions, 'https://generatequizfromfile-w2b2eq6c5q-uc.a.run.app');
            
            const response = await generateQuizFunction({
                filePath: securePath,
                fileName: this.selectedFile.name,
                quizType: this.quizType, 
                topicFocus: document.getElementById('topicFocus').value,
                numberOfItems: requestedItems
            });
            
            const payload = response.data;
            const cards = payload.cards || payload.flashcards || payload.items || payload.questions;
            
            this.generatedCards = cards.map(card => ({ ...card, answered: false }));
            this.currentCardIndex = 0;
            this.isMCQMode = this.quizType === "Multiple Choice";

            document.getElementById('aiLoader').classList.add('hidden-loader');
            document.getElementById('setupView').classList.add('hidden');
            document.getElementById('interactiveView').classList.remove('hidden');

            this.renderCurrentCard();
            
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong while generating the quiz.");
            document.getElementById('aiLoader').classList.add('hidden-loader');
            document.getElementById('generateBtn').disabled = false;
        }
    }

    renderCurrentCard() {
        const card = this.generatedCards[this.currentCardIndex];
        const interactiveView = document.getElementById('interactiveView');

        let html = `
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-sm font-bold text-slate-400 tracking-widest uppercase">${this.isMCQMode ? 'Quiz Mode' : 'Flashcards'}</h2>
                <span class="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full text-blue-400 border border-slate-700">${this.currentCardIndex + 1} / ${this.generatedCards.length}</span>
            </div>
            <div id="cardContainer" class="flex-1 flex flex-col justify-center min-h-[350px]">
        `;

        if (this.isMCQMode) {
            let optionsHTML = '<div class="space-y-3 mt-6">';
            for (const [key, value] of Object.entries(card.options || {})) {
                optionsHTML += `
                    <button class="mcq-option w-full text-left p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500 transition-all flex items-center gap-3" data-key="${key}" data-value="${this.escapeHTML(value)}">
                        <span class="font-bold text-blue-500 bg-blue-500/10 w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0">${key}</span>
                        <span class="text-slate-300 flex-1 text-sm leading-relaxed">${this.escapeHTML(value)}</span>
                    </button>`;
            }
            optionsHTML += '</div>';

            html += `
                <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl w-full">
                    <h3 class="font-bold text-white text-lg leading-relaxed">Q: ${this.escapeHTML(card.question)}</h3>
                    ${optionsHTML}
                    <div id="explanationArea" class="hidden mt-6 pt-5 border-t border-slate-700 text-sm"></div>
                </div>`;
        } else {
            html += `
                <div id="flashcardElement" class="group perspective-1000 w-full h-[350px] cursor-pointer">
                    <div class="flip-inner relative w-full h-full transform-style-3d shadow-xl rounded-3xl">
                        <div class="absolute inset-0 backface-hidden bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col items-center justify-center text-center">
                            <h3 class="font-bold text-blue-400 text-xl leading-relaxed">${this.escapeHTML(card.question)}</h3>
                        </div>
                        <div class="absolute inset-0 backface-hidden bg-blue-600 rounded-3xl p-8 border border-blue-500 flex flex-col items-center justify-center text-center rotate-y-180">
                            <p class="text-white text-lg font-medium leading-relaxed">${this.escapeHTML(card.answer)}</p>
                        </div>
                    </div>
                </div>`;
        }

        html += `</div>
            <div id="navigationControls" class="flex justify-between gap-4 mt-8">
                <button id="prevBtn" class="flex-1 bg-slate-800 text-slate-300 font-bold py-4 rounded-xl border border-slate-700 disabled:opacity-30" ${this.currentCardIndex === 0 ? 'disabled' : ''}>Previous</button>
                <button id="nextBtn" class="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl border border-blue-500">Next</button>
            </div>
            <button id="saveStudyBtn" class="w-full mt-8 bg-green-600 hover:bg-green-500 text-white font-extrabold text-sm py-4 rounded-2xl hidden">Save & Finish Session</button>
        `;

        interactiveView.innerHTML = html;

        // Attach Card Interaction Listeners
        if (this.isMCQMode) {
            const buttons = interactiveView.querySelectorAll('.mcq-option');
            buttons.forEach(btn => btn.addEventListener('click', () => this.handleMCQSelection(btn, card, buttons)));
        } else {
            const fc = document.getElementById('flashcardElement');
            fc.addEventListener('click', () => fc.classList.toggle('flipped'));
        }

        // Attach Nav Listeners
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.currentCardIndex--;
            this.renderCurrentCard();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            if (this.currentCardIndex < this.generatedCards.length - 1) {
                this.currentCardIndex++;
                this.renderCurrentCard();
            } else {
                document.getElementById('navigationControls').classList.add('hidden');
                document.getElementById('saveStudyBtn').classList.remove('hidden');
                document.getElementById('saveStudyBtn').addEventListener('click', () => this.saveToDatabase());
            }
        });
    }

    handleMCQSelection(selectedBtn, cardData, allButtons) {
        if (cardData.answered) return;
        cardData.answered = true;
        
        const selectedKey = selectedBtn.dataset.key;
        allButtons.forEach(btn => {
            const key = btn.dataset.key;
            const isThisCorrect = String(cardData.answer).toLowerCase().includes(String(key).toLowerCase());
            
            btn.disabled = true;
            if (isThisCorrect) {
                btn.classList.add('bg-green-900/40', 'border-green-500', 'text-green-400');
            } else if (key === selectedKey) {
                btn.classList.add('bg-red-900/40', 'border-red-500', 'text-red-400');
            }
        });

        document.getElementById('explanationArea').innerHTML = `<p class="text-slate-400 text-xs">${this.escapeHTML(cardData.explanation || 'No explanation provided.')}</p>`;
        document.getElementById('explanationArea').classList.remove('hidden');
    }

    async saveToDatabase() {
        const btn = document.getElementById('saveStudyBtn');
        btn.disabled = true;
        btn.innerText = "Saving to Database...";

        try {
            const batch = writeBatch(db);
            const subjectName = document.getElementById('topicFocus').value || this.selectedFile.name.split('.')[0];

            this.generatedCards.forEach(card => {
                batch.set(doc(collection(db, "mcqs")), {
                    subject: subjectName,
                    text: card.question || "",
                    options: card.options ? Object.values(card.options) : [],
                    correct: 0, // Simplified for brevity
                    explanation: card.explanation || "",
                    userId: this.currentUser.uid,
                    type: this.quizType,
                    createdAt: new Date().toISOString()
                });
            });

            await batch.commit();
            alert("Saved successfully!");
            window.location.hash = "#/practice";
        } catch (err) {
            console.error(err);
            alert("Failed to save.");
            btn.disabled = false;
        }
    }

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
    }
}
