import type { Metric } from './types'

export type SortKey = 'value' | 'trend' | 'name' | 'delta'
export type SortDir = 'asc' | 'desc'

export interface MetricPrefs {
  sortKey: SortKey
  sortDir: SortDir
}

const DEFAULT: MetricPrefs = { sortKey: 'value', sortDir: 'desc' }

export function loadMetricPrefs(projectId: string): MetricPrefs {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(`metricPrefs:${projectId}`)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveMetricPrefs(projectId: string, prefs: MetricPrefs) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`metricPrefs:${projectId}`, JSON.stringify(prefs))
  } catch {
    console.error('Failed to save metric preferences')
  }
}

export function sortMetrics(metrics: Metric[], prefs: MetricPrefs): Metric[] {
  const sorted = [...metrics].sort((a, b) => {
    let cmp = 0

    if (prefs.sortKey === 'value') {
      cmp = Number(a.value) - Number(b.value)
    } else if (prefs.sortKey === 'name') {
      cmp = a.label.localeCompare(b.label)
    } else if (prefs.sortKey === 'delta') {
      cmp = (a.deltaPercent ?? 0) - (b.deltaPercent ?? 0)
    } else if (prefs.sortKey === 'trend') {
      const trendRank = (t?: string) => (t === 'up' ? 2 : t === 'stable' ? 1 : 0)
      cmp = trendRank(a.trend) - trendRank(b.trend)
    }

    return prefs.sortDir === 'asc' ? cmp : -cmp
  })

  return sorted
}
