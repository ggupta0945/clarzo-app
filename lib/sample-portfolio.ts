// Seed for the "Try with sample portfolio" activation path. A realistic
// ~₹8L Indian retail portfolio across IT, banks, energy, FMCG, pharma,
// industrials and an ETF — deliberately mixed so the dashboard's insights,
// rebalancer, and tax snapshot have something to chew on:
//
// - HDFCBANK + ICICIBANK (~24% of book) → triggers concentration insight
// - HINDUNILVR sitting on a loss → tax-loss harvesting candidate
// - KEI as the lone small/mid-cap → small-cap tilt insight
// - NIFTYBEES → asset-class diversification surface
//
// Prices are snapshots used as the initial current_price; the live stock
// price feed refreshes them on first dashboard view, so being slightly off
// is fine — the relative shape (winners/losers/concentration) is what
// matters for the demo experience.

export type SampleHolding = {
  isin: string
  scheme_name: string
  asset_type: 'stock'
  units: number
  avg_cost: number
  current_price: number
}

export const SAMPLE_PORTFOLIO: readonly SampleHolding[] = [
  {
    isin: 'INE467B01029',
    scheme_name: 'TCS',
    asset_type: 'stock',
    units: 50,
    avg_cost: 3400,
    current_price: 3800,
  },
  {
    isin: 'INE040A01034',
    scheme_name: 'HDFCBANK',
    asset_type: 'stock',
    units: 80,
    avg_cost: 1500,
    current_price: 1700,
  },
  {
    isin: 'INE090A01021',
    scheme_name: 'ICICIBANK',
    asset_type: 'stock',
    units: 60,
    avg_cost: 1000,
    current_price: 1200,
  },
  {
    isin: 'INE002A01018',
    scheme_name: 'RELIANCE',
    asset_type: 'stock',
    units: 50,
    avg_cost: 2500,
    current_price: 2800,
  },
  {
    isin: 'INE030A01027',
    scheme_name: 'HINDUNILVR',
    asset_type: 'stock',
    units: 40,
    avg_cost: 2500,
    current_price: 2400,
  },
  {
    isin: 'INE044A01036',
    scheme_name: 'SUNPHARMA',
    asset_type: 'stock',
    units: 60,
    avg_cost: 1200,
    current_price: 1650,
  },
  {
    isin: 'INE878B01027',
    scheme_name: 'KEI',
    asset_type: 'stock',
    units: 25,
    avg_cost: 3800,
    current_price: 4100,
  },
  {
    isin: 'INF732E01037',
    scheme_name: 'NIFTYBEES',
    asset_type: 'stock',
    units: 150,
    avg_cost: 230,
    current_price: 260,
  },
] as const
