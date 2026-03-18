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

export interface GA4MetricData {
  metricKey: string
  value: number
  date: Date
}

/**
 * Fetch GA4 properties available to the user
 * Returns list of properties the user has access to
 */
export async function fetchGA4Properties(
  accessToken: string
): Promise<Array<{ propertyId: string; displayName: string }>> {
  const response = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/properties',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 Admin API error: ${error}`)
  }

  const data = (await response.json()) as {
    properties?: Array<{ name: string; displayName: string }>
  }

  // Format: properties/123456 -> extract propertyId
  return (data.properties || []).map(prop => ({
    propertyId: prop.name.replace('properties/', ''),
    displayName: prop.displayName || prop.name,
  }))
}

/**
 * Fetch metrics from Google Analytics 4
 * Returns daily metrics for a date range
 */
export async function fetchGA4Metrics(
  config: GA4FetchConfig
): Promise<GA4MetricData[]> {
  const propertyId = config.propertyId.replace('properties/', '')

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [
          {
            startDate: config.startDate,
            endDate: config.endDate,
          },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'screenPageViews' },
        ],
        dimensions: [
          { name: 'date' },
        ],
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 API error: ${error}`)
  }

  const data = (await response.json()) as GA4ApiResponse

  const metrics: GA4MetricData[] = []
  const metricNames = ['activeUsers', 'newUsers', 'sessions', 'bounceRate', 'screenPageViews']

  data.rows?.forEach(row => {
    const dateStr = row.dimensionValues[0].value
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const date = new Date(`${year}-${month}-${day}`)

    row.metricValues.forEach((metricValue, idx) => {
      metrics.push({
        metricKey: metricNames[idx],
        value: parseFloat(metricValue.value),
        date,
      })
    })
  })

  return metrics
}

interface GA4ApiResponse {
  rows?: Array<{
    dimensionValues: Array<{ value: string }>
    metricValues: Array<{ value: string }>
  }>
}
