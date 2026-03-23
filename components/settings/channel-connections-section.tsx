'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import { cn } from '@/lib/utils'

interface ChannelConnection {
  channel: ChannelId
  connected: boolean
  accountName?: string
  accountId?: string
  expiresAt?: string
}

interface ChannelConnectionsSectionProps {
  projectId: string
  enabledChannels: ChannelId[]
}

export function ChannelConnectionsSection({ projectId, enabledChannels }: ChannelConnectionsSectionProps) {
  const [connections, setConnections] = useState<Map<ChannelId, ChannelConnection>>(new Map())
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<ChannelId | null>(null)

  useEffect(() => {
    fetchConnections()
  }, [projectId, enabledChannels])

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const project = await res.json()

      if (project.credentials) {
        const map = new Map<ChannelId, ChannelConnection>()
        for (const cred of project.credentials) {
          map.set(cred.channel as ChannelId, {
            channel: cred.channel,
            connected: !!cred.accessToken,
            accountName: cred.accountName,
            accountId: cred.accountId,
            expiresAt: cred.expiresAt,
          })
        }
        setConnections(map)
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (channelId: ChannelId) => {
    setConnecting(channelId)
    try {
      // Use a direct window navigation instead of fetch for OAuth flow
      // This properly handles external redirects without CORS issues
      const authUrl = `/api/integrations/authorize?platform=${channelId}&projectId=${projectId}`
      window.location.href = authUrl
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Connection error:', errorMsg)
      toast.error(`Failed to initiate connection: ${errorMsg}`)
      setConnecting(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Connections</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Channel Connections
        </CardTitle>
        <CardDescription>Connect your marketing accounts to enable data syncing</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {enabledChannels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select channels above to connect accounts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enabledChannels.map(channelId => {
              const channel = getChannel(channelId)
              const connection = connections.get(channelId)
              const isConnected = connection?.connected ?? false

              if (!channel) return null

              return (
                <div
                  key={channelId}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer',
                    isConnected ? 'border-green-600/40' : 'bg-muted/30 border-border'
                  )}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="h-5 w-5 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: channel.color }}
                    >
                      {channel.label.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{channel.label}</span>
                        {isConnected && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {!isConnected && (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      {isConnected && connection?.accountName && (
                        <p className="text-xs text-muted-foreground truncate">
                          Connected: {connection.accountName}
                        </p>
                      )}
                      {!isConnected && (
                        <p className="text-xs text-amber-600">Not connected</p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleConnect(channelId)}
                    disabled={connecting === channelId}
                    variant={isConnected ? 'outline' : 'default'}
                    size="sm"
                    className="ml-2 flex-shrink-0 cursor-pointer"
                  >
                    {connecting === channelId ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : isConnected ? (
                      'Reconnect'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <Separator />

        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>How it works:</strong> Click "Connect" to authorize DM Data Studio to access your marketing account.
            You'll be securely redirected to the platform's login page.
          </p>
          <p>
            Once connected, we'll automatically sync your metrics and data on a daily basis.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
