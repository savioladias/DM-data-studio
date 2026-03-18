'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { TimeSeriesPoint } from '@/lib/forecast'

interface ForecastChartProps {
  label: string
  historicalData: TimeSeriesPoint[]
  forecast: number[]
  confidenceHigh: number[]
  confidenceLow: number[]
  trend: 'up' | 'down' | 'stable'
  unit?: string
}

export function ForecastChart({
  label,
  historicalData,
  forecast,
  confidenceHigh,
  confidenceLow,
  trend,
  unit,
}: ForecastChartProps) {
  if (!historicalData.length || !forecast.length) {
    return null
  }

  // Build chart data: historical + forecast
  const chartData = [
    // Historical data
    ...historicalData.map(d => ({
      date: d.date,
      value: d.value,
      type: 'historical' as const,
    })),
    // Forecast data (starting from next day)
    ...forecast.map((f, i) => ({
      date: `+${i + 1}d`,
      forecast: f,
      high: confidenceHigh[i],
      low: confidenceLow[i],
      type: 'forecast' as const,
    })),
  ]

  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{label} Forecast</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              7-day prediction with 95% confidence interval
            </p>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
            <TrendingUp size={14} style={{ color: trendColor }} />
            <span className="text-xs font-medium capitalize">{trend}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#999"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#999"
            />
            <Tooltip
              formatter={(value: any) => {
                const formatted = typeof value === 'number' ? value.toFixed(0) : value
                return `${formatted}${unit ? ' ' + unit : ''}`
              }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend />

            {/* Confidence interval band */}
            <Area
              type="monotone"
              dataKey="high"
              fill="#8b5cf6"
              stroke="none"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="low"
              fill="#8b5cf6"
              stroke="none"
              fillOpacity={0.1}
              isAnimationActive={false}
            />

            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Historical"
              isAnimationActive={false}
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              name="Forecast"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-blue-50 rounded">
            <p className="font-medium text-blue-900">Historical</p>
            <p className="text-blue-700">
              {historicalData[historicalData.length - 1]?.value.toFixed(0) || 0}
              {unit ? ' ' + unit : ''}
            </p>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <p className="font-medium text-purple-900">Forecast (7d)</p>
            <p className="text-purple-700">
              {forecast[forecast.length - 1]?.toFixed(0) || 0}
              {unit ? ' ' + unit : ''}
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="font-medium text-gray-900">Change</p>
            <p className={forecast[0] ? (forecast[0] > historicalData[historicalData.length - 1]?.value ? 'text-green-700' : 'text-red-700') : ''}>
              {forecast[0] ? ((forecast[0] - historicalData[historicalData.length - 1]?.value) / historicalData[historicalData.length - 1]?.value * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
