@echo off
cd /d "%~dp0"

if not exist .env (
  echo HATA: Once .env.example dosyasini .env olarak kopyalayip parolalari doldurun.
  pause
  exit /b 1
)

set "LOCAL_NODE=%~dp0..\tools\node-v24.18.0-win-x64\node.exe"

if exist "%LOCAL_NODE%" (
  "%LOCAL_NODE%" server-portable.js
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo HATA: Node.js bulunamadi.
    pause
    exit /b 1
  )
  node server-portable.js
)

pause
