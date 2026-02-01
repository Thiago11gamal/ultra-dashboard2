@echo off
echo Iniciando o Ultra Dashboard...

cd /d "%~dp0"

:: Mata processos antigos
taskkill /f /im node.exe >nul 2>&1

:: Inicia servidor em segundo plano e abre navegador após 2 segundos
start /min cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5173"

npm run dev

pause
