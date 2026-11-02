import { createPipelineAnimation } from './pipeline-canvas.js';
import { progressFor, activeStep, scrollYForStep } from './pipeline-scroll.js';

// Turns the plain list of five steps into a pinned, scroll-driven animation.
// Without JS or under reduced motion the plain list stays as it is.
export function initPipeline(root, { reducedMotion }) {
  const pipe = root.querySelector('.pipe');
  const holder = root.querySelector('.pipe-canvas');
  if (reducedMotion || !pipe || !holder) return;

  root.classList.add('is-scrolly');
  holder.hidden = false;
  const steps = [...root.querySelectorAll('.step')];
  const bar = holder.querySelector('.pipe-bar');
  const anim = createPipelineAnimation(holder.querySelector('canvas'));

  let visible = false;
  let frame = 0;
  const tick = (now) => {
    const p = progressFor(pipe.getBoundingClientRect().top, pipe.offsetHeight, innerHeight);
    anim.render(p, now);
    const on = activeStep(p);
    steps.forEach((el, i) => el.classList.toggle('on', i === on));
    bar.style.width = `${(p / 5) * 100}%`;
    frame = visible ? requestAnimationFrame(tick) : 0;
  };
  // only animate while the section is on screen
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !frame) frame = requestAnimationFrame(tick);
  }).observe(pipe);
  tick(performance.now());

  addEventListener('resize', () => anim.build());
  new MutationObserver(() => anim.build()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => anim.build());

  // #step-… links scroll to the point in the animation where that step is showing
  const goTo = (id, behavior) => {
    const i = steps.findIndex((el) => el.id === id);
    if (i < 0) return false;
    const top = pipe.getBoundingClientRect().top + scrollY;
    scrollTo({ top: scrollYForStep(top, pipe.offsetHeight, innerHeight, i), behavior });
    return true;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#step-"]');
    if (a && goTo(a.getAttribute('href').slice(1), 'smooth')) {
      e.preventDefault();
      history.replaceState(null, '', a.getAttribute('href'));
    }
  });
  if (location.hash.startsWith('#step-')) goTo(location.hash.slice(1), 'instant');
}
