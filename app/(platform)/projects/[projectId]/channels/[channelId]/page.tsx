import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ChannelDetail } from './channel-detail'
import type { ChannelId } from '@/lib/channels'

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ projectId: string; channelId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { projectId, channelId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      clientName: true,
      currency: true,
      channels: { where: { enabled: true } },
    },
  })

  if (!project) notFound()

  // Verify the requested channel is enabled
  const isChannelEnabled = project.channels.some(c => c.channel === channelId)
  if (!isChannelEnabled) notFound()

  return (
    <ChannelDetail
      projectId={project.id}
      projectName={project.name}
      clientName={project.clientName}
      channelId={channelId as ChannelId}
      currency={project.currency}
    />
  )
}
