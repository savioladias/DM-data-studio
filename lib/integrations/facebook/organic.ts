/**
 * Facebook Page Organic Metrics
 * Fetches engagement data from Facebook Graph API v19.0
 *
 * Uses period=day with since/until date strings and sums daily values.
 * Page Insights require a Page Access Token — we exchange the stored
 * User Access Token via /me/accounts before making insight calls.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export interface FacebookOrganicMetrics {
  views: number               // page_impressions (total impressions)
  viewers: number             // page_impressions_unique (unique viewers)
  contentInteractions: number // page_post_engagements
  linkClicks: number          // page_total_actions
  visits: number              // page_views_total
  follows: number             // page_fan_adds (new page likes in period)
  reach: number               // page_impressions_unique
  reactions: number           // page_actions_post_reactions_total (summed)
  comments: number            // from posts in period
  shares: number              // from posts in period
  followers: number           // total fan_count
}

/** Exchange user token for page access token */
async function getPageAccessToken(userToken: string, pageId: string): Promise<string> {
  // Try /me/accounts first (works for directly-managed pages)
  try {
    const res = await fetch(
      `${GRAPH_BASE}/me/accounts?fields=id,access_token&limit=200&access_token=${userToken}`
    )
    if (res.ok) {
      const data = await res.json()
      const page = (data.data ?? []).find((p: { id: string; access_token?: string }) => p.id === pageId)
      if (page?.access_token) return page.access_token
    }
  } catch { /* fall through */ }

  // Fallback: fetch token directly from the page (works for Business Portfolio pages)
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${pageId}?fields=access_token&access_token=${userToken}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.access_token) return data.access_token
    }
  } catch { /* fall through */ }

  return userToken
}

/** Sum daily insight values, handling both numeric and object values */
function sumDailyValues(metricsData: any[], metricName: string): number {
  const metric = metricsData.find((m: any) => m.name === metricName)
  if (!metric?.values?.length) return 0
  return metric.values.reduce((sum: number, entry: any) => {
    const v = entry.value
    if (typeof v === 'number') return sum + v
    if (typeof v === 'object' && v !== null) {
      // page_actions_post_reactions_total: { like: N, love: N, haha: N, ... }
      return sum + Object.values(v as Record<string, number>).reduce(
        (s, n) => s + (typeof n === 'number' ? n : 0), 0
      )
    }
    return sum
  }, 0)
}

export async function fetchFacebookOrganicMetrics({
  accessToken,
  pageId,
  startDate,
  endDate,
}: {
  accessToken: string
  pageId: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}): Promise<FacebookOrganicMetrics> {
  const empty: FacebookOrganicMetrics = {
    views: 0, viewers: 0, contentInteractions: 0, linkClicks: 0,
    visits: 0, follows: 0, reach: 0, reactions: 0, comments: 0,
    shares: 0, followers: 0,
  }

  try {
    // Step 1: Get page access token (required for Page Insights)
    const pageToken = await getPageAccessToken(accessToken, pageId)

    // Helper for fetching with timeout and retries
    async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
      for (let i = 0; i <= retries; i++) {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 15000) // 15s timeout
        try {
          const res = await fetch(url, { signal: controller.signal })
          clearTimeout(id)
          return res
        } catch (err: any) {
          clearTimeout(id)
          if (i === retries) throw err
          if (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
             await new Promise(r => setTimeout(r, 500 * (i + 1)))
             continue
          }
          throw err
        }
      }
      throw new Error('Fetch failed after retries')
    }

    // Split metrics into core (almost always available) and extra (might fail on some page types)
    const coreMetrics = [
      'page_impressions',
      'page_impressions_unique',
      'page_engaged_users',
      'page_views_total',
    ]
    const extraMetrics = [
      'page_consumptions',
      'page_fan_adds',
      'page_daily_follows',
    ]

    const coreUrl = `${GRAPH_BASE}/${pageId}/insights?metric=${coreMetrics.join(',')}&period=day&since=${startDate}&until=${endDate}&access_token=${pageToken}`
    const extraUrl = `${GRAPH_BASE}/${pageId}/insights?metric=${extraMetrics.join(',')}&period=day&since=${startDate}&until=${endDate}&access_token=${pageToken}`

    // Compute unix timestamps for posts endpoint
    const sinceTs = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000)
    const untilTs = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000)

    const [pageRes, coreRes, extraRes, postsRes] = await Promise.allSettled([
      fetchWithRetry(`${GRAPH_BASE}/${pageId}?fields=fan_count&access_token=${pageToken}`),
      fetchWithRetry(coreUrl),
      fetchWithRetry(extraUrl),
      fetchWithRetry(
        `${GRAPH_BASE}/${pageId}/posts?fields=comments.limit(0).summary(true),shares,reactions.limit(0).summary(true)` +
        `&since=${sinceTs}&until=${untilTs}&limit=100&access_token=${pageToken}`
      ),
    ])

    // Followers
    let followers = 0
    if (pageRes.status === 'fulfilled' && pageRes.value.ok) {
      const d = await pageRes.value.json()
      followers = d.fan_count ?? 0
    }

    // Metrics collection
    let views = 0, viewers = 0, contentInteractions = 0, linkClicks = 0
    let visits = 0, follows = 0, reactions = 0

    // Process core insights
    if (coreRes.status === 'fulfilled' && coreRes.value.ok) {
      const d = await coreRes.value.json()
      const metrics: any[] = d.data ?? []
      views               = sumDailyValues(metrics, 'page_impressions')
      viewers             = sumDailyValues(metrics, 'page_impressions_unique')
      contentInteractions = sumDailyValues(metrics, 'page_engaged_users')
      visits              = sumDailyValues(metrics, 'page_views_total')
    } else if (coreRes.status === 'fulfilled') {
      const errText = await coreRes.value.text().catch(() => '')
      console.error('[FB Core Insights] HTTP error', coreRes.value.status, errText)
    }

    // Process extra/risky insights
    if (extraRes.status === 'fulfilled' && extraRes.value.ok) {
      const d = await extraRes.value.json()
      const metrics: any[] = d.data ?? []
      linkClicks = sumDailyValues(metrics, 'page_consumptions')
      follows    = sumDailyValues(metrics, 'page_fan_adds')
      
      // If page_fan_adds is 0, try page_daily_follows (New Page Experience)
      if (follows === 0) {
        follows = sumDailyValues(metrics, 'page_daily_follows')
      }
    }

    // Post-level data (comments, shares, reactions)
    let comments = 0, shares = 0
    if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
      const d = await postsRes.value.json()
      for (const post of d.data ?? []) {
        comments  += post.comments?.summary?.total_count ?? 0
        shares    += post.shares?.count ?? 0
        reactions += post.reactions?.summary?.total_count ?? 0
      }
      
      if (d.paging?.next) {
        try {
          const nextRes = await fetch(d.paging.next)
          if (nextRes.ok) {
            const nextData = await nextRes.json()
            for (const post of nextData.data ?? []) {
              comments  += post.comments?.summary?.total_count ?? 0
              shares    += post.shares?.count ?? 0
              reactions += post.reactions?.summary?.total_count ?? 0
            }
          }
        } catch { /* ignore */ }
      }
    }

    return {
      views, viewers, contentInteractions, linkClicks,
      visits, follows, reach: viewers, reactions, comments, shares, followers,
    }
  } catch (error) {
    console.error('Error fetching Facebook organic metrics:', error)
    return empty
  }
}

// Legacy export for backwards compatibility
export async function fetchFacebookMetrics(args: {
  accessToken: string
  pageId: string
  startDate?: string
  endDate?: string
}) {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const m = await fetchFacebookOrganicMetrics({
    accessToken: args.accessToken,
    pageId: args.pageId,
    startDate: args.startDate ?? thirtyDaysAgo,
    endDate: args.endDate ?? today,
  })

  return {
    followers: m.followers,
    reach: m.reach,
    engagement: m.contentInteractions,
    engagementRate: m.followers > 0
      ? parseFloat(((m.contentInteractions / m.followers) * 100).toFixed(2))
      : 0,
    posts: 0,
  }
}
