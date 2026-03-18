import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId, projectId } = await req.json()
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Verify user owns this project
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if YouTube credential exists for this project
    const credential = await db.projectCredential.findFirst({
      where: {
        projectId,
        channel: 'YOUTUBE',
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'YouTube credential not found. Please connect YouTube first.' },
        { status: 400 }
      )
    }

    // Update the credential with the channel ID
    await db.projectCredential.update({
      where: {
        id: credential.id,
      },
      data: {
        accountId: channelId,
        accountName: `YouTube Channel (${channelId})`,
      },
    })

    return NextResponse.json({ success: true, channelId })
  } catch (error) {
    console.error('YouTube channel selection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save channel' },
      { status: 500 }
    )
  }
}
