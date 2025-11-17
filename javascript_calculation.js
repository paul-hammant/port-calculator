// javascript_calculation.js
// Adds a textfield that mirrors the URL hash and triggers recalculation as you type.
// Debounced input handler so typing isn't too hot. Uses any existing calculation
// function if available (see notes below), otherwise falls back to a simple algorithm.

// Debounce helper
function debounce(fn, wait) {
  let t;
  const wrapper = function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
  wrapper.cancel = () => clearTimeout(t);
  return wrapper;
}

// Fallback algorithm: deterministic numeric port in 1024-65535 range based on word
function fallbackWordToPort(word) {
  if (!word) return '';
  // simple hash-like algorithm
  let h = 2166136261 >>> 0;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Map to the typical port range (1024 - 65535)
  const min = 1024;
  const max = 65535;
  const port = min + (h % (max - min + 1));
  return String(port);
}

// Helper to format and display port(s)
function showResult(text) {
  const el = document.getElementById('result');
  if (el) el.textContent = text;
}

// Try to call existing calculator functions if repo already provides them.
// The script will attempt the following function names (in order):
//  - window.calculate(word)        // common name
//  - window.calculatePorts(word)   // alternative
//  - window.computePortFromWord(word)
// If none exist, use fallbackWordToPort.
function calculateAndShow(word) {
  word = (word || '').trim();
  // If there is an existing function exposed globally, prefer it
  try {
    if (typeof window.calculate === 'function') {
      const out = window.calculate(word);
      showResult(String(out));
      return;
    } else if (typeof window.calculatePorts === 'function') {
      const out = window.calculatePorts(word);
      showResult(String(out));
      return;
    } else if (typeof window.computePortFromWord === 'function') {
      const out = window.computePortFromWord(word);
      showResult(String(out));
      return;
    }
  } catch (err) {
    // If existing function throws, fall back to internal algorithm and show error in console
    console.error('Existing calculate function failed, falling back:', err);
  }
  // fallback
  const port = fallbackWordToPort(word);
  showResult(port ? port : '—');
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('wordInput');
  if (!input) return;

  // Read initial hash and put it into the input (decode)
  const hash = (location.hash && decodeURIComponent(location.hash.slice(1))) || '';
  if (hash) input.value = hash;

  // Initial calculation (either from input or from hash)
  calculateAndShow(input.value || hash);

  // Update the location hash without reloading and recalc on input (debounced)
  const debouncedHandler = debounce(() => {
    const val = input.value.trim();
    // Keep URL hash in sync but don't create a navigation entry (use replaceState)
    try {
      if (val) {
        history.replaceState(null, '', '#' + encodeURIComponent(val));
      } else {
        // remove hash
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) {
      // ignore if history is not available, fallback to assigning location.hash (won't reload)
      if (val) location.hash = encodeURIComponent(val);
      else location.hash = '';
    }
    calculateAndShow(val);
  }, 200);

  input.addEventListener('input', debouncedHandler);

  // Also respond to Enter immediately
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      debouncedHandler.cancel && debouncedHandler.cancel(); // if available
      // call immediate update
      const val = input.value.trim();
      try {
        if (val) history.replaceState(null, '', '#' + encodeURIComponent(val));
        else history.replaceState(null, '', location.pathname + location.search);
      } catch (err) {
        if (val) location.hash = encodeURIComponent(val);
        else location.hash = '';
      }
      calculateAndShow(val);
    }
  });

  // If the user manually changes the hash (e.g. pastes a url with #word), respond to it
  window.addEventListener('hashchange', () => {
    const newWord = (location.hash && decodeURIComponent(location.hash.slice(1))) || '';
    if (document.activeElement !== input) {
      input.value = newWord;
      calculateAndShow(newWord);
    }
  });
});
