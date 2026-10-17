@echo off
setlocal
title E-Commerce App - Dev Servers
cd /d "%~dp0"

echo ============================================
echo   E-Commerce App - starting dev servers
echo ============================================
echo.

REM --- Check MongoDB is running on port 27017 ---
netstat -an | findstr ":27017" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo [ERROR] MongoDB is not running on port 27017.
  echo         Start the MongoDB service, then run this file again.
  pause
  exit /b 1
)
echo [OK] MongoDB is running on port 27017.
echo.

REM --- Check dependencies, install if missing ---
if not exist backend\node_modules (
  echo [..] Installing backend dependencies...
  pushd backend
  call npm install
  popd
)
if not exist frontend\node_modules (
  echo [..] Installing frontend dependencies...
  pushd frontend
  call npm install
  popd
)
echo.

REM --- Create .env files from examples if missing ---
if not exist backend\.env (
  echo [WARN] backend\.env not found - copying backend\.env.example
  copy backend\.env.example backend\.env >nul
  echo [WARN] Edit backend\.env to set MONGO_URI and JWT_SECRET before relying on defaults.
)
if not exist frontend\.env (
  echo [WARN] frontend\.env not found - copying frontend\.env.example
  copy frontend\.env.example frontend\.env >nul
)

REM --- Start backend (port 4000, auto-fallback 4001) ---
echo [..] Starting backend  -> http://localhost:4000
start "ECOM-BACKEND" /min "%~dp0start-app.bat" backend

REM --- Start frontend (port 3001) ---
echo [..] Starting frontend -> http://localhost:3001
start "ECOM-FRONTEND" /min "%~dp0start-app.bat" frontend

echo.
echo Waiting for the servers to boot...
timeout /t 12 /nohdr >nul

REM --- Open the app in the browser ---
start "" http://localhost:3001

echo.
echo ============================================
echo   DONE - the app is running:
echo.
echo     Frontend : http://localhost:3001
echo     Backend  : http://localhost:4000
echo.
echo     Tip: if a port was already taken, the servers
echo     auto-pick the next one (4001 / 3002) - check the
echo     minimized windows for the actual port.
echo.
echo     To STOP the app, close the two minimized windows
echo     named "ECOM-BACKEND" and "ECOM-FRONTEND".
echo ============================================
pause
