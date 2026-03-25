'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Sparkles, Loader2, Eye } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { ForecastChart } from '@/components/dashboard/forecast-chart'
import { generateForecast } from '@/lib/forecast'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import type { Metric } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChannelDetailProps {
  projectId: string
  projectName: string
  clientName: string
  channelId: ChannelId
  currency: string
}

// Generate sample historical data for a metric
function generateMetricHistory(currentValue: number, trend?: string, label?: string) {
  const days = 30
  const data = []
  let value = currentValue

  // Calculate step based on trend
  const changePercent = trend === 'up' ? 0.015 : trend === 'down' ? -0.015 : 0
  let baseValue = currentValue / (1 + changePercent * days)

  for (let i = 0; i < days; i++) {
    baseValue = baseValue * (1 + changePercent)
    const variance = baseValue * (Math.random() * 0.1 - 0.05) // Add 5% variance
    const day = i + 1
    const date = new Date()
    date.setDate(date.getDate() - (days - i))

    data.push({
      date: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      value: Math.max(0, Math.round(baseValue + variance)),
      fullDate: date,
    })
  }

  return data
}

export function ChannelDetail({
  projectId,
  projectName,
  clientName,
  channelId,
  currency,
}: ChannelDetailProps) {
  const channel = getChannel(channelId)
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({})
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(true)
  const [forecastOpen, setForecastOpen] = useState<string | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/metrics`)
      const data = await res.json()
      setMetrics(data.metrics ?? {})
    } catch {
      console.error('Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [projectId])

  const channelMetrics = metrics[channelId] || []

  const positiveCount = channelMetrics.filter(m => m.trend === 'up').length
  const negativeCount = channelMetrics.filter(m => m.trend === 'down').length

  const fetchSummary = async () => {
    if (aiSummary) {
      setSummaryOpen(o => !o)
      return
    }
    setLoadingSummary(true)
    setSummaryOpen(true)

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'channel',
          channel: channelId,
          data: {
            channel: channel?.label || channelId,
            dateRange: 'Last 30 days',
            metrics: channelMetrics.map(m => ({
              metricName: m.label,
              currentValue: m.value,
              previousValue: m.previous,
              deltaPercent: m.deltaPercent,
              channel: channel?.label || channelId,
              unit: m.unit,
              trend: m.trend,
            })),
          },
        }),
      })

      const data = await res.json()
      if (res.status === 503) {
        setAiAvailable(false)
        setAiSummary(data.error || 'AI features are not available. Please ensure Ollama is running: https://ollama.ai')
      } else {
        setAiAvailable(true)
        setAiSummary(data.insight ?? data.error ?? 'Unable to generate summary.')
      }
    } catch {
      setAiSummary('Failed to connect to AI service.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const formatValue = (v: number | string, unit?: string) => {
    if (typeof v === 'string') return v
    
    // Handle time units (seconds)
    if (unit === 's') {
      if (v < 60) return `${v.toFixed(1)}s`
      const mins = Math.floor(v / 60)
      const secs = Math.round(v % 60)
      return `${mins}m ${secs}s`
    }
    
    // Handle percentage units
    if (unit === '%') {
      return `${v.toLocaleString()}%`
    }

    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toLocaleString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1 py-0">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                style={{ backgroundColor: channel?.color || '#ccc' }}
                title={channel?.label}
              >
                {channel?.label.charAt(0) || 'C'}
              </div>
              <h1 className="text-2xl font-bold leading-none m-0">{channel?.label || channelId}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {projectName} · {clientName}
            </p>
          </div>
        </div>
        {aiAvailable && (
          <Button
            variant="outline"
            onClick={fetchSummary}
            disabled={loadingSummary}
          >
            {loadingSummary ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
            )}
            AI Summary
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading {channel?.label || 'channel'} metrics...</p>
        </div>
      ) : channelMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground mb-4">No metrics available for this channel</p>
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">Back to Overview</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Performance Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Performance Summary</span>
                <Badge variant="outline">{channel?.category}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Metrics</p>
                  <p className="text-3xl font-bold">{channelMetrics.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Positive Trends</p>
                  <p className="text-3xl font-bold text-emerald-500">↑{positiveCount}</p>
                  <p className="text-xs text-emerald-600 mt-1">improving</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Areas of Concern</p>
                  <p className="text-3xl font-bold text-red-500">↓{negativeCount}</p>
                  <p className="text-xs text-red-600 mt-1">declining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {summaryOpen && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                {loadingSummary ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating {channel?.label} summary with AI...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                      <Sparkles className="h-3 w-3" />
                      AI Analysis — {channel?.label}
                    </div>
                    <p className="text-sm leading-relaxed">{aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metrics Grid with Charts */}
          <div>
            <h2 className="font-semibold text-lg mb-4">All Metrics — Last 30 Days</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {channelMetrics.map(metric => {
                const isPositive = metric.trend === 'up'
                const isNegative = metric.trend === 'down'
                const chartData = generateMetricHistory(metric.value, metric.trend, metric.label)
                const trendColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280'

                return (
                  <Card key={metric.key} className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{metric.label}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {metric.unit && ['£', '$', '€'].includes(metric.unit) && (
                              <span>{metric.unit}</span>
                            )}
                            {formatValue(metric.value, metric.unit)}
                            {metric.unit && !['£', '$', '€', 's', '%'].includes(metric.unit) && (
                              <span> {metric.unit}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {metric.historicalData && metric.historicalData.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setForecastOpen(metric.key)}
                              className="h-10 w-10 p-0"
                              title="View 7-day forecast"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          )}
                          <div className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            isPositive ? 'bg-emerald-500/10' : isNegative ? 'bg-red-500/10' : 'bg-muted'
                          )}>
                            {isPositive && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                            {isNegative && <TrendingDown className="h-5 w-5 text-red-500" />}
                            {!isPositive && !isNegative && <Minus className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Stats at top */}
                      {(metric.deltaPercent !== undefined || metric.previous !== undefined) && (
                        <div className="space-y-2 pb-2 border-b">
                          {metric.deltaPercent !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Change vs. Previous</span>
                              <div className={cn(
                                'flex items-center gap-1 font-medium',
                                isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                              )}>
                                {isPositive && <TrendingUp className="h-3 w-3" />}
                                {isNegative && <TrendingDown className="h-3 w-3" />}
                                {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                                <span className="text-sm">
                                  {metric.deltaPercent > 0 ? '+' : ''}{metric.deltaPercent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                          {metric.previous !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Previous Period</span>
                              <span className="text-sm font-medium text-muted-foreground">
                                {formatValue(metric.previous)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Chart with gradient */}
                      <div className="w-full h-48 -mx-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={trendColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              stroke="currentColor"
                              opacity={0.5}
                              interval={Math.floor(chartData.length / 5)}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              stroke="currentColor"
                              opacity={0.5}
                              width={40}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: any) => formatValue(value)}
                              labelFormatter={(label: any) => label}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={trendColor}
                              fill={`url(#gradient-${metric.key})`}
                              dot={false}
                              strokeWidth={2}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Forecast Modal */}
      <Dialog open={!!forecastOpen} onOpenChange={(open) => !open && setForecastOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>7-Day Forecast</DialogTitle>
          </DialogHeader>
          {forecastOpen && (() => {
            const metric = channelMetrics.find(m => m.key === forecastOpen)
            if (!metric?.historicalData) return <p className="text-muted-foreground">No historical data available</p>

            const forecast = generateForecast(metric.historicalData)
            return (
              <ForecastChart
                label={metric.label}
                historicalData={metric.historicalData}
                forecast={forecast.forecast}
                confidenceHigh={forecast.confidenceHigh}
                confidenceLow={forecast.confidenceLow}
                trend={forecast.trend}
                unit={metric.unit}
              />
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
