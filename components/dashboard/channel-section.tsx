'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfYear } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from './kpi-card'
import { MetricSortControls } from './metric-sort-controls'
import { CsvUploadButton } from './csv-upload-button'
import { Sparkles, Loader2, ChevronDown, ChevronUp, Circle, ArrowRight } from 'lucide-react'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import type { Metric, DateRange } from '@/lib/types'
import { loadMetricPrefs, saveMetricPrefs, sortMetrics, type MetricPrefs } from '@/lib/metric-prefs'

function getDateRangeLabel(dateRange: DateRange): string {
  switch (dateRange.preset) {
    case '7d':
      return 'Last 7 days'
    case '14d':
      return 'Last 14 days'
    case '30d':
      return 'Last 30 days'
    case '90d':
      return 'Last 90 days'
    case 'ytd':
      return 'Year to date'
    case 'custom':
      return `${dateRange.startDate} to ${dateRange.endDate}`
  }
}

interface ChannelSectionProps {
  projectId: string
  channelId: ChannelId
  metrics: Metric[]
  dateRange?: DateRange
}

export function ChannelSection({ projectId, channelId, metrics, dateRange }: ChannelSectionProps) {
  const channel = getChannel(channelId)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(true)
  const [sortPrefs, setSortPrefs] = useState<MetricPrefs>(() => loadMetricPrefs(projectId))

  useEffect(() => {
    setSortPrefs(loadMetricPrefs(projectId))
  }, [projectId])

  const handleSortChange = (prefs: MetricPrefs) => {
    setSortPrefs(prefs)
    saveMetricPrefs(projectId, prefs)
  }

  if (!channel) return null

  const dateRangeLabel = dateRange ? getDateRangeLabel(dateRange) : 'Last 30 days'
  const sortedMetrics = sortMetrics(metrics, sortPrefs)

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
            channel: channel.label,
            dateRange: dateRangeLabel,
            metrics: metrics.map(m => ({
              metricName: m.label,
              currentValue: m.value,
              previousValue: m.previous,
              deltaPercent: m.deltaPercent,
              channel: channel.label,
              unit: m.unit,
              trend: m.trend,
            })),
          },
        }),
      })

      const data = await res.json()
      if (res.status === 503) {
        setAiAvailable(false)
        setAiSummary('AI features are not available. Please configure your Google Generative AI API key.')
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

  const positiveCount = metrics.filter(m => m.trend === 'up').length
  const negativeCount = metrics.filter(m => m.trend === 'down').length

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={() => setCollapsed(c => !c)}
        >
          <Circle className="h-3 w-3 fill-current" style={{ color: channel.color }} />
          <h2 className="font-semibold text-base">{channel.label}</h2>
          <Badge variant="outline" className="text-xs">{channel.category}</Badge>
          {positiveCount > 0 && (
            <span className="text-xs text-emerald-500">↑{positiveCount}</span>
          )}
          {negativeCount > 0 && (
            <span className="text-xs text-red-500">↓{negativeCount}</span>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>

        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/channels/${channelId}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
            >
              <ArrowRight className="h-4 w-4" />
              View Details
            </Button>
          </Link>
          <CsvUploadButton projectId={projectId} channelId={channelId} />
          {aiAvailable && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={fetchSummary}
              disabled={loadingSummary}
            >
              {loadingSummary ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
              AI Summary
            </Button>
          )}
        </div>
      </div>

      {/* AI Summary panel */}
      {summaryOpen && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating {channel.label} summary with Claude AI...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                  <Sparkles className="h-3 w-3" />
                  AI Analysis — {channel.label}
                </div>
                <p className="text-sm leading-relaxed">{aiSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sort Controls and KPI grid */}
      {!collapsed && (
        <div className="space-y-3">
          <div>
            <MetricSortControls prefs={sortPrefs} onChange={handleSortChange} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedMetrics.map(metric => (
              <KpiCard
                key={metric.key}
                projectId={projectId}
                channel={channelId}
                metricKey={metric.key}
                label={metric.label}
                value={metric.value}
                previous={metric.previous}
                unit={metric.unit}
                deltaPercent={metric.deltaPercent}
                trend={metric.trend}
                inverseColors={metric.key === 'bounceRate'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
