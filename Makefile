.PHONY: help build up down restart logs clean test health

# Default target
help:
	@echo "Patient Monitoring System - Available Commands:"
	@echo ""
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-user      - View user service logs"
	@echo "  make logs-ocr       - View OCR service logs"
	@echo "  make logs-icu       - View ICU service logs"
	@echo "  make logs-notif     - View notification service logs"
	@echo "  make health         - Check health of all services"
	@echo "  make clean          - Remove all containers and volumes"
	@echo "  make ps             - Show running containers"
	@echo "  make scale-user     - Scale user service (specify N=3)"
	@echo "  make scale-ocr      - Scale OCR service (specify N=2)"
	@echo "  make kafka-topics   - List Kafka topics"
	@echo "  make mongo-shell    - Open MongoDB shell"
	@echo "  make redis-cli      - Open Redis CLI"
	@echo "  make install        - Install dependencies locally"
	@echo ""

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@make health

# Stop all services
down:
	docker-compose down

# Restart all services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f

logs-user:
	docker-compose logs -f user-service

logs-ocr:
	docker-compose logs -f ocr-service

logs-icu:
	docker-compose logs -f icu-service

logs-notif:
	docker-compose logs -f notification-service

logs-kafka:
	docker-compose logs -f kafka

# Health checks
health:
	@echo "Checking service health..."
	@echo ""
	@echo "API Gateway:"
	@curl -s http://localhost/health || echo "FAILED"
	@echo ""
	@echo "User Service:"
	@curl -s http://localhost:3001/health || echo "FAILED"
	@echo ""
	@echo "OCR Service:"
	@curl -s http://localhost:3002/health || echo "FAILED"
	@echo ""
	@echo "ICU Service:"
	@curl -s http://localhost:3003/health || echo "FAILED"
	@echo ""
	@echo "Notification Service:"
	@curl -s http://localhost:3004/health || echo "FAILED"
	@echo ""

# Show container status
ps:
	docker-compose ps

# Clean everything
clean:
	docker-compose down -v
	@echo "All containers and volumes removed"

# Clean and rebuild
rebuild: clean build up

# Scale services
scale-user:
	docker-compose up -d --scale user-service=$(N)

scale-ocr:
	docker-compose up -d --scale ocr-service=$(N)

scale-icu:
	docker-compose up -d --scale icu-service=$(N)

# Kafka commands
kafka-topics:
	docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

kafka-create-topics:
	docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic image-upload-topic --partitions 3 --replication-factor 1
	docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic ocr-complete-topic --partitions 3 --replication-factor 1
	docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic alert-topic --partitions 3 --replication-factor 1
	docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic error-topic --partitions 3 --replication-factor 1

kafka-consumer-images:
	docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic image-upload-topic --from-beginning

kafka-consumer-ocr:
	docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic ocr-complete-topic --from-beginning

# Database commands
mongo-shell:
	docker exec -it mongodb mongosh

redis-cli:
	docker exec -it redis redis-cli

# Install dependencies locally
install:
	cd user-service && npm install
	cd ocr-service && npm install
	cd icu-service && npm install
	cd notification-service && npm install
	@echo "Dependencies installed for all services"

# Development mode
dev:
	@echo "Starting infrastructure services..."
	docker-compose up -d mongo redis kafka zookeeper
	@echo "Run services locally with: npm run dev"
