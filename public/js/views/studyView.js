import { auth } from '../firebase-config.js';

export const StudyView = {
  render: () => {
    return `
            <header class="pt-6 pb-2 px-5 sticky top-0 z-40 bg-[var(--bg-body)]">
                <h1 class="text-2xl font-bold tracking-tight text-[var(--text-main)] mb-4">Library</h1>
                
                <div class="relative mb-4">
                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"></i>
                    <input type="text" id="searchInput" placeholder="Search your decks..." class="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl py-2.5 pl-11 pr-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-btn)]">
                </div>
            </header>
            
            <main class="flex-1 overflow-y-auto px-4 pt-4 pb-32 hide-scroll" id="libraryGrid">
                <div class="text-center text-[var(--text-muted)] py-6">Loading library...</div>
            </main>
        `;
  },
  mount: () => {
    const libraryGrid = document.getElementById('libraryGrid');
    let uid = auth.currentUser ? auth.currentUser.uid : "guest";
    let quizzes = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid)) || [];
    
    if (quizzes.length === 0) {
      libraryGrid.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center py-12 opacity-60">
                    <i class="fas fa-folder-open text-4xl mb-3 text-[var(--text-muted)]"></i>
                    <p class="text-[var(--text-muted)] text-sm">No decks found.</p>
                </div>
            `;
      return;
    }
    
    libraryGrid.innerHTML = '';
    quizzes.forEach(quiz => {
      const itemCount = quiz.questions ? quiz.questions.length : 0;
      libraryGrid.innerHTML += `
                <div class="group-container p-4 mb-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)]">
                    <h3 class="font-bold text-[var(--text-main)] mb-1">${quiz.title || "Untitled Deck"}</h3>
                    <p class="text-xs text-[var(--text-muted)] font-medium uppercase">${itemCount} Cards • ${quiz.subject || "General"}</p>
                </div>
            `;
    });
  }
};