@echo off
cd /d "%~dp0"

set "DOCKER=C:\Users\Arda\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
if not exist "%DOCKER%" set "DOCKER=docker"

echo Elasticsearch baslatiliyor...
"%DOCKER%" compose up -d elasticsearch
if errorlevel 1 (
  echo.
  echo HATA: Docker Desktop acik ve Engine Running durumunda olmali.
  pause
  exit /b 1
)

echo.
echo Elasticsearch hazir olana kadar bekleniyor...
for /L %%i in (1,1,60) do (
  curl.exe -fs http://localhost:9200/_cluster/health >nul 2>nul && goto ready
  timeout /t 2 /nobreak >nul
)

echo HATA: Elasticsearch iki dakika icinde hazir olmadi.
echo Docker Desktop icindeki container loglarini kontrol edin.
pause
exit /b 1

:ready
start "" http://localhost:9200
echo Elasticsearch adresi: http://localhost:9200
pause
