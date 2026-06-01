@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
set "LOCALAPPDATA=%~dp0.localappdata"
set "APPDATA=%~dp0.appdata"
set "npm_config_cache=%~dp0.npm-cache"
set "VERCEL_TELEMETRY_DISABLED=1"
set "VERCEL_CONFIG=%~dp0.vercel-global"

echo.
echo Story English Quest - Vercel Deployment
echo ======================================
echo.

if not exist node_modules (
  echo Installing project packages...
  call "C:\Program Files\nodejs\npm.cmd" install
  if errorlevel 1 goto failed
)

if not exist node_modules\vercel (
  echo Installing Vercel deployment tool...
  call "C:\Program Files\nodejs\npm.cmd" install --save-dev vercel
  if errorlevel 1 goto failed
)

echo.
echo Starting Vercel deployment...
echo Step 1: Checking Vercel login...
echo If Vercel asks you to log in, open the link shown below and finish login in your browser.
echo.

"C:\Program Files\nodejs\node.exe" node_modules\vercel\dist\index.js whoami --global-config "%VERCEL_CONFIG%"
if errorlevel 1 (
  echo.
  echo Please log in to Vercel now.
  "C:\Program Files\nodejs\node.exe" node_modules\vercel\dist\index.js login --global-config "%VERCEL_CONFIG%"
  if errorlevel 1 goto failed
)

echo.
echo Step 2: Deploying to Vercel production...
echo If this is your first deployment, Vercel will create a new project automatically.
echo.

"C:\Program Files\nodejs\node.exe" node_modules\vercel\dist\index.js deploy --prod --yes --global-config "%VERCEL_CONFIG%"
if errorlevel 1 goto failed

echo.
echo Deployment finished. Copy the production URL shown above.
echo Open /qr on that URL to get the QR Code page.
pause
exit /b 0

:failed
echo.
echo Deployment did not finish. Please copy the error message above and send it to Codex.
pause
exit /b 1
