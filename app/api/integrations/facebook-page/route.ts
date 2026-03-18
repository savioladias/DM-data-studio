import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pageId, projectId } = await req.json()
    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
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

    // Check if Facebook credential exists for this project
    const credential = await db.projectCredential.findFirst({
      where: {
        projectId,
        channel: 'FACEBOOK',
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Facebook credential not found. Please connect Facebook first.' },
        { status: 400 }
      )
    }

    // Update the credential with the page ID
    await db.projectCredential.update({
      where: {
        id: credential.id,
      },
      data: {
        accountId: pageId,
        accountName: `Facebook Page (${pageId})`,
      },
    })

    return NextResponse.json({ success: true, pageId })
  } catch (error) {
    console.error('Facebook page selection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save page' },
      { status: 500 }
    )
  }
}
