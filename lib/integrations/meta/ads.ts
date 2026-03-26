/**
 * Meta Ads API client
 * Fetches businesses (portfolios), ad accounts, and performance metrics
 */

const GRAPH_API_VERSION = 'v18.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface MetaAdsBusiness {
  id: string
  name: string
}

export interface MetaAdsAccount {
  id: string        // "act_XXXXXXXXX"
  accountId: string // numeric only "XXXXXXXXX"
  name: string
  status: number    // 1 = ACTIVE
  currency: string
  businessId?: string
  businessName?: string
}

export interface MetaAdsCampaignRow {
  id: string
  name: string
  status: string
  objective: string
  dailyBudget: number
  lifetimeBudget: number
  impressions: number
  reach: number
  spend: number
  results: number
  costPerResult: number
}

export interface MetaAdsAdSetRow {
  id: string
  name: string
  campaignId: string
  campaignName: string
  impressions: number
  reach: number
  spend: number
  results: number
  costPerResult: number
}

export interface MetaAdsAdRow {
  id: string
  name: string
  adSetId: string
  adSetName: string
  impressions: number
  reach: number
  spend: number
  results: number
  costPerResult: number
}

/**
 * Extract "results" from Meta actions array.
 * Prioritises primary conversion actions; falls back to total actions.
 */
function extractResults(
  actions?: Array<{ action_type: string; value: string }>
): number {
  if (!actions?.length) return 0

  const primaryPatterns = [
    'offsite_conversion.fb_pixel_purchase',
    'offsite_conversion.fb_pixel_lead',
    'offsite_conversion.fb_pixel_complete_registration',
    'omni_purchase',
    'omni_complete_registration',
    'omni_activated_checkout',
    'lead',
    'purchase',
  ]

  const primary = actions.filter(a =>
    primaryPatterns.some(p => a.action_type === p || a.action_type.startsWith(p))
  )

  const source = primary.length > 0 ? primary : actions
  return source.reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0)
}

// ─── Businesses ──────────────────────────────────────────────────────────────

/**
 * Fetch all businesses (portfolios) accessible to the user.
 */
export async function fetchMetaAdsBusinesses(
  accessToken: string
): Promise<MetaAdsBusiness[]> {
  const url = `${GRAPH_BASE}/me/businesses?fields=id,name&limit=200&access_token=${accessToken}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta businesses fetch failed: ${err.substring(0, 300)}`)
  }
  const data = await res.json()
  return (data.data || []).map((b: any) => ({ id: b.id, name: b.name }))
}

// ─── Ad Accounts ─────────────────────────────────────────────────────────────

/**
 * Fetch owned + client ad accounts for a specific business portfolio.
 */
export async function fetchMetaAdsAccountsForBusiness(
  accessToken: string,
  businessId: string
): Promise<MetaAdsAccount[]> {
  const fields = 'id,name,account_id,account_status,currency'

  const [ownedRes, clientRes] = await Promise.allSettled([
    fetch(
      `${GRAPH_BASE}/${businessId}/owned_ad_accounts?fields=${fields}&limit=200&access_token=${accessToken}`
    ).then(r => r.json()),
    fetch(
      `${GRAPH_BASE}/${businessId}/client_ad_accounts?fields=${fields}&limit=200&access_token=${accessToken}`
    ).then(r => r.json()),
  ])

  const accounts: MetaAdsAccount[] = []
  const seen = new Set<string>()

  for (const result of [ownedRes, clientRes]) {
    if (result.status === 'fulfilled' && Array.isArray(result.value?.data)) {
      for (const a of result.value.data) {
        if (!seen.has(a.id)) {
          seen.add(a.id)
          accounts.push({
            id: a.id,
            accountId: a.account_id,
            name: a.name,
            status: a.account_status ?? 1,
            currency: a.currency ?? 'USD',
            businessId,
          })
        }
      }
    }
  }

  return accounts
}

/**
 * Fetch all businesses and their ad accounts in one call (used by the picker).
 */
export async function fetchMetaAdsPortfolios(accessToken: string): Promise<{
  businesses: MetaAdsBusiness[]
  accountsByBusiness: Record<string, MetaAdsAccount[]>
}> {
  const businesses = await fetchMetaAdsBusinesses(accessToken)

  const entries = await Promise.all(
    businesses.map(async biz => {
      try {
        const accounts = await fetchMetaAdsAccountsForBusiness(accessToken, biz.id)
        return [biz.id, accounts] as const
      } catch {
        return [biz.id, []] as const
      }
    })
  )

  const accountsByBusiness = Object.fromEntries(entries)
  return { businesses, accountsByBusiness }
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

function actId(accountId: string): string {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`
}

function timeRange(startDate: string, endDate: string): string {
  return encodeURIComponent(JSON.stringify({ since: startDate, until: endDate }))
}

/**
 * Fetch account-level aggregate metrics.
 */
export async function fetchMetaAdsAccountMetrics(config: {
  accessToken: string
  accountId: string
  startDate: string
  endDate: string
}) {
  const { accessToken, accountId, startDate, endDate } = config
  const id = actId(accountId)
  const tr = timeRange(startDate, endDate)

  const url = `${GRAPH_BASE}/${id}/insights?fields=impressions,reach,spend,actions&time_range=${tr}&access_token=${accessToken}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta Ads account insights failed: ${err.substring(0, 300)}`)
  }

  const data = await res.json()
  const row = data.data?.[0] ?? {}

  const spend = parseFloat(row.spend ?? '0')
  const results = extractResults(row.actions)

  return {
    impressions: parseInt(row.impressions ?? '0', 10),
    reach: parseInt(row.reach ?? '0', 10),
    spend,
    results,
    costPerResult: results > 0 ? parseFloat((spend / results).toFixed(2)) : 0,
  }
}

/**
 * Fetch campaign-level insights + budgets.
 */
export async function fetchMetaAdsCampaigns(config: {
  accessToken: string
  accountId: string
  startDate: string
  endDate: string
}): Promise<MetaAdsCampaignRow[]> {
  const { accessToken, accountId, startDate, endDate } = config
  const id = actId(accountId)
  const tr = timeRange(startDate, endDate)

  const insightFields = 'campaign_id,campaign_name,impressions,reach,spend,actions,objective'
  const budgetFields = 'id,name,daily_budget,lifetime_budget,effective_status,objective'

  const [insightsData, budgetsData] = await Promise.all([
    fetch(
      `${GRAPH_BASE}/${id}/insights?level=campaign&fields=${insightFields}&time_range=${tr}&limit=100&access_token=${accessToken}`
    ).then(r => r.json()),
    fetch(
      `${GRAPH_BASE}/${id}/campaigns?fields=${budgetFields}&limit=100&access_token=${accessToken}`
    ).then(r => r.json()),
  ])

  // Build budget map: campaign id → budget info
  const budgetMap = new Map<string, { daily: number; lifetime: number; status: string }>()
  for (const c of budgetsData.data ?? []) {
    budgetMap.set(c.id, {
      daily: c.daily_budget ? parseInt(c.daily_budget, 10) / 100 : 0,
      lifetime: c.lifetime_budget ? parseInt(c.lifetime_budget, 10) / 100 : 0,
      status: c.effective_status ?? 'UNKNOWN',
    })
  }

  return (insightsData.data ?? []).map((row: any) => {
    const budget = budgetMap.get(row.campaign_id) ?? { daily: 0, lifetime: 0, status: 'UNKNOWN' }
    const spend = parseFloat(row.spend ?? '0')
    const results = extractResults(row.actions)
    return {
      id: row.campaign_id,
      name: row.campaign_name,
      status: budget.status,
      objective: row.objective ?? '',
      dailyBudget: budget.daily,
      lifetimeBudget: budget.lifetime,
      impressions: parseInt(row.impressions ?? '0', 10),
      reach: parseInt(row.reach ?? '0', 10),
      spend,
      results,
      costPerResult: results > 0 ? parseFloat((spend / results).toFixed(2)) : 0,
    }
  })
}

/**
 * Fetch ad set-level insights.
 */
export async function fetchMetaAdsAdSets(config: {
  accessToken: string
  accountId: string
  startDate: string
  endDate: string
}): Promise<MetaAdsAdSetRow[]> {
  const { accessToken, accountId, startDate, endDate } = config
  const id = actId(accountId)
  const tr = timeRange(startDate, endDate)

  const fields = 'adset_id,adset_name,campaign_id,campaign_name,impressions,reach,spend,actions'
  const url = `${GRAPH_BASE}/${id}/insights?level=adset&fields=${fields}&time_range=${tr}&limit=100&access_token=${accessToken}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta Ads adset insights failed: ${err.substring(0, 300)}`)
  }
  const data = await res.json()

  return (data.data ?? []).map((row: any) => {
    const spend = parseFloat(row.spend ?? '0')
    const results = extractResults(row.actions)
    return {
      id: row.adset_id,
      name: row.adset_name,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      impressions: parseInt(row.impressions ?? '0', 10),
      reach: parseInt(row.reach ?? '0', 10),
      spend,
      results,
      costPerResult: results > 0 ? parseFloat((spend / results).toFixed(2)) : 0,
    }
  })
}

/**
 * Fetch ad-level insights.
 */
export async function fetchMetaAdsAds(config: {
  accessToken: string
  accountId: string
  startDate: string
  endDate: string
}): Promise<MetaAdsAdRow[]> {
  const { accessToken, accountId, startDate, endDate } = config
  const id = actId(accountId)
  const tr = timeRange(startDate, endDate)

  const fields = 'ad_id,ad_name,adset_id,adset_name,impressions,reach,spend,actions'
  const url = `${GRAPH_BASE}/${id}/insights?level=ad&fields=${fields}&time_range=${tr}&limit=100&access_token=${accessToken}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta Ads ad insights failed: ${err.substring(0, 300)}`)
  }
  const data = await res.json()

  return (data.data ?? []).map((row: any) => {
    const spend = parseFloat(row.spend ?? '0')
    const results = extractResults(row.actions)
    return {
      id: row.ad_id,
      name: row.ad_name,
      adSetId: row.adset_id,
      adSetName: row.adset_name,
      impressions: parseInt(row.impressions ?? '0', 10),
      reach: parseInt(row.reach ?? '0', 10),
      spend,
      results,
      costPerResult: results > 0 ? parseFloat((spend / results).toFixed(2)) : 0,
    }
  })
}
