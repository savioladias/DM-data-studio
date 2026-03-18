/**
 * OAuth authorization endpoint
 * Generates OAuth URL and redirects user to provider for login
 */

import { auth } from '@/lib/auth'
import { getAuthorizationUrl } from '@/lib/integrations/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const platform = searchParams.get('platform')

    if (!projectId || !platform) {
      return NextResponse.json(
        { error: 'Missing projectId or platform' },
        { status: 400 }
      )
    }

    // Verify user owns this project
    const { db } = await import('@/lib/db')
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 403 }
      )
    }

    // Get OAuth authorization URL and redirect
    const authUrl = getAuthorizationUrl(platform, projectId)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      {
        error: 'Authorization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
