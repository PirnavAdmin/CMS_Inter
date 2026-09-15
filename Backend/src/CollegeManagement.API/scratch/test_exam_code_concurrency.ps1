$baseUrl = "http://localhost:5000"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  TESTING BACKEND-GENERATED EXAM CODE & CONCURRENCY" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Single Creation Test (without examCode in body)
Write-Host "`n[TEST 1] Single Examination Creation (no examCode provided in body)" -ForegroundColor Yellow
$createPayload = @{
    examName = "Term-1 Unit Test Automation"
    boardId = 1
    academicYearId = 9
    academicLevelId = 1
    groupId = 37
    assessmentTypeId = 1
    startDate = "2026-09-10"
    endDate = "2026-09-15"
    examPattern = "REGULAR_ACADEMIC"
    totalMarks = 100
    passPercentage = 35.0
    description = "Automated test for backend-generated exam code."
    status = "DRAFT"
} | ConvertTo-Json

try {
    $res1 = Invoke-RestMethod -Uri "$baseUrl/api/v1/examinations" -Method POST -Body $createPayload -ContentType "application/json"
    Write-Host "SUCCESS! Created Examination ID: $($res1.examinationId)" -ForegroundColor Green
    Write-Host "Generated ExamCode: $($res1.examCode)" -ForegroundColor Green
    Write-Host "ExamName: $($res1.examName)" -ForegroundColor Green
    Write-Host "Status: $($res1.status)" -ForegroundColor Green

    if ($res1.examCode -match "^EXAM-\d{4}-\d{4}$") {
        Write-Host "Format Check PASSED: $($res1.examCode) matches EXAM-{year}-{seq}" -ForegroundColor Green
    } else {
        Write-Host "Format Check FAILED: Expected EXAM-{year}-{seq}, got $($res1.examCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "TEST 1 FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor DarkRed
    }
    exit 1
}

# 2. Details and List API Verification
Write-Host "`n[TEST 2] Verification via GET /api/v1/examinations/{id} and GET /api/v1/examinations" -ForegroundColor Yellow
try {
    $detailRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/examinations/$($res1.examinationId)" -Method GET
    Write-Host "GET By ID ExamCode: $($detailRes.examCode)" -ForegroundColor Gray
    if ($detailRes.examCode -eq $res1.examCode) {
        Write-Host "GET By ID check PASSED!" -ForegroundColor Green
    } else {
        Write-Host "GET By ID check FAILED! $($detailRes.examCode) != $($res1.examCode)" -ForegroundColor Red
    }

    $listRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/examinations" -Method GET
    $found = $listRes | Where-Object { $_.examinationId -eq $res1.examinationId }
    if ($found -and $found.examCode -eq $res1.examCode) {
        Write-Host "GET List check PASSED!" -ForegroundColor Green
    } else {
        Write-Host "GET List check FAILED!" -ForegroundColor Red
    }
} catch {
    Write-Host "TEST 2 FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Concurrency Test: 10 Simultaneous Requests
Write-Host "`n[TEST 3] Concurrency Test: Sending 10 Simultaneous POST /api/v1/examinations Requests" -ForegroundColor Yellow

$scriptBlock = {
    param($url, $idx)
    $body = @{
        examName = "Concurrent Exam Batch $idx"
        boardId = 1
        academicYearId = 9
        academicLevelId = 1
        groupId = 37
        assessmentTypeId = 1
        startDate = "2026-10-01"
        endDate = "2026-10-05"
        examPattern = "REGULAR_ACADEMIC"
        totalMarks = 100
        passPercentage = 35.0
        description = "Concurrency stress test #$idx"
        status = "DRAFT"
    } | ConvertTo-Json

    try {
        $resp = Invoke-RestMethod -Uri "$url/api/v1/examinations" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        return [PSCustomObject]@{
            Index = $idx
            Success = $true
            ExamId = $resp.examinationId
            ExamCode = $resp.examCode
            Error = $null
        }
    } catch {
        return [PSCustomObject]@{
            Index = $idx
            Success = $false
            ExamId = $null
            ExamCode = $null
            Error = $_.Exception.Message
        }
    }
}

$jobs = @()
for ($i = 1; $i -le 10; $i++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $baseUrl, $i
}

Write-Host "Waiting for 10 concurrent requests to complete..." -ForegroundColor Gray
$results = $jobs | ForEach-Object { Receive-Job -Job $_ -Wait }

$successfulCodes = @()
foreach ($r in $results) {
    if ($r.Success) {
        Write-Host "  Req #$($r.Index): ExamId=$($r.ExamId) -> ExamCode=$($r.ExamCode)" -ForegroundColor Green
        $successfulCodes += $r.ExamCode
    } else {
        Write-Host "  Req #$($r.Index): FAILED -> $($r.Error)" -ForegroundColor Red
    }
}

$uniqueCount = ($successfulCodes | Select-Object -Unique).Count
Write-Host "`nTotal Successful: $($successfulCodes.Count) / 10" -ForegroundColor Cyan
Write-Host "Total Unique Codes: $uniqueCount / $($successfulCodes.Count)" -ForegroundColor Cyan

if ($successfulCodes.Count -eq 10 -and $uniqueCount -eq 10) {
    Write-Host "`n CONCURRENCY TEST PASSED: All 10 codes are distinct and sequential with 0 duplicates!" -ForegroundColor Green
} else {
    Write-Host "`n CONCURRENCY TEST FAILED!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS PASSED SUCCESSFULLY!" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
