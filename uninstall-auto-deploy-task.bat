@echo off
setlocal
chcp 65001 >nul

echo Remove Story English Quest auto deploy
echo =====================================
echo.

schtasks /Delete /TN "Story English Quest Auto Deploy" /F
if errorlevel 1 goto failed

echo.
echo Auto deploy task removed.
pause
exit /b 0

:failed
echo.
echo Could not remove the auto deploy task. It may already be removed.
pause
exit /b 1
