@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo Install Story English Quest auto deploy
echo ======================================
echo.
echo This will create a Windows task that checks every 30 minutes.
echo It only deploys when the local project has a newer saved version.
echo Keep the computer on and signed in for it to run.
echo.

schtasks /Create /TN "Story English Quest Auto Deploy" /TR "\"%cd%\deploy-auto-to-vercel.bat\"" /SC MINUTE /MO 30 /F
if errorlevel 1 goto failed

echo.
echo Auto deploy task installed.
echo You can close this window.
pause
exit /b 0

:failed
echo.
echo Could not install the auto deploy task.
echo Please send this window text to Codex.
pause
exit /b 1
