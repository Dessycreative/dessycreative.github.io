export const HERO_QUERY = 'select team, what_i_built from desmond;';

export const DESMOND_COLUMNS = ['team', 'what_i_built'];

export const DESMOND_ROWS = [
  { team: 'Finance', what_i_built: 'P&L star schema, reconciled to the ledger', target: '#step-test' },
  { team: 'Procurement', what_i_built: 'Direct Lake model with time intelligence', target: '#step-serve' },
  { team: 'Operations', what_i_built: 'Physical vs system stock, 0.10% variance', target: '#step-reconcile' },
  { team: 'Farm labour', what_i_built: '806-measure audit → ~100 in use', target: '#step-serve' },
];
