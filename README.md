# 🏥 Patient Monitoring System - Microservices Backend

A production-ready, event-driven microservices architecture for patient monitoring image processing using **Node.js**, **Kafka**, **MongoDB**, **Redis**, and **Docker**.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Flow](#system-flow)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Microservices](#microservices)
- [Kafka Topics](#kafka-topics)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This system processes patient monitoring images through an automated pipeline:
1. **User uploads** a patient monitoring image
2. **OCR Service** extracts vital signs data from the image
3. **ICU Service** validates and analyzes the data
4. **Notification Service** sends alerts for critical conditions or errors

All services are **fully decoupled** using Kafka for event-driven communication, making the system highly **scalable** and **fault-tolerant**.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Nginx API Gateway               │
│      (Load Balancer + Routing)          │
└─────┬───────────────┬──────────────┬────┘
      │               │              │
      ▼               ▼              ▼
┌────────────┐  ┌───────────┐  ┌──────────────┐
│User Service│  │ICU Service│  │Notification  │
│  (3001)    │  │  (3003)   │  │Service (3004)│
└─────┬──────┘  └─────┬─────┘  └──────┬───────┘
      │               │                │
      │         ┌─────▼─────┐         │
      └────────►│   Kafka   │◄────────┘
                │ (Message  │
                │  Broker)  │
                └─────┬─────┘
                      │
                ┌─────▼──────┐
                │OCR Service │
                │   (3002)   │
                └────────────┘

┌──────────┐  ┌─────────┐  ┌──────────┐
│ MongoDB  │  │  Redis  │  │Zookeeper │
│  (27017) │  │ (6379)  │  │  (2181)  │
└──────────┘  └─────────┘  └──────────┘
```

## ✨ Features

### Core Features
- ✅ **Image Upload & Storage** - Secure patient monitoring image uploads
- ✅ **OCR Processing** - Automated text extraction using Tesseract.js
- ✅ **Vital Signs Analysis** - Real-time validation of patient vitals
- ✅ **Alert System** - Automated notifications for critical conditions
- ✅ **Error Handling** - Comprehensive error tracking and notifications

### Technical Features
- 🔄 **Event-Driven Architecture** - Kafka-based async communication
- 🚀 **Horizontal Scalability** - Each service can scale independently
- 💾 **Data Persistence** - MongoDB for documents, Redis for caching
- 🔒 **Security** - Helmet.js, rate limiting, input validation
- 📊 **Health Monitoring** - Health check endpoints for all services
- 🐳 **Docker Containerization** - Easy deployment and orchestration
- 🔁 **Fault Tolerance** - Retry mechanisms and error recovery

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **Kafka** | Message broker for event streaming |
| **MongoDB** | NoSQL database |
| **Redis** | Caching and session storage |
| **Tesseract.js** | OCR engine |
| **Nginx** | API Gateway & Load Balancer |
| **Docker** | Containerization |
| **Nodemailer** | Email notifications |
| **Multer** | File upload handling |
| **Joi** | Data validation |

## 🔄 System Flow

```
1. User uploads image
   ↓
2. User Service saves to DB & publishes to 'image-upload-topic'
   ↓
3. OCR Service consumes event & extracts text
   ↓
4. OCR Service publishes to 'ocr-complete-topic'
   ↓
5. ICU Service validates vitals & detects anomalies
   ↓
6. If critical/error → publishes to 'alert-topic' or 'error-topic'
   ↓
7. Notification Service sends email alerts
```

### Alternative Flow (Direct Data Submission - NEW!)

```
1. User submits patient vitals data directly (JSON)
   ↓
2. User Service publishes directly to 'ocr-complete-topic' (skips OCR)
   ↓
3. ICU Service validates vitals & detects anomalies
   ↓
4. If critical/error → publishes to 'alert-topic' or 'error-topic'
   ↓
5. Notification Service sends email alerts
```

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Gmail account (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd proje
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your SMTP credentials:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   DEFAULT_NOTIFICATION_EMAIL=admin@hospital.com
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check service health**
   ```bash
   # Check all containers
   docker-compose ps
   
   # Check API Gateway
   curl http://localhost/health
   
   # Check individual services
   curl http://localhost:3001/health  # User Service
   curl http://localhost:3002/health  # OCR Service
   curl http://localhost:3003/health  # ICU Service
   curl http://localhost:3004/health  # Notification Service
   ```

5. **View logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f user-service
   docker-compose logs -f ocr-service
   docker-compose logs -f icu-service
   docker-compose logs -f notification-service
   ```

### Quick Test

```bash
# 1. Register a user
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "dr.smith@hospital.com",
    "phone": "1234567890"
  }'

# Response: { "success": true, "data": { "id": "...", ... } }

# 2a. Upload patient monitoring image (OCR flow)
curl -X POST http://localhost/api/users/upload-image \
  -F "image=@/path/to/patient-monitor.jpg" \
  -F "userId=<user-id-from-step-1>" \
  -F "patientName=John Doe" \
  -F "patientId=P12345"

# OR

# 2b. Submit patient data directly (Skip OCR - NEW!)
curl -X POST http://localhost/api/users/submit-patient-data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id-from-step-1>",
    "patientName": "John Doe",
    "patientId": "P12345",
    "vitals": {
      "heartRate": 72,
      "bloodPressure": {"systolic": 120, "diastolic": 80},
      "oxygenSaturation": 98,
      "temperature": 98.6,
      "respiratoryRate": 16
    }
  }'

# Response: { "success": true, "data": { "imageId": "...", "status": "processing" } }

# 3. Check image processing status
curl http://localhost/api/users/image-status/<image-id>

# 4. View patient data
curl http://localhost/api/patients/data/<image-id>
```

## 📚 API Documentation

### User Service (Port 3001)

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "Dr. Smith",
  "email": "dr.smith@hospital.com",
  "phone": "1234567890"
}
```

#### Upload Patient Image
```http
POST /api/users/upload-image
Content-Type: multipart/form-data

Fields:
- image: File (JPEG, PNG, BMP, TIFF - max 10MB)
- userId: String (required)
- patientName: String (optional)
- patientId: String (optional)
- deviceType: String (optional)
```

#### Submit Patient Data Directly (NEW - Skip OCR)
```http
POST /api/users/submit-patient-data
Content-Type: application/json

{
  "userId": "string (required)",
  "patientName": "string (optional)",
  "patientId": "string (optional)",
  "deviceType": "string (optional)",
  "vitals": {
    "heartRate": number (optional),
    "bloodPressure": {
      "systolic": number (required if provided),
      "diastolic": number (required if provided)
    },
    "oxygenSaturation": number (optional),
    "temperature": number (optional),
    "respiratoryRate": number (optional)
  }
}

Note: This endpoint bypasses OCR processing and sends data directly to ICU Service for analysis.
```

#### Get Image Status
```http
GET /api/users/image-status/:imageId
```

#### Get User's Images
```http
GET /api/users/:userId/images?limit=50
```

### ICU Service (Port 3003)

#### Get Patient Data
```http
GET /api/patients/data/:imageId
```

#### Get Patient History
```http
GET /api/patients/:patientId/history?limit=50
```

#### Get Patient Statistics
```http
GET /api/patients/:patientId/statistics
```

#### Get Critical Patients List
```http
GET /api/patients/critical/list
```

### Notification Service (Port 3004)

#### Get User Notifications
```http
GET /api/notifications/user/:userId?limit=50&type=alert
```

#### Get Failed Notifications
```http
GET /api/notifications/failed
```

#### Retry Failed Notifications
```http
POST /api/notifications/retry-failed
```

#### Get Notification Statistics
```http
GET /api/notifications/statistics
```

## 🔧 Microservices

### 1. User Service
- **Port:** 3001
- **Responsibilities:**
  - User registration and management
  - Image upload handling
  - Metadata storage
  - Kafka event publishing
- **Database:** MongoDB (user_service)
- **Kafka:** Producer only

### 2. OCR Service
- **Port:** 3002
- **Responsibilities:**
  - Image preprocessing (Sharp)
  - OCR text extraction (Tesseract.js)
  - Patient data parsing
- **Dependencies:** Tesseract OCR
- **Kafka:** Consumer + Producer

### 3. ICU Service
- **Port:** 3003
- **Responsibilities:**
  - Vital signs validation
  - Alert generation
  - Patient data analytics
  - Statistics caching
- **Database:** MongoDB (icu_service)
- **Cache:** Redis
- **Kafka:** Consumer + Producer

### 4. Notification Service
- **Port:** 3004
- **Responsibilities:**
  - Email notifications
  - Alert management
  - Notification history
  - Retry failed notifications
- **Database:** MongoDB (notification_service)
- **Email:** Nodemailer (SMTP)
- **Kafka:** Consumer only

### 5. Nginx Gateway
- **Port:** 80
- **Responsibilities:**
  - API routing
  - Load balancing
  - Rate limiting
  - Security headers

## 📨 Kafka Topics

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `image-upload-topic` | User Service | OCR Service | Image upload events |
| `ocr-complete-topic` | OCR Service | ICU Service | OCR processing complete |
| `alert-topic` | ICU Service | Notification Service | Patient alerts |
| `error-topic` | All Services | Notification Service | Error notifications |

### Topic Configuration
- **Replication Factor:** 1 (increase in production)
- **Retention:** 7 days (168 hours)
- **Auto-create:** Enabled

## 🏥 Monitoring & Health Checks

All services expose `/health` endpoints:

```bash
# Via API Gateway
curl http://localhost/health

# Direct service access
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # OCR Service
curl http://localhost:3003/health  # ICU Service
curl http://localhost:3004/health  # Notification Service
```

### Docker Health Checks
All containers have built-in health checks that run every 30 seconds.

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Database Monitoring

```bash
# MongoDB
docker exec -it mongodb mongosh
> show dbs
> use user_service
> db.users.find()

# Redis
docker exec -it redis redis-cli
> KEYS *
> GET patient:P12345:latest
```

### Kafka Monitoring

```bash
# List topics
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

# View topic details
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic image-upload-topic

# Consume messages (for debugging)
docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic image-upload-topic --from-beginning
```

## ⚡ Scaling

### Horizontal Scaling

Each service can be scaled independently:

```bash
# Scale User Service to 3 instances
docker-compose up -d --scale user-service=3

# Scale OCR Service to 2 instances
docker-compose up -d --scale ocr-service=2

# Scale ICU Service to 2 instances
docker-compose up -d --scale icu-service=2
```

**Note:** When scaling:
- Nginx automatically load balances across instances
- Kafka consumer groups ensure each message is processed once
- MongoDB handles concurrent connections
- Redis is shared across all instances

### Production Recommendations

1. **Kafka Cluster:** Use multiple brokers with replication factor 3
2. **MongoDB Replica Set:** For high availability
3. **Redis Cluster:** For distributed caching
4. **Load Balancer:** Use external load balancer (AWS ALB, GCP LB)
5. **Kubernetes:** Consider migrating to K8s for advanced orchestration

## 🐛 Troubleshooting

### Common Issues

#### 1. Kafka Connection Errors
```bash
# Restart Kafka and Zookeeper
docker-compose restart zookeeper kafka

# Wait 30 seconds, then restart dependent services
docker-compose restart user-service ocr-service icu-service notification-service
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongo

# Restart MongoDB
docker-compose restart mongo
```

#### 3. Email Notifications Not Sending
```bash
# Check notification service logs
docker-compose logs notification-service

# Verify SMTP credentials in .env
# For Gmail, ensure "App Password" is used, not regular password
```

#### 4. OCR Processing Slow
```bash
# Increase OCR service instances
docker-compose up -d --scale ocr-service=3

# Check resource usage
docker stats
```

#### 5. Image Upload Fails
```bash
# Check uploads volume
docker volume inspect proje_user-uploads

# Ensure sufficient disk space
df -h

# Check file permissions
docker exec user-service ls -la /app/uploads
```

### Debug Mode

Enable debug logging by setting environment variable:

```yaml
# In docker-compose.yml
environment:
  - NODE_ENV=development
  - DEBUG=*
```

### Clean Restart

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## 📊 Performance Optimization

1. **Redis Caching:** Patient data is cached for 1 hour
2. **MongoDB Indexes:** Optimized queries on patientId, userId, status
3. **Nginx Caching:** Static responses cached at gateway level
4. **Rate Limiting:** 10 requests/second per IP
5. **Connection Pooling:** Reused database connections

## 🔐 Security Best Practices

- ✅ Helmet.js for security headers
- ✅ Rate limiting on all endpoints
- ✅ Input validation with Joi
- ✅ File type and size restrictions
- ✅ CORS configuration
- ✅ Environment variable secrets
- ✅ No sensitive data in logs

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Development

### Local Development (without Docker)

1. Install dependencies for each service:
   ```bash
   cd user-service && npm install
   cd ../ocr-service && npm install
   cd ../icu-service && npm install
   cd ../notification-service && npm install
   ```

2. Start infrastructure:
   ```bash
   docker-compose up -d mongo redis kafka zookeeper
   ```

3. Run services in development mode:
   ```bash
   # Terminal 1
   cd user-service && npm run dev
   
   # Terminal 2
   cd ocr-service && npm run dev
   
   # Terminal 3
   cd icu-service && npm run dev
   
   # Terminal 4
   cd notification-service && npm run dev
   ```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review logs using `docker-compose logs`

---

**Built with ❤️ using JavaScript and Modern Microservices Architecture**
