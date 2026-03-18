import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, siteUrl } = body

    if (!projectId || !siteUrl) {
      return NextResponse.json(
        { error: 'Missing projectId or siteUrl' },
        { status: 400 }
      )
    }

    // Verify user owns this project
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get GSC credential
    const gscCredential = project.credentials.find(c => c.channel === 'GOOGLE_SEARCH_CONSOLE')

    if (!gscCredential) {
      return NextResponse.json(
        { error: 'GSC not connected' },
        { status: 400 }
      )
    }

    // Update credential with selected site URL
    await db.projectCredential.update({
      where: { id: gscCredential.id },
      data: {
        accountId: siteUrl,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GSC site save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save site URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
