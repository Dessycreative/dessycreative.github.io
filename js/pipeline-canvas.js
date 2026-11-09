// Draws the pipeline animation on a canvas: rows flow from sources into a star schema,
// bad rows drop out, two totals reconcile, then everything stacks into a bar chart.
// render(p) takes progress 0..5; each unit is one step.

import { stepEase } from './pipeline-scroll.js';

const DIMS = ['dim_date', 'dim_product', 'dim_site', 'dim_customer'];
const SOURCE_NAMES = ['ERP', 'Stock counts', 'Sales'];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const col = (c) => `rgb(${c.join(',')})`;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function mix(a, b, t) {
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}

// N items laid out in a grid of `cols` columns, centred in a box of width w.
function grid(n, x, y, w, cols, gap) {
  return Array.from({ length: n }, (_, i) => ({
    x: x + (i % cols) * gap + gap / 2 + (w - cols * gap) / 2,
    y: y + Math.floor(i / cols) * gap + gap / 2,
  }));
}

function readColours() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const light = v('--bg') === '#f5f8f6';
  return {
    accent: rgb(v('--accent')), cyan: rgb(v('--accent2')), red: rgb(v('--bad')),
    amber: rgb(light ? '#a96b00' : '#f5b942'),
    ink: v('--ink'), muted: v('--muted'), soft: v('--soft'), line: v('--line2'),
  };
}

export function createPipelineAnimation(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dots = [], s = {}, C = readColours();

  function build() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    C = readColours();

    const rand = mulberry32(7);
    const small = W < 520;
    const N = small ? 140 : 260;
    const gap = small ? 9 : 11;

    // ~60% fact rows, the rest spread over 4 dims; ~7% of fact rows are bad
    dots = Array.from({ length: N }, (_, i) => {
      const role = i < N * 0.6 ? 'fact' : DIMS[i % 4];
      return { src: i % 3, role, bad: role === 'fact' && rand() < 0.07, stagger: rand(), jitter: rand() };
    });

    // L0: off-canvas on the side of the row's source; L1: messy landing zone
    const L0 = dots.map((d) => {
      if (d.src === 0) return { x: -40 - rand() * 200, y: rand() * H };
      if (d.src === 1) return { x: rand() * W, y: -40 - rand() * 200 };
      return { x: W + 40 + rand() * 200, y: rand() * H };
    });
    const L1 = dots.map(() => ({ x: W * (0.15 + rand() * 0.7), y: H * (0.22 + rand() * 0.62) }));

    // L2: star schema, fact block in the centre and a dim in each corner
    const idsOf = (role) => dots.map((d, i) => (d.role === role ? i : -1)).filter((i) => i >= 0);
    const L2 = new Array(N);
    const boxes = {};
    const factIdx = idsOf('fact');
    const factCols = Math.ceil(Math.sqrt(factIdx.length * 1.4));
    const fw = factCols * gap, fh = Math.ceil(factIdx.length / factCols) * gap;
    boxes.fact = { x: W / 2 - fw / 2, y: H / 2 - fh / 2, w: fw, h: fh };
    grid(factIdx.length, boxes.fact.x, boxes.fact.y, fw, factCols, gap).forEach((p, k) => { L2[factIdx[k]] = p; });
    const corners = [[0.17, 0.2], [0.83, 0.2], [0.17, 0.8], [0.83, 0.8]];
    DIMS.forEach((name, k) => {
      const idx = idsOf(name);
      const cols = Math.ceil(Math.sqrt(idx.length));
      const bw = cols * gap, bh = Math.ceil(idx.length / cols) * gap;
      boxes[name] = { x: W * corners[k][0] - bw / 2, y: H * corners[k][1] - bh / 2, w: bw, h: bh };
      grid(idx.length, boxes[name].x, boxes[name].y, bw, cols, gap).forEach((p, j) => { L2[idx[j]] = p; });
    });

    // L4: ledger and report stacks of equal size; L5: a six-bar chart
    const good = dots.map((d, i) => (d.bad ? -1 : i)).filter((i) => i >= 0);
    const half = Math.ceil(good.length / 2);
    const sCols = small ? 6 : 8;
    const baseY = H * 0.78;
    const L4 = new Array(N);
    [W * 0.32, W * 0.68].forEach((cx, side) => {
      good.slice(side * half, (side + 1) * half).forEach((di, k) => {
        L4[di] = { x: cx - (sCols * gap) / 2 + (k % sCols) * gap + gap / 2, y: baseY - Math.floor(k / sCols) * gap - gap / 2 };
      });
    });
    const heights = [0.45, 0.7, 0.55, 0.9, 0.75, 1];
    const sum = heights.reduce((a, b) => a + b, 0);
    const counts = heights.map((h) => Math.round((h / sum) * good.length));
    counts[5] += good.length - counts.reduce((a, b) => a + b, 0);
    const bCols = small ? 3 : 4, bGap = (W * 0.76) / 6;
    const L5 = new Array(N);
    let k = 0;
    counts.forEach((cnt, b) => {
      const cx = W * 0.12 + bGap * b + bGap / 2;
      for (let j = 0; j < cnt; j++, k++) {
        L5[good[k]] = { x: cx - (bCols * gap) / 2 + (j % bCols) * gap + gap / 2, y: baseY - Math.floor(j / bCols) * gap - gap / 2 };
      }
    });
    // bad rows fall out of the bottom from their place in the star
    dots.forEach((d, i) => {
      if (d.bad) L4[i] = L5[i] = { x: L2[i].x + (d.jitter - 0.5) * 60, y: H + 60 };
    });

    dots.forEach((d, i) => { d.L = [L0[i], L1[i], L2[i], L2[i], L4[i], L5[i]]; });
    s = { R: small ? 2.6 : 3.2, boxes, baseY, stackH: Math.ceil(half / sCols) * gap, small };
  }

  function label(text, x, y, colour, size = 11, align = 'center') {
    ctx.font = `${size}px 'Space Mono', monospace`;
    ctx.fillStyle = colour; ctx.textAlign = align; ctx.fillText(text, x, y);
  }

  function colourFor(d, p) {
    const source = [C.accent, C.cyan, C.amber][d.src];
    const role = d.role === 'fact' ? C.accent : C.cyan;
    if (d.bad && p > 2) return mix(C.accent, C.red, clamp((p - 2) * 3));
    if (p > 4) return mix(role, C.accent, ease(clamp(p - 4)));
    return mix(source, role, ease(clamp(p - 1)));
  }

  function render(p, now = performance.now()) {
    const seg = Math.min(4, Math.floor(p));
    const t = p - seg;
    const { R, boxes } = s;
    ctx.clearRect(0, 0, W, H);

    const srcA = 1 - clamp((p - 1) * 2);
    if (srcA > 0) {
      ctx.globalAlpha = srcA;
      label(`← ${SOURCE_NAMES[0]}`, 16, 28, col(C.accent), 11, 'left');
      label(`${SOURCE_NAMES[1]} ↓`, W / 2, 28, col(C.cyan));
      label(`${SOURCE_NAMES[2]} →`, W - 16, 28, col(C.amber), 11, 'right');
    }

    const starA = clamp((p - 1.2) * 2) * (1 - clamp((p - 3.05) * 3));
    if (starA > 0) {
      const f = boxes.fact;
      const fc = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
      const cyan = col(C.cyan);
      DIMS.forEach((name) => {
        const b = boxes[name];
        const left = b.x + b.w / 2 < fc.x, up = b.y + b.h / 2 < fc.y;
        const sx = left ? f.x - 6 : f.x + f.w + 6, sy = up ? f.y - 6 : f.y + f.h + 6;
        const ex = left ? b.x + b.w + 6 : b.x - 6, ey = up ? b.y + b.h + 6 : b.y - 6;
        const drawn = clamp((p - 1.1) * 1.7);
        ctx.globalAlpha = starA * 0.55; ctx.strokeStyle = cyan; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ex, drawn), lerp(sy, ey, drawn)); ctx.stroke();
        ctx.globalAlpha = starA; ctx.strokeStyle = C.line;
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
        label(name, b.x + b.w / 2, b.y - 12, cyan);
      });
      ctx.strokeStyle = C.line; ctx.strokeRect(f.x - 6, f.y - 6, f.w + 12, f.h + 12);
      label('fact_sales', fc.x, f.y - 12, col(C.accent));
    }

    const testA = clamp((p - 2) * 4) * (1 - clamp((p - 3.2) * 4));
    if (testA > 0) {
      ctx.globalAlpha = testA;
      const fixed = p > 2.5;
      label(fixed ? '✓ fx_rate_applied_once: fixed' : '✗ fx_rate_applied_once: 7% of rows fail',
        W / 2, H - 22, col(fixed ? C.accent : C.red), s.small ? 11 : 12);
    }

    for (const d of dots) {
      let alpha = d.bad && p > 3 ? 1 - clamp((p - 3) * 2) : 1;
      if (alpha <= 0) continue;
      const a = d.L[seg], b = d.L[seg + 1];
      const tt = stepEase(t, d.stagger);
      let x = lerp(a.x, b.x, tt);
      const y = lerp(a.y, b.y, tt);
      if (p < 2) x += Math.sin(now / 600 + d.jitter * 9) * 2 * (1 - clamp(p - 1)); // restless until modelled
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colourFor(d, p);
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    }

    const recA = clamp((p - 3.2) * 3) * (1 - clamp((p - 4.15) * 4));
    if (recA > 0) {
      ctx.globalAlpha = recA;
      const k = ease(clamp((p - 3.25) / 0.45));
      const top = s.baseY - s.stackH - 26;
      const fmt = (v) => v.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const big = s.small ? 15 : 20;
      label('Ledger', W * 0.32, top - 22, C.muted);
      label(fmt(1000), W * 0.32, top, C.ink, big);
      label('Report', W * 0.68, top - 22, C.muted);
      label(fmt(1000 * k), W * 0.68, top, C.ink, big);
      if (k > 0.98) label('✓ variance 0.00', W / 2, H * 0.18, col(C.accent), s.small ? 14 : 18);
    }

    const chartA = clamp((p - 4.3) * 3);
    if (chartA > 0) {
      ctx.globalAlpha = chartA;
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.moveTo(W * 0.1, s.baseY + 2); ctx.lineTo(W * 0.9, s.baseY + 2); ctx.stroke();
      for (let i = 0; i < 6; i++) label(`Wk ${i + 1}`, W * 0.12 + ((W * 0.76) / 6) * (i + 0.5), s.baseY + 20, C.soft, 10);
      label('sem_sales → Power BI', W / 2, H * 0.14, col(C.accent), s.small ? 13 : 16);
    }
    ctx.globalAlpha = 1;
  }

  build();
  return { build, render };
}
