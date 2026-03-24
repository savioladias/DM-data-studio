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

interface GSCSite {
  siteUrl: string
  permissionLevel: string
}

export function GSCSitePicker({ projectId, open, onClose }: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const [sites, setSites] = useState<GSCSite[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      fetchSites()
    }
  }, [open, projectId])

  const fetchSites = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/gsc-sites?projectId=${projectId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch sites')
      setSites(data.sites)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedUrl) return
    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/gsc-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, siteUrl: selectedUrl }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save site')
      }

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
          <DialogTitle>Select Search Console Site</DialogTitle>
          <DialogDescription>
            Choose the verified site to connect to this project.
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
          ) : sites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No verified sites found in this Search Console account.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search sites..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
              <div className="space-y-2 max-h-56 overflow-y-auto">
              {sites.filter(s => s.siteUrl.toLowerCase().includes(search.toLowerCase())).map(site => (
                <button
                  key={site.siteUrl}
                  onClick={() => setSelectedUrl(site.siteUrl)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-sm transition-colors',
                    selectedUrl === site.siteUrl
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div>
                    <p className="font-medium">{site.siteUrl}</p>
                    <p className="text-xs text-muted-foreground capitalize">{site.permissionLevel.replace(/_/g, ' ').toLowerCase()}</p>
                  </div>
                  {selectedUrl === site.siteUrl && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !selectedUrl || loading}
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
