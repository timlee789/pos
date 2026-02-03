@echo off
echo ====================================================
echo   Stopping POS System & Restoring Windows...
echo ====================================================

:: 1. 크롬창 강제 종료 (손님용, 직원용 모두)
taskkill /F /IM chrome.exe /T

:: 2. 서버 및 프린터 서버 종료 (Node.js, CMD)
taskkill /F /IM node.exe /T
taskkill /F /IM cmd.exe /T

:: 3. [핵심] 윈도우 탐색기(바탕화면/작업표시줄) 되살리기
start explorer.exe

echo.
echo Windows has been restored!
timeout /t 3
exit