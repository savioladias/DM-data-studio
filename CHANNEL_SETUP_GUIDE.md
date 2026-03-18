# DM Data Studio — Channel Connection Guide

This guide walks your team through connecting each marketing channel to your DM Data Studio dashboard. Once connected, you'll see live data updates for all key metrics.

---

## Quick Start

1. Navigate to your project
2. Click **Settings** (bottom left sidebar)
3. Scroll to **Connected Channels**
4. Enable the channels you need
5. Click **Save Channels**
6. Return to Settings and click **Connect** on each channel

---

## Channels That Require Authorization

These channels need OAuth login to connect. You'll be redirected to each platform to approve access.

### 1. Google Analytics 4 (GA4)

**What you'll see:** Website traffic, user behavior, conversions, engagement metrics

**Setup Steps:**
1. In Settings → Connected Channels, find **Google Analytics 4**
2. Click **Connect**
3. Sign in with your Google account
4. Select your **GA4 property** from the dropdown
5. Connection complete — data will appear within 1-2 minutes

**Requirements:**
- Google account with access to your GA4 property
- Admin or Editor role in GA4

**Data Provided:**
- Sessions, Users, New Users, Engagement Rate, Engaged Sessions, Conversions

---

### 2. Google Search Console (GSC)

**What you'll see:** Organic search performance, keywords, CTR, impressions, rankings

**Setup Steps:**
1. In Settings → Connected Channels, find **Search Console**
2. Click **Connect**
3. Sign in with your Google account
4. Select your **verified website** from the dropdown
5. Connection complete

**Requirements:**
- Google account with Search Console access
- Your website must be verified in Search Console
- Owner or Full user permission

**Data Provided:**
- Clicks, Impressions, CTR, Average Position

---

### 3. Google Ads

**What you'll see:** Campaign performance, cost, conversions, ROI metrics

**Setup Steps:**
1. In Settings → Connected Channels, find **Google Ads**
2. Click **Connect**
3. Sign in with your Google account
4. Approve access to your Google Ads account
5. If you manage multiple accounts, select your account ID
6. Data will sync automatically

**Requirements:**
- Google account with Google Ads access
- Admin access to the Ads account
- At least 1 active campaign

**Data Provided:**
- Clicks, CTR, Impressions, Conversions, Cost Per Conversion, Total Spend, Avg CPC, Avg CPM

---

### 4. Meta Ads (Facebook & Instagram Ads)

**What you'll see:** Ad spend, reach, conversions, engagement across Facebook & Instagram

**Setup Steps:**
1. In Settings → Connected Channels, find **Meta Ads**
2. Click **Connect**
3. Sign in with your Facebook/Meta account
4. Approve permissions to access your ad accounts
5. Select your **Ad Account** from the dropdown
6. Data will sync every hour

**Requirements:**
- Facebook/Meta account
- Admin or Analyst role in your Ad Account
- At least 1 active ad campaign

**Data Provided:**
- Spend, Reach, Impressions, Link Clicks, Conversions, CTR, Cost Per Conversion

---

### 5. Facebook (Organic)

**What you'll see:** Page performance, followers, engagement, reach

**Setup Steps:**
1. In Settings → Connected Channels, find **Facebook**
2. Click **Connect**
3. Sign in with your Facebook account
4. Select your **Business Page** from the dropdown
5. Approve access to page insights
6. Data updates daily

**Requirements:**
- Facebook account
- Access to the business page
- Page admin permissions

**Data Provided:**
- Followers, Reach, Engagement, Link Clicks, Profile Visitors, Page Visits, New Follows

---

### 6. Instagram (Organic)

**What you'll see:** Account growth, engagement rate, followers, content performance

**Setup Steps:**
1. In Settings → Connected Channels, find **Instagram**
2. Click **Connect**
3. Sign in with your Instagram/Facebook account
4. Select your **Instagram Business Account** from the dropdown
5. Approve permissions
6. Data updates daily

**Requirements:**
- Instagram Business Account (not Personal)
- Connected to a Facebook Business Page
- Admin access to the Business Account

**Data Provided:**
- Followers, Reach, Engagement, Link Clicks, Profile Visitors, Profile Visits, New Follows

---

### 7. LinkedIn (Organic)

**What you'll see:** Company page followers, engagement, impressions, clicks

**Setup Steps:**
1. In Settings → Connected Channels, find **LinkedIn**
2. Click **Connect**
3. Sign in with your LinkedIn account
4. Select your **Company Page** from the dropdown
5. Approve page access
6. Data updates weekly

**Requirements:**
- LinkedIn account
- Admin or Analyst role on the Company Page
- Company page must have at least 1 post

**Data Provided:**
- Followers, Search Appearances, New Follows, Post Impressions, Page Visitors, Reactions, Comments, Reposts, Page Views, Clicks

---

### 8. YouTube

**What you'll see:** Video performance, views, watch time, subscribers, revenue

**Setup Steps:**
1. In Settings → Connected Channels, find **YouTube**
2. Click **Connect**
3. Sign in with your YouTube/Google account
4. Select your **YouTube Channel** from the dropdown
5. Approve channel access
6. Data will appear within 24 hours

**Requirements:**
- YouTube account with Channel access
- Channel owner or manager role
- At least 1 video upload

**Data Provided:**
- Views, Watch Time, Subscribers, Revenue (if monetized)

---

## Channels That Use Mock Data (No Setup Required)

These channels show sample data and don't require API connections yet. You can still view insights and trends.

### TikTok Ads
- Shows: Spend, Reach, Impressions, Link Clicks, Conversions, CTR, Cost Per Conversion
- Status: Mock data (real integration coming soon)

### LinkedIn Ads
- Shows: Spend, Reach, Impressions, Link Clicks, Conversions, CTR, Cost Per Conversion
- Status: Mock data (real integration coming soon)

### Snapchat Ads
- Shows: Spend, Reach, Impressions, Link Clicks, Conversions, CTR, Cost Per Conversion
- Status: Mock data (real integration coming soon)

### Email Marketing (Mailchimp, Klaviyo, HubSpot, ActiveCampaign)
- Shows: Emails Sent, Opens, Open Rate, Clicks, Click Rate, Bounce Rate, Unsubscribe Rate
- Status: Mock data (real integration coming soon)

---

## Troubleshooting

### "Connection Failed" or "Access Denied"

**For Google services (GA4, GSC, Google Ads):**
- ✅ Make sure you're signed into the correct Google account
- ✅ Check that your account has proper permissions (Admin/Editor role)
- ✅ Try signing out of Google completely, then reconnect

**For Meta/Facebook:**
- ✅ Ensure the account has admin access to the Business or Ad Account
- ✅ Check that the account isn't restricted or limited
- ✅ Try reconnecting through a different browser

**For LinkedIn:**
- ✅ Verify you have admin access to the Company Page
- ✅ Check that the page has at least 1 post
- ✅ Try signing out of LinkedIn completely before reconnecting

### Data Not Showing Up

- **Wait 1-2 minutes:** Initial sync may take a few minutes
- **Check permissions:** Ensure your account has the right access level
- **Check data availability:** Some channels require active campaigns or posts
- **Refresh the page:** Press F5 to refresh the dashboard

### Some Metrics Missing

Not all channels have all metrics immediately available:
- **New accounts:** May take 24-48 hours to accumulate data
- **Low activity:** Metrics with 0 activity might not display
- **Inactive campaigns:** Paused campaigns may not sync

---

## Tips for Your Team

✅ **Use the same account consistently** — If different team members connect channels, use the main business account to avoid permission issues

✅ **Document your setup** — Note which accounts are connected to which project

✅ **Update permissions yearly** — Review who has access to connected accounts

✅ **Check project settings regularly** — Toggle channels on/off as needed based on your focus areas

✅ **Use the Zoho Project ID field** — Link your dashboard to Zoho for integrated project management

---

## Questions or Issues?

If a team member encounters issues:
1. Check the troubleshooting section above
2. Verify they have proper permissions in the connected platform
3. Try disconnecting and reconnecting the channel
4. Clear browser cache and try again

---

**Last Updated:** March 2026
**Dashboard Version:** 2.0
