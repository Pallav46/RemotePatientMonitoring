# Remote Patient Monitoring System - Complete API Test Suite
# Run: .\test.ps1

param(
    [string]$UserEmail = "pallavkumar6200@gmail.com",
    [string]$UserName = "Pallav",
    [string]$UserPhone = "9876543210"
)

$ApiBase = "http://localhost"
$ErrorActionPreference = "Continue"

$script:Passed = 0
$script:Failed = 0
$script:Total = 0

function Print-Test {
    param([string]$TestName, [string]$Status, [string]$Details = "")
    $script:Total++
    if ($Status -eq "PASS") {
        Write-Host "PASS TEST $($script:Total): $TestName" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "FAIL TEST $($script:Total): $TestName" -ForegroundColor Red
        $script:Failed++
    }
    if ($Details) { Write-Host "   $Details" -ForegroundColor Gray }
}

function Invoke-ApiCall {
    param([string]$Method, [string]$Endpoint, [object]$Body = $null)
    try {
        $uri = "$ApiBase$Endpoint"
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            return Invoke-RestMethod -Uri $uri -Method $Method -ContentType "application/json" -Body $jsonBody -TimeoutSec 30
        } else {
            return Invoke-RestMethod -Uri $uri -Method $Method -TimeoutSec 30
        }
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n=== AUTOMATED TEST SUITE ===" -ForegroundColor Cyan

# Check services
Write-Host "`nChecking services..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$ApiBase/health" -TimeoutSec 5
    Write-Host "Services OK`n" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Services not running. Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

# TEST 1: Register User
Write-Host "TEST 1: User Registration" -ForegroundColor Yellow
$registerBody = @{ name = $UserName; email = $UserEmail; phone = $UserPhone }
$registerResponse = Invoke-ApiCall -Method POST -Endpoint "/api/users/register" -Body $registerBody
if ($registerResponse -and $registerResponse.data.id) {
    $script:UserId = $registerResponse.data.id
    Print-Test "User Registration" "PASS" "User ID: $script:UserId"
} else {
    Print-Test "User Registration" "FAIL"
}

# TEST 2: Submit Data
Write-Host "`nTEST 2: Submit Health Data" -ForegroundColor Yellow
$dataBody = @{
    userId = $script:UserId
    vitals = @{
        heartRate = 72; bloodPressure = @{ systolic = 120; diastolic = 80 }
        oxygenSaturation = 98; temperature = 36.8; respiratoryRate = 16
    }
    deviceType = "Auto Test"
}
$dataResponse = Invoke-ApiCall -Method POST -Endpoint "/api/users/submit-patient-data" -Body $dataBody
if ($dataResponse -and $dataResponse.data.dataId) {
    $script:DataId1 = $dataResponse.data.dataId
    Print-Test "Data Submission" "PASS" "Data ID: $script:DataId1"
} else {
    Print-Test "Data Submission" "FAIL"
}

# Wait for processing
Write-Host "`nWaiting 5s for processing..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# TEST 3: Data Status
Write-Host "`nTEST 3: Check Data Status" -ForegroundColor Yellow
$statusResponse = Invoke-ApiCall -Method GET -Endpoint "/api/users/data-status/$script:DataId1"
if ($statusResponse -and $statusResponse.success) {
    Print-Test "Data Status" "PASS"
} else {
    Print-Test "Data Status" "FAIL"
}

# TEST 4: ICU Analysis
Write-Host "`nTEST 4: ICU Analysis" -ForegroundColor Yellow
$icuResponse = Invoke-ApiCall -Method GET -Endpoint "/api/patients/data/$script:DataId1"
if ($icuResponse -and $icuResponse.success) {
    Print-Test "ICU Analysis" "PASS" "Status: $($icuResponse.data.status)"
} else {
    Print-Test "ICU Analysis" "FAIL"
}

# TEST 5: Patient History
Write-Host "`nTEST 5: Patient History" -ForegroundColor Yellow
$historyResponse = Invoke-ApiCall -Method GET -Endpoint "/api/patients/$script:UserId/history?limit=10"
if ($historyResponse -and $historyResponse.count -gt 0) {
    Print-Test "Patient History" "PASS" "Records: $($historyResponse.count)"
} else {
    Print-Test "Patient History" "FAIL"
}

# TEST 6: Patient Statistics
Write-Host "`nTEST 6: Patient Statistics" -ForegroundColor Yellow
$statsResponse = Invoke-ApiCall -Method GET -Endpoint "/api/patients/$script:UserId/statistics"
if ($statsResponse -and $statsResponse.data.totalReadings) {
    Print-Test "Patient Statistics" "PASS" "Readings: $($statsResponse.data.totalReadings)"
} else {
    Print-Test "Patient Statistics" "FAIL"
}

# TEST 7: All User Data
Write-Host "`nTEST 7: User Data Records" -ForegroundColor Yellow
$userDataResponse = Invoke-ApiCall -Method GET -Endpoint "/api/users/$script:UserId/data?limit=10"
if ($userDataResponse -and $userDataResponse.success) {
    Print-Test "User Data Records" "PASS"
} else {
    Print-Test "User Data Records" "FAIL"
}

# TEST 8: Critical Alert
Write-Host "`nTEST 8: Critical Alert" -ForegroundColor Yellow
$criticalBody = @{
    userId = $script:UserId
    vitals = @{
        heartRate = 185; bloodPressure = @{ systolic = 200; diastolic = 120 }
        oxygenSaturation = 85; temperature = 41.5; respiratoryRate = 28
    }
    deviceType = "Critical Test"
}
$criticalResponse = Invoke-ApiCall -Method POST -Endpoint "/api/users/submit-patient-data" -Body $criticalBody
if ($criticalResponse -and $criticalResponse.data.dataId) {
    $script:CriticalDataId = $criticalResponse.data.dataId
    Print-Test "Critical Alert" "PASS" "Data ID: $script:CriticalDataId"
} else {
    Print-Test "Critical Alert" "FAIL"
}

Write-Host "`nWaiting 5s for alert processing..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# TEST 9: Critical Cases List
Write-Host "`nTEST 9: Critical Cases List" -ForegroundColor Yellow
$criticalListResponse = Invoke-ApiCall -Method GET -Endpoint "/api/patients/critical/list"
if ($criticalListResponse -and $criticalListResponse.count -gt 0) {
    Print-Test "Critical Cases List" "PASS" "Cases: $($criticalListResponse.count)"
} else {
    Print-Test "Critical Cases List" "FAIL"
}

# TEST 10: User Notifications
Write-Host "`nTEST 10: User Notifications" -ForegroundColor Yellow
$notifResponse = Invoke-ApiCall -Method GET -Endpoint "/api/notifications/user/$script:UserId"
if ($notifResponse) {
    Print-Test "User Notifications" "PASS" "Count: $($notifResponse.count)"
} else {
    Print-Test "User Notifications" "FAIL"
}

# TEST 11: Notification Stats
Write-Host "`nTEST 11: Notification Statistics" -ForegroundColor Yellow
$notifStatsResponse = Invoke-ApiCall -Method GET -Endpoint "/api/notifications/statistics"
if ($notifStatsResponse -and $notifStatsResponse.data.total -ne $null) {
    Print-Test "Notification Stats" "PASS"
} else {
    Print-Test "Notification Stats" "FAIL"
}

# Summary
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total:   $script:Total"
Write-Host "Passed:  $script:Passed" -ForegroundColor Green
Write-Host "Failed:  $script:Failed" -ForegroundColor Red
$successRate = [math]::Round(($script:Passed / $script:Total) * 100, 0)
Write-Host "Success: ${successRate}%`n" -ForegroundColor $(if($script:Failed -eq 0){'Green'}else{'Yellow'})

if ($script:Failed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host "`nTest User: $UserEmail (ID: $script:UserId)`n"
    exit 0
} else {
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
