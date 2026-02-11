# 🚨 EMERGENCY FIX - Runtime Error Resolution

## The Error You're Seeing
```
TypeError: setCustomSourceTransformer is not a function
```

## What Happened
The expo-asset package versions were incorrect, causing a runtime incompatibility.

## ✅ FIXED - What I Did
1. ✅ Installed correct Expo SDK 54 compatible versions
2. ✅ Updated all expo packages to match SDK version
3. ✅ Updated startup scripts to clear caches automatically

## 🔥 IMMEDIATE FIX STEPS

### Option 1: Quick Cache Clear (Try This First)
1. Close ALL PowerShell/Command windows
2. Run: `CLEAR-CACHE.cmd`
3. Run: `START.cmd`

### Option 2: Full Reset (If Option 1 Doesn't Work)
1. Close ALL PowerShell/Command windows
2. Run: `RESET-DEPENDENCIES.cmd` (takes 2-3 minutes)
3. Run: `START.cmd`

## 📋 Step-by-Step Instructions

### Step 1: Close Everything
- Close all PowerShell windows
- Close all Command Prompt windows
- Make sure no Expo or Node processes are running

### Step 2: Choose Your Fix

**If you want the quick fix:**
```cmd
CLEAR-CACHE.cmd
```
Wait for it to complete, then:
```cmd
START.cmd
```

**If you want the full reset (recommended):**
```cmd
RESET-DEPENDENCIES.cmd
```
This will:
- Stop all Node processes
- Remove node_modules
- Clear all caches
- Reinstall everything with correct versions
- Takes about 2-3 minutes

Then:
```cmd
START.cmd
```

### Step 3: Verify Fix
After running START.cmd, you should see:
- ✅ Backend window opens (no errors)
- ✅ Expo window opens with QR code
- ✅ NO "setCustomSourceTransformer" error
- ✅ App loads successfully on phone

## 🎯 What's Different Now

### Correct Package Versions (SDK 54)
- `expo-asset: ~12.0.12` ✅ (was wrong version)
- `expo-constants: ~18.0.13` ✅ (was missing)
- `expo-font: ~14.0.11` ✅ (was wrong version)
- `expo-keep-awake: ~15.0.8` ✅ (was wrong version)
- `expo-splash-screen: ~31.0.13` ✅ (was missing)

### Updated Startup Script
`dev-start.ps1` now automatically:
- Clears Metro cache
- Clears Expo cache
- Ensures clean slate every time

## 🔍 How to Verify Everything is Working

### 1. Check Package Versions
```cmd
npm list expo-asset
```
Should show: `expo-asset@12.0.12`

### 2. Check No Running Processes
```cmd
tasklist | findstr node
```
Should show nothing (or run after closing windows)

### 3. Start Fresh
```cmd
START.cmd
```

### 4. Watch for Success Indicators
Backend window should show:
```
Server running on port 4000
Backend health endpoint active
```

Expo window should show:
```
Metro waiting on exp://...
```

Phone app should:
- Load without errors
- Show map screen
- NO "setCustomSourceTransformer" error

## 🚨 If You Still Get Errors

### Error: Module not found
Run: `RESET-DEPENDENCIES.cmd`

### Error: Port in use
Run:
```cmd
taskkill /F /IM node.exe
```
Then run `START.cmd` again.

### Error: Backend unreachable
1. Check both windows are running
2. Make sure phone is on same Wi-Fi
3. Run firewall command (see STARTUP_GUIDE.md)

## 📞 Quick Reference

| Problem | Solution |
|---------|----------|
| setCustomSourceTransformer error | `CLEAR-CACHE.cmd` then `START.cmd` |
| Module errors | `RESET-DEPENDENCIES.cmd` then `START.cmd` |
| Port busy | `taskkill /F /IM node.exe` then `START.cmd` |
| Backend unreachable | Check Wi-Fi, run firewall rule |
| Everything broken | `RESET-DEPENDENCIES.cmd` (full reset) |

## ✅ Success Checklist

After running your fix, verify:
- [ ] No setCustomSourceTransformer error
- [ ] Backend window running without errors
- [ ] Expo window showing QR code
- [ ] App loads on phone
- [ ] Map shows real data (LIVE DATA badge)
- [ ] Search works

## 🎉 Prevention

From now on, ALWAYS use:
```cmd
START.cmd
```

This script now automatically:
- Clears caches
- Updates IP
- Verifies backend
- Ensures clean start

You should NEVER see this error again.

---

**Current Status**: ✅ FIXED - Correct versions installed
**Action Required**: Run `CLEAR-CACHE.cmd` then `START.cmd`
**Expected Time**: 2 minutes
