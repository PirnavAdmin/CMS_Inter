$baseUrl = "http://localhost:5167/api/v1/hostel"
$headers = @{ "Content-Type" = "application/json" }
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            TimeoutSec = 10
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }
        $response = Invoke-RestMethod @params
        $success = $response.success -eq $true -or $response.Status -eq $true -or $response -ne $null
        $result = [PSCustomObject]@{
            Test = $Name
            Method = $Method
            Url = $Url.Replace("http://localhost:5167", "")
            Status = if ($success) { "PASS" } else { "FAIL" }
            Details = "Success: $($response.success), Message: $($response.message)"
        }
        $script:testResults += $result
        return $response
    }
    catch {
        $script:testResults += [PSCustomObject]@{
            Test = $Name
            Method = $Method
            Url = $Url.Replace("http://localhost:5167", "")
            Status = "FAIL"
            Details = $_.Exception.Message
        }
        return $null
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "     RUNNING HOSTEL API END-TO-END TESTS " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. DASHBOARD
Write-Host "`n--- Testing Dashboard APIs ---" -ForegroundColor Yellow
$dash = Test-Endpoint -Name "Get Hostel Dashboard" -Method "Get" -Url "$baseUrl/dashboard"

# 2. HOSTEL BLOCKS
Write-Host "`n--- Testing Hostel Block APIs ---" -ForegroundColor Yellow
$blocks = Test-Endpoint -Name "Get All Hostel Blocks" -Method "Get" -Url "$baseUrl/blocks"

$randomCode = "TST-" + (Get-Random -Minimum 1000 -Maximum 9999)
$newBlockBody = @{
    hostelName = "Test Boys Residence"
    hostelCode = $randomCode
    hostelType = "Boys"
    totalFloors = 3
    primaryMobileNumber = "+91 9876543210"
    status = "Active"
    address = "Campus North Zone"
}
$createBlockRes = Test-Endpoint -Name "Create Hostel Block" -Method "Post" -Url "$baseUrl/blocks" -Body $newBlockBody
$createdBlockId = $createBlockRes.data.hostelId
if (-not $createdBlockId) { $createdBlockId = $createBlockRes.data }

if ($createdBlockId) {
    Test-Endpoint -Name "Get Hostel Block By ID" -Method "Get" -Url "$baseUrl/blocks/$createdBlockId"
    $updateBlockBody = @{
        hostelName = "Test Boys Residence Updated"
        hostelCode = $randomCode
        hostelType = "Boys"
        totalFloors = 4
        status = "Active"
        address = "Campus North Zone Updated"
    }
    Test-Endpoint -Name "Update Hostel Block" -Method "Put" -Url "$baseUrl/blocks/$createdBlockId" -Body $updateBlockBody
}

# 3. ROOM CATEGORIES
Write-Host "`n--- Testing Room Category APIs ---" -ForegroundColor Yellow
$roomTypes = Test-Endpoint -Name "Get All Room Types" -Method "Get" -Url "$baseUrl/room-types"

$newCategoryBody = @{
    roomTypeSpecification = "Test 3-Sharing Deluxe AC $(Get-Random)"
    bedCapacity = 3
    acType = "AC"
    status = "Active"
    description = "Attached Bath, Wi-Fi, Balcony"
}
$createCatRes = Test-Endpoint -Name "Create Room Type" -Method "Post" -Url "$baseUrl/room-types" -Body $newCategoryBody
$createdRoomTypeId = $createCatRes.data.roomTypeId
if (-not $createdRoomTypeId) { $createdRoomTypeId = $createCatRes.data }

if ($createdRoomTypeId) {
    Test-Endpoint -Name "Get Room Type By ID" -Method "Get" -Url "$baseUrl/room-types/$createdRoomTypeId"
}

# 4. ROOMS & BEDS
Write-Host "`n--- Testing Room & Bed APIs ---" -ForegroundColor Yellow
$rooms = Test-Endpoint -Name "Get All Rooms" -Method "Get" -Url "$baseUrl/rooms"

# Pick or use block and roomType
$targetBlockId = if ($createdBlockId) { $createdBlockId } elseif ($blocks.data.Count -gt 0) { $blocks.data[0].hostelId } else { 1 }
$targetRoomTypeId = if ($createdRoomTypeId) { $createdRoomTypeId } elseif ($roomTypes.data.Count -gt 0) { $roomTypes.data[0].roomTypeId } else { 1 }

$newRoomBody = @{
    hostelId = $targetBlockId
    roomTypeId = $targetRoomTypeId
    floorLevel = "Floor 1"
    roomNumber = "T-" + (Get-Random -Minimum 100 -Maximum 999)
    status = "Active"
}
$createRoomRes = Test-Endpoint -Name "Create Room" -Method "Post" -Url "$baseUrl/rooms" -Body $newRoomBody
$createdRoomId = $createRoomRes.data.roomId
if (-not $createdRoomId) { $createdRoomId = $createRoomRes.data }

if ($createdRoomId) {
    Test-Endpoint -Name "Get Room By ID" -Method "Get" -Url "$baseUrl/rooms/$createdRoomId"
    
    # Create Bed in Room
    $newBedBody = @{
        roomId = $createdRoomId
        bedNumber = "BED-T1"
        bedStatus = "Available"
        status = "Active"
    }
    $createBedRes = Test-Endpoint -Name "Create Bed" -Method "Post" -Url "$baseUrl/beds" -Body $newBedBody
    $createdBedId = $createBedRes.data.bedId
    if (-not $createdBedId) { $createdBedId = $createBedRes.data }
    
    if ($createdBedId) {
        Test-Endpoint -Name "Get Bed By ID" -Method "Get" -Url "$baseUrl/beds/$createdBedId"
    }
}
$allBeds = Test-Endpoint -Name "Get All Beds" -Method "Get" -Url "$baseUrl/beds"

# 5. WARDEN ASSIGNMENTS
Write-Host "`n--- Testing Warden Assignment APIs ---" -ForegroundColor Yellow
$wardens = Test-Endpoint -Name "Get All Warden Assignments" -Method "Get" -Url "$baseUrl/wardens"

# 6. STUDENT ALLOCATIONS
Write-Host "`n--- Testing Student Allocation APIs ---" -ForegroundColor Yellow
$allocations = Test-Endpoint -Name "Get All Student Allocations" -Method "Get" -Url "$baseUrl/student-allocations"

# 7. ATTENDANCE
Write-Host "`n--- Testing Attendance APIs ---" -ForegroundColor Yellow
$attendance = Test-Endpoint -Name "Get All Attendance Records" -Method "Get" -Url "$baseUrl/attendance"

# 8. OUTPASS / LEAVE
Write-Host "`n--- Testing Outpass/Leave APIs ---" -ForegroundColor Yellow
$outpasses = Test-Endpoint -Name "Get All Outpass/Leave Requests" -Method "Get" -Url "$baseUrl/outpass-leave"

# 9. TRANSFER / VACATE
Write-Host "`n--- Testing Transfer/Vacate APIs ---" -ForegroundColor Yellow
$transfers = Test-Endpoint -Name "Get All Transfer/Vacate Requests" -Method "Get" -Url "$baseUrl/transfer-vacate"

# 10. REPORTS
Write-Host "`n--- Testing Reports APIs ---" -ForegroundColor Yellow
Test-Endpoint -Name "Get Occupancy Report" -Method "Get" -Url "$baseUrl/reports/occupancy"
Test-Endpoint -Name "Get Student Report" -Method "Get" -Url "$baseUrl/reports/students"
Test-Endpoint -Name "Get Attendance Report" -Method "Get" -Url "$baseUrl/reports/attendance"
Test-Endpoint -Name "Get Outpass Report" -Method "Get" -Url "$baseUrl/reports/outpass-leave"
Test-Endpoint -Name "Get Transfer/Vacate Report" -Method "Get" -Url "$baseUrl/reports/transfer-vacate"

# SUMMARY TABLE
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "             TEST RESULTS SUMMARY         " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
$testResults | Format-Table -Property Test, Method, Status, Details -AutoSize

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "`nTotal: $($testResults.Count) | Passed: $passed | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
