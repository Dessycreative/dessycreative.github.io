function countUp(el, durationMs) {
  const target = Number(el.dataset.total);
  const fmt = (v) => v.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const t0 = performance.now();
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / durationMs);
    el.textContent = fmt(target * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Marks each .step as done (its end state) once it scrolls into view.
export function initPipeline(root, { reducedMotion }) {
  const steps = [...root.querySelectorAll('.step')];
  if (reducedMotion || !('IntersectionObserver' in window)) {
    steps.forEach((s) => s.classList.add('is-done'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-done');
      e.target.querySelectorAll('.count').forEach((el) => countUp(el, 1200));
      io.unobserve(e.target);
    }
  }, { threshold: 0.4 });
  steps.forEach((s) => io.observe(s));
}
