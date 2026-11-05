@echo off
title Starting Car Management System...
echo ===================================================
echo Starting Car Management System Frontend and Backend
echo ===================================================

echo Starting Frontend (Vite)...
start "Car Management Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Starting Backend (Django)...
start "Car Management Backend" cmd /k "cd /d "%~dp0backend" && python manage.py runserver 8000"

echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak > nul

echo Opening localhost in browser...
start http://localhost:5173

echo ===================================================
echo Servers are running in separate background windows.
echo ===================================================
pause
