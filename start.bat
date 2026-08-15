@echo off
echo Starting Warehouse Management System...
echo.

cd /d "%~dp0"

echo [1/2] Starting PHP backend server on http://127.0.0.1:8000
start "PHP Server" cmd /k "php artisan serve --host=127.0.0.1 --port=8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite frontend server...
start "Vite Dev Server" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Open your browser at: http://127.0.0.1:8000
echo.
echo Close both black windows to stop the servers.
pause
