// js/app.js - Global Utilities and Interactions

export const AppManager = {
    init: () => {
        AppManager.initTheme();
        AppManager.initGlobalModals();
        AppManager.registerServiceWorker();
    },
    
    initTheme: () => {
        // Example: Global theme toggle logic
        const savedTheme = localStorage.getItem('medexcel_theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        }
        
        // Attach to a global theme toggle button if one exists in your index.html
        const themeBtn = document.getElementById('globalThemeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                document.documentElement.classList.toggle('light-mode');
                const isLight = document.documentElement.classList.contains('light-mode');
                localStorage.setItem('medexcel_theme', isLight ? 'light' : 'dark');
            });
        }
    },
    
    initGlobalModals: () => {
        // Handle closing global modals (like a system-wide alert or logout confirmation) when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ok-backdrop')) {
                e.target.classList.remove('active');
            }
        });
    },
    
    registerServiceWorker: () => {
        // PWA Support setup
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.warn('Service Worker registration failed: ', err);
                });
            });
        }
    }
};

// Initialize global utilities on load
document.addEventListener('DOMContentLoaded', () => {
    AppManager.init();
});