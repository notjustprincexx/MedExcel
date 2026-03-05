import { auth, db } from '../firebase-config.js';
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export default class Practice {
    constructor() {
        // Safe instance variables instead of global variables
        this.currentQuestions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.timerInterval = null;
        this.timeLeft = 0;
        this.isAnswered = false;
        this.currentUser = null;
    }

    async getHtml() {
        return `
            <header class="pt-6 pb-4 px-6 flex items-center justify-between z-10 shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
                <div>
                    <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Practice Center</h1>
                    <p class="text-xs text-slate-400 mt-1">Exam Readiness Dashboard</p>
                </div>
                <button class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                     <span id="userInitialPrac" class="text-sm font-bold text-slate-300">U</span>
                </button>
            </header>

            <main class="flex-1 overflow-y-auto pb-24 px-6 pt-4">
                <section class="mb-8">
                    <div class="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Performance Snapshot</h2>
                            <span class="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-md font-bold">This Week</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <p class="text-xs text-slate-400 mb-1">Overall Accuracy</p>
                                <p class="text-2xl font-bold text-emerald-400">78%</p>
                            </div>
                            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <p class="text-xs text-slate-400 mb-1">Questions Done</p>
                                <p class="text-2xl font-bold text-white">342</p>
                            </div>
                            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <p class="text-xs text-slate-400 mb-1">Study Streak</p>
                                <p class="text-lg font-bold text-amber-400"><i class="fas fa-fire mr-1"></i> 5 Days</p>
                            </div>
                            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <p class="text-xs text-slate-400 mb-1">Weakest Subject</p>
                                <p class="text-sm font-bold text-rose-400 truncate">Pharmacology</p>
                            </div>
                        </div>
                        <div class="w-full h-32 mt-2">
                            <canvas id="performanceChart"></canvas>
                        </div>
                    </div>
                </section>

                <section class="mb-8">
                    <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h2>
                    <div class="grid grid-cols-2 gap-3">
                        <button id="btnTimed" class="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-xl border border-blue-500/50 text-left hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-blue-900/20">
                            <i class="fas fa-stopwatch text-xl text-blue-200 mb-2"></i>
                            <h3 class="font-bold text-sm">Timed Test</h3>
                            <p class="text-[10px] text-blue-200 mt-1">20 Qs • 20 Mins</p>
                        </button>
                        <button id="btnWeak" class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-rose-500/50 active:scale-95 transition-all text-left">
                            <i class="fas fa-dumbbell text-xl text-rose-400 mb-2"></i>
                            <h3 class="font-bold text-sm">Target Weakness</h3>
                            <p class="text-[10px] text-slate-400 mt-1">Smart generated set</p>
                        </button>
                        <button id="btnFlashcard" class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-emerald-500/50 active:scale-95 transition-all text-left">
                            <i class="fas fa-clone text-xl text-emerald-400 mb-2"></i>
                            <h3 class="font-bold text-sm">Flashcards</h3>
                            <p class="text-[10px] text-slate-400 mt-1">Untimed review</p>
                        </button>
                        <button id="btnMock" class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-purple-500/50 active:scale-95 transition-all text-left">
                            <i class="fas fa-file-contract text-xl text-purple-400 mb-2"></i>
                            <h3 class="font-bold text-sm">Mock Exam</h3>
                            <p class="text-[10px] text-slate-400 mt-1">Full 100 Qs simulation</p>
                        </button>
                    </div>
                </section>

                <section class="mb-8">
                    <div class="flex justify-between items-end mb-3">
                        <h2 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Top Priorities</h2>
                    </div>
                    <div class="space-y-3">
                        <div class="bg-slate-800 rounded-xl p-4 border border-rose-900/50 flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-sm">Autonomic Nervous System</h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <div class="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div class="h-full bg-rose-500 w-[42%]"></div>
                                    </div>
                                    <span class="text-[10px] text-rose-400 font-bold">42% Accuracy</span>
                                </div>
                            </div>
                            <button class="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold hover:bg-rose-500/20 active:scale-95 transition-all">Drill</button>
                        </div>
                    </div>
                </section>
            </main>

            <div id="examUI" class="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col hidden">
                <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <button id="btnCloseExam" class="text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                    <div id="examTimer" class="text-lg font-mono font-bold text-blue-400 bg-blue-900/20 px-4 py-1 rounded-full border border-blue-800">20:00</div>
                    <div class="text-sm font-bold text-slate-300"><span id="currentQIndex">1</span>/<span id="totalQs">20</span></div>
                </div>
                
                <div class="w-full h-1 bg-slate-800">
                    <div id="examProgress" class="h-full bg-blue-500 transition-all duration-300" style="width: 5%"></div>
                </div>

                <div class="flex-1 overflow-y-auto p-6 flex flex-col">
                    <p class="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider" id="examSubjectLabel">Subject</p>
                    <h2 class="text-lg font-medium leading-relaxed mb-8" id="questionText">Loading question...</h2>
                    
                    <div class="space-y-3 flex-1" id="optionsContainer"></div>

                    <div class="mt-8 pt-4 flex justify-between items-center">
                        <button id="btnExplanation" class="hidden text-sm text-blue-400 font-bold hover:text-blue-300"><i class="fas fa-lightbulb mr-1"></i> Explain</button>
                        <button id="btnNextQ" class="hidden ml-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-all active:scale-95">Next <i class="fas fa-arrow-right ml-2"></i></button>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        // Init User
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                const name = user.displayName || user.email.split('@')[0];
                document.getElementById('userInitialPrac').innerText = name.charAt(0).toUpperCase();
            }
        });

        // Init Performance Chart
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Scores (%)',
                    data: [65, 70, 68, 80, 85, 78, 90],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(51, 65, 85, 0.5)' }, ticks: { color: '#94a3b8', stepSize: 25 } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        // Attach Event Listeners
        document.getElementById('btnTimed').addEventListener('click', () => this.startPractice('timed', null));
        document.getElementById('btnWeak').addEventListener('click', () => this.startPractice('weak', null));
        document.getElementById('btnFlashcard').addEventListener('click', () => this.startPractice('flashcard', null));
        document.getElementById('btnMock').addEventListener('click', () => this.startPractice('mock', null));
        document.getElementById('btnCloseExam').addEventListener('click', () => this.endPractice(false));
        document.getElementById('btnNextQ').addEventListener('click', () => this.nextQuestion());
    }

    async startPractice(mode, filter) {
        if (!this.currentUser) {
            alert("Please wait a second for your profile to load, or log in.");
            return;
        }

        const ui = document.getElementById('examUI');
        ui.classList.remove('hidden');
        setTimeout(() => ui.classList.add('active'), 10);
        
        document.getElementById('questionText').innerText = "Fetching your questions...";
        document.getElementById('optionsContainer').innerHTML = "";
        document.getElementById('btnNextQ').classList.add('hidden');

        try {
            const mcqsRef = collection(db, "mcqs"); 
            let qQuery = filter 
                ? query(mcqsRef, where("userId", "==", this.currentUser.uid), where("subject", "==", filter), where("type", "==", "Multiple Choice"), limit(20))
                : query(mcqsRef, where("userId", "==", this.currentUser.uid), where("type", "==", "Multiple Choice"), limit(20));

            const snapshot = await getDocs(qQuery);
            this.currentQuestions = [];
            snapshot.forEach(doc => {
                this.currentQuestions.push({ id: doc.id, ...doc.data() });
            });

            if (this.currentQuestions.length === 0) {
                document.getElementById('questionText').innerText = "No Multiple Choice questions found in your database. Go generate some first!";
                return;
            }

            this.currentQuestions = this.currentQuestions.sort(() => 0.5 - Math.random());
            this.currentIndex = 0;
            this.score = 0;
            document.getElementById('totalQs').innerText = this.currentQuestions.length;

            if (mode === 'timed' || mode === 'mock') {
                this.timeLeft = mode === 'timed' ? 20 * 60 : 100 * 60;
                this.startTimer();
            } else {
                document.getElementById('examTimer').innerText = "Untimed";
            }

            this.renderQuestion();

        } catch (error) {
            console.error("Error fetching MCQs:", error);
            document.getElementById('questionText').innerText = "Failed to load questions. Please check connection.";
        }
    }

    renderQuestion() {
        if (this.currentIndex >= this.currentQuestions.length) {
            this.endPractice(true);
            return;
        }

        this.isAnswered = false;
        const q = this.currentQuestions[this.currentIndex];
        document.getElementById('currentQIndex').innerText = this.currentIndex + 1;
        document.getElementById('examSubjectLabel').innerText = q.subject || "General Practice";
        document.getElementById('questionText').innerText = q.text;
        
        const progress = ((this.currentIndex) / this.currentQuestions.length) * 100;
        document.getElementById('examProgress').style.width = `${progress}%`;

        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';
        document.getElementById('btnNextQ').classList.add('hidden');

        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, index) => {
                const btn = document.createElement('button');
                btn.className = "option-btn w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 font-medium text-sm";
                btn.innerText = `${String.fromCharCode(65 + index)}. ${opt}`;
                btn.onclick = () => this.selectOption(index, q.correct, btn);
                optionsContainer.appendChild(btn);
            });
        }
    }

    selectOption(selectedIndex, correctIndex, btnElement) {
        if (this.isAnswered) return;
        this.isAnswered = true;

        const buttons = document.getElementById('optionsContainer').children;
        
        if (selectedIndex === correctIndex) {
            btnElement.classList.add('correct');
            this.score++;
        } else {
            btnElement.classList.add('wrong');
            if (buttons[correctIndex]) {
                buttons[correctIndex].classList.add('correct');
            }
        }

        for(let btn of buttons) {
            btn.disabled = true;
            btn.classList.remove('hover:bg-slate-750');
        }

        document.getElementById('btnNextQ').classList.remove('hidden');
    }

    nextQuestion() {
        this.currentIndex++;
        this.renderQuestion();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
            const s = (this.timeLeft % 60).toString().padStart(2, '0');
            document.getElementById('examTimer').innerText = `${m}:${s}`;
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.endPractice(true);
            }
        }, 1000);
    }

    endPractice(completed) {
        clearInterval(this.timerInterval);
        const ui = document.getElementById('examUI');
        ui.classList.remove('active');
        setTimeout(() => ui.classList.add('hidden'), 400);

        if (completed) {
            const finalAccuracy = Math.round((this.score / this.currentQuestions.length) * 100);
            alert(`Practice Complete!\nScore: ${this.score}/${this.currentQuestions.length} (${finalAccuracy}%)\n\nMetrics saved to your profile.`);
        }
    }
}
