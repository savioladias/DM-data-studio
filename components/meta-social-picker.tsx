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

interface Portfolio {
  id: string
  name: string
  assets: Asset[]
}

interface Asset {
  id: string
  name: string
  username?: string
  picture?: string
}

export function MetaSocialPicker({
  projectId,
  channel,
  open,
  onClose,
  onSaved,
}: {
  projectId: string
  channel: 'FACEBOOK' | 'INSTAGRAM'
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isFacebook = channel === 'FACEBOOK'
  const channelLabel = isFacebook ? 'Facebook Page' : 'Instagram Account'

  useEffect(() => {
    if (open) {
      fetchAssets()
    }
  }, [open, projectId, channel])

  const fetchAssets = async () => {
    setLoading(true)
    setError(null)
    setSelectedPortfolioId(null)
    setSelectedAssetId(null)
    try {
      const res = await fetch(
        `/api/integrations/meta-social-assets?projectId=${projectId}&channel=${channel}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch portfolios')
      const fetchedPortfolios: Portfolio[] = data.portfolios ?? []
      setPortfolios(fetchedPortfolios)
      if (fetchedPortfolios.length > 0) {
        setSelectedPortfolioId(fetchedPortfolios[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedAssetId || !selectedPortfolioId) return
    const portfolio = portfolios.find(p => p.id === selectedPortfolioId)
    const asset = portfolio?.assets.find(a => a.id === selectedAssetId)
    if (!asset) return

    const assetName = isFacebook
      ? asset.name
      : asset.username
        ? `${asset.name} (@${asset.username})`
        : asset.name

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/integrations/meta-social-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          channel,
          assetId: asset.id,
          assetName,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save asset')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const currentAssets = portfolios.find(p => p.id === selectedPortfolioId)?.assets ?? []

  const filteredAssets = currentAssets.filter(a => {
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      (a.username?.toLowerCase().includes(q) ?? false) ||
      a.id.includes(q)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            Select a {channelLabel}
          </DialogTitle>
          <DialogDescription>
            Choose the {isFacebook ? 'page' : 'account'} to connect to this project.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search for a ${isFacebook ? 'page' : 'account'}`}
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
        ) : portfolios.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-muted-foreground font-medium">
              No business portfolios found for this account.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Make sure you have access to at least one Meta Business portfolio with{' '}
              {isFacebook ? 'Facebook Pages' : 'Instagram accounts'}.
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
                {portfolios.map(portfolio => {
                  const count = portfolio.assets.length
                  const isSelected = selectedPortfolioId === portfolio.id
                  return (
                    <button
                      key={portfolio.id}
                      onClick={() => {
                        setSelectedPortfolioId(portfolio.id)
                        setSelectedAssetId(null)
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
                        {portfolio.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{portfolio.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} business asset{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right panel — assets */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedPortfolioId && (
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  {currentAssets.length} business asset{currentAssets.length !== 1 ? 's' : ''}
                </p>
              )}

              {filteredAssets.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? 'No assets match your search.'
                      : `No ${isFacebook ? 'Facebook Pages' : 'Instagram accounts'} in this portfolio.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssets.map(asset => {
                    const isSelected = selectedAssetId === asset.id
                    return (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150',
                          isSelected
                            ? 'border-primary bg-primary/[0.03] shadow-sm'
                            : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/10'
                        )}
                      >
                        {/* Radio */}
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

                        {/* Profile picture */}
                        {asset.picture ? (
                          <img
                            src={asset.picture}
                            alt={asset.name}
                            className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border"
                          />
                        ) : (
                          <div
                            className={cn(
                              'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                              isFacebook ? 'bg-[#1877F2]' : 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]'
                            )}
                          >
                            {asset.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Name + username */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'font-semibold text-sm truncate',
                              isSelected ? 'text-primary' : 'text-foreground'
                            )}
                          >
                            {asset.name}
                            {asset.username && (
                              <span className="font-normal text-muted-foreground ml-1">
                                @{asset.username}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {/* Platform badge */}
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white',
                                isFacebook ? 'bg-[#1877F2]' : 'bg-gradient-to-r from-[#833AB4] to-[#FD1D1D]'
                              )}
                            >
                              {isFacebook ? 'F' : 'I'}
                              <span>{isFacebook ? 'Facebook' : 'Instagram'}</span>
                            </span>
                          </div>
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
        {!loading && !error && portfolios.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col gap-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
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
                disabled={saving || !selectedAssetId}
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
