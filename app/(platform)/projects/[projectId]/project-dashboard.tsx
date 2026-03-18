'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfYear } from 'date-fns'
import { ChannelSection } from '@/components/dashboard/channel-section'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { BlendedMetricsCard } from '@/components/dashboard/blended-metrics-card'
import { AnomalyBell, type Anomaly } from '@/components/dashboard/anomaly-bell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, Sparkles, AlertTriangle, Info, TrendingUp } from 'lucide-react'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import type { Metric, DateRange } from '@/lib/types'
import { detectAnomalies } from '@/lib/ai'
import { cn } from '@/lib/utils'

interface Insight {
  id: string
  type: string
  title: string
  body: string
  severity?: string
  createdAt: string
}

interface ProjectDashboardProps {
  project: {
    id: string
    name: string
    clientName: string
    brandColor: string
    currency: string
  }
  enabledChannels: ChannelId[]
  recentInsights: Insight[]
}

export function ProjectDashboard({ project, enabledChannels, recentInsights }: ProjectDashboardProps) {
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({})
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30d',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])

  const fetchMetrics = async (range: DateRange = dateRange) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: range.startDate,
        endDate: range.endDate,
      })
      const res = await fetch(`/api/projects/${project.id}/metrics?${params}`)
      const data = await res.json()
      setMetrics(data.metrics ?? {})
      setLastRefresh(new Date())

      // Detect anomalies from the fetched metrics
      const flatMetrics = Object.values(data.metrics ?? {}).flat() as Metric[]
      if (flatMetrics.length > 0) {
        try {
          // Create minimal time series for each metric: [prev*0.98, prev, current]
          const anomalyInput = flatMetrics.map((m: Metric) => ({
            key: m.key,
            label: m.label,
            current: m.value,
            values: m.previous ? [m.previous * 0.98, m.previous, m.value] : [m.value, m.value, m.value],
          }))
          const detected = await detectAnomalies(anomalyInput)
          setAnomalies(detected)
        } catch (err) {
          console.error('Failed to detect anomalies:', err)
          setAnomalies([])
        }
      }
    } catch {
      console.error('Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange)
    fetchMetrics(newRange)
  }

  useEffect(() => {
    fetchMetrics()
  }, [project.id])

  const totalChannels = enabledChannels.length
  const connectedChannels = enabledChannels.filter(c => metrics[c]?.length > 0).length

  const severityIcon = (s?: string) => {
    if (s === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <Info className="h-4 w-4 text-blue-500" />
  }

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{project.clientName}</h1>
            <p className="text-sm text-muted-foreground">
              {totalChannels} channel{totalChannels !== 1 ? 's' : ''} • {connectedChannels} connected
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <AnomalyBell anomalies={anomalies} />
            <Button variant="outline" size="sm" onClick={() => fetchMetrics(dateRange)} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Connected channels pills - only show connected channels */}
      {connectedChannels > 0 && (
        <div className="flex flex-wrap gap-2">
          {enabledChannels.map(channelId => {
            const channel = getChannel(channelId)
            const hasData = metrics[channelId]?.length > 0
            if (!hasData) return null
            return channel ? (
              <Badge
                key={channelId}
                className="text-sm gap-2 bg-white border border-black text-black px-3 py-2"
              >
                <div
                  className="h-4 w-4 rounded-sm flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: channel.color }}
                  title={channel.label}
                >
                  {channel.label.charAt(0)}
                </div>
                <span className="truncate">{channel.label}</span>
              </Badge>
            ) : null
          })}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading metrics for {totalChannels} channels...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Performance Summary Card */}
          {connectedChannels > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Overall Performance
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Connected Channels</p>
                    <p className="text-2xl font-bold">{connectedChannels}</p>
                    <p className="text-xs text-emerald-600 mt-1">of {totalChannels}</p>
                  </div>
                  {(() => {
                    const totalMetrics = Object.values(metrics).flat().length
                    const positiveMetrics = Object.values(metrics).flat().filter(m => m.trend === 'up').length
                    const negativeMetrics = Object.values(metrics).flat().filter(m => m.trend === 'down').length

                    // Social engagement rate - average across social channels
                    const socialChannels = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN_ORGANIC', 'TIKTOK']
                    const socialEngagements = socialChannels
                      .flatMap(c => metrics[c] ?? [])
                      .filter(m => m.key === 'engagementRate')
                    const socialEngRate = socialEngagements.length > 0
                      ? (socialEngagements.reduce((sum, m) => sum + Number(m.value), 0) / socialEngagements.length).toFixed(1)
                      : null

                    // Website engagement rate from GA4
                    const webEngRate = metrics['GOOGLE_ANALYTICS']
                      ?.find(m => m.key === 'engagementRate')
                      ?.value ?? null

                    return (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Metrics</p>
                          <p className="text-2xl font-bold">{totalMetrics}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Positive Trends</p>
                          <p className="text-2xl font-bold text-emerald-500">{positiveMetrics}</p>
                          <p className="text-xs text-emerald-600 mt-1">↑ improving</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Areas of Concern</p>
                          <p className="text-2xl font-bold text-red-500">{negativeMetrics}</p>
                          <p className="text-xs text-red-600 mt-1">↓ declining</p>
                        </div>
                        {socialEngRate !== null && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Social Eng. Rate</p>
                            <p className="text-2xl font-bold">{socialEngRate}%</p>
                          </div>
                        )}
                        {webEngRate !== null && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Web Eng. Rate</p>
                            <p className="text-2xl font-bold">{Number(webEngRate).toFixed(1)}%</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blended Ad Metrics Card */}
          <BlendedMetricsCard metrics={metrics} currency={project.currency} />

          {/* Recent AI Insights panel (if any exist) */}
          {recentInsights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Recent AI Insights</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentInsights.slice(0, 4).map(insight => (
                  <Card key={insight.id} className={cn(
                    'border-l-4',
                    insight.severity === 'critical' ? 'border-l-red-500' :
                    insight.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-primary'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        {severityIcon(insight.severity)}
                        <div>
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.body}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Channel sections — in specific order */}
          {(() => {
            // Define channel display order
            const channelOrder = [
              'GOOGLE_ANALYTICS',
              'GOOGLE_SEARCH_CONSOLE',
              'GOOGLE_ADS',
              'INSTAGRAM',
              'FACEBOOK',
              'META_ADS',
              'LINKEDIN_ORGANIC',
              'LINKEDIN_ADS',
              'SNAPCHAT_ADS',
              'TIKTOK_ADS',
              'MAILCHIMP',
              'KLAVIYO',
              'HUBSPOT',
              'ACTIVE_CAMPAIGN',
            ]

            // Group GA4 + GSC together and sort by order
            const orderedChannels = channelOrder.filter(ch => enabledChannels.includes(ch as ChannelId))

            return orderedChannels.map(channelId => {
              const channelMetrics = metrics[channelId as ChannelId]
              if (!channelMetrics?.length) return null
              return (
                <ChannelSection
                  key={channelId}
                  projectId={project.id}
                  channelId={channelId as ChannelId}
                  metrics={channelMetrics}
                  dateRange={dateRange}
                />
              )
            })
          })()}

          {/* Empty state if no metric data at all */}
          {connectedChannels === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-2xl bg-muted p-6 mb-4">
                <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
              </div>
              <h3 className="font-semibold mb-2">No data yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Connect your marketing accounts in project settings to start pulling real data.
                Metrics will appear here once connected.
              </p>
              <Button variant="outline" className="mt-4">
                Go to Settings
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
