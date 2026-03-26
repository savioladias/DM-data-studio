/**
 * OAuth callback handler
 * Receives authorization code from OAuth provider and exchanges for tokens
 * Stores tokens in ProjectCredential table
 */

import { db } from '@/lib/db'
import { exchangeCodeForToken } from '@/lib/integrations/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const stateEncoded = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Decode state parameter to extract platform and projectId
    let state: string = ''
    let platform: string = ''

    if (stateEncoded) {
      try {
        const decoded = Buffer.from(stateEncoded, 'base64').toString('utf-8')
        const stateObj = JSON.parse(decoded)
        platform = stateObj.platform
        state = stateObj.projectId
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid state parameter' },
          { status: 400 }
        )
      }
    }

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/projects/${state}/settings?error=${error}&description=${errorDescription}`
      )
    }

    if (!code || !state || !platform) {
      return NextResponse.json(
        { error: 'Missing required parameters (code, state, platform)' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    let tokens = await exchangeCodeForToken(platform, code)

    // For Meta platforms, exchange the short-lived token for a long-lived one (60 days)
    if (platform === 'META_ADS' || platform === 'FACEBOOK' || platform === 'INSTAGRAM') {
      try {
        const appId = process.env.META_APP_ID
        const appSecret = process.env.META_APP_SECRET
        const shortToken = tokens.access_token
        if (appId && appSecret && shortToken) {
          const llRes = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
          )
          if (llRes.ok) {
            const llData = await llRes.json()
            if (llData.access_token) {
              tokens = { ...tokens, ...llData }
            }
          }
        }
      } catch (e) {
        console.warn('Long-lived token exchange failed, using short-lived token:', e)
      }
    }

    // Determine account name and ID based on platform
    let accountName = platform
    let accountId = null

    // For Google services, we can extract the email later
    // For Meta, we'd need to make an additional API call to get ad account info
    if (platform === 'GOOGLE_ANALYTICS') {
      // With GA4, we need to extract the property ID from the authorization
      // This is typically provided by the user, so we'll store a placeholder
      accountName = 'Google Analytics 4'
      accountId = 'pending-property-selection'
    } else if (platform === 'META_ADS') {
      accountName = 'Meta Ads Manager'
      accountId = 'pending-account-selection'
    } else if (platform === 'GOOGLE_SEARCH_CONSOLE') {
      accountName = 'Google Search Console'
      accountId = 'pending-site-selection'
    } else if (platform === 'LINKEDIN_ORGANIC') {
      accountName = 'LinkedIn Company Page'
      accountId = 'pending-org-selection'
    } else if (platform === 'FACEBOOK') {
      accountName = 'Facebook Page'
      accountId = 'pending-page-selection'
    } else if (platform === 'INSTAGRAM') {
      accountName = 'Instagram Business Account'
      accountId = 'pending-page-selection'
    } else if (platform === 'YOUTUBE') {
      accountName = 'YouTube Channel'
      accountId = 'pending-channel-selection'
    } else if (platform === 'GOOGLE_ADS') {
      accountName = 'Google Ads Account'
      accountId = 'pending-account-selection'
    }

    // Calculate token expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    // Check if credential already exists (reconnect case)
    const existing = await db.projectCredential.findUnique({
      where: { projectId_channel: { projectId: state, channel: platform } },
    })

    // On reconnect, preserve the existing accountId/accountName so the user
    // doesn't lose their previously selected property/page/etc.
    const updateAccountId = existing?.accountId && existing.accountId !== 'pending-property-selection'
      && existing.accountId !== 'pending-site-selection'
      && existing.accountId !== 'pending-org-selection'
      && existing.accountId !== 'pending-page-selection'
      && existing.accountId !== 'pending-channel-selection'
      && existing.accountId !== 'pending-account-selection'
      ? existing.accountId
      : accountId

    const updateAccountName = existing?.accountName && existing.accountName !== platform
      ? existing.accountName
      : accountName

    // Save or update credential
    await db.projectCredential.upsert({
      where: {
        projectId_channel: {
          projectId: state,
          channel: platform,
        },
      },
      create: {
        projectId: state,
        channel: platform,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        accountId,
        accountName,
        metadata: JSON.stringify({
          tokenType: tokens.token_type || 'Bearer',
          scope: tokens.scope || '',
          connectedAt: new Date().toISOString(),
        }),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        accountId: updateAccountId,
        accountName: updateAccountName,
        metadata: JSON.stringify({
          tokenType: tokens.token_type || 'Bearer',
          scope: tokens.scope || '',
          connectedAt: new Date().toISOString(),
        }),
      },
    })

    // Redirect back to project settings with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/projects/${state}/settings?connected=${platform}&success=true`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)

    // Try to extract projectId from state for error redirect
    const stateEncoded = new URL(req.url).searchParams.get('state')
    let projectId = ''
    if (stateEncoded) {
      try {
        const decoded = Buffer.from(stateEncoded, 'base64').toString('utf-8')
        const stateObj = JSON.parse(decoded)
        projectId = stateObj.projectId
      } catch (e) {
        // Couldn't decode state
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/projects/${projectId}/settings?error=connection_failed&details=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    )
  }
}
