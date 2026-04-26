/**
 * MCP Tool Definitions for Meta Ads Manager & Business Suite
 * Each tool maps to one or more Meta API endpoints
 */

import type { MetaApiConfig, DateRange } from "./meta-api.js";
import * as api from "./meta-api.js";

// ─── Shared Schemas ──────────────────────────────────────────────────────────

const dateRangeSchema = {
  since: { type: "string" as const, description: "Start date (YYYY-MM-DD)" },
  until: { type: "string" as const, description: "End date (YYYY-MM-DD)" },
};

const breakdownsDescription =
  "Optional breakdown dimension: age, gender, country, region, dma, device_platform, publisher_platform, platform_position, impression_device";

// ─── Tool Definitions ────────────────────────────────────────────────────────

export const TOOLS = [
  // ── Account ──
  {
    name: "meta_get_ad_account",
    description:
      "Get ad account details including name, status, currency, timezone, balance, total spend, and spend cap. Use this first to verify the connection works.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (format: act_XXXXXXXXX)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_business_info",
    description: "Get Meta Business Manager details including name, verification status, and primary page.",
    inputSchema: {
      type: "object" as const,
      properties: {
        business_id: { type: "string", description: "Business Manager ID" },
      },
      required: ["business_id"],
    },
  },

  // ── Campaigns ──
  {
    name: "meta_get_campaigns",
    description:
      "List all campaigns in the ad account with status, objective, budget, bid strategy, and dates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        limit: { type: "number", description: "Max campaigns to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_campaign_insights",
    description:
      "Get detailed performance insights for a specific campaign: spend, impressions, reach, clicks, CTR, CPC, CPM, conversions, ROAS, video metrics, quality scores, and more. Supports daily breakdown and optional demographic/placement breakdowns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        campaign_id: { type: "string", description: "Campaign ID" },
        ...dateRangeSchema,
        breakdowns: { type: "string", description: breakdownsDescription },
      },
      required: ["ad_account_id", "campaign_id", "since", "until"],
    },
  },

  // ── Ad Sets ──
  {
    name: "meta_get_ad_sets",
    description:
      "List ad sets with targeting, budget, optimization goal, billing event, and status. Optionally filter by campaign.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        campaign_id: { type: "string", description: "Optional: filter by campaign ID" },
        limit: { type: "number", description: "Max ad sets to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_ad_set_insights",
    description:
      "Get detailed performance insights for a specific ad set with all metrics and optional breakdowns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ad_set_id: { type: "string", description: "Ad Set ID" },
        ...dateRangeSchema,
        breakdowns: { type: "string", description: breakdownsDescription },
      },
      required: ["ad_account_id", "ad_set_id", "since", "until"],
    },
  },

  // ── Ads ──
  {
    name: "meta_get_ads",
    description:
      "List all ads with creative info, tracking specs, and status. Optionally filter by ad set.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ad_set_id: { type: "string", description: "Optional: filter by ad set ID" },
        limit: { type: "number", description: "Max ads to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_ad_insights",
    description:
      "Get detailed performance insights for a specific ad with all metrics and optional breakdowns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ad_id: { type: "string", description: "Ad ID" },
        ...dateRangeSchema,
        breakdowns: { type: "string", description: breakdownsDescription },
      },
      required: ["ad_account_id", "ad_id", "since", "until"],
    },
  },

  // ── Creatives ──
  {
    name: "meta_get_ad_creatives",
    description:
      "List all ad creatives with title, body, image/video URLs, CTA type, and thumbnails.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        limit: { type: "number", description: "Max creatives to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },

  // ── Account-Level Insights ──
  {
    name: "meta_get_account_insights",
    description:
      "Get account-level performance overview: total spend, impressions, reach, clicks, conversions, ROAS, and all other metrics aggregated across all campaigns. Supports breakdowns by demographics, device, and placement.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ...dateRangeSchema,
        breakdowns: { type: "string", description: breakdownsDescription },
        time_increment: {
          type: "string",
          description: "Time granularity: '1' for daily, '7' for weekly, 'monthly', 'all_days' for aggregate (default: '1')",
        },
      },
      required: ["ad_account_id", "since", "until"],
    },
  },

  // ── Audience / Demographics ──
  {
    name: "meta_get_audience_demographics",
    description:
      "Get audience breakdown by age, gender, country, device, platform, or placement. Returns spend, impressions, clicks, conversions broken down by the selected dimension.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ...dateRangeSchema,
        breakdown: {
          type: "string",
          description: "Dimension: age, gender, country, region, dma, device_platform, publisher_platform, platform_position, impression_device",
        },
      },
      required: ["ad_account_id", "since", "until", "breakdown"],
    },
  },

  // ── Custom Audiences ──
  {
    name: "meta_get_custom_audiences",
    description:
      "List all custom audiences (website visitors, customer lists, lookalikes) with size, status, source, and rules.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        limit: { type: "number", description: "Max audiences to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_saved_audiences",
    description:
      "List all saved audiences with targeting criteria and approximate size.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        limit: { type: "number", description: "Max audiences to return (default 100)" },
      },
      required: ["ad_account_id"],
    },
  },

  // ── Pixel / Conversions ──
  {
    name: "meta_get_pixels",
    description: "List Meta Pixels connected to the ad account with their code and last fire time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_pixel_stats",
    description: "Get event statistics for a specific Meta Pixel including all conversion events fired.",
    inputSchema: {
      type: "object" as const,
      properties: {
        pixel_id: { type: "string", description: "Pixel ID" },
        ...dateRangeSchema,
      },
      required: ["pixel_id", "since", "until"],
    },
  },
  {
    name: "meta_get_custom_conversions",
    description: "List all custom conversions with rules, event types, and last fire time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
      },
      required: ["ad_account_id"],
    },
  },

  // ── Budget / Spend ──
  {
    name: "meta_get_spend_history",
    description: "Get daily spend history for the ad account over a date range. Useful for budget pacing and trend analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
        ...dateRangeSchema,
      },
      required: ["ad_account_id", "since", "until"],
    },
  },

  // ── Facebook Page (Business Suite) ──
  {
    name: "meta_get_page_info",
    description:
      "Get Facebook Page details: name, category, fan count, followers, rating, website, contact info, and verification status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page_id: { type: "string", description: "Facebook Page ID" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "meta_get_page_insights",
    description:
      "Get Facebook Page insights: impressions (organic + paid), engaged users, post engagements, fan adds/removes, page views, video views, reactions, and negative feedback.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page_id: { type: "string", description: "Facebook Page ID" },
        ...dateRangeSchema,
        period: {
          type: "string",
          description: "Aggregation period: day, week, or days_28 (default: day)",
        },
      },
      required: ["page_id", "since", "until"],
    },
  },
  {
    name: "meta_get_page_posts",
    description:
      "Get Facebook Page posts with message, type, permalink, likes, comments, reactions, shares, and images.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page_id: { type: "string", description: "Facebook Page ID" },
        limit: { type: "number", description: "Max posts to return (default 50)" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "meta_get_post_insights",
    description:
      "Get detailed insights for a specific Facebook post: impressions, reach (organic + paid), engaged users, clicks, and reaction breakdown.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID (format: pageId_postId)" },
      },
      required: ["post_id"],
    },
  },

  // ── Instagram (Business Suite) ──
  {
    name: "meta_get_instagram_account",
    description:
      "Get Instagram business account details: username, bio, followers, following, media count, and profile picture.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ig_account_id: { type: "string", description: "Instagram Business Account ID" },
      },
      required: ["ig_account_id"],
    },
  },
  {
    name: "meta_get_instagram_insights",
    description:
      "Get Instagram account-level insights: impressions, reach, follower count, profile views, website clicks, email contacts, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ig_account_id: { type: "string", description: "Instagram Business Account ID" },
        ...dateRangeSchema,
      },
      required: ["ig_account_id", "since", "until"],
    },
  },
  {
    name: "meta_get_instagram_demographics",
    description:
      "Get Instagram follower demographics: age, gender, country, and city breakdowns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ig_account_id: { type: "string", description: "Instagram Business Account ID" },
      },
      required: ["ig_account_id"],
    },
  },
  {
    name: "meta_get_instagram_media",
    description:
      "Get Instagram posts/reels with captions, media type, likes, comments, and per-post insights (impressions, reach, engagement, saves, shares, plays).",
    inputSchema: {
      type: "object" as const,
      properties: {
        ig_account_id: { type: "string", description: "Instagram Business Account ID" },
        limit: { type: "number", description: "Max media items to return (default 50)" },
      },
      required: ["ig_account_id"],
    },
  },
  {
    name: "meta_get_instagram_stories",
    description: "Get recent Instagram stories with media type, URL, and timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ig_account_id: { type: "string", description: "Instagram Business Account ID" },
        limit: { type: "number", description: "Max stories to return (default 25)" },
      },
      required: ["ig_account_id"],
    },
  },

  // ── Lead Ads ──
  {
    name: "meta_get_lead_forms",
    description: "List lead gen forms with lead counts, questions, and status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ad_account_id: { type: "string", description: "Ad account ID (act_XXXXXXXXX)" },
      },
      required: ["ad_account_id"],
    },
  },
  {
    name: "meta_get_lead_form_data",
    description: "Get submitted lead data from a specific lead form.",
    inputSchema: {
      type: "object" as const,
      properties: {
        form_id: { type: "string", description: "Lead form ID" },
        limit: { type: "number", description: "Max leads to return (default 100)" },
      },
      required: ["form_id"],
    },
  },

  // ── Catalog / Commerce ──
  {
    name: "meta_get_product_catalogs",
    description: "List product catalogs owned by a business with product counts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        business_id: { type: "string", description: "Business Manager ID" },
      },
      required: ["business_id"],
    },
  },
  {
    name: "meta_get_catalog_products",
    description: "List products in a catalog with name, price, availability, image, and brand.",
    inputSchema: {
      type: "object" as const,
      properties: {
        catalog_id: { type: "string", description: "Product Catalog ID" },
        limit: { type: "number", description: "Max products to return (default 50)" },
      },
      required: ["catalog_id"],
    },
  },
];

// ─── Tool Handler ────────────────────────────────────────────────────────────

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  accessToken: string
): Promise<unknown> {
  const config = (adAccountId: string): MetaApiConfig => ({
    accessToken,
    adAccountId,
  });

  const dateRange = (a: Record<string, unknown>): DateRange => ({
    since: a.since as string,
    until: a.until as string,
  });

  switch (name) {
    // Account
    case "meta_get_ad_account":
      return api.getAdAccount(config(args.ad_account_id as string));
    case "meta_get_business_info":
      return api.getBusinessInfo(accessToken, args.business_id as string);

    // Campaigns
    case "meta_get_campaigns":
      return api.getCampaigns(config(args.ad_account_id as string), args.limit as number);
    case "meta_get_campaign_insights":
      return api.getCampaignInsights(
        config(args.ad_account_id as string),
        args.campaign_id as string,
        dateRange(args),
        args.breakdowns as string | undefined
      );

    // Ad Sets
    case "meta_get_ad_sets":
      return api.getAdSets(
        config(args.ad_account_id as string),
        args.campaign_id as string | undefined,
        args.limit as number
      );
    case "meta_get_ad_set_insights":
      return api.getAdSetInsights(
        config(args.ad_account_id as string),
        args.ad_set_id as string,
        dateRange(args),
        args.breakdowns as string | undefined
      );

    // Ads
    case "meta_get_ads":
      return api.getAds(
        config(args.ad_account_id as string),
        args.ad_set_id as string | undefined,
        args.limit as number
      );
    case "meta_get_ad_insights":
      return api.getAdInsights(
        config(args.ad_account_id as string),
        args.ad_id as string,
        dateRange(args),
        args.breakdowns as string | undefined
      );

    // Creatives
    case "meta_get_ad_creatives":
      return api.getAdCreatives(config(args.ad_account_id as string), args.limit as number);

    // Account Insights
    case "meta_get_account_insights":
      return api.getAccountInsights(
        config(args.ad_account_id as string),
        dateRange(args),
        args.breakdowns as string | undefined,
        (args.time_increment as string) || "1"
      );

    // Demographics
    case "meta_get_audience_demographics":
      return api.getAudienceInsights(
        config(args.ad_account_id as string),
        dateRange(args),
        args.breakdown as "age" | "gender" | "country" | "region" | "dma" | "device_platform" | "publisher_platform" | "platform_position" | "impression_device"
      );

    // Custom Audiences
    case "meta_get_custom_audiences":
      return api.getCustomAudiences(config(args.ad_account_id as string), args.limit as number);
    case "meta_get_saved_audiences":
      return api.getSavedAudiences(config(args.ad_account_id as string), args.limit as number);

    // Pixel / Conversions
    case "meta_get_pixels":
      return api.getPixels(config(args.ad_account_id as string));
    case "meta_get_pixel_stats":
      return api.getPixelStats(accessToken, args.pixel_id as string, dateRange(args));
    case "meta_get_custom_conversions":
      return api.getCustomConversions(config(args.ad_account_id as string));

    // Budget
    case "meta_get_spend_history":
      return api.getAccountSpendHistory(config(args.ad_account_id as string), dateRange(args));

    // Facebook Page
    case "meta_get_page_info":
      return api.getPageInfo(accessToken, args.page_id as string);
    case "meta_get_page_insights":
      return api.getPageInsights(
        accessToken,
        args.page_id as string,
        dateRange(args),
        (args.period as "day" | "week" | "days_28") || "day"
      );
    case "meta_get_page_posts":
      return api.getPagePosts(accessToken, args.page_id as string, args.limit as number);
    case "meta_get_post_insights":
      return api.getPostInsights(accessToken, args.post_id as string);

    // Instagram
    case "meta_get_instagram_account":
      return api.getInstagramAccount(accessToken, args.ig_account_id as string);
    case "meta_get_instagram_insights":
      return api.getInstagramInsights(accessToken, args.ig_account_id as string, dateRange(args));
    case "meta_get_instagram_demographics":
      return api.getInstagramDemographics(accessToken, args.ig_account_id as string);
    case "meta_get_instagram_media":
      return api.getInstagramMedia(accessToken, args.ig_account_id as string, args.limit as number);
    case "meta_get_instagram_stories":
      return api.getInstagramStories(accessToken, args.ig_account_id as string, args.limit as number);

    // Lead Ads
    case "meta_get_lead_forms":
      return api.getLeadForms(config(args.ad_account_id as string));
    case "meta_get_lead_form_data":
      return api.getLeadFormData(accessToken, args.form_id as string, args.limit as number);

    // Catalog
    case "meta_get_product_catalogs":
      return api.getProductCatalogs(accessToken, args.business_id as string);
    case "meta_get_catalog_products":
      return api.getCatalogProducts(accessToken, args.catalog_id as string, args.limit as number);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
