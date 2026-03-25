// Input handler — keyboard + touch
const Input = (() => {
  const keys = {};

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    // Prevent page scroll on arrow keys / space
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  // Touch buttons
  function bindTouch(id, code) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; }, { passive: false });
    el.addEventListener('touchend',  e => { e.preventDefault(); keys[code] = false; }, { passive: false });
    el.addEventListener('touchcancel', e => { e.preventDefault(); keys[code] = false; }, { passive: false });
    // Mouse fallback for testing on desktop
    el.addEventListener('mousedown', e => { e.preventDefault(); keys[code] = true; });
    el.addEventListener('mouseup',   e => { e.preventDefault(); keys[code] = false; });
  }

  bindTouch('btn-left',  'ArrowLeft');
  bindTouch('btn-right', 'ArrowRight');
  bindTouch('btn-jump',  'Space');

  return {
    isDown(code) { return !!keys[code]; },
    left()  { return !!(keys['ArrowLeft']  || keys['KeyA']); },
    right() { return !!(keys['ArrowRight'] || keys['KeyD']); },
    jump()  { return !!(keys['Space'] || keys['ArrowUp'] || keys['KeyW']); },
    enter() { return !!(keys['Enter'] || keys['Space']); },
    clearEnter() { keys['Enter'] = false; keys['Space'] = false; },
  };
})();
