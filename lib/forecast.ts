import { linearRegression, variance } from 'simple-statistics'

export interface ForecastData {
  forecast: number[]
  confidenceHigh: number[]
  confidenceLow: number[]
  trend: 'up' | 'down' | 'stable'
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

/**
 * Generate forecast using linear regression
 * Assumes data is sorted chronologically (oldest to newest)
 */
export function generateForecast(
  historicalData: TimeSeriesPoint[],
  forecastDays: number = 7
): ForecastData {
  if (historicalData.length < 2) {
    return {
      forecast: [],
      confidenceHigh: [],
      confidenceLow: [],
      trend: 'stable',
    }
  }

  // Extract values for regression
  const values = historicalData.map(d => d.value)
  const indices = Array.from({ length: values.length }, (_, i) => i)

  // Fit linear regression
  const regression = linearRegression(indices.map((i, idx) => [i, values[idx]]))
  const { m, b } = regression

  // Calculate standard error for confidence intervals
  const predictions = indices.map(i => m * i + b)
  const residuals = values.map((v, i) => v - predictions[i])
  const se = Math.sqrt(variance(residuals))

  // Generate forecast
  const forecast: number[] = []
  const confidenceHigh: number[] = []
  const confidenceLow: number[] = []

  for (let i = 1; i <= forecastDays; i++) {
    const idx = values.length - 1 + i
    const pred = m * idx + b
    const margin = 1.96 * se // 95% confidence interval

    forecast.push(Math.max(0, pred)) // Avoid negative values
    confidenceHigh.push(Math.max(0, pred + margin))
    confidenceLow.push(Math.max(0, pred - margin))
  }

  // Determine trend
  const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
  const olderAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
  const trend = m > 0.1 ? 'up' : m < -0.1 ? 'down' : 'stable'

  return { forecast, confidenceHigh, confidenceLow, trend }
}

/**
 * Generate forecast for multiple metrics
 */
export function generateMetricForecasts(
  metrics: Array<{ key: string; data: TimeSeriesPoint[] }>,
  forecastDays?: number
): Record<string, ForecastData> {
  const result: Record<string, ForecastData> = {}
  for (const m of metrics) {
    result[m.key] = generateForecast(m.data, forecastDays)
  }
  return result
}
