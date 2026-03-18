import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProjectSidebar } from '@/components/dashboard/project-sidebar'
import type { ChannelId } from '@/lib/channels'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { projectId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { channels: { where: { enabled: true } } },
  })

  if (!project) notFound()

  const enabledChannels = project.channels.map(c => c.channel as ChannelId)

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar
        projectId={project.id}
        projectName={project.name}
        clientName={project.clientName}
        logoUrl={project.logoUrl}
        brandColor={project.brandColor}
        enabledChannels={enabledChannels}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
