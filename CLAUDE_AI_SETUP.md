# DM Data Studio — Claude AI Setup Guide

This guide shows how to switch from Gemini to Claude for AI features.

---

## Quick Decision

**Currently Installed:** Gemini (Google)
**Want to Switch to:** Claude (Anthropic)

### Should You Switch?

✅ **Switch to Claude if:**
- You want better quality, more thoughtful AI responses
- You prefer Anthropic's safety/ethics
- You're okay with slightly higher costs ($3/1M vs $0.075/1M input)
- You had good experience with Claude before

❌ **Keep Gemini if:**
- You want to save money (Gemini is 40x cheaper)
- You're happy with quick, factual summaries
- You want zero setup (it's already configured)
- You want the free tier (1.5M tokens/month)

---

## Step-by-Step: Switch to Claude

### Step 1: Install Claude SDK

```bash
cd /Users/savioladias/dm-data-studio
npm install @anthropic-ai/sdk
```

### Step 2: Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy the key

### Step 3: Add to `.env.local`

```bash
# Open .env.local and add:
ANTHROPIC_API_KEY=sk-ant-v7-YOUR_KEY_HERE
```

### Step 4: Update AI Implementation

This requires code changes. Here's what to modify in `lib/ai.ts`:

**Change 1: Replace imports (line 1)**

```typescript
// FROM:
import { GoogleGenerativeAI } from '@google/generative-ai'

// TO:
import Anthropic from '@anthropic-ai/sdk'
```

**Change 2: Initialize client (line 3)**

```typescript
// FROM:
const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// TO:
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

**Change 3: Update model calls**

Replace all occurrences of:
```typescript
// FROM:
const model = client.getGenerativeModel({ model: 'gemini-pro' })
const result = await model.generateContent(`prompt text`)
return result.response.text()

// TO:
const result = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: `prompt text`,
    },
  ],
})
return result.content[0].type === 'text' ? result.content[0].text : ''
```

**Change 4: Update error messages**

Replace all `Gemini API error:` with `Claude API error:`

---

## If You Want Me To Do It

Send a message saying **"Switch AI to Claude"** and I'll:
1. Install the SDK
2. Update `lib/ai.ts` with all Claude API calls
3. Test it works
4. Give you instructions for adding the API key

This takes ~15 minutes.

---

## Cost Comparison (Per Month)

### Gemini
- Free tier: 1.5M tokens/month free
- Paid: $0.075/1M input tokens
- **Typical use:** $0-10/month

### Claude
- Free tier: None (but cheap)
- Paid: $3/1M input, $15/1M output
- **Typical use:** $10-30/month

---

## Model Recommendations

### For Claude

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **claude-3-5-sonnet** | Fast | Excellent | $3/$15 per 1M | Dashboard (recommended) |
| claude-3-opus | Medium | Best | $15/$75 per 1M | Complex analysis |
| claude-3-haiku | Fastest | Good | $0.80/$4 per 1M | Quick summaries |

**Recommended:** Use `claude-3-5-sonnet-20241022` (best balance)

### For Gemini (Current)

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **gemini-pro** | Fast | Good | Free tier | Dashboard (current) |
| gemini-pro-vision | Medium | Very good | Free tier | Image analysis |
| gemini-1.5-pro | Slow | Excellent | $0.075/$0.30 | Complex analysis |

---

## Migration Path

### Easy Path (Keep Gemini)
1. Follow **AI_SETUP_GUIDE.md**
2. Get Google API key
3. Add to `.env.local`
4. Done in 5 minutes

### Better Path (Switch to Claude)
1. Install SDK: `npm install @anthropic-ai/sdk`
2. Get Anthropic API key
3. Ask me to update `lib/ai.ts`
4. Add API key to `.env.local`
5. Done in 15 minutes

---

## Troubleshooting Claude

### "API Key not found"
- Make sure `.env.local` has `ANTHROPIC_API_KEY=sk-ant-...`
- Restart dev server
- Check key starts with `sk-ant-`

### "Model not found"
- Make sure model name is exactly: `claude-3-5-sonnet-20241022`
- Check you have an active Claude API plan

### "Rate limited"
- Wait 60 seconds
- Try again
- Check quota on [Anthropic Console](https://console.anthropic.com)

---

## FAQ

**Q: Can I use both Claude and Gemini?**
A: Not in the same version. You'd need to create a switcher (complex). Pick one.

**Q: Which is better for marketing analytics?**
A: Claude is better for analysis quality, Gemini is better for speed + cost.

**Q: Can I switch back to Gemini later?**
A: Yes, just revert `lib/ai.ts` to the Google imports and update `.env.local`.

**Q: What if I run out of credits?**
A:
- Gemini: Free tier resets monthly
- Claude: Add a credit card for pay-as-you-go

---

## What To Do Next

**Choose one:**

1. **Keep Gemini** (easiest)
   - Follow: AI_SETUP_GUIDE.md
   - Time: 5 minutes

2. **Switch to Claude** (better quality)
   - Message: "Switch AI to Claude"
   - I'll update the code
   - Time: 15 minutes

---

**Document Version:** 1.0
**Last Updated:** March 2026
