'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

export function GSCSitePicker({ projectId, open, onClose }: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const [siteUrl, setSiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!siteUrl.trim()) {
      setError('Please enter a site URL')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/gsc-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, siteUrl: siteUrl.trim() }),
      })

      if (!res.ok) {
        throw new Error('Failed to save site URL')
      }

      setSiteUrl('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Search Console Site URL</DialogTitle>
          <DialogDescription>
            Find your site URL in Google Search Console. Must be a verified property (e.g., https://example.com/)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="e.g., https://example.com/"
            value={siteUrl}
            onChange={(e) => {
              setSiteUrl(e.target.value)
              setError(null)
            }}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            disabled={saving}
          />

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !siteUrl.trim()}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Site'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
