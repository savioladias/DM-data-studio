import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify user owns this project
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all share tokens for this project
    const tokens = await db.shareToken.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        label: true,
        expiresAt: true,
        channels: true,
        createdAt: true,
        lastViewedAt: true,
      },
    })

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Error fetching share tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { label, expiresAt, channels } = await req.json()

    // Verify user owns this project
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create share token
    const token = await db.shareToken.create({
      data: {
        projectId,
        label: label || undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        channels: channels ? JSON.stringify(channels) : undefined,
      },
    })

    return NextResponse.json({
      id: token.id,
      token: token.token,
      label: token.label,
      expiresAt: token.expiresAt,
      channels: token.channels ? JSON.parse(token.channels) : undefined,
      url: `/share/${token.token}`,
    })
  } catch (error) {
    console.error('Error creating share token:', error)
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(req.url)
    const tokenId = searchParams.get('tokenId')

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID required' },
        { status: 400 }
      )
    }

    // Verify user owns this project
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify token belongs to this project and delete
    const token = await db.shareToken.findFirst({
      where: { id: tokenId, projectId },
    })

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    await db.shareToken.delete({ where: { id: tokenId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting share token:', error)
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    )
  }
}
