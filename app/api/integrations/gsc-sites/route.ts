import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureValidAccessToken } from '@/lib/integrations/auth'
import { NextRequest, NextResponse } from 'next/server'

async function fetchGSCSites(accessToken: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GSC API error: ${err}`)
  }

  const data = await res.json() as { siteEntry?: { siteUrl: string; permissionLevel: string }[] }
  return data.siteEntry ?? []
}

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

    const gscCredential = project.credentials.find(c => c.channel === 'GOOGLE_SEARCH_CONSOLE')

    if (!gscCredential?.accessToken) {
      return NextResponse.json({ error: 'GSC not connected' }, { status: 400 })
    }

    const accessToken = await ensureValidAccessToken(gscCredential)
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to obtain valid access token' }, { status: 401 })
    }

    const sites = await fetchGSCSites(accessToken)

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('GSC sites fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites', message: error instanceof Error ? error.message : 'Unknown error' },
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

    const { projectId, siteUrl } = await req.json()

    if (!projectId || !siteUrl) {
      return NextResponse.json({ error: 'Missing projectId or siteUrl' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const gscCredential = project.credentials.find(c => c.channel === 'GOOGLE_SEARCH_CONSOLE')

    if (!gscCredential) {
      return NextResponse.json({ error: 'GSC not connected' }, { status: 400 })
    }

    await db.projectCredential.update({
      where: { id: gscCredential.id },
      data: { accountId: siteUrl, accountName: siteUrl },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GSC site save error:', error)
    return NextResponse.json(
      { error: 'Failed to save site', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
