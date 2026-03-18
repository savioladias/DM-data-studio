/**
 * Facebook Page Organic Metrics
 * Fetches engagement data from Facebook Page API
 */

export interface FacebookMetrics {
  followers: number
  reach: number
  engagement: number
  engagementRate: number
  posts: number
}

export async function fetchFacebookMetrics({
  accessToken,
  pageId,
}: {
  accessToken: string
  pageId: string
}): Promise<FacebookMetrics> {
  try {
    // Get page followers and insights
    const [pageResponse, insightsResponse] = await Promise.all([
      fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=followers_count&access_token=${accessToken}`),
      fetch(
        `https://graph.facebook.com/v18.0/${pageId}/insights?metric=page_fans,page_fan_adds,page_impressions,page_engaged_users,page_posts&date_preset=last_7d&access_token=${accessToken}`
      ),
    ])

    if (!pageResponse.ok || !insightsResponse.ok) {
      console.error('Facebook API error:', pageResponse.status, insightsResponse.status)
      return {
        followers: 0,
        reach: 0,
        engagement: 0,
        engagementRate: 0,
        posts: 0,
      }
    }

    const pageData = await pageResponse.json()
    const insightsData = await insightsResponse.json()

    const followers = pageData.followers_count || 0

    // Parse insights data
    let reach = 0
    let engagement = 0
    let posts = 0

    if (insightsData.data) {
      for (const insight of insightsData.data) {
        if (insight.name === 'page_impressions' && insight.values?.[0]) {
          reach = insight.values[0].value || 0
        }
        if (insight.name === 'page_engaged_users' && insight.values?.[0]) {
          engagement = insight.values[0].value || 0
        }
        if (insight.name === 'page_posts' && insight.values?.[0]) {
          posts = insight.values[0].value || 0
        }
      }
    }

    const engagementRate = followers > 0 ? (engagement / followers) * 100 : 0

    return {
      followers,
      reach,
      engagement,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      posts,
    }
  } catch (error) {
    console.error('Error fetching Facebook metrics:', error)
    return {
      followers: 0,
      reach: 0,
      engagement: 0,
      engagementRate: 0,
      posts: 0,
    }
  }
}
