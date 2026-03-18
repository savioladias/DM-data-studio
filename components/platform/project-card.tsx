'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight } from 'lucide-react'
import { ProjectAvatar } from '@/components/project-avatar'
import { getChannel } from '@/lib/channels'
import type { ChannelId } from '@/lib/channels'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    clientName: string
    industry?: string | null
    brandColor: string
    logoUrl?: string | null
    updatedAt: Date | string
    channels: { channel: string }[]
  }
}

const getChannelIcon = (channelLabel: string): string => {
  const firstLetter = channelLabel.split(' ')[0].charAt(0).toUpperCase()
  return firstLetter
}

export function ProjectCard({ project }: ProjectCardProps) {
  const channels = project.channels
    .map(c => getChannel(c.channel as ChannelId))
    .filter(Boolean)

  const lastUpdated = new Date(project.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  // Limit to 4 channels with "+X more" indicator
  const visibleChannels = channels.slice(0, 4)
  const hiddenChannelsCount = channels.length - 4

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group relative hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <ProjectAvatar
                logoUrl={project.logoUrl}
                clientName={project.clientName}
                size="md"
              />
              <div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground">{project.clientName}</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-200 flex-shrink-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col">
          {project.industry && (
            <Badge variant="outline" className="w-fit text-xs bg-muted/50 border-border/50 text-foreground font-normal">
              {project.industry}
            </Badge>
          )}

          {/* Channel pills - max 4 + "+X more" */}
          {channels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleChannels.map(c => (
                <span
                  key={c!.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div
                    className="h-3 w-3 rounded-sm flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: c!.color }}
                    title={c!.label}
                  >
                    {getChannelIcon(c!.label)}
                  </div>
                  <span className="truncate">{c!.label}</span>
                </span>
              ))}
              {hiddenChannelsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted/50 border border-border/50 text-muted-foreground">
                  +{hiddenChannelsCount} more
                </span>
              )}
            </div>
          )}

          {/* Updated date - anchored to bottom */}
          <div className="mt-auto pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">Updated {lastUpdated}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
