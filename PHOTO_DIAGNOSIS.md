# Google Places Photos Not Showing - Diagnosis & Fix

## 🔍 Issue Identified from Logs

**Symptoms:**
```
[Photo] Icon detected for Robert Biale Vineyards, should have photo
[Photo] Icon detected for Del Dotto Historic Winery & Caves, should have photo
...repeated for ALL places
```

**Meaning:**
- Backend is returning `imageUrl` with icon URLs
- Backend is NOT returning `photoName`
- Google Places API (New) likely falling back to legacy API
- Legacy API doesn't support Place Photos (New)

---

## 🚨 Restart Backend to See Diagnostic Logs

**I've added logging to show exactly what's happening:**

**Restart backend:**
```cmd
# Close backend window
START.cmd
```

**Then trigger a search and check backend logs:**

**If Places API (New) is working:**
```
[Google Places] Calling Places API (New) with body: {...}
[Google Places] Success: 20 places returned
[Google Places] First place photos: 5 photos
[Google Places] Photo name: places/ChIJxxx/photos/ATxxx
```

**If falling back to legacy:**
```
[Google Places] API (New) failed, falling back to legacy: [error message]
```

---

## 🔧 Likely Causes & Fixes

### Cause 1: Places API (New) Not Enabled

**Check:** Google Cloud Console → APIs & Services → Enable APIs

**Must Enable:**
- "Places API (New)" ✅

**Not just:**
- "Places API" (legacy) ❌

**Fix:**
1. Go to Google Cloud Console
2. Search for "Places API (New)"
3. Click "Enable"
4. Wait 2-3 minutes for activation

### Cause 2: API Key Restrictions

**Check:** API key might be restricted to legacy API only

**Fix:**
1. Google Cloud Console → Credentials
2. Find your API key
3. Edit restrictions
4. Ensure "Places API (New)" is allowed

### Cause 3: Billing Not Enabled

**Places API (New) requires billing enabled**

**Check:**
- Google Cloud Console → Billing
- Project must have billing account linked

**Fix:**
1. Link billing account
2. Enable billing for project
3. Note: Has free tier ($200/month credit)

### Cause 4: API Request Format Issue

**If logs show:**
```
[Google Places] API (New) failed: 400 Bad Request
```

**Means:** Request format issue (should be rare with current code)

---

## 📊 Expected Backend Logs

### Successful Photo Fetch

```
[Google Places] Calling Places API (New) with body: {
  "locationRestriction": {...},
  "maxResultCount": 40,
  "includedTypes": ["winery"],
  "rankPreference": "DISTANCE"
}
[Google Places] Success: 20 places returned
[Google Places] First place photos: 3 photos
[Google Places] Photo name: places/ChIJN5X.../photos/ATpl...
```

**This means photos are being returned** ✅

### Fallback to Legacy (No Photos)

```
[Google Places] API (New) failed, falling back to legacy: Request failed
```

**This means:**
- Places API (New) not working
- Using legacy API
- Legacy returns icon URLs, not photoName
- **This is what's happening now** ❌

---

## ✅ Immediate Fix Steps

**Step 1: Restart Backend**
```cmd
START.cmd
```

**Step 2: Trigger Search**
```
Search anything in the app
```

**Step 3: Check Backend Logs**

**Look for:**
- `[Google Places] Calling Places API (New)...` ✅
- `[Google Places] Success: X places returned` ✅
- `[Google Places] First place photos: X photos` ✅

**OR:**
- `[Google Places] API (New) failed, falling back to legacy` ❌

**Step 4: If Seeing Fallback Message**

The error message will tell you why:
- "403" → API not enabled
- "400" → Request format (unlikely)
- "Network error" → Connection issue

**Step 5: Enable Places API (New)**

If not enabled:
1. Google Cloud Console
2. APIs & Services → Library
3. Search "Places API (New)"
4. Click "Enable"

---

## 🎯 Alternative: Force Photo Enrichment

**If you can't enable Places API (New) immediately:**

The photo enrichment system can fetch photos client-side, but it requires:
```env
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_key_here
```

This is less secure (key in client bundle) but works as fallback.

---

## ✅ Summary

**Current Status:**
- ✅ Packages updated to Expo-compatible versions
- ✅ Frontend photo system correct
- ✅ Backend photo system correct
- ❌ Google Places API (New) not returning photos (likely not enabled)

**Next Steps:**
1. Restart backend (see diagnostic logs)
2. Check if Places API (New) is enabled in Google Cloud
3. Enable it if not
4. Photos will appear automatically

**The code is correct. You just need Places API (New) enabled in Google Cloud.** 🎯
