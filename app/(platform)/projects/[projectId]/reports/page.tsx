'use client'

import { use, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
  const [savedExecutiveSummary, setSavedExecutiveSummary] = useState('')
  const [savedConclusions, setSavedConclusions] = useState('')
  const [editingExecutive, setEditingExecutive] = useState(false)
  const [editingConclusions, setEditingConclusions] = useState(false)
  const [generatingExecutiveAI, setGeneratingExecutiveAI] = useState(false)
  const [generatingConclusionsAI, setGeneratingConclusionsAI] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [customChannels, setCustomChannels] = useState<ChannelId[]>([])
  const [customMetrics, setCustomMetrics] = useState<Record<string, string[]>>({})

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

        // Load saved summaries
        const summariesRes = await fetch(`/api/projects/${projectId}/report-summaries`)
        if (summariesRes.ok) {
          const { summaries } = await summariesRes.json()
          if (summaries.executive_summary) {
            setSavedExecutiveSummary(summaries.executive_summary)
            setExecutiveSummary(summaries.executive_summary)
          }
          if (summaries.conclusions) {
            setSavedConclusions(summaries.conclusions)
            setConclusions(summaries.conclusions)
          }
          // Load channel summaries
          const channelMap: Record<string, string> = {}
          const savedMap: Record<string, string> = {}
          for (const [key, value] of Object.entries(summaries)) {
            if (key.startsWith('channel_')) {
              const channelId = key.replace('channel_', '')
              channelMap[channelId] = value as string
              savedMap[channelId] = value as string
            }
          }
          setChannelSummaries(channelMap)
          setSavedSummaries(savedMap)
        }

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

  const openDownloadDialog = () => {
    setCustomChannels(selectedChannels)
    const metricMap: Record<string, string[]> = {}
    selectedChannels.forEach(ch => {
      const channel = metrics.find(m => m.channel === ch)
      if (channel) {
        metricMap[ch] = channel.metrics.map(m => m.key)
      }
    })
    setCustomMetrics(metricMap)
    setDownloadDialogOpen(true)
  }

  const toggleCustomChannel = (channelId: ChannelId) => {
    setCustomChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    )
  }

  const toggleCustomMetric = (channelId: ChannelId, metricKey: string) => {
    setCustomMetrics(prev => {
      const current = (prev as Record<string, string[]>)[channelId] || []
      return {
        ...prev,
        [channelId]: current.includes(metricKey)
          ? current.filter(m => m !== metricKey)
          : [...current, metricKey],
      }
    })
  }

  const exportAsPDF = async (channelIds?: ChannelId[], metricsMap?: Record<string, string[]>) => {
      const exportChannels = channelIds || selectedChannels
      const exportMetricsMap = metricsMap || {}

      if (exportChannels.length === 0) {
        toast.error('Select at least one channel to export')
        return
      }

      setExporting(true)
      setDownloadDialogOpen(false)

      // Helper: render an HTML string in an isolated iframe and return a canvas
      const renderPage = async (html: string): Promise<HTMLCanvasElement> => {
        const { default: html2canvas } = await import('html2canvas')
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;'
        document.body.appendChild(iframe)
        const doc = iframe.contentDocument!
        doc.open()
        doc.write(html)
        doc.close()
        await new Promise(r => setTimeout(r, 300))
        const canvas = await html2canvas(doc.body, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
        })
        document.body.removeChild(iframe)
        return canvas
      }

      // Helper: convert markdown-ish text to clean HTML
      const mdToHtml = (text: string): string => {
        return text
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:#0f172a;margin:14px 0 6px;">$1</h4>')
          .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#0f172a;margin:18px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">$1</h3>')
          .replace(/^# (.+)$/gm, '<h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:20px 0 10px;">$1</h2>')
          .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
          .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;"><span style="font-weight:700;color:#6366f1;">$1.</span> $2</li>')
          .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">')
          .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
          .replace(/\n/g, '<br>')
      }

      // Shared CSS injected into every page
      const baseCSS = `
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            width: 794px;
            word-spacing: normal;
            letter-spacing: normal;
            -webkit-font-smoothing: antialiased;
          }
          li { list-style: none; }
        </style>`

      // Page mini-header reused on content pages
      const pageHeader = (clientName: string, date: string) => `
        <div style="display:table;width:100%;margin-bottom:28px;padding-bottom:14px;border-bottom:1px solid #e2e8f0;">
          <div style="display:table-cell;vertical-align:middle;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px;">Marketing Performance Report</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;">${clientName}</div>
          </div>
          <div style="display:table-cell;vertical-align:middle;text-align:right;">
            <div style="font-size:10px;color:#94a3b8;">Generated</div>
            <div style="font-size:12px;font-weight:600;color:#475569;">${date}</div>
          </div>
        </div>`

      try {
        let selectedDataList = metrics.filter(m => exportChannels.includes(m.channel))
        if (Object.keys(exportMetricsMap).length > 0) {
          selectedDataList = selectedDataList.map(channel => ({
            ...channel,
            metrics: channel.metrics.filter(m => (exportMetricsMap[channel.channel] || []).includes(m.key)),
          })).filter(channel => channel.metrics.length > 0)
        }

        const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
        const totalMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.length, 0)
        const positiveMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'up').length, 0)
        const negativeMetricsCount = selectedDataList.reduce((sum, c) => sum + c.metrics.filter(m => m.trend === 'down').length, 0)
        const stableCount = totalMetricsCount - positiveMetricsCount - negativeMetricsCount
        const clientName = projectData?.clientName ?? 'Project'

        // ── PAGE 1: COVER ──────────────────────────────────────────────────────
        const coverHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseCSS}</head><body>
          <div style="width:794px;height:1123px;overflow:hidden;position:relative;background:#ffffff;">
            <div style="height:7px;background:linear-gradient(90deg,#6366f1 0%,#8b5cf6 45%,#06b6d4 100%);"></div>
            <div style="background:#0f172a;padding:26px 48px;display:table;width:100%;">
              <div style="display:table-cell;vertical-align:middle;">
                <span style="font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Marketing Performance Report</span>
              </div>
              <div style="display:table-cell;vertical-align:middle;text-align:right;">
                <span style="font-size:11px;color:#475569;">${today}</span>
              </div>
            </div>
            <div style="padding:80px 48px 60px;background:linear-gradient(160deg,#f8fafc 0%,#eef2ff 100%);">
              <div style="display:inline-block;background:#6366f1;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:4px;margin-bottom:24px;">Performance Report</div>
              <div style="font-size:52px;font-weight:800;color:#0f172a;line-height:1.05;letter-spacing:-1.5px;margin-bottom:16px;">${clientName}</div>
              <div style="width:56px;height:4px;background:linear-gradient(90deg,#6366f1,#06b6d4);border-radius:2px;margin-bottom:22px;"></div>
              <div style="font-size:15px;color:#64748b;line-height:1.65;max-width:500px;">Comprehensive analysis of marketing channel performance, trends, and strategic insights.</div>
              <div style="margin-top:36px;font-size:13px;color:#94a3b8;"><span style="font-weight:600;color:#64748b;">Period:</span>&nbsp;${startDate || 'N/A'} — ${endDate || 'N/A'}</div>
              <div style="margin-top:10px;font-size:13px;color:#94a3b8;">${selectedDataList.length} channel${selectedDataList.length !== 1 ? 's' : ''} included</div>
            </div>
          </div>
        </body></html>`

        // ── PAGE 2: SUMMARY ────────────────────────────────────────────────────
        const execText = savedExecutiveSummary || executiveSummary
        const summaryHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseCSS}</head><body>
          <div style="width:794px;padding:44px 48px;background:#ffffff;">
            ${pageHeader(clientName, today)}
            ${execText ? `
            <div style="margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #e0e7ff;">
              <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:14px 20px;display:table;width:100%;">
                <div style="display:table-cell;vertical-align:middle;">
                  <div style="width:7px;height:7px;border-radius:50%;background:#fff;opacity:0.8;display:inline-block;margin-right:8px;vertical-align:middle;"></div>
                  <span style="font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;vertical-align:middle;">Executive Summary</span>
                </div>
              </div>
              <div style="background:#fafafe;padding:20px 22px;font-size:13px;color:#334155;line-height:1.8;">
                <p style="margin:0;">${mdToHtml(execText)}</p>
              </div>
            </div>` : ''}
            <div style="margin-bottom:28px;">
              <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:12px;display:table;width:100%;">
                <div style="display:table-cell;vertical-align:middle;">
                  <div style="width:3px;height:16px;background:linear-gradient(180deg,#6366f1,#06b6d4);border-radius:2px;display:inline-block;margin-right:10px;vertical-align:middle;"></div>
                  <span style="vertical-align:middle;">Key Metrics Overview</span>
                </div>
              </div>
              <div style="display:table;width:100%;border-spacing:10px;">
                <div style="display:table-row;">
                  <div style="display:table-cell;width:25%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:26px;font-weight:800;color:#6366f1;line-height:1;">${totalMetricsCount}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-top:5px;">Total Metrics</div>
                  </div>
                  <div style="display:table-cell;width:25%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:26px;font-weight:800;color:#059669;line-height:1;">${positiveMetricsCount}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-top:5px;">Positive Trends</div>
                  </div>
                  <div style="display:table-cell;width:25%;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:26px;font-weight:800;color:#dc2626;line-height:1;">${negativeMetricsCount}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-top:5px;">Areas of Concern</div>
                  </div>
                  <div style="display:table-cell;width:25%;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:26px;font-weight:800;color:#d97706;line-height:1;">${stableCount}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-top:5px;">Stable Metrics</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:12px;">
                <div style="width:3px;height:16px;background:linear-gradient(180deg,#6366f1,#06b6d4);border-radius:2px;display:inline-block;margin-right:10px;vertical-align:middle;"></div>
                <span style="vertical-align:middle;">Channels Included</span>
              </div>
              <div style="display:table;width:100%;border-spacing:8px 8px;">
                ${selectedDataList.map(ch => {
                  const chColor = getChannel(ch.channel)?.color || '#6366f1'
                  const chInitial = (getChannel(ch.channel)?.label || ch.label).charAt(0).toUpperCase()
                  const pos = ch.metrics.filter(m => m.trend === 'up').length
                  const neg = ch.metrics.filter(m => m.trend === 'down').length
                  return `<div style="display:table-row;">
                    <div style="display:table-cell;padding:4px;">
                      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;display:table;width:100%;">
                        <div style="display:table-cell;vertical-align:middle;width:44px;">
                          <div style="width:36px;height:36px;border-radius:8px;background:${chColor};text-align:center;line-height:36px;color:#fff;font-size:15px;font-weight:800;">${chInitial}</div>
                        </div>
                        <div style="display:table-cell;vertical-align:middle;padding-left:10px;">
                          <div style="font-size:13px;font-weight:700;color:#0f172a;">${ch.label}</div>
                          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${ch.metrics.length} metrics &nbsp;·&nbsp; <span style="color:#059669;">${pos} up</span> &nbsp;·&nbsp; <span style="color:#dc2626;">${neg} down</span></div>
                        </div>
                      </div>
                    </div>
                  </div>`
                }).join('')}
              </div>
            </div>
          </div>
        </body></html>`

        // ── PAGES 3+: ONE PER CHANNEL (table only) ────────────────────────────
        const channelTablePages = selectedDataList.map(channel => {
          const posCount = channel.metrics.filter(m => m.trend === 'up').length
          const negCount = channel.metrics.filter(m => m.trend === 'down').length
          const channelColor = getChannel(channel.channel)?.color || '#6366f1'
          const channelInitial = (getChannel(channel.channel)?.label || channel.label).charAt(0).toUpperCase()

          const rows = channel.metrics.map((metric, idx) => {
            const isPositive = metric.trend === 'up'
            const isNegative = metric.trend === 'down'
            const arrow = isPositive ? '▲' : isNegative ? '▼' : '—'
            const changePct = metric.deltaPercent != null
              ? (metric.deltaPercent > 0 ? '+' : '') + metric.deltaPercent.toFixed(1) + '%'
              : '—'
            const changeColor = isPositive ? '#059669' : isNegative ? '#dc2626' : '#6b7280'
            const changeBg = isPositive ? '#dcfce7' : isNegative ? '#fee2e2' : '#f1f5f9'
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
            return `<tr style="background:${rowBg};">
              <td style="padding:10px 18px;font-size:13px;font-weight:500;color:#1e293b;border-bottom:1px solid #e2e8f0;">${metric.label}</td>
              <td style="padding:10px 18px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatValue(metric.value)}${metric.unit ? ' ' + metric.unit : ''}</td>
              <td style="padding:10px 18px;font-size:13px;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;">${metric.previous != null ? formatValue(metric.previous) : '—'}</td>
              <td style="padding:10px 18px;text-align:center;border-bottom:1px solid #e2e8f0;">
                <span style="background:${changeBg};color:${changeColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;">${arrow} ${changePct}</span>
              </td>
            </tr>`
          }).join('')

          return `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseCSS}</head><body>
            <div style="width:794px;padding:44px 48px;background:#ffffff;">
              ${pageHeader(clientName, today)}
              <div style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 6px rgba(0,0,0,0.06);">
                <div style="background:${channelColor};padding:20px 24px;display:table;width:100%;">
                  <div style="display:table-cell;vertical-align:middle;width:56px;">
                    <div style="width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,0.2);text-align:center;line-height:44px;color:#fff;font-size:20px;font-weight:800;">${channelInitial}</div>
                  </div>
                  <div style="display:table-cell;vertical-align:middle;padding-left:4px;">
                    <div style="font-size:19px;font-weight:800;color:#fff;">${channel.label}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px;">${channel.metrics.length} metrics tracked</div>
                  </div>
                  <div style="display:table-cell;vertical-align:middle;text-align:right;">
                    <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);margin-left:6px;">${posCount} positive</span>
                    <span style="background:rgba(0,0,0,0.15);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);margin-left:6px;">${negCount} declining</span>
                  </div>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:11px 18px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:2px solid #e2e8f0;">Metric</th>
                      <th style="padding:11px 18px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;text-align:right;border-bottom:2px solid #e2e8f0;">Current</th>
                      <th style="padding:11px 18px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;text-align:right;border-bottom:2px solid #e2e8f0;">Previous</th>
                      <th style="padding:11px 18px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;text-align:center;border-bottom:2px solid #e2e8f0;">Change</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </body></html>`
        })

        // ── PAGES: ONE PER CHANNEL AI SUMMARY ─────────────────────────────────
        const channelSummaryPages = selectedDataList
          .filter(channel => savedSummaries[channel.channel])
          .map(channel => {
            const channelColor = getChannel(channel.channel)?.color || '#6366f1'
            const summaryText = savedSummaries[channel.channel]
            return `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseCSS}</head><body>
              <div style="width:794px;padding:44px 48px;background:#ffffff;">
                ${pageHeader(clientName, today)}
                <div style="border-radius:10px;overflow:hidden;border:1px solid #e0f2fe;">
                  <div style="background:${channelColor};padding:14px 20px;display:table;width:100%;">
                    <div style="display:table-cell;vertical-align:middle;">
                      <div style="width:7px;height:7px;border-radius:50%;background:#fff;opacity:0.8;display:inline-block;margin-right:8px;vertical-align:middle;"></div>
                      <span style="font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;vertical-align:middle;">${channel.label} — AI Analysis</span>
                    </div>
                  </div>
                  <div style="background:#f8fafc;padding:24px 26px;font-size:13px;color:#334155;line-height:1.85;">
                    <p style="margin:0;">${mdToHtml(summaryText)}</p>
                  </div>
                </div>
              </div>
            </body></html>`
          })

        // ── CONCLUSIONS PAGE ───────────────────────────────────────────────────
        const conclusionsText = savedConclusions || conclusions
        const conclusionPages = conclusionsText ? [`<!DOCTYPE html><html><head><meta charset="UTF-8">${baseCSS}</head><body>
          <div style="width:794px;padding:44px 48px;background:#ffffff;">
            ${pageHeader(clientName, today)}
            <div style="border-radius:10px;overflow:hidden;border:1px solid #bae6fd;">
              <div style="background:linear-gradient(135deg,#0284c7 0%,#0ea5e9 100%);padding:14px 20px;">
                <div style="width:7px;height:7px;border-radius:50%;background:#fff;opacity:0.8;display:inline-block;margin-right:8px;vertical-align:middle;"></div>
                <span style="font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;vertical-align:middle;">Conclusions &amp; Recommendations</span>
              </div>
              <div style="background:#f0f9ff;padding:24px 26px;font-size:13px;color:#334155;line-height:1.85;">
                <p style="margin:0;">${mdToHtml(conclusionsText)}</p>
              </div>
            </div>
            <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:table;width:100%;">
              <div style="display:table-cell;font-size:10px;color:#94a3b8;">Data accurate as of ${today}.</div>
              <div style="display:table-cell;text-align:right;font-size:10px;color:#cbd5e1;font-weight:600;">DM Data Studio</div>
            </div>
          </div>
        </body></html>`] : []

        // ── RENDER ALL PAGES & BUILD PDF ───────────────────────────────────────
        const allPageHtmls = [
          coverHtml,
          summaryHtml,
          ...channelTablePages,
          ...channelSummaryPages,
          ...conclusionPages,
        ]

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const A4_W = 210
        const A4_H = 297

        for (let i = 0; i < allPageHtmls.length; i++) {
          const canvas = await renderPage(allPageHtmls[i])
          const imgData = canvas.toDataURL('image/png')
          const imgH = (canvas.height * A4_W) / canvas.width
          if (i > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, A4_W, imgH > A4_H ? A4_H : imgH)
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
                <label key={m.channel} className="flex items-start gap-3 cursor-pointer hover:bg-muted p-2 rounded transition-colors">
                  <Checkbox
                    checked={selectedChannels.includes(m.channel)}
                    onCheckedChange={() => toggleChannel(m.channel)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-0">
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
                <Button onClick={openDownloadDialog} disabled={exporting} className="w-full justify-start bg-primary hover:bg-primary/90">
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
            <CardContent className="space-y-3">
              {savedExecutiveSummary && !editingExecutive ? (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {savedExecutiveSummary}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write your executive summary here. Include key highlights, trends, and strategic observations..."
                    value={executiveSummary}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    className="min-h-[120px] border border-border bg-muted/30 p-4"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setSavedExecutiveSummary(executiveSummary)
                        setEditingExecutive(false)
                        await fetch(`/api/projects/${projectId}/report-summaries`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'executive_summary', body: executiveSummary }),
                        })
                        toast.success('Executive summary saved')
                      }}
                      size="sm"
                      disabled={!executiveSummary?.trim()}
                    >
                      Save Summary
                    </Button>
                    {editingExecutive && (
                      <Button
                        onClick={() => {
                          setEditingExecutive(false)
                          setExecutiveSummary(savedExecutiveSummary || '')
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={async () => {
                        setGeneratingExecutiveAI(true)
                        try {
                          const res = await fetch('/api/ai/insights', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectId,
                              type: 'executive_summary',
                              data: {
                                metrics: metrics.flatMap(m => m.metrics.map(metric => ({
                                  channel: m.label,
                                  metricName: metric.label,
                                  currentValue: metric.value,
                                  previousValue: metric.previous,
                                  deltaPercent: metric.deltaPercent,
                                  unit: metric.unit,
                                  trend: metric.trend,
                                }))),
                              },
                            }),
                          })

                          const data = await res.json()
                          if (res.ok) {
                            setExecutiveSummary(data.insight || '')
                            toast.success('Generated with AI')
                          } else {
                            toast.error(data.error || 'Failed to generate')
                          }
                        } catch (error) {
                          toast.error('Failed to generate summary')
                        } finally {
                          setGeneratingExecutiveAI(false)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      disabled={generatingExecutiveAI}
                    >
                      {generatingExecutiveAI ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate with AI'
                      )}
                    </Button>
                  </div>
                </div>
              )}
              {savedExecutiveSummary && (
                <Button
                  onClick={() => setEditingExecutive(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
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
                        <div className="flex items-center gap-3 py-0">
                          <div
                            className="h-6 w-6 rounded-md flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                            style={{ backgroundColor: getChannel(channel.channel)?.color }}
                          >
                            {getChannel(channel.channel)?.label.charAt(0) || 'C'}
                          </div>
                          <div>
                            <CardTitle className="text-base leading-none m-0">{channel.label}</CardTitle>
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
                          <div className="flex gap-2">
                            {channelSummaries[channel.channel] && !savedSummaries[channel.channel] && editingChannel !== channel.channel && (
                              <Button
                                onClick={async () => {
                                  setSavedSummaries(prev => ({ ...prev, [channel.channel]: channelSummaries[channel.channel] }))
                                  await fetch(`/api/projects/${projectId}/report-summaries`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'channel_summary', channel: channel.channel, body: channelSummaries[channel.channel] }),
                                  })
                                  toast.success('Summary saved')
                                }}
                                size="sm"
                                className="text-xs"
                              >
                                Save Summary
                              </Button>
                            )}
                            {savedSummaries[channel.channel] && editingChannel !== channel.channel && (
                              <Button
                                onClick={() => {
                                  setEditingChannel(channel.channel)
                                  setChannelSummaries(prev => ({ ...prev, [channel.channel]: savedSummaries[channel.channel] }))
                                }}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>

                        {savedSummaries[channel.channel] && editingChannel !== channel.channel ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap dark:bg-blue-950/30 dark:border-blue-800 dark:text-gray-300">
                            {savedSummaries[channel.channel]}
                          </div>
                        ) : channelSummaries[channel.channel] && editingChannel !== channel.channel ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap dark:bg-blue-950/30 dark:border-blue-800 dark:text-gray-300">
                            {channelSummaries[channel.channel]}
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
                                onClick={async () => {
                                  setSavedSummaries(prev => ({
                                    ...prev,
                                    [channel.channel]: channelSummaries[channel.channel]
                                  }))
                                  setEditingChannel(null)
                                  await fetch(`/api/projects/${projectId}/report-summaries`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'channel_summary', channel: channel.channel, body: channelSummaries[channel.channel] }),
                                  })
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
            <CardContent className="space-y-3">
              {savedConclusions && !editingConclusions ? (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {savedConclusions}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Document your conclusions, key findings, and recommended actions..."
                    value={conclusions}
                    onChange={(e) => setConclusions(e.target.value)}
                    className="min-h-[150px] border border-border bg-muted/30 p-4"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setSavedConclusions(conclusions)
                        setEditingConclusions(false)
                        await fetch(`/api/projects/${projectId}/report-summaries`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'conclusions', body: conclusions }),
                        })
                        toast.success('Conclusions saved')
                      }}
                      size="sm"
                      disabled={!conclusions?.trim()}
                    >
                      Save Summary
                    </Button>
                    {editingConclusions && (
                      <Button
                        onClick={() => {
                          setEditingConclusions(false)
                          setConclusions(savedConclusions || '')
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={async () => {
                        setGeneratingConclusionsAI(true)
                        try {
                          const res = await fetch('/api/ai/insights', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectId,
                              type: 'conclusions',
                              data: {
                                metrics: metrics.flatMap(m => m.metrics.map(metric => ({
                                  channel: m.label,
                                  metricName: metric.label,
                                  currentValue: metric.value,
                                  previousValue: metric.previous,
                                  deltaPercent: metric.deltaPercent,
                                  unit: metric.unit,
                                  trend: metric.trend,
                                }))),
                              },
                            }),
                          })

                          const data = await res.json()
                          if (res.ok) {
                            setConclusions(data.insight || '')
                            toast.success('Generated with AI')
                          } else {
                            toast.error(data.error || 'Failed to generate')
                          }
                        } catch (error) {
                          toast.error('Failed to generate conclusions')
                        } finally {
                          setGeneratingConclusionsAI(false)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      disabled={generatingConclusionsAI}
                    >
                      {generatingConclusionsAI ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate with AI'
                      )}
                    </Button>
                  </div>
                </div>
              )}
              {savedConclusions && (
                <Button
                  onClick={() => setEditingConclusions(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Download PDF Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize PDF Report</DialogTitle>
            <DialogDescription>
              Select which channels and metrics to include in your PDF report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Channels Selection */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Channels</h3>
              <div className="space-y-2">
                {metrics.map(channel => (
                  <label key={channel.channel} className="flex items-start gap-3 cursor-pointer hover:bg-muted p-2 rounded transition-colors">
                    <Checkbox
                      checked={customChannels.includes(channel.channel)}
                      onCheckedChange={() => toggleCustomChannel(channel.channel)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{channel.label}</p>
                      <p className="text-xs text-muted-foreground">{channel.metrics.length} metrics</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Metrics Selection per Channel */}
            {customChannels.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Metrics per Channel</h3>
                <div className="space-y-4">
                  {customChannels.map(channelId => {
                    const channel = metrics.find(m => m.channel === channelId)
                    if (!channel) return null

                    return (
                      <div key={channelId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: getChannel(channelId)?.color || '#ccc' }}
                          >
                            {getChannel(channelId)?.label.charAt(0) || 'C'}
                          </div>
                          <h4 className="text-sm font-medium">{channel.label}</h4>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(customMetrics[channelId] || []).length} of {channel.metrics.length} selected
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {channel.metrics.map(metric => (
                            <label key={metric.key} className="flex items-center gap-2 cursor-pointer text-xs">
                              <Checkbox
                                checked={(customMetrics[channelId] || []).includes(metric.key)}
                                onCheckedChange={() => toggleCustomMetric(channelId, metric.key)}
                              />
                              <span className="truncate">{metric.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportAsPDF(customChannels, customMetrics)}
              disabled={customChannels.length === 0 || exporting}
              className="bg-primary hover:bg-primary/90"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
