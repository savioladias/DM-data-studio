# MCP Meta Ads - Meta Ads Manager & Business Suite

MCP server for DM Data Studio that connects to Meta's Marketing API and Graph API to pull **all** client advertising and page data, per-project.

## 33 Tools Available

### Ad Account & Business
- `meta_get_ad_account` - Account details, balance, spend, status
- `meta_get_business_info` - Business Manager info

### Campaigns
- `meta_get_campaigns` - List all campaigns with objectives, budgets, status
- `meta_get_campaign_insights` - Full performance metrics with breakdowns

### Ad Sets
- `meta_get_ad_sets` - List ad sets with targeting and budgets
- `meta_get_ad_set_insights` - Ad set performance metrics

### Ads
- `meta_get_ads` - List ads with creative and tracking info
- `meta_get_ad_insights` - Individual ad performance

### Creatives
- `meta_get_ad_creatives` - All ad creatives with images, videos, CTAs

### Account Insights
- `meta_get_account_insights` - Aggregate account performance
- `meta_get_audience_demographics` - Breakdown by age/gender/country/device/platform
- `meta_get_spend_history` - Daily spend history

### Audiences
- `meta_get_custom_audiences` - Custom audiences (website, lists, lookalikes)
- `meta_get_saved_audiences` - Saved targeting audiences

### Conversion Tracking
- `meta_get_pixels` - Meta Pixels
- `meta_get_pixel_stats` - Pixel event statistics
- `meta_get_custom_conversions` - Custom conversion rules

### Facebook Page (Business Suite)
- `meta_get_page_info` - Page details, followers, rating
- `meta_get_page_insights` - Page impressions, engagement, fan growth
- `meta_get_page_posts` - Posts with likes, comments, shares
- `meta_get_post_insights` - Per-post reach, clicks, reactions

### Instagram (Business Suite)
- `meta_get_instagram_account` - Account info, followers, bio
- `meta_get_instagram_insights` - Account reach, impressions, profile views
- `meta_get_instagram_demographics` - Follower age/gender/location breakdown
- `meta_get_instagram_media` - Posts/Reels with per-media insights
- `meta_get_instagram_stories` - Recent stories

### Lead Ads
- `meta_get_lead_forms` - Lead gen forms with counts
- `meta_get_lead_form_data` - Submitted lead data

### Commerce
- `meta_get_product_catalogs` - Product catalogs
- `meta_get_catalog_products` - Products in a catalog

## Setup

### 1. Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create or select your app
3. Enable **Marketing API** under Products
4. Under App Settings > Basic, note your **App ID** and **App Secret**

### 2. Access Token

You need a **System User Access Token** with these permissions:
- `ads_read` - Read ad data
- `ads_management` - Access campaign structure
- `business_management` - Business Manager access
- `read_insights` - Performance insights
- `pages_read_engagement` - Facebook Page data
- `instagram_basic` - Instagram account info
- `instagram_manage_insights` - Instagram insights
- `leads_retrieval` - Lead form data
- `catalog_management` - Product catalog access

**To generate:**
1. Go to Business Manager > Business Settings > System Users
2. Create a system user (or use existing)
3. Generate a token with the scopes above
4. The token is long-lived (60 days for system users)

### 3. Environment Variable

```bash
# Single token for all projects
export META_ACCESS_TOKEN="your_long_lived_token_here"

# Or per-project tokens (each client gets their own)
export META_ACCESS_TOKEN_project123="client_a_token"
export META_ACCESS_TOKEN_project456="client_b_token"

# Or per-ad-account tokens
export META_ACCESS_TOKEN_123456789="token_for_act_123456789"
```

### 4. Install & Build

```bash
cd mcp-meta-ads
npm install
npm run build
```

### 5. Configure in Claude Code

Add to your `.claude/settings.json` or Claude Desktop config:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "node",
      "args": ["./mcp-meta-ads/dist/index.js"],
      "env": {
        "META_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 6. Run in Development

```bash
npm run dev
```

## Per-Project Architecture

Each project in DM Data Studio maps to a different client's ad account:

```
Project "Client A" → ad_account_id: act_111111111
Project "Client B" → ad_account_id: act_222222222
Project "Client C" → ad_account_id: act_333333333
```

When calling any tool, pass the client's `ad_account_id` to scope data to that project.

You can also set per-project access tokens via environment variables if clients have separate Business Managers.

## Insight Metrics Available

Every insight tool returns these fields (where applicable):

| Category | Metrics |
|----------|---------|
| **Core** | spend, impressions, reach, frequency, clicks, unique_clicks, cpc, cpm, cpp, ctr, unique_ctr |
| **Engagement** | inline_link_clicks, inline_post_engagement, outbound_clicks, social_spend |
| **Conversions** | actions, action_values, conversions, conversion_values, cost_per_action_type, cost_per_conversion |
| **Video** | video_play_actions, video_p25/p50/p75/p100_watched, video_avg_time_watched, thruplay, cost_per_thruplay |
| **Commerce** | website_purchase_roas, purchase_roas, catalog_segment_actions/value |
| **Quality** | quality_ranking, engagement_rate_ranking, conversion_rate_ranking |

### Breakdown Dimensions

All insight tools support optional breakdowns:
- `age` - Age ranges (18-24, 25-34, etc.)
- `gender` - Male, Female, Unknown
- `country` - Country codes
- `region` - State/Province
- `dma` - Designated Market Area
- `device_platform` - Mobile, Desktop, Tablet
- `publisher_platform` - Facebook, Instagram, Audience Network, Messenger
- `platform_position` - Feed, Stories, Reels, Right Column, etc.
- `impression_device` - iPhone, Android, Desktop, etc.
