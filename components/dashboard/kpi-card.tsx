'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  projectId: string
  channel: string
  metricKey: string
  label: string
  value: number | string
  previous?: number
  unit?: string
  deltaPercent?: number
  trend?: 'up' | 'down' | 'stable'
  inverseColors?: boolean // e.g. bounce rate — lower is better
}

export function KpiCard({
  projectId,
  channel,
  metricKey,
  label,
  value,
  previous,
  unit = '',
  deltaPercent,
  trend,
  inverseColors = false,
}: KpiCardProps) {
  const [aiInsight, setAiInsight] = useState<string>('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(true)

  const isPositive = inverseColors ? trend === 'down' : trend === 'up'
  const isNegative = inverseColors ? trend === 'up' : trend === 'down'

  const formatValue = (v: number | string) => {
    if (typeof v === 'string') return v
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toLocaleString()
  }

  const fetchInsight = async () => {
    setLoadingInsight(true)
    setDialogOpen(true)

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'metric',
          channel,
          metricKey,
          data: {
            metricName: label,
            currentValue: value,
            previousValue: previous,
            deltaPercent,
            channel,
            unit,
            trend,
          },
        }),
      })

      const data = await res.json()
      if (res.status === 503) {
        setAiAvailable(false)
        setAiInsight(data.error || 'AI features are not available. Please ensure Ollama is running: https://ollama.ai')
      } else if (data.insight) {
        setAiInsight(data.insight)
        setAiAvailable(true)
      } else if (data.error) {
        setAiInsight(`Unable to generate insight: ${data.error}`)
      }
    } catch {
      setAiInsight('Failed to connect to AI service.')
    } finally {
      setLoadingInsight(false)
    }
  }

  return (
    <>
      <Card className="group hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {label}
            </p>
            {aiAvailable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary"
                onClick={fetchInsight}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Explain
              </Button>
            )}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {unit && ['£', '$', '€'].includes(unit) && <span className="text-lg text-muted-foreground">{unit}</span>}
                {formatValue(value)}
                {unit && !['£', '$', '€'].includes(unit) && (
                  <span className="text-sm text-muted-foreground ml-1">{unit}</span>
                )}
              </p>

              {deltaPercent !== undefined && (
                <div className={cn(
                  'flex items-center gap-1 text-xs mt-1',
                  isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                  <span>
                    {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}% vs prev.
                  </span>
                </div>
              )}
            </div>

            {/* Mini trend indicator */}
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center',
              isPositive ? 'bg-emerald-500/10' : isNegative ? 'bg-red-500/10' : 'bg-muted'
            )}>
              {isPositive && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
              {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insight Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Analysis — {label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-sm grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium">{unit && ['£', '$', '€'].includes(unit) ? unit : ''}{formatValue(value)}{unit && !['£', '$', '€'].includes(unit) ? ' ' + unit : ''}</span>
              </div>
              {deltaPercent !== undefined && (
                <div>
                  <span className="text-muted-foreground">Change: </span>
                  <span className={cn('font-medium', isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : '')}>
                    {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            <div className="min-h-[80px] flex items-start">
              {loadingInsight ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing with Claude AI...
                </div>
              ) : aiInsight ? (
                <p className="text-sm leading-relaxed">{aiInsight}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
