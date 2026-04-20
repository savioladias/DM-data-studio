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

const ADS_API_VERSION = 'v23'

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

/** Helper: run a GAQL query against a customer */
async function runAdsQuery(
  accessToken: string,
  customerId: string,
  query: string
): Promise<any[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const response = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: JSON.stringify({ query }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Ads API error: ${error}`)
  }

  const data = await response.json()
  return data.results ?? []
}

export interface GoogleAdsAggregateMetrics {
  impressions: number
  clicks: number
  spend: number          // in currency units (not micros)
  conversions: number
  conversionsValue: number
  ctr: number            // 0-100 percentage
  avgCpc: number         // in currency units
  interactions: number
  interactionRate: number // 0-100 percentage
  conversionRate: number  // 0-100 percentage
  costPerConversion: number
}

/**
 * Fetch aggregated account-level metrics
 */
export async function fetchGoogleAdsMetrics(
  config: GoogleAdsMetricsConfig
): Promise<GoogleAdsAggregateMetrics> {
  const { accessToken, customerId, startDate, endDate } = config

  const results = await runAdsQuery(accessToken, customerId, `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.interactions,
      metrics.interaction_rate,
      metrics.conversions_from_interactions_rate,
      metrics.cost_per_conversion
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `)

  // Sum across all rows (the customer resource returns one row per date by default)
  let impressions = 0, clicks = 0, costMicros = 0, conversions = 0,
    conversionsValue = 0, interactions = 0, ctrSum = 0, avgCpcSum = 0,
    interactionRateSum = 0, convRateSum = 0, costPerConvSum = 0, rowCount = 0

  for (const row of results) {
    const m = row.metrics ?? {}
    impressions += parseInt(m.impressions ?? '0')
    clicks += parseInt(m.clicks ?? '0')
    costMicros += parseInt(m.costMicros ?? '0')
    conversions += parseFloat(m.conversions ?? '0')
    conversionsValue += parseFloat(m.conversionsValue ?? '0')
    interactions += parseInt(m.interactions ?? '0')
    ctrSum += parseFloat(m.ctr ?? '0')
    avgCpcSum += parseInt(m.averageCpc ?? '0')
    interactionRateSum += parseFloat(m.interactionRate ?? '0')
    convRateSum += parseFloat(m.conversionsFromInteractionsRate ?? '0')
    costPerConvSum += parseInt(m.costPerConversion ?? '0')
    rowCount++
  }

  const spend = costMicros / 1_000_000
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const avgCpc = clicks > 0 ? spend / clicks : 0
  const interactionRate = interactions > 0 && impressions > 0 ? (interactions / impressions) * 100 : 0
  const conversionRate = interactions > 0 ? (conversions / interactions) * 100 : 0
  const costPerConversion = conversions > 0 ? spend / conversions : 0

  return {
    impressions,
    clicks,
    spend,
    conversions,
    conversionsValue,
    ctr: parseFloat(ctr.toFixed(2)),
    avgCpc: parseFloat(avgCpc.toFixed(2)),
    interactions,
    interactionRate: parseFloat(interactionRate.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    costPerConversion: parseFloat(costPerConversion.toFixed(2)),
  }
}

export interface GoogleAdsDemographicRow {
  dimension: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
}

/**
 * Fetch age range demographics breakdown
 */
export async function fetchGoogleAdsAgeRanges(
  config: GoogleAdsMetricsConfig
): Promise<GoogleAdsDemographicRow[]> {
  try {
    const results = await runAdsQuery(config.accessToken, config.customerId, `
      SELECT
        ad_group_criterion.age_range.type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr
      FROM age_range_view
      WHERE segments.date BETWEEN '${config.startDate}' AND '${config.endDate}'
        AND metrics.impressions > 0
      ORDER BY metrics.clicks DESC
    `)

    const AGE_LABELS: Record<string, string> = {
      AGE_RANGE_18_24: '18–24',
      AGE_RANGE_25_34: '25–34',
      AGE_RANGE_35_44: '35–44',
      AGE_RANGE_45_54: '45–54',
      AGE_RANGE_55_64: '55–64',
      AGE_RANGE_65_UP: '65+',
      UNDETERMINED: 'Unknown',
    }

    const aggregated: Record<string, GoogleAdsDemographicRow> = {}

    for (const row of results) {
      const type = row.adGroupCriterion?.ageRange?.type ?? 'UNDETERMINED'
      const label = AGE_LABELS[type] ?? type
      const m = row.metrics ?? {}
      if (!aggregated[label]) {
        aggregated[label] = { dimension: label, impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0 }
      }
      aggregated[label].impressions += parseInt(m.impressions ?? '0')
      aggregated[label].clicks += parseInt(m.clicks ?? '0')
      aggregated[label].conversions += parseFloat(m.conversions ?? '0')
      aggregated[label].spend += parseInt(m.costMicros ?? '0') / 1_000_000
    }

    return Object.values(aggregated)
      .map(r => ({
        ...r,
        spend: parseFloat(r.spend.toFixed(2)),
        ctr: r.impressions > 0 ? parseFloat(((r.clicks / r.impressions) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
  } catch {
    return []
  }
}

/**
 * Fetch gender demographics breakdown
 */
export async function fetchGoogleAdsGenders(
  config: GoogleAdsMetricsConfig
): Promise<GoogleAdsDemographicRow[]> {
  try {
    const results = await runAdsQuery(config.accessToken, config.customerId, `
      SELECT
        ad_group_criterion.gender.type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM gender_view
      WHERE segments.date BETWEEN '${config.startDate}' AND '${config.endDate}'
        AND metrics.impressions > 0
      ORDER BY metrics.clicks DESC
    `)

    const GENDER_LABELS: Record<string, string> = {
      MALE: 'Male',
      FEMALE: 'Female',
      UNDETERMINED: 'Unknown',
    }

    const aggregated: Record<string, GoogleAdsDemographicRow> = {}

    for (const row of results) {
      const type = row.adGroupCriterion?.gender?.type ?? 'UNDETERMINED'
      const label = GENDER_LABELS[type] ?? type
      const m = row.metrics ?? {}
      if (!aggregated[label]) {
        aggregated[label] = { dimension: label, impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0 }
      }
      aggregated[label].impressions += parseInt(m.impressions ?? '0')
      aggregated[label].clicks += parseInt(m.clicks ?? '0')
      aggregated[label].conversions += parseFloat(m.conversions ?? '0')
      aggregated[label].spend += parseInt(m.costMicros ?? '0') / 1_000_000
    }

    return Object.values(aggregated)
      .map(r => ({
        ...r,
        spend: parseFloat(r.spend.toFixed(2)),
        ctr: r.impressions > 0 ? parseFloat(((r.clicks / r.impressions) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
  } catch {
    return []
  }
}

export interface GoogleAdsNetworkRow {
  network: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
}

/**
 * Fetch network/channel breakdown (Search, Display, YouTube, etc.)
 */
export async function fetchGoogleAdsNetworks(
  config: GoogleAdsMetricsConfig
): Promise<GoogleAdsNetworkRow[]> {
  try {
    const results = await runAdsQuery(config.accessToken, config.customerId, `
      SELECT
        segments.ad_network_type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${config.startDate}' AND '${config.endDate}'
        AND metrics.impressions > 0
    `)

    const NETWORK_LABELS: Record<string, string> = {
      SEARCH: 'Search',
      SEARCH_PARTNERS: 'Search Partners',
      CONTENT: 'Display',
      MIXED: 'Cross-network',
      YOUTUBE_WATCH: 'YouTube',
      YOUTUBE_SEARCH: 'YouTube Search',
      UNKNOWN: 'Unknown',
    }

    const aggregated: Record<string, GoogleAdsNetworkRow> = {}

    for (const row of results) {
      const type = row.segments?.adNetworkType ?? 'UNKNOWN'
      const label = NETWORK_LABELS[type] ?? type
      const m = row.metrics ?? {}
      if (!aggregated[label]) {
        aggregated[label] = { network: label, impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0 }
      }
      aggregated[label].impressions += parseInt(m.impressions ?? '0')
      aggregated[label].clicks += parseInt(m.clicks ?? '0')
      aggregated[label].conversions += parseFloat(m.conversions ?? '0')
      aggregated[label].spend += parseInt(m.costMicros ?? '0') / 1_000_000
    }

    return Object.values(aggregated)
      .map(r => ({
        ...r,
        spend: parseFloat(r.spend.toFixed(2)),
        ctr: r.impressions > 0 ? parseFloat(((r.clicks / r.impressions) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
  } catch {
    return []
  }
}

export interface GoogleAdsKeywordRow {
  keyword: string
  matchType: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
}

/**
 * Fetch top keywords by clicks
 */
export async function fetchGoogleAdsKeywords(
  config: GoogleAdsMetricsConfig,
  limit: number = 25
): Promise<GoogleAdsKeywordRow[]> {
  try {
    const results = await runAdsQuery(config.accessToken, config.customerId, `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr
      FROM keyword_view
      WHERE segments.date BETWEEN '${config.startDate}' AND '${config.endDate}'
        AND metrics.impressions > 0
      ORDER BY metrics.clicks DESC
      LIMIT ${limit}
    `)

    const MATCH_LABELS: Record<string, string> = {
      EXACT: 'Exact',
      PHRASE: 'Phrase',
      BROAD: 'Broad',
    }

    return results.map(row => {
      const kw = row.adGroupCriterion?.keyword ?? {}
      const m = row.metrics ?? {}
      const impressions = parseInt(m.impressions ?? '0')
      const clicks = parseInt(m.clicks ?? '0')
      return {
        keyword: kw.text ?? '—',
        matchType: MATCH_LABELS[kw.matchType] ?? kw.matchType ?? '—',
        impressions,
        clicks,
        conversions: parseFloat(parseFloat(m.conversions ?? '0').toFixed(1)),
        spend: parseFloat((parseInt(m.costMicros ?? '0') / 1_000_000).toFixed(2)),
        ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
      }
    })
  } catch {
    return []
  }
}
