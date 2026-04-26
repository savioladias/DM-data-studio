/**
 * Meta Marketing API & Graph API Client
 * Covers: Campaigns, Ad Sets, Ads, Creative, Audiences, Insights, Pages, Instagram
 * API Version: v21.0
 */

const API_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetaApiConfig {
  accessToken: string;
  adAccountId: string; // format: act_XXXXXXXXX
}

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
  summary?: Record<string, unknown>;
}

// ─── Generic Fetch Helper ────────────────────────────────────────────────────

async function metaGet<T>(
  url: string,
  params: Record<string, string>,
  accessToken: string
): Promise<T> {
  const searchParams = new URLSearchParams({
    ...params,
    access_token: accessToken,
  });

  const fullUrl = `${url}?${searchParams.toString()}`;
  const response = await fetch(fullUrl);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(
      `Meta API error (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

async function metaGetAll<T>(
  url: string,
  params: Record<string, string>,
  accessToken: string,
  maxPages = 10
): Promise<T[]> {
  let allData: T[] = [];
  let nextUrl: string | undefined = undefined;
  let page = 0;

  // First request
  const firstResult = await metaGet<PaginatedResponse<T>>(url, params, accessToken);
  allData = allData.concat(firstResult.data || []);
  nextUrl = firstResult.paging?.next;

  // Follow pagination
  while (nextUrl && page < maxPages) {
    page++;
    const response = await fetch(nextUrl);
    if (!response.ok) break;
    const result = (await response.json()) as PaginatedResponse<T>;
    allData = allData.concat(result.data || []);
    nextUrl = result.paging?.next;
  }

  return allData;
}

// ─── Account Info ────────────────────────────────────────────────────────────

export async function getAdAccount(config: MetaApiConfig) {
  return metaGet(
    `${GRAPH_URL}/${config.adAccountId}`,
    {
      fields: [
        "id",
        "name",
        "account_id",
        "account_status",
        "currency",
        "timezone_name",
        "timezone_offset_hours_utc",
        "business_name",
        "balance",
        "amount_spent",
        "spend_cap",
        "min_daily_budget",
        "business",
        "owner",
        "funding_source",
        "created_time",
      ].join(","),
    },
    config.accessToken
  );
}

export async function getBusinessInfo(accessToken: string, businessId: string) {
  return metaGet(
    `${GRAPH_URL}/${businessId}`,
    {
      fields: [
        "id",
        "name",
        "primary_page",
        "link",
        "profile_picture_uri",
        "created_time",
        "verification_status",
        "timezone_id",
      ].join(","),
    },
    accessToken
  );
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function getCampaigns(config: MetaApiConfig, limit = 100) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/campaigns`,
    {
      fields: [
        "id",
        "name",
        "objective",
        "status",
        "effective_status",
        "buying_type",
        "bid_strategy",
        "budget_remaining",
        "daily_budget",
        "lifetime_budget",
        "spend_cap",
        "start_time",
        "stop_time",
        "created_time",
        "updated_time",
        "special_ad_categories",
        "smart_promotion_type",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

export async function getCampaignInsights(
  config: MetaApiConfig,
  campaignId: string,
  dateRange: DateRange,
  breakdowns?: string
) {
  const params: Record<string, string> = {
    fields: ALL_INSIGHT_FIELDS.join(","),
    time_range: JSON.stringify(dateRange),
    time_increment: "1", // daily breakdown
  };
  if (breakdowns) params.breakdowns = breakdowns;

  return metaGetAll(
    `${GRAPH_URL}/${campaignId}/insights`,
    params,
    config.accessToken
  );
}

// ─── Ad Sets ─────────────────────────────────────────────────────────────────

export async function getAdSets(config: MetaApiConfig, campaignId?: string, limit = 100) {
  const endpoint = campaignId
    ? `${GRAPH_URL}/${campaignId}/adsets`
    : `${GRAPH_URL}/${config.adAccountId}/adsets`;

  return metaGetAll(
    endpoint,
    {
      fields: [
        "id",
        "name",
        "campaign_id",
        "status",
        "effective_status",
        "daily_budget",
        "lifetime_budget",
        "budget_remaining",
        "bid_amount",
        "bid_strategy",
        "billing_event",
        "optimization_goal",
        "targeting",
        "start_time",
        "end_time",
        "created_time",
        "updated_time",
        "promoted_object",
        "destination_type",
        "attribution_spec",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

export async function getAdSetInsights(
  config: MetaApiConfig,
  adSetId: string,
  dateRange: DateRange,
  breakdowns?: string
) {
  const params: Record<string, string> = {
    fields: ALL_INSIGHT_FIELDS.join(","),
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
  };
  if (breakdowns) params.breakdowns = breakdowns;

  return metaGetAll(
    `${GRAPH_URL}/${adSetId}/insights`,
    params,
    config.accessToken
  );
}

// ─── Ads ─────────────────────────────────────────────────────────────────────

export async function getAds(config: MetaApiConfig, adSetId?: string, limit = 100) {
  const endpoint = adSetId
    ? `${GRAPH_URL}/${adSetId}/ads`
    : `${GRAPH_URL}/${config.adAccountId}/ads`;

  return metaGetAll(
    endpoint,
    {
      fields: [
        "id",
        "name",
        "adset_id",
        "campaign_id",
        "status",
        "effective_status",
        "creative",
        "tracking_specs",
        "conversion_specs",
        "created_time",
        "updated_time",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

export async function getAdInsights(
  config: MetaApiConfig,
  adId: string,
  dateRange: DateRange,
  breakdowns?: string
) {
  const params: Record<string, string> = {
    fields: ALL_INSIGHT_FIELDS.join(","),
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
  };
  if (breakdowns) params.breakdowns = breakdowns;

  return metaGetAll(
    `${GRAPH_URL}/${adId}/insights`,
    params,
    config.accessToken
  );
}

// ─── Ad Creatives ────────────────────────────────────────────────────────────

export async function getAdCreatives(config: MetaApiConfig, limit = 100) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/adcreatives`,
    {
      fields: [
        "id",
        "name",
        "title",
        "body",
        "image_url",
        "image_hash",
        "video_id",
        "link_url",
        "call_to_action_type",
        "object_story_spec",
        "asset_feed_spec",
        "thumbnail_url",
        "effective_object_story_id",
        "status",
        "created_time",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

// ─── Account-Level Insights ──────────────────────────────────────────────────

export async function getAccountInsights(
  config: MetaApiConfig,
  dateRange: DateRange,
  breakdowns?: string,
  timeIncrement = "1"
) {
  const params: Record<string, string> = {
    fields: ALL_INSIGHT_FIELDS.join(","),
    time_range: JSON.stringify(dateRange),
    time_increment: timeIncrement,
  };
  if (breakdowns) params.breakdowns = breakdowns;

  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/insights`,
    params,
    config.accessToken
  );
}

// ─── Audience / Demographics Breakdown ───────────────────────────────────────

export async function getAudienceInsights(
  config: MetaApiConfig,
  dateRange: DateRange,
  breakdown: "age" | "gender" | "country" | "region" | "dma" | "device_platform" | "publisher_platform" | "platform_position" | "impression_device"
) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/insights`,
    {
      fields: [
        "spend",
        "impressions",
        "clicks",
        "reach",
        "actions",
        "action_values",
        "cost_per_action_type",
        "cpc",
        "cpm",
        "ctr",
        "conversions",
        "conversion_values",
      ].join(","),
      time_range: JSON.stringify(dateRange),
      breakdowns: breakdown,
    },
    config.accessToken
  );
}

export async function getAgeDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "age");
}

export async function getGenderDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "gender");
}

export async function getCountryDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "country");
}

export async function getDeviceDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "device_platform");
}

export async function getPlatformDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "publisher_platform");
}

export async function getPlacementDemographics(config: MetaApiConfig, dateRange: DateRange) {
  return getAudienceInsights(config, dateRange, "platform_position");
}

// ─── Custom Audiences & Saved Audiences ──────────────────────────────────────

export async function getCustomAudiences(config: MetaApiConfig, limit = 100) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/customaudiences`,
    {
      fields: [
        "id",
        "name",
        "description",
        "approximate_count",
        "data_source",
        "delivery_status",
        "operation_status",
        "subtype",
        "time_created",
        "time_updated",
        "lookalike_spec",
        "retention_days",
        "rule",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

export async function getSavedAudiences(config: MetaApiConfig, limit = 100) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/saved_audiences`,
    {
      fields: [
        "id",
        "name",
        "description",
        "approximate_count",
        "targeting",
        "run_status",
        "time_created",
        "time_updated",
      ].join(","),
      limit: String(limit),
    },
    config.accessToken
  );
}

// ─── Conversion Tracking / Pixels ────────────────────────────────────────────

export async function getPixels(config: MetaApiConfig) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/adspixels`,
    {
      fields: [
        "id",
        "name",
        "code",
        "creation_time",
        "last_fired_time",
        "is_created_by_app",
        "data_use_setting",
      ].join(","),
    },
    config.accessToken
  );
}

export async function getPixelStats(accessToken: string, pixelId: string, dateRange: DateRange) {
  return metaGet(
    `${GRAPH_URL}/${pixelId}/stats`,
    {
      start_time: dateRange.since,
      end_time: dateRange.until,
      aggregation: "event",
    },
    accessToken
  );
}

// ─── Custom Conversions ──────────────────────────────────────────────────────

export async function getCustomConversions(config: MetaApiConfig) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/customconversions`,
    {
      fields: [
        "id",
        "name",
        "description",
        "pixel",
        "rule",
        "custom_event_type",
        "default_conversion_value",
        "is_archived",
        "creation_time",
        "last_fired_time",
      ].join(","),
    },
    config.accessToken
  );
}

// ─── Budget / Spend / Billing ────────────────────────────────────────────────

export async function getAccountSpendHistory(config: MetaApiConfig, dateRange: DateRange) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId}/insights`,
    {
      fields: "spend,date_start,date_stop",
      time_range: JSON.stringify(dateRange),
      time_increment: "1",
    },
    config.accessToken
  );
}

// ─── Facebook Page Insights (Business Suite) ─────────────────────────────────

export async function getPageInfo(accessToken: string, pageId: string) {
  return metaGet(
    `${GRAPH_URL}/${pageId}`,
    {
      fields: [
        "id",
        "name",
        "about",
        "category",
        "fan_count",
        "followers_count",
        "link",
        "picture",
        "cover",
        "rating_count",
        "overall_star_rating",
        "verification_status",
        "website",
        "phone",
        "emails",
        "location",
        "hours",
      ].join(","),
    },
    accessToken
  );
}

export async function getPageInsights(
  accessToken: string,
  pageId: string,
  dateRange: DateRange,
  period: "day" | "week" | "days_28" = "day"
) {
  const metrics = [
    "page_impressions",
    "page_impressions_unique",
    "page_impressions_organic",
    "page_impressions_paid",
    "page_engaged_users",
    "page_post_engagements",
    "page_consumptions",
    "page_consumptions_unique",
    "page_fan_adds",
    "page_fan_removes",
    "page_fans",
    "page_views_total",
    "page_views_logged_in_total",
    "page_video_views",
    "page_actions_post_reactions_total",
    "page_negative_feedback",
  ].join(",");

  return metaGet(
    `${GRAPH_URL}/${pageId}/insights`,
    {
      metric: metrics,
      since: dateRange.since,
      until: dateRange.until,
      period,
    },
    accessToken
  );
}

export async function getPagePosts(accessToken: string, pageId: string, limit = 50) {
  return metaGetAll(
    `${GRAPH_URL}/${pageId}/posts`,
    {
      fields: [
        "id",
        "message",
        "created_time",
        "type",
        "permalink_url",
        "shares",
        "likes.summary(true)",
        "comments.summary(true)",
        "reactions.summary(true)",
        "full_picture",
        "attachments",
        "is_published",
        "status_type",
      ].join(","),
      limit: String(limit),
    },
    accessToken
  );
}

export async function getPostInsights(accessToken: string, postId: string) {
  return metaGet(
    `${GRAPH_URL}/${postId}/insights`,
    {
      metric: [
        "post_impressions",
        "post_impressions_unique",
        "post_impressions_organic",
        "post_impressions_paid",
        "post_engaged_users",
        "post_clicks",
        "post_reactions_by_type_total",
        "post_activity_by_action_type",
      ].join(","),
    },
    accessToken
  );
}

// ─── Instagram Business Insights ─────────────────────────────────────────────

export async function getInstagramAccount(accessToken: string, igAccountId: string) {
  return metaGet(
    `${GRAPH_URL}/${igAccountId}`,
    {
      fields: [
        "id",
        "name",
        "username",
        "biography",
        "followers_count",
        "follows_count",
        "media_count",
        "profile_picture_url",
        "website",
      ].join(","),
    },
    accessToken
  );
}

export async function getInstagramInsights(
  accessToken: string,
  igAccountId: string,
  dateRange: DateRange
) {
  // Account-level insights
  return metaGet(
    `${GRAPH_URL}/${igAccountId}/insights`,
    {
      metric: [
        "impressions",
        "reach",
        "follower_count",
        "email_contacts",
        "phone_call_clicks",
        "text_message_clicks",
        "get_directions_clicks",
        "website_clicks",
        "profile_views",
      ].join(","),
      period: "day",
      since: dateRange.since,
      until: dateRange.until,
    },
    accessToken
  );
}

export async function getInstagramDemographics(accessToken: string, igAccountId: string) {
  return metaGet(
    `${GRAPH_URL}/${igAccountId}/insights`,
    {
      metric: [
        "follower_demographics",
      ].join(","),
      period: "lifetime",
      metric_type: "total_value",
      timeframe: "this_month",
    },
    accessToken
  );
}

export async function getInstagramMedia(accessToken: string, igAccountId: string, limit = 50) {
  return metaGetAll(
    `${GRAPH_URL}/${igAccountId}/media`,
    {
      fields: [
        "id",
        "caption",
        "media_type",
        "media_url",
        "thumbnail_url",
        "permalink",
        "timestamp",
        "like_count",
        "comments_count",
        "insights.metric(impressions,reach,engagement,saved,shares,plays,total_interactions)",
      ].join(","),
      limit: String(limit),
    },
    accessToken
  );
}

export async function getInstagramStories(accessToken: string, igAccountId: string, limit = 25) {
  return metaGetAll(
    `${GRAPH_URL}/${igAccountId}/stories`,
    {
      fields: [
        "id",
        "media_type",
        "media_url",
        "timestamp",
        "permalink",
      ].join(","),
      limit: String(limit),
    },
    accessToken
  );
}

// ─── Lead Ads ────────────────────────────────────────────────────────────────

export async function getLeadForms(config: MetaApiConfig) {
  return metaGetAll(
    `${GRAPH_URL}/${config.adAccountId.replace("act_", "")}/leadgen_forms`,
    {
      fields: [
        "id",
        "name",
        "status",
        "leads_count",
        "created_time",
        "locale",
        "page",
        "questions",
      ].join(","),
    },
    config.accessToken
  );
}

export async function getLeadFormData(accessToken: string, formId: string, limit = 100) {
  return metaGetAll(
    `${GRAPH_URL}/${formId}/leads`,
    {
      fields: "id,created_time,field_data",
      limit: String(limit),
    },
    accessToken
  );
}

// ─── Catalog / Commerce ──────────────────────────────────────────────────────

export async function getProductCatalogs(accessToken: string, businessId: string) {
  return metaGetAll(
    `${GRAPH_URL}/${businessId}/owned_product_catalogs`,
    {
      fields: [
        "id",
        "name",
        "product_count",
        "vertical",
        "business",
      ].join(","),
    },
    accessToken
  );
}

export async function getCatalogProducts(accessToken: string, catalogId: string, limit = 50) {
  return metaGetAll(
    `${GRAPH_URL}/${catalogId}/products`,
    {
      fields: [
        "id",
        "name",
        "description",
        "price",
        "currency",
        "availability",
        "image_url",
        "url",
        "brand",
        "category",
        "retailer_id",
      ].join(","),
      limit: String(limit),
    },
    accessToken
  );
}

// ─── All Insight Fields (comprehensive) ──────────────────────────────────────

const ALL_INSIGHT_FIELDS = [
  // Core performance
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "unique_clicks",
  "cpc",
  "cpm",
  "cpp",
  "ctr",
  "unique_ctr",

  // Engagement
  "social_spend",
  "inline_link_clicks",
  "inline_link_click_ctr",
  "inline_post_engagement",
  "outbound_clicks",
  "unique_outbound_clicks",
  "outbound_clicks_ctr",
  "unique_outbound_clicks_ctr",

  // Actions / Conversions
  "actions",
  "action_values",
  "conversions",
  "conversion_values",
  "cost_per_action_type",
  "cost_per_conversion",
  "cost_per_unique_action_type",
  "cost_per_unique_click",
  "cost_per_inline_link_click",
  "cost_per_inline_post_engagement",
  "cost_per_outbound_click",
  "cost_per_unique_outbound_click",

  // Video
  "video_play_actions",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p100_watched_actions",
  "video_avg_time_watched_actions",
  "video_thruplay_watched_actions",
  "cost_per_thruplay",

  // Catalog / Commerce
  "catalog_segment_actions",
  "catalog_segment_value",
  "website_purchase_roas",
  "purchase_roas",

  // Attribution
  "attribution_setting",

  // Quality
  "quality_ranking",
  "engagement_rate_ranking",
  "conversion_rate_ranking",

  // Date info
  "date_start",
  "date_stop",

  // Level info
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "objective",
];
