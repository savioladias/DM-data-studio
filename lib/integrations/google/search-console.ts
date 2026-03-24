/**
 * Google Search Console API client
 * Fetches search performance metrics (clicks, impressions, CTR, position)
 */

export interface GSCFetchConfig {
  accessToken: string
  siteUrl: string  // e.g., 'https://example.com/'
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface GSCMetricData {
  clicks: number
  impressions: number
  ctr: number      // percentage (0-100)
  position: number // average position
}

/**
 * List all sites available in a GSC account
 */
async function listGSCSites(accessToken: string): Promise<string[]> {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[GSC] Failed to list sites:', res.status, err)
    return []
  }

  const data = await res.json() as {
    siteEntry?: { siteUrl: string; permissionLevel: string }[]
  }

  const sites = (data.siteEntry ?? []).map(s => s.siteUrl)
  console.log('[GSC] Sites found in account:', sites)
  return sites
}

/**
 * Fetch search metrics from Google Search Console for a single site
 */
export async function fetchGSCMetrics(config: GSCFetchConfig): Promise<GSCMetricData | null> {
  const encodedSiteUrl = encodeURIComponent(config.siteUrl)

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: config.startDate,
        endDate: config.endDate,
        dimensions: [],
        dataState: 'all',
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GSC API error: ${error}`)
  }

  const data = (await response.json()) as {
    rows?: Array<{
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
  }

  if (!data.rows || data.rows.length === 0) {
    return null
  }

  const aggregated = data.rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
      ctr: acc.ctr + (row.ctr || 0),
      position: acc.position + (row.position || 0),
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  )

  const avgPosition = aggregated.position / data.rows.length

  return {
    clicks: aggregated.clicks,
    impressions: aggregated.impressions,
    ctr: aggregated.ctr * 100,
    position: parseFloat(avgPosition.toFixed(2)),
  }
}

/**
 * Catch potential rate limit issues by fetching in small batches
 */
async function fetchMetricsWithConcurrency(
  accessToken: string,
  siteUrls: string[],
  startDate: string,
  endDate: string,
  concurrency: number = 5
): Promise<GSCMetricData[]> {
  const results: GSCMetricData[] = []
  
  for (let i = 0; i < siteUrls.length; i += concurrency) {
    const batch = siteUrls.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(siteUrl => fetchGSCMetrics({ accessToken, siteUrl, startDate, endDate }))
    )
    
    batchResults.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value)
      } else if (r.status === 'rejected') {
        console.error(`[GSC] Error fetching metrics for ${batch[idx]}:`, r.reason)
      }
    })
    
    // Small delay between batches if there are many
    if (siteUrls.length > concurrency && i + concurrency < siteUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

/**
 * Fetch and aggregate search metrics across ALL sites in the account.
 * Returns null if no sites found or no data across any site.
 */
export async function fetchAllGSCMetrics(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<GSCMetricData | null> {
  const siteUrls = await listGSCSites(accessToken)

  if (siteUrls.length === 0) {
    console.warn('[GSC] No sites found in account — token may be invalid or account has no properties')
    return null
  }

  console.log(`[GSC] Aggregating data for ${siteUrls.length} sites...`)
  const fulfilled = await fetchMetricsWithConcurrency(accessToken, siteUrls, startDate, endDate)

  if (fulfilled.length === 0) {
    return null
  }

  const totalClicks = fulfilled.reduce((sum, d) => sum + d.clicks, 0)
  const totalImpressions = fulfilled.reduce((sum, d) => sum + d.impressions, 0)

  // If all sites returned zero data, return null so the channel doesn't render as fake zeros
  if (totalClicks === 0 && totalImpressions === 0) {
    console.warn('[GSC] All sites returned 0 clicks and 0 impressions for this date range')
    return null
  }

  const totalPosition = fulfilled.filter(d => d.position > 0).reduce((sum, d) => sum + d.position, 0)
  const positionCount = fulfilled.filter(d => d.position > 0).length || 1
  const avgPosition = totalPosition / positionCount

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  return {
    clicks: totalClicks,
    impressions: totalImpressions,
    ctr: parseFloat(avgCtr.toFixed(2)),
    position: parseFloat(avgPosition.toFixed(2)),
  }
}
