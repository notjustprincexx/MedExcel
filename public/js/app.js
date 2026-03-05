import { router } from './router.js';
import './firebase-config.js';

// 1. Listen for standard hash changes (like hitting the physical back button)
window.addEventListener('hashchange', router);

// 2. Run the router once when the app first loads
document.addEventListener('DOMContentLoaded', () => {
    router();

    // 3. Intercept bottom navigation clicks to prevent history bloat
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            // Stop the browser from pushing a new history state
            e.preventDefault(); 
            
            // Grab the hash (e.g., "#/library")
            const targetHash = link.getAttribute('href'); 
            
            // Replace the current URL instead of pushing a new one
            window.location.replace(targetHash); 
        });
    });
});
