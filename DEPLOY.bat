@echo off
title QIS HR - Firebase Hosting Deploy (ishaq-old)
cd /d "%~dp0"
cls
echo   ==================================================
echo     FIREBASE HOSTING DEPLOY  -  project: ishaq-old
echo   ==================================================
echo.

echo   [1/4] firebase CLI check...
where firebase >nul 2>nul
if errorlevel 1 (
  echo         nahi mila - install ho raha hai ^(2-3 min^)...
  call npm install -g firebase-tools
  if errorlevel 1 goto err
)
echo         OK

echo.
echo   [2/4] Login check...
call firebase login:list
echo         ^(agar login nahi hai to niche "firebase login" khud chale ga^)
call firebase login --no-localhost >nul 2>nul
if errorlevel 1 call firebase login

echo.
echo   [3/4] App build...
call npm run build
if errorlevel 1 goto err

echo.
echo   [4/4] Deploy...
call firebase deploy --only hosting --project ishaq-old
if errorlevel 1 goto err

echo.
echo   ==================================================
echo     DONE!  App live:  https://ishaq-old.web.app
echo     Mobile browser mein yeh URL kholein.
echo   ==================================================
pause
exit /b 0
:err
echo.
echo   *** FAIL - upar ka error dekhein ***
pause
exit /b 1
