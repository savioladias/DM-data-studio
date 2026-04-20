/**
 * Google Ads Accounts API
 * Fetches available Google Ads accounts and saves the selected one
 */

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchGoogleAdsAccounts } from '@/lib/integrations/google/ads'
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

    // Get Google Ads credential
    const adsCredential = project.credentials.find(c => c.channel === 'GOOGLE_ADS')
    console.log('Ads Credential found:', !!adsCredential)

    if (!adsCredential?.accessToken) {
      console.log('No access token in ads credential')
      return NextResponse.json(
        { error: 'Google Ads not connected' },
        { status: 400 }
      )
    }

    // Fetch available Google Ads accounts with refreshed token
    console.log('Ensuring valid access token...')
    const accessToken = await ensureValidAccessToken(adsCredential)
    if (!accessToken) {
      console.log('Failed to obtain access token')
      return NextResponse.json({ error: 'Failed to obtain valid access token' }, { status: 401 })
    }

    console.log('Fetching Google Ads accounts...')
    const accounts = await fetchGoogleAdsAccounts(accessToken)
    console.log('Accounts fetched:', accounts.length)

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Google Ads accounts fetch error:', error)
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
      return NextResponse.json(
        { error: 'Missing projectId or accountId' },
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

    // Get Google Ads credential
    const adsCredential = project.credentials.find(c => c.channel === 'GOOGLE_ADS')

    if (!adsCredential) {
      return NextResponse.json(
        { error: 'Google Ads not connected' },
        { status: 400 }
      )
    }

    // Update credential with selected account
    await db.projectCredential.update({
      where: { id: adsCredential.id },
      data: {
        accountId: accountId,
        accountName: accountName,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Ads account save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
