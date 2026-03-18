# DM Data Studio — AI Setup Guide

Your dashboard uses **Google Generative AI (Gemini)** for AI-powered insights. Follow these steps to enable it.

---

## Step 1: Get a Google Generative AI API Key

### A. Create a Google Cloud Project (if you don't have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project**
3. Name it: `DM Data Studio` (or your preference)
4. Click **Create**
5. Wait for the project to be created (1-2 minutes)

### B. Get Your API Key from Google AI Studio (Easiest Method)

This is the **fastest way** for development:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → **Create API key in new Google Cloud project**
3. Google will automatically create a project and API key for you
4. **Copy the API Key** (you'll use this in step 2)

**Or, if you already have a Google Cloud project:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → **Create API key in existing project**
3. Select your existing project
4. Click **Create API Key**
5. **Copy the API Key**

---

## Step 2: Add API Key to Your Environment

### A. Find Your `.env.local` File

```bash
# In your project root directory, the file should be:
/Users/savioladias/dm-data-studio/.env.local
```

### B. Add the API Key

Open `.env.local` and add this line:

```
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_API_KEY_HERE
```

**Replace `YOUR_API_KEY_HERE`** with the actual API key you copied from Step 1.

**Example:**
```
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDxExample1234567890abcdefghijk
```

### C. Save the File

- Press **Ctrl+S** (Windows) or **Cmd+S** (Mac)
- Make sure the file is saved

---

## Step 3: Restart Your Development Server

The environment variable only loads when the server starts.

### A. Stop the Server

If your dev server is running, stop it:
- Press **Ctrl+C** in the terminal

### B. Restart the Server

```bash
npm run dev
```

Wait for the server to start (you should see "ready - started server on 0.0.0.0:3000, url: http://localhost:3000")

---

## Step 4: Verify AI is Working

### A. Open Your Dashboard

1. Go to http://localhost:3000
2. Log in to your account
3. Select a project
4. Click **AI Summary** in the sidebar

### B. Check for Success Indicators

✅ **If AI is working:**
- You'll see **"Generate AI Summary"** buttons on each channel
- No yellow warning banner at the top
- You can click buttons and get AI-generated summaries

❌ **If AI is NOT working:**
- You'll see a **yellow warning banner** saying "AI Features Unavailable"
- Buttons will be disabled/grayed out
- Check the troubleshooting section below

### C. Test It

1. Go to **AI Summary** page
2. Click **"Generate AI Summary"** on any channel
3. Wait 5-10 seconds for the AI response
4. You should see a summary of that channel's performance

---

## Step 5: Monitor AI Limits (Important!)

### Free Tier Limits

Google's free tier has these limits:
- **60 requests per minute** (usually plenty for development)
- **1.5 million tokens per month** (tokens = text processed)

**Monitor your usage:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click your API key
3. Scroll down to see **Quota** and **Usage**

### If You Hit Limits

**Option 1: Switch to Paid Plan**
1. Set up a billing account in [Google Cloud Console](https://console.cloud.google.com)
2. Add a credit card
3. Your API key will automatically get higher limits ($0.075 per 1M tokens)

**Option 2: Wait for Reset**
- Free tier resets monthly on the first day

**Option 3: Use Different API Key**
- Create a new API key with a fresh free tier

---

## Troubleshooting

### ❌ "AI Features Unavailable" Banner

**Cause:** API key is missing or invalid

**Fix:**
1. Double-check your API key is correct (copy-paste it again)
2. Make sure `.env.local` file exists in the project root
3. Make sure you added the key exactly as shown: `GOOGLE_GENERATIVE_AI_API_KEY=YOUR_KEY`
4. Restart the dev server (Ctrl+C, then `npm run dev`)
5. Refresh the browser

**If still not working:**
```bash
# Check if environment variable is loaded
echo $GOOGLE_GENERATIVE_AI_API_KEY
# If nothing prints, the key wasn't loaded
```

---

### ❌ "Failed to Generate Summary" Error

**Cause:** API request failed or quota exceeded

**Fix:**
1. Check your quota on [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Try again after a few seconds (might be rate limit)
3. Check browser console for error details (F12 → Console tab)
4. Verify the API key hasn't expired

---

### ❌ Button Shows Loading Then Nothing Happens

**Cause:** Long response time or network issue

**Fix:**
1. Wait longer (first request can take 10-15 seconds)
2. Check browser console for errors (F12 → Console)
3. Try a different channel
4. Restart dev server and try again

---

### ❌ Error: "429 Too Many Requests"

**Cause:** Hit the rate limit (60 requests/minute)

**Fix:**
1. Wait a few minutes
2. Try again with fewer simultaneous requests
3. Don't click multiple "Generate" buttons at once

---

## What AI Features Are Available?

Once enabled, you get:

### 1. **Channel AI Summaries**
- Click "Generate AI Summary" on any channel
- Get AI-written analysis of that channel's performance
- Includes recommended next steps

### 2. **Ask About Your Data**
- Type custom questions about your marketing data
- Ask things like:
  - "Why did our CPA increase last week?"
  - "Which channel has the best ROAS?"
  - "What should we focus on?"
- Get AI-powered answers based on your actual data

### 3. **Insights in Dashboard**
- AI-generated insights appear on the main dashboard
- Shows performance recommendations
- Severity levels (critical, warning, info)

---

## Advanced: Using Different AI Models

If you want to use a different AI provider:

### Switching from Google Gemini to Claude/Anthropic

1. Get an Anthropic API key from [claude.ai](https://console.anthropic.com)
2. Update the AI implementation in `/lib/ai.ts`
3. Change the environment variable

**Contact your dev team if you want to do this** — it requires code changes.

---

## Cost Estimate

### Free Tier
- **Cost:** $0
- **Limit:** 1.5M tokens/month (~500 summaries or questions)
- **Duration:** Unlimited free tier

### Paid Tier
- **Cost:** $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **Limit:** Unlimited (pay as you go)
- **Typical cost:** $5-20/month for moderate usage

---

## Need Help?

### For API Key Issues
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Check "Enable API" is turned on
3. Check your billing (if using paid tier)

### For Code Issues
- Check the browser console (F12 → Console tab)
- Look for red error messages
- Note the exact error and share it with your dev team

### For Usage/Quota Issues
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Check quotas and usage
3. If stuck, create a new API key

---

## Quick Checklist

Before using AI, verify:

- [ ] You have a Google account
- [ ] You have the API key copied
- [ ] `.env.local` file exists in project root
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY=YOUR_KEY` is in `.env.local`
- [ ] Dev server was restarted after adding the key
- [ ] No "AI Features Unavailable" banner on AI Summary page
- [ ] You can click "Generate AI Summary" button
- [ ] Summary generates within 10 seconds

---

## Files That Use AI

If you need to understand the implementation:

| File | Purpose |
|------|---------|
| `/lib/ai.ts` | AI prompt definitions and API calls |
| `/app/api/ai/insights/route.ts` | Backend AI endpoint |
| `/app/(platform)/projects/[projectId]/ai-insights/page.tsx` | AI Summary page UI |
| `/components/dashboard/channel-section.tsx` | "Explain" button for metrics |

---

**Setup Time:** 5-10 minutes
**Document Version:** 1.0
**Last Updated:** March 2026
