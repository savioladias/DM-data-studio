import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const body = await request.json()
  const { channels } = body as { channels: string[] }

  if (!Array.isArray(channels)) {
    return NextResponse.json({ error: 'channels must be an array' }, { status: 400 })
  }

  // Verify project exists and belongs to user
  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete all existing ProjectChannel records for this project
  await db.projectChannel.deleteMany({
    where: { projectId },
  })

  // Create new ProjectChannel records for the provided channels
  const newChannels = await Promise.all(
    channels.map(channel =>
      db.projectChannel.create({
        data: {
          projectId,
          channel,
          enabled: true,
        },
      })
    )
  )

  return NextResponse.json(newChannels)
}
