'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Metric } from '@/lib/types'

interface ChannelComparisonChartProps {
  title: string
  channels: {
    id: string
    label: string
    color: string
  }[]
  metricData: Record<string, Metric[]>
  metricKey?: string
}

export function ChannelComparisonChart({
  title,
  channels,
  metricData,
  metricKey = 'impressions',
}: ChannelComparisonChartProps) {
  // Build chart data: one row per channel with the selected metric
  const chartData = channels
    .map(channel => {
      const metrics = metricData[channel.id] || []
      const metric = metrics.find(m => m.key === metricKey)
      return {
        name: channel.label,
        value: metric?.value || 0,
        color: channel.color,
      }
    })
    .filter(d => d.value > 0)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available for selected metric</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Cross-channel metric comparison</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
            <YAxis tick={{ fontSize: 12 }} stroke="#999" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
              formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {chartData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-medium">{d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
