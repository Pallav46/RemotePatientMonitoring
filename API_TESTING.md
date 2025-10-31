# API Testing Guide

## Setup

Before testing, make sure all services are running:
```powershell
docker-compose up -d
docker-compose ps
```

---

## Complete Test Workflow

### 1. Register a User (Patient)

**Note:** Each user represents a patient. No doctor/patient separation.

```powershell
$body = @{
    name = "John Patient"
    email = "john.patient@email.com"
    phone = "1234567890"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost/api/users/register" `
    -Method POST -ContentType "application/json" -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "690470087f2feb262c499116",
    "name": "John Patient",
    "email": "john.patient@email.com"
  }
}
```

**💾 Save the `id` - this is your userId!**

---

### 2a. Submit Data Directly (Recommended)

Submit your health vitals data directly without uploading an image:

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

$body = @{
    userId = $userId
    vitals = @{
        heartRate = 72
        bloodPressure = @{
            systolic = 120
            diastolic = 80
        }
        oxygenSaturation = 98
        temperature = 36.8
        respiratoryRate = 16
    }
    deviceType = "Manual Entry"  # Optional
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Data received from userId: 690470087f2feb262c499116",
  "data": {
    "dataId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "submissionType": "direct-data",
    "status": "processing",
    "vitals": {
      "heartRate": 72,
      "bloodPressure": {
        "systolic": 120,
        "diastolic": 80
      },
      "oxygenSaturation": 98,
      "temperature": 36.8,
      "respiratoryRate": 16,
      "rawText": "Direct data submission - No OCR processing"
    }
  }
}
```

**💾 Save the `dataId`!**

---

### 2b. OR Upload Image (Alternative)

If you have a patient monitor image, you can upload it:

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

# Create form data
$form = @{
    userId = $userId
    deviceType = "Philips Monitor"  # Optional
    image = Get-Item "C:\path\to\patient-monitor.jpg"
}

Invoke-RestMethod -Uri "http://localhost/api/users/upload-image" `
    -Method POST -Form $form
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Data received from userId: 690470087f2feb262c499116",
  "data": {
    "dataId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "fileName": "patient-monitor.jpg",
    "status": "processing"
  }
}
```

---

### 3. Check Data Processing Status

```powershell
$dataId = "b2c3d4e5-f6a7-8901-bcde-f23456789012"  # Replace with your dataId

Invoke-RestMethod -Uri "http://localhost/api/users/data-status/$dataId"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "dataId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "fileName": "direct-data-submission",
    "status": "completed",
    "uploadedAt": "2025-10-31T10:30:00.000Z",
    "processedAt": "2025-10-31T10:30:15.000Z",
    "user": {
      "_id": "690470087f2feb262c499116",
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

---

### 4. View Analyzed Data from ICU Service

```powershell
$dataId = "b2c3d4e5-f6a7-8901-bcde-f23456789012"  # Replace with your dataId

Invoke-RestMethod -Uri "http://localhost/api/patients/data/$dataId"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "dataId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "userId": "690470087f2feb262c499116",
    "userEmail": "john.patient@email.com",
    "userName": "John Patient",
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
    "status": "normal",
    "alerts": [],
    "ocrConfidence": 100,
    "processedAt": "2025-10-31T10:30:15.000Z"
  }
}
```

---

### 5. Get Your Health History

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/history?limit=10"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "dataId": "...",
      "userId": "690470087f2feb262c499116",
      "vitals": {...},
      "status": "normal",
      "processedAt": "2025-10-31T10:35:00.000Z"
    },
    ...
  ]
}
```

---

### 6. Get Your Health Statistics

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/statistics"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalReadings": 5,
    "normal": 3,
    "warning": 1,
    "critical": 1,
    "error": 0,
    "lastUpdated": "2025-10-31T10:35:00.000Z"
  }
}
```

---

### 7. Get All Your Data Records

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

Invoke-RestMethod -Uri "http://localhost/api/users/$userId/data?limit=20"
```

---

### 8. Get All Critical Cases (System-wide)

```powershell
Invoke-RestMethod -Uri "http://localhost/api/patients/critical/list"
```

---

### 9. Get Your Notifications

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

Invoke-RestMethod -Uri "http://localhost/api/notifications/user/$userId?type=alert"
```

---

### 10. Get Notification Statistics

```powershell
Invoke-RestMethod -Uri "http://localhost/api/notifications/statistics"
```

---

## Testing Critical Alerts (Email Notifications)

Submit data with critical vitals to trigger email notification:

```powershell
$userId = "690470087f2feb262c499116"  # Replace with your userId

$body = @{
    userId = $userId
    vitals = @{
        heartRate = 185           # Critical: too high
        bloodPressure = @{
            systolic = 200         # Critical: dangerously high
            diastolic = 120
        }
        oxygenSaturation = 85     # Critical: too low
        temperature = 41.5        # Critical: high fever
        respiratoryRate = 28      # Warning: elevated
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $body
```

**Check your email!** You should receive:
- Subject: "🚨 CRITICAL Health Alert - [Your Name]"
- Contains all critical vitals and alerts
- Sent to the email you registered with

---

## Health Vitals Ranges

### Normal Ranges:
- **Heart Rate:** 60-100 bpm
- **Blood Pressure:** 90-120 / 60-80 mmHg
- **Oxygen Saturation:** 95-100%
- **Temperature:** 36.5-37.5°C (97.7-99.5°F)
- **Respiratory Rate:** 12-20 /min

### Validation Limits:
- **Heart Rate:** 0-300 bpm
- **Blood Pressure:** Systolic 0-300, Diastolic 0-200
- **Oxygen Saturation:** 0-100%
- **Temperature:** 20-50°C
- **Respiratory Rate:** 0-100 /min

---

## Health Checks

```powershell
# API Gateway
Invoke-RestMethod -Uri "http://localhost/health"

# User Service
Invoke-RestMethod -Uri "http://localhost:3001/health"

# OCR Service
Invoke-RestMethod -Uri "http://localhost:3002/health"

# ICU Service
Invoke-RestMethod -Uri "http://localhost:3003/health"

# Notification Service
Invoke-RestMethod -Uri "http://localhost:3004/health"
```

---

## Debug Commands

```powershell
# View all running containers
docker-compose ps

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f user-service
docker-compose logs -f ocr-service
docker-compose logs -f icu-service
docker-compose logs -f notification-service

# Check Kafka topics
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

# Monitor Kafka messages (image uploads)
docker exec -it kafka kafka-console-consumer `
  --bootstrap-server localhost:9092 `
  --topic image-upload-topic `
  --from-beginning

# Monitor Kafka messages (OCR complete)
docker exec -it kafka kafka-console-consumer `
  --bootstrap-server localhost:9092 `
  --topic ocr-complete-topic `
  --from-beginning

# Monitor Kafka messages (alerts)
docker exec -it kafka kafka-console-consumer `
  --bootstrap-server localhost:9092 `
  --topic alert-topic `
  --from-beginning

# Check MongoDB
docker exec -it mongodb mongosh
> show dbs
> use user_service
> db.users.find().pretty()
> db.patientimages.find().pretty()
> use icu_service
> db.patientdatas.find().pretty()

# Check Redis cache
docker exec -it redis redis-cli
> KEYS *
> GET user:690470087f2feb262c499116:latest
> GET user:690470087f2feb262c499116:stats
```

---

## Expected Kafka Message Flow

### Option 1: Direct Data Submission
```
User submits vitals → user-service → ocr-complete-topic (skip OCR) 
→ icu-service → alert-topic (if warning/critical) 
→ notification-service → Email sent
```

### Option 2: Image Upload
```
User uploads image → user-service → image-upload-topic 
→ ocr-service → ocr-complete-topic 
→ icu-service → alert-topic (if warning/critical) 
→ notification-service → Email sent
```

---

## Troubleshooting

### Issue: "User not found"
- Make sure you're using the correct userId from the registration response

### Issue: "Data record not found"
- Verify the dataId from the submit/upload response
- Check if data processing completed successfully

### Issue: "No response" or timeout
- Check if all services are running: `docker-compose ps`
- Check service health: `Invoke-RestMethod -Uri "http://localhost/health"`
- View logs: `docker-compose logs`

### Issue: Email not received
- Check notification service logs: `docker-compose logs notification-service`
- Verify SMTP credentials in `.env` file
- Check spam folder
- For Gmail, ensure "App Password" is used (not regular password)

### Issue: Invalid vitals data
- Ensure all vitals are within valid ranges
- Temperature must be 20-50°C
- Blood pressure requires both systolic and diastolic values

---

## Complete Example Workflow

```powershell
# 1. Register
$registerBody = @{
    name = "Jane Doe"
    email = "jane.doe@email.com"
    phone = "9876543210"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "http://localhost/api/users/register" `
    -Method POST -ContentType "application/json" -Body $registerBody

$userId = $user.data.id
Write-Host "Registered userId: $userId"

# 2. Submit normal vitals
$normalBody = @{
    userId = $userId
    vitals = @{
        heartRate = 72
        bloodPressure = @{systolic = 120; diastolic = 80}
        oxygenSaturation = 98
        temperature = 36.8
    }
} | ConvertTo-Json -Depth 10

$normalResult = Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $normalBody

$dataId1 = $normalResult.data.dataId
Write-Host "Normal data submitted: $dataId1"

# 3. Submit critical vitals (triggers email)
$criticalBody = @{
    userId = $userId
    vitals = @{
        heartRate = 180
        bloodPressure = @{systolic = 195; diastolic = 115}
        oxygenSaturation = 88
    }
} | ConvertTo-Json -Depth 10

$criticalResult = Invoke-RestMethod -Uri "http://localhost/api/users/submit-patient-data" `
    -Method POST -ContentType "application/json" -Body $criticalBody

$dataId2 = $criticalResult.data.dataId
Write-Host "Critical data submitted: $dataId2"

# 4. Wait for processing
Start-Sleep -Seconds 5

# 5. Check statistics
$stats = Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/statistics"
Write-Host "Statistics:"
$stats.data | ConvertTo-Json

# 6. View history
$history = Invoke-RestMethod -Uri "http://localhost/api/patients/$userId/history?limit=10"
Write-Host "Total records: $($history.count)"

# Check your email for critical alert!
```

---

**Happy Testing! 🚀**

**System Features:**
✅ Patient-centric (no doctor/patient separation)
✅ Direct data submission or image upload
✅ Automatic health analysis with ICU service
✅ Real-time email alerts for critical conditions
✅ Complete health history tracking
✅ Statistics and trending
✅ Fully decoupled microservices architecture
