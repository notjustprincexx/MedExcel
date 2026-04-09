export const LeaderboardView = {
    render: () => {
        return `
            <header class="pt-6 pb-4 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-[var(--bg-body)] bg-opacity-95 backdrop-blur-md">
                <div>
                    <h1 class="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">Leaderboard</h1>
                    <p class="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Global Rankings</p>
                </div>
                <div class="border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-full flex items-center gap-2">
                    <i class="fas fa-fire text-orange-500"></i>
                    <span class="text-xs font-bold text-[var(--text-main)]" id="currentUserXp">0 XP</span>
                </div>
            </header>

            <main class="flex-1 overflow-y-auto pb-32 px-4 pt-4 hide-scroll">
                <div id="leaderboardList" class="flex flex-col gap-2">
                    <div class="text-center text-[var(--text-muted)] py-6 text-sm">Loading ranks...</div>
                </div>
            </main>
        `;
    },

    mount: async () => {
        // 1. Load Local XP
        let localStats = JSON.parse(localStorage.getItem('medexcel_user_stats'));
        if (localStats && localStats.xp) {
            document.getElementById('currentUserXp').textContent = localStats.xp.toLocaleString() + " XP";
        }

        // 2. Fetch from Global Database Instance
        try {
            const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            
            const usersRef = collection(window.db, "users");
            const q = query(usersRef, orderBy("xp", "desc"), limit(50));
            const querySnapshot = await getDocs(q);
            
            const listContainer = document.getElementById('leaderboardList');
            listContainer.innerHTML = ''; // Clear loading text
            
            let rank = 1;
            const currentUserId = window.currentUser ? window.currentUser.uid : null;

            if (querySnapshot.empty) {
                listContainer.innerHTML = '<div class="text-center text-[var(--text-muted)] py-6 text-sm">No users have earned XP yet!</div>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if(data.xp && data.xp > 0) {
                    const isCurrentUser = doc.id === currentUserId;
                    const bgClass = isCurrentUser ? "bg-[var(--accent-btn)]/10 border-[var(--accent-btn)]" : "bg-[var(--bg-surface)] border-[var(--border-color)]";
                    const initial = (data.displayName || data.email?.split('@')[0] || "U").charAt(0).toUpperCase();
                    
                    listContainer.innerHTML += `
                        <div class="flex items-center justify-between p-3 rounded-xl border ${bgClass}">
                            <div class="flex items-center gap-4">
                                <span class="text-sm font-bold text-[var(--text-muted)] w-4 text-center">${rank}</span>
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-body)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] font-bold">
                                    ${initial}
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-[var(--text-main)]">${data.displayName || "Anonymous"}</h4>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-bold text-[var(--text-muted)]">${data.xp.toLocaleString()} XP</span>
                            </div>
                        </div>
                    `;
                    rank++;
                }
            });

        } catch (error) {
            console.error("Firebase fetch error:", error);
            document.getElementById('leaderboardList').innerHTML = `<div class="text-center text-red-500 py-6 text-sm">Failed to load leaderboard.</div>`;
        }
    }
};