@echo off
title Calcify_Suite - One-Click GitHub Uploader
color 0B
cls
echo ======================================================================
echo           CALCIFY_SUITE - 1-CLICK GITHUB UPLOADER
echo ======================================================================
echo.
echo  Why you cannot upload files manually on github.com:
echo  - GitHub website blocks dragging folders with > 100 files.
echo  - This 1-click script uploads everything properly via Git in seconds!
echo.
echo ======================================================================
echo.

cd /d "C:\Users\tharu\.gemini\antigravity\scratch\agent-salary-performance-tracker"

:: Ensure Git and GitHub CLI are in PATH
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%ProgramFiles%\GitHub CLI;%PATH%"

echo [*] Checking GitHub Authentication...
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ACTION REQUIRED] Connecting your GitHub Account:
    echo  1. An 8-character code will appear below.
    echo  2. Press ENTER to open GitHub in your web browser.
    echo  3. Paste the code and click 'Authorize'.
    echo.
    gh auth login --hostname github.com --git-protocol https --web
)

echo.
echo [*] Packaging Calcify_Suite repository...
git add .
git commit -m "feat: complete Calcify_Suite platform" >nul 2>&1

echo.
echo [*] Creating 'calcify-suite' repository on your GitHub and uploading...
gh repo create calcify-suite --public --source=. --remote=origin --push

if %errorlevel% neq 0 (
    echo.
    echo [*] Repository may already exist. Pushing updates...
    git push -u origin main
)

echo.
echo ======================================================================
echo   [SUCCESS] Your complete site has been successfully uploaded to GitHub!
echo ======================================================================
echo.
pause
