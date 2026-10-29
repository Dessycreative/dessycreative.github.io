import { DESMOND_ROWS } from './desmond.js';
import { escapeHtml, formatResult } from './format-table.js';

const DUCKDB = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';
const MAX_RESULTS = 6;
const CHIPS = [
  'show tables;',
  'select * from desmond;',
  "select crop, round(avg(value), 1) as avg_tonnes_per_ha from agri where statistic = 'Crop Yield per Hectare' group by crop order by avg_tonnes_per_ha desc;",
];

const LOAD_TIMEOUT_MS = 15000;
const ROW_CEILING = 100000; // stop streaming a result after this many rows

// Arrow type ids (apache-arrow Type enum) that need formatting before display.
const DECIMAL = 7, DATE = 8, TIMESTAMP = 10;

async function openDatabase(state) {
  const duckdb = await import(DUCKDB);
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  );
  state.worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), state.worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  const csv = await (await fetch(new URL('data/agri.csv', document.baseURI))).text();
  await db.registerFileText('agri.csv', csv);
  const conn = await db.connect();
  await conn.query("create table agri as select * from read_csv_auto('agri.csv', header = true)");
  const q = (s) => `'${s.replaceAll("'", "''")}'`;
  await conn.query(`create table desmond (team varchar, what_i_built varchar)`);
  await conn.query(`insert into desmond values ${DESMOND_ROWS.map((r) => `(${q(r.team)}, ${q(r.what_i_built)})`).join(', ')}`);
  return conn;
}

// Shows a value the way DuckDB's own CLI would, rather than Arrow's raw encoding.
function displayValue(v, type) {
  if (v === null || v === undefined) return v;
  if (type.typeId === DECIMAL) {
    // Arrow decimals arrive unscaled: 2.25 as DECIMAL(10,2) is 225
    const digits = String(v).replaceAll('"', '');
    if (!type.scale) return digits;
    const neg = digits.startsWith('-');
    const abs = digits.replace('-', '').padStart(type.scale + 1, '0');
    return `${neg ? '-' : ''}${abs.slice(0, -type.scale)}.${abs.slice(-type.scale)}`;
  }
  if (type.typeId === DATE) return new Date(Number(v)).toISOString().slice(0, 10);
  if (type.typeId === TIMESTAMP) return new Date(Number(v)).toISOString().replace('T', ' ').replace(/(\.000)?Z$/, '');
  return v;
}

// Streams a query, keeping only the first maxRows rows so huge results can't freeze the tab.
async function runQuery(conn, sql, maxRows) {
  const reader = await conn.send(sql);
  let fields = reader.schema?.fields ?? [];
  const rows = [];
  let total = 0;
  let cutOff = false;
  for await (const batch of reader) {
    fields = batch.schema.fields;
    for (let i = 0; i < batch.numRows && rows.length < maxRows; i++) {
      const o = batch.get(i).toJSON();
      rows.push(fields.map((f) => displayValue(o[f.name], f.type)));
    }
    total += batch.numRows;
    if (total >= ROW_CEILING) { cutOff = true; break; }
  }
  if (cutOff) await conn.cancelSent();
  return { columns: fields.map((f) => f.name), rows, total, cutOff };
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms));
}

export function initTerminal(root) {
  let started = false;

  const start = async () => {
    if (started) return;
    started = true;
    root.classList.add('is-live');
    root.insertAdjacentHTML('beforeend', `
      <div class="term-chips" aria-label="Example queries">${CHIPS.map((c) =>
        `<button type="button" class="sql-chip" data-sql="${escapeHtml(c)}">${escapeHtml(c.length > 34 ? `${c.slice(0, 32)}…` : c)}</button>`).join('')}</div>
      <form class="term-form" autocomplete="off">
        <label class="sr-only" for="terminal-input">SQL query</label>
        <span class="prompt" aria-hidden="true">sql&gt;</span>
        <input id="terminal-input" type="text" spellcheck="false" disabled placeholder="loading DuckDB…">
      </form>
      <div id="terminal-output" aria-live="polite"></div>`);

    const input = root.querySelector('#terminal-input');
    const output = root.querySelector('#terminal-output');
    const form = root.querySelector('.term-form');
    const history = [];
    let cursor = 0;

    let conn;
    const state = {};
    try {
      conn = await Promise.race([openDatabase(state), timeout(LOAD_TIMEOUT_MS)]);
    } catch {
      state.worker?.terminate();
      output.innerHTML = '<p class="result error">Interactive mode unavailable in this browser.</p>';
      input.placeholder = 'unavailable';
      root.querySelector('.term-chips').remove();
      return;
    }

    const run = async (sql) => {
      sql = sql.trim();
      if (!sql) return;
      history.push(sql);
      cursor = history.length;
      const echo = `<p class="echo"><span class="prompt">sql&gt;</span> ${escapeHtml(sql)}</p>`;
      let html;
      try {
        const t0 = performance.now();
        const { columns, rows, total, cutOff } = await runQuery(conn, sql.replace(/;\s*$/, ''), 200);
        html = formatResult(columns, rows, { elapsedMs: performance.now() - t0, totalRows: total, moreThan: cutOff });
      } catch (e) {
        const msg = String(e?.message || e).split('\n')[0];
        html = `<p class="err">${escapeHtml(/error/i.test(msg) ? msg : `Error: ${msg}`)}</p>`;
      }
      output.insertAdjacentHTML('beforeend', `<div class="result">${echo}${html}</div>`);
      while (output.children.length > MAX_RESULTS) output.firstElementChild.remove();
      output.lastElementChild.scrollIntoView({ block: 'nearest' });
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sql = input.value;
      input.value = '';
      run(sql);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && cursor > 0) input.value = history[--cursor];
      else if (e.key === 'ArrowDown') {
        cursor = Math.min(history.length, cursor + 1);
        input.value = history[cursor] ?? '';
      } else return;
      e.preventDefault();
    });
    root.querySelector('.term-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.sql-chip');
      if (chip) run(chip.dataset.sql);
    });

    input.disabled = false;
    input.placeholder = 'type a query and press Enter';
    input.focus();
  };

  root.addEventListener('click', (e) => { if (!e.target.closest('a')) start(); });
  root.addEventListener('keydown', (e) => {
    if (e.target === root && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); start(); }
  });
}
