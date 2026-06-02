@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Deploy Story English Quest directly to Vercel
echo =============================================
echo.
echo This avoids GitHub push if Git on Windows is having login problems.
echo If Vercel asks you to log in, follow the browser instructions.
echo.

set "XDG_DATA_HOME=%cd%\.vercel-cache\data"
set "LOCALAPPDATA=%cd%\.vercel-cache\local"
set "APPDATA=%cd%\.vercel-cache\roaming"

if not exist "%XDG_DATA_HOME%" mkdir "%XDG_DATA_HOME%"
if not exist "%LOCALAPPDATA%" mkdir "%LOCALAPPDATA%"
if not exist "%APPDATA%" mkdir "%APPDATA%"

echo Step 1: Checking Vercel login...
"C:\Program Files\nodejs\node.exe" "%cd%\node_modules\vercel\dist\vc.js" whoami

if errorlevel 1 (
  echo.
  echo You are not logged in to Vercel in this folder.
  echo Starting Vercel login...
  "C:\Program Files\nodejs\node.exe" "%cd%\node_modules\vercel\dist\vc.js" login
)

echo.
echo Step 2: Deploying to production...
"C:\Program Files\nodejs\node.exe" "%cd%\node_modules\vercel\dist\vc.js" --prod --yes

echo.
echo Deployment command finished.
pause
