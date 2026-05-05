@echo off
REM Krishi AI - Quick Production Deployment

echo ========================================
echo  Krishi AI Production Deployment
echo ========================================
echo.
echo This will deploy your app to Vercel
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Vercel CLI
        echo Please run: npm install -g vercel
        pause
        exit /b 1
    )
)

echo ✓ Vercel CLI found
echo.

REM Check if logged in
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please login to Vercel...
    vercel login
    if %errorlevel% neq 0 (
        echo ERROR: Login failed
        pause
        exit /b 1
    )
)

echo ✓ Logged in as:
vercel whoami
echo.

REM Deploy
echo ========================================
echo  Deploying to Production...
echo ========================================
echo.

vercel --prod

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  Deployment Failed!
    echo ========================================
    echo.
    echo Common issues:
    echo - Missing environment variables in Vercel
    echo - Build errors (check Vercel dashboard)
    echo - Network connectivity
    echo.
    echo Fix the issue and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Deployment Successful! 🎉
echo ========================================
echo.
echo Your app is live at:
echo https://krishiai-flixcn4v2-krishi-ai-team.vercel.app
echo.
echo Next steps:
echo 1. Open the URL in your browser
echo 2. Test AI Scanner (upload image)
echo 3. Check console for cost optimization
echo 4. Monitor Vercel dashboard
echo.
echo Documentation:
echo - DEPLOYMENT_SUMMARY.md - Full deployment guide
echo - ANALYZER_TEST.md - Testing checklist
echo - SECURITY_CHECKLIST.md - Security best practices
echo.

pause
