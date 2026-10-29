import { HERO_QUERY } from './desmond.js';
import { typeQuery } from './typing.js';
import { initTerminal } from './terminal.js';
import { initPipeline } from './pipeline.js';
import { initStack } from './stack.js';
import { mountPuzzle } from './puzzle.js';
import { mountCrash } from './crash.js';

const root = document.documentElement;
root.classList.add('js');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initTheme() {
  const btn = document.querySelector('.theme');
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (saved) root.dataset.theme = saved;
  btn?.addEventListener('click', () => {
    const current = root.dataset.theme
      || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    root.dataset.theme = current === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  });
}

async function initHero() {
  const hero = document.querySelector('#hero');
  const query = document.querySelector('#hero-query');
  if (!hero || !query || reducedMotion) return;
  hero.classList.add('is-typing');
  await typeQuery(query, HERO_QUERY, { reducedMotion });
  hero.classList.remove('is-typing');
}

// Runs init(el) for each section that exists on the page.
function mount(selector, init) {
  const el = document.querySelector(selector);
  if (el) init(el);
}

initTheme();
initHero();
mount('#terminal', (el) => initTerminal(el));
mount('#work', (el) => initPipeline(el, { reducedMotion }));
mount('#stack', (el) => initStack(el, { reducedMotion }));
mount('#puzzle', (el) => mountPuzzle(el));
mount('#crash-trigger', (el) => mountCrash(el, { reducedMotion }));
