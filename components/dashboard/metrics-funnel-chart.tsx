'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metric } from '@/lib/types'

interface MetricsFunnelChartProps {
  title: string
  metrics: Metric[]
  maxValue?: number
}

export function MetricsFunnelChart({ title, metrics, maxValue }: MetricsFunnelChartProps) {
  const funnelMetrics = metrics
    .filter(m => m.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  if (funnelMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No metric data available</p>
        </CardContent>
      </Card>
    )
  }

  const max = maxValue || Math.max(...funnelMetrics.map(m => m.value))

  // Calculate percentages
  const data = funnelMetrics.map((m, idx) => {
    const percentage = (m.value / max) * 100
    const dropoff = idx > 0 ? ((funnelMetrics[idx - 1].value - m.value) / funnelMetrics[idx - 1].value) * 100 : 0

    return {
      metric: m,
      percentage,
      dropoff,
      widthPercent: percentage,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Top 5 metrics in funnel view</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, idx) => {
            const colors = [
              'bg-blue-500',
              'bg-purple-500',
              'bg-pink-500',
              'bg-amber-500',
              'bg-teal-500',
            ]

            return (
              <div key={item.metric.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{item.metric.label}</span>
                  <span className="text-xs font-semibold">
                    {Math.round(item.metric.value)}
                    {item.metric.unit && !['£', '$', '€'].includes(item.metric.unit) ? ' ' + item.metric.unit : ''}
                  </span>
                </div>
                <div className="bg-muted rounded-full h-8 flex items-center justify-center overflow-hidden">
                  <div
                    className={`${colors[idx % colors.length]} h-full flex items-center justify-center text-white text-xs font-semibold transition-all`}
                    style={{ width: `${item.widthPercent}%` }}
                  >
                    {item.percentage > 15 && `${Math.round(item.percentage)}%`}
                  </div>
                </div>
                {idx > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ↓ {item.dropoff.toFixed(1)}% drop from previous
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
