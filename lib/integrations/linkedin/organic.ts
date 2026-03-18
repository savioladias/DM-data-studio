/**
 * LinkedIn Organic (Company Page) API client
 * Fetches engagement metrics from company page
 */

export interface LinkedInFetchConfig {
  accessToken: string
  organizationId: string  // numeric ID, e.g. '12345678'
}

export interface LinkedInMetricData {
  followers: number
  impressions: number
  clicks: number
  engagementRate: number
  reactions: number
}

/**
 * Fetch follower count for a LinkedIn organization
 */
async function fetchFollowerCount(accessToken: string, organizationId: string): Promise<number> {
  const response = await fetch(
    `https://api.linkedin.com/v2/networkSizes/urn:li:organization:${organizationId}?edgeType=CompanyFollowedByMember`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  )

  if (!response.ok) {
    console.error('Failed to fetch LinkedIn followers:', await response.text())
    return 0
  }

  const data = (await response.json()) as { paging?: { total?: number } }
  return data.paging?.total || 0
}

/**
 * Fetch organization share statistics (impressions, clicks, engagement)
 */
async function fetchShareStatistics(accessToken: string, organizationId: string): Promise<{
  impressions: number
  clicks: number
  engagementRate: number
  reactions: number
}> {
  const response = await fetch(
    `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
      },
    }
  )

  if (!response.ok) {
    console.error('Failed to fetch LinkedIn share statistics:', await response.text())
    return {
      impressions: 0,
      clicks: 0,
      engagementRate: 0,
      reactions: 0,
    }
  }

  const data = (await response.json()) as {
    elements?: Array<{
      impressionCount: number
      clickCount: number
      engagementRate?: number
      reaction?: { count: number }
    }>
  }

  // Sum metrics across all shares
  const stats = data.elements?.reduce(
    (acc, share) => ({
      impressions: acc.impressions + (share.impressionCount || 0),
      clicks: acc.clicks + (share.clickCount || 0),
      engagementRate: acc.engagementRate + (share.engagementRate || 0),
      reactions: acc.reactions + (share.reaction?.count || 0),
    }),
    { impressions: 0, clicks: 0, engagementRate: 0, reactions: 0 }
  ) || { impressions: 0, clicks: 0, engagementRate: 0, reactions: 0 }

  return stats
}

/**
 * Fetch all metrics for a LinkedIn organization
 */
export async function fetchLinkedInMetrics(config: LinkedInFetchConfig): Promise<LinkedInMetricData> {
  try {
    const [followers, stats] = await Promise.all([
      fetchFollowerCount(config.accessToken, config.organizationId),
      fetchShareStatistics(config.accessToken, config.organizationId),
    ])

    return {
      followers,
      impressions: stats.impressions,
      clicks: stats.clicks,
      engagementRate: stats.engagementRate,
      reactions: stats.reactions,
    }
  } catch (error) {
    console.error('Error fetching LinkedIn metrics:', error)
    throw error
  }
}
