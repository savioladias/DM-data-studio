/**
 * Google Ads API client
 * Fetches accounts and performance metrics from Google Ads
 */

export interface GoogleAdsAccount {
  resourceName: string
  id: string
  descriptiveName: string
  manager: boolean
}

/**
 * Fetch Google Ads accounts available to the user
 */
export async function fetchGoogleAdsAccounts(
  accessToken: string
): Promise<GoogleAdsAccount[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not set in .env')
  }

  const versions = ['v23', 'v22', 'v21', 'v20']
  let listData: { resourceNames?: string[] } | null = null
  let usedVersion = 'v23'

  for (const v of versions) {
    try {
      console.log(`Trying Google Ads API ${v} for listAccessibleCustomers...`)

      const url = `https://googleads.googleapis.com/${v}/customers:listAccessibleCustomers`
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
          'developer-token': developerToken.trim(),
        } as Record<string, string>,
      })

      const respText = await resp.text()

      if (!resp.ok) {
        console.warn(`Ads API ${v} failed with status ${resp.status}: ${respText.substring(0, 200)}`)
        if (v === versions[versions.length - 1]) {
          throw new Error(`Google Ads API error ${resp.status} ${resp.statusText}: ${respText.substring(0, 500)}`)
        }
        continue
      }

      listData = JSON.parse(respText) as { resourceNames?: string[] }
      usedVersion = v
      break
    } catch (e) {
      if (v === versions[versions.length - 1]) throw e
      console.error(`Fetch error for Ads API ${v}:`, e)
    }
  }

  if (!listData) {
    throw new Error('Failed to fetch Google Ads accounts after trying all API versions')
  }
  const resourceNames = listData.resourceNames || []
  console.log(`Using ${usedVersion}: Found ${resourceNames.length} accessible customers`)

  // 2. Fetch details for each customer
  // We use the same version that worked for listing
  const detailPromises = resourceNames.map(async (resourceName) => {
    try {
      const customerId = resourceName.split('/')[1]
      const response = await fetch(
        `https://googleads.googleapis.com/${usedVersion}/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
          } as Record<string, string>,
          body: JSON.stringify({
            query: `
              SELECT 
                customer.id, 
                customer.descriptive_name, 
                customer.manager,
                customer.status
              FROM customer
              LIMIT 1
            `
          }),
        }
      )

      if (!response.ok) {
        console.warn(`Failed to fetch details for customer ${customerId}:`, await response.text())
        return null
      }

      const data = await response.json()
      const customer = data.results?.[0]?.customer
      if (customer) {
        return {
          resourceName,
          id: customer.id,
          descriptiveName: customer.descriptiveName || `Account ${customer.id}`,
          manager: customer.manager || false,
        }
      }
    } catch (e) {
      console.error(`Error fetching details for ${resourceName}:`, e)
    }
    return null
  })

  const detailedAccounts = await Promise.all(detailPromises)
  return detailedAccounts.filter((a): a is GoogleAdsAccount => a !== null)
}

export interface GoogleAdsMetricsConfig {
  accessToken: string
  customerId: string
  startDate: string
  endDate: string
}

export async function fetchGoogleAdsMetrics(config: GoogleAdsMetricsConfig) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const { accessToken, customerId, startDate, endDate } = config

  const response = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({
        query: `
          SELECT 
            metrics.impressions, 
            metrics.clicks, 
            metrics.cost_micros, 
            metrics.conversions,
            metrics.conversions_value
          FROM customer
          WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        `
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Ads API error (metrics): ${error}`)
  }

  const data = await response.json()
  const metrics = data.results?.[0]?.metrics || {
    impressions: "0",
    clicks: "0",
    costMicros: "0",
    conversions: "0",
    conversionsValue: "0"
  }

  return {
    impressions: parseInt(metrics.impressions || "0"),
    clicks: parseInt(metrics.clicks || "0"),
    spend: (parseInt(metrics.costMicros || "0")) / 1000000,
    conversions: parseFloat(metrics.conversions || "0"),
    conversionsValue: parseFloat(metrics.conversionsValue || "0"),
  }
}
