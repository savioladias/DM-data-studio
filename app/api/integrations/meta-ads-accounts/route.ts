/**
 * Meta Ads Accounts API
 * GET  – fetch businesses + their ad accounts for the picker
 * POST – save the selected ad account to project credentials
 */

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchMetaAdsPortfolios } from '@/lib/integrations/meta/ads'
import { ensureValidAccessToken } from '@/lib/integrations/auth'
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
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const credential = project.credentials.find(c => c.channel === 'META_ADS')

    if (!credential?.accessToken) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 })
    }

    const accessToken = await ensureValidAccessToken(credential)
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to obtain valid access token' }, { status: 401 })
    }

    const { businesses, accountsByBusiness } = await fetchMetaAdsPortfolios(accessToken)

    return NextResponse.json({ businesses, accountsByBusiness })
  } catch (error) {
    console.error('Meta Ads accounts fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch accounts',
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
    const { projectId, accountId, accountName } = body

    if (!projectId || !accountId) {
      return NextResponse.json({ error: 'Missing projectId or accountId' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const credential = project.credentials.find(c => c.channel === 'META_ADS')

    if (!credential) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 })
    }

    await db.projectCredential.update({
      where: { id: credential.id },
      data: { accountId, accountName },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Meta Ads account save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
