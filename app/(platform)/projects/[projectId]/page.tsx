import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProjectDashboard } from './project-dashboard'
import type { ChannelId } from '@/lib/channels'

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { projectId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      channels: { where: { enabled: true } },
      insights: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!project) notFound()

  const enabledChannels = project.channels
    .filter(c => c.enabled)
    .map(c => c.channel as ChannelId)

  return (
    <ProjectDashboard
      project={{
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        brandColor: project.brandColor,
        currency: project.currency,
      }}
      enabledChannels={enabledChannels}
      recentInsights={project.insights.map(i => ({
        id: i.id,
        type: i.type,
        title: i.title,
        body: i.body,
        severity: i.severity ?? undefined,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  )
}
