'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Anomaly {
  metricKey: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  value?: number
  expectedRange?: { min: number; max: number }
}

interface AnomalyBellProps {
  anomalies: Anomaly[]
}

export function AnomalyBell({ anomalies }: AnomalyBellProps) {
  const [open, setOpen] = useState(false)

  if (anomalies.length === 0) {
    return null
  }

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="relative"
        title={`${anomalies.length} anomal${anomalies.length !== 1 ? 'ies' : 'y'} detected`}
      >
        <Bell className="h-4 w-4" />
        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
          {anomalies.length}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border bg-background shadow-xl p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b">
            <p className="text-sm font-semibold">Anomalies Detected</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {anomalies.map(anomaly => (
              <div
                key={anomaly.metricKey}
                className={cn(
                  'rounded-lg border-l-4 p-3 text-sm',
                  anomaly.severity === 'critical'
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 flex-shrink-0 mt-0.5',
                      anomaly.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{anomaly.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{anomaly.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {criticalCount > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2 text-xs text-red-800 dark:text-red-200">
              ⚠️ {criticalCount} critical anomal{criticalCount !== 1 ? 'ies' : 'y'} require attention
            </div>
          )}
        </div>
      )}
    </div>
  )
}
