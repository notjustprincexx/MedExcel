import { auth } from '../firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const ProfileView = {
    render: () => {
        return `
            <header class="pt-6 pb-2 px-5 flex items-center shrink-0 sticky top-0 z-40 bg-[var(--bg-body)]">
                <h1 class="text-2xl font-bold tracking-tight text-[var(--text-main)]">Profile</h1>
            </header>
            <main class="flex-1 overflow-y-auto px-4 pt-4 hide-scroll">
                <div class="group-container">
                    <div class="list-item">
                        <div class="flex flex-col">
                            <span id="userName" class="font-bold text-lg">Loading...</span>
                            <span id="userEmail" class="text-sm text-[var(--text-muted)]">...</span>
                        </div>
                    </div>
                </div>
                <div class="group-container">
                    <div class="list-item" id="btnLogout">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-sign-out-alt text-red-400"></i>
                            <span class="text-[var(--text-main)] font-medium">Log Out</span>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },
    mount: async () => {
        let activeUser = auth.currentUser || JSON.parse(localStorage.getItem('nativeUser'));
        if (activeUser) {
            document.getElementById("userName").textContent = activeUser.displayName || activeUser.email.split("@")[0];
            document.getElementById("userEmail").textContent = activeUser.email;
        }
        document.getElementById('btnLogout')?.addEventListener('click', async () => {
            if (confirm("Are you sure you want to log out?")) {
                await signOut(auth);
                localStorage.clear();
                window.location.replace("index.html");
            }
        });
    }
};