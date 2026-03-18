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

export function LinkedInOrgPicker({ projectId, open, onClose }: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const [organizationId, setOrganizationId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!organizationId.trim()) {
      setError('Please enter an organization ID')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/linkedin-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, organizationId: organizationId.trim() }),
      })

      if (!res.ok) {
        throw new Error('Failed to save organization ID')
      }

      setOrganizationId('')
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
          <DialogTitle>Enter LinkedIn Organization ID</DialogTitle>
          <DialogDescription>
            Find your numeric organization ID in LinkedIn: Company Page → Admin Tools → Page Info → Organization ID
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="e.g., 12345678"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value)
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
            disabled={saving || !organizationId.trim()}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Organization'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
