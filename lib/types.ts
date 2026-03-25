export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface MetricTableColumn {
  key: string
  label: string
  unit?: string
  type?: 'text' | 'url' | 'number' | 'percent'
}

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
  historicalData?: TimeSeriesPoint[] | null
  // For table-style metrics (e.g. top queries, top pages, countries)
  tableData?: Array<Record<string, string | number>>
  tableColumns?: MetricTableColumn[]
  // Hint for special rendering ('numeric' default, 'table', 'cwv', 'info')
  metricType?: 'numeric' | 'table' | 'cwv' | 'info'
  // For CWV metrics — per-vital status
  cwvData?: {
    lcp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
    cls?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
    inp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
    fcp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
    ttfb?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
    overallCategory?: 'FAST' | 'AVERAGE' | 'SLOW'
  }
}

export type DateRangePreset = '7d' | '14d' | '30d' | '90d' | 'ytd' | 'custom'

export interface DateRange {
  preset: DateRangePreset
  startDate: string // ISO YYYY-MM-DD
  endDate: string   // ISO YYYY-MM-DD
}
