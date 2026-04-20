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

export function ProjectCard({ project }: ProjectCardProps) {
  const channels = project.channels
    .map(c => getChannel(c.channel as ChannelId))
    .filter(Boolean)

  // Limit to 4 channels with "+X more" indicator
  const visibleChannels = channels.slice(0, 4)
  const hiddenChannelsCount = channels.length - 4

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group relative cursor-pointer h-full flex flex-col overflow-hidden hover:shadow-[0_4px_24px_oklch(0_0_0/12%),0_0_0_1px_oklch(0.57_0.24_25/20%)] dark:hover:shadow-[0_4px_24px_oklch(0_0_0/40%),0_0_0_1px_oklch(0.65_0.20_25/25%)] transition-all duration-250 ease-out">
        <CardHeader className="pb-4 pt-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <ProjectAvatar
                logoUrl={project.logoUrl}
                clientName={project.clientName}
                size="lg"
                className="mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0 pt-0 space-y-0">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors duration-150 truncate">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{project.clientName}</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all duration-200 flex-shrink-0 mt-0.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          {project.industry && (
            <Badge variant="outline" className="w-fit text-xs font-normal bg-accent/40 border-border/50 text-muted-foreground dark:bg-accent/30">
              {project.industry}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col pb-4">

          {/* Channel pills - max 4 + "+X more" */}
          {channels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleChannels.map(c => (
                <span
                  key={c!.id}
                  className="inline-flex text-xs px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40 dark:bg-muted/40 dark:border-border/30 transition-colors duration-150"
                >
                  {c!.label}
                </span>
              ))}
              {hiddenChannelsCount > 0 && (
                <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-muted/30 border border-dashed border-border/40 text-muted-foreground">
                  +{hiddenChannelsCount} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
