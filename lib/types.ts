export interface Metric {
  key: string
  label: string
  value: number
  previous?: number
  unit: string
  deltaPercent?: number
  trend?: 'up' | 'down' | 'stable'
  // For Feature 6 (forecasting)
  forecast?: number[]
  forecastConfidenceHigh?: number[]
  forecastConfidenceLow?: number[]
}

export type DateRangePreset = '7d' | '14d' | '30d' | '90d' | 'ytd' | 'custom'

export interface DateRange {
  preset: DateRangePreset
  startDate: string // ISO YYYY-MM-DD
  endDate: string   // ISO YYYY-MM-DD
}
