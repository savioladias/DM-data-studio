'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GA4Property {
  propertyId: string
  displayName: string
}

export function GA4PropertyPicker({ projectId, open, onClose, onSaved }: {
  projectId: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchProperties()
    }
  }, [open, projectId])

  const fetchProperties = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/ga4-properties?projectId=${projectId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch properties')
      setProperties(data.properties)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    const selected = properties.find(p => p.propertyId === selectedId)
    if (!selected) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/ga4-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          propertyId: selected.propertyId,
          displayName: selected.displayName,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save property')
      }

      onSaved?.()
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
          <DialogTitle>Select GA4 Property</DialogTitle>
          <DialogDescription>
            Choose the Google Analytics 4 property to connect to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No GA4 properties found for this account.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {properties.map(prop => (
                <button
                  key={prop.propertyId}
                  onClick={() => setSelectedId(prop.propertyId)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-sm transition-colors',
                    selectedId === prop.propertyId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div>
                    <p className="font-medium">{prop.displayName}</p>
                    <p className="text-xs text-muted-foreground">ID: {prop.propertyId}</p>
                  </div>
                  {selectedId === prop.propertyId && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !selectedId || loading}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Confirm Selection'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
