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
    const { projectId, organizationId } = body

    if (!projectId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing projectId or organizationId' },
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

    // Get LinkedIn credential
    const linkedinCredential = project.credentials.find(c => c.channel === 'LINKEDIN_ORGANIC')

    if (!linkedinCredential) {
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      )
    }

    // Update credential with selected organization ID
    await db.projectCredential.update({
      where: { id: linkedinCredential.id },
      data: {
        accountId: organizationId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LinkedIn org save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save organization ID',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
