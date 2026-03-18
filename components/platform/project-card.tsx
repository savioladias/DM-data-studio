'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, Circle } from 'lucide-react'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    clientName: string
    industry?: string | null
    brandColor: string
    updatedAt: Date | string
    channels: { channel: string }[]
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const channels = project.channels
    .map(c => getChannel(c.channel as ChannelId))
    .filter(Boolean)

  const organicChannels = channels.filter(c => c?.category === 'Organic Social')
  const paidChannels = channels.filter(c => c?.category === 'Paid Advertising')
  const otherChannels = channels.filter(c => c?.category !== 'Organic Social' && c?.category !== 'Paid Advertising')

  const lastUpdated = new Date(project.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group hover:border-primary/50 transition-all duration-200 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* Brand colour dot */}
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: project.brandColor }}
              >
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground">{project.clientName}</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {project.industry && (
            <Badge variant="secondary" className="text-xs">
              {project.industry}
            </Badge>
          )}

          {/* Channel pills */}
          <div className="space-y-2">
            {paidChannels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {paidChannels.map(c => (
                  <span
                    key={c!.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
                  >
                    <Circle className="h-1.5 w-1.5 fill-current" style={{ color: c!.color }} />
                    {c!.label}
                  </span>
                ))}
              </div>
            )}
            {organicChannels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {organicChannels.map(c => (
                  <span
                    key={c!.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
                  >
                    <Circle className="h-1.5 w-1.5 fill-current" style={{ color: c!.color }} />
                    {c!.label}
                  </span>
                ))}
              </div>
            )}
            {otherChannels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {otherChannels.map(c => (
                  <span
                    key={c!.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
                  >
                    <Circle className="h-1.5 w-1.5 fill-current" style={{ color: c!.color }} />
                    {c!.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Updated {lastUpdated}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
