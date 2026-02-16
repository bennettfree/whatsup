# 🚨 URGENT: Enable Google Places API (New)

## Current Status

✅ **Placeholders working** - Icons blocked, showing gray boxes
❌ **Actual photos NOT showing** - Backend using legacy API

---

## 🔍 Root Cause

**Backend is using:**
- Google Places API (Legacy) - Returns icon URLs only
- NO photoName in responses
- NO access to Place Photos

**Backend needs:**
- Google Places API (New) - Returns photoName
- Access to Place Photos
- Actual venue images

---

## ✅ HOW TO ENABLE PLACES API (NEW)

### Step 1: Go to Google Cloud Console

**URL:** https://console.cloud.google.com

**Login** with account that has the API key

### Step 2: Select Your Project

**Top bar** → Select project (where your API key is)

### Step 3: Enable Places API (New)

1. **Left menu** → APIs & Services → Library
2. **Search** for "Places API (New)"
3. **Click** on "Places API (New)" (not just "Places API")
4. **Click** "ENABLE" button
5. **Wait** 2-3 minutes for activation

### Step 4: Verify Billing

**Places API (New) requires billing:**
1. Left menu → Billing
2. Ensure billing account is linked
3. Note: $200/month free credit (plenty for development)

### Step 5: Check API Key Restrictions

1. APIs & Services → Credentials
2. Find your API key: `AIzaSyBhrXdZzpFngo6azZQzKH6Xigq6ZaSMTco`
3. Click Edit
4. API restrictions → Ensure "Places API (New)" is allowed

### Step 6: Restart Backend

```cmd
# Close backend window
START.cmd
```

**Look for in backend logs:**
```
[Google Places] Calling Places API (New)...
[Google Places] Success: 20 places
[Google Places] First place photos: 3 photos  ← Should see this!
```

---

## 📊 Before vs After

### Before (Current - Legacy API)

**Backend response:**
```json
{
  "imageUrl": "https://maps.gstatic.com/.../icon.png",
  "photoName": null
}
```

**Frontend:**
- Blocks icon URL ✅
- Shows placeholder ✅
- NO actual photos ❌

### After (Places API New Enabled)

**Backend response:**
```json
{
  "photoName": "places/ChIJxxx/photos/ATxxx",
  "imageUrl": null
}
```

**Frontend:**
- Uses photoName ✅
- Calls /api/place-photo proxy ✅
- Shows ACTUAL venue photo ✅

---

## ⏱️ How Long It Takes

1. **Enable API:** 30 seconds
2. **Activation:** 2-3 minutes (Google's processing)
3. **Restart backend:** 10 seconds
4. **First search:** Photos appear ✅

**Total: ~5 minutes to actual photos**

---

## 🎯 Verification Steps

### After Enabling

**1. Restart backend, check logs:**
```
[Google Places] Calling Places API (New)...  ← NEW
[Google Places] Success: 20 places           ← NEW
[Google Places] First place photos: 3        ← NEW
```

**2. Search in app:**
```
[Photo] Using Google Places photo for: Winery Name  ← Should see this
NOT: [Photo] Icon URL blocked...
```

**3. Visual confirmation:**
- See actual winery photos
- NOT placeholders
- NOT icons

---

## 🚨 If Still Not Working After Enable

**Check backend logs for error:**

**Might see:**
- `403 Forbidden` → API not enabled yet (wait 5 mins)
- `400 Bad Request` → Request format issue (rare)
- `PERMISSION_DENIED` → API restrictions blocking it

**Solution:**
- Wait 5 minutes after enabling
- Check API key restrictions
- Ensure billing enabled

---

## ✅ Summary

**Current State:**
- ✅ Icons blocked (showing placeholders)
- ✅ Frontend ready for photos
- ✅ Backend ready for photos
- ❌ Places API (New) not enabled

**Action Required:**
1. Enable "Places API (New)" in Google Cloud (5 mins)
2. Restart backend
3. Photos will appear automatically

**The code is perfect. Just need the API enabled in Google Cloud.** 🚀

---

**Go to console.cloud.google.com NOW and enable "Places API (New)"!**
