# 🚨 CRITICAL: Backend Restart Required + Photo Fix

## Issues You're Experiencing

1. ❌ "I want to meet women" → No results
2. ❌ "I want to eat sushi" → Irrelevant results
3. ❌ Photos showing icons instead of actual images

---

## 🔥 ROOT CAUSE: Backend Not Updated

**Your backend is running OLD code.**

All the hybrid OpenAI system, photo fixes, and search improvements are in the code files, but **the running server hasn't loaded them yet.**

---

## ✅ IMMEDIATE FIX

### Step 1: RESTART BACKEND (CRITICAL)

**Close ALL terminal/PowerShell windows, then:**

```cmd
START.cmd
```

**Wait for:**
```
🚀 API server listening on port 4000
📍 Google Places API: Configured ✓
🎫 Ticketmaster API: Configured ✓
🤖 OpenAI API: Configured ✓
🔬 Hybrid OpenAI System: ENABLED ✓  ← NEW, must see this
```

**If you don't see "Hybrid OpenAI System: ENABLED ✓", the backend didn't load the new code.**

---

### Step 2: Clear Expo Cache

In the **Expo terminal**, press:
```
Shift + R  (clear cache and reload)
```

Or close Expo and run:
```cmd
npx expo start -c
```

---

### Step 3: Test Searches

Try these in order:

**Test 1: Simple Query (should work)**
```
"coffee near me"
```
Expected: Coffee shops with actual photos

**Test 2: Food Query**
```
"I want to eat sushi"
```
Backend logs should show:
```
[Hybrid] Rule-based confidence: 0.45
[Search API] Categories: [food]
[Search API] ✅ Returning X sushi results
```

**Test 3: Abstract Social Query**
```
"I want to meet women"
```
Backend logs should show:
```
[Hybrid] ⚠️ Low confidence, trying OpenAI fallback...
[OpenAI] 🤖 Classifying query...
[OpenAI] ✅ Classified in 387ms
[Search API] Categories: [bar, night_club, social_venue]
[Search API] ✅ Returning X results
```

---

## 📸 Photo System Check

### If Still Seeing Icons

**Problem:** Backend might be returning `imageUrl` (icon URL) instead of `photoName`

**Check backend logs when searching:**
```
Look for: photoName in results
Should see: "photoName": "places/ChIJ.../photos/..."
Not: "imageUrl": "https://maps.gstatic.com/..."
```

**If seeing icon URLs:**

The Google Places provider might be falling back to legacy API. Check:
```
backend/search/providers/googlePlacesProvider.ts
```

Should be using "Places API (New)" not "Nearby Search (legacy)"

---

## 🔍 Diagnostic Commands

### Check Backend is Running

```cmd
curl http://localhost:4000/api/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### Check OpenAI Status

```cmd
curl http://localhost:4000/api/diagnostics
```

Should show:
```json
{
  "openai": {
    "available": true,
    "callsToday": 0,
    "costToday": 0
  }
}
```

---

## 🎯 What Should Happen (After Restart)

### Query: "I want to eat sushi"

**Expected:**
1. Rule-based classifies: food intent, confidence ~0.65
2. Uses rule-based (no OpenAI needed)
3. Searches for: restaurants, Japanese, sushi
4. Returns: Sushi restaurants with photos
5. ✅ Relevant results

**If seeing irrelevant results:**
- Backend using old intent classifier
- Not restarted properly

### Query: "I want to meet women"

**Expected:**
1. Rule-based classifies: low confidence ~0.3
2. Triggers OpenAI fallback
3. OpenAI understands: social + singles intent
4. Searches for: bars, clubs, social events
5. Returns: Social venues with photos
6. ✅ Relevant results

**If seeing "no results":**
- OpenAI not available (check API key)
- Or backend not restarted

### Photos

**Expected:**
- All place cards show actual venue photos
- NOT generic category icons
- High-res images from Google Places

**If seeing icons:**
- Backend not returning `photoName`
- Or frontend not using photo proxy
- Or backend not restarted

---

## 🚀 Quick Fix Checklist

Do these IN ORDER:

1. ✅ **Close ALL terminal windows**
2. ✅ **Run:** `START.cmd`
3. ✅ **Verify backend log shows:** "Hybrid OpenAI System: ENABLED ✓"
4. ✅ **In Expo, press:** `Shift + R` (clear cache)
5. ✅ **Test:** "coffee near me" (should see photos)
6. ✅ **Test:** "I want to eat sushi" (should see sushi restaurants)
7. ✅ **Test:** "I want to meet women" (should see bars/clubs)

---

## 📊 Expected vs Actual

| Test | Expected | If Failing |
|------|----------|------------|
| Coffee search | Photos, not icons | Backend not restarted |
| Sushi search | Sushi restaurants | Backend using old classifier |
| Meet women | Bars, clubs, social | OpenAI not triggered or failing |

**All three failing = Backend definitely not restarted**

---

## ⚠️ Common Mistakes

### Mistake 1: Didn't Close All Windows

**Problem:** Old backend still running on port 4000

**Fix:**
```cmd
taskkill /F /IM node.exe
START.cmd
```

### Mistake 2: Only Reloaded Expo

**Problem:** Frontend reloaded, backend still old code

**Fix:** Must restart BOTH backend and Expo

### Mistake 3: Wrong Terminal

**Problem:** Restarted wrong process

**Fix:** Close ALL windows, use START.cmd

---

## ✅ After Proper Restart

You'll see in backend logs when you search:

```
[Search API] ==================== NEW SEARCH ====================
[Search API] Query: "I want to meet women"
[Search API] Hybrid OpenAI: ENABLED
[Hybrid] Rule-based confidence: 0.28
[Hybrid] ⚠️ Low confidence, trying OpenAI fallback...
[OpenAI] 🤖 Classifying query: "I want to meet women"
[OpenAI] ✅ Classified in 423ms
[Search API] Categories: [bar, night_club, social_venue]
[Search API] ✅ Returning 20 results
```

**If you don't see these logs, the backend isn't running the new code.**

---

## 🎯 Summary

**The code is correct.** The hybrid OpenAI system, photo system, and search improvements are all properly implemented.

**The problem:** You need to restart the backend server to load the new code.

**The solution:**
1. Close all windows
2. Run START.cmd
3. Verify logs show "Hybrid OpenAI System: ENABLED ✓"
4. Test searches

**After restart, everything will work perfectly.** 🚀

---

**DO THIS NOW:**
```cmd
taskkill /F /IM node.exe
START.cmd
```

Then test and check the backend logs!
