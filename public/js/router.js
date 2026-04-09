import { HomeView, windowHomeRotator } from './views/homeView.js';
import { StudyView } from './views/studyView.js';
import { LeaderboardView } from './views/leaderboardView.js';
import { ProfileView } from './views/profileView.js';
import { CreateView } from './views/createView.js'; // Import new module

const appRoot = document.getElementById('app-root');

const routes = {
    '/home': HomeView,
    '/study': StudyView,
    '/leaderboard': LeaderboardView,
    '/profile': ProfileView,
    '/create': CreateView // Map the module to the route
};

async function handleRouting() {
    if (windowHomeRotator) clearInterval(windowHomeRotator);
    
    let currentPath = window.location.hash.slice(1) || '/home';
    const view = routes[currentPath] || routes['/home'];
    
    appRoot.innerHTML = view.render();
    if (view.mount) await view.mount();
    
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-path') === currentPath);
    });
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);