import { auth, db } from '../firebase.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const CreateView = {
    render: () => {
        return `
            <style>
                .create-header { padding: 1.5rem 1.25rem 1rem; position: sticky; top: 0; background: var(--bg-body); z-index: 10; }
                .input-field { width: 100%; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 0.875rem 1rem; color: var(--text-main); font-size: 0.875rem; transition: border-color 0.2s; }
                .input-field:focus { outline: none; border-color: var(--accent-btn); }
                .btn-primary { width: 100%; background: var(--accent-btn); color: var(--btn-text); padding: 1rem; border-radius: 100px; font-weight: 700; text-align: center; cursor: pointer; transition: transform 0.15s; }
                .btn-primary:active { transform: scale(0.98); }
            </style>

            <header class="create-header">
                <h1 class="text-2xl font-bold tracking-tight text-[var(--text-main)]">Create Deck</h1>
            </header>

            <main class="px-5 pb-32 overflow-y-auto">
                <div id="setupView" class="flex flex-col gap-5">
                    <div>
                        <label class="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Deck Title</label>
                        <input type="text" id="deckTitle" placeholder="e.g., Cardiac Action Potential" class="input-field">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Subject</label>
                        <select id="deckSubject" class="input-field">
                            <option value="Physiology">Physiology</option>
                            <option value="Anatomy">Anatomy</option>
                            <option value="Pathology">Pathology</option>
                            <option value="Pharmacology">Pharmacology</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Source Notes (Optional)</label>
                        <textarea id="deckNotes" placeholder="Paste your lecture notes here..." class="input-field min-h-[150px] resize-none"></textarea>
                    </div>

                    <button id="generateBtn" class="btn-primary mt-2 flex items-center justify-center gap-2">
                        <i class="fas fa-magic"></i> Generate Flashcards
                    </button>
                </div>

                <div id="loadingView" class="hidden flex-col items-center justify-center py-16 text-center">
                    <div id="lottieContainer" style="width: 120px; height: 120px; margin-bottom: 1rem;"></div>
                    <h3 class="text-lg font-bold text-[var(--text-main)] mb-2">Synthesizing Notes...</h3>
                    <p class="text-sm text-[var(--text-muted)]">Extracting high-yield concepts.</p>
                </div>

                <div id="successView" class="hidden flex-col items-center justify-center py-16 text-center">
                    <div class="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-3xl mb-4">
                        <i class="fas fa-check"></i>
                    </div>
                    <h3 class="text-lg font-bold text-[var(--text-main)] mb-2">Deck Created</h3>
                    <p class="text-sm text-[var(--text-muted)] mb-6">Your materials have been saved to your Library.</p>
                    <button id="btnStudyNow" class="btn-primary w-auto px-8">Study Now</button>
                </div>
            </main>
        `;
    },
    mount: () => {
        const setupView = document.getElementById('setupView');
        const loadingView = document.getElementById('loadingView');
        const successView = document.getElementById('successView');
        const generateBtn = document.getElementById('generateBtn');
        const btnStudyNow = document.getElementById('btnStudyNow');
        
        let lottieAnim = null;
        
        generateBtn.addEventListener('click', async () => {
            const title = document.getElementById('deckTitle').value.trim() || "Untitled Deck";
            const subject = document.getElementById('deckSubject').value;
            
            // Transition to Loading
            setupView.classList.add('hidden');
            setupView.classList.remove('flex');
            loadingView.classList.remove('hidden');
            loadingView.classList.add('flex');
            
            if (window.lottie) {
                lottieAnim = lottie.loadAnimation({
                    container: document.getElementById('lottieContainer'),
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: 'https://assets3.lottiefiles.com/packages/lf20_xjxcdvce.json' // Generic loading animation
                });
            }
            
            // Simulate Network Request / AI Generation Delay
            setTimeout(async () => {
                const newQuiz = {
                    id: Date.now(),
                    title: title,
                    subject: subject,
                    questions: [
                        { text: "Sample generated question 1", options: ["True", "False"], correct: 0 },
                        { text: "Sample generated question 2", options: ["A", "B", "C", "D"], correct: 2 }
                    ],
                    createdAt: new Date().toISOString()
                };
                
                const uid = auth.currentUser ? auth.currentUser.uid : "guest";
                
                // Save to LocalStorage
                let existingQuizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid)) || [];
                existingQuizzes.push(newQuiz);
                localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(existingQuizzes));
                
                // Save to Firestore (if authenticated)
                if (auth.currentUser) {
                    try {
                        await setDoc(doc(db, "users", uid, "quizzes", newQuiz.id.toString()), newQuiz);
                    } catch (e) {
                        console.error("Failed to save to cloud:", e);
                    }
                }
                
                // Transition to Success
                if (lottieAnim) lottieAnim.destroy();
                loadingView.classList.add('hidden');
                loadingView.classList.remove('flex');
                successView.classList.remove('hidden');
                successView.classList.add('flex');
                
            }, 3000);
        });
        
        btnStudyNow.addEventListener('click', () => {
            window.location.hash = '#/study';
        });
    }
};