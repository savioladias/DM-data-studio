# Pending Issues & Fixes Needed

## 🔴 HIGH PRIORITY (Will Break Features)

### 1. Settings Page Channel Loading Issue
**File:** `app/(platform)/projects/[projectId]/settings/page.tsx`
**Problem:**
- Settings page loads ALL channels from `project.channels`, but the GET endpoint returns only `enabled: true` channels
- This causes a mismatch - disabled channels won't be loadable to toggle on

**Status:** ⚠️ Needs Fix
**Fix:**
- Update the GET endpoint to return ALL channels (enabled and disabled)
- Or update settings page to request all channels separately

---

### 2. Goals Still Being Fetched (Unused)
**File:** `app/(platform)/projects/[projectId]/page.tsx` (line 21)
**Problem:**
- Goals are fetched with `goals: true` but never used or passed to the component
- This is a performance issue for dashboards with many goals
- Fetching unused data wastes database calls

**Status:** ⚠️ Minor Optimization Needed
**Fix:** Remove `goals: true` from the include clause since goals are no longer displayed

**Code to change:**
```typescript
// FROM:
include: {
  channels: { where: { enabled: true } },
  goals: true,  // ❌ REMOVE THIS
  insights: { orderBy: { createdAt: 'desc' }, take: 5 },
},

// TO:
include: {
  channels: { where: { enabled: true } },
  insights: { orderBy: { createdAt: 'desc' }, take: 5 },
},
```

---

## 🟡 MEDIUM PRIORITY (Features Not Fully Working)

### 3. Upload API Needs Image Domain Configuration
**File:** `next.config.ts`
**Problem:**
- Images are being uploaded to `/public/uploads/` (local storage)
- But `next.config.ts` has no image configuration for serving them
- Image optimization might not work properly

**Status:** ⚠️ Needs Configuration
**Fix:** Add image configuration to next.config.ts:
```typescript
const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // For local uploads
  },
};
```

---

### 4. Settings Page Should Load All Channels (Not Just Enabled)
**File:** `app/(platform)/projects/[projectId]/settings/page.tsx`
**Problem:**
- The useEffect loads `project.channels` which only has enabled channels from the GET endpoint
- But the channel management section should show ALL available channels with toggles
- Currently you can't disable a channel that's already enabled

**Status:** ⚠️ Feature Incomplete
**Fix:** Need to either:
1. Modify GET endpoint to return all channels, OR
2. Add separate endpoint to get all channels for settings page

---

### 5. Settings Page Doesn't Support Image Preview When No Logo
**File:** `app/(platform)/projects/[projectId]/settings/page.tsx`
**Problem:**
- When no logo exists, the image preview box doesn't show
- UX could be improved with a placeholder

**Status:** ⚠️ Minor UX Issue
**Fix:** Add a placeholder when `logoUrl` is empty:
```typescript
{logoUrl ? (
  <div className="h-20 w-20 rounded-lg border border-border bg-muted">
    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
  </div>
) : (
  <div className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
    <span className="text-xs text-muted-foreground">No logo</span>
  </div>
)}
```

---

## 🟢 LOW PRIORITY (Polish & Optimization)

### 6. Create Project Wizard Doesn't Pass `timezone`
**File:** `app/(platform)/projects/new/page.tsx`
**Problem:**
- The new project wizard doesn't ask for timezone
- All projects default to "UTC" in the schema
- Users can't select their timezone when creating projects

**Status:** 📝 Feature Gap
**Fix:** Add timezone selector to step 0 of the wizard

---

### 7. Settings Form Doesn't Have Validation
**File:** `app/(platform)/projects/[projectId]/settings/page.tsx`
**Problem:**
- Form allows empty project name or client name
- Brand color field doesn't validate hex colors
- No minimum/maximum constraints

**Status:** 📝 Nice to Have
**Fix:** Add validation:
```typescript
// Example for project name
if (!formData.name.trim()) {
  toast.error('Project name is required')
  return
}
if (!formData.clientName.trim()) {
  toast.error('Client name is required')
  return
}
```

---

### 8. Settings Page Should Show Save Confirmation
**File:** `app/(platform)/projects/[projectId]/settings/page.tsx`
**Problem:**
- When you save project details, only a toast appears
- User doesn't know if changes were actually persisted
- No visual feedback that form was submitted

**Status:** 📝 Polish
**Fix:** Add a success indicator or re-load data after save

---

### 9. Upload API Doesn't Handle File Conflicts
**File:** `app/api/upload/route.ts`
**Problem:**
- Two users uploading a file at the same millisecond could overwrite each other
- Using only timestamp as filename isn't collision-proof
- Should use unique ID + timestamp

**Status:** 📝 Edge Case
**Fix:** Use UUID or random string:
```typescript
import { randomBytes } from 'crypto'
const randomStr = randomBytes(8).toString('hex')
const filename = `${timestamp}-${randomStr}${ext}`
```

---

### 10. Channels API Doesn't Validate Channel IDs
**File:** `app/api/projects/[projectId]/channels/route.ts`
**Problem:**
- The PUT endpoint accepts ANY string as a channel ID
- Doesn't validate against the actual channel list
- Invalid channels could be saved

**Status:** 📝 Validation Missing
**Fix:** Add validation:
```typescript
import { CHANNELS } from '@/lib/channels'
const validChannelIds = CHANNELS.map(c => c.id)
const invalidChannels = channels.filter(c => !validChannelIds.includes(c))
if (invalidChannels.length > 0) {
  return NextResponse.json(
    { error: `Invalid channels: ${invalidChannels.join(', ')}` },
    { status: 400 }
  )
}
```

---

## Summary

| Issue | Priority | Impact | Effort |
|-------|----------|--------|--------|
| #1 Settings channel loading | 🔴 HIGH | Channel management broken | Medium |
| #2 Unused goals fetch | 🟡 MEDIUM | Performance | Low |
| #3 Image config | 🟡 MEDIUM | Image serving | Low |
| #4 Settings all channels | 🟡 MEDIUM | Feature incomplete | Medium |
| #5 Logo preview UX | 🟡 MEDIUM | UX | Low |
| #6 Timezone in wizard | 🟢 LOW | Feature gap | Low |
| #7 Form validation | 🟢 LOW | Data quality | Medium |
| #8 Save confirmation | 🟢 LOW | UX polish | Low |
| #9 Upload filename collision | 🟢 LOW | Edge case | Low |
| #10 Channel validation | 🟢 LOW | Data validation | Low |

---

## Recommended Fix Order

1. **Fix #1** (Settings channel loading) - Without this, users can't properly manage channels
2. **Fix #2** (Remove unused goals fetch) - Quick win, improves performance
3. **Fix #3** (Image config) - Enables logo feature fully
4. **Fix #4** (Settings all channels) - Completes channel management feature
5. **Fix #10** (Channel validation) - Data integrity
6. **Fix #7** (Form validation) - Prevent bad data
7. Others as needed for polish

---

**Last Updated:** March 5, 2026
**Dashboard Version:** 2.0
