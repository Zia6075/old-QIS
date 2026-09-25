@echo off
title QIS HR System - SAB KUCH EK COMMAND
cd /d "%~dp0"
cls
echo.
echo   ==================================================
echo     QIS HR ^& VISA SYSTEM - SAB KUCH EK COMMAND
echo   ==================================================
echo.
echo   Yeh script khud yeh sab kare gi (live dikhe ga):
echo     [1/8] npm install
echo     [2/8] Firebase setup (RTDB + rules + test)
echo     [3/8] naya version + tests + build
echo     [4/8] EXE installer (npm run dist)
echo     [5/8] GitHub token  -^> aap paste karein (pause hoga)
echo     [6/8] git push + GitHub RELEASE + files upload
echo     [7/8] firebase deploy --only hosting --project ishaq-1985
echo     [8/8] BROWSER khud khule ga (release + live app)
echo.
echo   --------------------------------------------------
set /p NOTE="  Is version mein kya naya hai? (likhein ya khali chhor kar Enter): "
echo   --------------------------------------------------
echo.
if "%NOTE%"=="" (
  call npm run all -- --note "Naya update"
) else (
  call npm run all -- --note "%NOTE%"
)
echo.
echo   ==================================================
echo     KHATAM! Agar koi step fail hua to upar dekhein
echo   ==================================================
echo.
pause
