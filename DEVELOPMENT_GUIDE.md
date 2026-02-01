# Development Guide

## Quick Start

### Option 1: Automated Startup (Recommended)
Run the startup script:
```bash
start-dev.cmd
```

This will:
1. Check for and optionally kill existing Node processes
2. Start the backend API server
3. Start the Expo development server

### Option 2: Manual Startup

**Step 1: Start Backend API**
```bash
npm run dev:api
```

Wait for the message: `🚀 API server listening on port 4000`

**Step 2: Start Expo (in a new terminal)**
```bash
npx expo start
```

## Verifying Real Data Connection

### Visual Indicators
- **Green Badge** "LIVE DATA" = Connected to real backend ✅
- **Orange Badge** "MOCK DATA" = Using mock data ⚠️

### Console Logs
Check the Expo terminal for:
- `✅ Backend is reachable!` = Good!
- `🔴 Backend unreachable` = Problem!
- `🎉 Using REAL backend data!` = Search is working!

### Testing the Connection
1. Open the app
2. Go to the Map tab
3. Search for "coffee near me"
4. Check the badge color (should be green)
5. Check console logs for "✅ Backend search successful"

## Troubleshooting

### "Port 8081 is being used by another process"
**Solution:**
```bash
taskkill /F /IM node.exe
```
Then restart Expo.

### "Still seeing MOCK DATA badge"
**Checklist:**
1. ✅ Is backend API running? Check for port 4000 in terminal
2. ✅ Is `.env` file correct? Should have `EXPO_PUBLIC_API_URL=http://192.168.1.144:4000`
3. ✅ Did you restart Expo after changing `.env`? Environment variables load at startup
4. ✅ Are both servers on same network? Check your local IP with `ipconfig`

**Check backend is reachable:**
```bash
curl http://192.168.1.144:4000/api/health
```
Should return: `{"status":"ok",...}`

### "Backend search failed" in console
**Common causes:**
- Backend API not running (start with `npm run dev:api`)
- Wrong IP address in `.env` file
- Firewall blocking port 4000
- Different WiFi networks (device and computer must be on same network)

## Environment Configuration

### Required Environment Variables (.env file)
```env
EXPO_PUBLIC_API_URL=http://192.168.1.144:4000
GOOGLE_PLACES_API_KEY=your_key_here
TICKETMASTER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PORT=4000
```

### Finding Your Local IP
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.
Update `EXPO_PUBLIC_API_URL` to use this IP.

## API Endpoints

When backend is running at `http://192.168.1.144:4000`:

- **Health Check**: `GET /api/health`
- **Places**: `GET /api/places`
- **Events**: `GET /api/events`
- **Unified Search**: `POST /api/search`
- **AI Search**: `POST /api/ai-search`

## Development Tips

1. **Always start backend first**, then Expo
2. **Check the badge color** immediately after app loads
3. **Watch console logs** for connection issues
4. **Restart Expo** if you change `.env` file
5. **Keep both terminal windows visible** to see logs

## Common Workflow

```bash
# Morning startup
1. Run: start-dev.cmd
2. Scan QR code
3. Verify green "LIVE DATA" badge
4. Start coding!

# After .env changes
1. Stop Expo (Ctrl+C)
2. Run: npx expo start
3. Reload app

# End of day
1. Ctrl+C in both terminals
2. Done!
```
