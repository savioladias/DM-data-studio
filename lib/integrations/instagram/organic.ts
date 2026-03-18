/**
 * Instagram Organic Metrics
 * Fetches engagement data from Instagram Graph API
 */

export interface InstagramMetrics {
  followers: number
  reach: number
  impressions: number
  engagement: number
  engagementRate: number
}

export async function fetchInstagramMetrics({
  accessToken,
  businessAccountId,
}: {
  accessToken: string
  businessAccountId: string
}): Promise<InstagramMetrics> {
  try {
    // Get business account info and insights
    const [accountResponse, insightsResponse] = await Promise.all([
      fetch(
        `https://graph.instagram.com/v18.0/${businessAccountId}?fields=followers_count&access_token=${accessToken}`
      ),
      fetch(
        `https://graph.instagram.com/v18.0/${businessAccountId}/insights?metric=reach,impressions,engagement&date_preset=last_7d&access_token=${accessToken}`
      ),
    ])

    if (!accountResponse.ok || !insightsResponse.ok) {
      console.error('Instagram API error:', accountResponse.status, insightsResponse.status)
      return {
        followers: 0,
        reach: 0,
        impressions: 0,
        engagement: 0,
        engagementRate: 0,
      }
    }

    const accountData = await accountResponse.json()
    const insightsData = await insightsResponse.json()

    const followers = accountData.followers_count || 0

    // Parse insights data
    let reach = 0
    let impressions = 0
    let engagement = 0

    if (insightsData.data) {
      for (const insight of insightsData.data) {
        if (insight.name === 'reach' && insight.values?.[0]) {
          reach = insight.values[0].value || 0
        }
        if (insight.name === 'impressions' && insight.values?.[0]) {
          impressions = insight.values[0].value || 0
        }
        if (insight.name === 'engagement' && insight.values?.[0]) {
          engagement = insight.values[0].value || 0
        }
      }
    }

    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0

    return {
      followers,
      reach,
      impressions,
      engagement,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    }
  } catch (error) {
    console.error('Error fetching Instagram metrics:', error)
    return {
      followers: 0,
      reach: 0,
      impressions: 0,
      engagement: 0,
      engagementRate: 0,
    }
  }
}
