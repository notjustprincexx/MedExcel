import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import {
    getAuth, setPersistence, browserLocalPersistence,
    signInWithEmailAndPassword, signInAnonymously,
    onAuthStateChanged, createUserWithEmailAndPassword,
    updateProfile, sendPasswordResetEmail,
    GoogleAuthProvider, signInWithCredential
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
      if (!snap.exists()) {
        const refCode = sessionStorage.getItem('medexcel_ref_code') || null;
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
          referredBy:        refCode,
          referralCount:     0,
          referralProcessed: false,
          ...extra
        }, { merge: true });
        if (refCode) sessionStorage.removeItem('medexcel_ref_code');
      }
    } catch(e) { console.warn('Firestore sync skipped:', e); }
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

    sessionStorage.setItem('medexcel_just_logged_in', '1'); localStorage.getItem('medexcel_personalized_onboarding_done') ? window.location.replace('homepage.html') : window.location.replace('personalized-onboarding.html');
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
    sessionStorage.setItem('medexcel_just_logged_in', '1'); localStorage.getItem('medexcel_personalized_onboarding_done') ? window.location.replace('homepage.html') : window.location.replace('personalized-onboarding.html');
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
    if (!email)
      return showDialog('Enter your email address in the field above first.', 'Missing Email', { hideCancel: true });
    try {
      await sendPasswordResetEmail(auth, email);
      showDialog('A reset link has been sent to your inbox.', 'Check Your Email', { hideCancel: true });
    } catch(e) {
      showDialog(e.message, 'Error', { hideCancel: true });
    }
  });