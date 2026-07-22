@echo off
if not exist .env (
  echo HATA: Once .env.example dosyasini .env olarak kopyalayip parolalari doldurun.
  pause
  exit /b 1
)
if not exist node_modules call npm install
if errorlevel 1 (
  echo Node.js veya npm bulunamadi. https://nodejs.org adresinden LTS surumunu kurun.
  pause
  exit /b 1
)
npm start
pause
