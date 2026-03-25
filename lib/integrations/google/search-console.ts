/**
 * Google Search Console API client
 * Fetches search performance metrics, dimensional data, and Core Web Vitals
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

export interface GSCDimensionalRow {
  dimension: string
  clicks: number
  impressions: number
  ctr: number      // 0-100
  position: number
}

export interface GSCCWVData {
  lcp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
  cls?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
  inp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
  fcp?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
  ttfb?: { value: number; displayValue: string; category: 'FAST' | 'AVERAGE' | 'SLOW' }
  overallCategory?: 'FAST' | 'AVERAGE' | 'SLOW'
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
 * Fetch search metrics from Google Search Console for a single site (no dimension)
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
 * Fetch dimensional breakdown (query, page, country, device)
 */
export async function fetchGSCDimensional(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimension: 'query' | 'page' | 'country' | 'device',
  rowLimit: number = 25
): Promise<GSCDimensionalRow[]> {
  const encodedSiteUrl = encodeURIComponent(siteUrl)

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: [dimension],
        dataState: 'all',
        rowLimit,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
    }
  )

  if (!response.ok) {
    console.error(`[GSC] Dimensional query (${dimension}) failed:`, await response.text())
    return []
  }

  const data = (await response.json()) as {
    rows?: Array<{
      keys: string[]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
  }

  return (data.rows ?? []).map(row => ({
    dimension: row.keys[0] ?? '',
    clicks: Math.round(row.clicks),
    impressions: Math.round(row.impressions),
    ctr: parseFloat((row.ctr * 100).toFixed(2)),
    position: parseFloat(row.position.toFixed(1)),
  }))
}

/**
 * Fetch traffic source breakdown by search type (web, image, video, news)
 */
export async function fetchGSCTrafficSources(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCDimensionalRow[]> {
  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const searchTypes = ['web', 'image', 'video', 'news']

  const results = await Promise.allSettled(
    searchTypes.map(async (type) => {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: [],
            type,
            dataState: 'all',
          }),
        }
      )
      if (!response.ok) return null
      const data = (await response.json()) as {
        rows?: Array<{ clicks: number; impressions: number; ctr: number; position: number }>
      }
      const row = data.rows?.[0]
      if (!row || (row.clicks === 0 && row.impressions === 0)) return null
      return {
        dimension: type.charAt(0).toUpperCase() + type.slice(1) + ' Search',
        clicks: Math.round(row.clicks),
        impressions: Math.round(row.impressions),
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(1)),
      } as GSCDimensionalRow
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<GSCDimensionalRow> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
}

/**
 * Fetch Core Web Vitals for mobile and desktop via PageSpeed Insights API
 * Falls back gracefully if the API is unavailable or the URL is invalid.
 */
export async function fetchCoreWebVitals(
  siteUrl: string,
  apiKey?: string
): Promise<{ mobile: GSCCWVData; desktop: GSCCWVData }> {
  // Strip trailing slash and use as the URL to test
  const url = siteUrl.replace(/\/$/, '')
  const keyParam = apiKey ? `&key=${apiKey}` : ''

  async function fetchStrategy(strategy: 'mobile' | 'desktop'): Promise<GSCCWVData> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance${keyParam}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!res.ok) return {}

      const data = await res.json() as {
        loadingExperience?: {
          overall_category?: string
          metrics?: Record<string, {
            percentile: number
            category: string
            distributions?: Array<{ min: number; max?: number; proportion: number }>
          }>
        }
      }

      const metrics = data.loadingExperience?.metrics ?? {}
      const overall = data.loadingExperience?.overall_category as 'FAST' | 'AVERAGE' | 'SLOW' | undefined

      function mapCategory(c?: string): 'FAST' | 'AVERAGE' | 'SLOW' {
        if (c === 'FAST') return 'FAST'
        if (c === 'AVERAGE' || c === 'NEEDS_IMPROVEMENT') return 'AVERAGE'
        return 'SLOW'
      }

      const lcp = metrics['LARGEST_CONTENTFUL_PAINT_MS']
      const cls = metrics['CUMULATIVE_LAYOUT_SHIFT_SCORE']
      const inp = metrics['INTERACTION_TO_NEXT_PAINT']
      const fcp = metrics['FIRST_CONTENTFUL_PAINT_MS']
      const ttfb = metrics['EXPERIMENTAL_TIME_TO_FIRST_BYTE']

      return {
        lcp: lcp ? {
          value: lcp.percentile,
          displayValue: `${(lcp.percentile / 1000).toFixed(1)}s`,
          category: mapCategory(lcp.category),
        } : undefined,
        cls: cls ? {
          value: cls.percentile / 100,
          displayValue: (cls.percentile / 100).toFixed(3),
          category: mapCategory(cls.category),
        } : undefined,
        inp: inp ? {
          value: inp.percentile,
          displayValue: `${inp.percentile}ms`,
          category: mapCategory(inp.category),
        } : undefined,
        fcp: fcp ? {
          value: fcp.percentile,
          displayValue: `${(fcp.percentile / 1000).toFixed(1)}s`,
          category: mapCategory(fcp.category),
        } : undefined,
        ttfb: ttfb ? {
          value: ttfb.percentile,
          displayValue: `${ttfb.percentile}ms`,
          category: mapCategory(ttfb.category),
        } : undefined,
        overallCategory: overall ? mapCategory(overall) : undefined,
      }
    } catch {
      return {}
    }
  }

  const [mobile, desktop] = await Promise.all([
    fetchStrategy('mobile'),
    fetchStrategy('desktop'),
  ])

  return { mobile, desktop }
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
