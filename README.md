# 🏥 Remote Patient Monitoring System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://www.docker.com/)
[![Kafka](https://img.shields.io/badge/Kafka-7.5.0-orange.svg)](https://kafka.apache.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A production-ready, event-driven microservices architecture for patient health monitoring with real-time analysis and email notifications**

**🚀 Quick Start:** `docker-compose up -d` → Register → Submit vitals → Receive email alerts for critical conditions!

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Flow](#-system-flow)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Test](#quick-test)
- [API Documentation](#-api-documentation)
- [Microservices](#-microservices)
- [Kafka Topics](#-kafka-topics)
- [Monitoring & Health Checks](#-monitoring--health-checks)
- [Testing the System](#-testing-the-system)
- [Scaling](#-scaling)
- [Performance Optimization](#-performance-optimization)
- [Security](#-security-best-practices)
- [Troubleshooting](#-troubleshooting)
- [Support & Documentation](#-support--documentation)

---

## 🔗 Quick Links

| Document | Description |
|----------|-------------|
| [API_TESTING.md](./API_TESTING.md) | Complete API testing guide with PowerShell examples |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Detailed system architecture documentation |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Project overview and summary |

---

## 🎯 Overview

A **patient-centric** health monitoring system that processes vital signs through an automated pipeline:

**Two Ways to Submit Data:**
1. **Direct Data Entry** ⚡ (Recommended) - Submit vitals directly as JSON
2. **Image Upload** 📸 - Upload patient monitor screenshots for OCR processing

**Processing Pipeline:**
1. **Patient submits** health data (directly or via image)
2. **OCR Service** extracts vitals from images (if image upload)
3. **ICU Service** validates and analyzes the data against medical thresholds
4. **Notification Service** emails the patient for critical conditions

All services are **fully decoupled** using Kafka for event-driven communication, making the system highly **scalable** and **fault-tolerant**.

**Key Design:** Each user represents a patient monitoring their own health - no doctor/patient separation.

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PATIENT                                  │
│           (Submits vitals via Web/Mobile App)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX API GATEWAY                             │
│        • Load Balancing  • Rate Limiting  • Routing             │
│        • SSL/TLS  • CORS  • Request Size Limits                 │
└────┬──────────────────┬─────────────────┬──────────────────────┘
     │                  │                 │
     │ :3001            │ :3003           │ :3004
     ▼                  ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│USER SERVICE  │  │ ICU SERVICE  │  │NOTIFICATION      │
│              │  │              │  │SERVICE           │
│• Register    │  │• Analyze     │  │                  │
│• Upload      │  │  Vitals      │  │• Send Email      │
│• Submit Data │  │• Generate    │  │  Alerts          │
│              │  │  Alerts      │  │• Track History   │
└──────┬───────┘  └──────┬───────┘  └─────────┬────────┘
       │                 │                     │
       │                 │                     │
       ▼                 ▼                     ▼
┌────────────────────────────────────────────────────┐
│              APACHE KAFKA MESSAGE BROKER            │
│                                                     │
│ Topics:                                             │
│ • image-upload-topic     → OCR Service             │
│ • ocr-complete-topic     → ICU Service             │
│ • alert-topic            → Notification Service    │
│ • error-topic            → Notification Service    │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
                 ┌──────────────┐
                 │ OCR SERVICE  │
                 │              │
                 │• Extract     │
                 │  Text from   │
                 │  Images      │
                 │• Parse       │
                 │  Vitals      │
                 └──────────────┘

┌─────────────────────────────────────────────────────┐
│              DATA & CACHE LAYER                      │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ MongoDB  │    │  Redis   │    │Zookeeper │     │
│  │          │    │          │    │          │     │
│  │• users   │    │• Stats   │    │• Kafka   │     │
│  │• patient │    │  Cache   │    │  Coord.  │     │
│  │  images  │    │• Latest  │    │          │     │
│  │• patient │    │  Data    │    │          │     │
│  │  datas   │    │          │    │          │     │
│  │• notif.  │    │          │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘     │
└─────────────────────────────────────────────────────┘
```

### Data Flow Diagrams

**Flow 1: Direct Data Submission (Fast Path)**
```
Patient → User Service → Kafka (ocr-complete-topic) 
       → ICU Service → Validate Vitals
       → If Critical/Warning → Kafka (alert-topic)
       → Notification Service → Email to Patient
```

**Flow 2: Image Upload (OCR Path)**
```
Patient → User Service → Kafka (image-upload-topic)
       → OCR Service → Extract Text → Parse Vitals
       → Kafka (ocr-complete-topic) → ICU Service
       → Validate Vitals → If Critical/Warning
       → Kafka (alert-topic) → Notification Service
       → Email to Patient
```

## ✨ Features

### Core Features
- ✅ **Direct Data Submission** - Submit vitals as JSON (recommended, fastest)
- ✅ **Image Upload & OCR** - Upload patient monitor screenshots for automated extraction
- ✅ **Vital Signs Analysis** - Real-time validation against medical thresholds
- ✅ **Patient Alerts** - Email notifications sent directly to patient for critical conditions
- ✅ **Health History** - Complete tracking of all vitals submissions
- ✅ **Statistics Dashboard** - View trends (normal/warning/critical counts)
- ✅ **Error Handling** - Comprehensive error tracking and notifications

### Technical Features
- 🔄 **Event-Driven Architecture** - Kafka-based async communication
- 🚀 **Horizontal Scalability** - Each service scales independently
- 💾 **Data Persistence** - MongoDB for documents, Redis for caching
- 🔒 **Security** - Helmet.js, rate limiting, input validation with Joi
- 📊 **Health Monitoring** - Health check endpoints for all services
- 🐳 **Docker Containerization** - Easy deployment and orchestration
- 🔁 **Fault Tolerance** - Retry mechanisms and error recovery
- 📧 **Email Notifications** - Gmail SMTP integration with SSL

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

### Option 1: Direct Data Submission (Recommended - Fastest)
```
Patient submits vitals JSON → User Service → ocr-complete-topic
   ↓
ICU Service validates vitals & detects anomalies
   ↓
If warning/critical → publishes to alert-topic
   ↓
Notification Service → Email sent to patient
```

### Option 2: Image Upload (OCR Processing)
```
Patient uploads monitor image → User Service → image-upload-topic
   ↓
OCR Service extracts text from image
   ↓
OCR Service publishes to ocr-complete-topic
   ↓
ICU Service validates vitals & detects anomalies
   ↓
If warning/critical → publishes to alert-topic
   ↓
Notification Service → Email sent to patient
```

**Key Points:**
- Both flows end with the same analysis and notification
- Direct submission skips OCR, making it faster
- Patient receives email at their registered email address
- Each submission gets a unique `dataId` for tracking

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

**PowerShell Commands (Windows):**

```powershell
# 1. Register as a patient
$registerBody = @{
    name = "John Patient"
    email = "john.patient@email.com"
    phone = "1234567890"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "http://localhost/api/users/register" `
    -Method POST -ContentType "application/json" -Body $registerBody

$userId = $user.data.id
Write-Host "Registered userId: $userId"

# 2. Submit your health vitals directly (Recommended)
$vitalsBody = @{
    userId = $userId
    vitals = @{
        heartRate = 72
        bloodPressure = @{systolic = 120; diastolic = 80}
        oxygenSaturation = 98
        temperature = 36.8
        respiratoryRate = 16
    }
} | ConvertTo-Json -Depth 10

$result = Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $vitalsBody

$dataId = $result.data.dataId
Write-Host "Data submitted! dataId: $dataId"

# 3. Wait for processing
Start-Sleep -Seconds 3

# 4. Check your data
Invoke-RestMethod -Uri "http://localhost/api/patients/data/$dataId"

# 5. View your health statistics
Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/statistics"
```

**OR using cURL (Linux/Mac):**

```bash
# 1. Register
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Patient","email":"john.patient@email.com","phone":"1234567890"}'

# 2. Submit vitals
curl -X POST http://localhost/api/users/submit-patient-data \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id-from-step-1>",
    "vitals": {
      "heartRate": 72,
      "bloodPressure": {"systolic": 120, "diastolic": 80},
      "oxygenSaturation": 98,
      "temperature": 36.8
    }
  }'
```

## 📚 API Documentation

> **See [API_TESTING.md](./API_TESTING.md) for complete testing guide with PowerShell examples**

### User Service (Port 3001)

#### Register User (Patient)
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Patient",
  "email": "john.patient@email.com",
  "phone": "1234567890"
}

Response: {
  "success": true,
  "data": {
    "id": "690470087f2feb262c499116",
    "name": "John Patient",
    "email": "john.patient@email.com"
  }
}
```

#### Submit Health Data Directly (Recommended)
```http
POST /api/users/submit-patient-data
Content-Type: application/json

{
  "userId": "690470087f2feb262c499116",
  "vitals": {
    "heartRate": 72,
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "oxygenSaturation": 98,
    "temperature": 36.8,
    "respiratoryRate": 16
  },
  "deviceType": "Manual Entry"  // Optional
}

Response: {
  "success": true,
  "message": "Data received from userId: 690470087f2feb262c499116",
  "data": {
    "dataId": "unique-data-id",
    "submissionType": "direct-data",
    "status": "processing"
  }
}
```

#### Upload Patient Monitor Image
```http
POST /api/users/upload-image
Content-Type: multipart/form-data

Fields:
- image: File (JPEG, PNG, BMP, TIFF - max 10MB)
- userId: String (required)
- deviceType: String (optional, e.g., "Philips Monitor")

Response: {
  "success": true,
  "message": "Data received from userId: 690470087f2feb262c499116",
  "data": {
    "dataId": "unique-data-id",
    "fileName": "patient-monitor.jpg",
    "status": "processing"
  }
}
```

#### Get Data Processing Status
```http
GET /api/users/data-status/:dataId

Response: {
  "success": true,
  "data": {
    "dataId": "...",
    "status": "completed",
    "uploadedAt": "2025-10-31T10:30:00.000Z",
    "processedAt": "2025-10-31T10:30:15.000Z",
    "user": {
      "name": "John Patient",
      "email": "john.patient@email.com"
    },
    "metadata": {
      "deviceType": "Manual Entry",
      "submissionType": "direct-data"
    }
  }
}
```

#### Get User's All Data Records
```http
GET /api/users/:userId/data?limit=50

Response: Array of all data submissions for this user
```

### ICU Service (Port 3003)

#### Get Analyzed Data
```http
GET /api/patients/data/:dataId

Response: {
  "success": true,
  "data": {
    "dataId": "...",
    "userId": "690470087f2feb262c499116",
    "userEmail": "john.patient@email.com",
    "userName": "John Patient",
    "vitals": {
      "heartRate": 72,
      "bloodPressure": {"systolic": 120, "diastolic": 80},
      "oxygenSaturation": 98,
      "temperature": 36.8
    },
    "status": "normal",  // or "warning", "critical"
    "alerts": [],
    "processedAt": "2025-10-31T10:30:15.000Z"
  }
}
```

#### Get User's Health History
```http
GET /api/patients/:userId/history?limit=50

Response: Array of all vitals submissions with analysis
```

#### Get User's Health Statistics
```http
GET /api/patients/:userId/statistics

Response: {
  "success": true,
  "data": {
    "totalReadings": 10,
    "normal": 7,
    "warning": 2,
    "critical": 1,
    "error": 0,
    "lastUpdated": "2025-10-31T10:35:00.000Z"
  }
}
```

#### Get All Critical Cases
```http
GET /api/patients/critical/list

Response: Array of all users with critical status
```

### Notification Service (Port 3004)

#### Get User Notifications
```http
GET /api/notifications/user/:userId?limit=50&type=alert

Response: Array of email notifications sent to this user
```

#### Get Notification Statistics
```http
GET /api/notifications/statistics

Response: System-wide notification counts
```

### Health Vitals Thresholds

| Vital Sign | Normal Range | Validation Limits |
|------------|--------------|-------------------|
| Heart Rate | 60-100 bpm | 0-300 bpm |
| Blood Pressure (Systolic) | 90-120 mmHg | 0-300 mmHg |
| Blood Pressure (Diastolic) | 60-80 mmHg | 0-200 mmHg |
| Oxygen Saturation | 95-100% | 0-100% |
| Temperature | 36.5-37.5°C | 20-50°C |
| Respiratory Rate | 12-20 /min | 0-100 /min |

## 🔧 Microservices

### 1. User Service
- **Port:** 3001
- **Responsibilities:**
  - User (patient) registration and management
  - Image upload handling (optional flow)
  - Direct vitals data submission (recommended flow)
  - Metadata storage
  - Kafka event publishing
- **Database:** MongoDB (user_service)
- **Collections:** `users`, `patientimages`
- **Kafka:** Producer only
- **Key Endpoints:** `/register`, `/upload-image`, `/submit-patient-data`, `/data-status/:dataId`

### 2. OCR Service
- **Port:** 3002
- **Responsibilities:**
  - Image preprocessing with Sharp (grayscale, contrast enhancement)
  - OCR text extraction using Tesseract.js
  - Patient vitals parsing from extracted text
  - Publishing processed data to ICU Service
- **Dependencies:** Tesseract OCR engine, Sharp image processing
- **Kafka:** Consumer (image-upload-topic) + Producer (ocr-complete-topic)
- **Performance:** Processes images in background, async

### 3. ICU Service
- **Port:** 3003
- **Responsibilities:**
  - Vital signs validation against medical thresholds
  - Alert generation (normal/warning/critical)
  - Patient health data analytics
  - Statistics caching with Redis
  - Historical data tracking
- **Database:** MongoDB (icu_service)
- **Collections:** `patientdatas`
- **Cache:** Redis (user statistics, latest readings)
- **Kafka:** Consumer (ocr-complete-topic) + Producer (alert-topic)
- **Alert Thresholds:** Heart rate, BP, O2 saturation, temperature, respiratory rate

### 4. Notification Service
- **Port:** 3004
- **Responsibilities:**
  - Email notifications to patients
  - Alert management and history
  - Error notifications
  - Notification statistics
- **Database:** MongoDB (notification_service)
- **Collections:** `notifications`
- **Email:** Nodemailer with Gmail SMTP (SSL port 465)
- **Kafka:** Consumer only (alert-topic, error-topic)
- **Email Templates:** Critical alerts, warnings, error notifications

### 5. Nginx Gateway
- **Port:** 80 (HTTP)
- **Responsibilities:**
  - API routing to microservices
  - Load balancing across service instances
  - Rate limiting (10 requests/second per IP)
  - Security headers (CORS, CSP)
  - Request size limits (10MB for file uploads)
- **Upstreams:** user-service, icu-service, notification-service

## 📨 Kafka Topics

| Topic | Producer | Consumer | Purpose | Message Schema |
|-------|----------|----------|---------|----------------|
| `image-upload-topic` | User Service | OCR Service | Image upload events | `{userId, dataId, fileName, userEmail, userName}` |
| `ocr-complete-topic` | OCR Service, User Service | ICU Service | OCR complete or direct data | `{userId, dataId, vitals, userEmail, userName, ocrConfidence}` |
| `alert-topic` | ICU Service | Notification Service | Patient health alerts | `{userId, dataId, status, alerts, vitals, userEmail, userName}` |
| `error-topic` | All Services | Notification Service | Error notifications | `{userId, dataId, error, service, userEmail}` |

### Topic Configuration
- **Replication Factor:** 1 (increase to 3 in production)
- **Retention:** 7 days (168 hours)
- **Auto-create:** Enabled
- **Partitions:** 1 per topic (increase for higher throughput)

### Consumer Groups
- `ocr-consumer-group` - OCR Service instances
- `icu-consumer-group` - ICU Service instances  
- `notification-consumer-group` - Notification Service instances

**Note:** Kafka ensures each message is processed exactly once per consumer group, enabling horizontal scaling.

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

**MongoDB:**
```bash
# Access MongoDB shell
docker exec -it mongodb mongosh

# View databases
> show dbs

# User Service database
> use user_service
> db.users.find().pretty()
> db.patientimages.find().pretty()

# ICU Service database  
> use icu_service
> db.patientdatas.find().pretty()
> db.patientdatas.find({status: "critical"}).pretty()

# Notification Service database
> use notification_service
> db.notifications.find().pretty()
```

**Redis Cache:**
```bash
# Access Redis CLI
docker exec -it redis redis-cli

# View all keys
> KEYS *

# User statistics (pattern: user:{userId}:stats)
> GET user:690470087f2feb262c499116:stats

# Latest reading (pattern: user:{userId}:latest)
> GET user:690470087f2feb262c499116:latest

# TTL check
> TTL user:690470087f2feb262c499116:stats

# Clear all cache
> FLUSHALL
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

1. **Redis Caching:** 
   - Patient statistics cached for 1 hour
   - Latest readings cached for quick access
   - Cache invalidation on new data submission

2. **MongoDB Indexes:** 
   - Optimized queries on `userId`, `dataId`, `status`
   - Compound index on `userId` + `processedAt` for history queries
   - Index on `userEmail` for notification lookups

3. **Nginx Optimizations:**
   - Static response caching at gateway level
   - Connection keep-alive enabled
   - Request buffering for large uploads

4. **Rate Limiting:** 
   - 10 requests/second per IP address
   - Burst handling with token bucket algorithm

5. **Connection Pooling:** 
   - Reused MongoDB connections (pool size: 10)
   - Kafka producer connection reuse
   - Redis connection pooling

6. **Image Processing:**
   - Async OCR processing (non-blocking)
   - Image preprocessing reduces OCR time by 30%
   - Tesseract worker pool for parallel processing

## 🧪 Testing the System

### End-to-End Test (PowerShell)

```powershell
# Complete workflow test
Write-Host "=== Patient Monitoring System Test ===" -ForegroundColor Green

# 1. Register
Write-Host "`n1. Registering patient..." -ForegroundColor Yellow
$registerBody = @{
    name = "Test Patient"
    email = "test.patient@email.com"
    phone = "9876543210"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "http://localhost/api/users/register" `
    -Method POST -ContentType "application/json" -Body $registerBody

$userId = $user.data.id
Write-Host "✓ Registered! UserId: $userId" -ForegroundColor Green

# 2. Submit normal vitals
Write-Host "`n2. Submitting normal vitals..." -ForegroundColor Yellow
$normalBody = @{
    userId = $userId
    vitals = @{
        heartRate = 75
        bloodPressure = @{systolic = 118; diastolic = 78}
        oxygenSaturation = 97
        temperature = 36.7
    }
} | ConvertTo-Json -Depth 10

$normal = Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $normalBody

Write-Host "✓ Normal data submitted! DataId: $($normal.data.dataId)" -ForegroundColor Green

# 3. Submit critical vitals (triggers email)
Write-Host "`n3. Submitting CRITICAL vitals (will trigger email)..." -ForegroundColor Yellow
$criticalBody = @{
    userId = $userId
    vitals = @{
        heartRate = 180
        bloodPressure = @{systolic = 190; diastolic = 110}
        oxygenSaturation = 88
        temperature = 40.5
    }
} | ConvertTo-Json -Depth 10

$critical = Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $criticalBody

Write-Host "✓ Critical data submitted! DataId: $($critical.data.dataId)" -ForegroundColor Green
Write-Host "  📧 Email should be sent to: test.patient@email.com" -ForegroundColor Cyan

# 4. Wait for processing
Write-Host "`n4. Waiting for processing..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 5. Check statistics
Write-Host "`n5. Checking your health statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/statistics"
Write-Host "✓ Statistics:" -ForegroundColor Green
Write-Host "  Total readings: $($stats.data.totalReadings)"
Write-Host "  Normal: $($stats.data.normal)"
Write-Host "  Warning: $($stats.data.warning)"
Write-Host "  Critical: $($stats.data.critical)"

# 6. View history
Write-Host "`n6. Viewing health history..." -ForegroundColor Yellow
$history = Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/history?limit=10"
Write-Host "✓ Total records: $($history.count)" -ForegroundColor Green

Write-Host "`n=== Test Complete! ===" -ForegroundColor Green
Write-Host "Check email: test.patient@email.com for critical alert!" -ForegroundColor Cyan
```

### Test Critical Alerts

```powershell
# Quick critical alert test
$userId = "YOUR_USER_ID"  # From registration

$criticalVitals = @{
    userId = $userId
    vitals = @{
        heartRate = 185           # CRITICAL
        bloodPressure = @{
            systolic = 200         # CRITICAL  
            diastolic = 120        # CRITICAL
        }
        oxygenSaturation = 85     # CRITICAL
        temperature = 41.5        # CRITICAL
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $criticalVitals

# Check notification logs
docker-compose logs notification-service | Select-String "email sent"
```

### Verify Email Delivery

```powershell
# Check notification service logs for email confirmation
docker-compose logs notification-service --tail 50 | Select-String "Alert notification email sent"

# Should see: "Alert notification email sent to: your-email@email.com"
```

## 🔐 Security Best Practices

- ✅ **Helmet.js** - Security headers (XSS, CSP, HSTS)
- ✅ **Rate Limiting** - 10 requests/second per IP on all endpoints
- ✅ **Input Validation** - Joi schemas validate all request data
- ✅ **File Type Restrictions** - Only image files (JPEG, PNG, BMP, TIFF) allowed
- ✅ **File Size Limits** - Maximum 10MB per upload
- ✅ **CORS Configuration** - Restricted to allowed origins only
- ✅ **Environment Variables** - All secrets stored in .env (never committed)
- ✅ **No Sensitive Logs** - Passwords and tokens excluded from logs
- ✅ **MongoDB Injection Protection** - Parameterized queries only
- ✅ **SSL/TLS Email** - Gmail SMTP with port 465 SSL encryption

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use SSL/TLS for all services (HTTPS)
- [ ] Enable MongoDB authentication
- [ ] Use Redis password authentication
- [ ] Set up Kafka ACLs
- [ ] Implement JWT authentication for API endpoints
- [ ] Add API key validation
- [ ] Enable audit logging
- [ ] Set up intrusion detection
- [ ] Regular security updates for dependencies

## 📝 License

MIT License - See LICENSE file for details

## � Project Information

**Project Type:** Microservices Backend for Patient Health Monitoring  
**Architecture:** Event-Driven with Apache Kafka  
**Purpose:** Self-monitoring health system for patients  
**Key Innovation:** Dual submission (direct data + OCR image processing)

## 🎓 Learning Resources

This project demonstrates:
- ✅ Event-driven microservices architecture
- ✅ Kafka for async message processing
- ✅ Docker containerization and orchestration
- ✅ API Gateway pattern with Nginx
- ✅ MongoDB for document storage
- ✅ Redis for caching strategies
- ✅ OCR integration with Tesseract.js
- ✅ Email notifications with Nodemailer
- ✅ Health monitoring and observability
- ✅ Horizontal scalability patterns

## 📞 Support & Documentation

- **Complete API Testing Guide:** [API_TESTING.md](./API_TESTING.md)
- **System Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Project Summary:** [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

For issues and questions:
- 📋 Create an issue in the repository
- 📖 Check existing documentation files
- 🔍 Review logs: `docker-compose logs -f`
- 💡 See troubleshooting section above

## 🌟 Features Roadmap

**Current Features:**
- ✅ User registration and authentication
- ✅ Direct data submission (JSON vitals)
- ✅ Image upload with OCR processing
- ✅ Real-time health analysis
- ✅ Email notifications for critical conditions
- ✅ Health history and statistics
- ✅ System-wide monitoring

**Future Enhancements:**
- 🔜 JWT authentication for API security
- 🔜 WebSocket support for real-time updates
- 🔜 SMS notifications (Twilio integration)
- 🔜 Push notifications (Firebase)
- 🔜 Machine learning for trend prediction
- � Mobile app integration
- 🔜 Multi-language support
- 🔜 Data export (PDF reports)
- 🔜 Grafana dashboards
- 🔜 ELK stack for centralized logging

---

**Built with ❤️ using JavaScript and Modern Microservices Architecture**

**Tech Stack:** Node.js | Express.js | Kafka | MongoDB | Redis | Docker | Nginx | Tesseract.js

**Repository:** [RemotePatientMonitoring](https://github.com/Pallav46/RemotePatientMonitoring)
