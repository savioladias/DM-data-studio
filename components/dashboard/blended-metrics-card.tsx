'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import type { Metric } from '@/lib/types'

const AD_CHANNELS = ['GOOGLE_ADS', 'META_ADS', 'LINKEDIN_ADS', 'TIKTOK_ADS', 'SNAPCHAT_ADS']

interface BlendedMetricsCardProps {
  metrics: Record<string, Metric[]>
  currency: string
}

function formatValue(v: number | string) {
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

export function BlendedMetricsCard({ metrics, currency }: BlendedMetricsCardProps) {
  // Aggregate metrics across ad channels
  const adMetrics = AD_CHANNELS.flatMap(channel => metrics[channel] ?? [])

  const totalSpend = adMetrics
    .filter(m => m.key === 'spend' || m.key === 'totalCost')
    .reduce((sum, m) => sum + m.value, 0)

  const totalClicks = adMetrics
    .filter(m => m.key === 'clicks' || m.key === 'linkClicks')
    .reduce((sum, m) => sum + m.value, 0)

  const totalImpressions = adMetrics
    .filter(m => m.key === 'impressions')
    .reduce((sum, m) => sum + m.value, 0)

  const totalConversions = adMetrics
    .filter(m => m.key === 'conversions')
    .reduce((sum, m) => sum + m.value, 0)

  const globalROAS = totalSpend > 0 ? (totalConversions / totalSpend).toFixed(2) : '—'
  const costPerConversion = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '—'

  // Only show if there's at least one ad channel with data
  const hasData = AD_CHANNELS.some(channel => (metrics[channel] ?? []).length > 0)

  if (!hasData) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Blended Ad Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
            <p className="text-2xl font-bold">
              {currency === 'GBP' || currency === '£' ? '£' : currency === 'USD' || currency === '$' ? '$' : '€'}
              {formatValue(totalSpend)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
            <p className="text-2xl font-bold">{formatValue(totalClicks)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Impressions</p>
            <p className="text-2xl font-bold">{formatValue(totalImpressions)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Global ROAS</p>
            <p className="text-2xl font-bold">{globalROAS}</p>
            <p className="text-xs text-muted-foreground mt-1">revenue / spend</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cost / Conv.</p>
            <p className="text-2xl font-bold">
              {currency === 'GBP' || currency === '£' ? '£' : currency === 'USD' || currency === '$' ? '$' : '€'}
              {costPerConversion}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
