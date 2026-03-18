'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Mail, Plus, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { ChannelId } from '@/lib/channels'

interface ScheduledReport {
  id: string
  recipientEmail: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  hour: number
  enabled: boolean
  includeChannels?: string | null
  lastSentAt?: string | null
  nextSendAt?: string | null
}

interface ScheduledReportsSectionProps {
  projectId: string
  enabledChannels: ChannelId[]
}

export function ScheduledReportsSection({ projectId, enabledChannels }: ScheduledReportsSectionProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    recipientEmail: '',
    name: 'Weekly Report',
    frequency: 'weekly' as const,
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 9,
    includeChannels: enabledChannels,
  })

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/scheduled-reports`)
      const data = await res.json()
      setReports(data.reports || [])
    } catch {
      toast.error('Failed to load scheduled reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [projectId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.recipientEmail || !formData.name) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/scheduled-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to create report')

      toast.success('Report scheduled successfully')
      setDialogOpen(false)
      fetchReports()
      setFormData({
        recipientEmail: '',
        name: 'Weekly Report',
        frequency: 'weekly',
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: 9,
        includeChannels: enabledChannels,
      })
    } catch {
      toast.error('Failed to schedule report')
    }
  }

  const handleDelete = async (reportId: string) => {
    if (!window.confirm('Delete this scheduled report?')) return

    try {
      const res = await fetch(`/api/projects/${projectId}/scheduled-reports?reportId=${reportId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Report deleted')
      fetchReports()
    } catch {
      toast.error('Failed to delete report')
    }
  }

  const frequencyLabels = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
  }

  const getNextSendLabel = (nextSendAt?: string | null) => {
    if (!nextSendAt) return 'Pending'
    const date = new Date(nextSendAt)
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Scheduled Reports
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically send performance reports to your email
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Report
        </Button>
      </CardHeader>

      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No scheduled reports yet</p>
            <p className="text-xs mt-1">Schedule one to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div
                key={report.id}
                className="flex items-start justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{report.name}</h4>
                    <Badge variant={report.enabled ? 'default' : 'secondary'} className="text-xs">
                      {report.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{report.recipientEmail}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{frequencyLabels[report.frequency as keyof typeof frequencyLabels]}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {report.hour}:00
                    </div>
                    <span>•</span>
                    <span>Next: {getNextSendLabel(report.nextSendAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(report.id)}
                  className="text-destructive hover:text-destructive ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Performance"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.recipientEmail}
                onChange={e => setFormData({ ...formData, recipientEmail: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="hour">Time (UTC)</Label>
                <Select value={String(formData.hour)} onValueChange={(val) => setFormData({ ...formData, hour: parseInt(val) })}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {(formData.frequency as string) === 'weekly' && (
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select value={String(formData.dayOfWeek)} onValueChange={(val) => setFormData({ ...formData, dayOfWeek: parseInt(val) })}>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                    <option key={i} value={String(i)}>
                      {day}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {(formData.frequency as string) === 'monthly' && (
              <div>
                <Label htmlFor="dayOfMonth">Day of Month</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="28"
                  value={formData.dayOfMonth}
                  onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
