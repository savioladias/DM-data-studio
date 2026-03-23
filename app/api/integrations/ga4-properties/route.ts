/**
 * GA4 Properties API
 * Fetches available GA4 properties and saves the selected one
 */

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchGA4Properties } from '@/lib/integrations/google/analytics'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
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

    // Get GA4 credential
    const gaCredential = project.credentials.find(c => c.channel === 'GOOGLE_ANALYTICS')

    if (!gaCredential?.accessToken) {
      return NextResponse.json(
        { error: 'GA4 not connected' },
        { status: 400 }
      )
    }

    // Fetch available GA4 properties
    const properties = await fetchGA4Properties(gaCredential.accessToken)

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('GA4 properties fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch properties',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, propertyId, displayName } = body

    if (!projectId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing projectId or propertyId' },
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

    // Get GA4 credential
    const gaCredential = project.credentials.find(c => c.channel === 'GOOGLE_ANALYTICS')

    if (!gaCredential) {
      return NextResponse.json(
        { error: 'GA4 not connected' },
        { status: 400 }
      )
    }

    // Update credential with selected property
    await db.projectCredential.update({
      where: { id: gaCredential.id },
      data: {
        accountId: propertyId,
        accountName: displayName,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GA4 property save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save property',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
