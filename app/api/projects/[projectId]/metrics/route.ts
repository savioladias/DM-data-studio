import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import type { ChannelId } from '@/lib/channels'
import { fetchGA4Metrics, fetchGA4RealtimeMetrics } from '@/lib/integrations/google/analytics'
import { fetchGSCMetrics, fetchAllGSCMetrics, fetchGSCDimensional, fetchGSCTrafficSources } from '@/lib/integrations/google/search-console'
import { fetchGoogleAdsMetrics, fetchGoogleAdsAgeRanges, fetchGoogleAdsGenders, fetchGoogleAdsNetworks, fetchGoogleAdsKeywords } from '@/lib/integrations/google/ads'
import { fetchLinkedInMetrics } from '@/lib/integrations/linkedin/organic'
import { fetchFacebookMetrics } from '@/lib/integrations/facebook/organic'
import { fetchInstagramMetrics } from '@/lib/integrations/instagram/organic'
import { fetchYouTubeMetrics } from '@/lib/integrations/youtube/analytics'
import { fetchMetaAdsAccountMetrics, fetchMetaAdsCampaigns, fetchMetaAdsAdSets, fetchMetaAdsAds } from '@/lib/integrations/meta/ads'
import { ensureValidAccessToken } from '@/lib/integrations/auth'

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
      impressions: { value: rand(50000, 200000), previous: rand(45000, 190000), unit: '', label: 'Impressions' },
      conversions: { value: rand(50, 300), previous: rand(45, 280), unit: '', label: 'Conversions' },
      cost: { value: rand(2000, 8000), previous: rand(1800, 7500), unit: '£', label: 'Cost' },
      ctr: { value: randPercent(1, 5), previous: randPercent(1, 5), unit: '%', label: 'Click-Through Rate (CTR)' },
      avgCpc: { value: randPercent(0.5, 3), previous: randPercent(0.5, 3), unit: '£', label: 'Cost per Click (CPC)' },
      interactions: { value: rand(1000, 5000), previous: rand(900, 4800), unit: '', label: 'Interactions' },
      interactionRate: { value: randPercent(1, 10), previous: randPercent(1, 10), unit: '%', label: 'Interaction Rate' },
      conversionRate: { value: randPercent(1, 8), previous: randPercent(1, 8), unit: '%', label: 'Conversion Rate' },
      costPerConversion: { value: randPercent(5, 50), previous: randPercent(5, 50), unit: '£', label: 'Cost per Conversion' },
      conversionValue: { value: rand(5000, 30000), previous: rand(4500, 28000), unit: '£', label: 'Conversion Value' },
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

      const [{ current, previous }, realtime] = await Promise.all([
        fetchGA4Metrics({
          accessToken,
          propertyId: credential.accountId,
          startDate,
          endDate,
        }),
        fetchGA4RealtimeMetrics(accessToken, credential.accountId)
      ])

      const metrics = [
        {
          key: 'activeUsers',
          label: 'Active Users',
          value: Math.round(current.activeUsers),
          previous: Math.round(previous.activeUsers),
          unit: '',
          deltaPercent: calculateDelta(current.activeUsers, previous.activeUsers),
          trend: calculateTrend(current.activeUsers, previous.activeUsers),
        },
        {
          key: 'activeUsers30m',
          label: 'Active Users (Last 30 min)',
          value: realtime.activeUsers,
          previous: 0,
          unit: '',
          deltaPercent: 0,
          trend: 'stable' as const,
        },
        {
          key: 'totalUsers',
          label: 'Total Users',
          value: Math.round(current.totalUsers),
          previous: Math.round(previous.totalUsers),
          unit: '',
          deltaPercent: calculateDelta(current.totalUsers, previous.totalUsers),
          trend: calculateTrend(current.totalUsers, previous.totalUsers),
        },
        {
          key: 'newUsers',
          label: 'New Users',
          value: Math.round(current.newUsers),
          previous: Math.round(previous.newUsers),
          unit: '',
          deltaPercent: calculateDelta(current.newUsers, previous.newUsers),
          trend: calculateTrend(current.newUsers, previous.newUsers),
        },
        {
          key: 'returningUsers',
          label: 'Returning Users',
          value: Math.max(0, Math.round(current.totalUsers - current.newUsers)),
          previous: Math.max(0, Math.round(previous.totalUsers - previous.newUsers)),
          unit: '',
          deltaPercent: calculateDelta(current.totalUsers - current.newUsers, previous.totalUsers - previous.newUsers),
          trend: calculateTrend(current.totalUsers - current.newUsers, previous.totalUsers - previous.newUsers),
        },
        {
          key: 'sessions',
          label: 'Sessions',
          value: Math.round(current.sessions),
          previous: Math.round(previous.sessions),
          unit: '',
          deltaPercent: calculateDelta(current.sessions, previous.sessions),
          trend: calculateTrend(current.sessions, previous.sessions),
        },
        {
          key: 'engagedSessions',
          label: 'Engaged Sessions',
          value: Math.round(current.engagedSessions),
          previous: Math.round(previous.engagedSessions),
          unit: '',
          deltaPercent: calculateDelta(current.engagedSessions, previous.engagedSessions),
          trend: calculateTrend(current.engagedSessions, previous.engagedSessions),
        },
        {
          key: 'engagementRate',
          label: 'Engagement Rate',
          value: parseFloat((current.engagementRate * 100).toFixed(1)),
          previous: parseFloat((previous.engagementRate * 100).toFixed(1)),
          unit: '%',
          deltaPercent: calculateDelta(current.engagementRate, previous.engagementRate),
          trend: calculateTrend(current.engagementRate, previous.engagementRate),
        },
        {
          key: 'screenPageViews',
          label: 'Views',
          value: Math.round(current.screenPageViews),
          previous: Math.round(previous.screenPageViews),
          unit: '',
          deltaPercent: calculateDelta(current.screenPageViews, previous.screenPageViews),
          trend: calculateTrend(current.screenPageViews, previous.screenPageViews),
        },
        {
          key: 'conversions',
          label: 'Key Events',
          value: Math.round(current.conversions),
          previous: Math.round(previous.conversions),
          unit: '',
          deltaPercent: calculateDelta(current.conversions, previous.conversions),
          trend: calculateTrend(current.conversions, previous.conversions),
        },
        {
          key: 'averageEngagementTime',
          label: 'Avg Engagement Time / Active User',
          value: parseFloat((current.userEngagementDuration / (current.activeUsers || 1)).toFixed(2)),
          previous: parseFloat((previous.userEngagementDuration / (previous.activeUsers || 1)).toFixed(2)),
          unit: 's',
          deltaPercent: calculateDelta(current.userEngagementDuration / (current.activeUsers || 1), previous.userEngagementDuration / (previous.activeUsers || 1)),
          trend: calculateTrend(current.userEngagementDuration / (current.activeUsers || 1), previous.userEngagementDuration / (previous.activeUsers || 1)),
        },
        {
          key: 'averageEngagementTimePerSession',
          label: 'Avg Engagement Time / Session',
          value: parseFloat((current.userEngagementDuration / (current.sessions || 1)).toFixed(2)),
          previous: parseFloat((previous.userEngagementDuration / (previous.sessions || 1)).toFixed(2)),
          unit: 's',
          deltaPercent: calculateDelta(current.userEngagementDuration / (current.sessions || 1), previous.userEngagementDuration / (previous.sessions || 1)),
          trend: calculateTrend(current.userEngagementDuration / (current.sessions || 1), previous.userEngagementDuration / (previous.sessions || 1)),
        },
        {
          key: 'engagedSessionsPerActiveUser',
          label: 'Engaged Sessions / Active User',
          value: parseFloat((current.engagedSessions / (current.activeUsers || 1)).toFixed(2)),
          previous: parseFloat((previous.engagedSessions / (previous.activeUsers || 1)).toFixed(2)),
          unit: '',
          deltaPercent: calculateDelta(current.engagedSessions / (current.activeUsers || 1), previous.engagedSessions / (previous.activeUsers || 1)),
          trend: calculateTrend(current.engagedSessions / (current.activeUsers || 1), previous.engagedSessions / (previous.activeUsers || 1)),
        },
        {
          key: 'eventCount',
          label: 'Event Count',
          value: Math.round(current.eventCount),
          previous: Math.round(previous.eventCount),
          unit: '',
          deltaPercent: calculateDelta(current.eventCount, previous.eventCount),
          trend: calculateTrend(current.eventCount, previous.eventCount),
        },
        {
          key: 'eventCountPerActiveUser',
          label: 'Event Count / Active User',
          value: parseFloat((current.eventCount / (current.activeUsers || 1)).toFixed(2)),
          previous: parseFloat((previous.eventCount / (previous.activeUsers || 1)).toFixed(2)),
          unit: '',
          deltaPercent: calculateDelta(current.eventCount / (current.activeUsers || 1), previous.eventCount / (previous.activeUsers || 1)),
          trend: calculateTrend(current.eventCount / (current.activeUsers || 1), previous.eventCount / (previous.activeUsers || 1)),
        },
        {
          key: 'eventsPerSession',
          label: 'Events / Session',
          value: parseFloat(current.eventsPerSession.toFixed(2)),
          previous: parseFloat(previous.eventsPerSession.toFixed(2)),
          unit: '',
          deltaPercent: calculateDelta(current.eventsPerSession, previous.eventsPerSession),
          trend: calculateTrend(current.eventsPerSession, previous.eventsPerSession),
        },
        {
          key: 'sessionKeyEventRate',
          label: 'Session Key Event Rate',
          value: parseFloat(((current.conversions / (current.sessions || 1)) * 100).toFixed(2)),
          previous: parseFloat(((previous.conversions / (previous.sessions || 1)) * 100).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(current.conversions / (current.sessions || 1), previous.conversions / (previous.sessions || 1)),
          trend: calculateTrend(current.conversions / (current.sessions || 1), previous.conversions / (previous.sessions || 1)),
        },
        {
          key: 'userEngagementDuration',
          label: 'User Engagement',
          value: Math.round(current.userEngagementDuration),
          previous: Math.round(previous.userEngagementDuration),
          unit: 's',
          deltaPercent: calculateDelta(current.userEngagementDuration, previous.userEngagementDuration),
          trend: calculateTrend(current.userEngagementDuration, previous.userEngagementDuration),
        },
        {
          key: 'userKeyEventRate',
          label: 'User Key Event Rate',
          value: parseFloat(((current.conversions / (current.activeUsers || 1)) * 100).toFixed(2)),
          previous: parseFloat(((previous.conversions / (previous.activeUsers || 1)) * 100).toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(current.conversions / (current.activeUsers || 1), previous.conversions / (previous.activeUsers || 1)),
          trend: calculateTrend(current.conversions / (current.activeUsers || 1), previous.conversions / (previous.activeUsers || 1)),
        },
        {
          key: 'dauPerMau',
          label: 'User Stickiness (DAU/MAU)',
          value: parseFloat((current.dauPerMau * 100).toFixed(1)),
          previous: parseFloat((previous.dauPerMau * 100).toFixed(1)),
          unit: '%',
          deltaPercent: calculateDelta(current.dauPerMau, previous.dauPerMau),
          trend: calculateTrend(current.dauPerMau, previous.dauPerMau),
        },
        {
          key: 'dauPerWau',
          label: 'User Stickiness (DAU/WAU)',
          value: parseFloat((current.dauPerWau * 100).toFixed(1)),
          previous: parseFloat((previous.dauPerWau * 100).toFixed(1)),
          unit: '%',
          deltaPercent: calculateDelta(current.dauPerWau, previous.dauPerWau),
          trend: calculateTrend(current.dauPerWau, previous.dauPerWau),
        },
        {
          key: 'wauPerMau',
          label: 'User Stickiness (WAU/MAU)',
          value: parseFloat((current.wauPerMau * 100).toFixed(1)),
          previous: parseFloat((previous.wauPerMau * 100).toFixed(1)),
          unit: '%',
          deltaPercent: calculateDelta(current.wauPerMau, previous.wauPerMau),
          trend: calculateTrend(current.wauPerMau, previous.wauPerMau),
        },
        {
          key: 'screenPageViewsPerActiveUser',
          label: 'Views / Active User',
          value: parseFloat((current.screenPageViews / (current.activeUsers || 1)).toFixed(2)),
          previous: parseFloat((previous.screenPageViews / (previous.activeUsers || 1)).toFixed(2)),
          unit: '',
          deltaPercent: calculateDelta(current.screenPageViews / (current.activeUsers || 1), previous.screenPageViews / (previous.activeUsers || 1)),
          trend: calculateTrend(current.screenPageViews / (current.activeUsers || 1), previous.screenPageViews / (previous.activeUsers || 1)),
        },
      ]

      return metrics.map(m => ({
        ...m,
        historicalData: undefined,
      }))
    }

    // Fetch Google Search Console data
    if (channel === 'GOOGLE_SEARCH_CONSOLE') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - durationDays)

      const prevStartStr = prevStart.toISOString().split('T')[0]
      const prevEndStr = prevEnd.toISOString().split('T')[0]

      const hasSite = credential.accountId && credential.accountId !== 'pending-site-selection'
      const siteUrl = hasSite ? credential.accountId : null

      // Fetch summary + dimensional data in parallel
      const [
        current, previous,
        topQueries, topPages, countries, devices, trafficSources,
      ] = await Promise.all([
        siteUrl
          ? fetchGSCMetrics({ accessToken, siteUrl, startDate, endDate })
          : fetchAllGSCMetrics(accessToken, startDate, endDate),
        siteUrl
          ? fetchGSCMetrics({ accessToken, siteUrl, startDate: prevStartStr, endDate: prevEndStr })
          : fetchAllGSCMetrics(accessToken, prevStartStr, prevEndStr),
        siteUrl ? fetchGSCDimensional(accessToken, siteUrl, startDate, endDate, 'query', 25) : Promise.resolve([]),
        siteUrl ? fetchGSCDimensional(accessToken, siteUrl, startDate, endDate, 'page', 25) : Promise.resolve([]),
        siteUrl ? fetchGSCDimensional(accessToken, siteUrl, startDate, endDate, 'country', 25) : Promise.resolve([]),
        siteUrl ? fetchGSCDimensional(accessToken, siteUrl, startDate, endDate, 'device', 10) : Promise.resolve([]),
        siteUrl ? fetchGSCTrafficSources(accessToken, siteUrl, startDate, endDate) : Promise.resolve([]),
      ])

      if (!current) return []
      const prev = previous || { clicks: 0, impressions: 0, ctr: 0, position: 0 }

      const tableColumns = {
        queriesPages: [
          { key: 'dimension', label: 'Query', type: 'text' as const },
          { key: 'clicks', label: 'Clicks', type: 'number' as const },
          { key: 'impressions', label: 'Impressions', type: 'number' as const },
          { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
          { key: 'position', label: 'Pos.', type: 'number' as const },
        ],
        pages: [
          { key: 'dimension', label: 'URL', type: 'url' as const },
          { key: 'clicks', label: 'Clicks', type: 'number' as const },
          { key: 'impressions', label: 'Impressions', type: 'number' as const },
          { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
          { key: 'position', label: 'Pos.', type: 'number' as const },
        ],
        countries: [
          { key: 'dimension', label: 'Country', type: 'text' as const },
          { key: 'clicks', label: 'Clicks', type: 'number' as const },
          { key: 'impressions', label: 'Impressions', type: 'number' as const },
          { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
        ],
        devices: [
          { key: 'dimension', label: 'Device', type: 'text' as const },
          { key: 'clicks', label: 'Clicks', type: 'number' as const },
          { key: 'impressions', label: 'Impressions', type: 'number' as const },
          { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
        ],
        sources: [
          { key: 'dimension', label: 'Source', type: 'text' as const },
          { key: 'clicks', label: 'Clicks', type: 'number' as const },
          { key: 'impressions', label: 'Impressions', type: 'number' as const },
          { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
        ],
      }

      return [
        // ── Summary metrics ────────────────────────────────────────────────
        {
          key: 'clicks',
          label: 'Total Clicks',
          value: current.clicks,
          previous: prev.clicks,
          unit: '',
          deltaPercent: calculateDelta(current.clicks, prev.clicks),
          trend: calculateTrend(current.clicks, prev.clicks),
        },
        {
          key: 'impressions',
          label: 'Total Impressions',
          value: current.impressions,
          previous: prev.impressions,
          unit: '',
          deltaPercent: calculateDelta(current.impressions, prev.impressions),
          trend: calculateTrend(current.impressions, prev.impressions),
        },
        {
          key: 'ctr',
          label: 'Avg CTR',
          value: parseFloat(current.ctr.toFixed(2)),
          previous: parseFloat(prev.ctr.toFixed(2)),
          unit: '%',
          deltaPercent: calculateDelta(current.ctr, prev.ctr),
          trend: calculateTrend(current.ctr, prev.ctr),
        },
        {
          key: 'avgPosition',
          label: 'Avg Position',
          value: parseFloat(current.position.toFixed(1)),
          previous: parseFloat(prev.position.toFixed(1)),
          unit: '',
          deltaPercent: calculateDelta(prev.position, current.position), // Inverted
          trend: calculateTrend(prev.position, current.position),
        },
        // ── Dimensional tables ─────────────────────────────────────────────
        {
          key: 'topQueries',
          label: 'Top Queries',
          value: topQueries.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.queriesPages,
          tableData: topQueries,
        },
        {
          key: 'topPages',
          label: 'Top Pages',
          value: topPages.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.pages,
          tableData: topPages,
        },
        {
          key: 'topClickedUrls',
          label: 'Top Clicked URLs',
          value: topPages.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.pages,
          tableData: topPages,
        },
        {
          key: 'trafficSources',
          label: 'Traffic Sources',
          value: trafficSources.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.sources,
          tableData: trafficSources,
        },
        {
          key: 'countries',
          label: 'Countries',
          value: countries.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.countries,
          tableData: countries,
        },
        {
          key: 'devices',
          label: 'Devices',
          value: devices.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: tableColumns.devices,
          tableData: devices,
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

    // Fetch Google Ads data
    if (channel === 'GOOGLE_ADS') {
      if (!credential.accountId || credential.accountId === 'pending-account-selection') {
        return []
      }

      const customerId = credential.accountId
      const adsConfig = { accessToken, customerId, startDate, endDate }

      // Calculate previous period
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - durationDays)
      const prevStartStr = prevStart.toISOString().split('T')[0]
      const prevEndStr = prevEnd.toISOString().split('T')[0]
      const prevConfig = { accessToken, customerId, startDate: prevStartStr, endDate: prevEndStr }

      const [current, previous, ageRanges, genders, networks, keywords] = await Promise.all([
        fetchGoogleAdsMetrics(adsConfig),
        fetchGoogleAdsMetrics(prevConfig),
        fetchGoogleAdsAgeRanges(adsConfig),
        fetchGoogleAdsGenders(adsConfig),
        fetchGoogleAdsNetworks(adsConfig),
        fetchGoogleAdsKeywords(adsConfig, 25),
      ])

      const demographicsRows = [
        ...ageRanges.map(r => ({ group: 'Age', segment: r.dimension, impressions: r.impressions, clicks: r.clicks, conversions: r.conversions, spend: r.spend, ctr: r.ctr })),
        ...genders.map(r => ({ group: 'Gender', segment: r.dimension, impressions: r.impressions, clicks: r.clicks, conversions: r.conversions, spend: r.spend, ctr: r.ctr })),
      ]

      return [
        // ── Core metrics ───────────────────────────────────────────────────
        {
          key: 'clicks',
          label: 'Clicks',
          value: current.clicks,
          previous: previous.clicks,
          unit: '',
          deltaPercent: calculateDelta(current.clicks, previous.clicks),
          trend: calculateTrend(current.clicks, previous.clicks),
        },
        {
          key: 'impressions',
          label: 'Impressions',
          value: current.impressions,
          previous: previous.impressions,
          unit: '',
          deltaPercent: calculateDelta(current.impressions, previous.impressions),
          trend: calculateTrend(current.impressions, previous.impressions),
        },
        {
          key: 'conversions',
          label: 'Conversions',
          value: parseFloat(current.conversions.toFixed(1)),
          previous: parseFloat(previous.conversions.toFixed(1)),
          unit: '',
          deltaPercent: calculateDelta(current.conversions, previous.conversions),
          trend: calculateTrend(current.conversions, previous.conversions),
        },
        {
          key: 'cost',
          label: 'Cost',
          value: parseFloat(current.spend.toFixed(2)),
          previous: parseFloat(previous.spend.toFixed(2)),
          unit: '£',
          deltaPercent: calculateDelta(current.spend, previous.spend),
          trend: calculateTrend(current.spend, previous.spend),
        },
        {
          key: 'ctr',
          label: 'Click-Through Rate (CTR)',
          value: current.ctr,
          previous: previous.ctr,
          unit: '%',
          deltaPercent: calculateDelta(current.ctr, previous.ctr),
          trend: calculateTrend(current.ctr, previous.ctr),
        },
        {
          key: 'avgCpc',
          label: 'Cost per Click (CPC)',
          value: current.avgCpc,
          previous: previous.avgCpc,
          unit: '£',
          deltaPercent: calculateDelta(previous.avgCpc, current.avgCpc), // inverted: lower is better
          trend: calculateTrend(previous.avgCpc, current.avgCpc),
        },
        {
          key: 'interactions',
          label: 'Interactions',
          value: current.interactions,
          previous: previous.interactions,
          unit: '',
          deltaPercent: calculateDelta(current.interactions, previous.interactions),
          trend: calculateTrend(current.interactions, previous.interactions),
        },
        {
          key: 'interactionRate',
          label: 'Interaction Rate',
          value: current.interactionRate,
          previous: previous.interactionRate,
          unit: '%',
          deltaPercent: calculateDelta(current.interactionRate, previous.interactionRate),
          trend: calculateTrend(current.interactionRate, previous.interactionRate),
        },
        {
          key: 'conversionRate',
          label: 'Conversion Rate',
          value: current.conversionRate,
          previous: previous.conversionRate,
          unit: '%',
          deltaPercent: calculateDelta(current.conversionRate, previous.conversionRate),
          trend: calculateTrend(current.conversionRate, previous.conversionRate),
        },
        {
          key: 'costPerConversion',
          label: 'Cost per Conversion',
          value: current.costPerConversion,
          previous: previous.costPerConversion,
          unit: '£',
          deltaPercent: calculateDelta(previous.costPerConversion, current.costPerConversion), // inverted
          trend: calculateTrend(previous.costPerConversion, current.costPerConversion),
        },
        {
          key: 'conversionValue',
          label: 'Conversion Value',
          value: parseFloat(current.conversionsValue.toFixed(2)),
          previous: parseFloat(previous.conversionsValue.toFixed(2)),
          unit: '£',
          deltaPercent: calculateDelta(current.conversionsValue, previous.conversionsValue),
          trend: calculateTrend(current.conversionsValue, previous.conversionsValue),
        },
        // ── Dimensional tables ─────────────────────────────────────────────
        {
          key: 'demographics',
          label: 'Demographics',
          value: demographicsRows.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'group', label: 'Group', type: 'text' as const },
            { key: 'segment', label: 'Segment', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'clicks', label: 'Clicks', type: 'number' as const },
            { key: 'conversions', label: 'Conv.', type: 'number' as const },
            { key: 'spend', label: 'Cost', type: 'number' as const },
            { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
          ],
          tableData: demographicsRows,
        },
        {
          key: 'networks',
          label: 'Networks (Channels)',
          value: networks.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'network', label: 'Network', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'clicks', label: 'Clicks', type: 'number' as const },
            { key: 'conversions', label: 'Conv.', type: 'number' as const },
            { key: 'spend', label: 'Cost', type: 'number' as const },
            { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
          ],
          tableData: networks,
        },
        {
          key: 'keywords',
          label: 'Keywords',
          value: keywords.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'keyword', label: 'Keyword', type: 'text' as const },
            { key: 'matchType', label: 'Match', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'clicks', label: 'Clicks', type: 'number' as const },
            { key: 'conversions', label: 'Conv.', type: 'number' as const },
            { key: 'spend', label: 'Cost', type: 'number' as const },
            { key: 'ctr', label: 'CTR', unit: '%', type: 'percent' as const },
          ],
          tableData: keywords,
        },
      ]
    }

    // Fetch Meta Ads data
    if (channel === 'META_ADS') {
      if (!credential.accountId || credential.accountId === 'pending-account-selection') {
        return []
      }

      const metaConfig = { accessToken, accountId: credential.accountId, startDate, endDate }

      // Calculate previous period
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - durationDays)
      const prevConfig = {
        accessToken,
        accountId: credential.accountId,
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0],
      }

      const [current, previous, campaigns, adSets, ads] = await Promise.all([
        fetchMetaAdsAccountMetrics(metaConfig),
        fetchMetaAdsAccountMetrics(prevConfig),
        fetchMetaAdsCampaigns(metaConfig),
        fetchMetaAdsAdSets(metaConfig),
        fetchMetaAdsAds(metaConfig),
      ])

      return [
        {
          key: 'results',
          label: 'Results',
          value: current.results,
          previous: previous.results,
          unit: '',
          deltaPercent: calculateDelta(current.results, previous.results),
          trend: calculateTrend(current.results, previous.results),
        },
        {
          key: 'costPerResult',
          label: 'Cost per Result',
          value: parseFloat(current.costPerResult.toFixed(2)),
          previous: parseFloat(previous.costPerResult.toFixed(2)),
          unit: '£',
          deltaPercent: calculateDelta(current.costPerResult, previous.costPerResult),
          trend: calculateTrend(current.costPerResult, previous.costPerResult),
        },
        {
          key: 'spend',
          label: 'Amount Spent',
          value: parseFloat(current.spend.toFixed(2)),
          previous: parseFloat(previous.spend.toFixed(2)),
          unit: '£',
          deltaPercent: calculateDelta(current.spend, previous.spend),
          trend: calculateTrend(current.spend, previous.spend),
        },
        {
          key: 'impressions',
          label: 'Impressions',
          value: current.impressions,
          previous: previous.impressions,
          unit: '',
          deltaPercent: calculateDelta(current.impressions, previous.impressions),
          trend: calculateTrend(current.impressions, previous.impressions),
        },
        {
          key: 'reach',
          label: 'Reach',
          value: current.reach,
          previous: previous.reach,
          unit: '',
          deltaPercent: calculateDelta(current.reach, previous.reach),
          trend: calculateTrend(current.reach, previous.reach),
        },
        // Campaign-level table
        {
          key: 'campaigns',
          label: 'Campaigns',
          value: campaigns.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'name', label: 'Campaign', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'reach', label: 'Reach', type: 'number' as const },
            { key: 'spend', label: 'Amount Spent', type: 'number' as const },
            { key: 'results', label: 'Results', type: 'number' as const },
            { key: 'costPerResult', label: 'Cost / Result', type: 'number' as const },
            { key: 'dailyBudget', label: 'Daily Budget', type: 'number' as const },
            { key: 'lifetimeBudget', label: 'Lifetime Budget', type: 'number' as const },
            { key: 'status', label: 'Status', type: 'text' as const },
          ],
          tableData: campaigns,
        },
        // Ad set-level table
        {
          key: 'adSets',
          label: 'Ad Sets',
          value: adSets.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'name', label: 'Ad Set', type: 'text' as const },
            { key: 'campaignName', label: 'Campaign', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'reach', label: 'Reach', type: 'number' as const },
            { key: 'spend', label: 'Amount Spent', type: 'number' as const },
            { key: 'results', label: 'Results', type: 'number' as const },
            { key: 'costPerResult', label: 'Cost / Result', type: 'number' as const },
          ],
          tableData: adSets,
        },
        // Ad-level table
        {
          key: 'ads',
          label: 'Ads',
          value: ads.length,
          unit: '',
          metricType: 'table' as const,
          tableColumns: [
            { key: 'name', label: 'Ad', type: 'text' as const },
            { key: 'adSetName', label: 'Ad Set', type: 'text' as const },
            { key: 'impressions', label: 'Impressions', type: 'number' as const },
            { key: 'reach', label: 'Reach', type: 'number' as const },
            { key: 'spend', label: 'Amount Spent', type: 'number' as const },
            { key: 'results', label: 'Results', type: 'number' as const },
            { key: 'costPerResult', label: 'Cost / Result', type: 'number' as const },
          ],
          tableData: ads,
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
