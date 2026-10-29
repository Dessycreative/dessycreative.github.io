export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function cell(v) {
  if (v === null || v === undefined) return '<td class="null">NULL</td>';
  return `<td>${escapeHtml(typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? String(x) : x)) : v)}</td>`;
}

// Renders a query result as an escaped HTML table, capped at maxRows.
// totalRows is the full row count when only the first rows were fetched;
// moreThan marks it as a lower bound because the query was cut off.
export function formatResult(columns, rows, { maxRows = 200, elapsedMs, totalRows = rows.length, moreThan = false } = {}) {
  const shown = rows.slice(0, maxRows);
  const head = columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join('');
  const body = shown.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('');
  const plus = moreThan ? '+' : '';
  const more = totalRows > shown.length ? `<p class="term-more">… ${totalRows - shown.length}${plus} more rows</p>` : '';
  const count = `${totalRows}${plus} ${totalRows === 1 && !moreThan ? 'row' : 'rows'}`;
  const timing = elapsedMs === undefined ? '' : ` · ${Math.round(elapsedMs)} ms`;
  return `<div class="term-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${more}<p class="term-foot">${count}${timing}</p>`;
}
