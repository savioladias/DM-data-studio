'use client'

import { use, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Loader2, FileJson, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

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

interface ProjectData {
  id: string
  clientName: string
  createdAt: string
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
  const [savedSummaries, setSavedSummaries] = useState<Record<string, string>>({})
  const [editingChannel, setEditingChannel] = useState<ChannelId | null>(null)
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generatingAI, setGeneratingAI] = useState<ChannelId | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch metrics
        const metricsRes = await fetch(`/api/projects/${projectId}/metrics`)
        const metricsData = await metricsRes.json()

        const reportData = Object.entries(metricsData.metrics ?? {}).map(([channelId, channelMetrics]) => ({
          channel: channelId as ChannelId,
          label: getChannel(channelId as ChannelId)?.label ?? channelId,
          metrics: channelMetrics as ReportMetrics['metrics'],
        }))

        setMetrics(reportData)
        setSelectedChannels(reportData.map(m => m.channel))

        // Fetch project data for client name
        const projectRes = await fetch(`/api/projects/${projectId}`)
        const projData = await projectRes.json()
        setProjectData(projData)

        // Set default date range (last 30 days)
        const end = new Date()
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        setStartDate(start.toISOString().split('T')[0])
        setEndDate(end.toISOString().split('T')[0])
      } catch (error) {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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

  const exportAsPDF = async () => {
    if (selectedChannels.length === 0) {
      toast.error('Select at least one channel to export')
      return
    }

    setExporting(true)
    try {
      const selectedDataList = metrics.filter(m => selectedChannels.includes(m.channel))
      const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      const totalMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.length, 0)
      const positiveMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'up').length, 0)
      const negativeMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'down').length, 0)

      // Generate HTML content with proper styling
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .page { page-break-after: always; padding: 40px; min-height: 297mm; }
    .cover-page { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
    .cover-page h1 { font-size: 48px; margin-bottom: 20px; color: #1a1a1a; }
    .cover-page .client-name { font-size: 28px; font-weight: 600; color: #0084ff; margin: 30px 0; }
    .cover-page .date-range { font-size: 16px; color: #666; margin: 10px 0; }
    .cover-page .generated { font-size: 12px; color: #999; margin-top: 40px; }

    h2 { font-size: 24px; margin: 30px 0 15px 0; color: #1a1a1a; border-bottom: 2px solid #0084ff; padding-bottom: 10px; }
    h3 { font-size: 16px; margin: 20px 0 10px 0; color: #1a1a1a; }

    .executive-summary { background: #f0f7ff; padding: 20px; border-left: 4px solid #0084ff; border-radius: 4px; margin: 20px 0; line-height: 1.5; }
    .executive-summary h3 { margin-top: 0; color: #0084ff; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .kpi-card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; text-align: center; border-radius: 4px; }
    .kpi-value { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
    .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; }

    .channel-section { page-break-inside: avoid; margin: 30px 0; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; }
    .channel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
    .channel-icon { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; }
    .channel-title { font-size: 18px; font-weight: bold; color: #1a1a1a; }
    .channel-meta { font-size: 12px; color: #666; }

    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; border-bottom: 2px solid #ddd; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
    tr:last-child td { border-bottom: none; }

    .metric-value { font-weight: 600; color: #1a1a1a; }
    .positive { color: #10b981; font-weight: bold; }
    .negative { color: #ef4444; font-weight: bold; }
    .stable { color: #666; }

    .ai-insights { background: #e6f7ff; border-left: 3px solid #0084ff; padding: 15px; margin: 15px 0; border-radius: 4px; font-size: 12px; line-height: 1.6; }
    .ai-insights h4 { margin: 0 0 10px 0; color: #0084ff; font-size: 13px; }

    .conclusions { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .conclusions h3 { margin-top: 0; color: #0284c7; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <h1>Marketing Performance Report</h1>
    <div class="client-name">${projectData?.clientName ?? 'Project'}</div>
    <div class="date-range">Date Range: ${startDate ?? 'N/A'} to ${endDate ?? 'N/A'}</div>
    <div class="generated">Generated on ${today}</div>
  </div>

  <!-- Main Content Page -->
  <div class="page">
    <h2>Executive Summary</h2>
    <div class="executive-summary">
      <p>${executiveSummary || 'Overview of marketing performance across selected channels. Key highlights and trends are detailed in the channel-specific sections below.'}</p>
    </div>

    <h2>Key Metrics Overview</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value" style="color: #0084ff;">${totalMetricsCount}</div>
        <div class="kpi-label">Total Metrics</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value positive">${positiveMetricsCount}</div>
        <div class="kpi-label">Positive Trends</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value negative">${negativeMetricsCount}</div>
        <div class="kpi-label">Areas of Concern</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totalMetricsCount - positiveMetricsCount - negativeMetricsCount}</div>
        <div class="kpi-label">Stable Metrics</div>
      </div>
    </div>

    ${selectedDataList.map(channel => {
      const posCount = channel.metrics.filter(m => m.trend === 'up').length
      const negCount = channel.metrics.filter(m => m.trend === 'down').length
      const channelColor = getChannel(channel.channel)?.color || '#0084ff'

      return `
        <div class="channel-section">
          <div class="channel-header">
            <div class="channel-icon" style="background-color: ${channelColor};">${getChannel(channel.channel)?.label.charAt(0) || 'C'}</div>
            <div>
              <div class="channel-title">${channel.label}</div>
              <div class="channel-meta">${channel.metrics.length} metrics • ${posCount} positive • ${negCount} declining</div>
            </div>
          </div>

          ${channel.metrics[0] ? `
            <div style="margin: 15px 0;">
              <h3 style="margin-top: 0; margin-bottom: 10px;">Top Metric Trend Chart</h3>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; text-align: center; font-size: 12px; color: #666;">
                [Chart: ${channel.metrics[0].label} - 30 Day Trend]
              </div>
            </div>
          ` : ''}

          <h3>Performance Metrics</h3>
          <table>
            <thead>
              <tr>
                <th>Metric Name</th>
                <th style="text-align: right;">Current Value</th>
                <th style="text-align: right;">Previous Period</th>
                <th style="text-align: center;">Change</th>
              </tr>
            </thead>
            <tbody>
              ${channel.metrics.map(metric => {
                const isPositive = metric.trend === 'up'
                const isNegative = metric.trend === 'down'
                const arrow = isPositive ? '↑' : isNegative ? '↓' : '—'
                const changeClass = isPositive ? 'positive' : isNegative ? 'negative' : 'stable'
                const changePct = metric.deltaPercent ? (metric.deltaPercent > 0 ? '+' : '') + metric.deltaPercent.toFixed(1) + '%' : '—'

                return `
                  <tr>
                    <td><strong>${metric.label}</strong></td>
                    <td style="text-align: right;" class="metric-value">${formatValue(metric.value)} ${metric.unit}</td>
                    <td style="text-align: right;">${metric.previous ? formatValue(metric.previous) : '—'}</td>
                    <td style="text-align: center;"><span class="${changeClass}">${arrow} ${changePct}</span></td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          ${savedSummaries[channel.channel] ? `
            <div class="ai-insights">
              <h4>📊 AI Insights & Channel Summary</h4>
              <p>${savedSummaries[channel.channel].replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
        </div>
      `
    }).join('')}

    ${conclusions ? `
      <div class="conclusions">
        <h3>Conclusions & Recommendations</h3>
        <p>${conclusions}</p>
      </div>
    ` : ''}
  </div>
</body>
</html>
      `

      // Create a sandboxed iframe to completely isolate from Tailwind CSS
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.width = '1200px'
      iframe.style.height = '100vh'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) throw new Error('Could not access iframe document')

      iframeDoc.documentElement.innerHTML = htmlContent

      // Wait for iframe content to load
      await new Promise(resolve => setTimeout(resolve, 500))

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      })
      document.body.removeChild(iframe)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }

      pdf.save(`marketing-report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Report exported as PDF')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Channel Selection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Date Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-sm border border-border rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-sm border border-border rounded-md"
                />
              </div>
            </CardContent>
          </Card>

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
                <Button onClick={exportAsPDF} disabled={exporting} className="w-full justify-start bg-primary hover:bg-primary/90">
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download PDF
                </Button>
                <Button onClick={exportAsHTML} variant="outline" className="w-full justify-start text-xs">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as HTML
                </Button>
                <Button onClick={exportAsJSON} variant="outline" className="w-full justify-start text-xs">
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
                <Button onClick={generateReport} disabled={generating} variant="outline" className="w-full mt-2 text-xs">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Generate Insights
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
                className="min-h-[120px] border border-border bg-muted/30 p-4"
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
                            className="h-5 w-5 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: getChannel(channel.channel)?.color }}
                          >
                            {getChannel(channel.channel)?.label.charAt(0) || 'C'}
                          </div>
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
                      {channel.metrics.length > 0 && (() => {
                        const chartData = generateMetricHistory(channel.metrics[0].value, channel.metrics[0].trend)
                        const trendColor = channel.metrics[0].trend === 'up' ? '#10b981' : channel.metrics[0].trend === 'down' ? '#ef4444' : '#6b7280'
                        return (
                          <div>
                            <p className="text-sm font-semibold mb-3">Top Metric Trend — {channel.metrics[0].label}</p>
                            <div className="w-full h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                  <defs>
                                    <linearGradient id={`gradient-report-${channel.channel}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={trendColor} stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    stroke="currentColor"
                                    opacity={0.5}
                                    interval={Math.floor(chartData.length / 5)}
                                  />
                                  <YAxis tick={{ fontSize: 12 }} tickLine={false} stroke="currentColor" opacity={0.5} />
                                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatValue(value) : ''} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                  <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={trendColor}
                                    fill={`url(#gradient-report-${channel.channel})`}
                                    dot={false}
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Platform Summary */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">{channel.label} Analysis & Summary</p>
                          {savedSummaries[channel.channel] && editingChannel !== channel.channel && (
                            <Button
                              onClick={() => {
                                setEditingChannel(channel.channel)
                                setChannelSummaries(prev => ({
                                  ...prev,
                                  [channel.channel]: savedSummaries[channel.channel]
                                }))
                              }}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Edit
                            </Button>
                          )}
                        </div>

                        {savedSummaries[channel.channel] && editingChannel !== channel.channel ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                            {savedSummaries[channel.channel]}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Textarea
                              placeholder={`Write your analysis for ${channel.label}. Include key findings, challenges, opportunities, and recommendations specific to this platform...`}
                              value={channelSummaries[channel.channel] || ''}
                              onChange={(e) => updateChannelSummary(channel.channel, e.target.value)}
                              className="min-h-[100px] border border-border bg-muted/30 p-4"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setSavedSummaries(prev => ({
                                    ...prev,
                                    [channel.channel]: channelSummaries[channel.channel]
                                  }))
                                  setEditingChannel(null)
                                  toast.success('Summary saved')
                                }}
                                size="sm"
                                disabled={!channelSummaries[channel.channel]?.trim()}
                              >
                                Save Summary
                              </Button>
                              {editingChannel === channel.channel && (
                                <Button
                                  onClick={() => {
                                    setEditingChannel(null)
                                    setChannelSummaries(prev => ({
                                      ...prev,
                                      [channel.channel]: savedSummaries[channel.channel] || ''
                                    }))
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                onClick={async () => {
                                  setGeneratingAI(channel.channel)
                                  try {
                                    const selectedDat = metrics.filter(m => selectedChannels.includes(m.channel))
                                    const channelData = selectedDat.find(c => c.channel === channel.channel)

                                    const res = await fetch('/api/ai/insights', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        projectId,
                                        type: 'channel_analysis',
                                        data: {
                                          channel: channel.label,
                                          metrics: channelData?.metrics.map(m => ({
                                            name: m.label,
                                            value: m.value,
                                            unit: m.unit,
                                            previousValue: m.previous,
                                            changePercent: m.deltaPercent,
                                            trend: m.trend,
                                          })) || [],
                                        },
                                      }),
                                    })

                                    if (res.ok) {
                                      const data = await res.json()
                                      const aiSummary = data.message || data.insight || 'Unable to generate summary'
                                      setChannelSummaries(prev => ({
                                        ...prev,
                                        [channel.channel]: aiSummary
                                      }))
                                      toast.success('AI summary generated')
                                    } else if (res.status === 503) {
                                      toast.error('AI features unavailable. Configure API key.')
                                    } else {
                                      toast.error('Failed to generate AI summary')
                                    }
                                  } catch (error) {
                                    toast.error('Error generating AI summary')
                                  } finally {
                                    setGeneratingAI(null)
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                disabled={generatingAI === channel.channel}
                              >
                                {generatingAI === channel.channel ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  'Generate with AI'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
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
                className="min-h-[150px] border border-border bg-muted/30 p-4"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
