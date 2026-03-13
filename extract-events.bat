@echo off
echo ========================================
echo DISCORD EVENT EXTRACTION
echo ========================================
echo.
echo Extracting events from Discord data...
echo.

cd /d "%~dp0"
npx tsx scripts/extract-discord-events.ts

echo.
echo ========================================
echo Done! Check 'ALL EVENT/extracted-knowledge.txt'
echo ========================================
pause
