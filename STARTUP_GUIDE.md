# WhatsUp Development Environment - Startup Guide

## 🚀 Quick Start (Recommended)

**Every time you want to develop, run this ONE command:**

```cmd
START.cmd
```

That's it! This will:
1. Detect your network IP automatically
2. Update .env with correct backend URL
3. Clean old processes
4. Check/install dependencies if needed
5. Start backend server (new window)
6. Verify backend is healthy
7. Start Expo (new window)

## 📱 What to Expect

After running `START.cmd`, you'll see:
- **Window 1**: This command window with progress
- **Window 2**: Backend server (Node.js API)
- **Window 3**: Expo Metro bundler

Then:
1. Wait for QR code in Window 3
2. Open Expo Go on your phone
3. Scan the QR code
4. Look for **BLUE "LIVE DATA"** badge on the map

## 🔧 If You Get Errors

### Error: "expo-asset" or missing modules

**Run this once:**
```cmd
RESET-DEPENDENCIES.cmd
```

Then try `START.cmd` again.

### Error: Backend unreachable from phone

**You need to allow firewall access. Run PowerShell as Administrator:**
```powershell
New-NetFirewallRule -DisplayName "WhatsUp Dev" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private
```

### Error: Port already in use

**Kill all Node processes:**
```cmd
taskkill /F /IM node.exe
```

Then run `START.cmd` again.

## 🎯 How It Works

### Network IP Detection
The script automatically finds your Wi-Fi/Ethernet IP address so your phone can connect to the backend.

### Backend Health Check
Before starting Expo, the script verifies the backend is responding. If not, it will retry up to 15 times.

### Automatic .env Update
Every time you start, the .env file is updated with your current IP. This means if you switch networks (home → coffee shop), it just works.

## 📁 File Reference

- `START.cmd` - Main startup command (USE THIS)
- `dev-start.ps1` - PowerShell script that does all the work
- `start-dev.cmd` - Legacy, don't use
- `start-dev.ps1` - Legacy, don't use
- `RESET-DEPENDENCIES.cmd` - Fix module errors

## 🐛 Common Issues

### Issue: "Backend recently unavailable, throttling retry"

**Cause**: Your phone can't reach the backend

**Solution**:
1. Make sure phone is on same Wi-Fi network as computer
2. Check firewall (see above)
3. Verify backend window shows "Server running on port 4000"

### Issue: App shows mock data (not live)

**Cause**: Backend connection failed, app fell back to mock data

**Solution**:
1. Check that both windows (backend & expo) are running
2. Look for backend URL in console logs
3. Verify the URL matches your computer's IP
4. Check .env file has correct IP

### Issue: Changes not appearing

**Cause**: Metro cache issue

**Solution**:
1. In the Expo window, press `r` to reload
2. Or press `Shift+r` to reload and clear cache
3. Or close all windows and run `START.cmd` again (it clears cache automatically)

## 💡 Pro Tips

### To stop everything:
Just close all the PowerShell windows. The script manages everything.

### To restart after code changes:
Usually just press `r` in the Expo window. Full restart only needed for native changes or if things break.

### To check backend manually:
Open browser: `http://localhost:4000/api/health`

Should see: `{"status":"ok","timestamp":"..."}`

### To check network backend:
Open browser: `http://YOUR_IP:4000/api/health`

Replace YOUR_IP with the IP shown in startup logs.

## 🔄 Development Workflow

### Morning Startup
```cmd
START.cmd
```

### During Development
- Make changes in code
- Press `r` in Expo window to reload
- Most changes appear instantly

### End of Day
- Close all PowerShell windows
- That's it!

### Next Morning
```cmd
START.cmd
```

Everything just works, even if you're on a different network.

## 🆘 Emergency Reset

If everything is broken and you don't know why:

```cmd
# Step 1: Kill everything
taskkill /F /IM node.exe

# Step 2: Reset dependencies
RESET-DEPENDENCIES.cmd

# Step 3: Start fresh
START.cmd
```

## 📊 Success Indicators

### Backend Window Should Show:
```
WhatsUp Backend Server
Server running on port 4000
Backend health endpoint active
```

### Expo Window Should Show:
```
Metro waiting on exp://...
› Press r to reload app
```

### Phone App Should Show:
- Blue "LIVE DATA" badge on map
- Real search results (not "Mock Restaurant")
- Your actual location

## 🎓 Understanding the System

### Why Two Servers?
1. **Backend (port 4000)**: API that talks to Google Places, Ticketmaster, etc.
2. **Frontend (Expo)**: React Native app that talks to the backend

### Why Network IP?
Your phone and computer communicate over Wi-Fi. The phone needs to know the computer's IP address to reach the backend.

### Why Health Checks?
The script verifies the backend is running before starting Expo. This prevents the "backend unreachable" errors.

## 🔐 Security Notes

- Backend only listens on private network (not internet)
- Firewall rule is for local network only
- No data leaves your local network during development

## 📞 Need Help?

Check the error message carefully. Most issues are:
1. Wrong Wi-Fi network (phone vs computer)
2. Firewall blocking (see firewall fix above)
3. Old processes still running (use task kill command)
4. Missing dependencies (run RESET-DEPENDENCIES.cmd)

---

**Remember**: Just use `START.cmd` every time. That's all you need! 🚀
