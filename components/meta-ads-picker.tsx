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
import { Loader2, Check, Search, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetaAdsBusiness {
  id: string
  name: string
}

interface MetaAdsAccount {
  id: string
  accountId: string
  name: string
  status: number
  currency: string
  businessId?: string
}

export function MetaAdsPicker({
  projectId,
  open,
  onClose,
  onSaved,
}: {
  projectId: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [businesses, setBusinesses] = useState<MetaAdsBusiness[]>([])
  const [accountsByBusiness, setAccountsByBusiness] = useState<Record<string, MetaAdsAccount[]>>({})
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      fetchPortfolios()
    }
  }, [open, projectId])

  const fetchPortfolios = async () => {
    setLoading(true)
    setError(null)
    setSelectedBusinessId(null)
    setSelectedAccountId(null)
    try {
      const res = await fetch(`/api/integrations/meta-ads-accounts?projectId=${projectId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch portfolios')
      setBusinesses(data.businesses ?? [])
      setAccountsByBusiness(data.accountsByBusiness ?? {})
      // Auto-select first business
      if (data.businesses?.length > 0) {
        setSelectedBusinessId(data.businesses[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedAccountId) return
    const accounts = selectedBusinessId ? (accountsByBusiness[selectedBusinessId] ?? []) : []
    const account = accounts.find(a => a.accountId === selectedAccountId)
    if (!account) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/meta-ads-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          accountId: account.accountId,
          accountName: account.name,
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

  const currentAccounts = selectedBusinessId
    ? (accountsByBusiness[selectedBusinessId] ?? [])
    : []

  const filteredAccounts = currentAccounts.filter(
    a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.accountId.includes(search)
  )

  const totalAccountCount = currentAccounts.length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select a Meta Ads account</DialogTitle>
          <DialogDescription>
            Choose the ad account to connect to this project.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for an ad account"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching your portfolios...</p>
          </div>
        ) : error ? (
          <div className="mx-6 my-4 rounded-xl border-2 border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold mb-1">Error</p>
            {error}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-muted-foreground font-medium">
              No business portfolios found for this account.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Make sure you have access to at least one Meta Business portfolio.
            </p>
          </div>
        ) : (
          <div className="flex" style={{ height: '380px' }}>
            {/* Left panel — business portfolios */}
            <div className="w-[240px] flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
              <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Business portfolios
              </p>
              <div className="pb-2">
                {businesses.map(biz => {
                  const count = (accountsByBusiness[biz.id] ?? []).length
                  const isSelected = selectedBusinessId === biz.id
                  return (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setSelectedBusinessId(biz.id)
                        setSelectedAccountId(null)
                        setSearch('')
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/50 text-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                          isSelected ? 'bg-primary' : 'bg-muted-foreground/30'
                        )}
                      >
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{biz.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} ad account{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right panel — ad accounts */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedBusinessId && (
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  {totalAccountCount} ad account{totalAccountCount !== 1 ? 's' : ''}
                </p>
              )}

              {filteredAccounts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No accounts match your search.' : 'No ad accounts in this portfolio.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAccounts.map(account => {
                    const isActive = account.status === 1
                    const isSelected = selectedAccountId === account.accountId
                    return (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.accountId)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all duration-150',
                          isSelected
                            ? 'border-primary bg-primary/[0.03] shadow-sm'
                            : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/10'
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                          {/* Radio circle */}
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={cn(
                                'font-semibold text-sm truncate',
                                isSelected ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ad account ID: {account.accountId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isActive && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Inactive
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && !error && businesses.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col gap-2">
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !selectedAccountId}
                className="flex-1 font-bold shadow-lg shadow-primary/10 transition-transform active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Selection
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
