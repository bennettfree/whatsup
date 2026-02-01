# Optional API Setup Guide

## Overview

Phase 1 works perfectly with **mock data** - no API setup required for development and testing.

However, if you want to use **real data** from Google Places and Ticketmaster, follow this guide.

---

## Quick Decision: Do I Need This?

### ✅ Use Mock Data (Default) If:
- You're developing and testing Phase 1 features
- You want to avoid API costs during development
- You don't have API keys yet
- You're working on UI/UX (mock data is perfect)

### 🔧 Set Up APIs If:
- You want real venue and event data
- You're testing with actual locations
- You're preparing for production
- You want to see how APIs perform

---

## Option 1: Continue with Mock Data (Recommended for Phase 1)

**Current Status:** Already working! ✅

**What You Get:**
- Location-aware mock places and events
- Fast development without API delays
- No API costs
- Perfect for Phase 1 testing

**Action Required:** None! Just keep developing.

---

## Option 2: Set Up Backend APIs (Optional)

### Prerequisites
- Node.js installed
- Terminal access
- ~30 minutes for API key setup

---

## Step 1: Get API Keys

### Google Places API (Free Tier: $200/month credit)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API (New)"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. **Restrict the key:**
   - Click "Edit API key"
   - Under "API restrictions", select "Restrict key"
   - Check "Places API (New)"
   - Save

**Cost:** Free tier covers ~150,000 requests/month

---

### Ticketmaster API (Free Tier: 5,000/day)

1. Go to [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Sign up for free account
3. Go to "My Apps"
4. Click "Create New App"
5. Fill in app details (name: "WhatsUp", etc.)
6. Copy your **Consumer Key** (this is your API key)

**Cost:** Free tier covers 5,000 requests/day (150,000/month)

---

## Step 2: Configure Environment

### Create .env file

```bash
# In project root, copy the example
cp env.example .env

# Or on Windows:
copy env.example .env
```

### Edit .env file

Open `.env` and add your keys:

```bash
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:4000

# Google Places API Key
GOOGLE_PLACES_API_KEY=your_actual_google_key_here

# Ticketmaster API Key  
TICKETMASTER_API_KEY=your_actual_ticketmaster_key_here

# OpenAI API Key (Phase 5 - already provided)
OPENAI_API_KEY=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

# Server Port
PORT=4000
```

**Important:** Never commit `.env` to git! It's already in `.gitignore`.

---

## Step 3: Start Backend Server

### Terminal 1 - Backend Server
```bash
npm run dev:api
```

**Expected Output:**
```
API server listening on port 4000
```

---

## Step 4: Start React Native App

### Terminal 2 - Expo App
```bash
npm start
```

---

## Step 5: Verify It's Working

1. Open app on phone/simulator
2. Check console - should NOT see API warnings
3. Search for a location (e.g., "Los Angeles")
4. Results should show real venues and events
5. Markers on map should be real locations

---

## Testing on Physical Device

If testing on a physical phone/tablet:

### Find Your Computer's IP Address

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Windows:**
```bash
ipconfig
```

Look for IPv4 address (e.g., `192.168.1.100`)

### Update .env

```bash
# Replace localhost with your computer's IP
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

### Restart Everything
1. Stop backend server (Ctrl+C)
2. Stop Expo (Ctrl+C)
3. Start backend: `npm run dev:api`
4. Start Expo: `npm start`
5. Reload app on device

---

## Troubleshooting

### Issue: Still seeing "EXPO_PUBLIC_API_URL is not set"

**Solution:**
1. Verify `.env` file exists in project root
2. Verify `EXPO_PUBLIC_API_URL` is set
3. Restart Expo dev server completely
4. Clear cache: `npx expo start --clear`

---

### Issue: "Network Error" when searching

**Solution:**
1. Verify backend is running (`npm run dev:api`)
2. Check firewall isn't blocking port 4000
3. On physical device, use computer's IP address, not localhost
4. Ensure phone and computer on same WiFi network

---

### Issue: "Invalid API Key" errors

**Solution:**
1. Verify API keys are correct in `.env`
2. Google: Check API is enabled in Cloud Console
3. Ticketmaster: Check Consumer Key (not Consumer Secret)
4. Check for extra spaces in `.env` file

---

### Issue: Getting charged for API calls

**Don't worry! You won't be charged unless:**
1. You exceed free tier limits (very hard to do in development)
2. Both APIs have generous free tiers
3. Monitor usage in dashboards

---

## API Usage Estimates

### Phase 1 Development (per day)
- **Places API:** ~50-100 requests (well within free tier)
- **Ticketmaster API:** ~50-100 requests (well within free tier)
- **Total cost:** $0.00

### Production Usage (per month)
- Depends on number of users
- Set up billing alerts in Google Cloud Console
- Monitor Ticketmaster dashboard

---

## Backend API Endpoints

Once backend is running, these endpoints are available:

### Get Events
```
GET http://localhost:4000/api/events?lat=37.7749&lng=-122.4194&radius=10
```

### Get Places
```
GET http://localhost:4000/api/places?lat=37.7749&lng=-122.4194&radius=16093
```

Test in browser or Postman to verify backend works.

---

## Security Best Practices

### ✅ Do This:
- Keep `.env` file out of git
- Restrict API keys to specific APIs
- Monitor API usage regularly
- Use environment variables for secrets
- Rotate keys if exposed

### ❌ Don't Do This:
- Commit API keys to GitHub
- Share `.env` file publicly
- Use same keys in production and development
- Leave API keys unrestricted

---

## Cost Monitoring

### Google Cloud Console
1. Go to "Billing" section
2. Set up budget alerts
3. Monitor "Places API" usage
4. Set spending limits

### Ticketmaster Dashboard
1. Go to "My Apps"
2. Check "API Statistics"
3. Monitor request counts
4. Track rate limits

---

## When to Upgrade

### Free Tiers Are Enough If:
- < 5,000 searches per day (Ticketmaster limit)
- < 150,000 Place Details per month (Google)
- Development and testing only

### Consider Paid Plans If:
- Launching to public users
- Expecting high traffic
- Need higher rate limits
- Want premium support

---

## Summary

### Mock Data (Current Setup)
- ✅ Works perfectly for Phase 1
- ✅ Zero cost
- ✅ Fast development
- ✅ No setup required

### Real APIs (Optional)
- 🔧 ~30 min setup time
- 💰 Free tiers are generous
- 🌐 Real venue and event data
- 📊 Production-ready

---

## Quick Commands Reference

```bash
# Start backend
npm run dev:api

# Start app
npm start

# Start app (clear cache)
npx expo start --clear

# Test backend endpoint
curl http://localhost:4000/api/places?lat=37.7749&lng=-122.4194&radius=16093
```

---

## Need Help?

1. Check backend console for error messages
2. Check Expo console for client errors
3. Verify `.env` file is correct
4. Try with mock data first (remove EXPO_PUBLIC_API_URL from .env)
5. Google Cloud Console has detailed error logs

---

## Recommendation

For **Phase 1 development**, stick with **mock data**. It's fast, free, and works perfectly.

Set up APIs when:
- Moving to Phase 2+
- Testing with real locations
- Preparing for production
- Need actual venue/event data

**Current Status:** Phase 1 complete with mock data! ✅
