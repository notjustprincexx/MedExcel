// js/views/loginView.js
import { auth, db } from '../app.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const LoginView = {
    render: async () => {
        return `
            <style>
                .onboarding-wrapper { display: flex; width: 100%; height: 100vh; padding-bottom: 40px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
                .onboarding-wrapper::-webkit-scrollbar { display: none; }
                .slide { flex: 0 0 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; scroll-snap-align: start; scroll-snap-stop: always; padding: 2rem; text-align: center; }
                .lottie-box { width: 250px; height: 250px; opacity: 0; transform: scale(0.95) translateY(10px); transition: all 0.6s cubic-bezier(0.33, 1, 0.68, 1); }
                .lottie-box.loaded { opacity: 1; transform: scale(1) translateY(0); }
                .pagination-dots { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 10; }
                .dot { width: 8px; height: 8px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.1); transition: all 0.3s ease; }
                .dot.active { background-color: #3b82f6; width: 24px; border-radius: 4px; }
                .login-modal { position: absolute; inset: 0; z-index: 60; background: #050A15; display: flex; flex-direction: column; padding: 1.5rem; transition: all 0.3s ease; opacity: 0; transform: translateY(40px); pointer-events: none; }
                .login-modal.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
                .loader-screen { position: fixed; inset: 0; z-index: 9999; background: #050A15; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: opacity 0.4s ease; }
                .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: 0.3s ease; }
                .dialog-overlay.show { opacity: 1; visibility: visible; }
                .dialog-box { background: #0B1120; border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 2rem; width: 90%; max-width: 340px; transform: scale(0.95); transition: 0.3s cubic-bezier(0.19, 1, 0.22, 1); text-align: center; }
                .dialog-overlay.show .dialog-box { transform: scale(1); }
            </style>

            <div id="customDialogOverlay" class="dialog-overlay">
                <div class="dialog-box shadow-2xl">
                    <div id="dialogIcon" class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl mb-4 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <h3 id="dialogTitle" class="text-xl font-bold text-white mb-2">Notice</h3>
                    <p id="dialogMessage" class="text-slate-400 text-sm mb-8 leading-relaxed">Message goes here.</p>
                    <div class="flex gap-3 w-full">
                        <button id="dialogCancelBtn" class="flex-1 py-3.5 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors hidden">Cancel</button>
                        <button id="dialogConfirmBtn" class="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 active:scale-95">OK</button>
                    </div>
                </div>
            </div>

            <div id="loaderScreen" class="loader-screen">
                <div id="lottie-loader-container" style="width: 150px; height: 150px; margin-bottom: 20px;"></div>
                <h2 class="text-xl font-bold text-white tracking-widest uppercase mb-2">Authenticating</h2>
                <p class="text-slate-400 text-sm">Please wait a moment...</p>
            </div>

            <div id="introScreen" class="h-full w-full relative bg-[#050A15]">
                <div class="onboarding-wrapper" id="onboardingContainer">
                    <div class="slide">
                        <div id="lottie-yay" class="lottie-box"></div>
                        <h2 class="text-3xl font-extrabold mt-6 tracking-tight">Welcome to MedExcel</h2>
                        <p class="text-slate-400 mt-2 text-lg">Your intelligent study companion.</p>
                        <div class="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest mt-8 animate-pulse">
                            <span>Swipe</span> <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                    <div class="slide">
                        <div id="lottie-cat" class="lottie-box"></div>
                        <h2 class="text-3xl font-extrabold mt-6 tracking-tight">Instant Flashcards</h2>
                        <p class="text-slate-400 mt-2 text-lg">Let MedExcel create your study materials in seconds.</p>
                    </div>
                    <div class="slide">
                        <div id="lottie-wonder" class="lottie-box"></div>
                        <h2 class="text-3xl font-extrabold mt-6 tracking-tight">Remember Forever</h2>
                        <p class="text-slate-400 mt-2 text-lg">Crush your exams and manage your time perfectly.</p>
                    </div>
                    <div class="slide">
                        <div id="lottie-walk" class="lottie-box"></div>
                        <h2 class="text-3xl font-extrabold mt-6 tracking-tight">Stress-Free Studying</h2>
                        <p class="text-slate-400 mt-2 text-lg mb-8">Take a breath. We've got the hard part covered.</p>
                        <div class="w-full max-w-sm flex flex-col gap-4">
                            <button id="btnGetStarted" class="w-full bg-blue-500 text-white font-extrabold py-4 rounded-2xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider shadow-lg shadow-blue-900/20">Get Started</button>
                            <button id="btnAlreadyHaveAccount" class="w-full bg-[#0B1120] text-blue-400 font-extrabold py-4 rounded-2xl border-2 border-white/5 uppercase tracking-wider transition-colors hover:bg-white/5 active:scale-95">I Already Have An Account</button>
                        </div>
                    </div>
                </div>
                <div class="pagination-dots" id="dots-container">
                    <div class="dot active"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                </div>
            </div>

            <div id="loginModal" class="login-modal">
                <div class="flex items-center justify-between mb-8 mt-2">
                    <button id="closeLoginBtn" class="text-slate-400 hover:text-white p-2 -ml-2 transition-colors active:scale-90"><i class="fas fa-times text-2xl"></i></button>
                    <h2 id="loginHeading" class="text-slate-400 font-bold text-lg flex-1 text-center mr-6">Enter your details</h2>
                </div>
                
                <div class="w-full max-w-sm mx-auto flex flex-col flex-1">
                    <div class="bg-[#0B1120] border-2 border-white/5 rounded-2xl mb-6 overflow-hidden focus-within:border-blue-500/50 transition-colors shadow-lg">
                        <div id="nameRow" class="relative border-b-2 border-white/5 hidden">
                            <input id="nameInput" type="text" placeholder="Your name or nickname" class="w-full p-4 font-medium bg-transparent text-white outline-none placeholder-slate-500">
                        </div>
                        <div class="relative border-b-2 border-white/5">
                            <input id="emailInput" type="email" placeholder="Email address" class="w-full p-4 font-medium bg-transparent text-white outline-none placeholder-slate-500">
                        </div>
                        <div class="relative">
                            <input id="loginPassword" type="password" placeholder="Password" class="w-full p-4 font-medium bg-transparent text-white outline-none placeholder-slate-500">
                            <button id="togglePasswordBtn" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors p-2"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                    
                    <button id="submitAuthBtn" class="w-full bg-white/5 text-slate-300 font-extrabold py-4 rounded-2xl border-b-4 border-[#0B1120] uppercase tracking-widest mb-6 active:border-b-0 active:translate-y-1 transition-all">Sign In</button>
                    
                    <button id="forgotPasswordBtn" class="w-full text-blue-400 font-extrabold text-sm uppercase tracking-widest mb-12 hover:text-blue-300 transition-colors active:scale-95">Forgot Password</button>
                    
                    <div class="mt-auto mb-8">
                        <div class="relative flex py-5 items-center mb-4">
                            <div class="flex-grow border-t border-white/10"></div>
                            <span class="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Or continue with</span>
                            <div class="flex-grow border-t border-white/10"></div>
                        </div>
                        <button id="googleLoginBtn" class="w-full flex items-center justify-center gap-3 bg-white text-slate-900 rounded-2xl p-4 hover:bg-slate-200 transition-all active:scale-95 shadow-lg">
                            <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            <span class="font-bold text-sm tracking-wide">Google</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    afterRender: async () => {
        let isSignupMode = false;

        const showDialog = (message, title = "Notice", options = {}) => {
            return new Promise((resolve) => {
                const overlay = document.getElementById('customDialogOverlay');
                const titleEl = document.getElementById('dialogTitle');
                const msgEl = document.getElementById('dialogMessage');
                const confirmBtn = document.getElementById('dialogConfirmBtn');
                const cancelBtn = document.getElementById('dialogCancelBtn');
                const iconContainer = document.getElementById('dialogIcon');

                titleEl.textContent = title;
                msgEl.textContent = message;

                if (title.toLowerCase().includes('failed') || title.toLowerCase().includes('error')) {
                    iconContainer.className = "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl mb-4 bg-red-500/10 text-red-500 border border-red-500/20";
                    iconContainer.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                    confirmBtn.className = "flex-1 py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20 active:scale-95";
                } else {
                    iconContainer.className = "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl mb-4 bg-blue-500/10 text-blue-400 border border-blue-500/20";
                    iconContainer.innerHTML = '<i class="fas fa-info-circle"></i>';
                    confirmBtn.className = "flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 active:scale-95";
                }

                if (options.hideCancel) cancelBtn.classList.add('hidden');
                else cancelBtn.classList.remove('hidden');

                overlay.classList.add('show');

                const cleanup = () => { overlay.classList.remove('show'); confirmBtn.onclick = null; cancelBtn.onclick = null; };
                confirmBtn.onclick = () => { cleanup(); resolve(true); };
                cancelBtn.onclick = () => { cleanup(); resolve(false); };
            });
        };

        if (window.lottie) {
            window.AssetManager = {
                cache: {},
                preload: function(key, url) { this.cache[key] = fetch(url).then(res => res.json()).catch(err => null); },
                get: async function(key) { return await this.cache[key]; }
            };
            AssetManager.preload('loader', 'Loader.json'); 
            AssetManager.preload('yay', 'YayJump.json');
            AssetManager.preload('cat', 'Blue Working Cat Animation.json');
            AssetManager.preload('wonder', 'WonderThings.json');
            AssetManager.preload('walk', 'Walkinganddrinking.json');

            const applyLottie = async (key, containerId) => {
                const data = await AssetManager.get(key);
                const el = document.getElementById(containerId);
                if (data && el) {
                    window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: data });
                    setTimeout(() => el.classList.add('loaded'), 150);
                }
            };

            applyLottie('yay', 'lottie-yay');
            applyLottie('cat', 'lottie-cat');
            applyLottie('wonder', 'lottie-wonder');
            applyLottie('walk', 'lottie-walk');
            applyLottie('loader', 'lottie-loader-container');
        }

        const container = document.getElementById('onboardingContainer');
        const dots = document.querySelectorAll('#dots-container .dot');
        container.addEventListener('scroll', () => {
            const slideWidth = container.clientWidth;
            const activeIndex = Math.round(container.scrollLeft / slideWidth);
            dots.forEach((dot, index) => dot.classList.toggle('active', index === activeIndex));
        });

        const loginModal = document.getElementById('loginModal');
        const nameRow = document.getElementById('nameRow');
        const submitAuthBtn = document.getElementById('submitAuthBtn');

        const toggleModal = (show, signup = false) => {
            isSignupMode = signup;
            if (show) {
                document.getElementById('loginHeading').textContent = isSignupMode ? 'Create your account' : 'Enter your details';
                submitAuthBtn.textContent = isSignupMode ? 'Sign Up' : 'Sign In';
                if (isSignupMode) {
                    submitAuthBtn.className = "w-full bg-blue-500 text-white font-extrabold py-4 rounded-2xl border-b-4 border-blue-700 uppercase tracking-widest mb-6 active:border-b-0 active:translate-y-1 transition-all shadow-lg shadow-blue-900/20";
                    nameRow.classList.remove('hidden');
                } else {
                    submitAuthBtn.className = "w-full bg-white/5 text-slate-300 font-extrabold py-4 rounded-2xl border-b-4 border-[#0B1120] uppercase tracking-widest mb-6 active:border-b-0 active:translate-y-1 transition-all";
                    nameRow.classList.add('hidden');
                }
                loginModal.classList.add('show');
            } else { loginModal.classList.remove('show'); }
        };

        document.getElementById('btnGetStarted').addEventListener('click', () => toggleModal(true, true));
        document.getElementById('btnAlreadyHaveAccount').addEventListener('click', () => toggleModal(true, false));
        document.getElementById('closeLoginBtn').addEventListener('click', () => toggleModal(false));
        
        document.getElementById('togglePasswordBtn').addEventListener('click', () => {
            const passInput = document.getElementById('loginPassword');
            const icon = document.querySelector('#togglePasswordBtn i');
            if (passInput.type === "password") { passInput.type = "text"; icon.className = "fas fa-eye-slash"; } 
            else { passInput.type = "password"; icon.className = "fas fa-eye"; }
        });

        document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
            showDialog("Password reset functionality requires email verification. Please contact support.", "Reset Password", { hideCancel: true });
        });

        submitAuthBtn.addEventListener('click', async () => {
            const name = document.getElementById('nameInput').value.trim();
            const email = document.getElementById('emailInput').value.trim();
            const pass = document.getElementById('loginPassword').value;

            if (isSignupMode && !name) { return showDialog("Please enter your name.", "Missing Info", { hideCancel: true }); }
            if (!email || !pass) { return showDialog("Please enter both email and password.", "Missing Info", { hideCancel: true }); }

            const loader = document.getElementById('loaderScreen');
            loader.style.visibility = 'visible'; loader.style.opacity = '1';

            try {
                if (isSignupMode) {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                    // Fire and forget (don't await) so UI doesn't hang
                    updateProfile(userCredential.user, { displayName: name }).catch(e=>console.warn(e));
                    setDoc(doc(db, "users", userCredential.user.uid), {
                        email: email, uid: userCredential.user.uid, displayName: name, plan: "free", dailyUsage: 0, planUsed: 0, 
                        lastDailyReset: new Date().toISOString().split("T")[0], createdAt: serverTimestamp()
                    }, { merge: true }).catch(e=>console.warn(e));
                } else {
                    await signInWithEmailAndPassword(auth, email, pass);
                }
            } catch (error) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.visibility = 'hidden', 400);
                showDialog(error.message, isSignupMode ? "Sign Up Failed" : "Login Failed", { hideCancel: true });
            }
        });

        document.getElementById('googleLoginBtn').addEventListener('click', () => {
            if (window.Android && window.Android.startGoogleSignIn) {
                const loader = document.getElementById('loaderScreen');
                loader.style.visibility = 'visible'; loader.style.opacity = '1';
                window.Android.startGoogleSignIn();
                
                // Safety net: if Android popup is closed, hide loader after 30 seconds
                setTimeout(() => {
                    if (window.location.hash !== '#/home' && loader) {
                        loader.style.opacity = '0';
                        setTimeout(() => loader.style.visibility = 'hidden', 400);
                    }
                }, 30000); 
            } else { 
                showDialog("Native Google login is only available when running within the MedExcel Android app.", "Web Environment", { hideCancel: true }); 
            }
        });

        // --- BULLETPROOF NATIVE GOOGLE LOGIN BRIDGE ---
        window.onNativeLogin = function(email, uid) {
            // 1. Create the user object
            const userObj = { email: email, uid: uid, displayName: email.split("@")[0] };
            
            // 2. Save to Local Storage for future app launches
            localStorage.setItem("nativeUser", JSON.stringify(userObj));
            
            // 3. Inject directly into live memory so app.js doesn't block routing
            window.currentUser = userObj;
            
            // 4. Aggressively hide the loader
            const loader = document.getElementById('loaderScreen');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.visibility = 'hidden';
                    loader.style.display = 'none'; 
                }, 400);
            }

            // 5. Fire Firestore sync in background (do not block)
            setDoc(doc(db, "users", uid), {
                email: email, uid: uid, displayName: email.split("@")[0], plan: "free", dailyUsage: 0, planUsed: 0,
                lastDailyReset: new Date().toISOString().split("T")[0], createdAt: serverTimestamp()
            }, { merge: true }).catch(e => console.warn("Firestore sync skipped", e));

            // 6. Navigate directly to the home screen
            window.location.hash = '/home';
        };
    }
};