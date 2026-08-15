@echo off
schtasks /create /tn "WarehouseApp" /tr "cmd /c \"cd /d \"C:\Users\Asus\Desktop\junior code project\Warehouse\" && php artisan serve --host=127.0.0.1 --port=8000 > \"C:\Users\Asus\Desktop\junior code project\Warehouse\server.log\" 2>&1\"" /sc onlogon /f
echo.
if %errorlevel%==0 (
    echo SUCCESS: WarehouseApp will now auto-start on every login.
) else (
    echo FAILED. Try running this file as Administrator.
)
pause
