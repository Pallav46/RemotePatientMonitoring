@echo off
echo ======================================================
echo   Patient Monitoring System - Quick Start Script
echo ======================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo Docker is running
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Creating from .env.example...
    copy .env.example .env
    echo Please edit .env file with your SMTP credentials before proceeding.
    echo.
    pause
)

echo Building Docker images...
docker-compose build

if errorlevel 1 (
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo Build completed successfully
echo.

echo Starting all services...
docker-compose up -d

if errorlevel 1 (
    echo Error: Failed to start services
    pause
    exit /b 1
)

echo.
echo Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Checking service health...
echo.

REM Check services (simplified for Windows)
curl -s http://localhost/health >nul 2>&1
if errorlevel 1 (
    echo API Gateway: Not responding
) else (
    echo API Gateway: Healthy
)

curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo User Service: Not responding
) else (
    echo User Service: Healthy
)

curl -s http://localhost:3002/health >nul 2>&1
if errorlevel 1 (
    echo OCR Service: Not responding
) else (
    echo OCR Service: Healthy
)

curl -s http://localhost:3003/health >nul 2>&1
if errorlevel 1 (
    echo ICU Service: Not responding
) else (
    echo ICU Service: Healthy
)

curl -s http://localhost:3004/health >nul 2>&1
if errorlevel 1 (
    echo Notification Service: Not responding
) else (
    echo Notification Service: Healthy
)

echo.
echo ======================================================
echo   Services are starting up!
echo ======================================================
echo.
echo Next Steps:
echo.
echo   1. Access API Gateway: http://localhost
echo   2. Read API documentation: type API_TESTING.md
echo   3. View service logs: docker-compose logs -f
echo   4. Check architecture: type ARCHITECTURE.md
echo.
echo Quick Test:
echo.
echo   curl -X POST http://localhost/api/users/register ^
echo     -H "Content-Type: application/json" ^
echo     -d "{\"name\":\"Dr. Smith\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"}"
echo.
echo ======================================================
echo.
echo Documentation:
echo   - README.md         - Complete documentation
echo   - API_TESTING.md    - API testing guide
echo   - ARCHITECTURE.md   - System architecture
echo.
echo Useful Commands:
echo   - docker-compose logs -f     - View all logs
echo   - docker-compose ps          - Check container status
echo   - docker-compose down        - Stop all services
echo   - docker-compose restart     - Restart services
echo.
pause
