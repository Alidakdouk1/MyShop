@echo off
REM ============================================================
REM  EXPORT your MyShop database into a file for Git.
REM  >>> Double-click this BEFORE you commit and push. <<<
REM
REM  It saves everything (banner, products, settings, etc.)
REM  into:  backend\database\dump.sql
REM  Then push it with Git so your friend gets the same data.
REM ============================================================

set "MYSQLDUMP=C:\xampp\mysql\bin\mysqldump.exe"
set "OUTPUT=%~dp0backend\database\dump.sql"

echo.
echo  Exporting database "myshop" ...
echo.

"%MYSQLDUMP%" -u root --databases myshop --add-drop-database --default-character-set=utf8mb4 --result-file="%OUTPUT%"

if %ERRORLEVEL%==0 (
    echo  SUCCESS - data saved to: backend\database\dump.sql
    echo.
    echo  Now run these 3 commands to send it to your friend:
    echo      git add .
    echo      git commit -m "update data"
    echo      git push
) else (
    echo  ERROR - export failed.
    echo  Make sure MySQL is running in the XAMPP Control Panel.
)
echo.
pause
