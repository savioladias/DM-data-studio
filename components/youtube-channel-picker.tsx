'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface YouTubeChannelPickerProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (channelId: string) => void
}

export function YouTubeChannelPicker({ projectId, open, onOpenChange, onSelect }: YouTubeChannelPickerProps) {
  const [channelId, setChannelId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async () => {
    if (!channelId.trim()) {
      setError('Please enter a Channel ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/youtube-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, channelId: channelId.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save channel')
      }

      onSelect(channelId.trim())
      setChannelId('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select YouTube Channel</DialogTitle>
          <DialogDescription>
            Enter your YouTube Channel ID to connect your channel metrics
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Channel ID</label>
            <Input
              placeholder="e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw"
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value)
                setError('')
              }}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Find your Channel ID in YouTube Studio → Settings → Channel → Basic Info
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
