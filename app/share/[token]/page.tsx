import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getChannel } from '@/lib/channels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import type { ChannelId } from '@/lib/channels'

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params

  // Look up share token
  const shareToken = await db.shareToken.findUnique({
    where: { token },
    include: { project: { select: { id: true, name: true, clientName: true, channels: true } } },
  })

  if (!shareToken || !shareToken.project) {
    notFound()
  }

  // Check if expired
  if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
    notFound()
  }

  // Update lastViewedAt
  await db.shareToken.update({
    where: { id: shareToken.id },
    data: { lastViewedAt: new Date() },
  })

  const project = shareToken.project
  const allowedChannels = shareToken.channels
    ? (JSON.parse(shareToken.channels) as ChannelId[])
    : project.channels.map((ch) => ch.channel as ChannelId)

  const enabledChannels = project.channels
    .filter((ch) => ch.enabled && allowedChannels.includes(ch.channel as ChannelId))
    .map((ch) => ch.channel as ChannelId)

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b pb-6">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.clientName}</p>
          {shareToken.label && (
            <p className="text-xs text-muted-foreground italic">
              Shared as: {shareToken.label}
            </p>
          )}
        </div>

        {/* Channel Status */}
        <div className="flex flex-wrap gap-2">
          {enabledChannels.map((channelId) => {
            const channel = getChannel(channelId)
            return channel ? (
              <Badge key={channelId} variant="outline" className="text-xs gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: channel.color }}
                />
                {channel.label}
              </Badge>
            ) : null
          })}
        </div>

        {/* Metrics Grid */}
        <div className="space-y-6">
          {enabledChannels.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No channels available in this shared dashboard.
              </CardContent>
            </Card>
          ) : (
            enabledChannels.map((channelId) => {
              const channel = getChannel(channelId)
              if (!channel) return null

              return (
                <Card key={channelId}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: channel.color }}
                      />
                      {channel.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {channel.label} metrics are available in the full dashboard.
                    </p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center border-t pt-6">
          <p>
            This is a read-only shared dashboard shared on{' '}
            {format(new Date(shareToken.createdAt), 'MMM d, yyyy')}
            {shareToken.expiresAt && (
              <>
                {' '}
                • Expires {format(new Date(shareToken.expiresAt), 'MMM d, yyyy')}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
