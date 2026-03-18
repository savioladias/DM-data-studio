import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, projectId } = await req.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
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

    // Check if Instagram credential exists for this project
    const credential = await db.projectCredential.findFirst({
      where: {
        projectId,
        channel: 'INSTAGRAM',
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Instagram credential not found. Please connect Instagram first.' },
        { status: 400 }
      )
    }

    // Update the credential with the account ID
    await db.projectCredential.update({
      where: {
        id: credential.id,
      },
      data: {
        accountId,
        accountName: `Instagram Account (${accountId})`,
      },
    })

    return NextResponse.json({ success: true, accountId })
  } catch (error) {
    console.error('Instagram account selection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save account' },
      { status: 500 }
    )
  }
}
