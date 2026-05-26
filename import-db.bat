@echo off
REM ============================================================
REM  IMPORT the MyShop database from Git into your MySQL.
REM  >>> Double-click this AFTER you "git pull". <<<
REM
REM  WARNING: this REPLACES your local "myshop" database with
REM  the data from the project (backend\database\dump.sql).
REM ============================================================

set "MYSQL=C:\xampp\mysql\bin\mysql.exe"
set "INPUT=%~dp0backend\database\dump.sql"

if not exist "%INPUT%" (
    echo  ERROR - backend\database\dump.sql was not found.
    echo  Did you run "git pull" first?
    echo.
    pause
    exit /b 1
)

echo.
echo  Importing data from backend\database\dump.sql ...
echo  (this replaces your local myshop database)
echo.

"%MYSQL%" -u root < "%INPUT%"

if %ERRORLEVEL%==0 (
    echo  SUCCESS - your database now matches the project.
) else (
    echo  ERROR - import failed.
    echo  Make sure MySQL is running in the XAMPP Control Panel.
)
echo.
pause
