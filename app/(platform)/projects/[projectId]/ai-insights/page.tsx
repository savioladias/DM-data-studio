'use client'

import { useState, use, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2, AlertTriangle, Send, Circle } from 'lucide-react'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import { toast } from 'sonner'

interface Metric {
  key: string
  label: string
  value: number
  unit: string
}

interface PageProps {
  params: Promise<{ projectId: string }>
}

interface ChannelAI {
  loading: boolean
  text: string
}

export default function AIInsightsPage({ params }: PageProps) {
  const { projectId } = use(params)
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({})
  const [channelAI, setChannelAI] = useState<Record<string, ChannelAI>>({})
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  // Fetch metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/metrics`)
        const data = await res.json()
        setMetrics(data.metrics ?? {})
      } catch (error) {
        toast.error('Failed to load metrics')
      } finally {
        setLoadingMetrics(false)
      }
    }
    fetchMetrics()
  }, [projectId])

  const generateChannelSummary = async (channelId: string) => {
    if (channelAI[channelId]?.text) {
      // Toggle if already generated
      setChannelAI(prev => ({
        ...prev,
        [channelId]: { ...prev[channelId], loading: false }
      }))
      return
    }

    setChannelAI(prev => ({
      ...prev,
      [channelId]: { loading: true, text: '' }
    }))

    try {
      const channelMetrics = metrics[channelId as ChannelId] || []
      const channel = getChannel(channelId as ChannelId)

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
              unit: m.unit,
              channel: channel?.label || channelId,
            })),
          },
        }),
      })

      const data = await res.json()
      if (res.status === 503) {
        setAiAvailable(false)
        setChannelAI(prev => ({
          ...prev,
          [channelId]: { loading: false, text: 'AI features are not available. Please configure your Google Generative AI API key.' }
        }))
      } else if (data.insight) {
        setAiAvailable(true)
        setChannelAI(prev => ({
          ...prev,
          [channelId]: { loading: false, text: data.insight }
        }))
      } else {
        toast.error(data.error ?? 'Failed to generate summary')
        setChannelAI(prev => ({
          ...prev,
          [channelId]: { loading: false, text: '' }
        }))
      }
    } catch (error) {
      toast.error('Failed to generate summary')
      setChannelAI(prev => ({
        ...prev,
        [channelId]: { loading: false, text: '' }
      }))
    }
  }

  const askQuestion = async () => {
    if (!question.trim()) return
    setLoadingAnswer(true)
    setAnswer('')

    try {
      const allMetrics = Object.entries(metrics).flatMap(([channel, channelMetrics]) =>
        channelMetrics.map(m => ({
          metricName: m.label,
          currentValue: m.value,
          unit: m.unit,
          channel,
        }))
      )

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'channel',
          data: {
            channel: 'All Channels',
            dateRange: 'Last 30 days',
            metrics: allMetrics,
            question: question,
          },
        }),
      })

      const data = await res.json()
      if (res.status === 503) {
        setAiAvailable(false)
        setAnswer('AI features are not available. Please configure your Google Generative AI API key.')
      } else if (!res.ok) {
        setAnswer(`Error: ${data.error || 'Failed to get answer'}`)
      } else {
        setAiAvailable(true)
        setAnswer(data.insight ?? 'No response')
      }
    } catch (error) {
      setAnswer('Failed to get answer from AI. Check your connection and try again.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  const enabledChannelsWithData = Object.keys(metrics).filter(
    ch => metrics[ch as ChannelId]?.length > 0
  )

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Summary
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered performance summaries and insights for each of your connected channels.
        </p>
      </div>

      {aiAvailable === false && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-yellow-900 mb-1">AI Features Unavailable</p>
                <p className="text-sm text-yellow-800">
                  Please configure your Google Generative AI API key in <code className="bg-yellow-900/10 px-2 py-1 rounded">.env.local</code> to enable AI insights. Get a free API key from{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                    Google AI Studio
                  </a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Summaries Section */}
      {!loadingMetrics && (
        <section className="space-y-4">
          <h2 className="font-semibold">Channel Summaries</h2>
          {enabledChannelsWithData.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No channels with data yet. Connect marketing accounts in Settings to see summaries.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {enabledChannelsWithData.map(channelId => {
                const channel = getChannel(channelId as ChannelId)
                const channelMetrics = metrics[channelId as ChannelId] || []
                const topMetrics = channelMetrics.slice(0, 3)
                const ai = channelAI[channelId]

                return (
                  <Card key={channelId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {channel && (
                            <Circle
                              className="h-3 w-3 fill-current flex-shrink-0"
                              style={{ color: channel.color }}
                            />
                          )}
                          <div>
                            <CardTitle className="text-base">{channel?.label || channelId}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {channel && (
                                <Badge variant="outline" className="text-xs">
                                  {channel.category}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {channelMetrics.length} metrics
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Top 3 KPI preview */}
                      {topMetrics.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {topMetrics.map(m => (
                            <div key={m.key} className="text-xs bg-muted p-2 rounded">
                              <p className="text-muted-foreground truncate">{m.label}</p>
                              <p className="font-semibold">{m.value}{m.unit && `${m.unit}`}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => generateChannelSummary(channelId)}
                        disabled={!ai?.text && ai?.loading || aiAvailable === false}
                        size="sm"
                        variant={ai?.text ? 'outline' : 'default'}
                      >
                        {ai?.loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {ai?.text ? 'Hide Summary' : 'Generate AI Summary'}
                          </>
                        )}
                      </Button>

                      {ai?.text && (
                        <div className="text-sm leading-relaxed whitespace-pre-line pt-2 border-t">
                          {ai.text}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Ask AI Section */}
      <section>
        <h2 className="font-semibold mb-4">Ask About Your Data</h2>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="e.g. Why did our CPA increase last week? Which channel has the best ROAS? What should we focus on?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
            />
            <Button onClick={askQuestion} disabled={loadingAnswer || !question.trim() || aiAvailable === false} size="sm">
              {loadingAnswer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Ask
            </Button>

            {answer && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                  <Sparkles className="h-3 w-3" />
                  AI Answer
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{answer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
