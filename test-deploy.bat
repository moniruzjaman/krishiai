@echo off
REM Krishi AI - Deployment Test Script

echo ========================================
echo  Krishi AI Deployment Test
echo ========================================
echo.

REM Step 1: Check Node.js
echo [1/6] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not installed. Please install Node.js 18+
    exit /b 1
)
echo.

REM Step 2: Check .env file
echo [2/6] Checking .env configuration...
if not exist .env (
    echo ERROR: .env file not found
    exit /b 1
)

findstr /C:"VITE_GEMINI_API_KEY" .env >nul
if %errorlevel% neq 0 (
    echo ERROR: VITE_GEMINI_API_KEY not set in .env
    exit /b 1
)

findstr /C:"VITE_HF_TOKEN" .env >nul
findstr /C:"hf_" .env >nul
if %errorlevel% neq 0 (
    echo WARNING: Hugging Face token not set or invalid
    echo HF integration will not work without valid token
)
echo.

REM Step 3: Check package.json
echo [3/6] Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        exit /b 1
    )
)
echo Dependencies OK
echo.

REM Step 4: TypeScript check
echo [4/6] Checking TypeScript compilation...
call npx tsc --noEmit --skipLibCheck
if %errorlevel% neq 0 (
    echo WARNING: TypeScript errors detected
    echo Continuing with build anyway...
)
echo.

REM Step 5: Build test
echo [5/6] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo Build successful!
echo.

REM Step 6: Check build output
echo [6/6] Verifying build output...
if not exist dist (
    echo ERROR: dist folder not created
    exit /b 1
)

if not exist dist\index.html (
    echo ERROR: index.html not found in dist
    exit /b 1
)
echo Build output verified
echo.

echo ========================================
echo  Build Test PASSED!
echo ========================================
echo.
echo Next steps:
echo 1. Preview locally: npm run preview
echo 2. Deploy to Vercel: vercel --prod
echo.
