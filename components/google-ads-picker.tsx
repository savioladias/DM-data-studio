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
import { Loader2, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoogleAdsAccount {
  id: string
  descriptiveName: string
  manager: boolean
}

export function GoogleAdsPicker({ projectId, open, onClose, onSaved }: {
  projectId: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open, projectId])

  const fetchAccounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/google-ads-accounts?projectId=${projectId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch accounts')
      setAccounts(data.accounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    const selected = accounts.find(a => a.id === selectedId)
    if (!selected) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/google-ads-accounts', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           projectId,
           accountId: selected.id,
           accountName: selected.descriptiveName,
         }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save account')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const filteredAccounts = accounts.filter(a =>
    a.descriptiveName.toLowerCase().includes(search.toLowerCase()) ||
    a.id.includes(search)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Google Ads account</DialogTitle>
          <DialogDescription>
            Choose the Google Ads account to connect to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Fetching accessible accounts...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-semibold mb-1">Error</p>
              {error}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-muted">
              <p className="text-sm text-muted-foreground font-medium">
                No Google Ads accounts found for this authenticated user.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure you have access to Google Ads accounts with the email you signed in with.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts name or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted">
                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No accounts match your search.</p>
                  </div>
                ) : (
                  filteredAccounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedId(account.id)}
                      className={cn(
                        'w-full group flex items-start justify-between p-4 rounded-xl border-2 text-left transition-all duration-200',
                        selectedId === account.id
                          ? 'border-primary bg-primary/[0.03] shadow-sm'
                          : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/10'
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={cn(
                            "font-semibold truncate",
                            selectedId === account.id ? "text-primary" : "text-foreground"
                          )}>
                            {account.descriptiveName}
                          </p>
                          {account.manager && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Manager
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          ID: {account.id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                        </p>
                      </div>
                      
                      <div className={cn(
                        "mt-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                        selectedId === account.id 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground/30"
                      )}>
                        {selectedId === account.id && (
                          <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedId || loading}
              className="w-full py-6 rounded-xl font-bold shadow-lg shadow-primary/10 transition-transform active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting Account...
                </>
              ) : (
                'Confirm Selection'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="text-muted-foreground text-xs hover:bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
