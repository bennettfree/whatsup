# 🚀 START HERE - WhatsUp Development

## ⚡ Quick Start (Every Session)

### ONE COMMAND TO RUN EVERYTHING

```powershell
.\dev-start.ps1
```

**That's it!** This command:
- ✅ Detects your IP
- ✅ Updates .env
- ✅ Cleans old processes  
- ✅ Starts backend
- ✅ Verifies health
- ✅ Starts Expo
- ✅ **ALWAYS WORKS**

---

## 🔧 First Time Setup (Or If Broken)

### Step 1: Fix Packages (If you see errors)
```powershell
.\fix-packages.ps1
```
Wait 2-3 minutes for completion.

### Step 2: Start Dev Environment
```powershell
.\dev-start.ps1
```

### Step 3: Open App
- Scan QR code from Expo window
- Look for **BLUE "LIVE DATA"** badge
- ✅ You're connected!

---

## ✅ Success Checklist

After running `.\dev-start.ps1`, you should see:

- [x] ✓ IP detected
- [x] ✓ .env updated
- [x] ✓ Packages OK
- [x] ✓ Backend healthy
- [x] ✓ Expo starting
- [x] Two terminal windows open (Backend + Expo)

In your app:
- [x] BLUE badge says "LIVE DATA" (not orange/red)
- [x] Search returns real places (not mock data)
- [x] Maps show actual locations

---

## 🆘 If Something Goes Wrong

### "Unable to resolve expo-asset"
```powershell
.\fix-packages.ps1
```

### Backend won't connect
```powershell
# Check firewall (run as Administrator):
New-NetFirewallRule -DisplayName "WhatsUp Dev API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private
```

### Everything broken
```powershell
# Nuclear option (fixes everything):
.\fix-packages.ps1
# Wait for completion
.\dev-start.ps1
```

---

## 💡 Daily Workflow

**Morning** (first time of the day):
```powershell
.\dev-start.ps1
```

**Already running, need to reload**:
- Press `r` in Expo terminal

**Made code changes**:
- Expo hot-reloads automatically
- Or press `r` to force reload

**Switched Wi-Fi**:
```powershell
# Close terminals and run:
.\dev-start.ps1
# Auto-detects new IP
```

---

## 🎯 You're Ready!

**From now on**: `.\dev-start.ps1` is your single command to start coding.

**No more**:
- ❌ Manually editing .env
- ❌ Guessing your IP
- ❌ Backend connection issues
- ❌ Package corruption errors
- ❌ Wondering if backend is running

**Just**:
- ✅ Run one command
- ✅ Wait 10 seconds
- ✅ Start coding!

---

**Your development workflow is now bulletproof!** 🛡️
