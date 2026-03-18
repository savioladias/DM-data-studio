'use client'

import { use, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Loader2, FileJson } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import { toast } from 'sonner'

interface ReportMetrics {
  channel: ChannelId
  label: string
  metrics: {
    key: string
    label: string
    value: number
    previous?: number
    unit: string
    deltaPercent?: number
    trend?: 'up' | 'down' | 'stable'
  }[]
}

// Generate sample historical data
function generateMetricHistory(currentValue: number, trend?: string) {
  const days = 30
  const data = []
  const changePercent = trend === 'up' ? 0.015 : trend === 'down' ? -0.015 : 0
  let baseValue = currentValue / (1 + changePercent * days)

  for (let i = 0; i < days; i++) {
    baseValue = baseValue * (1 + changePercent)
    const variance = baseValue * (Math.random() * 0.1 - 0.05)
    const date = new Date()
    date.setDate(date.getDate() - (days - i))

    data.push({
      date: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      value: Math.max(0, Math.round(baseValue + variance)),
    })
  }
  return data
}

function formatValue(v: number | string) {
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

export default function ReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const [metrics, setMetrics] = useState<ReportMetrics[]>([])
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [conclusions, setConclusions] = useState('')
  const [channelSummaries, setChannelSummaries] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/metrics`)
        const data = await res.json()

        const reportData = Object.entries(data.metrics ?? {}).map(([channelId, channelMetrics]) => ({
          channel: channelId as ChannelId,
          label: getChannel(channelId as ChannelId)?.label ?? channelId,
          metrics: channelMetrics as ReportMetrics['metrics'],
        }))

        setMetrics(reportData)
        setSelectedChannels(reportData.map(m => m.channel))
      } catch (error) {
        toast.error('Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [projectId])

  const toggleChannel = (channelId: ChannelId) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    )
  }

  const updateChannelSummary = (channelId: ChannelId, summary: string) => {
    setChannelSummaries(prev => ({
      ...prev,
      [channelId]: summary,
    }))
  }

  const generateReport = async () => {
    if (selectedChannels.length === 0) {
      toast.error('Select at least one channel')
      return
    }

    setGenerating(true)
    try {
      const selectedData = metrics.filter(m => selectedChannels.includes(m.channel))

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'recommendations',
          data: selectedData.map(m => ({
            channel: m.label,
            metrics: m.metrics.map(metric => ({
              metricName: metric.label,
              currentValue: metric.value,
              deltaPercent: metric.deltaPercent,
              channel: m.label,
              unit: metric.unit,
            })),
          })),
        }),
      })

      await res.json()
      if (res.status === 503) {
        toast.error('AI features are not available. Configure your API key to generate AI insights.')
      } else {
        toast.success('Report generated!')
      }
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const exportAsHTML = () => {
    if (selectedChannels.length === 0) {
      toast.error('Select at least one channel to export')
      return
    }

    const selectedData = metrics.filter(m => selectedChannels.includes(m.channel))
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    const totalMetrics = selectedData.reduce((sum, c) => sum + c.metrics.length, 0)
    const positiveMetrics = selectedData.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'up').length, 0)
    const negativeMetrics = selectedData.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'down').length, 0)

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Marketing Performance Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; color: #333; background: white; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #007bff; padding-bottom: 30px; }
        h1 { margin: 0 0 10px 0; font-size: 32px; color: #1a1a1a; }
        .date { color: #666; font-size: 14px; margin: 10px 0; }
        .executive-summary { background: #f0f7ff; padding: 20px; border-left: 4px solid #007bff; margin: 30px 0; border-radius: 4px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #ddd; }
        .stat-number { font-size: 32px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 10px; }
        .channel-section { page-break-inside: avoid; margin: 40px 0; padding: 30px; background: #f9f9f9; border-radius: 8px; border: 1px solid #ddd; }
        .channel-section h2 { margin-top: 0; color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .metrics-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .metrics-table th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        .metrics-table td { padding: 12px; border-bottom: 1px solid #eee; }
        .metrics-table tr:hover { background: #f5f5f5; }
        .positive { color: #10b981; font-weight: bold; }
        .negative { color: #ef4444; font-weight: bold; }
        .neutral { color: #666; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 11px; color: #999; text-align: center; }
        .section-title { font-size: 20px; font-weight: bold; margin: 30px 0 20px 0; color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .note-section { background: #fffbf0; padding: 20px; border-left: 4px solid #ff9500; margin: 20px 0; border-radius: 4px; }
        .conclusions { background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; margin: 30px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Marketing Performance Report</h1>
          <p class="date">Generated on ${today}</p>
          <p style="color: #666; margin: 15px 0 0 0;">${selectedData.length} channel${selectedData.length !== 1 ? 's' : ''} | ${totalMetrics} total metrics</p>
        </div>

        <div class="executive-summary">
          <h3 style="margin-top: 0;">Executive Summary</h3>
          <p>${executiveSummary || 'Overview of marketing performance across selected channels. Key highlights and trends are detailed in the channel-specific sections below.'}</p>
        </div>

        <div class="summary-grid">
          <div class="stat-card">
            <div class="stat-number">${totalMetrics}</div>
            <div class="stat-label">Total Metrics</div>
          </div>
          <div class="stat-card">
            <div class="stat-number positive">${positiveMetrics}</div>
            <div class="stat-label">Positive Trends</div>
          </div>
          <div class="stat-card">
            <div class="stat-number negative">${negativeMetrics}</div>
            <div class="stat-label">Areas of Concern</div>
          </div>
          <div class="stat-card">
            <div class="stat-number neutral">${totalMetrics - positiveMetrics - negativeMetrics}</div>
            <div class="stat-label">Stable Metrics</div>
          </div>
        </div>

        <div class="section-title">Channel Performance Details</div>

        ${selectedData.map((channel) => {
          const positiveCount = channel.metrics.filter(m => m.trend === 'up').length
          const negativeCount = channel.metrics.filter(m => m.trend === 'down').length

          return `
            <div class="channel-section">
              <h2>${channel.label}</h2>
              <p style="color: #666; margin: 10px 0 0 0;">${channel.metrics.length} metrics | ${positiveCount} positive · ${negativeCount} declining</p>

              <div style="margin: 20px 0;">
                <h4>Performance Metrics</h4>
                <table class="metrics-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th style="text-align: right;">Current Value</th>
                      <th style="text-align: center;">Trend</th>
                      <th style="text-align: right;">Previous Value</th>
                      <th style="text-align: right;">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${channel.metrics.map(metric => {
                      const trendEmoji = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '—'
                      const trendClass = metric.trend === 'up' ? 'positive' : metric.trend === 'down' ? 'negative' : 'neutral'
                      return `
                        <tr>
                          <td><strong>${metric.label}</strong></td>
                          <td style="text-align: right;"><strong>${formatValue(metric.value)}</strong> ${metric.unit}</td>
                          <td style="text-align: center;"><span class="${trendClass}">${trendEmoji}</span></td>
                          <td style="text-align: right;">${metric.previous ? formatValue(metric.previous) : '—'}</td>
                          <td style="text-align: right;"><span class="${metric.deltaPercent && metric.deltaPercent < 0 ? trendClass : ''}">${metric.deltaPercent ? (metric.deltaPercent > 0 ? '+' : '') + metric.deltaPercent.toFixed(1) + '%' : '—'}</span></td>
                        </tr>
                      `
                    }).join('')}
                  </tbody>
                </table>
              </div>

              ${channelSummaries[channel.channel] ? `
                <div style="margin: 20px 0; padding: 15px; background: #f0f7ff; border-left: 3px solid #0284c7; border-radius: 4px;">
                  <h4 style="margin-top: 0; color: #0284c7;">Analysis & Summary</h4>
                  <p style="color: #333; line-height: 1.6;">${channelSummaries[channel.channel].replace(/\n/g, '<br>')}</p>
                </div>
              ` : ''}
            </div>
          `
        }).join('')}

        ${conclusions ? `
          <div class="conclusions">
            <h3 style="margin-top: 0;">Conclusions & Recommendations</h3>
            <p>${conclusions}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>This report contains performance metrics from selected marketing channels. Data is accurate as of ${today}.</p>
          <p>For detailed analysis or questions, please contact your marketing team.</p>
        </div>
      </div>
    </body>
    </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${new Date().toISOString().split('T')[0]}.html`
    a.click()
    toast.success('Report exported as HTML')
  }

  const exportAsJSON = () => {
    if (selectedChannels.length === 0) {
      toast.error('Select at least one channel to export')
      return
    }

    const selectedData = metrics.filter(m => selectedChannels.includes(m.channel))
    const exportData = {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        totalChannels: selectedData.length,
        totalMetrics: selectedData.reduce((sum, c) => sum + c.metrics.length, 0),
      },
      executiveSummary,
      conclusions,
      channels: selectedData.map(m => ({
        channel: m.label,
        summary: channelSummaries[m.channel] || '',
        totalMetrics: m.metrics.length,
        metrics: m.metrics.map(metric => ({
          name: metric.label,
          value: metric.value,
          unit: metric.unit,
          previousValue: metric.previous,
          changePercent: metric.deltaPercent,
          trend: metric.trend,
        })),
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast.success('Report exported as JSON')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading report data...</p>
        </div>
      </div>
    )
  }

  const selectedData = metrics.filter(m => selectedChannels.includes(m.channel))
  const totalMetrics = selectedData.reduce((sum, c) => sum + c.metrics.length, 0)
  const positiveMetrics = selectedData.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'up').length, 0)
  const negativeMetrics = selectedData.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'down').length, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Marketing Performance Report
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create comprehensive reports with data, charts, summaries, and conclusions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Metrics</p>
            <p className="text-3xl font-bold mt-2">{totalMetrics}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Positive Trends</p>
            <p className="text-3xl font-bold text-emerald-500 mt-2">↑{positiveMetrics}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Areas of Concern</p>
            <p className="text-3xl font-bold text-red-500 mt-2">↓{negativeMetrics}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Selected Channels</p>
            <p className="text-3xl font-bold mt-2">{selectedChannels.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Channel Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Channels</CardTitle>
              <CardDescription className="text-xs">
                {selectedChannels.length} of {metrics.length} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.map(m => (
                <label key={m.channel} className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded transition-colors">
                  <Checkbox
                    checked={selectedChannels.includes(m.channel)}
                    onCheckedChange={() => toggleChannel(m.channel)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.metrics.length} metrics</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {selectedChannels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={exportAsHTML} variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as HTML
                </Button>
                <Button onClick={exportAsJSON} variant="outline" className="w-full justify-start">
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
                <Button onClick={generateReport} disabled={generating} className="w-full mt-2">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Report Builder */}
        <div className="lg:col-span-3 space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>Overview of performance across selected channels</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write your executive summary here. Include key highlights, trends, and strategic observations..."
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Key Metrics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Metrics Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Metrics</p>
                  <p className="text-2xl font-bold mt-2">{totalMetrics}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Positive</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">↑{positiveMetrics}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Declining</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">↓{negativeMetrics}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Stable</p>
                  <p className="text-2xl font-bold mt-2">{totalMetrics - positiveMetrics - negativeMetrics}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Channel Details */}
          {selectedData.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Channel Performance Details</h2>
              {selectedData.map(channel => {
                const posCount = channel.metrics.filter(m => m.trend === 'up').length
                const negCount = channel.metrics.filter(m => m.trend === 'down').length

                return (
                  <Card key={channel.channel}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: getChannel(channel.channel)?.color }}
                          />
                          <div>
                            <CardTitle className="text-base">{channel.label}</CardTitle>
                            <CardDescription className="text-xs">
                              {channel.metrics.length} metrics · {posCount} positive · {negCount} declining
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Metrics Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Metric</th>
                              <th className="text-right py-2 px-2">Current</th>
                              <th className="text-center py-2 px-2">Trend</th>
                              <th className="text-right py-2 px-2">Previous</th>
                              <th className="text-right py-2 px-2">Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {channel.metrics.map(metric => (
                              <tr key={metric.key} className="border-b hover:bg-muted/50">
                                <td className="py-3 px-2">{metric.label}</td>
                                <td className="text-right py-3 px-2 font-semibold">
                                  {formatValue(metric.value)} {metric.unit}
                                </td>
                                <td className="text-center py-3 px-2">
                                  <span className={metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}>
                                    {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '—'}
                                  </span>
                                </td>
                                <td className="text-right py-3 px-2 text-muted-foreground">
                                  {metric.previous ? formatValue(metric.previous) : '—'}
                                </td>
                                <td className={`text-right py-3 px-2 font-semibold ${metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-red-600' : ''}`}>
                                  {metric.deltaPercent ? (metric.deltaPercent > 0 ? '+' : '') + metric.deltaPercent.toFixed(1) + '%' : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mini Chart for top metric */}
                      {channel.metrics.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold mb-3">Top Metric Trend — {channel.metrics[0].label}</p>
                          <div className="w-full h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={generateMetricHistory(channel.metrics[0].value, channel.metrics[0].trend)}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatValue(value) : ''} />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke={channel.metrics[0].trend === 'up' ? '#10b981' : channel.metrics[0].trend === 'down' ? '#ef4444' : '#6b7280'}
                                  dot={false}
                                  strokeWidth={2}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Platform Summary */}
                      <div className="pt-4 border-t">
                        <p className="text-sm font-semibold mb-3">{channel.label} Analysis & Summary</p>
                        <Textarea
                          placeholder={`Write your analysis for ${channel.label}. Include key findings, challenges, opportunities, and recommendations specific to this platform...`}
                          value={channelSummaries[channel.channel] || ''}
                          onChange={(e) => updateChannelSummary(channel.channel, e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Conclusions */}
          <Card>
            <CardHeader>
              <CardTitle>Conclusions & Recommendations</CardTitle>
              <CardDescription>Summary and next steps based on the data</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Document your conclusions, key findings, and recommended actions..."
                value={conclusions}
                onChange={(e) => setConclusions(e.target.value)}
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
