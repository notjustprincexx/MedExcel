import { auth } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export default class Home {
    async getHtml() {
        return `
            <header class="pt-6 pb-2 px-6 flex items-center justify-between z-10 gap-3">
                <div id="searchBar" class="flex-1 bg-slate-800 rounded-full flex items-center px-4 py-3 border border-slate-700 shadow-sm transition-all duration-300">
                    <i class="fas fa-search text-slate-400 mr-2"></i>
                    <input type="text" placeholder="Search decks..." class="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-500">
                </div>

                <button onclick="window.location.hash='#/payment'" class="flex items-center justify-center gap-1 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 hover:from-yellow-600/40 hover:to-yellow-500/40 border border-yellow-500/50 text-yellow-500 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(234,179,8,0.1)] active:scale-95 shrink-0">
                    <i class="fas fa-crown text-[10px]"></i>
                    <span class="hidden sm:inline">Upgrade</span>
                </button>

                <button id="profileBtn" class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center shrink-0">
                     <img id="userAvatar" src="" alt="Profile" class="w-full h-full object-cover hidden">
                     <span id="userInitial" class="text-sm font-bold text-slate-300 hidden">?</span>
                </button>
            </header>

            <main class="flex-1 overflow-y-auto pb-24 px-6">
                
                <div class="mt-6 mb-6">
                    <h1 class="text-2xl font-bold">Recents</h1>
                </div>

                <div class="bg-slate-800 rounded-2xl p-4 flex items-center gap-4 border border-slate-700/50 mb-8 hover:bg-slate-750 transition-colors cursor-pointer active:scale-98">
                    <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <i class="fas fa-layer-group text-xl"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base">Pharmacology Nursing</h3>
                        <p class="text-slate-400 text-xs">869 cards • by kayde310</p>
                    </div>
                </div>

                <div class="mb-6">
                    <h2 class="text-lg font-bold mb-3">Create New</h2>
                    
                    <a href="#/create" id="createCard" class="block bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 relative overflow-hidden shadow-xl transition-all duration-300 active:scale-98 cursor-pointer">
                        <div class="absolute -right-6 -top-6 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl"></div>
                        
                        <div class="relative z-10">
                            <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
                                <i class="fas fa-robot text-white text-xl"></i>
                            </div>
                            
                            <h3 class="text-xl font-bold mb-2 text-white">Generate with AI</h3>
                            <p class="text-slate-400 text-sm mb-6 leading-relaxed">
                                Upload your notes and let MedExcel create your flashcards instantly.
                            </p>
                            
                            <div class="w-full">
                                <button class="w-full bg-slate-700 hover:bg-slate-600 text-blue-300 font-bold py-3 rounded-xl text-sm transition-colors border border-slate-600">
                                    Create Set
                                </button>
                            </div>
                        </div>
                    </a>
                </div>

                <div class="mb-4">
                    <div class="flex justify-between items-end mb-4">
                        <h2 class="text-lg font-bold">Topics</h2>
                        <button class="text-blue-400 text-xs font-bold uppercase tracking-wider">View All</button>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        <a href="#/topics/anatomy" class="block min-h-[96px] bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
                            <div class="h-14 bg-emerald-500/10 rounded-xl mb-3 flex items-center justify-center">
                                <i class="fas fa-bone text-2xl text-emerald-300"></i>
                            </div>
                            <h4 class="font-bold text-sm mb-1">Anatomy</h4>
                            <p class="text-xs text-slate-500">Explore structural systems</p>
                        </a>

                        <a href="#/topics/human-physiology" class="block min-h-[96px] bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
                            <div class="h-14 bg-cyan-500/10 rounded-xl mb-3 flex items-center justify-center">
                                <i class="fas fa-heart-pulse text-2xl text-cyan-300"></i>
                            </div>
                            <h4 class="font-bold text-sm mb-1">Human Physiology</h4>
                            <p class="text-xs text-slate-500">Function & regulation</p>
                        </a>

                        <a href="#/topics/medical-biochemistry" class="block min-h-[96px] bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
                            <div class="h-14 bg-yellow-500/10 rounded-xl mb-3 flex items-center justify-center">
                                <i class="fas fa-flask-vial text-2xl text-yellow-300"></i>
                            </div>
                            <h4 class="font-bold text-sm mb-1">Medical Biochemistry</h4>
                            <p class="text-xs text-slate-500">Metabolism & pathways</p>
                        </a>

                        <a href="#/topics/pharmacology" class="block min-h-[96px] bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors">
                            <div class="h-14 bg-indigo-500/10 rounded-xl mb-3 flex items-center justify-center">
                                <i class="fas fa-pills text-2xl text-indigo-300"></i>
                            </div>
                            <h4 class="font-bold text-sm mb-1">Pharmacology</h4>
                            <p class="text-xs text-slate-500">Drugs & mechanisms</p>
                        </a>
                    </div>
                </div>
            </main>
        `;
    }

    async init() {
        const skip = localStorage.getItem("skip") === "true";

        onAuthStateChanged(auth, (user) => {
            if (user) {
                const name = user.displayName || user.email.split('@')[0];
                this.updateHeaderUI(name, user.photoURL);
            } else if (skip) {
                this.updateHeaderUI("Guest", null);
            } else {
                window.location.hash = '#/login';
            }
        });

        document.getElementById('profileBtn').addEventListener('click', async () => {
            const isGuest = localStorage.getItem("skip") === "true";
            const msg = isGuest ? "Return to login screen to create an account." : "Are you sure you want to sign out?";
            
            if (confirm(msg)) {
                if (!isGuest) {
                    try { await signOut(auth); } catch(e) { console.error(e); }
                }
                localStorage.removeItem("skip");
                window.location.hash = '#/login';
            }
        });
    }

    updateHeaderUI(name, photoURL) {
        const avatarImg = document.getElementById('userAvatar');
        const initialSpan = document.getElementById('userInitial');
        
        if(photoURL) {
            avatarImg.src = photoURL;
            avatarImg.classList.remove('hidden');
            initialSpan.classList.add('hidden');
        } else {
            avatarImg.classList.add('hidden');
            initialSpan.textContent = name.charAt(0).toUpperCase();
            initialSpan.classList.remove('hidden');
        }
    }
}
