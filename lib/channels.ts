export type ChannelId =
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'LINKEDIN_ORGANIC'
  | 'TIKTOK'
  | 'TWITTER'
  | 'YOUTUBE'
  | 'PINTEREST'
  | 'GOOGLE_ADS'
  | 'META_ADS'
  | 'LINKEDIN_ADS'
  | 'TIKTOK_ADS'
  | 'TWITTER_ADS'
  | 'MICROSOFT_ADS'
  | 'PINTEREST_ADS'
  | 'SNAPCHAT_ADS'
  | 'GOOGLE_ANALYTICS'
  | 'GOOGLE_SEARCH_CONSOLE'
  | 'MAILCHIMP'
  | 'KLAVIYO'
  | 'HUBSPOT'
  | 'ACTIVE_CAMPAIGN'

export interface ChannelDef {
  id: ChannelId
  label: string
  description: string
  color: string
  category: ChannelCategory
}

export type ChannelCategory =
  | 'Organic Social'
  | 'Paid Advertising'
  | 'Analytics & SEO'
  | 'Email Marketing'

export const CHANNELS: ChannelDef[] = [
  // Organic Social
  { id: 'INSTAGRAM', label: 'Instagram', description: 'Organic posts, stories, reels & audience insights', color: '#E1306C', category: 'Organic Social' },
  { id: 'FACEBOOK', label: 'Facebook', description: 'Page performance, reach & engagement metrics', color: '#1877F2', category: 'Organic Social' },
  { id: 'LINKEDIN_ORGANIC', label: 'LinkedIn', description: 'Company page followers, posts & impressions', color: '#0A66C2', category: 'Organic Social' },
  { id: 'TIKTOK', label: 'TikTok', description: 'Video performance, followers & engagement', color: '#000000', category: 'Organic Social' },
  { id: 'TWITTER', label: 'X / Twitter', description: 'Tweets, impressions & engagement rate', color: '#1DA1F2', category: 'Organic Social' },
  { id: 'YOUTUBE', label: 'YouTube', description: 'Views, watch time, subscribers & revenue', color: '#FF0000', category: 'Organic Social' },
  { id: 'PINTEREST', label: 'Pinterest', description: 'Pin impressions, saves & outbound clicks', color: '#E60023', category: 'Organic Social' },

  // Paid Advertising
  { id: 'GOOGLE_ADS', label: 'Google Ads', description: 'Search, Display, Shopping, YouTube & Performance Max', color: '#4285F4', category: 'Paid Advertising' },
  { id: 'META_ADS', label: 'Meta Ads', description: 'Facebook & Instagram ad campaigns', color: '#0081FB', category: 'Paid Advertising' },
  { id: 'LINKEDIN_ADS', label: 'LinkedIn Ads', description: 'Sponsored content, message & lead gen ads', color: '#0A66C2', category: 'Paid Advertising' },
  { id: 'TIKTOK_ADS', label: 'TikTok Ads', description: 'In-feed, TopView & Spark ad campaigns', color: '#69C9D0', category: 'Paid Advertising' },
  { id: 'TWITTER_ADS', label: 'X Ads', description: 'Promoted posts, follower & app install campaigns', color: '#1DA1F2', category: 'Paid Advertising' },
  { id: 'MICROSOFT_ADS', label: 'Microsoft Ads', description: 'Bing Search & Audience Network campaigns', color: '#00809D', category: 'Paid Advertising' },
  { id: 'PINTEREST_ADS', label: 'Pinterest Ads', description: 'Promoted Pins & shopping campaigns', color: '#E60023', category: 'Paid Advertising' },
  { id: 'SNAPCHAT_ADS', label: 'Snapchat Ads', description: 'Snap ads, filters & lens campaigns', color: '#FFFC00', category: 'Paid Advertising' },

  // Analytics & SEO
  { id: 'GOOGLE_ANALYTICS', label: 'Google Analytics 4', description: 'Website traffic, conversions & user behaviour', color: '#E37400', category: 'Analytics & SEO' },
  { id: 'GOOGLE_SEARCH_CONSOLE', label: 'Search Console', description: 'Organic keywords, rankings & click-through rates', color: '#34A853', category: 'Analytics & SEO' },

  // Email Marketing
  { id: 'MAILCHIMP', label: 'Mailchimp', description: 'Email campaigns, open rates & subscriber growth', color: '#FFE01B', category: 'Email Marketing' },
  { id: 'KLAVIYO', label: 'Klaviyo', description: 'Email & SMS performance, revenue attribution', color: '#1E1E1E', category: 'Email Marketing' },
  { id: 'HUBSPOT', label: 'HubSpot', description: 'Email, CRM & marketing automation metrics', color: '#FF7A59', category: 'Email Marketing' },
  { id: 'ACTIVE_CAMPAIGN', label: 'ActiveCampaign', description: 'Email automations & campaign performance', color: '#356AE6', category: 'Email Marketing' },
]

export const CHANNEL_GROUPS: Record<ChannelCategory, ChannelDef[]> = {
  'Organic Social': CHANNELS.filter(c => c.category === 'Organic Social'),
  'Paid Advertising': CHANNELS.filter(c => c.category === 'Paid Advertising'),
  'Analytics & SEO': CHANNELS.filter(c => c.category === 'Analytics & SEO'),
  'Email Marketing': CHANNELS.filter(c => c.category === 'Email Marketing'),
}

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  'Organic Social',
  'Paid Advertising',
  'Analytics & SEO',
  'Email Marketing',
]

export function getChannel(id: ChannelId): ChannelDef | undefined {
  return CHANNELS.find(c => c.id === id)
}

export function getChannelsByCategory(category: ChannelCategory): ChannelDef[] {
  return CHANNELS.filter(c => c.category === category)
}

export function getChannelCategory(channelId: ChannelId): ChannelCategory | undefined {
  return CHANNELS.find(c => c.id === channelId)?.category
}

// Nav items to show in the project sidebar based on enabled channels
export function getProjectNavItems(enabledChannels: ChannelId[]) {
  const hasOrganic = enabledChannels.some(c => CHANNELS.find(ch => ch.id === c)?.category === 'Organic Social')
  const hasPaid = enabledChannels.some(c => CHANNELS.find(ch => ch.id === c)?.category === 'Paid Advertising')
  const hasAnalytics = enabledChannels.some(c => CHANNELS.find(ch => ch.id === c)?.category === 'Analytics & SEO')
  const hasEmail = enabledChannels.some(c => CHANNELS.find(ch => ch.id === c)?.category === 'Email Marketing')

  const organicChannels = enabledChannels.filter(c => CHANNELS.find(ch => ch.id === c)?.category === 'Organic Social')
  const paidChannels = enabledChannels.filter(c => CHANNELS.find(ch => ch.id === c)?.category === 'Paid Advertising')

  return {
    hasOrganic,
    hasPaid,
    hasAnalytics,
    hasEmail,
    organicChannels,
    paidChannels,
  }
}
