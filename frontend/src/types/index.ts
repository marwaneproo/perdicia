export interface Dataset {
  id: number
  name: string
  filename: string
  rows: number
  columns: number
  is_demo: number
  sheet_name?: string | null
  created_at: string
}

export interface ColumnInfo { name: string; dtype: string; missing: number; unique: number; outliers_iqr?: number; potential_identifier?: boolean; numeric_summary?: { min: number; max: number; mean: number; median: number } }
export interface Quality {
  rows: number; columns: number; missing_values: number; missing_pct: number
  duplicate_rows: number; score: number; column_info: ColumnInfo[]
}
export interface Kpi { key: string; label: string; value: number; format: 'currency' | 'number' | 'percent' }
export interface ChartSpec {
  id: string
  type: 'line' | 'bar' | 'pie' | 'scatter'
  layout?: 'vertical'
  title: string
  reason?: string
  xLabel?: string
  yLabel?: string
  xKey: string
  yKeys: string[]
  data: Record<string, number | string | null>[]
}
export interface Analysis {
  dataset: Dataset
  quality: Quality
  detected_columns: Record<string, string>
  derived: string[]
  kpis: Kpi[]
  filters: { categories: string[]; category_label?: string; date_min: string | null; date_max: string | null }
  filtered_rows: number
  charts: ChartSpec[]
  notes: string[]
}
export interface Preview {
  dataset: Dataset
  quality: Quality
  detected_columns: Record<string, string>
  derived: string[]
  selected_sheet?: string | null
  columns: string[]
  rows: (string | number | null)[][]
}
export interface Insight { type: 'fact' | 'recommendation'; title: string; text: string; severity: 'info' | 'positive' | 'warning' }
export interface ForecastResult {
  available: boolean
  reason?: string
  method: string
  history_months?: number
  validation?: { periods: number; mae: number; mape_pct: number | null }
  data?: { month: string; actual: number | null; forecast: number | null }[]
  forecast?: { month: string; forecast: number }[]
}
export interface Plan { id: 'starter' | 'pro' | 'business'; name: string; price: number; popular?: boolean; features: string[] }
