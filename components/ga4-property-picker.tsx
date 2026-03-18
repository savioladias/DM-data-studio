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

export function GA4PropertyPicker({ projectId, open, onClose }: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const [propertyId, setPropertyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!propertyId.trim()) {
      setError('Please enter a property ID')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/ga4-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, propertyId: propertyId.trim() }),
      })

      if (!res.ok) {
        throw new Error('Failed to save property')
      }

      setPropertyId('')
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
          <DialogTitle>Enter GA4 Property ID</DialogTitle>
          <DialogDescription>
            Find your property ID in Google Analytics: Admin → Property → Property details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="e.g., 123456789"
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
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
            disabled={saving || !propertyId.trim()}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Property'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
