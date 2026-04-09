import { auth, db } from '../firebase.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const LeaderboardView = {
    render: () => {
        return `
            <header class="pt-6 pb-4 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-[var(--bg-body)]">
                <div>
                    <h1 class="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">Leaderboard</h1>
                </div>
            </header>
            <main class="flex-1 overflow-y-auto px-4 pt-4 hide-scroll">
                <div id="leaderboardList" class="flex flex-col gap-2">
                    <div class="text-center text-[var(--text-muted)] py-6 text-sm">Loading ranks...</div>
                </div>
            </main>
        `;
    },
    mount: async () => {
        const listContainer = document.getElementById('leaderboardList');
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            listContainer.innerHTML = '<div class="text-center text-[var(--text-muted)] py-6 text-sm">Please log in to view the leaderboard.</div>';
            return;
        }
        try {
            const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(50));
            const querySnapshot = await getDocs(q);
            listContainer.innerHTML = '';
            
            let rank = 1;
            querySnapshot.forEach((document) => {
                const data = document.data();
                if (data.xp > 0) {
                    const bgClass = document.id === currentUser.uid ? "bg-[var(--accent-btn)]/10 border-[var(--accent-btn)]" : "bg-[var(--bg-surface)] border-[var(--border-color)]";
                    const initial = (data.displayName || "U").charAt(0).toUpperCase();
                    listContainer.innerHTML += `
                        <div class="flex items-center justify-between p-3 rounded-xl border ${bgClass}">
                            <div class="flex items-center gap-4">
                                <span class="text-sm font-bold text-[var(--text-muted)] w-4 text-center">${rank}</span>
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-body)] border border-[var(--border-color)] flex items-center justify-center font-bold">${initial}</div>
                                <h4 class="text-sm font-bold text-[var(--text-main)]">${data.displayName || "Anonymous"}</h4>
                            </div>
                            <span class="text-xs font-bold text-[var(--text-muted)]">${data.xp.toLocaleString()} XP</span>
                        </div>`;
                    rank++;
                }
            });
        } catch (e) { listContainer.innerHTML = '<div class="text-center text-red-500 py-6 text-sm">Failed to load leaderboard.</div>'; }
    }
};