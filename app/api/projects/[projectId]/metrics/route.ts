import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import type { ChannelId } from '@/lib/channels'
import { fetchGA4Metrics } from '@/lib/integrations/google/analytics'
import { fetchGSCMetrics, fetchAllGSCMetrics } from '@/lib/integrations/google/search-console'
import { fetchLinkedInMetrics } from '@/lib/integrations/linkedin/organic'
import { fetchFacebookMetrics } from '@/lib/integrations/facebook/organic'
import { fetchInstagramMetrics } from '@/lib/integrations/instagram/organic'
import { fetchYouTubeMetrics } from '@/lib/integrations/youtube/analytics'
import { refreshAccessToken, ensureValidAccessToken } from '@/lib/integrations/auth'

// Returns mock data when no real connector is set up yet.
// Replace with real connector calls once API integrations are built.
function generateMockMetrics(channel: string) {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min
  const randPercent = (min: number, max: number) =>
    parseFloat((Math.random() * (max - min) + min).toFixed(2))

  type MetricEntry = { value: number | string; previous: number | string; unit: string; label: string; invert?: boolean }
  const base: Record<string, Record<string, MetricEntry>> = {
    GOOGLE_ANALYTICS: {
      sessions: { value: rand(2000, 20000), previous: rand(1900, 19000), unit: '', label: 'Sessions' },
      activeUsers: { value: rand(1500, 15000), previous: rand(1400, 14500), unit: '', label: 'Total Users' },
      newUsers: { value: rand(800, 8000), previous: rand(750, 7800), unit: '', label: 'New Users' },
      engagementRate: { value: randPercent(1, 8), previous: randPercent(1, 8), unit: '%', label: 'Engagement Rate' },
      engagedSessions: { value: rand(1000, 12000), previous: rand(900, 11000), unit: '', label: 'Engaged Sessions' },
      keyEvents: { value: rand(50, 400), previous: rand(45, 380), unit: '', label: 'Key Events / Conversions' },
    },
    GOOGLE_SEARCH_CONSOLE: {
      clicks: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Clicks' },
      impressions: { value: rand(10000, 100000), previous: rand(9500, 95000), unit: '', label: 'Impressions' },
      ctr: { value: randPercent(0.5, 5), previous: randPercent(0.5, 5), unit: '%', label: 'CTR', invert: true },
      avgPosition: { value: randPercent(1, 15), previous: randPercent(1, 15), unit: '', label: 'Avg Position', invert: true },
    },
    GOOGLE_ADS: {
      clicks: { value: rand(1000, 5000), previous: rand(900, 4800), unit: '', label: 'Clicks' },
      ctr: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'CTR' },
      impressions: { value: rand(50000, 200000), previous: rand(45000, 190000), unit: '', label: 'Impressions' },
      conversions: { value: rand(50, 300), previous: rand(45, 280), unit: '', label: 'Conversions' },
      costPerConversion: { value: randPercent(5, 50), previous: randPercent(5, 50), unit: '£', label: 'Cost / Conv.' },
      totalCost: { value: rand(2000, 8000), previous: rand(1800, 7500), unit: '£', label: 'Total Spend' },
      avgCpc: { value: randPercent(0.5, 3), previous: randPercent(0.5, 3), unit: '£', label: 'Avg CPC' },
      avgCpm: { value: randPercent(5, 20), previous: randPercent(5, 20), unit: '£', label: 'Avg CPM' },
    },
    INSTAGRAM: {
      followers: { value: rand(1000, 50000), previous: rand(950, 48000), unit: '', label: 'Followers' },
      reach: { value: rand(5000, 30000), previous: rand(4500, 28000), unit: '', label: 'Reach / Views' },
      contentInteractions: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Content Interactions' },
      linkClicks: { value: rand(100, 1500), previous: rand(90, 1400), unit: '', label: 'Link Clicks' },
      profileVisitors: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Profile Visitors' },
      visits: { value: rand(300, 3000), previous: rand(280, 2800), unit: '', label: 'Profile Visits' },
      follows: { value: rand(50, 500), previous: rand(40, 450), unit: '', label: 'New Follows' },
    },
    FACEBOOK: {
      followers: { value: rand(500, 20000), previous: rand(480, 19500), unit: '', label: 'Followers' },
      reach: { value: rand(3000, 20000), previous: rand(2800, 19000), unit: '', label: 'Reach / Views' },
      contentInteractions: { value: rand(300, 3000), previous: rand(280, 2800), unit: '', label: 'Content Interactions' },
      linkClicks: { value: rand(100, 1000), previous: rand(90, 950), unit: '', label: 'Link Clicks' },
      profileVisitors: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Profile Visitors' },
      visits: { value: rand(300, 3000), previous: rand(280, 2800), unit: '', label: 'Page Visits' },
      follows: { value: rand(30, 300), previous: rand(25, 280), unit: '', label: 'New Follows' },
    },
    LINKEDIN_ORGANIC: {
      followers: { value: rand(200, 10000), previous: rand(190, 9800), unit: '', label: 'Followers' },
      searchAppearances: { value: rand(100, 2000), previous: rand(90, 1900), unit: '', label: 'Search Appearances' },
      newFollows: { value: rand(20, 200), previous: rand(18, 180), unit: '', label: 'New Followers' },
      postImpressions: { value: rand(2000, 20000), previous: rand(1900, 19000), unit: '', label: 'Post Impressions' },
      pageVisitors: { value: rand(200, 2000), previous: rand(180, 1900), unit: '', label: 'Page Visitors' },
      reactions: { value: rand(100, 1000), previous: rand(90, 950), unit: '', label: 'Reactions' },
      comments: { value: rand(20, 200), previous: rand(18, 180), unit: '', label: 'Comments' },
      reposts: { value: rand(10, 100), previous: rand(9, 90), unit: '', label: 'Reposts' },
      pageViews: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Page Views' },
      clicks: { value: rand(100, 1000), previous: rand(90, 950), unit: '', label: 'Clicks' },
    },
    META_ADS: {
      spend: { value: rand(1500, 6000), previous: rand(1400, 5800), unit: '£', label: 'Spend' },
      reach: { value: rand(20000, 100000), previous: rand(18000, 95000), unit: '', label: 'Reach' },
      impressions: { value: rand(40000, 180000), previous: rand(38000, 170000), unit: '', label: 'Impressions' },
      linkClicks: { value: rand(500, 3000), previous: rand(450, 2800), unit: '', label: 'Link Clicks' },
      conversions: { value: rand(50, 300), previous: rand(45, 280), unit: '', label: 'Conversions' },
      ctr: { value: randPercent(0.5, 3), previous: randPercent(0.5, 3), unit: '%', label: 'CTR' },
      costPerConv: { value: randPercent(5, 50), previous: randPercent(5, 50), unit: '£', label: 'Cost / Conv.' },
    },
    LINKEDIN_ADS: {
      spend: { value: rand(1000, 5000), previous: rand(900, 4800), unit: '£', label: 'Spend' },
      reach: { value: rand(10000, 50000), previous: rand(9000, 48000), unit: '', label: 'Reach' },
      impressions: { value: rand(20000, 100000), previous: rand(18000, 95000), unit: '', label: 'Impressions' },
      linkClicks: { value: rand(200, 1500), previous: rand(180, 1400), unit: '', label: 'Link Clicks' },
      conversions: { value: rand(20, 150), previous: rand(18, 140), unit: '', label: 'Conversions' },
      ctr: { value: randPercent(0.3, 2), previous: randPercent(0.3, 2), unit: '%', label: 'CTR' },
      costPerConv: { value: randPercent(10, 100), previous: randPercent(10, 100), unit: '£', label: 'Cost / Conv.' },
    },
    SNAPCHAT_ADS: {
      spend: { value: rand(1000, 5000), previous: rand(900, 4800), unit: '£', label: 'Spend' },
      reach: { value: rand(15000, 80000), previous: rand(13000, 76000), unit: '', label: 'Reach' },
      impressions: { value: rand(30000, 150000), previous: rand(28000, 140000), unit: '', label: 'Impressions' },
      linkClicks: { value: rand(300, 2000), previous: rand(280, 1900), unit: '', label: 'Link Clicks' },
      conversions: { value: rand(30, 200), previous: rand(28, 190), unit: '', label: 'Conversions' },
      ctr: { value: randPercent(0.5, 2.5), previous: randPercent(0.5, 2.5), unit: '%', label: 'CTR' },
      costPerConv: { value: randPercent(8, 60), previous: randPercent(8, 60), unit: '£', label: 'Cost / Conv.' },
    },
    TIKTOK_ADS: {
      spend: { value: rand(1000, 5000), previous: rand(900, 4800), unit: '£', label: 'Spend' },
      reach: { value: rand(20000, 100000), previous: rand(18000, 95000), unit: '', label: 'Reach' },
      impressions: { value: rand(50000, 250000), previous: rand(45000, 240000), unit: '', label: 'Impressions' },
      linkClicks: { value: rand(500, 3000), previous: rand(450, 2800), unit: '', label: 'Link Clicks' },
      conversions: { value: rand(50, 300), previous: rand(45, 280), unit: '', label: 'Conversions' },
      ctr: { value: randPercent(0.5, 3), previous: randPercent(0.5, 3), unit: '%', label: 'CTR' },
      costPerConv: { value: randPercent(5, 40), previous: randPercent(5, 40), unit: '£', label: 'Cost / Conv.' },
    },
    MAILCHIMP: {
      sends: { value: rand(10000, 100000), previous: rand(9000, 95000), unit: '', label: 'Emails Sent' },
      opens: { value: rand(2000, 30000), previous: rand(1900, 28000), unit: '', label: 'Opens' },
      openRate: { value: randPercent(15, 35), previous: randPercent(15, 35), unit: '%', label: 'Open Rate' },
      emailClicks: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Email Clicks' },
      clickRate: { value: randPercent(2, 10), previous: randPercent(2, 10), unit: '%', label: 'Click Rate' },
      bounceRate: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'Bounce Rate', invert: true },
      unsubscribeRate: { value: randPercent(0.1, 1), previous: randPercent(0.1, 1), unit: '%', label: 'Unsubscribe Rate', invert: true },
    },
    KLAVIYO: {
      sends: { value: rand(10000, 100000), previous: rand(9000, 95000), unit: '', label: 'Emails Sent' },
      opens: { value: rand(2000, 30000), previous: rand(1900, 28000), unit: '', label: 'Opens' },
      openRate: { value: randPercent(15, 35), previous: randPercent(15, 35), unit: '%', label: 'Open Rate' },
      emailClicks: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Email Clicks' },
      clickRate: { value: randPercent(2, 10), previous: randPercent(2, 10), unit: '%', label: 'Click Rate' },
      bounceRate: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'Bounce Rate', invert: true },
      unsubscribeRate: { value: randPercent(0.1, 1), previous: randPercent(0.1, 1), unit: '%', label: 'Unsubscribe Rate', invert: true },
    },
    HUBSPOT: {
      sends: { value: rand(10000, 100000), previous: rand(9000, 95000), unit: '', label: 'Emails Sent' },
      opens: { value: rand(2000, 30000), previous: rand(1900, 28000), unit: '', label: 'Opens' },
      openRate: { value: randPercent(15, 35), previous: randPercent(15, 35), unit: '%', label: 'Open Rate' },
      emailClicks: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Email Clicks' },
      clickRate: { value: randPercent(2, 10), previous: randPercent(2, 10), unit: '%', label: 'Click Rate' },
      bounceRate: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'Bounce Rate', invert: true },
      unsubscribeRate: { value: randPercent(0.1, 1), previous: randPercent(0.1, 1), unit: '%', label: 'Unsubscribe Rate', invert: true },
    },
    ACTIVE_CAMPAIGN: {
      sends: { value: rand(10000, 100000), previous: rand(9000, 95000), unit: '', label: 'Emails Sent' },
      opens: { value: rand(2000, 30000), previous: rand(1900, 28000), unit: '', label: 'Opens' },
      openRate: { value: randPercent(15, 35), previous: randPercent(15, 35), unit: '%', label: 'Open Rate' },
      emailClicks: { value: rand(500, 5000), previous: rand(450, 4800), unit: '', label: 'Email Clicks' },
      clickRate: { value: randPercent(2, 10), previous: randPercent(2, 10), unit: '%', label: 'Click Rate' },
      bounceRate: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'Bounce Rate', invert: true },
      unsubscribeRate: { value: randPercent(0.1, 1), previous: randPercent(0.1, 1), unit: '%', label: 'Unsubscribe Rate', invert: true },
    },
  } as Record<string, Record<string, MetricEntry>>

  const channelMetrics = base[channel]
  if (!channelMetrics) return []

  return Object.entries(channelMetrics).map(([key, m]) => {
    // For inverted metrics (lower is better), swap current and previous for delta calculation
    const current = typeof m.value === 'number' ? m.value : parseFloat(m.value)
    const previous = typeof m.previous === 'number' ? m.previous : parseFloat(m.previous)

    let delta: number
    if (m.invert) {
      // For inverted metrics, subtract reversed values to show "improvement" as positive trend
      delta = previous > 0 ? ((previous - current) / previous) * 100 : 0
    } else {
      delta = previous > 0 ? ((current - previous) / previous) * 100 : 0
    }

    return {
      key,
      label: m.label,
      value: current,
      previous,
      unit: m.unit,
      deltaPercent: parseFloat(delta.toFixed(1)),
      trend: delta > 1 ? 'up' : delta < -1 ? 'down' : 'stable',
      historicalData: generateMockHistoricalData(current, 30),
    }
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') as ChannelId | null

  // Get date range from query params, default to last 30 days
  const startDate = searchParams.get('startDate') ?? getPastDate(30)
  const endDate = searchParams.get('endDate') ?? getTodayDate()

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { channels: { where: { enabled: true } }, credentials: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (channel) {
    const metrics = await fetchMetricsForChannel(channel, project, startDate, endDate)
    return NextResponse.json({ channel, metrics })
  }

  // Return metrics only for connected channels (channels with credentials)
  const allMetrics: Record<string, ReturnType<typeof generateMockMetrics>> = {}
  // credentialStatus: 'connected' | 'no_credentials' | 'auth_error'
  const credentialStatus: Record<string, string> = {}

  for (const ch of project.channels) {
    const cred = project.credentials.find((c: any) => c.channel === ch.channel && c.accessToken)
    if (!cred) {
      credentialStatus[ch.channel] = 'no_credentials'
      continue
    }
    credentialStatus[ch.channel] = 'connected'
    const result = await fetchMetricsForChannel(ch.channel as ChannelId, project, startDate, endDate)
    allMetrics[ch.channel] = result
    // If we got credentials but empty result, mark as auth_error so UI can prompt reconnect
    if (!result || result.length === 0) {
      credentialStatus[ch.channel] = 'auth_error'
    }
  }

  return NextResponse.json({ metrics: allMetrics, credentialStatus })
}

/**
 * Fetch metrics for a single channel
 * Tries real API data first, falls back to mock data
 */
async function fetchMetricsForChannel(
  channel: ChannelId,
  project: any,
  startDate: string = getPastDate(30),
  endDate: string = getTodayDate()
): Promise<ReturnType<typeof generateMockMetrics> | any> {
  try {
    // Find credentials for this channel
    const credential = project.credentials.find((c: any) => c.channel === channel)

    if (!credential?.accessToken) {
      // No credentials connected, return empty
      return []
    }

    // Use valid access token (refreshed if needed)
    const accessToken = await ensureValidAccessToken(credential)

    if (!accessToken) {
      return []
    }

    // Fetch real data based on channel type
    if (channel === 'GOOGLE_ANALYTICS') {
      // Property ID should be stored in credential.accountId
      if (!credential.accountId || credential.accountId === 'pending-property-selection') {
        return []
      }

      const { current, previous } = await fetchGA4Metrics({
        accessToken,
        propertyId: credential.accountId,
        startDate,
        endDate,
      })

      return [
        {
          key: 'sessions',
          label: 'Sessions',
          value: Math.round(current.sessions),
          previous: Math.round(previous.sessions),
          unit: '',
          deltaPercent: calculateDelta(current.sessions, previous.sessions),
          trend: calculateTrend(current.sessions, previous.sessions),
          historicalData: undefined,
        },
        {
          key: 'activeUsers',
          label: 'Active Users',
          value: Math.round(current.activeUsers),
          previous: Math.round(previous.activeUsers),
          unit: '',
          deltaPercent: calculateDelta(current.activeUsers, previous.activeUsers),
          trend: calculateTrend(current.activeUsers, previous.activeUsers),
          historicalData: undefined,
        },
        {
          key: 'newUsers',
          label: 'New Users',
          value: Math.round(current.newUsers),
          previous: Math.round(previous.newUsers),
          unit: '',
          deltaPercent: calculateDelta(current.newUsers, previous.newUsers),
          trend: calculateTrend(current.newUsers, previous.newUsers),
          historicalData: undefined,
        },
        {
          key: 'bounceRate',
          label: 'Bounce Rate',
          value: parseFloat(current.bounceRate.toFixed(3)),
          previous: parseFloat(previous.bounceRate.toFixed(3)),
          unit: '%',
          deltaPercent: calculateDelta(previous.bounceRate, current.bounceRate), // Inverted: lower is better
          trend: calculateTrend(previous.bounceRate, current.bounceRate), // Inverted
          historicalData: undefined,
        },
        {
          key: 'screenPageViews',
          label: 'Page Views',
          value: Math.round(current.screenPageViews),
          previous: Math.round(previous.screenPageViews),
          unit: '',
          deltaPercent: calculateDelta(current.screenPageViews, previous.screenPageViews),
          trend: calculateTrend(current.screenPageViews, previous.screenPageViews),
          historicalData: undefined,
        },
      ]
    }

    // Fetch Google Search Console data
    if (channel === 'GOOGLE_SEARCH_CONSOLE') {
      const gscData = credential.accountId && credential.accountId !== 'pending-site-selection'
        ? await fetchGSCMetrics({ accessToken, siteUrl: credential.accountId, startDate, endDate })
        : await fetchAllGSCMetrics(accessToken, startDate, endDate)

      if (!gscData) return []

      return [
        {
          key: 'clicks',
          label: 'Clicks',
          value: gscData.clicks,
          previous: Math.round(gscData.clicks * 0.9), // Estimate previous for demo
          unit: '',
          deltaPercent: calculateDelta(gscData.clicks, Math.round(gscData.clicks * 0.9)),
          trend: calculateTrend(gscData.clicks, Math.round(gscData.clicks * 0.9)),
        },
        {
          key: 'impressions',
          label: 'Impressions',
          value: gscData.impressions,
          previous: Math.round(gscData.impressions * 0.95),
          unit: '',
          deltaPercent: calculateDelta(gscData.impressions, Math.round(gscData.impressions * 0.95)),
          trend: calculateTrend(gscData.impressions, Math.round(gscData.impressions * 0.95)),
        },
        {
          key: 'ctr',
          label: 'CTR',
          value: parseFloat(gscData.ctr.toFixed(2)),
          previous: parseFloat((gscData.ctr * 0.95).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(parseFloat((gscData.ctr * 1.05).toFixed(2)), parseFloat(gscData.ctr.toFixed(2))), // Inverted for CTR
          trend: calculateTrend(parseFloat((gscData.ctr * 1.05).toFixed(2)), parseFloat(gscData.ctr.toFixed(2))),
        },
        {
          key: 'avgPosition',
          label: 'Avg Position',
          value: parseFloat(gscData.position.toFixed(1)),
          previous: parseFloat((gscData.position * 1.05).toFixed(1)),
          unit: '',
          deltaPercent: calculateDelta(parseFloat((gscData.position * 1.05).toFixed(1)), parseFloat(gscData.position.toFixed(1))), // Inverted for position (lower is better)
          trend: calculateTrend(parseFloat((gscData.position * 1.05).toFixed(1)), parseFloat(gscData.position.toFixed(1))),
        },
      ]
    }

    // Fetch LinkedIn Organic data
    if (channel === 'LINKEDIN_ORGANIC') {
      if (!credential.accountId || credential.accountId === 'pending-org-selection') {
        return [] // Return empty array instead of mock data
      }

      const linkedinData = await fetchLinkedInMetrics({
        accessToken,
        organizationId: credential.accountId,
      })

      return [
        {
          key: 'followers',
          label: 'Followers',
          value: linkedinData.followers,
          previous: Math.round(linkedinData.followers * 0.98),
          unit: '',
          deltaPercent: calculateDelta(linkedinData.followers, Math.round(linkedinData.followers * 0.98)),
          trend: calculateTrend(linkedinData.followers, Math.round(linkedinData.followers * 0.98)),
        },
        {
          key: 'impressions',
          label: 'Impressions',
          value: linkedinData.impressions,
          previous: Math.round(linkedinData.impressions * 0.92),
          unit: '',
          deltaPercent: calculateDelta(linkedinData.impressions, Math.round(linkedinData.impressions * 0.92)),
          trend: calculateTrend(linkedinData.impressions, Math.round(linkedinData.impressions * 0.92)),
        },
        {
          key: 'clicks',
          label: 'Clicks',
          value: linkedinData.clicks,
          previous: Math.round(linkedinData.clicks * 0.88),
          unit: '',
          deltaPercent: calculateDelta(linkedinData.clicks, Math.round(linkedinData.clicks * 0.88)),
          trend: calculateTrend(linkedinData.clicks, Math.round(linkedinData.clicks * 0.88)),
        },
        {
          key: 'engagementRate',
          label: 'Engagement Rate',
          value: parseFloat(linkedinData.engagementRate.toFixed(2)),
          previous: parseFloat((linkedinData.engagementRate * 0.9).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(parseFloat(linkedinData.engagementRate.toFixed(2)), parseFloat((linkedinData.engagementRate * 0.9).toFixed(2))),
          trend: calculateTrend(parseFloat(linkedinData.engagementRate.toFixed(2)), parseFloat((linkedinData.engagementRate * 0.9).toFixed(2))),
        },
      ]
    }

    // Fetch Facebook Organic data
    if (channel === 'FACEBOOK') {
      if (!credential.accountId || credential.accountId === 'pending-page-selection') {
        return [] // Return empty array instead of mock data
      }

      const facebookData = await fetchFacebookMetrics({
        accessToken,
        pageId: credential.accountId,
      })

      return [
        {
          key: 'followers',
          label: 'Page Likes',
          value: facebookData.followers,
          previous: Math.round(facebookData.followers * 0.98),
          unit: '',
          deltaPercent: calculateDelta(facebookData.followers, Math.round(facebookData.followers * 0.98)),
          trend: calculateTrend(facebookData.followers, Math.round(facebookData.followers * 0.98)),
        },
        {
          key: 'reach',
          label: 'Reach',
          value: facebookData.reach,
          previous: Math.round(facebookData.reach * 0.92),
          unit: '',
          deltaPercent: calculateDelta(facebookData.reach, Math.round(facebookData.reach * 0.92)),
          trend: calculateTrend(facebookData.reach, Math.round(facebookData.reach * 0.92)),
        },
        {
          key: 'engagement',
          label: 'Engagement',
          value: facebookData.engagement,
          previous: Math.round(facebookData.engagement * 0.88),
          unit: '',
          deltaPercent: calculateDelta(facebookData.engagement, Math.round(facebookData.engagement * 0.88)),
          trend: calculateTrend(facebookData.engagement, Math.round(facebookData.engagement * 0.88)),
        },
        {
          key: 'engagementRate',
          label: 'Engagement Rate',
          value: parseFloat(facebookData.engagementRate.toFixed(2)),
          previous: parseFloat((facebookData.engagementRate * 0.9).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(parseFloat(facebookData.engagementRate.toFixed(2)), parseFloat((facebookData.engagementRate * 0.9).toFixed(2))),
          trend: calculateTrend(parseFloat(facebookData.engagementRate.toFixed(2)), parseFloat((facebookData.engagementRate * 0.9).toFixed(2))),
        },
      ]
    }

    // Fetch Instagram Organic data
    if (channel === 'INSTAGRAM') {
      if (!credential.accountId || credential.accountId === 'pending-page-selection') {
        return [] // Return empty array instead of mock data
      }

      const instagramData = await fetchInstagramMetrics({
        accessToken,
        businessAccountId: credential.accountId,
      })

      return [
        {
          key: 'followers',
          label: 'Followers',
          value: instagramData.followers,
          previous: Math.round(instagramData.followers * 0.98),
          unit: '',
          deltaPercent: calculateDelta(instagramData.followers, Math.round(instagramData.followers * 0.98)),
          trend: calculateTrend(instagramData.followers, Math.round(instagramData.followers * 0.98)),
        },
        {
          key: 'reach',
          label: 'Reach',
          value: instagramData.reach,
          previous: Math.round(instagramData.reach * 0.92),
          unit: '',
          deltaPercent: calculateDelta(instagramData.reach, Math.round(instagramData.reach * 0.92)),
          trend: calculateTrend(instagramData.reach, Math.round(instagramData.reach * 0.92)),
        },
        {
          key: 'impressions',
          label: 'Impressions',
          value: instagramData.impressions,
          previous: Math.round(instagramData.impressions * 0.88),
          unit: '',
          deltaPercent: calculateDelta(instagramData.impressions, Math.round(instagramData.impressions * 0.88)),
          trend: calculateTrend(instagramData.impressions, Math.round(instagramData.impressions * 0.88)),
        },
        {
          key: 'engagement',
          label: 'Engagement',
          value: instagramData.engagement,
          previous: Math.round(instagramData.engagement * 0.85),
          unit: '',
          deltaPercent: calculateDelta(instagramData.engagement, Math.round(instagramData.engagement * 0.85)),
          trend: calculateTrend(instagramData.engagement, Math.round(instagramData.engagement * 0.85)),
        },
        {
          key: 'engagementRate',
          label: 'Engagement Rate',
          value: parseFloat(instagramData.engagementRate.toFixed(2)),
          previous: parseFloat((instagramData.engagementRate * 0.9).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(parseFloat(instagramData.engagementRate.toFixed(2)), parseFloat((instagramData.engagementRate * 0.9).toFixed(2))),
          trend: calculateTrend(parseFloat(instagramData.engagementRate.toFixed(2)), parseFloat((instagramData.engagementRate * 0.9).toFixed(2))),
        },
      ]
    }

    // Fetch YouTube data
    if (channel === 'YOUTUBE') {
      if (!credential.accountId || credential.accountId === 'pending-channel-selection') {
        return [] // Return empty array instead of mock data
      }

      const youtubeData = await fetchYouTubeMetrics({
        accessToken,
        channelId: credential.accountId,
        startDate,
        endDate,
      })

      return [
        {
          key: 'views',
          label: 'Views',
          value: youtubeData.views,
          previous: Math.round(youtubeData.views * 0.92),
          unit: '',
          deltaPercent: calculateDelta(youtubeData.views, Math.round(youtubeData.views * 0.92)),
          trend: calculateTrend(youtubeData.views, Math.round(youtubeData.views * 0.92)),
        },
        {
          key: 'watchTime',
          label: 'Watch Time (minutes)',
          value: youtubeData.watchTime,
          previous: Math.round(youtubeData.watchTime * 0.88),
          unit: '',
          deltaPercent: calculateDelta(youtubeData.watchTime, Math.round(youtubeData.watchTime * 0.88)),
          trend: calculateTrend(youtubeData.watchTime, Math.round(youtubeData.watchTime * 0.88)),
        },
        {
          key: 'subscribers',
          label: 'Subscribers',
          value: youtubeData.subscribers,
          previous: Math.round(youtubeData.subscribers * 0.99),
          unit: '',
          deltaPercent: calculateDelta(youtubeData.subscribers, Math.round(youtubeData.subscribers * 0.99)),
          trend: calculateTrend(youtubeData.subscribers, Math.round(youtubeData.subscribers * 0.99)),
        },
        {
          key: 'engagement',
          label: 'Engagement',
          value: youtubeData.engagement,
          previous: Math.round(youtubeData.engagement * 0.85),
          unit: '',
          deltaPercent: calculateDelta(youtubeData.engagement, Math.round(youtubeData.engagement * 0.85)),
          trend: calculateTrend(youtubeData.engagement, Math.round(youtubeData.engagement * 0.85)),
        },
        {
          key: 'engagementRate',
          label: 'Engagement Rate',
          value: parseFloat(youtubeData.engagementRate.toFixed(2)),
          previous: parseFloat((youtubeData.engagementRate * 0.9).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(parseFloat(youtubeData.engagementRate.toFixed(2)), parseFloat((youtubeData.engagementRate * 0.9).toFixed(2))),
          trend: calculateTrend(parseFloat(youtubeData.engagementRate.toFixed(2)), parseFloat((youtubeData.engagementRate * 0.9).toFixed(2))),
        },
      ]
    }

    // For other channels, return empty (no integrations built yet)
    return []
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`Error fetching metrics for ${channel}: ${msg}`)
    return []
  }
}

function getPastDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return 0
  const delta = ((current - previous) / Math.abs(previous)) * 100
  return parseFloat(delta.toFixed(1))
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const delta = calculateDelta(current, previous)
  return delta > 1 ? 'up' : delta < -1 ? 'down' : 'stable'
}

/**
 * Generate mock historical time series for forecasting
 */
function generateMockHistoricalData(baseValue: number, days: number = 30) {
  const data = []
  const today = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // Add some realistic variation
    const variance = (Math.random() - 0.5) * 0.2 * baseValue
    const trend = (days - i) * 0.01 * baseValue
    const value = Math.max(0, baseValue + variance + trend)
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    })
  }
  return data
}
