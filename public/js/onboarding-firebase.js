import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import {
    getAuth, setPersistence, browserLocalPersistence,
    signInWithEmailAndPassword, signInAnonymously,
    onAuthStateChanged, createUserWithEmailAndPassword,
    updateProfile, sendPasswordResetEmail,
    GoogleAuthProvider, signInWithCredential, signInWithPopup
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import {
    getFirestore, doc, getDoc, setDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey:            "AIzaSyADgcz_naQ_5tpXcpI8tSvm1b4RVLDrlaw",
    authDomain:        "medxcel.firebaseapp.com",
    projectId:         "medxcel",
    storageBucket:     "medxcel.firebasestorage.app",
    messagingSenderId: "649180317389",
    appId:             "1:649180317389:web:f6b9a7053a37853ea04b84",
    measurementId:     "G-6VQYKEBMSX"
  };

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  setPersistence(auth, browserLocalPersistence).catch(console.error);

  /* Helper: ensure Firestore doc exists for new users */
  async function syncUserDoc(user, extra = {}) {
    try {
      const ref  = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      // Use localStorage — survives app restarts unlike sessionStorage
      const refCode = localStorage.getItem('medexcel_ref_code') || null;

      if (!snap.exists()) {
        await setDoc(ref, {
          email:             user.email,
          uid:               user.uid,
          displayName:       user.displayName || user.email.split('@')[0],
          plan:              'free',
          dailyUsage:        0,
          planUsed:          0,
          lastDailyReset:    new Date().toISOString().split('T')[0],
          createdAt:         serverTimestamp(),
          referralCode:      user.uid.substring(0, 8).toUpperCase(),
          referralCount:     0,
          referralProcessed: false,
          ...extra
        }, { merge: true });

        // Route via claimReferral Cloud Function (not direct Firestore write) so
        // the referrer gets properly credited. Writing referredBy here marks the
        // user as "already claimed" and blocks the Cloud Function from running.
        if (refCode) {
          localStorage.setItem('medexcel_pending_referral_code', refCode);
          localStorage.removeItem('medexcel_ref_code');
        }
      } else if (refCode && !snap.data().referredBy && !snap.data().referralProcessed) {
        // Existing user who tapped a referral link — route through Cloud Function
        localStorage.setItem('medexcel_pending_referral_code', refCode);
        localStorage.removeItem('medexcel_ref_code');
      }
    } catch(e) { console.warn('Firestore sync skipped:', e); }
  }

  // Decides where to send the user after login.
  // Checks Firestore first so reinstalled users don't see onboarding again.
  async function goAfterLogin(uid) {
    sessionStorage.setItem('medexcel_just_logged_in', '1');
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists() && snap.data().onboardingDone) {
        // Completed onboarding before — sync flag to localStorage and skip
        localStorage.setItem('medexcel_personalized_onboarding_done', '1');
        window.location.replace('homepage.html');
        return;
      }
    } catch(e) { console.warn('Could not check onboardingDone:', e); }

    // localStorage fallback (fast path when Firestore already synced flag)
    if (localStorage.getItem('medexcel_personalized_onboarding_done')) {
      window.location.replace('homepage.html');
      return;
    }

    // First-time user — show personalized onboarding
    window.location.replace('personalized-onboarding.html');
  }

  /* ── Native Android Google Sign-In bridge ── */
  window.onNativeLogin = async function(email, uid, idToken, displayName) {
    const name = (displayName && displayName !== 'User')
      ? displayName : email.split('@')[0];

    showOverlay(true, 'Preparing app…');

    localStorage.setItem('nativeUser', JSON.stringify({ email, uid, displayName: name }));
    await syncUserDoc({ uid, email, displayName: name }, { displayName: name });

    try {
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    } catch(e) {
      console.warn('Credential sign-in failed, using anonymous fallback:', e);
      try { await signInAnonymously(auth); } catch(e2) {}
    }

    await goAfterLogin(uid);
  };

  /* ── Auth state listener — silent, no loader shown ── */
  onAuthStateChanged(auth, async user => {
    if (!user) return; // not signed in — stay on onboarding

    localStorage.setItem('nativeUser', JSON.stringify({
      email:       user.email,
      uid:         user.uid,
      displayName: user.displayName
    }));
    await syncUserDoc(user);
    await goAfterLogin(user.uid);
  });

  /* ── Email Sign In / Sign Up ── */
  document.getElementById('signInBtn').addEventListener('click', async () => {
    const name  = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const pass  = document.getElementById('passInput').value;

    if (window.isSignupMode && !name)
      return showDialog('Please enter your name.', 'Missing Info', { hideCancel: true });
    if (!email || !pass)
      return showDialog('Please enter your email and password.', 'Missing Info', { hideCancel: true });

    closeLogin();
    showOverlay(true, window.isSignupMode ? 'Creating account…' : 'Signing in…');

    try {
      if (window.isSignupMode) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
      // onAuthStateChanged will fire → redirect
    } catch(err) {
      showOverlay(false);
      await showDialog(
        err.message,
        window.isSignupMode ? 'Sign Up Failed' : 'Login Failed',
        { hideCancel: true }
      );
      openLogin(window.isSignupMode);
    }
  });

  /* ── Forgot Password ── */
  document.getElementById('forgotBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim();
    try {
      await sendPasswordResetEmail(auth, email);
      showDialog('A reset link has been sent to your inbox.', 'Check Your Email', { hideCancel: true });
    } catch(e) {
      showDialog(e.message, 'Error', { hideCancel: true });
    }
  });
  /* ── Web Google Sign-In (browser only; native uses onNativeLogin) ── */
  window.webGoogleSignIn = async function() {
    // Skip on native — Capacitor handles Google sign-in via onNativeLogin bridge
    if (window.Capacitor && window.Capacitor.isNativePlatform()) return;

    closeLogin();
    showOverlay(true, 'Signing in with Google…');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged fires → syncUserDoc → goAfterLogin
    } catch (err) {
      showOverlay(false);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        await showDialog(err.message, 'Google Sign-In Failed', { hideCancel: true });
      }
      openLogin(false);
    }
  };
