'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Trash2, Plus, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format } from 'date-fns'

interface ShareToken {
  id: string
  token: string
  label?: string
  expiresAt?: string
  channels?: string
  createdAt: string
  lastViewedAt?: string
}

interface ShareDashboardProps {
  projectId: string
}

export function ShareDashboard({ projectId }: ShareDashboardProps) {
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/share`)
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens)
      }
    } catch (err) {
      console.error('Failed to fetch share tokens:', err)
    } finally {
      setLoading(false)
    }
  }

  const createToken = async () => {
    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label || undefined,
          expiresAt: undefined,
          channels: undefined,
        }),
      })

      if (res.ok) {
        const newToken = await res.json()
        setTokens([newToken, ...tokens])
        setLabel('')
        setOpen(false)
      }
    } catch (err) {
      console.error('Failed to create token:', err)
    } finally {
      setCreating(false)
    }
  }

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure? Anyone using this link will lose access.')) return

    try {
      await fetch(`/api/projects/${projectId}/share?tokenId=${tokenId}`, {
        method: 'DELETE',
      })
      setTokens(tokens.filter((t) => t.id !== tokenId))
    } catch (err) {
      console.error('Failed to delete token:', err)
    }
  }

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading share links...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Share Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create read-only links to share your dashboard with clients
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Share Link</DialogTitle>
              <DialogDescription>
                Generate a read-only link to share this dashboard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Label (optional)</label>
                <Input
                  placeholder="e.g., Client Q1 Report"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={createToken}
                disabled={creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Share Link'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No share links yet. Create one to get started.
          </p>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {token.label && (
                    <Badge variant="outline">{token.label}</Badge>
                  )}
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {token.token.slice(0, 8)}...
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {format(new Date(token.createdAt), 'MMM d, yyyy')}
                  {token.lastViewedAt && (
                    <>
                      {' '}
                      • Viewed {format(new Date(token.lastViewedAt), 'MMM d, yyyy')}
                    </>
                  )}
                  {token.expiresAt && (
                    <>
                      {' '}
                      • Expires {format(new Date(token.expiresAt), 'MMM d, yyyy')}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(token.token)}
                  className="gap-1.5"
                >
                  {copied === token.token ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteToken(token.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
