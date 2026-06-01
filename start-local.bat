@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo Starting Story English Quest locally...
echo Open http://localhost:3000 after the server starts.
echo.

"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev
pause
