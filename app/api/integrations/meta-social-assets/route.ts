/**
 * Meta Social Assets API
 * GET  – fetch business portfolios + their Facebook Pages or Instagram accounts
 * POST – save selected asset (page/account) to project credential
 *
 * Instagram accounts are linked through Facebook Pages.
 * We fetch pages per business with instagram_business_account embedded,
 * then extract the IG account from each page.
 *
 * Fallback: if /me/businesses returns nothing, use /me/accounts directly.
 */

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureValidAccessToken } from '@/lib/integrations/auth'
import { NextRequest, NextResponse } from 'next/server'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface Portfolio {
  id: string
  name: string
  assets: Asset[]
}

interface Asset {
  id: string
  name: string
  username?: string
  picture?: string
}

async function gfetch(url: string): Promise<{ ok: boolean; data: any }> {
  try {
    const r = await fetch(url)
    const d = await r.json()
    return { ok: r.ok, data: d }
  } catch {
    return { ok: false, data: null }
  }
}

/** Fetch all pages of a Graph API list endpoint (up to 5 pages) */
async function fetchAll(url: string): Promise<any[]> {
  const results: any[] = []
  let next: string | null = url
  let itr = 0
  while (next && itr < 5) {
    const { ok, data } = await gfetch(next)
    if (!ok || !data) break
    results.push(...(data.data ?? []))
    next = data.paging?.next ?? null
    itr++
  }
  return results
}

/** Extract Facebook Pages from a business, with optional instagram_business_account */
async function fetchBusinessPages(bizId: string, token: string, withIg: boolean): Promise<any[]> {
  const fields = withIg
    ? 'id,name,picture{url},instagram_business_account{id,name,username,profile_picture_url}'
    : 'id,name,picture{url}'

  const [owned, client] = await Promise.all([
    fetchAll(`${GRAPH_BASE}/${bizId}/owned_pages?fields=${fields}&limit=50&access_token=${token}`),
    fetchAll(`${GRAPH_BASE}/${bizId}/client_pages?fields=${fields}&limit=50&access_token=${token}`),
  ])

  const seen = new Set<string>()
  const pages: any[] = []
  for (const page of [...owned, ...client]) {
    if (!seen.has(page.id)) {
      seen.add(page.id)
      pages.push(page)
    }
  }
  return pages
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const channel = searchParams.get('channel')

    if (!projectId || !channel) {
      return NextResponse.json({ error: 'Missing projectId or channel' }, { status: 400 })
    }
    if (channel !== 'FACEBOOK' && channel !== 'INSTAGRAM') {
      return NextResponse.json({ error: 'channel must be FACEBOOK or INSTAGRAM' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // For INSTAGRAM we can also use the FACEBOOK credential if available (same token)
    const credential =
      project.credentials.find(c => c.channel === channel) ??
      (channel === 'INSTAGRAM' ? project.credentials.find(c => c.channel === 'FACEBOOK') : null)

    if (!credential?.accessToken) {
      return NextResponse.json({ error: `${channel} not connected` }, { status: 400 })
    }

    let accessToken = await ensureValidAccessToken(credential)
    
    // Fallback to system user token if provided in .env
    if (!accessToken && process.env.META_SYSTEM_USER_TOKEN) {
      console.log('Using META_SYSTEM_USER_TOKEN for Meta social assets fetch')
      accessToken = process.env.META_SYSTEM_USER_TOKEN
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No valid Meta access token found' }, { status: 401 })
    }

    const portfolios: Portfolio[] = []

    // ── Primary: fetch via /me/businesses ───────────────────────────────────
    const bizRes = await fetch(
      `${GRAPH_BASE}/me/businesses?fields=id,name&limit=100&access_token=${accessToken}`
    )
    const bizData = await bizRes.json()
    
    if (!bizRes.ok) {
      console.error('[Meta Assets] me/businesses error:', bizRes.status, bizData)
    }

    const businesses: { id: string; name: string }[] = bizRes.ok ? (bizData?.data ?? []) : []

    if (businesses.length > 0) {
      await Promise.all(
        businesses.map(async (biz) => {
          const pages = await fetchBusinessPages(biz.id, accessToken, channel === 'INSTAGRAM')
          const assets: Asset[] = []

          for (const page of pages) {
            if (channel === 'FACEBOOK') {
              assets.push({
                id: page.id,
                name: page.name,
                picture: page.picture?.data?.url ?? page.picture?.url,
              })
            } else {
              // Extract Instagram business account linked to this page
              const ig = page.instagram_business_account
              if (ig?.id) {
                assets.push({
                  id: ig.id,
                  name: ig.name || ig.username || page.name,
                  username: ig.username,
                  picture: ig.profile_picture_url,
                })
              }
            }
          }

          if (assets.length > 0) {
            portfolios.push({ id: biz.id, name: biz.name, assets })
          }
        })
      )
    }

    // ── Fallback: /me/accounts (works even without /me/businesses access) ───
    if (portfolios.length === 0) {
      const fields = channel === 'INSTAGRAM'
        ? 'id,name,access_token,picture{url},instagram_business_account{id,name,username,profile_picture_url}'
        : 'id,name,access_token,picture{url}'

      const pages = await fetchAll(
        `${GRAPH_BASE}/me/accounts?fields=${fields}&limit=200&access_token=${accessToken}`
      )

      const assets: Asset[] = []
      for (const page of pages) {
        if (channel === 'FACEBOOK') {
          assets.push({
            id: page.id,
            name: page.name,
            picture: page.picture?.data?.url ?? page.picture?.url,
          })
        } else {
          const ig = page.instagram_business_account
          if (ig?.id) {
            assets.push({
              id: ig.id,
              name: ig.name || ig.username || page.name,
              username: ig.username,
              picture: ig.profile_picture_url,
            })
          }
        }
      }

      if (assets.length > 0) {
        portfolios.push({ id: 'personal', name: 'My Pages', assets })
      }
    }

    return NextResponse.json({ portfolios })
  } catch (error) {
    console.error('Meta social assets fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social assets', message: error instanceof Error ? error.message : 'Unknown error' },
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
    const { projectId, channel, assetId, assetName } = body

    if (!projectId || !channel || !assetId) {
      return NextResponse.json({ error: 'Missing projectId, channel, or assetId' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { credentials: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const credential = project.credentials.find(c => c.channel === channel)
    if (!credential) {
      return NextResponse.json({ error: `${channel} credential not found` }, { status: 400 })
    }

    await db.projectCredential.update({
      where: { id: credential.id },
      data: { accountId: assetId, accountName: assetName || assetId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Meta social asset save error:', error)
    return NextResponse.json(
      { error: 'Failed to save asset', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
