// Manual Flashcard Creation
// ─────────────────────────────────────────────────────────────────────────────
(function () {

    // ── State ────────────────────────────────────────────────────────────────
    let _cards   = [];    // [{ front: '', back: '' }, ...]
    let _idx     = 0;     // card currently in the editor
    let _saving  = false;
    window._mcTitle   = '';
    window._mcSubject = '';

    // ── Public entry ─────────────────────────────────────────────────────────
    window.openManualCreate = function () {
        if (!window.currentUser) { window.showLoginModal(); return; }
        _cards   = [{ front: '', back: '' }];
        _idx     = 0;
        _saving  = false;
        window._mcTitle   = '';
        window._mcSubject = '';
        _render();
        _enter();
    };

    // ── Overlay enter / exit ─────────────────────────────────────────────────
    function _enter() {
        document.getElementById('globalBottomNav')?.style.setProperty('transform', 'translateY(100%)');
        const hdr = document.querySelector('#view-create .top-header');
        if (hdr) hdr.style.display = 'none';
        document.getElementById('selectionView').style.display = 'none';

        const mv = document.getElementById('manualCreateView');
        Object.assign(mv.style, {
            display:        'flex',
            position:       'fixed',
            inset:          '0',
            zIndex:         '200',
            background:     'var(--bg-body)',
            flexDirection:  'column',
            overflowY:      'auto',
        });
    }

    function _exit() {
        const nav = document.getElementById('globalBottomNav');
        if (nav) nav.style.transform = '';
        const hdr = document.querySelector('#view-create .top-header');
        if (hdr) hdr.style.display = '';
        document.getElementById('manualCreateView').style.display = 'none';
        document.getElementById('selectionView').style.display = 'flex';
    }

    // ── Full render ──────────────────────────────────────────────────────────
    function _render() {
        const mv    = document.getElementById('manualCreateView');
        const card  = _cards[_idx];
        const total = _cards.length;

        const canAdd     = !!(card.front.trim() && card.back.trim());
        const hasSave    = _cards.some(c => c.front.trim() && c.back.trim());
        const onFirst    = _idx === 0;
        const onLast     = _idx === total - 1;

        mv.innerHTML = `
<div style="display:flex;flex-direction:column;min-height:100svh;padding-top:env(safe-area-inset-top,0px);">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.125rem 0.875rem;flex-shrink:0;border-bottom:1px solid var(--border-glass);background:var(--bg-body);position:sticky;top:0;z-index:5;">
    <button onclick="window._mcBack()"
      style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);display:flex;align-items:center;justify-content:center;color:var(--text-main);font-size:0.875rem;cursor:pointer;flex-shrink:0;"
      ontouchstart="this.style.transform='scale(0.88)'" ontouchend="this.style.transform=''">
      <i class="fas fa-arrow-left"></i>
    </button>
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-main);flex:1;margin:0;">Create Flashcards</h2>
    <span style="font-size:0.7rem;font-weight:700;background:rgba(139,92,246,0.12);color:var(--accent-btn);padding:3px 10px;border-radius:9999px;white-space:nowrap;">
      ${total} card${total !== 1 ? 's' : ''}
    </span>
  </div>

  <!-- ── Scrollable body ───────────────────────────────────────────────── -->
  <div style="flex:1;overflow-y:auto;padding:1.25rem 1.125rem;display:flex;flex-direction:column;gap:1.25rem;padding-bottom:6rem;">

    <!-- Deck info (only on card 0) -->
    ${onFirst ? `
    <div style="display:flex;flex-direction:column;gap:0.625rem;">
      <input id="mcTitleInput" type="text" placeholder="Deck title" maxlength="60"
        value="${_esc(window._mcTitle)}"
        oninput="window._mcTitle=this.value"
        style="width:100%;padding:0.875rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;font-weight:600;box-sizing:border-box;outline:none;-webkit-appearance:none;">
      <input id="mcSubjectInput" type="text" placeholder="Subject  (e.g. Pharmacology)" maxlength="40"
        value="${_esc(window._mcSubject)}"
        oninput="window._mcSubject=this.value"
        style="width:100%;padding:0.75rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.875rem;box-sizing:border-box;outline:none;-webkit-appearance:none;">
    </div>
    <div style="height:1px;background:var(--border-glass);"></div>
    ` : ''}

    <!-- Card nav row -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;">
        Card ${_idx + 1} of ${total}
      </span>
      <div style="display:flex;gap:0.375rem;">
        <button onclick="window._mcNav(-1)" ${onFirst ? 'disabled' : ''}
          style="width:2rem;height:2rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);color:var(--text-main);display:flex;align-items:center;justify-content:center;font-size:0.7rem;cursor:${onFirst ? 'default' : 'pointer'};opacity:${onFirst ? '0.35' : '1'};">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button onclick="window._mcNav(1)" ${onLast ? 'disabled' : ''}
          style="width:2rem;height:2rem;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-glass);color:var(--text-main);display:flex;align-items:center;justify-content:center;font-size:0.7rem;cursor:${onLast ? 'default' : 'pointer'};opacity:${onLast ? '0.35' : '1'};">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Front -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Front</label>
      <textarea id="mcFrontInput"
        placeholder="Question or term..."
        oninput="window._mcLive('front',this.value)"
        style="width:100%;min-height:5.5rem;padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;line-height:1.55;resize:none;box-sizing:border-box;outline:none;font-family:inherit;-webkit-appearance:none;">${_esc(card.front)}</textarea>
    </div>

    <!-- Back -->
    <div>
      <label style="font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:0.5rem;">Back</label>
      <textarea id="mcBackInput"
        placeholder="Answer or definition..."
        oninput="window._mcLive('back',this.value)"
        style="width:100%;min-height:5.5rem;padding:0.875rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);background:var(--bg-surface);color:var(--text-main);font-size:0.9375rem;line-height:1.55;resize:none;box-sizing:border-box;outline:none;font-family:inherit;-webkit-appearance:none;">${_esc(card.back)}</textarea>
    </div>

    <!-- Delete card -->
    ${total > 1 ? `
    <button onclick="window._mcDelete()"
      style="align-self:flex-start;padding:0.375rem 0.875rem;border-radius:9999px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.07);color:#f87171;font-size:0.75rem;font-weight:600;cursor:pointer;">
      <i class="fas fa-trash" style="margin-right:0.375rem;font-size:0.6875rem;"></i>Remove card
    </button>
    ` : ''}

    <!-- Progress dots (max 8 shown) -->
    ${total > 1 ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:0.375rem;flex-wrap:wrap;">
      ${Array.from({ length: Math.min(total, 8) }, (_, i) => {
          const dotIdx = total <= 8 ? i : Math.round(i * (total - 1) / 7);
          const active = total <= 8 ? (i === _idx) : (dotIdx === _idx || (i === 7 && _idx >= dotIdx));
          return `<div style="width:${active ? '20px' : '6px'};height:6px;border-radius:9999px;background:${active ? 'var(--accent-btn)' : 'var(--border-glass)'};transition:width 0.2s ease;"></div>`;
      }).join('')}
      ${total > 8 ? `<span style="font-size:0.65rem;color:var(--text-muted);margin-left:2px;">+${total - 8}</span>` : ''}
    </div>
    ` : ''}

  </div><!-- end body -->

  <!-- ── Footer ──────────────────────────────────────────────────────────── -->
  <div style="position:fixed;bottom:0;left:0;right:0;padding:0.875rem 1.125rem calc(env(safe-area-inset-bottom,0px) + 0.875rem);background:var(--bg-body);border-top:1px solid var(--border-glass);display:flex;gap:0.75rem;z-index:10;">

    <!-- Add card -->
    <button id="mcAddBtn" onclick="window._mcAdd()" ${!canAdd ? 'disabled' : ''}
      style="flex:1;padding:0.875rem;border-radius:var(--radius-btn);border:1.5px solid ${canAdd ? 'var(--accent-btn)' : 'var(--border-glass)'};background:transparent;color:${canAdd ? 'var(--accent-btn)' : 'var(--text-muted)'};font-size:0.9375rem;font-weight:700;cursor:${canAdd ? 'pointer' : 'not-allowed'};opacity:${canAdd ? '1' : '0.45'};transition:all 0.2s;">
      <i class="fas fa-plus" style="margin-right:0.375rem;font-size:0.875rem;"></i>Add card
    </button>

    <!-- Save deck -->
    <button id="mcSaveBtn" onclick="window._mcSave()" ${!hasSave ? 'disabled' : ''}
      style="flex:1;padding:0.875rem;border-radius:var(--radius-btn);border:none;background:${hasSave ? 'var(--accent-btn)' : 'var(--bg-surface)'};color:${hasSave ? 'var(--btn-text)' : 'var(--text-muted)'};font-size:0.9375rem;font-weight:700;cursor:${hasSave ? 'pointer' : 'not-allowed'};opacity:${hasSave ? '1' : '0.45'};transition:all 0.2s;">
      Save deck
    </button>
  </div>

</div>`;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
    }

    // Save textarea values before any action that re-renders
    function _flush() {
        const f = document.getElementById('mcFrontInput');
        const b = document.getElementById('mcBackInput');
        if (f) _cards[_idx].front = f.value;
        if (b) _cards[_idx].back  = b.value;
        const t = document.getElementById('mcTitleInput');
        const s = document.getElementById('mcSubjectInput');
        if (t) window._mcTitle   = t.value;
        if (s) window._mcSubject = s.value;
    }

    // ── Live updates (typing — no re-render) ─────────────────────────────────
    window._mcLive = function (field, value) {
        _cards[_idx][field] = value;
        const canAdd  = !!(  _cards[_idx].front.trim() && _cards[_idx].back.trim());
        const hasSave = _cards.some(c => c.front.trim() && c.back.trim());

        const addBtn  = document.getElementById('mcAddBtn');
        const saveBtn = document.getElementById('mcSaveBtn');
        if (addBtn) {
            addBtn.disabled          = !canAdd;
            addBtn.style.opacity     = canAdd ? '1' : '0.45';
            addBtn.style.color       = canAdd ? 'var(--accent-btn)' : 'var(--text-muted)';
            addBtn.style.borderColor = canAdd ? 'var(--accent-btn)' : 'var(--border-glass)';
            addBtn.style.cursor      = canAdd ? 'pointer' : 'not-allowed';
        }
        if (saveBtn) {
            saveBtn.disabled        = !hasSave;
            saveBtn.style.opacity   = hasSave ? '1' : '0.45';
            saveBtn.style.background = hasSave ? 'var(--accent-btn)' : 'var(--bg-surface)';
            saveBtn.style.color      = hasSave ? 'var(--btn-text)' : 'var(--text-muted)';
            saveBtn.style.cursor     = hasSave ? 'pointer' : 'not-allowed';
        }
    };

    // ── Navigation ───────────────────────────────────────────────────────────
    window._mcNav = function (dir) {
        _flush();
        const next = _idx + dir;
        if (next < 0 || next >= _cards.length) return;
        _idx = next;
        _render();
    };

    // ── Add card ─────────────────────────────────────────────────────────────
    window._mcAdd = function () {
        _flush();
        const card = _cards[_idx];
        if (!card.front.trim() || !card.back.trim()) return;

        // If on a middle card, just advance to next
        if (_idx < _cards.length - 1) {
            _idx++;
            _render();
            return;
        }
        // Append new blank card
        _cards.push({ front: '', back: '' });
        _idx = _cards.length - 1;
        _render();
        setTimeout(() => document.getElementById('mcFrontInput')?.focus(), 60);
    };

    // ── Delete card ──────────────────────────────────────────────────────────
    window._mcDelete = function () {
        _flush();
        if (_cards.length <= 1) return;
        _cards.splice(_idx, 1);
        _idx = Math.max(0, Math.min(_idx, _cards.length - 1));
        _render();
    };

    // ── Back / exit ──────────────────────────────────────────────────────────
    window._mcBack = function () {
        _flush();
        const hasContent = _cards.some(c => c.front.trim() || c.back.trim());
        if (!hasContent) { _exit(); return; }

        // Bottom-sheet confirm instead of browser confirm()
        _showDiscardSheet();
    };

    function _showDiscardSheet() {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
        backdrop.innerHTML = `
<div style="width:100%;background:var(--bg-surface);border-radius:1.25rem 1.25rem 0 0;padding:1.5rem 1.25rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);display:flex;flex-direction:column;gap:0.75rem;">
  <p style="font-size:1rem;font-weight:700;color:var(--text-main);margin:0 0 0.25rem;">Discard deck?</p>
  <p style="font-size:0.875rem;color:var(--text-muted);margin:0 0 0.25rem;line-height:1.5;">Your cards won't be saved.</p>
  <button id="_discardYes" style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:none;background:#ef4444;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;">Discard</button>
  <button id="_discardNo"  style="width:100%;padding:0.9375rem;border-radius:var(--radius-btn);border:1px solid var(--border-glass);background:transparent;color:var(--text-main);font-size:1rem;font-weight:600;cursor:pointer;">Keep editing</button>
</div>`;
        document.body.appendChild(backdrop);
        backdrop.querySelector('#_discardYes').onclick = () => { backdrop.remove(); _exit(); };
        backdrop.querySelector('#_discardNo').onclick  = () => backdrop.remove();
        backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    }

    // ── Save deck ────────────────────────────────────────────────────────────
    window._mcSave = async function () {
        if (_saving) return;
        _flush();

        const valid = _cards.filter(c => c.front.trim() && c.back.trim());
        if (!valid.length) return;

        const title   = (window._mcTitle   || '').trim() || 'My Flashcards';
        const subject = (window._mcSubject || '').trim() || 'General';

        _saving = true;
        const btn = document.getElementById('mcSaveBtn');
        if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; btn.style.opacity = '0.65'; }

        const newQuiz = {
            id:       Date.now(),
            title,
            subject,
            favorite: false,
            source:   'manual',
            type:     'Flashcards',
            stats:    { bestScore: 0, attempts: 0, lastScore: 0 },
            questions: valid.map(c => ({
                text:        c.front.trim(),
                options:     [c.back.trim()],
                correct:     0,
                explanation: ''
            }))
        };

        // Firestore
        try {
            if (window.currentUser && window.db) {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                await setDoc(doc(window.db, 'users', window.currentUser.uid, 'quizzes', String(newQuiz.id)), newQuiz);
            }
        } catch (e) { console.warn('[ManualCreate] Firestore save error:', e); }

        // localStorage + in-memory
        const uid   = window.currentUser?.uid || 'guest';
        const store = JSON.parse(localStorage.getItem('medexcel_quizzes_' + uid) || '[]');
        store.push(newQuiz);
        localStorage.setItem('medexcel_quizzes_' + uid, JSON.stringify(store));
        window.quizzes = store;

        // XP (5 per card)
        try { await window.addXP(valid.length * 5); } catch (e) {}

        _saving = false;
        _exit();
        window.updateHomeContinueCard?.();
        window.navigateTo('view-study');

        // Toast
        setTimeout(() => {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:var(--accent-btn);color:var(--btn-text);padding:0.625rem 1.25rem;border-radius:9999px;font-size:0.875rem;font-weight:700;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            t.textContent = `${valid.length} card${valid.length !== 1 ? 's' : ''} saved`;
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2500);
        }, 350);
    };

})();
