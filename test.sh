#!/bin/bash

# Remote Patient Monitoring System - Complete API Test Suite
# This script tests all API endpoints automatically

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost"
USER_EMAIL="${USER_EMAIL:-pallavkumar6200@gmail.com}"
USER_NAME="${USER_NAME:-Pallav Kumar}"
USER_PHONE="${USER_PHONE:-9876543210}"

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to print test results
print_test() {
    local test_name=$1
    local status=$2
    TOTAL=$((TOTAL + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} TEST $TOTAL: $test_name - ${GREEN}PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} TEST $TOTAL: $test_name - ${RED}FAILED${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" "$API_BASE$endpoint"
    else
        curl -s -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║         REMOTE PATIENT MONITORING - AUTOMATED TEST SUITE             ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if services are running
echo -e "${YELLOW}Checking services health...${NC}"
if ! curl -s -f "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Services are not running. Please start with: docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All services are running${NC}\n"

# TEST 1: Register User
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 1: User Registration${NC}"
REGISTER_RESPONSE=$(api_call POST "/api/users/register" "{
    \"name\": \"$USER_NAME\",
    \"email\": \"$USER_EMAIL\",
    \"phone\": \"$USER_PHONE\"
}")

USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$USER_ID" ]; then
    print_test "User Registration" "PASS"
    echo "   User ID: $USER_ID"
else
    print_test "User Registration" "FAIL"
    echo "   Response: $REGISTER_RESPONSE"
fi
echo ""

# TEST 2: Submit Normal Health Data
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 2: Direct Data Submission (Normal Vitals)${NC}"
DATA_RESPONSE=$(api_call POST "/api/users/submit-patient-data" "{
    \"userId\": \"$USER_ID\",
    \"vitals\": {
        \"heartRate\": 72,
        \"bloodPressure\": {
            \"systolic\": 120,
            \"diastolic\": 80
        },
        \"oxygenSaturation\": 98,
        \"temperature\": 36.8,
        \"respiratoryRate\": 16
    },
    \"deviceType\": \"Auto Test Script\"
}")

DATA_ID_1=$(echo "$DATA_RESPONSE" | grep -o '"dataId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$DATA_ID_1" ]; then
    print_test "Direct Data Submission" "PASS"
    echo "   Data ID: $DATA_ID_1"
else
    print_test "Direct Data Submission" "FAIL"
fi
echo ""

# TEST 3: Upload Image (if exists)
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 3: Image Upload${NC}"

if [ -f "test-img/img1.jpeg" ]; then
    UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/api/users/upload-image" \
        -F "userId=$USER_ID" \
        -F "deviceType=Test Monitor" \
        -F "image=@test-img/img1.jpeg")
    
    DATA_ID_2=$(echo "$UPLOAD_RESPONSE" | grep -o '"dataId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$DATA_ID_2" ]; then
        print_test "Image Upload" "PASS"
        echo "   Data ID: $DATA_ID_2"
    else
        print_test "Image Upload" "FAIL"
    fi
else
    echo -e "${YELLOW}⊘ Skipped: test-img/img1.jpeg not found${NC}"
fi
echo ""

# Wait for processing
echo -e "${YELLOW}Waiting 5 seconds for data processing...${NC}"
sleep 5
echo ""

# TEST 4: Check Data Status
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 4: Data Status Check${NC}"
STATUS_RESPONSE=$(api_call GET "/api/users/data-status/$DATA_ID_1")

if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
    print_test "Data Status Check" "PASS"
else
    print_test "Data Status Check" "FAIL"
fi
echo ""

# TEST 5: Get ICU Analyzed Data
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 5: ICU Service - Get Analyzed Data${NC}"
ICU_RESPONSE=$(api_call GET "/api/patients/data/$DATA_ID_1")

if echo "$ICU_RESPONSE" | grep -q '"success":true'; then
    print_test "ICU Analyzed Data" "PASS"
    STATUS=$(echo "$ICU_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 | head -1)
    echo "   Health Status: $STATUS"
else
    print_test "ICU Analyzed Data" "FAIL"
fi
echo ""

# TEST 6: Get Patient History
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 6: Patient History${NC}"
HISTORY_RESPONSE=$(api_call GET "/api/patients/$USER_ID/history?limit=10")

RECORD_COUNT=$(echo "$HISTORY_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ -n "$RECORD_COUNT" ] && [ "$RECORD_COUNT" -gt 0 ]; then
    print_test "Patient History" "PASS"
    echo "   Total Records: $RECORD_COUNT"
else
    print_test "Patient History" "FAIL"
fi
echo ""

# TEST 7: Get Patient Statistics
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 7: Patient Statistics${NC}"
STATS_RESPONSE=$(api_call GET "/api/patients/$USER_ID/statistics")

if echo "$STATS_RESPONSE" | grep -q '"totalReadings"'; then
    print_test "Patient Statistics" "PASS"
    TOTAL_READINGS=$(echo "$STATS_RESPONSE" | grep -o '"totalReadings":[0-9]*' | cut -d':' -f2)
    echo "   Total Readings: $TOTAL_READINGS"
else
    print_test "Patient Statistics" "FAIL"
fi
echo ""

# TEST 8: Get All User Data
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 8: All User Data Records${NC}"
USER_DATA_RESPONSE=$(api_call GET "/api/users/$USER_ID/data?limit=10")

if echo "$USER_DATA_RESPONSE" | grep -q '"success":true'; then
    print_test "User Data Records" "PASS"
else
    print_test "User Data Records" "FAIL"
fi
echo ""

# TEST 9: Submit Critical Data (Trigger Alert)
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 9: Critical Alert Detection${NC}"
CRITICAL_RESPONSE=$(api_call POST "/api/users/submit-patient-data" "{
    \"userId\": \"$USER_ID\",
    \"vitals\": {
        \"heartRate\": 185,
        \"bloodPressure\": {
            \"systolic\": 200,
            \"diastolic\": 120
        },
        \"oxygenSaturation\": 85,
        \"temperature\": 41.5,
        \"respiratoryRate\": 28
    },
    \"deviceType\": \"Critical Test\"
}")

CRITICAL_DATA_ID=$(echo "$CRITICAL_RESPONSE" | grep -o '"dataId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CRITICAL_DATA_ID" ]; then
    print_test "Critical Data Submission" "PASS"
    echo "   Data ID: $CRITICAL_DATA_ID"
else
    print_test "Critical Data Submission" "FAIL"
fi
echo ""

# Wait for alert processing
echo -e "${YELLOW}Waiting 5 seconds for alert processing...${NC}"
sleep 5
echo ""

# TEST 10: Check Critical Cases List
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 10: Critical Cases List${NC}"
CRITICAL_LIST_RESPONSE=$(api_call GET "/api/patients/critical/list")

CRITICAL_COUNT=$(echo "$CRITICAL_LIST_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ -n "$CRITICAL_COUNT" ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
    print_test "Critical Cases List" "PASS"
    echo "   Critical Cases: $CRITICAL_COUNT"
else
    print_test "Critical Cases List" "FAIL"
fi
echo ""

# TEST 11: Get User Notifications
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 11: User Notifications${NC}"
NOTIF_RESPONSE=$(api_call GET "/api/notifications/user/$USER_ID")

NOTIF_COUNT=$(echo "$NOTIF_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ -n "$NOTIF_COUNT" ]; then
    print_test "User Notifications" "PASS"
    echo "   Notifications: $NOTIF_COUNT"
else
    print_test "User Notifications" "FAIL"
fi
echo ""

# TEST 12: Get Notification Statistics
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TEST 12: Notification Statistics${NC}"
NOTIF_STATS_RESPONSE=$(api_call GET "/api/notifications/statistics")

if echo "$NOTIF_STATS_RESPONSE" | grep -q '"total"'; then
    print_test "Notification Statistics" "PASS"
else
    print_test "Notification Statistics" "FAIL"
fi
echo ""

# Final Summary
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                         TEST SUMMARY                                  ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "Total Tests:  ${CYAN}$TOTAL${NC}"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  🎉 ALL TESTS PASSED! 🎉                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Test User Details:${NC}"
    echo -e "  Email:   $USER_EMAIL"
    echo -e "  User ID: $USER_ID"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ⚠ SOME TESTS FAILED ⚠                             ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
