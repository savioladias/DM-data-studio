'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { Metric } from '@/lib/types'

interface MetricsPieChartProps {
  title: string
  metrics: Metric[]
  limit?: number
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#ef4444',
]

export function MetricsPieChart({ title, metrics, limit = 6 }: MetricsPieChartProps) {
  // Filter metrics with positive values and limit to top N by value
  const data = metrics
    .filter(m => m.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(m => ({
      name: m.label,
      value: Math.round(m.value),
      original: m,
    }))

  if (data.length === 0) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Top {data.length} metrics by value</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => `${value}${data[0]?.original?.unit || ''}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-medium">
                {d.value}{d.original.unit && !['£', '$', '€'].includes(d.original.unit) ? ' ' + d.original.unit : ''}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
