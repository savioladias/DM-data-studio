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
 * Fetch search metrics from Google Search Console
 * Returns aggregated clicks, impressions, CTR, and average position
 */
export async function fetchGSCMetrics(config: GSCFetchConfig): Promise<GSCMetricData> {
  // Encode the site URL (format: sc-domain:example.com or https://example.com/)
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
        dataState: 'final',
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

  // If no rows, return zeros
  if (!data.rows || data.rows.length === 0) {
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    }
  }

  // Sum up the metrics from all rows
  const aggregated = data.rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
      ctr: acc.ctr + (row.ctr || 0),
      position: acc.position + (row.position || 0),
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  )

  // Average the position across rows
  const avgPosition = data.rows.length > 0 ? aggregated.position / data.rows.length : 0

  return {
    clicks: aggregated.clicks,
    impressions: aggregated.impressions,
    ctr: aggregated.ctr * 100, // Convert to percentage
    position: parseFloat(avgPosition.toFixed(2)),
  }
}
