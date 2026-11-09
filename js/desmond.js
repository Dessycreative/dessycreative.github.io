export const HERO_QUERY = 'select team, what_i_built from desmond;';

export const DESMOND_COLUMNS = ['team', 'what_i_built'];

export const DESMOND_ROWS = [
  { team: 'Finance', what_i_built: 'P&L reporting, reconciled to the ledger', target: '#step-test' },
  { team: 'Commercial', what_i_built: 'Live trading screen vs same day last week', target: '#step-serve' },
  { team: 'Operations', what_i_built: 'Weekly Excel reports replaced by a Power BI app', target: '#step-source' },
  { team: 'Stock', what_i_built: 'Physical vs system stock, 0.10% variance', target: '#step-reconcile' },
];
