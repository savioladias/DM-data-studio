/**
 * Google Analytics 4 API client
 * Fetches user behavior metrics from GA4 properties
 */

export interface GA4FetchConfig {
  accessToken: string
  propertyId: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface GA4AggregatedMetrics {
  current: Record<string, number>
  previous: Record<string, number>
}

/**
 * Fetch GA4 properties available to the user
 */
export async function fetchGA4Properties(
  accessToken: string
): Promise<Array<{ propertyId: string; displayName: string }>> {
  const properties: Array<{ propertyId: string; displayName: string }> = []
  let pageToken: string | undefined = undefined

  do {
    const url = new URL('https://analyticsadmin.googleapis.com/v1beta/accountSummaries')
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken)
    }
    // Max page size for accountSummaries is 200
    url.searchParams.append('pageSize', '200')

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GA4 Admin API error: ${error}`)
    }

    const data = (await response.json()) as {
      accountSummaries?: Array<{
        account: string
        displayName: string
        propertySummaries?: Array<{ property: string; displayName: string }>
      }>
      nextPageToken?: string
    }

    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        properties.push({
          propertyId: prop.property.replace('properties/', ''),
          displayName: prop.displayName || prop.property,
        })
      }
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return properties
}

const METRIC_SET_1 = [
  'activeUsers',
  'newUsers',
  'totalUsers',
  'sessions',
  'engagedSessions',
  'engagementRate',
  'screenPageViews',
  'conversions',
  'userEngagementDuration',
  'eventCount'
]

const METRIC_SET_2 = [
  'eventsPerSession',
  'dauPerMau',
  'dauPerWau',
  'wauPerMau'
]

/** Run a single aggregate GA4 report (no dimensions = one row total) */
async function runAggregateReport(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  metrics: string[]
): Promise<Record<string, number>> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: metrics.map(name => ({ name })),
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 API error: ${error}`)
  }

  const data = (await response.json()) as {
    rows?: Array<{ metricValues: Array<{ value: string }> }>
  }

  const result: Record<string, number> = {}
  metrics.forEach(k => { result[k] = 0 })

  const row = data.rows?.[0]
  if (row) {
    row.metricValues.forEach((mv, idx) => {
      result[metrics[idx]] = parseFloat(mv.value)
    })
  }

  return result
}

/**
 * Fetch aggregated GA4 metrics for the current period,
 * and the equivalent prior period of the same length for comparison.
 */
export async function fetchGA4Metrics(config: GA4FetchConfig): Promise<GA4AggregatedMetrics> {
  const propertyId = config.propertyId.replace('properties/', '')

  // Calculate prior period of the same duration
  const start = new Date(config.startDate)
  const end = new Date(config.endDate)
  const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const priorEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  const priorStart = new Date(priorEnd.getTime() - durationDays * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [current1, previous1, current2, previous2] = await Promise.all([
    runAggregateReport(config.accessToken, propertyId, config.startDate, config.endDate, METRIC_SET_1),
    runAggregateReport(config.accessToken, propertyId, fmt(priorStart), fmt(priorEnd), METRIC_SET_1),
    runAggregateReport(config.accessToken, propertyId, config.startDate, config.endDate, METRIC_SET_2),
    runAggregateReport(config.accessToken, propertyId, fmt(priorStart), fmt(priorEnd), METRIC_SET_2),
  ])

  return {
    current: { ...current1, ...current2 },
    previous: { ...previous1, ...previous2 }
  }
}

/**
 * Fetch realtime active users for the last 30 minutes
 */
export async function fetchGA4RealtimeMetrics(
  accessToken: string,
  propertyId: string
): Promise<{ activeUsers: number }> {
  try {
    const propId = propertyId.replace('properties/', '')
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    )

    if (!response.ok) {
      console.error('GA4 Realtime API error:', await response.text())
      return { activeUsers: 0 }
    }

    const data = (await response.json()) as {
      rows?: Array<{ metricValues: Array<{ value: string }> }>
    }

    return {
      activeUsers: parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0', 10),
    }
  } catch (error) {
    console.error('Error fetching GA4 realtime metrics:', error)
    return { activeUsers: 0 }
  }
}
