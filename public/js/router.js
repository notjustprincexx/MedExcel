import Home from './views/home.js';
import Library from './views/library.js';
import Practice from './views/practice.js';
import Create from './views/create.js';

// The routing dictionary
const routes = {
    '/': Home,
    '/library': Library,
    '/practice': Practice,
    '/create': Create
};

export const router = async () => {
    try {
        const path = window.location.hash.replace('#', '') || '/';
        const ViewComponent = routes[path] || routes['/'];
        const view = new ViewComponent();
        
        const appContainer = document.querySelector('#app');

        // 1. Trigger the snappy exit animation
        appContainer.classList.add('page-exit');

        // 2. Wait just 50ms (ultra-fast) instead of 200ms
        setTimeout(async () => {
            // 3. Inject the new HTML
            appContainer.innerHTML = await view.getHtml();
            
            // Update bottom navigation active states
            document.querySelectorAll('.nav-item').forEach(link => {
                link.classList.remove('text-blue-500');
                link.classList.add('text-slate-500');
                link.querySelector('span').classList.remove('font-bold');
                link.querySelector('span').classList.add('font-medium');
                
                if (link.getAttribute('href') === `#${path}`) {
                    link.classList.remove('text-slate-500');
                    link.classList.add('text-blue-500');
                    link.querySelector('span').classList.remove('font-medium');
                    link.querySelector('span').classList.add('font-bold');
                }
            });

            // 4. Execute the view-specific JavaScript
            if (typeof view.init === 'function') {
                await view.init();
            }

            // 5. Trigger the enter animation to snap it back into view
            appContainer.classList.remove('page-exit');
            
        }, 150); 

    } catch (error) {
        document.querySelector('#app').innerHTML = `
            <div class="p-6 h-full flex flex-col justify-center">
                <div class="bg-rose-900/20 border border-rose-500 p-4 rounded-xl">
                    <h2 class="font-bold text-rose-400 text-lg mb-2"><i class="fas fa-exclamation-triangle"></i> App Crashed</h2>
                    <p class="text-sm text-white mb-4">${error.message}</p>
                    <pre class="text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap">${error.stack}</pre>
                </div>
            </div>
        `;
        console.error("SPA Error:", error);
    }
};
