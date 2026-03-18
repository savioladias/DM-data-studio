'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface InstagramAccountPickerProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (accountId: string) => void
}

export function InstagramAccountPicker({ projectId, open, onOpenChange, onSelect }: InstagramAccountPickerProps) {
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async () => {
    if (!accountId.trim()) {
      setError('Please enter an Instagram Business Account ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/instagram-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, accountId: accountId.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save account')
      }

      onSelect(accountId.trim())
      setAccountId('')
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
          <DialogTitle>Select Instagram Business Account</DialogTitle>
          <DialogDescription>
            Enter your Instagram Business Account ID to connect your metrics
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Account ID</label>
            <Input
              placeholder="e.g., 17841400963960001"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value)
                setError('')
              }}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Find your Business Account ID in Instagram Settings → Apps and Websites → Graph API Explorer
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
