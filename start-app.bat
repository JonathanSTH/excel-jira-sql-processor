@echo off
echo 🚀 Starting JIRA-SQL Validation App...
echo.
echo This will:
echo ✅ Kill any existing server instances
echo ✅ Start the correct server
echo ✅ Open your browser automatically
echo ✅ Handle proper cleanup on exit
echo.
pause

cd /d "%~dp0"
npm run app

pause

