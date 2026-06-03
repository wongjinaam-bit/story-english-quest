@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"
set "XDG_DATA_HOME=%cd%\.vercel-cache\data"
set "LOCALAPPDATA=%cd%\.vercel-cache\local"
set "APPDATA=%cd%\.vercel-cache\roaming"
set "VERCEL_TELEMETRY_DISABLED=1"
set "LOG_DIR=%cd%\deploy-logs"
set "STAMP=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%"
set "STAMP=%STAMP: =0%"
set "LOG_FILE=%LOG_DIR%\deploy-%STAMP%.log"
set "STATE_FILE=%cd%\.vercel-cache\last-auto-deploy.txt"

if not exist "%XDG_DATA_HOME%" mkdir "%XDG_DATA_HOME%"
if not exist "%LOCALAPPDATA%" mkdir "%LOCALAPPDATA%"
if not exist "%APPDATA%" mkdir "%APPDATA%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

call :log "Story English Quest auto deploy started."

if not exist "%cd%\node_modules\vercel\dist\vc.js" (
  call :log "Vercel tool was not found. Please run npm install once."
  exit /b 1
)

for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "CURRENT_VERSION=%%H"
if "%CURRENT_VERSION%"=="" set "CURRENT_VERSION=unknown"

set "LAST_VERSION="
if exist "%STATE_FILE%" set /p LAST_VERSION=<"%STATE_FILE%"

if /i "%CURRENT_VERSION%"=="%LAST_VERSION%" (
  call :log "No new local commit since last successful auto deploy. Skipping."
  exit /b 0
)

call :log "Checking Vercel login..."
"C:\Program Files\nodejs\node.exe" "%cd%\node_modules\vercel\dist\vc.js" whoami >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "Vercel is not logged in. Open deploy-direct-to-vercel.bat once and finish login first."
  exit /b 1
)

call :log "Deploying to Vercel production..."
"C:\Program Files\nodejs\node.exe" "%cd%\node_modules\vercel\dist\vc.js" --prod --yes >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "Deploy failed. Check the newest file in deploy-logs."
  exit /b 1
)

>"%STATE_FILE%" echo %CURRENT_VERSION%
call :log "Deploy finished successfully."
exit /b 0

:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1>> "%LOG_FILE%"
exit /b 0
