// Scroll maths for the pinned pipeline animation. Progress runs 0..5, one unit per step.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// rectTop: the pipe's top relative to the viewport (getBoundingClientRect().top).
export function progressFor(rectTop, height, viewportHeight) {
  const span = height - viewportHeight;
  return clamp(-rectTop / span, 0, 1) * 5;
}

export function activeStep(progress) {
  return Math.min(4, Math.floor(progress));
}

// Page scroll position that shows step i, in the settled part after its animation has played.
export function scrollYForStep(pipeTop, height, viewportHeight, i) {
  return pipeTop + ((i + 0.8) / 5) * (height - viewportHeight);
}

const MAX_DELAY = 0.25;
const MOVE = 0.45; // MAX_DELAY + MOVE = 0.7: every dot has arrived by 70% of the step

// How far a dot with the given stagger (0..1) has travelled within a step, 0..1, eased.
export function stepEase(t, stagger) {
  const x = clamp((t - stagger * MAX_DELAY) / MOVE, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
