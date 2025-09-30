# 🚀 JIRA-SQL Validation App

## Quick Start

```bash
npm run app
```

**Or double-click:** `start-app.bat` (Windows)

This will:
1. ✅ Kill any existing server instances
2. ✅ Start the correct server (root `server.js`)
3. ✅ Open your browser automatically
4. ✅ Handle proper cleanup on exit

## What This Fixes

### ❌ **Before (Problems):**
- Multiple server instances running simultaneously
- Wrong server responding to API calls (getting simple response instead of parsed data)
- Complex startup scripts that hang on Windows commands
- Confusing which server is actually running

### ✅ **After (Solutions):**
- **Simple & Reliable**: No complex Windows command dependencies
- **Correct Server**: Always uses the root `server.js` with full functionality
- **Auto Browser**: Opens browser automatically
- **Smart Port Management**: Finds available ports automatically
- **Clean Shutdown**: Handles Ctrl+C gracefully

## Server Management Features

### **Simple & Reliable**
- No complex Windows command dependencies
- Automatic port detection and management
- Clean startup and shutdown process

### **Port Management**
- Automatically finds available ports (3000, 3001, 3002, etc.)
- Handles port conflicts intelligently
- Shows clear error messages if no ports available

### **Browser Integration**
- Automatically opens browser to the app
- Shows manual URL if auto-open fails

## Access Your App

When using `npm run app`, you get access to:

- **UI**: `http://localhost:3000/ui/index.html`
- **Health Check**: `http://localhost:3000/api/health`
- **Fetch Sprint**: `http://localhost:3000/api/fetch-sprint` (the correct one!)

## Troubleshooting

### **Port Already in Use**
```bash
# The app will automatically find another port
# Or manually kill processes:
taskkill /IM node.exe /F
npm run app
```

### **Server Not Responding**
```bash
# Kill all instances and restart
taskkill /IM node.exe /F
npm run app
```

### **Browser Not Opening**
The app will show the URL to open manually:
```
🔗 Please manually open: http://localhost:3000
```

## Development

### **File Structure**
```
├── start-app-simple.js   # ← Simple, reliable app starter
├── start-app.bat         # ← Windows batch file
├── server.js             # ← Root server (correct one)
├── ui/
│   ├── server.js         # ← UI-only server (simpler)
│   ├── index.html        # ← Main UI
│   └── app.js            # ← Frontend logic
└── package.json          # ← Updated with "app" script
```

### **Scripts Available**
- `npm run app` - **RECOMMENDED**: Unified app starter
- `npm run build` - Build TypeScript
- `npm run test` - Run tests

## Why This Matters

The original issue was that you had **two different servers**:
1. **`ui/server.js`** - Simple server that only runs JIRA script
2. **`server.js`** - Full-featured server with parsing, file management, etc.

The frontend was hitting the wrong server, which is why you got:
```json
{
    "success": true,
    "data": "No file generated",
    "output": "🔍 Getting tickets from WTCI Sprint 9/25/2025...\n"
}
```

Instead of the proper response with parsed sprint data and file management.

**Now with `npm run app`, you always get the correct server!** 🎉

