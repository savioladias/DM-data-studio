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

    // page_post_engagements, page_total_actions, page_actions_post_reactions_total
    // were all deprecated in Graph API v19.0. Replacements used here:
    // page_post_engagements → page_engaged_users
    // page_total_actions    → page_consumptions (content clicks)
    // page_actions_post_reactions_total → no page-level replacement; derived from posts below
    const insightMetrics = [
      'page_impressions',
      'page_impressions_unique',
      'page_engaged_users',
      'page_consumptions',
      'page_views_total',
      'page_fan_adds',
    ].join(',')

    // Use period=day with date strings — more reliable than total_over_range
    const insightsUrl =
      `${GRAPH_BASE}/${pageId}/insights?metric=${insightMetrics}` +
      `&period=day&since=${startDate}&until=${endDate}&access_token=${pageToken}`

    // Compute unix timestamps for posts endpoint (it uses since/until differently)
    const sinceTs = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000)
    const untilTs = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000)

    const [pageRes, insightsRes, postsRes] = await Promise.all([
      fetch(`${GRAPH_BASE}/${pageId}?fields=fan_count&access_token=${pageToken}`),
      fetch(insightsUrl),
      fetch(
        `${GRAPH_BASE}/${pageId}/posts?fields=comments.limit(0).summary(true),shares,reactions.limit(0).summary(true)` +
        `&since=${sinceTs}&until=${untilTs}&limit=100&access_token=${pageToken}`
      ),
    ])

    // Followers
    let followers = 0
    if (pageRes.ok) {
      const d = await pageRes.json()
      followers = d.fan_count ?? 0
    }

    // Page-level daily insights
    let views = 0, viewers = 0, contentInteractions = 0, linkClicks = 0
    let visits = 0, follows = 0, reactions = 0 // reactions derived from post-level data below

    if (insightsRes.ok) {
      const d = await insightsRes.json()
      if (d.error) {
        console.error('[FB Insights] API error:', JSON.stringify(d.error))
      }
      const metrics: any[] = d.data ?? []
      views               = sumDailyValues(metrics, 'page_impressions')
      viewers             = sumDailyValues(metrics, 'page_impressions_unique')
      contentInteractions = sumDailyValues(metrics, 'page_engaged_users')
      linkClicks          = sumDailyValues(metrics, 'page_consumptions')
      visits              = sumDailyValues(metrics, 'page_views_total')
      follows             = sumDailyValues(metrics, 'page_fan_adds')
    } else {
      const errText = await insightsRes.text().catch(() => '')
      console.error('[FB Insights] HTTP error', insightsRes.status, errText)
    }

    if (!pageRes.ok) {
      const errText = await pageRes.text().catch(() => '')
      console.error('[FB Page] HTTP error', pageRes.status, errText)
    }

    // Comments + shares from individual posts in the date range
    let comments = 0
    let shares = 0

    if (postsRes.ok) {
      const d = await postsRes.json()
      for (const post of d.data ?? []) {
        comments  += post.comments?.summary?.total_count ?? 0
        shares    += post.shares?.count ?? 0
        reactions += post.reactions?.summary?.total_count ?? 0
      }
      // One extra page of posts if available
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
