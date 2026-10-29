import { escapeHtml } from './format-table.js';

// A fictional toy: two orders have split deliveries, so a naive join double-counts them.
export const PUZZLE = {
  orders: [
    { order_id: 101, customer: 'Bakery', amount: 120 },
    { order_id: 102, customer: 'Café', amount: 80 },
    { order_id: 103, customer: 'Hotel', amount: 200 },
  ],
  deliveries: [
    { delivery_id: 'D1', order_id: 101 },
    { delivery_id: 'D2', order_id: 101 },
    { delivery_id: 'D3', order_id: 102 },
    { delivery_id: 'D4', order_id: 103 },
    { delivery_id: 'D5', order_id: 103 },
  ],
  choices: [
    { id: 'fx', label: 'A currency conversion was applied twice', isCorrect: false },
    { id: 'fanout', label: 'Orders were joined to deliveries, and some orders have two deliveries', isCorrect: true },
    { id: 'filter', label: 'Cancelled orders were not filtered out', isCorrect: false },
  ],
};

// Sum of order amounts after joining to deliveries at the given grain:
// 'delivery' joins raw delivery rows (fans out); 'order' collapses deliveries to one row per order first.
export function joinTotal(orders, deliveries, grain) {
  const keys = grain === 'order'
    ? [...new Set(deliveries.map((d) => d.order_id))]
    : deliveries.map((d) => d.order_id);
  return keys.reduce((sum, id) => sum + (orders.find((o) => o.order_id === id)?.amount ?? 0), 0);
}

export function checkAnswer(choiceId) {
  const choice = PUZZLE.choices.find((c) => c.id === choiceId);
  const ledger = joinTotal(PUZZLE.orders, PUZZLE.deliveries, 'order');
  if (choice?.isCorrect) {
    return {
      correct: true,
      explanation: `Orders 101 and 103 each have two deliveries, so their amounts were counted twice. Collapse deliveries to one row per order before joining and the report matches the ledger: €${ledger}. Reconciled ✓`,
    };
  }
  return {
    correct: false,
    explanation: 'Not quite. Every order is in euro and none are cancelled. Look at how many deliveries each order has.',
  };
}

function table(rows) {
  const cols = Object.keys(rows[0]);
  return `<table><thead><tr>${cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function mountPuzzle(root) {
  const report = joinTotal(PUZZLE.orders, PUZZLE.deliveries, 'delivery');
  const ledger = joinTotal(PUZZLE.orders, PUZZLE.deliveries, 'order');
  root.innerHTML = `
    <div class="puzzle-tables">
      <div><p class="puzzle-cap">orders</p><div class="term-scroll">${table(PUZZLE.orders)}</div></div>
      <div><p class="puzzle-cap">deliveries</p><div class="term-scroll">${table(PUZZLE.deliveries)}</div></div>
    </div>
    <div class="totals puzzle-totals"><p>Ledger<b>€${ledger}</b></p><p>Report<b class="bad">€${report}</b></p></div>
    <p class="puzzle-q">The report says €${report}. The ledger says €${ledger}. What broke?</p>
    <div class="choices">${PUZZLE.choices.map((c) =>
      `<button type="button" class="choice" data-id="${c.id}" data-correct="${c.isCorrect}">${escapeHtml(c.label)}</button>`).join('')}</div>
    <p id="puzzle-feedback" aria-live="polite"></p>
    <p class="stage-cap">Toy data, made up for the puzzle.</p>`;

  const feedback = root.querySelector('#puzzle-feedback');
  const reportTotal = root.querySelector('.puzzle-totals p:nth-child(2) b');
  root.querySelector('.choices').addEventListener('click', (e) => {
    const btn = e.target.closest('.choice');
    if (!btn) return;
    const { correct, explanation } = checkAnswer(btn.dataset.id);
    feedback.textContent = explanation;
    feedback.className = correct ? 'ok' : 'err';
    // the report total reflects the current answer: fixed if right, still fanned out if not
    reportTotal.textContent = `€${correct ? ledger : report}`;
    reportTotal.classList.toggle('bad', !correct);
    reportTotal.classList.toggle('good', correct);
    for (const c of root.querySelectorAll('.choice')) c.setAttribute('aria-pressed', String(c === btn));
  });
}
