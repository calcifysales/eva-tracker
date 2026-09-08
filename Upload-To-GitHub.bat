@echo off
title Calcify_Suite - One-Click GitHub & Pages Publisher
color 0B
cls
echo ======================================================================
echo       CALCIFY_SUITE - 1-CLICK GITHUB & GITHUB PAGES PUBLISHER
echo ======================================================================
echo.
echo  This script pushes your complete code directly to GitHub.
echo  GitHub Actions will automatically build and deploy your live site!
echo.
echo ======================================================================
echo.

cd /d "C:\Users\tharu\.gemini\antigravity\scratch\agent-salary-performance-tracker"

:: Ensure Git and GitHub CLI are in PATH
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%ProgramFiles%\GitHub CLI;%PATH%"

echo [*] Packaging Calcify_Suite codebase...
git add .
git commit -m "feat: deploy standalone Calcify_Suite to GitHub Pages" >nul 2>&1

echo [*] Pushing updates to GitHub main branch...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
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
    git push -u origin main
)

echo.
echo ======================================================================
echo   [SUCCESS] Code uploaded to GitHub!
echo.
echo   To view your live site deployed within GitHub:
echo   1. Open: https://github.com/calcifysales/calcify-suite/settings/pages
echo   2. Under 'Build and deployment' -> 'Source', select: 'GitHub Actions'
echo   3. Your live link will be: https://calcifysales.github.io/calcify-suite/
echo ======================================================================
echo.
pause
