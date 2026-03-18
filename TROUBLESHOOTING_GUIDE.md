# DM Data Studio — Troubleshooting Guide

Use this guide when connections fail or data isn't showing up.

---

## Connection Issues

### ❌ "Access Denied" or "Invalid Credentials"

**Error Message:** "Access Denied", "Invalid Credentials", "Unauthorized"

**Likely Cause:** You don't have the right permissions in that platform

**Fix Steps:**

**For Google Services (GA4, GSC, Google Ads):**
1. Sign out of Google completely (close all tabs, clear cache if needed)
2. Sign back in with your main business Google account
3. Go to [google.com/myaccount](https://google.com/myaccount) → Check permissions
4. Verify you have Admin or Editor role in the specific property/account
5. Try connecting again

**For Meta/Facebook:**
1. Sign out of Facebook completely
2. Clear browser cookies (Settings → Privacy → Clear browsing data)
3. Sign back in with your main business account
4. Go to Business Manager and verify you have admin access to the Ad Account or Page
5. Try connecting again

**For LinkedIn:**
1. Sign out of LinkedIn
2. Go to your Company Page → Settings → Admins
3. Verify your account is listed as Admin
4. Sign back in and try connecting

---

### ❌ "Property Not Found" or "Account Not Found"

**Error Message:** "Property not found", "Account not available", "Site not verified"

**Likely Cause:** The property/account doesn't exist or you don't own it

**Fix Steps:**

**For Google Analytics 4:**
1. Go to [analytics.google.com](https://analytics.google.com)
2. Verify your GA4 property exists
3. Check that you have access (should be listed on the left sidebar)
4. Try connecting again

**For Google Search Console:**
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Verify your website is in the list
3. Check that it shows "Verified" status
4. Try connecting again

**For Google Ads:**
1. Go to [ads.google.com](https://ads.google.com)
2. Check your Customer ID (top left corner)
3. Verify at least 1 campaign exists
4. Try connecting again with the correct Customer ID

**For Meta Ads:**
1. Go to [business.facebook.com](https://business.facebook.com)
2. Check Business Manager → Ad Accounts
3. Verify the Ad Account is active
4. Try connecting again

**For Facebook/Instagram Pages:**
1. Go to your Page
2. Check Settings → Roles → Verify you're an Admin
3. For Instagram: Verify it's a Business Account (not Personal)
4. Try connecting again

---

### ❌ "Invalid Scope" or "Permission Denied"

**Error Message:** "Invalid Scope", "Missing Permissions", "Permission Denied"

**Likely Cause:** The account doesn't have the right access level

**Fix Steps:**

1. **Disconnect** the channel (click the button if available)
2. **Wait 30 seconds**
3. **Sign out completely** from the platform (e.g., Google, Facebook)
4. **Close all browser tabs** with that platform
5. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear all
   - Safari: Develop → Empty Caches
   - Firefox: Ctrl+Shift+Delete → Clear Everything
6. **Sign back in** with your account
7. **Go back to Settings** in DM Data Studio
8. **Try connecting again**

---

### ❌ "Popup Blocked" or "New Window Didn't Open"

**Error Message:** "Popup blocked", "Authorization window didn't open", "Redirect failed"

**Likely Cause:** Browser popup blocker is preventing the login window

**Fix Steps:**

1. **Check if popup is blocked:**
   - Look for a popup blocker notification in your browser (usually top right)
   - Click **Allow** popups from this site
2. **Try again** on the channel
3. **If it still doesn't work:**
   - Try a different browser (Chrome, Safari, Firefox, Edge)
   - Or disable popup blocker temporarily for this site

---

## Data Issues

### ❌ No Data Showing After Connection

**Symptoms:** Channel shows "Connected" but no metrics appear on dashboard

**Likely Cause:** Data hasn't synced yet, or there's no data in that account

**Fix Steps:**

1. **Wait 2-3 minutes** — First sync can take a moment
2. **Refresh the page** — Press F5 or Cmd+R
3. **Check the data source:**
   - Does the connected account have active campaigns? YES ☐ NO ☐
   - Does the account have historical data (not brand new)? YES ☐ NO ☐
   - Is the account active (not paused)? YES ☐ NO ☐
4. **If new account:** Wait 24-48 hours for data to accumulate
5. **If still no data:** Disconnect and reconnect the channel

---

### ❌ Only Some Metrics Are Showing

**Symptoms:** A few metrics appear, but others show as blank or "N/A"

**Likely Cause:** Those metrics haven't recorded data yet

**Possible reasons:**
- Conversion tracking isn't set up
- Not enough activity in that channel
- New account (needs time to accumulate data)
- Campaign is paused

**Fix Steps:**

1. **Check the source platform:**
   - Log into Google Ads / Facebook / LinkedIn directly
   - Verify campaigns are active and have activity
2. **Wait 24 hours** — Some platforms take time to report certain metrics
3. **Verify tracking is set up:**
   - Google Ads: Check conversion tracking is enabled
   - Facebook: Check pixel is installed
   - Google Analytics: Check goals/conversions are configured
4. **If campaign is paused:** Resume it, then wait 24 hours for data

---

### ❌ Data Looks Wrong or Too Low

**Symptoms:** Numbers seem incorrect, much lower than expected, or zeros everywhere

**Likely Cause:** Wrong account connected, data filtering, or new account

**Fix Steps:**

1. **Verify the right account is connected:**
   - Disconnect the channel
   - Reconnect and double-check you select the correct property/account
2. **Check date ranges:**
   - Dashboard shows last 30 days by default
   - Verify your data is from that period
3. **Check in the source platform:**
   - Log into Google Analytics / Google Ads / Facebook directly
   - Compare the numbers you see there with the dashboard
   - If they match, data is correct
   - If they don't match, disconnect and reconnect
4. **For new accounts:** Wait 48 hours for initial data

---

### ❌ Data Stopped Updating

**Symptoms:** Data was showing before, but hasn't updated in hours/days

**Likely Cause:** Credentials expired or account access changed

**Fix Steps:**

1. **Disconnect the channel:**
   - Go to Settings → Connected Channels
   - Click the channel → Disconnect
   - Wait 10 seconds
2. **Reconnect the channel:**
   - Click **Connect**
   - Sign in with your account
   - Approve permissions again
3. **Wait 2-3 minutes** for data to sync
4. **Refresh the dashboard**

---

## Dashboard Issues

### ❌ Dashboard Won't Load or Is Stuck Loading

**Symptoms:** Page keeps showing loading spinner, or is blank

**Likely Cause:** Browser cache issue, slow connection, or server issue

**Fix Steps:**

1. **Hard refresh the page:**
   - Windows: Ctrl+Shift+R
   - Mac: Cmd+Shift+R
2. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete
   - Safari: Develop menu → Empty Caches
   - Firefox: Ctrl+Shift+Delete
3. **Try a different browser**
4. **Check your internet connection:**
   - Try another website (google.com)
   - Restart your WiFi router
5. **Wait a few minutes** — Server might be temporarily busy

---

### ❌ Theme Toggle Not Working

**Symptoms:** Light/Dark mode toggle button doesn't work

**Likely Cause:** Browser JavaScript issue or cache problem

**Fix Steps:**

1. **Hard refresh:** Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear browser cache** (see above)
3. **Check if toggle appears:** Bottom left sidebar, below Sign Out
4. **Try a different browser**
5. **Check browser console for errors:**
   - Press F12 → Console tab
   - Look for red error messages
   - Screenshot and share if needed

---

### ❌ Settings Page Won't Save Changes

**Symptoms:** Click "Save" but changes don't apply, or error appears

**Likely Cause:** Network issue, validation error, or permission problem

**Fix Steps:**

1. **Check your internet connection**
2. **Verify all required fields are filled:**
   - [ ] Project Name
   - [ ] Client Name
   - [ ] Currency
   - [ ] Brand Colour
3. **Try again** — Sometimes network hiccup causes this
4. **Hard refresh** and reload Settings page
5. **If logo upload failed:**
   - Check file size (max 2MB)
   - Check file format (PNG, JPG, WebP only)
   - Try uploading again
6. **Check browser console (F12 → Console) for error messages**

---

### ❌ Channels Toggle Doesn't Save

**Symptoms:** Toggle channels on/off, click Save, but changes don't stick

**Likely Cause:** API error or permission issue

**Fix Steps:**

1. **Verify at least 1 channel is selected**
2. **Hard refresh the page** — Ctrl+Shift+R
3. **Try again** — Select channels → Click "Save Channels"
4. **Check browser console (F12) for error details**
5. **If specific channel won't save:**
   - Try toggling a different channel first
   - Then toggle the problematic one

---

## Permission & Access Issues

### ❌ "Unauthorized" Error

**Error Message:** "Unauthorized", "Not Authenticated", "Please Sign In"

**Likely Cause:** Not logged into DM Data Studio, or session expired

**Fix Steps:**

1. **Check if you're logged in:**
   - Look for your profile icon in the sidebar
2. **If not logged in:** Click login and enter credentials
3. **If logged in but still getting error:**
   - Sign out (click profile → Sign Out)
   - Clear cookies
   - Sign back in
4. **Check if your account has access to this project**

---

### ❌ "Not Found" or "Project Doesn't Exist"

**Error Message:** "Project not found", "404 error", "Page doesn't exist"

**Likely Cause:** Wrong URL, or you don't have access to this project

**Fix Steps:**

1. **Go back to home:** Click "All projects" (top left)
2. **Find your project** in the list
3. **Click on it** to open it (uses correct URL)
4. **If project isn't in the list:**
   - You might not have access
   - Ask the project owner to add you

---

## Advanced Troubleshooting

### Open Browser Console to Debug

If basic troubleshooting doesn't work, check the browser console for error details:

**Steps:**
1. Press **F12** (or Cmd+Option+I on Mac)
2. Click the **Console** tab
3. Look for red error messages
4. Note down any error messages you see
5. Take a screenshot
6. Share with support if needed

---

### Test Your Connection

To verify your internet connection is working:

1. Try visiting [google.com](https://google.com) — should load instantly
2. Try visiting [facebook.com](https://facebook.com) — should load
3. If those don't load, your internet is down
4. If they load fine but DM Data Studio has issues, it's likely the app

---

## When All Else Fails

If you've tried everything above:

**Before asking for help, collect this info:**
- [ ] Which channel(s) are having issues?
- [ ] What exactly happened? (error message, behavior, etc.)
- [ ] When did it start? (today, last week, etc.)
- [ ] What did you do before it broke?
- [ ] Browser type and version (Chrome 120, Safari 17, etc.)
- [ ] Operating system (Windows 11, macOS 14, etc.)
- [ ] Screenshot of the error (if applicable)

**Share with your team lead or admin:**
- The info above
- Steps you've already tried
- Current error message (if any)

---

**Quick Emergency Contacts:**

- **For Google issues:** [Google Support](https://support.google.com)
- **For Facebook issues:** [Facebook Business Support](https://www.facebook.com/support)
- **For LinkedIn issues:** [LinkedIn Help](https://www.linkedin.com/help)
- **For YouTube issues:** [YouTube Help](https://support.google.com/youtube)

---

**Document Version:** 1.0
**Last Updated:** March 2026
