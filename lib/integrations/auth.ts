/**
 * OAuth helpers for platform integrations
 * Handles authorization URL generation, token exchange, and refresh
 */

import type { ChannelId } from '@/lib/channels'

export interface OAuthConfig {
  platform: ChannelId
  clientId: string
  clientSecret: string
  redirectUri: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
}

/**
 * Get OAuth configs for all platforms
 */
function getAllOAuthConfigs(): Record<string, OAuthConfig> {
  const baseRedirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/callback`

  return {
    GOOGLE_ANALYTICS: {
      platform: 'GOOGLE_ANALYTICS',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly', // Read GA4 data and admin (list properties)
      ],
    },
    GOOGLE_ADS: {
      platform: 'GOOGLE_ADS',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/adwords',
      ],
    },
    META_ADS: {
      platform: 'META_ADS',
      clientId: process.env.META_APP_ID || '',
      clientSecret: process.env.META_APP_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.instagram.com/v18.0/oauth/access_token',
      scopes: [
        'ads_management',
        'business_basic',
      ],
    },
    GOOGLE_SEARCH_CONSOLE: {
      platform: 'GOOGLE_SEARCH_CONSOLE',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/webmasters.readonly',
      ],
    },
    LINKEDIN_ORGANIC: {
      platform: 'LINKEDIN_ORGANIC',
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: [
        'r_organization_social',
      ],
    },
    FACEBOOK: {
      platform: 'FACEBOOK',
      clientId: process.env.META_APP_ID || '',
      clientSecret: process.env.META_APP_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.instagram.com/v18.0/oauth/access_token',
      scopes: [
        'pages_read_engagement',
      ],
    },
    INSTAGRAM: {
      platform: 'INSTAGRAM',
      clientId: process.env.META_APP_ID || '',
      clientSecret: process.env.META_APP_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.instagram.com/v18.0/oauth/access_token',
      scopes: [
        'pages_read_engagement',
      ],
    },
    YOUTUBE: {
      platform: 'YOUTUBE',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: baseRedirectUri,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    },
  }
}

export function getOAuthConfig(platform: string): OAuthConfig {
  const configs = getAllOAuthConfigs()
  const config = configs[platform]

  if (!config) {
    throw new Error(`No OAuth config found for platform: ${platform}`)
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing OAuth credentials for ${platform}. Check your .env.local`)
  }

  return config
}

/**
 * Generate authorization URL for user to click
 */
export function getAuthorizationUrl(platform: string, projectId: string): string {
  const config = getOAuthConfig(platform)

  // Encode both platform and projectId in state parameter
  const state = JSON.stringify({ platform, projectId })
  const stateEncoded = Buffer.from(state).toString('base64')

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: stateEncoded,
    access_type: 'offline', // Get refresh token
  })

  return `${config.authUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for access & refresh tokens
 */
export async function exchangeCodeForToken(platform: string, code: string) {
  const config = getOAuthConfig(platform)

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(platform: string, refreshToken: string) {
  const config = getOAuthConfig(platform)

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}
