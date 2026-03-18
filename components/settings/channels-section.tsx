'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'
import { Plug, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { GA4PropertyPicker } from '@/components/ga4-property-picker'
import { GSCSitePicker } from '@/components/gsc-site-picker'
import { LinkedInOrgPicker } from '@/components/linkedin-org-picker'
import { FacebookPagePicker } from '@/components/facebook-page-picker'
import { InstagramAccountPicker } from '@/components/instagram-account-picker'
import { YouTubeChannelPicker } from '@/components/youtube-channel-picker'

interface ProjectCredential {
  id: string
  channel: string
  accessToken: string | null
  accountId: string | null
  accountName: string | null
}

interface ProjectChannel {
  id: string
  channel: string
  enabled: boolean
}

export function ChannelsSection({
  projectId,
  channels,
  credentials,
}: {
  projectId: string
  channels: ProjectChannel[]
  credentials: ProjectCredential[]
}) {
  const [ga4PickerOpen, setGa4PickerOpen] = useState(false)
  const [gscPickerOpen, setGscPickerOpen] = useState(false)
  const [linkedinPickerOpen, setLinkedinPickerOpen] = useState(false)
  const [facebookPickerOpen, setFacebookPickerOpen] = useState(false)
  const [instagramPickerOpen, setInstagramPickerOpen] = useState(false)
  const [youtubePickerOpen, setYoutubePickerOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Connected Channels
          </CardTitle>
          <CardDescription>
            API connections for each channel. Connect accounts to pull live data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {channels.map(ch => {
            const channelDef = getChannel(ch.channel as ChannelId)
            const credential = credentials.find(c => c.channel === ch.channel)
            const isConnected = !!credential?.accessToken

            // Per-channel pending states
            const isPendingGA4 = ch.channel === 'GOOGLE_ANALYTICS' && credential?.accountId === 'pending-property-selection'
            const isPendingGSC = ch.channel === 'GOOGLE_SEARCH_CONSOLE' && credential?.accountId === 'pending-site-selection'
            const isPendingLinkedIn = ch.channel === 'LINKEDIN_ORGANIC' && credential?.accountId === 'pending-org-selection'
            const isPendingFacebook = ch.channel === 'FACEBOOK' && credential?.accountId === 'pending-page-selection'
            const isPendingInstagram = ch.channel === 'INSTAGRAM' && credential?.accountId === 'pending-page-selection'
            const isPendingYouTube = ch.channel === 'YOUTUBE' && credential?.accountId === 'pending-channel-selection'
            const isPending = isPendingGA4 || isPendingGSC || isPendingLinkedIn || isPendingFacebook || isPendingInstagram || isPendingYouTube

            const supportsOAuth = ['GOOGLE_ANALYTICS', 'GOOGLE_ADS', 'META_ADS', 'GOOGLE_SEARCH_CONSOLE', 'LINKEDIN_ORGANIC', 'FACEBOOK', 'INSTAGRAM', 'YOUTUBE'].includes(ch.channel)

            return (
              <div key={ch.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-transparent hover:border-border">
                <div className="flex items-center gap-2">
                  {channelDef && (
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: channelDef.color }} />
                  )}
                  <div>
                    <span className="text-sm font-medium block">{channelDef?.label ?? ch.channel}</span>
                    <span className="text-xs text-muted-foreground">{channelDef?.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && !isPending ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-4 w-4" />
                      <span>Connected</span>
                    </div>
                  ) : isPending ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        if (isPendingGA4) setGa4PickerOpen(true)
                        else if (isPendingGSC) setGscPickerOpen(true)
                        else if (isPendingLinkedIn) setLinkedinPickerOpen(true)
                        else if (isPendingFacebook) setFacebookPickerOpen(true)
                        else if (isPendingInstagram) setInstagramPickerOpen(true)
                        else if (isPendingYouTube) setYoutubePickerOpen(true)
                      }}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {isPendingGA4 && 'Select Property'}
                      {isPendingGSC && 'Select Site'}
                      {isPendingLinkedIn && 'Select Org'}
                      {isPendingFacebook && 'Select Page'}
                      {isPendingInstagram && 'Select Account'}
                      {isPendingYouTube && 'Select Channel'}
                    </Button>
                  ) : supportsOAuth ? (
                    <Link href={`/api/integrations/authorize?projectId=${projectId}&platform=${ch.channel}`}>
                      <Button size="sm" variant="outline" className="text-xs" asChild>
                        <span>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Connect
                        </span>
                      </Button>
                    </Link>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not available</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <GA4PropertyPicker
        projectId={projectId}
        open={ga4PickerOpen}
        onClose={() => setGa4PickerOpen(false)}
      />

      <GSCSitePicker
        projectId={projectId}
        open={gscPickerOpen}
        onClose={() => setGscPickerOpen(false)}
      />

      <LinkedInOrgPicker
        projectId={projectId}
        open={linkedinPickerOpen}
        onClose={() => setLinkedinPickerOpen(false)}
      />

      <FacebookPagePicker
        projectId={projectId}
        open={facebookPickerOpen}
        onOpenChange={setFacebookPickerOpen}
        onSelect={() => setFacebookPickerOpen(false)}
      />

      <InstagramAccountPicker
        projectId={projectId}
        open={instagramPickerOpen}
        onOpenChange={setInstagramPickerOpen}
        onSelect={() => setInstagramPickerOpen(false)}
      />

      <YouTubeChannelPicker
        projectId={projectId}
        open={youtubePickerOpen}
        onOpenChange={setYoutubePickerOpen}
        onSelect={() => setYoutubePickerOpen(false)}
      />
    </>
  )
}
