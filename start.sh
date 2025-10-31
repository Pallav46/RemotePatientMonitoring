#!/bin/bash

echo "======================================================"
echo "  Patient Monitoring System - Quick Start Script"
echo "======================================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your SMTP credentials before proceeding."
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

echo "🔨 Building Docker images..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

echo ""
echo "✅ Build completed successfully"
echo ""

echo "🚀 Starting all services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to start services"
    exit 1
fi

echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

echo ""
echo "🏥 Checking service health..."
echo ""

# Check each service
services=("http://localhost/health:API Gateway" 
          "http://localhost:3001/health:User Service" 
          "http://localhost:3002/health:OCR Service" 
          "http://localhost:3003/health:ICU Service" 
          "http://localhost:3004/health:Notification Service")

all_healthy=true

for service in "${services[@]}"; do
    IFS=':' read -r url name <<< "$service"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" = "200" ]; then
        echo "✅ $name: Healthy"
    else
        echo "❌ $name: Not responding (HTTP $response)"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo "======================================================"
    echo "  🎉 All services are running successfully!"
    echo "======================================================"
    echo ""
    echo "📚 Next Steps:"
    echo ""
    echo "  1. Access API Gateway: http://localhost"
    echo "  2. Read API documentation: cat API_TESTING.md"
    echo "  3. View service logs: docker-compose logs -f"
    echo "  4. Check architecture: cat ARCHITECTURE.md"
    echo ""
    echo "🧪 Quick Test:"
    echo ""
    echo "  # Register a user"
    echo "  curl -X POST http://localhost/api/users/register \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"name\":\"Dr. Smith\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"}'"
    echo ""
    echo "======================================================"
else
    echo "======================================================"
    echo "  ⚠️  Some services are not healthy"
    echo "======================================================"
    echo ""
    echo "🔍 Troubleshooting:"
    echo ""
    echo "  1. View logs: docker-compose logs"
    echo "  2. Check containers: docker-compose ps"
    echo "  3. Restart services: docker-compose restart"
    echo ""
    echo "  For detailed troubleshooting, see README.md"
    echo ""
fi

echo "📖 Documentation:"
echo "  - README.md         - Complete documentation"
echo "  - API_TESTING.md    - API testing guide"
echo "  - ARCHITECTURE.md   - System architecture"
echo ""
echo "🛠️  Useful Commands:"
echo "  - docker-compose logs -f     - View all logs"
echo "  - docker-compose ps          - Check container status"
echo "  - docker-compose down        - Stop all services"
echo "  - docker-compose restart     - Restart services"
echo ""
