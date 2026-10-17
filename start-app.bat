@echo off
rem Helper: runs `npm run dev` inside the subfolder passed as %1
rem Usage (from run.bat):  start "TITLE" /min start-app.bat backend|frontend
cd /d "%~dp0%1"
call npm run dev
