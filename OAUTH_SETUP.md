# OAuth Integration Setup Guide

This document describes how to set up OAuth integrations with Google Analytics, Google Ads, and Meta platforms.

## Google OAuth Setup (GA4 + Google Ads)

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: click "Select a Project" → "New Project"
3. Name it "DM Data Studio"
4. Wait for the project to be created

### 2. Enable APIs

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Analytics Data API** (v1beta)
   - **Google Ads API** (optional, for later)

### 3. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URI:
   - `http://localhost:3000/api/integrations/callback`
5. Copy the **Client ID** and **Client Secret**

### 4. Update .env.local

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Meta OAuth Setup (Meta Ads)

### 1. Create Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as app type
4. Fill in app details (name: "DM Data Studio")

### 2. Configure App

1. In your app, go to "Settings" → "Basic"
2. Copy the **App ID** and **App Secret**
3. Go to "Settings" → "Basic" → "App Domains"
4. Add: `localhost:3000`

### 3. Configure OAuth Redirect URIs

1. Go to "Products" → "Facebook Login" → "Settings"
2. In "Valid OAuth Redirect URIs", add:
   - `http://localhost:3000/api/integrations/callback`
3. Save changes

### 4. Request Permissions

1. Go to "App Roles" → "Test Users"
2. Create a test user for development
3. Your app needs these permissions:
   - `ads_management` — manage ad accounts
   - `business_basic` — access business info

### 5. Update .env.local

```bash
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
```

## Using OAuth in the App

### Connect a Platform

1. Go to Project Settings → Connected Channels
2. For any platform with OAuth support (Google Analytics, Meta Ads, etc.), you'll see a "Connect" button
3. Click the button → redirects to provider login
4. Authorize the app
5. Redirects back to settings with token saved

### How It Works

1. **Authorization**: User clicks "Connect" → redirected to provider
2. **Code Exchange**: User authorizes → provider redirects back with auth code
3. **Token Storage**: Code exchanged for access token → stored in `ProjectCredential` table
4. **Data Fetching**: When dashboard loads, app uses stored token to fetch real data
5. **Token Refresh**: If token expires, app automatically refreshes using refresh token

## Troubleshooting

### "Missing OAuth credentials"

- Check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc. are set in .env.local
- Restart the dev server after updating .env.local

### "Token exchange failed"

- Verify redirect URIs match exactly in OAuth provider settings
- Check that the authorization code hasn't expired (they're short-lived)
- Look at console logs for the specific error

### "API error when fetching metrics"

- For GA4: Verify the property ID is correct in the credential settings
- Check that the Google Analytics API is enabled in Cloud Console
- Verify API quota limits haven't been exceeded

## Production Deployment

When deploying to production:

1. Update all redirect URIs to your production domain:
   - `https://yourdomain.com/api/integrations/callback`

2. For Google Cloud:
   - Use OAuth Consent Screen "Production" status
   - Add required scopes to consent screen
   - List your app in Google's app verification process

3. For Meta:
   - Move app out of development mode
   - Complete Meta's app review process
   - Use production API endpoints (currently using v18.0)

## Current Status

- ✅ Google Analytics 4 integration implemented
- ✅ OAuth callback route ready
- ⏳ Meta Ads integration (auth ready, data fetcher WIP)
- ⏳ Other platforms (coming soon)
