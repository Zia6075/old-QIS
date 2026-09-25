@echo off
title QIS HR - Firebase password reset
cd /d "%~dp0"
cls
echo   ==================================================
echo     FIREBASE USER PASSWORD RESET
echo   ==================================================
echo.
echo   Yeh script aap ko seedha Firebase Console khol kar dega.
echo   Wahan:  Authentication -^> Users -^> email -^> 3 dots -^> Reset password
echo.
start "" "https://console.firebase.google.com/project/ishaq-old/authentication/users"
echo   Browser khul gaya. Password reset kar ke app mein wahi email/password dalen.
echo.
pause
