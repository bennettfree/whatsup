# WhatsUp - Quick Reference Card

## 🚀 Daily Startup

```cmd
START.cmd
```

**That's it! Everything else is automatic.**

---

## 🔥 Quick Fixes

### Module Errors
```cmd
RESET-DEPENDENCIES.cmd
```

### Backend Won't Connect
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "WhatsUp Dev" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private
```

### Port Busy
```cmd
taskkill /F /IM node.exe
```

### Complete Reset
```cmd
taskkill /F /IM node.exe
RESET-DEPENDENCIES.cmd
START.cmd
```

---

## 📱 During Development

| Action | Command |
|--------|---------|
| Reload app | Press `r` in Expo window |
| Clear cache & reload | Press `Shift+r` in Expo window |
| Toggle inspector | Shake phone or press `i` |
| Open DevTools | Press `j` in Expo window |

---

## ✅ Success Checklist

- [ ] Two PowerShell windows opened (Backend + Expo)
- [ ] Backend shows "Server running on port 4000"
- [ ] Expo shows QR code
- [ ] Phone on same Wi-Fi as computer
- [ ] App shows BLUE "LIVE DATA" badge
- [ ] Search returns real results (not "Mock Restaurant")

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "expo-asset" error | Run `RESET-DEPENDENCIES.cmd` |
| Backend unreachable | Check Wi-Fi, run firewall command |
| Mock data showing | Backend not connected, check both windows running |
| Changes not appearing | Press `r` in Expo window |
| Everything broken | `taskkill /F /IM node.exe` then `START.cmd` |

---

## 📍 Important Files

- `START.cmd` ← **USE THIS TO START**
- `STARTUP_GUIDE.md` ← Full documentation
- `RESET-DEPENDENCIES.cmd` ← Fix module errors
- `.env` ← Auto-updated with your IP (don't edit manually)

---

## 🎯 URLs to Check

- Backend: `http://localhost:4000/api/health`
- Network: `http://YOUR_IP:4000/api/health` (replace YOUR_IP)

Should return: `{"status":"ok","timestamp":"..."}`

---

**Print this and keep it at your desk! 📄**
