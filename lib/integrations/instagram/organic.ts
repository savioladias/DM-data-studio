/**
 * Instagram Business Account Organic Metrics
 * Fetches engagement data via Instagram Graph API (graph.facebook.com v19.0)
 *
 * The Instagram business account ID is linked to a Facebook Page.
 * The stored credential is a User Access Token — we need a Page Access Token
 * to call IG insights. We fetch it via /me/accounts → page → instagram_business_account.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export interface InstagramOrganicMetrics {
  views: number               // impressions
  viewers: number             // reach
  contentInteractions: number // total_interactions (likes+comments+shares+saves)
  linkClicks: number          // website_clicks
  visits: number              // profile_views
  follows: number             // follower_count delta (new follows estimate)
  reach: number               // reach
  reactions: number           // likes
  comments: number            // comments
  shares: number              // shares
  followers: number           // followers_count
}

function toUnixTimestamp(dateStr: string, endOfDay = false): number {
  const suffix = endOfDay ? 'T23:59:59Z' : 'T00:00:00Z'
  return Math.floor(new Date(dateStr + suffix).getTime() / 1000)
}

/**
 * For IG insights we need a Page Access Token of the Facebook Page
 * that the Instagram account is connected to.
 * We find the right page by checking which page's instagram_business_account.id
 * matches our igUserId.
 */
async function getPageTokenForIgAccount(
  userAccessToken: string,
  igUserId: string
): Promise<string> {
  // Try /me/accounts first (works for directly-managed pages)
  try {
    const res = await fetch(
      `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id}` +
      `&limit=200&access_token=${userAccessToken}`
    )
    if (res.ok) {
      const data = await res.json()
      for (const page of data.data ?? []) {
        if (page.instagram_business_account?.id === igUserId && page.access_token) {
          return page.access_token
        }
      }
    }
  } catch { /* fall through */ }

  // Fallback: find the FB page linked to this IG account, then get its token
  // (works for Business Portfolio pages not in /me/accounts)
  try {
    const igRes = await fetch(
      `${GRAPH_BASE}/${igUserId}?fields=connected_instagram_account&access_token=${userAccessToken}`
    )
    if (!igRes.ok) return userAccessToken

    // Try fetching the page token via the IG account's parent page
    // by searching owned/client pages via me/businesses
    const bizRes = await fetch(
      `${GRAPH_BASE}/me/businesses?fields=id&limit=10&access_token=${userAccessToken}`
    )
    if (!bizRes.ok) return userAccessToken
    const bizData = await bizRes.json()

    for (const biz of bizData.data ?? []) {
      const pagesRes = await fetch(
        `${GRAPH_BASE}/${biz.id}/owned_pages?fields=id,access_token,instagram_business_account{id}&limit=100&access_token=${userAccessToken}`
      )
      if (!pagesRes.ok) continue
      const pagesData = await pagesRes.json()
      for (const page of pagesData.data ?? []) {
        if (page.instagram_business_account?.id === igUserId && page.access_token) {
          return page.access_token
        }
      }
    }
  } catch { /* fall through */ }

  return userAccessToken
}

/** Sum daily metric values for a given metric name */
function sumDailyValues(metricsData: any[], metricName: string): number {
  const metric = metricsData.find((m: any) => m.name === metricName)
  if (!metric?.values?.length) return 0
  return metric.values.reduce((sum: number, entry: any) => {
    const v = entry.value
    return sum + (typeof v === 'number' ? v : 0)
  }, 0)
}

export async function fetchInstagramOrganicMetrics({
  accessToken,
  businessAccountId,
  startDate,
  endDate,
}: {
  accessToken: string
  businessAccountId: string
  startDate: string
  endDate: string
}): Promise<InstagramOrganicMetrics> {
  const empty: InstagramOrganicMetrics = {
    views: 0, viewers: 0, contentInteractions: 0, linkClicks: 0,
    visits: 0, follows: 0, reach: 0, reactions: 0, comments: 0,
    shares: 0, followers: 0,
  }

  try {
    const since = toUnixTimestamp(startDate)
    const until = toUnixTimestamp(endDate, true)

    // Get page access token linked to this IG account
    const pageToken = await getPageTokenForIgAccount(accessToken, businessAccountId)

    // Core metrics available across all IG business accounts
    const coreMetrics = [
      'impressions',
      'reach',
      'profile_views',
      'website_clicks',
    ].join(',')

    const [accountRes, coreRes] = await Promise.all([
      fetch(
        `${GRAPH_BASE}/${businessAccountId}?fields=followers_count&access_token=${pageToken}`
      ),
      fetch(
        `${GRAPH_BASE}/${businessAccountId}/insights?metric=${coreMetrics}` +
        `&period=day&since=${since}&until=${until}&access_token=${pageToken}`
      ),
    ])

    let followers = 0
    if (accountRes.ok) {
      const d = await accountRes.json()
      followers = d.followers_count ?? 0
    }

    let views = 0, viewers = 0, visits = 0, linkClicks = 0

    if (coreRes.ok) {
      const d = await coreRes.json()
      const metrics: any[] = d.data ?? []
      views      = sumDailyValues(metrics, 'impressions')
      viewers    = sumDailyValues(metrics, 'reach')
      visits     = sumDailyValues(metrics, 'profile_views')
      linkClicks = sumDailyValues(metrics, 'website_clicks')
    } else {
      const errText = await coreRes.text().catch(() => '')
      console.error('Instagram core insights error:', coreRes.status, errText)
    }

    // Interaction metrics — available on v17+ for most accounts
    // Request separately so a failure here doesn't zero out everything else
    let reactions = 0, comments = 0, shares = 0, contentInteractions = 0, follows = 0

    try {
      const interactionMetrics = [
        'likes',
        'comments',
        'shares',
        'total_interactions',
        'follows_and_unfollows',
      ].join(',')

      const interactionRes = await fetch(
        `${GRAPH_BASE}/${businessAccountId}/insights?metric=${interactionMetrics}` +
        `&period=day&since=${since}&until=${until}&access_token=${pageToken}`
      )

      if (interactionRes.ok) {
        const d = await interactionRes.json()
        const metrics: any[] = d.data ?? []
        reactions           = sumDailyValues(metrics, 'likes')
        comments            = sumDailyValues(metrics, 'comments')
        shares              = sumDailyValues(metrics, 'shares')
        contentInteractions = sumDailyValues(metrics, 'total_interactions')

        // follows_and_unfollows value is { follows: N, unfollows: N } per day
        const followMetric = metrics.find((m: any) => m.name === 'follows_and_unfollows')
        if (followMetric?.values) {
          follows = followMetric.values.reduce((sum: number, entry: any) => {
            const v = entry.value
            if (typeof v === 'object' && v !== null) {
              return sum + ((v as any).follows ?? 0)
            }
            return sum + (typeof v === 'number' ? v : 0)
          }, 0)
        }
      }
    } catch { /* interaction metrics not supported on this account — leave at 0 */ }

    // Fall back: compute content interactions from parts if total_interactions missing
    if (contentInteractions === 0 && (reactions + comments + shares) > 0) {
      contentInteractions = reactions + comments + shares
    }

    return {
      views, viewers, contentInteractions, linkClicks,
      visits, follows, reach: viewers, reactions, comments, shares, followers,
    }
  } catch (error) {
    console.error('Error fetching Instagram organic metrics:', error)
    return empty
  }
}

// Legacy export kept for backwards compatibility
export async function fetchInstagramMetrics(args: {
  accessToken: string
  businessAccountId: string
  startDate?: string
  endDate?: string
}) {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const m = await fetchInstagramOrganicMetrics({
    accessToken: args.accessToken,
    businessAccountId: args.businessAccountId,
    startDate: args.startDate ?? thirtyDaysAgo,
    endDate: args.endDate ?? today,
  })

  return {
    followers: m.followers,
    reach: m.reach,
    impressions: m.views,
    engagement: m.contentInteractions,
    engagementRate: m.views > 0
      ? parseFloat(((m.contentInteractions / m.views) * 100).toFixed(2))
      : 0,
  }
}
