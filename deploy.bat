@echo off
REM Krishi AI - Production Deployment Script

echo ========================================
echo  Krishi AI Production Deployment
echo ========================================
echo.

REM Step 1: Check Vercel CLI
echo [1/5] Checking Vercel CLI...
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Vercel CLI
        exit /b 1
    )
)
echo Vercel CLI found
echo.

REM Step 2: Login to Vercel
echo [2/5] Verifying Vercel login...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please login to Vercel...
    vercel login
    if %errorlevel% neq 0 (
        echo ERROR: Login failed
        exit /b 1
    )
)
echo Logged in successfully
echo.

REM Step 3: Link project
echo [3/5] Linking to Vercel project...
vercel link --project krishiai-rbvdpdhfg-krishi-ai-team --scope krishi-ai-team --yes 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Auto-link failed. Manual linking required.
    echo Please run: vercel link
    echo Select: krishiai-rbvdpdhfg-krishi-ai-team
    pause
)
echo Project linked
echo.

REM Step 4: Pull environment variables
echo [4/5] Pulling environment variables...
vercel env pull --yes
if %errorlevel% neq 0 (
    echo WARNING: Failed to pull environment variables
    echo Please ensure .env file has all required variables
)
echo Environment variables ready
echo.

REM Step 5: Deploy to production
echo [5/5] Deploying to production...
echo.
echo ========================================
echo  Starting Deployment...
echo ========================================
echo.

vercel --prod

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  Deployment Failed!
    echo ========================================
    echo.
    echo Please check the error message above.
    echo Common issues:
    echo - Missing environment variables
    echo - Build errors
    echo - Network connectivity
    echo.
    exit /b 1
)

echo.
echo ========================================
echo  Deployment Successful! 🎉
echo ========================================
echo.
echo Your app is now live at:
echo https://krishiai-rbvdpdhfg-krishi-ai-team.vercel.app
echo.
echo Next steps:
echo 1. Open the URL in your browser
echo 2. Test AI Scanner functionality
echo 3. Click 📊 to view monitoring dashboard
echo 4. Check Vercel dashboard for analytics
echo.
