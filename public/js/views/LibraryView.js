// js/views/LibraryView.js
import { auth, db } from '../app.js';
import { collection, query, where, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const LibraryView = {
    render: async () => {
        return `
            <header class="pt-6 pb-4 px-6 flex items-center justify-between z-10 shrink-0 bg-[#050814]/90 backdrop-blur-md sticky top-0 border-b border-white/5">
                <div>
                    <h1 class="text-2xl font-bold text-white">My Library</h1>
                    <p class="text-xs text-blue-400 font-bold tracking-wider uppercase mt-1">Intelligence Dashboard</p>
                </div>
                <button class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                     <span id="userInitialLib" class="text-sm font-bold text-slate-300">U</span>
                </button>
            </header>

            <main class="flex-1 overflow-y-auto pb-28 px-4 sm:px-6 pt-6 space-y-8">
                <div id="skeletonLoader" class="space-y-8">
                    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 animate-pulse">
                        <div class="w-1/3 h-4 bg-slate-700 rounded mb-4"></div>
                        <div class="grid grid-cols-2 gap-4"><div class="h-16 bg-slate-700 rounded-xl"></div><div class="h-16 bg-slate-700 rounded-xl"></div></div>
                        <div class="h-32 bg-slate-700 rounded-xl mt-4"></div>
                    </div>
                </div>

                <div id="dashboardContent" class="hidden space-y-8">
                    <section>
                        <div class="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
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
    },

    afterRender: async () => {
        if (!window.currentUser) {
            window.location.hash = "#/";
            return;
        }

        const name = window.currentUser.displayName || window.currentUser.email.split('@')[0];
        document.getElementById('userInitialLib').innerText = name.charAt(0).toUpperCase();

        const renderSets = (sets) => {
            const allContainer = document.getElementById('allSetsContainer');
            allContainer.innerHTML = '';

            if(sets.length === 0) {
                allContainer.innerHTML = `<div class="text-center p-8 text-slate-500 text-sm">No sets generated yet. Go to Create to get started!</div>`;
                return;
            }

            sets.sort((a, b) => new Date(b.date) - new Date(a.date));

            sets.forEach(set => {
                const dateStr = set.date ? new Date(set.date).toLocaleDateString() : 'Unknown Date';
                const card = document.createElement('div');
                card.className = "bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 transition-all hover:border-slate-600";
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="font-bold text-white text-base">${set.subject}</h3>
                            <p class="text-[10px] text-slate-400 mt-0.5">Created ${dateStr}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs font-medium text-slate-300 mb-4 bg-slate-900/40 p-2 rounded-lg inline-flex border border-slate-800">
                        <span><i class="fas fa-list-ul text-blue-400 mr-1"></i> ${set.mcqCount} MCQs</span>
                        <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span><i class="fas fa-clone text-emerald-400 mr-1"></i> ${set.fcCount} Cards</span>
                    </div>
                    <div class="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                        <button class="flex-1 text-center bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold py-2 rounded-xl text-xs transition-colors"><i class="fas fa-play mr-1"></i> Practice</button>
                        <button class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-rose-900/40 rounded-xl text-rose-400 transition-colors delete-btn" data-subject="${set.subject}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                allContainer.appendChild(card);
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const subj = e.currentTarget.getAttribute('data-subject');
                    if(confirm(`Delete all questions for "${subj}"?`)) {
                        try {
                            const targetSet = sets.find(s => s.subject === subj);
                            const batch = writeBatch(db);
                            targetSet.docIds.forEach(id => batch.delete(doc(db, "mcqs", id)));
                            await batch.commit();
                            LibraryView.afterRender(); // Reload UI
                        } catch(err) { alert("Failed to delete"); }
                    }
                });
            });
        };

        try {
            const q = query(collection(db, "mcqs"), where("userId", "==", window.currentUser.uid));
            const snap = await getDocs(q);
            
            let totalMCQs = 0, totalFCs = 0;
            const setsMap = new Map();

            snap.forEach(docSnap => {
                const data = docSnap.data();
                const subj = data.subject || "General Study";
                const type = data.type || "Multiple Choice";
                
                if (type.includes("Multiple")) totalMCQs++; else totalFCs++;
                if (!setsMap.has(subj)) setsMap.set(subj, { subject: subj, mcqCount: 0, fcCount: 0, date: data.createdAt, docIds: [] });
                
                const setObj = setsMap.get(subj);
                if (type.includes("Multiple")) setObj.mcqCount++; else setObj.fcCount++;
                setObj.docIds.push(docSnap.id);
            });

            document.getElementById('totalMcqsCount').innerText = totalMCQs;
            document.getElementById('totalFcCount').innerText = totalFCs;
            document.getElementById('totalSetsText').innerText = `${setsMap.size} Sets`;

            renderSets(Array.from(setsMap.values()));

            document.getElementById('skeletonLoader').classList.add('hidden');
            document.getElementById('dashboardContent').classList.remove('hidden');
        } catch (err) {
            console.error("Library fetch error:", err);
        }
    }
};