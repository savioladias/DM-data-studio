'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, startOfYear } from 'date-fns'
import { ChannelSection } from '@/components/dashboard/channel-section'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { BlendedMetricsCard } from '@/components/dashboard/blended-metrics-card'
import { AnomalyBell, type Anomaly } from '@/components/dashboard/anomaly-bell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, TrendingUp, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const router = useRouter()
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({})
  const [credentialStatus, setCredentialStatus] = useState<Record<string, string>>({})
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
      setCredentialStatus(data.credentialStatus ?? {})
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

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.clientName}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {totalChannels} channel{totalChannels !== 1 ? 's' : ''} • {connectedChannels} connected
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {enabledChannels.map(channelId => {
                  const channel = getChannel(channelId)
                  const hasData = metrics[channelId]?.length > 0
                  if (!channel) return null
                  return (
                    <DropdownMenuItem key={channelId} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-sm flex items-center justify-center text-white text-[10px] font-semibold"
                        style={{ backgroundColor: channel.color }}
                      >
                        {channel.label.charAt(0)}
                      </div>
                      <span>{channel.label}</span>
                      <span className="text-xs ml-auto">
                        {hasData
                          ? <span className="text-emerald-600">✓ Connected</span>
                          : credentialStatus[channelId] === 'auth_error'
                            ? <span className="text-amber-600">⚠ Reconnect</span>
                            : <span className="text-muted-foreground">○ Not connected</span>
                        }
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleDateString('en-GB')} {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <AnomalyBell anomalies={anomalies} />
            <Button variant="outline" size="sm" onClick={() => fetchMetrics(dateRange)} disabled={loading} className="hover:bg-primary hover:text-primary-foreground">
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


      {/* Auth error banner — channels with credentials that returned no data */}
      {!loading && (() => {
        const authErrors = enabledChannels.filter(c => credentialStatus[c] === 'auth_error')
        if (authErrors.length === 0) return null
        return (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 flex items-start gap-3">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {authErrors.length === 1 ? '1 channel needs reconnecting' : `${authErrors.length} channels need reconnecting`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {authErrors.map(c => getChannel(c)?.label ?? c).join(', ')} — token expired. Go to{' '}
                <button
                  onClick={() => router.push(`/projects/${project.id}/settings`)}
                  className="underline font-medium cursor-pointer"
                >
                  Settings → Reconnect
                </button>
              </p>
            </div>
          </div>
        )
      })()}

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
              <CardContent className="p-4">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Overall Performance
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <Button
                variant="outline"
                className="mt-4 cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}/settings`)}
              >
                Go to Settings
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
