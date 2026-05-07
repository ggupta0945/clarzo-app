// Shared types for the Mutual Fund segment. Mirrors the column shape of
// mf_schemes / mf_returns so RSC pages and components stay in lock-step.

export type MfPlan = 'Direct' | 'Regular'
export type MfOption = 'Growth' | 'IDCW'

export type MfScheme = {
  scheme_code: string
  isin_growth: string | null
  isin_div_reinvestment: string | null
  scheme_name: string
  amc: string | null
  amc_full_name: string | null
  category: string | null
  sub_category: string | null
  plan_type: MfPlan | null
  option_type: MfOption | null
  scheme_type: string | null
  benchmark: string | null
  fund_manager: string | null
  inception_date: string | null
  expense_ratio: number | null
  aum_crores: number | null
  min_investment: number | null
  min_sip: number | null
  exit_load: string | null
  riskometer: string | null
  objective: string | null
  is_active: boolean
}

export type MfReturns = {
  scheme_code: string
  return_1m: number | null
  return_3m: number | null
  return_6m: number | null
  return_1y: number | null
  return_3y: number | null
  return_5y: number | null
  return_10y: number | null
  return_si: number | null
  benchmark_1y: number | null
  benchmark_3y: number | null
  benchmark_5y: number | null
  benchmark_10y: number | null
  alpha_5y: number | null
  category_rank_1y: number | null
  category_rank_3y: number | null
  category_rank_5y: number | null
  category_size_1y: number | null
  category_size_3y: number | null
  category_size_5y: number | null
  beats_benchmark_5y: boolean | null
  beats_benchmark_10y: boolean | null
  beats_benchmark_15y: boolean | null
  computed_at: string | null
}

export type MfSchemeWithReturns = MfScheme & {
  returns: MfReturns | null
}

export type NavPoint = {
  nav_date: string  // ISO yyyy-mm-dd
  nav: number
}

export type MfAlert = {
  id: string
  scheme_code: string
  alert_type:
    | 'manager_change'
    | 'category_change'
    | 'name_change'
    | 'objective_change'
    | 'asset_mix_shift'
    | 'amc_change'
  prev_value: string | null
  new_value: string | null
  detected_at: string
  message: string | null
}

export type NewsItem = {
  title: string
  link: string
  source: string
  published_at: string  // ISO
}
