/* ══════════════════════════════════
     SLIDE ENGINE — Flex Track Swipe Native + Auto-Slide
  ══════════════════════════════════ */
  const EASE_SMOOTH = 'transform 0.6s cubic-bezier(0.25, 1, 0.2, 1)';
  const track = document.getElementById('track');
  const vp    = document.getElementById('vp');
  const fill  = document.getElementById('loaderFill');
  const gsBtn = document.getElementById('btnMainCta');

  let page = 1;
  let startX = 0, currentTranslate = 0, prevTranslate = 0, isDragging = false;
  let autoSlideTimer;

  function updateLoader(n) {
    if (!fill) return;
    fill.classList.remove('p2', 'p3');
    if (n === 2) fill.classList.add('p2');
    if (n === 3) fill.classList.add('p3');
  }

  function resetAutoSlide(delay = 4000) {
    clearTimeout(autoSlideTimer);
    if (window._blockAutoSlide) return; // returning visitor — no auto-slide
    if (page < 3) {
      autoSlideTimer = setTimeout(() => {
        goTo(page + 1);
      }, delay);
    }
  }

  function goTo(n) {
    if (n < 1 || n > 3) return;
    page = n;
    
    track.style.transition = EASE_SMOOTH;
    prevTranslate = -(page - 1) * vp.clientWidth;
    track.style.transform = `translateX(${prevTranslate}px)`;
    
    updateLoader(n);

    if (page === 3) {
      gsBtn.classList.add('hidden');
      clearTimeout(autoSlideTimer); 
    } else {
      gsBtn.classList.remove('hidden');
      resetAutoSlide(); 
    }
  }

  // Initialize with a 6-second delay to account for the native splash screen
  resetAutoSlide(6000); 

  gsBtn.addEventListener('click', () => {
    clearTimeout(autoSlideTimer); 
    if (page < 3) goTo(page + 1);
  });

  /* ══════════════════════════════════
     SWIPE / DRAG GESTURE
  ══════════════════════════════════ */
  vp.addEventListener('touchstart', e => {
    if (e.target.closest('button') || e.target.closest('input') || document.querySelector('.login-modal.show')) return;
    
    clearTimeout(autoSlideTimer); 

    startX = e.touches[0].clientX;
    isDragging = true;
    
    track.style.transition = 'none'; 
  }, { passive: true });

  vp.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    if ((page === 1 && diff > 0) || (page === 3 && diff < 0)) {
      currentTranslate = prevTranslate + (diff * 0.2); 
    } else {
      currentTranslate = prevTranslate + diff;
    }
    
    track.style.transform = `translateX(${currentTranslate}px)`;
  }, { passive: true });

  vp.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    
    const movedBy = currentTranslate - prevTranslate;
    const threshold = vp.clientWidth * 0.2; 

    if (movedBy < -threshold && page < 3) {
      page += 1;
    } else if (movedBy > threshold && page > 1) {
      page -= 1;
    }
    
    goTo(page); 
  });

  /* ══════════════════════════════════
     SIGN-IN OVERLAY
  ══════════════════════════════════ */
  function showOverlay(show, text) {
    const el   = document.getElementById('signinOverlay');
    const txt  = document.getElementById('signinText');
    txt.textContent = text || 'Signing in…';
    el.classList.toggle('show', show);
  }

  /* ══════════════════════════════════
     DIALOG
  ══════════════════════════════════ */
  window.showDialog = function(message, title = 'Notice', opts = {}) {
    return new Promise(resolve => {
      const backdrop = document.getElementById('okBackdrop');
      document.getElementById('okTitle').textContent   = title;
      document.getElementById('okMessage').textContent = message;
      const ok  = document.getElementById('okConfirm');
      const can = document.getElementById('okCancel');
      ok.textContent  = opts.okText     || 'OK';
      can.textContent = opts.cancelText || 'Cancel';
      can.style.display = opts.hideCancel ? 'none' : 'block';
      backdrop.style.display = 'flex';
      requestAnimationFrame(() => backdrop.classList.add('open'));
      const done = r => {
        backdrop.classList.remove('open');
        setTimeout(() => { backdrop.style.display = 'none'; resolve(r); }, 240);
      };
      ok.onclick  = () => done(true);
      can.onclick = () => done(false);
    });
  };

  /* ══════════════════════════════════
     LOGIN MODAL
  ══════════════════════════════════ */
  window.isSignupMode = false;

  function openLogin(signup = false) {
    const modal  = document.getElementById('loginModal');
    const title  = document.getElementById('lmTitle');
    const btn    = document.getElementById('signInBtn');
    const row    = document.getElementById('nameRow');
    window.isSignupMode  = signup;
    title.textContent    = signup ? 'Create account'    : 'Enter your details';
    btn.textContent      = signup ? 'Sign Up'           : 'Sign In';
    row.style.display    = signup ? 'block'             : 'none';
    modal.classList.add('show');
  }

  function closeLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('show');
    setTimeout(() => {
      window.isSignupMode = false;
      document.getElementById('lmTitle').textContent   = 'Enter your details';
      document.getElementById('signInBtn').textContent = 'Sign In';
      document.getElementById('nameRow').style.display = 'none';
      ['nameInput','emailInput','passInput'].forEach(id =>
        document.getElementById(id).value = ''
      );
    }, 420);
  }

  document.getElementById('lmClose').addEventListener('click', closeLogin);
  document.getElementById('btnLogin').addEventListener('click',    () => openLogin(false));
  document.getElementById('btnRegister').addEventListener('click', () => openLogin(true));
  document.getElementById('btnGoogle').addEventListener('click',   () => startGoogleLogin());
  document.getElementById('lmGoogleBtn').addEventListener('click', () => startGoogleLogin());

  /* ── Password toggle ── */
  document.getElementById('togglePwBtn').addEventListener('click', () => {
    const inp = document.getElementById('passInput');
    inp.type  = inp.type === 'password' ? 'text' : 'password';
  });

  /* ── Native Google bridge ── */
  window.startGoogleLogin = function() {
    if (window.Android && window.Android.startGoogleSignIn) {
      showOverlay(true, 'Signing in…');
      window.Android.startGoogleSignIn();
    } else {
      showDialog(
        'Google sign-in is only available inside the MedExcel app.',
        'Use the App', { hideCancel: true }
      );
    }
  };

  /* ── URL deep-link ── */
  (function() {
    try {
      const hash   = (location.hash || '').replace('#','').toLowerCase();
      const action = new URLSearchParams(location.search).get('action');
      if (hash === 'login'  || action === 'login')  setTimeout(() => openLogin(false), 120);
      if (hash === 'signup' || action === 'signup') setTimeout(() => openLogin(true),  120);
    } catch(e) {}
  })();