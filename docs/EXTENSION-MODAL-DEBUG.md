# Extension Modal Auto-Close Bug — Debugging Guide

## Problem
Modal opens, shows loading ~1 second, then auto-closes (regardless of API response).

## Diagnosis
1. Issue exists even after reverting to original code
2. This is NOT a recent introduction
3. Root cause is likely: **Plasmo messaging timeout** OR **Chrome popup lifetime**

## Debug Steps (Manual Testing)

### Step 1: Open DevTools for Extension Popup
1. Open uzum.uz product page
2. **Right-click extension icon** → "Manage extension"
3. OR: chrome://extensions → VENTRA extension → **Inspect views: popup.html**
4. DevTools opens on the popup window

### Step 2: Monitor Console While Using Modal
1. Keep DevTools open on popup
2. Click "📊 Tez Tahlil" button
3. Watch console for logs:
   - `[Popup] Modal state changed: ...`
   - `[QuickAnalysisModal] Fetching...`
   - `[quick-score] API response...`
   - Look for ANY close/unmount logs
4. **Timestamp each message** — note exact times

### Step 3: Check Network Tab
1. Click "Network" tab in DevTools
2. Click "📊 Tez Tahlil"
3. Observe:
   - When does `/quick-score` request START?
   - When does it FINISH (status: 404)?
   - Timeline: does modal close BEFORE/AFTER response?

### Step 4: Take Screenshot Timeline
```
[T+0s] Modal opens
[T+0.5s] Loading visible
[T+1.0s] Screenshot — is modal still visible?
[T+1.5s] Screenshot — modal gone?
```

## Possible Root Causes

### Cause 1: Plasmo Messaging Timeout
- **Evidence:** Modal closes at EXACTLY 1s
- **Fix:** Check if `@plasmohq/messaging` has timeout setting
- **Location:** `apps/extension/src/lib/api.ts` → `sendToBackground()`
- **Test:** Add timeout console.log in message handler

### Cause 2: Chrome Extension Popup Auto-Close
- **Evidence:** Popup window loses focus or closes automatically
- **Fix:** Maybe keep popup alive with `setKeepAlive(true)`
- **Test:** Manual testing with long API delays

### Cause 3: Modal State Reset
- **Evidence:** `isModalOpen` becomes false after 1s
- **Fix:** Check for hidden state reset in Popup component
- **Test:** Add console.log to `setIsModalOpen(false)` call

### Cause 4: Plasmo Popup Component
- **Evidence:** Plasmo has built-in popup lifecycle
- **Fix:** Check if Plasmo auto-closes unpredictable popups
- **Location:** Plasmo v0.90.2 docs

## Commands to Test

```bash
# Rebuild with extra logging
pnpm --filter extension build

# Check for timeouts in messaging
grep -r "timeout\|1000\|2000" apps/extension/src

# Check Plasmo version
grep plasmo apps/extension/package.json
```

## What to Report Back
Send screenshots/logs with:
1. Exact timestamp of modal open
2. Exact timestamp of modal close
3. Whether API request completed
4. Error message (if any)
5. Console log sequence

## Next Action
Once debugging confirms root cause:
- **Plasmo timeout:** Add timeout option to `sendToBackground()`
- **Popup auto-close:** Implement popup keepalive
- **State reset:** Add fallback state management
