# Patient Monitoring System - Architecture

## System Architecture Diagram

```
                                    ┌─────────────────────┐
                                    │                     │
                                    │   External Client   │
                                    │                     │
                                    └──────────┬──────────┘
                                               │
                                               │ HTTP/REST
                                               ▼
                        ┌──────────────────────────────────────┐
                        │                                      │
                        │      Nginx API Gateway (Port 80)     │
                        │  • Load Balancing                    │
                        │  • Rate Limiting                     │
                        │  • Security Headers                  │
                        └────┬─────────────┬──────────────┬────┘
                             │             │              │
                ┌────────────┘             │              └────────────┐
                │                          │                           │
                ▼                          ▼                           ▼
    ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
    │  User Service    │      │   ICU Service    │      │  Notification    │
    │  (Port 3001)     │      │  (Port 3003)     │      │  Service         │
    │                  │      │                  │      │  (Port 3004)     │
    │ • Registration   │      │ • Vital Analysis │      │                  │
    │ • Image Upload   │      │ • Alert Gen.     │      │ • Email Alerts   │
    │ • Metadata       │      │ • Statistics     │      │ • Error Notif.   │
    └─────┬────────────┘      └────────┬─────────┘      └────────┬─────────┘
          │                            │                         │
          │                            │                         │
          │                            │                         │
          │    ┌───────────────────────┴─────────────────────────┘
          │    │                       │
          │    │    ┌──────────────────┘
          │    │    │
          ▼    ▼    ▼
    ┌────────────────────────────────────────────────┐
    │                                                │
    │         Apache Kafka Message Broker            │
    │                                                │
    │  Topics:                                       │
    │  • image-upload-topic                         │
    │  • ocr-complete-topic                         │
    │  • alert-topic                                │
    │  • error-topic                                │
    │                                                │
    └───────────────────┬────────────────────────────┘
                        │
                        │ Subscribe
                        ▼
              ┌──────────────────┐
              │   OCR Service    │
              │  (Port 3002)     │
              │                  │
              │ • Tesseract OCR  │
              │ • Image Process  │
              │ • Data Extract   │
              └──────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MongoDB    │  │    Redis     │  │  Zookeeper   │     │
│  │  (Port 27017)│  │  (Port 6379) │  │ (Port 2181)  │     │
│  │              │  │              │  │              │     │
│  │ • Users      │  │ • Cache      │  │ • Kafka      │     │
│  │ • Images     │  │ • Sessions   │  │   Coord.     │     │
│  │ • Patients   │  │ • Stats      │  │              │     │
│  │ • Notifications │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Message Flow Sequence

### Flow 1: Image Upload (with OCR)

```
┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐
│Client│     │User  │     │OCR   │     │ICU   │     │Notif │
│      │     │Svc   │     │Svc   │     │Svc   │     │Svc   │
└───┬──┘     └───┬──┘     └───┬──┘     └───┬──┘     └───┬──┘
    │            │            │            │            │
    │ 1. POST    │            │            │            │
    │ /upload    │            │            │            │
    ├───────────>│            │            │            │
    │            │            │            │            │
    │ 2. Save to │            │            │            │
    │    MongoDB │            │            │            │
    │            │            │            │            │
    │            │ 3. Publish │            │            │
    │            │  to Kafka  │            │            │
    │            │ (image-    │            │            │
    │            │  upload)   │            │            │
    │            ├───────────>│            │            │
    │            │            │            │            │
    │ 4. Response│            │            │            │
    │ {imageId}  │            │            │            │
    │<───────────┤            │            │            │
    │            │            │            │            │
    │            │            │ 5. Process │            │
    │            │            │    OCR     │            │
    │            │            │            │            │
    │            │            │ 6. Publish │            │
    │            │            │  to Kafka  │            │
    │            │            │ (ocr-      │            │
    │            │            │  complete) │            │
    │            │            ├───────────>│            │
    │            │            │            │            │
    │            │            │            │ 7. Validate│
    │            │            │            │    Vitals  │
    │            │            │            │            │
    │            │            │            │ 8. IF      │
    │            │            │            │  Critical  │
    │            │            │            │            │
    │            │            │            │ 9. Publish │
    │            │            │            │  to Kafka  │
    │            │            │            │ (alert)    │
    │            │            │            ├───────────>│
    │            │            │            │            │
    │            │            │            │            │10. Send
    │            │            │            │            │   Email
    │            │            │            │            │
    └────────────┴────────────┴────────────┴────────────┴─────
```

### Flow 2: Direct Data Submission (NEW - Skip OCR)

```
┌──────┐     ┌──────┐                 ┌──────┐     ┌──────┐
│Client│     │User  │                 │ICU   │     │Notif │
│      │     │Svc   │                 │Svc   │     │Svc   │
└───┬──┘     └───┬──┘                 └───┬──┘     └───┬──┘
    │            │                        │            │
    │ 1. POST    │                        │            │
    │ /submit-   │                        │            │
    │  patient-  │                        │            │
    │  data      │                        │            │
    ├───────────>│                        │            │
    │            │                        │            │
    │ 2. Save to │                        │            │
    │    MongoDB │                        │            │
    │            │                        │            │
    │            │ 3. Publish DIRECTLY    │            │
    │            │  to Kafka              │            │
    │            │ (ocr-complete)         │            │
    │            │  *** SKIP OCR ***      │            │
    │            ├───────────────────────>│            │
    │            │                        │            │
    │ 4. Response│                        │            │
    │ {imageId}  │                        │            │
    │<───────────┤                        │            │
    │            │                        │            │
    │            │                        │ 5. Validate│
    │            │                        │    Vitals  │
    │            │                        │            │
    │            │                        │ 6. IF      │
    │            │                        │  Critical  │
    │            │                        │            │
    │            │                        │ 7. Publish │
    │            │                        │  to Kafka  │
    │            │                        │ (alert)    │
    │            │                        ├───────────>│
    │            │                        │            │
    │            │                        │            │ 8. Send
    │            │                        │            │   Email
    │            │                        │            │
    └────────────┴────────────────────────┴────────────┴─────
```

## Service Communication Patterns

### 1. Synchronous Communication
- **Client ↔ Nginx ↔ Services**: HTTP/REST
- Used for: User registration, image upload, querying data

### 2. Asynchronous Communication (Kafka)
- **User Service → OCR Service**: Image processing
- **OCR Service → ICU Service**: Data analysis
- **ICU Service → Notification Service**: Alerts
- **All Services → Notification Service**: Errors

### 3. Data Storage
- **MongoDB**: Persistent storage for all services
- **Redis**: Caching layer for ICU service (patient stats)
- **Shared Volume**: Image files accessible to User & OCR services

## Scalability Features

### Horizontal Scalability
```
              ┌──────────────┐
              │    Nginx     │
              │ Load Balancer│
              └───────┬──────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌────────┐    ┌────────┐    ┌────────┐
   │User-1  │    │User-2  │    │User-3  │
   │Service │    │Service │    │Service │
   └────────┘    └────────┘    └────────┘
```

### Kafka Consumer Groups
```
┌─────────────────────────────────┐
│   image-upload-topic            │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐    ┌────────┐
│OCR-1   │    │OCR-2   │  ← Consumer Group
│Service │    │Service │    (load balanced)
└────────┘    └────────┘
```

## Fault Tolerance

### 1. Service Level
- Health checks every 30s
- Auto-restart on failure
- Retry mechanisms in Kafka consumers

### 2. Data Level
- MongoDB persistence
- Redis backup (AOF enabled)
- Kafka message retention (7 days)

### 3. Network Level
- Circuit breakers (future enhancement)
- Timeout configurations
- Rate limiting

## Security Layers

```
┌──────────────────────────────────────┐
│  1. Nginx Layer                      │
│     • Rate Limiting (10 req/s)       │
│     • Security Headers               │
│     • SSL/TLS (production)           │
├──────────────────────────────────────┤
│  2. Application Layer                │
│     • Input Validation (Joi)         │
│     • File Type Validation           │
│     • Helmet.js                      │
├──────────────────────────────────────┤
│  3. Network Layer                    │
│     • Docker Network Isolation       │
│     • Internal Service Communication │
│     • Exposed Ports Minimal          │
└──────────────────────────────────────┘
```

## Data Flow: Critical Alert Example

### Scenario 1: Image Upload with OCR
```
1. Image Upload
   └─> User Service saves to MongoDB
       └─> Publishes to Kafka (image-upload-topic)

2. OCR Processing
   └─> Extracts: HR=180, BP=200/120, SpO2=85%
       └─> Publishes to Kafka (ocr-complete-topic)

3. ICU Analysis
   └─> Detects CRITICAL condition
       ├─> Saves to MongoDB
       ├─> Caches in Redis
       └─> Publishes ALERT to Kafka

4. Notification
   └─> Receives alert
       ├─> Saves to MongoDB
       └─> Sends EMAIL to doctor
```

### Scenario 2: Direct Data Submission (NEW - Skip OCR)
```
1. Direct Data Submission
   └─> User Service saves to MongoDB
       └─> Publishes DIRECTLY to Kafka (ocr-complete-topic)
           *** OCR Service is bypassed ***

2. ICU Analysis (same as scenario 1)
   └─> Detects CRITICAL condition
       ├─> Saves to MongoDB
       ├─> Caches in Redis
       └─> Publishes ALERT to Kafka

3. Notification (same as scenario 1)
   └─> Receives alert
       ├─> Saves to MongoDB
       └─> Sends EMAIL to doctor
```

## Performance Optimization

### 1. Caching Strategy
```
Request → Redis Cache → MongoDB
   ↓          ↓            ↓
  Hit       Miss         Source
  (1ms)    (5ms)        (20ms)
```

### 2. Database Indexing
- `userId` + `createdAt` (compound)
- `patientId` (single)
- `status` (single)
- `imageId` (unique)

### 3. Kafka Partitioning
```
Topic: image-upload-topic
├─ Partition 0 (User A-J)
├─ Partition 1 (User K-T)
└─ Partition 2 (User U-Z)
```

## Monitoring & Observability

### Health Endpoints
- `/health` - All services
- Response: `200 OK` or `503 Service Unavailable`

### Metrics to Monitor (Production)
1. **Service Metrics**
   - Request rate
   - Error rate
   - Response time
   - CPU/Memory usage

2. **Kafka Metrics**
   - Consumer lag
   - Message throughput
   - Partition distribution

3. **Database Metrics**
   - Connection pool
   - Query performance
   - Storage usage

### Logging Strategy
```
Level     Service          Output
─────     ───────          ──────
INFO      All Services     stdout
ERROR     All Services     stderr
DEBUG     Development      stdout
```

## Deployment Strategy

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose up -d
# + External load balancer
# + Monitoring (Prometheus + Grafana)
# + Logging (ELK Stack)
```

### Cloud Deployment (Future)
```
Kubernetes Cluster
├─ User Service (Deployment, 3 replicas)
├─ OCR Service (Deployment, 2 replicas)
├─ ICU Service (Deployment, 2 replicas)
├─ Notification Service (Deployment, 2 replicas)
├─ Kafka (StatefulSet, 3 brokers)
├─ MongoDB (StatefulSet, replica set)
└─ Redis (Deployment, sentinel)
```

---

**This architecture ensures:**
- ✅ High availability
- ✅ Horizontal scalability
- ✅ Fault tolerance
- ✅ Service decoupling
- ✅ Easy maintenance
- ✅ Performance optimization
