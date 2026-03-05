import { auth, db } from '../firebase-config.js';
import { collection, query, where, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export default class Library {
    async getHtml() {
        return `
            <header class="pt-6 pb-4 px-6 flex items-center justify-between z-10 shrink-0 bg-[#0f172a]/90 backdrop-blur-md sticky top-0">
                <div>
                    <h1 class="text-2xl font-bold text-white">My Library</h1>
                    <p class="text-xs text-blue-400 font-bold tracking-wider uppercase mt-1">Intelligence Dashboard</p>
                </div>
                <button id="profileBtnLib" class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                     <span id="userInitialLib" class="text-sm font-bold text-slate-300">U</span>
                </button>
            </header>

            <main class="flex-1 overflow-y-auto pb-28 px-4 sm:px-6 pt-2 space-y-8">
                <div id="skeletonLoader" class="skeleton-loader space-y-8">
                    <div class="glass-card rounded-2xl p-5">
                        <div class="w-1/3 h-4 sk-block rounded mb-4"></div>
                        <div class="grid grid-cols-2 gap-4"><div class="h-16 sk-block rounded-xl"></div><div class="h-16 sk-block rounded-xl"></div></div>
                        <div class="h-32 sk-block rounded-xl mt-4"></div>
                    </div>
                    <div class="glass-card rounded-2xl p-5 h-40"></div>
                </div>

                <div id="dashboardContent" class="hidden space-y-8">
                    <section>
                        <div class="glass-card rounded-2xl p-5 shadow-lg shadow-black/20">
                            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i class="fas fa-chart-pie text-blue-500"></i> Global Overview
                            </h2>
                            <div class="grid grid-cols-2 gap-3 mb-5">
                                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Total MCQs</p>
                                    <p class="text-2xl font-black text-white" id="totalMcqsCount">0</p>
                                </div>
                                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Flashcards</p>
                                    <p class="text-2xl font-black text-blue-400" id="totalFcCount">0</p>
                                </div>
                                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Avg Accuracy</p>
                                    <p class="text-2xl font-black text-emerald-400">68%</p>
                                </div>
                                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Hours Studied</p>
                                    <p class="text-2xl font-black text-purple-400">12.5</p>
                                </div>
                            </div>
                            <div class="w-full h-32">
                                <canvas id="weeklyChart"></canvas>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div class="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden">
                            <div class="absolute -right-4 -top-4 text-rose-500/10 text-7xl"><i class="fas fa-brain"></i></div>
                            <div class="relative z-10">
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                                        <i class="fas fa-exclamation-triangle text-xs"></i>
                                    </div>
                                    <h2 class="font-bold text-white">Targeted Weaknesses</h2>
                                </div>
                                <p class="text-xs text-rose-200/70 mb-4 pr-12">The AI has gathered questions you struggled with into a dedicated review set.</p>
                                <a href="#/practice" class="block text-center w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-rose-900/50 active:scale-95">
                                    Practice Weak Collection
                                </a>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Jump Back In</h2>
                        <div class="flex overflow-x-auto gap-4 pb-4 snap-x hide-scroll" id="recentSetsContainer"></div>
                    </section>

                    <section>
                        <div class="glass-card rounded-2xl p-5 shadow-lg">
                            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Performance Insights</h2>
                            <div class="space-y-3 mb-6">
                                <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                    <span class="text-xs text-slate-400"><i class="fas fa-arrow-trend-up text-emerald-400 mr-2"></i>Strongest</span>
                                    <span class="text-sm font-bold text-white">Anatomy (88%)</span>
                                </div>
                                <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                    <span class="text-xs text-slate-400"><i class="fas fa-arrow-trend-down text-rose-400 mr-2"></i>Weakest</span>
                                    <span class="text-sm font-bold text-white">Pharmacology (42%)</span>
                                </div>
                                <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                    <span class="text-xs text-slate-400"><i class="fas fa-fire text-amber-400 mr-2"></i>Most Improved</span>
                                    <span class="text-sm font-bold text-white">Biochemistry</span>
                                </div>
                            </div>
                            <div class="w-full h-32">
                                <canvas id="trendChart"></canvas>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div class="flex justify-between items-end mb-4 px-1">
                            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider">My Generated Sets</h2>
                            <span class="text-[10px] text-blue-400 font-bold" id="totalSetsText">0 Sets</span>
                        </div>
                        <div class="space-y-4" id="allSetsContainer"></div>
                    </section>
                </div>
            </main>
        `;
    }

    async init() {
        this.initCharts();

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                alert("Please log in to view your library.");
                window.location.hash = "#/";
                return;
            }

            const name = user.displayName || user.email.split('@')[0];
            document.getElementById('userInitialLib').innerText = name.charAt(0).toUpperCase();

            try {
                const q = query(collection(db, "mcqs"), where("userId", "==", user.uid));
                const snap = await getDocs(q);
                
                let totalMCQs = 0;
                let totalFCs = 0;
                const setsMap = new Map(); 

                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    const subj = data.subject || "General Study";
                    const type = data.type || "Multiple Choice";
                    
                    if (type.includes("Multiple")) totalMCQs++;
                    else totalFCs++;

                    if (!setsMap.has(subj)) {
                        setsMap.set(subj, { subject: subj, mcqCount: 0, fcCount: 0, date: data.createdAt, docIds: [] });
                    }
                    
                    const setObj = setsMap.get(subj);
                    if (type.includes("Multiple")) setObj.mcqCount++;
                    else setObj.fcCount++;
                    
                    setObj.docIds.push(docSnap.id);
                });

                document.getElementById('totalMcqsCount').innerText = totalMCQs;
                document.getElementById('totalFcCount').innerText = totalFCs;
                
                const setsArray = Array.from(setsMap.values());
                document.getElementById('totalSetsText').innerText = `${setsArray.length} Sets`;

                this.renderSets(setsArray);

                document.getElementById('skeletonLoader').classList.add('hidden');
                document.getElementById('dashboardContent').classList.remove('hidden');

            } catch (err) {
                console.error("Library fetch error:", err);
                if(err.message.includes("index")) {
                    alert("Firebase is building a database index. Check your console for the link.");
                }
            }
        });
    }

    initCharts() {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
        
        new Chart(document.getElementById('weeklyChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{
                    label: 'Questions',
                    data: [12, 45, 30, 80, 25, 60, 90],
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barThickness: 12
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, beginAtZero: true },
                    x: { grid: { display: false }, border: {display: false} }
                }
            }
        });

        new Chart(document.getElementById('trendChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: ['W1', 'W2', 'W3', 'W4'],
                datasets: [{
                    label: 'Accuracy %',
                    data: [45, 52, 68, 74],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0f172a',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, min: 0, max: 100 },
                    x: { grid: { display: false }, border: {display: false} }
                }
            }
        });
    }

    renderSets(sets) {
        const recentContainer = document.getElementById('recentSetsContainer');
        const allContainer = document.getElementById('allSetsContainer');
        
        recentContainer.innerHTML = '';
        allContainer.innerHTML = '';

        if(sets.length === 0) {
            allContainer.innerHTML = `<div class="text-center p-8 text-slate-500 text-sm">No sets generated yet. Go to Create to get started!</div>`;
            return;
        }

        sets.sort((a, b) => new Date(b.date) - new Date(a.date));

        sets.slice(0, 3).forEach(set => {
            const randMastery = Math.floor(Math.random() * (95 - 40) + 40);
            recentContainer.innerHTML += `
                <div class="min-w-[240px] snap-center glass-card p-4 rounded-2xl shrink-0 border-l-4 border-l-blue-500">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50 px-2 py-1 rounded">Module</span>
                        <span class="text-xs font-bold ${randMastery > 70 ? 'text-emerald-400' : 'text-amber-400'}">${randMastery}%</span>
                    </div>
                    <h3 class="font-bold text-white text-sm mb-1 truncate">${set.subject}</h3>
                    <p class="text-[10px] text-slate-400 mb-4">${set.mcqCount} MCQs • ${set.fcCount} Flashcards</p>
                    <a href="#/practice" class="block text-center w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-slate-700">Resume</a>
                </div>
            `;
        });

        sets.forEach(set => {
            const dateStr = set.date ? new Date(set.date).toLocaleDateString() : 'Unknown Date';
            const randMastery = Math.floor(Math.random() * (95 - 40) + 40);

            const card = document.createElement('div');
            card.className = "glass-card rounded-2xl p-4 transition-all hover:border-slate-600 group";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-white text-base">${set.subject}</h3>
                        <p class="text-[10px] text-slate-400 mt-0.5">Created ${dateStr}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-bold ${randMastery > 70 ? 'text-emerald-400' : 'text-amber-400'}">${randMastery}% Mastery</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-3 text-xs font-medium text-slate-300 mb-4 bg-slate-900/40 p-2 rounded-lg inline-flex border border-slate-800">
                    <span><i class="fas fa-list-ul text-blue-400 mr-1"></i> ${set.mcqCount} MCQs</span>
                    <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span><i class="fas fa-clone text-emerald-400 mr-1"></i> ${set.fcCount} Cards</span>
                </div>

                <div class="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                    <a href="#/practice" class="flex-1 text-center bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold py-2 rounded-xl text-xs transition-colors"><i class="fas fa-play mr-1"></i> Practice</a>
                    <button class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-amber-400 transition-colors" title="Regenerate Harder"><i class="fas fa-bolt"></i></button>
                    <button class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-rose-900/40 rounded-xl text-rose-400 transition-colors delete-btn" data-subject="${set.subject}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            allContainer.appendChild(card);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const subj = e.currentTarget.getAttribute('data-subject');
                if(confirm(`Are you sure you want to delete all questions for "${subj}"?`)) {
                    await this.deleteSet(subj, sets);
                }
            });
        });
    }

    async deleteSet(subject, allSetsMap) {
        try {
            const targetSet = allSetsMap.find(s => s.subject === subject);
            if(!targetSet) return;

            const batch = writeBatch(db);
            targetSet.docIds.forEach(id => {
                batch.delete(doc(db, "mcqs", id));
            });

            await batch.commit();
            alert(`${subject} deleted successfully.`);
            this.init(); // Refresh data locally
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete set.");
        }
    }
}
