// Polyfill for global
window.global = window;
window.process = {
  env: { DEBUG: undefined },
  version: '',
  nextTick: (cb: () => void) => setTimeout(cb, 0)
};