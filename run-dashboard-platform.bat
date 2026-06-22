@echo off
setlocal

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo Starting Dashboard Platform...
echo Opening the app at http://localhost:8080 once startup completes.
echo.

call "%ROOT_DIR%mvnw.cmd" spring-boot:run

echo.
echo The app has stopped.
pause
