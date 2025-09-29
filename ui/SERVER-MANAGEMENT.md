# 🚀 Server Management Guide

## 🛡️ **Port Conflict Solutions**

### **Problem**: `EADDRINUSE` - Port 3000 is already in use

### **Solutions** (in order of preference):

#### **1. Smart Server Starter** ⭐ **RECOMMENDED**
```bash
npm run ui
```
- **Automatically finds available port** (3000, 3001, 3002, etc.)
- **Checks if server is already running** and reuses it
- **Handles graceful shutdown** with Ctrl+C
- **Shows helpful status messages**

#### **2. Direct Server Start**
```bash
npm run ui:direct
```
- **Starts on port 3000** (or fails if in use)
- **Shows helpful error messages** if port is busy
- **Suggests alternative solutions**

#### **3. Custom Port**
```bash
npm run ui:port
```
- **Forces port 3001** (or any port you set)
- **Useful for multiple instances**

#### **4. Manual Port Selection**
```bash
PORT=3002 node ui/server.js
```
- **Set any port** you want
- **Environment variable override**

## 🔧 **Server Features**

### **Health Check**
- **Endpoint**: `http://localhost:PORT/api/health`
- **Returns**: Server status, port, timestamp
- **Useful for**: Monitoring, debugging, automation

### **Graceful Shutdown**
- **Ctrl+C**: Clean shutdown with 5-second timeout
- **SIGTERM**: Process manager shutdown
- **Page Close**: Warns user about unsaved work

### **Error Handling**
- **Port conflicts**: Clear error messages with solutions
- **File errors**: Detailed error reporting
- **Network issues**: Automatic retry logic

## 🌐 **Alternative Hosts**

Instead of `localhost`, you can use:

- **`127.0.0.1`** - Same as localhost, more explicit
- **`0.0.0.0`** - Listen on all interfaces (useful for Docker)
- **Custom hostname** - Set in `/etc/hosts` or use local domain

## 📱 **Client-Side Features**

### **Page Close Protection**
- **Warns user** before closing the page
- **Offers to shutdown server** when page is closed
- **Tab switching detection** with status logging
- **Graceful server shutdown** via API call

### **Connection Monitoring**
- **Online/offline detection**
- **Automatic server status checks**
- **Reconnection handling**

## 🚨 **Troubleshooting**

### **Port Still in Use?**
```bash
# Windows - Find PID using port
netstat -ano | findstr :3000
# Output: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
# The last number (12345) is the PID

# Windows - Kill process
taskkill /PID 12345 /F

# Windows - One-liner to kill process using port
for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %a

# PowerShell - One-liner
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# macOS/Linux
lsof -ti:3000
kill -9 <PID_NUMBER>

# Using our server's PID file
type ui\.server.pid
taskkill /PID <PID_FROM_FILE> /F
```

### **Server Won't Start?**
1. **Check if port is free**: `npm run ui`
2. **Try different port**: `PORT=3001 npm run ui:direct`
3. **Check for errors**: Look at console output
4. **Restart terminal**: Sometimes helps with port locks

### **Page Won't Load?**
1. **Check server is running**: Visit `/api/health`
2. **Check browser console**: Look for network errors
3. **Try different browser**: Clear cache/cookies
4. **Check firewall**: Ensure port is accessible

## 💡 **Best Practices**

1. **Always use `npm run ui`** for automatic port management
2. **Check `/api/health`** if something seems wrong
3. **Use Ctrl+C** to stop server gracefully
4. **Don't close browser tab** if you have unsaved work
5. **Check console logs** for detailed error information

## 🔄 **Development Workflow**

```bash
# Start server (smart port detection)
npm run ui

# In another terminal, make changes
# Server auto-reloads on file changes

# Stop server
Ctrl+C

# Restart if needed
npm run ui
```

---

**Need help?** Check the console output for detailed error messages and suggested solutions! 🚀
