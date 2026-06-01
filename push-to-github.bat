@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"

echo.
echo Push Story English Quest to GitHub
echo =================================
echo.
echo Paste your GitHub repository HTTPS URL.
echo Example: https://github.com/your-username/story-english-quest.git
echo.
set /p REPO_URL=Repository URL: 

if "%REPO_URL%"=="" (
  echo Repository URL is required.
  pause
  exit /b 1
)

echo.
echo Marking this project folder as safe for Git...
git config --global --add safe.directory "%CD%"
git config --global --add safe.directory "%CD:\=/%"

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)

git branch -M main
git push -u origin main
if errorlevel 1 goto failed

echo.
echo Push finished. Your code is now on GitHub.
pause
exit /b 0

:failed
echo.
echo Push did not finish. Please copy the error above and send it to Codex.
pause
exit /b 1
