# ============================================================================
# COMPREHENSIVE API TEST SUITE
# Remote Patient Monitoring System - Complete End-to-End Testing
# ============================================================================

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "pallavkumar6200@gmail.com"
$testName = "Pallav"
$testResults = @()
$totalStartTime = Get-Date
$userId = $null  # Will be set after registration

Write-Host "`n" -NoNewline
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "    REMOTE PATIENT MONITORING - COMPLETE API TEST SUITE" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Test Email: $testEmail" -ForegroundColor White
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to test an API endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$ContentType = "application/json",
        [hashtable]$Headers = @{}
    )
    
    $startTime = Get-Date
    $success = $false
    $response = $null
    $statusCode = 0
    $errorMsg = ""
    
    try {
        Write-Host "[TESTING] $Name..." -ForegroundColor Yellow -NoNewline
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 30
        }
        
        if ($Body -ne $null) {
            if ($ContentType -eq "application/json") {
                $params.Body = ($Body | ConvertTo-Json -Depth 10)
                $params.ContentType = $ContentType
            } else {
                $params.Body = $Body
                $params.ContentType = $ContentType
            }
        }
        
        $webResponse = Invoke-WebRequest @params
        $response = $webResponse.Content | ConvertFrom-Json
        $statusCode = $webResponse.StatusCode
        $success = $true
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        
        Write-Host "`r[OK] $Name" -ForegroundColor Green -NoNewline
        Write-Host " ($([math]::Round($duration, 0))ms)" -ForegroundColor Gray
        
    } catch {
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        $errorMsg = $_.Exception.Message
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        
        Write-Host "`r[FAIL] $Name" -ForegroundColor Red -NoNewline
        Write-Host " ($([math]::Round($duration, 0))ms)" -ForegroundColor Gray
        Write-Host "       Error: $errorMsg" -ForegroundColor Red
    }
    
    $result = @{
        Name = $Name
        Success = $success
        StatusCode = $statusCode
        Duration = [math]::Round($duration, 2)
        Response = $response
        Error = $errorMsg
        Timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    }
    
    return $result
}

# ============================================================================
# TEST 1: User Registration
# ============================================================================
Write-Host "`n[1/11] USER REGISTRATION" -ForegroundColor Cyan

# Try to register new user with original email
$result = Test-Endpoint `
    -Name "Register User" `
    -Method "POST" `
    -Url "$baseUrl/api/users/register" `
    -Body @{
        name = $testName
        email = $testEmail
        phone = "1234567890"
    }

$testResults += $result
$userId = if ($result.Success) { $result.Response.data.id } else { $null }

# If registration failed due to existing user, try with timestamp email
if (-not $userId -and $result.Error -match "already exists|409") {
    Write-Host "       User already exists, trying with new email..." -ForegroundColor Yellow
    $testEmail = "pallav_test_$timestamp@gmail.com"
    
    $result = Test-Endpoint `
        -Name "Register User (Alternative)" `
        -Method "POST" `
        -Url "$baseUrl/api/users/register" `
        -Body @{
            name = $testName
            email = $testEmail
            phone = "1234567890"
        }
    
    $testResults += $result
    $userId = if ($result.Success) { $result.Response.data.id } else { $null }
}

if (-not $userId) {
    Write-Host "`n[ERROR] Cannot proceed without user registration. Exiting..." -ForegroundColor Red
    Write-Host "Last error: $($result.Error)" -ForegroundColor Red
    exit 1
}

Write-Host "       User ID: $userId" -ForegroundColor Cyan

# ============================================================================
# TEST 2: Get User Data Records
# ============================================================================
Write-Host "`n[2/11] USER DATA RECORDS" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Get User Data Records" `
    -Method "GET" `
    -Url "$baseUrl/api/users/$userId/data"

$testResults += $result

# ============================================================================
# TEST 3: Submit Normal Health Data (Direct Submission)
# ============================================================================
Write-Host "`n[3/11] DIRECT HEALTH DATA SUBMISSION (Normal Vitals)" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Submit Normal Vitals" `
    -Method "POST" `
    -Url "$baseUrl/api/users/submit-patient-data" `
    -Body @{
        userId = $userId
        deviceType = "Manual Entry"
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
    }

$testResults += $result
$normalDataId = if ($result.Success) { $result.Response.data.dataId } else { $null }
Start-Sleep -Seconds 2

# ============================================================================
# TEST 4: Submit Critical Health Data (Direct Submission)
# ============================================================================
Write-Host "`n[4/11] DIRECT HEALTH DATA SUBMISSION (Critical Vitals)" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Submit Critical Vitals" `
    -Method "POST" `
    -Url "$baseUrl/api/users/submit-patient-data" `
    -Body @{
        userId = $userId
        deviceType = "Manual Entry"
        vitals = @{
            heartRate = 185
            bloodPressure = @{
                systolic = 200
                diastolic = 120
            }
            oxygenSaturation = 85
            temperature = 41.5
            respiratoryRate = 35
        }
    }

$testResults += $result
$criticalDataId = if ($result.Success) { $result.Response.data.dataId } else { $null }
Start-Sleep -Seconds 2

# ============================================================================
# TEST 5: Upload Medical Image 1
# ============================================================================
Write-Host "`n[5/11] IMAGE UPLOAD & OCR PROCESSING (Image 1)" -ForegroundColor Cyan

$imagePath1 = "test-img/img1.png"
if (Test-Path $imagePath1) {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($imagePath1)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"userId`"",
        "",
        $userId,
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"img1.png`"",
        "Content-Type: image/png",
        "",
        $fileContent,
        "--$boundary--"
    ) -join "`r`n"
    
    $result = Test-Endpoint `
        -Name "Upload Image 1" `
        -Method "POST" `
        -Url "$baseUrl/api/users/upload-image" `
        -Body $bodyLines `
        -ContentType "multipart/form-data; boundary=$boundary"
    
    $testResults += $result
    $imageDataId1 = if ($result.Success) { $result.Response.data.dataId } else { $null }
    Start-Sleep -Seconds 2
} else {
    Write-Host "[SKIP] Image 1 not found at $imagePath1" -ForegroundColor Yellow
}

# ============================================================================
# TEST 6: Upload Medical Image 2
# ============================================================================
Write-Host "`n[6/11] IMAGE UPLOAD & OCR PROCESSING (Image 2)" -ForegroundColor Cyan

$imagePath2 = "test-img/img2.png"
if (Test-Path $imagePath2) {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($imagePath2)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"userId`"",
        "",
        $userId,
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"img2.png`"",

        "Content-Type: image/png",
        "",
        $fileContent,
        "--$boundary--"
    ) -join "`r`n"
    
    $result = Test-Endpoint `
        -Name "Upload Image 2" `
        -Method "POST" `
        -Url "$baseUrl/api/users/upload-image" `
        -Body $bodyLines `
        -ContentType "multipart/form-data; boundary=$boundary"
    
    $testResults += $result
    $imageDataId2 = if ($result.Success) { $result.Response.data.dataId } else { $null }
    Start-Sleep -Seconds 2
} else {
    Write-Host "[SKIP] Image 2 not found at $imagePath2" -ForegroundColor Yellow
}

# ============================================================================
# TEST 7: Upload Medical Image 3
# ============================================================================
Write-Host "`n[7/11] IMAGE UPLOAD & OCR PROCESSING (Image 3)" -ForegroundColor Cyan

$imagePath3 = "test-img/img3.png"
if (Test-Path $imagePath3) {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($imagePath3)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"userId`"",
        "",
        $userId,
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"img3.png`"",
        "Content-Type: image/png",
        "",
        $fileContent,
        "--$boundary--"
    ) -join "`r`n"
    
    $result = Test-Endpoint `
        -Name "Upload Image 3" `
        -Method "POST" `
        -Url "$baseUrl/api/users/upload-image" `
        -Body $bodyLines `
        -ContentType "multipart/form-data; boundary=$boundary"
    
    $testResults += $result
    $imageDataId3 = if ($result.Success) { $result.Response.data.dataId } else { $null }
    Start-Sleep -Seconds 3
} else {
    Write-Host "[SKIP] Image 3 not found at $imagePath3" -ForegroundColor Yellow
}

# ============================================================================
# TEST 8: Get Patient Health History
# ============================================================================
Write-Host "`n[8/11] PATIENT HEALTH HISTORY" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Get Health History" `
    -Method "GET" `
    -Url "$baseUrl/api/icu/patient/$userId/history"

$testResults += $result

# ============================================================================
# TEST 9: Get Patient Statistics
# ============================================================================
Write-Host "`n[9/11] PATIENT STATISTICS" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Get Patient Statistics" `
    -Method "GET" `
    -Url "$baseUrl/api/icu/patient/$userId/statistics"

$testResults += $result

# ============================================================================
# TEST 10: Get Critical Alerts
# ============================================================================
Write-Host "`n[10/11] CRITICAL ALERTS" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Get Critical Alerts" `
    -Method "GET" `
    -Url "$baseUrl/api/icu/alerts/critical?limit=10"

$testResults += $result

# ============================================================================
# TEST 11: Get Notifications
# ============================================================================
Write-Host "`n[11/11] NOTIFICATIONS" -ForegroundColor Cyan
$result = Test-Endpoint `
    -Name "Get Notifications" `
    -Method "GET" `
    -Url "$baseUrl/api/notifications/user/$userId"

$testResults += $result

# ============================================================================
# GENERATE TEST SUMMARY
# ============================================================================
$totalDuration = ((Get-Date) - $totalStartTime).TotalSeconds
$passedTests = ($testResults | Where-Object { $_.Success }).Count
$failedTests = ($testResults | Where-Object { -not $_.Success }).Count
$totalTests = $testResults.Count
$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "`n"
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "                      TEST SUMMARY" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Total Tests:    $totalTests" -ForegroundColor White
Write-Host "Passed:         " -NoNewline -ForegroundColor White
Write-Host "$passedTests" -ForegroundColor Green
Write-Host "Failed:         " -NoNewline -ForegroundColor White
Write-Host "$failedTests" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
Write-Host "Success Rate:   $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } else { "Yellow" })
Write-Host "Total Duration: $([math]::Round($totalDuration, 2)) seconds" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# GENERATE HTML REPORT
# ============================================================================
$htmlReport = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remote Patient Monitoring - Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header h1::before {
            content: "🏥";
            font-size: 1.2em;
        }

        .header p {
            color: #666;
            font-size: 1.1em;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-card h3 {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .stat-card.passed .stat-value {
            color: #10b981;
        }

        .stat-card.failed .stat-value {
            color: #ef4444;
        }

        .stat-card.total .stat-value {
            color: #667eea;
        }

        .stat-card.duration .stat-value {
            color: #f59e0b;
        }

        .stat-card.success .stat-value {
            color: #8b5cf6;
        }

        .progress-bar {
            height: 10px;
            background: #e5e7eb;
            border-radius: 5px;
            overflow: hidden;
            margin-top: 10px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            transition: width 0.5s ease;
        }

        .test-results {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .test-results h2 {
            color: #667eea;
            font-size: 1.8em;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .test-results h2::before {
            content: "📊";
        }

        .test-item {
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }

        .test-item:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transform: translateX(5px);
        }

        .test-item.success {
            border-left: 5px solid #10b981;
            background: #f0fdf4;
        }

        .test-item.failed {
            border-left: 5px solid #ef4444;
            background: #fef2f2;
        }

        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .test-name {
            font-weight: bold;
            font-size: 1.1em;
            color: #1f2937;
        }

        .test-status {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.85em;
        }

        .test-status.passed {
            background: #10b981;
            color: white;
        }

        .test-status.failed {
            background: #ef4444;
            color: white;
        }

        .test-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
        }

        .detail-label {
            font-size: 0.85em;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }

        .detail-value {
            font-weight: bold;
            color: #1f2937;
        }

        .error-message {
            margin-top: 15px;
            padding: 15px;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #991b1b;
            font-family: monospace;
            font-size: 0.9em;
        }

        .response-data {
            margin-top: 15px;
            padding: 15px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            max-height: 300px;
            overflow-y: auto;
        }

        .response-data pre {
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            color: #374151;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .toggle-response {
            margin-top: 10px;
            padding: 8px 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.3s ease;
        }

        .toggle-response:hover {
            background: #5568d3;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            color: white;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .test-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }

            .test-details {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Remote Patient Monitoring System</h1>
            <p>Complete API Test Report - $(Get-Date -Format 'MMMM dd, yyyy HH:mm:ss')</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card total">
                <h3>Total Tests</h3>
                <div class="stat-value">$totalTests</div>
            </div>
            <div class="stat-card passed">
                <h3>Passed</h3>
                <div class="stat-value">$passedTests</div>
            </div>
            <div class="stat-card failed">
                <h3>Failed</h3>
                <div class="stat-value">$failedTests</div>
            </div>
            <div class="stat-card success">
                <h3>Success Rate</h3>
                <div class="stat-value">$successRate%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: $successRate%"></div>
                </div>
            </div>
            <div class="stat-card duration">
                <h3>Total Duration</h3>
                <div class="stat-value">$([math]::Round($totalDuration, 2))s</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Detailed Test Results</h2>
"@

foreach ($test in $testResults) {
    $statusClass = if ($test.Success) { "success" } else { "failed" }
    $statusText = if ($test.Success) { "PASSED" } else { "FAILED" }
    $statusBadge = if ($test.Success) { "passed" } else { "failed" }
    
    $responseJson = if ($test.Response) { 
        ($test.Response | ConvertTo-Json -Depth 10).Replace("<", "&lt;").Replace(">", "&gt;")
    } else { 
        "No response data" 
    }
    
    $htmlReport += @"
            <div class="test-item $statusClass">
                <div class="test-header">
                    <div class="test-name">$($test.Name)</div>
                    <div class="test-status $statusBadge">$statusText</div>
                </div>
                <div class="test-details">
                    <div class="detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">$($test.Duration) ms</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status Code</span>
                        <span class="detail-value">$($test.StatusCode)</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Timestamp</span>
                        <span class="detail-value">$($test.Timestamp)</span>
                    </div>
                </div>
"@
    
    if ($test.Error) {
        $htmlReport += @"
                <div class="error-message">
                    <strong>Error:</strong> $($test.Error.Replace("<", "&lt;").Replace(">", "&gt;"))
                </div>
"@
    }
    
    if ($test.Response) {
        $responseId = "response-" + ([guid]::NewGuid().ToString().Substring(0,8))
        $htmlReport += @"
                <button class="toggle-response" onclick="toggleResponse('$responseId')">Show Response Data</button>
                <div id="$responseId" class="response-data" style="display: none;">
                    <pre>$responseJson</pre>
                </div>
"@
    }
    
    $htmlReport += @"
            </div>
"@
}

$htmlReport += @"
        </div>

        <div class="footer">
            <p>Generated by Remote Patient Monitoring Test Suite</p>
            <p>Test User: $testEmail | User ID: $userId</p>
        </div>
    </div>

    <script>
        function toggleResponse(id) {
            const element = document.getElementById(id);
            const button = element.previousElementSibling;
            if (element.style.display === 'none') {
                element.style.display = 'block';
                button.textContent = 'Hide Response Data';
            } else {
                element.style.display = 'none';
                button.textContent = 'Show Response Data';
            }
        }

        // Animate progress bar on load
        window.addEventListener('load', function() {
            const progressBars = document.querySelectorAll('.progress-fill');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        });
    </script>
</body>
</html>
"@

# Save HTML report
$reportPath = "test-report-$timestamp.html"
$htmlReport | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "[SUCCESS] HTML test report generated: $reportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Opening report in browser..." -ForegroundColor Yellow
Start-Process $reportPath

# Save JSON report
$jsonReport = @{
    testRun = @{
        timestamp = $timestamp
        email = $testEmail
        userId = $userId
        startTime = $totalStartTime.ToString('yyyy-MM-dd HH:mm:ss')
        endTime = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        duration = $totalDuration
    }
    summary = @{
        totalTests = $totalTests
        passed = $passedTests
        failed = $failedTests
        successRate = $successRate
    }
    results = $testResults
} | ConvertTo-Json -Depth 10

$jsonReportPath = "test-report-$timestamp.json"
$jsonReport | Out-File -FilePath $jsonReportPath -Encoding UTF8

Write-Host "[SUCCESS] JSON test report saved: $jsonReportPath" -ForegroundColor Green
Write-Host ""
