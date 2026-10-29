// Types `text` into `el` one character at a time over ~durationMs.
export function typeQuery(el, text, { reducedMotion, durationMs = 1500 }) {
  if (reducedMotion) {
    el.textContent = text;
    return Promise.resolve();
  }
  const step = durationMs / text.length;
  el.textContent = '';
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, step);
      else resolve();
    };
    setTimeout(tick, step);
  });
}
