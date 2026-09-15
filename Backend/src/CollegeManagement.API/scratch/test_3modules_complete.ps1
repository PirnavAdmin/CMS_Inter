$baseUrl = "http://localhost:5000"

Write-Host "`n=== TESTING 3 CORE MODULES ENHANCEMENTS ===" -ForegroundColor Cyan

function Test-Endpoint ($name, $url, $method = "GET", $body = $null) {
    Write-Host "`n[$method] $name -> $url" -ForegroundColor Yellow
    try {
        $params = @{
            Uri = $url
            Method = $method
            ContentType = "application/json"
            TimeoutSec = 10
        }
        if ($body) {
            $params["Body"] = ($body | ConvertTo-Json -Depth 10)
        }
        $response = Invoke-RestMethod @params
        Write-Host "SUCCESS!" -ForegroundColor Green
        $jsonStr = $response | ConvertTo-Json -Depth 4
        if ($jsonStr.Length -gt 500) {
            Write-Host ($jsonStr.Substring(0, 500) + "...") -ForegroundColor Gray
        } else {
            Write-Host $jsonStr -ForegroundColor Gray
        }
        return $response
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor DarkRed
        }
        return $null
    }
}

# 1. Examination Module
Test-Endpoint "Patterns Dropdown" "$baseUrl/api/v1/examinations/patterns"
Test-Endpoint "Assessment Types Dropdown" "$baseUrl/api/v1/examinations/types"
Test-Endpoint "Examinations List" "$baseUrl/api/v1/examinations"
Test-Endpoint "Scheduling Context (New API)" "$baseUrl/api/v1/examinations/15/scheduling-context"
Test-Endpoint "Available Halls (Enhanced)" "$baseUrl/api/v1/examinations/available-halls?date=2026-09-01&startTime=09:00:00&endTime=12:00:00&requiredCapacity=20"
Test-Endpoint "Available Invigilators (Enhanced)" "$baseUrl/api/v1/examinations/available-invigilators?date=2026-09-01&startTime=09:00:00&endTime=12:00:00&subjectId=1"

# 2. Marks Evaluation Module
Test-Endpoint "Evaluation Readiness (New API)" "$baseUrl/api/v1/evaluations/readiness?examinationId=16"
Test-Endpoint "Faculty Evaluations List (New API)" "$baseUrl/api/v1/faculty/evaluations"

# 3. Results Management Module
Test-Endpoint "Results Readiness (New API)" "$baseUrl/api/v1/results/readiness?examId=16"
$genBody = @{
    BoardId = 1
    AcademicYearId = 1
    AcademicLevelId = 1
    GroupId = 1
    ExamId = 16
}
Test-Endpoint "Generate Results (Transactional)" "$baseUrl/api/v1/results/generate" "POST" $genBody
Test-Endpoint "Publish Section Results (Internal Validation)" "$baseUrl/api/v1/results/sections/23/publish?examId=16" "POST"
$pubGroupBody = @{
    GroupId = 1
    ExamId = 16
}
Test-Endpoint "Publish Group Results (Atomic Group Publish)" "$baseUrl/api/v1/results/publish-group" "POST" $pubGroupBody

# 4. Student Self-Service Portal
Test-Endpoint "Student Self Results (New API)" "$baseUrl/api/v1/students/me/results?studentId=1"
Test-Endpoint "Student Marks Memo (New API)" "$baseUrl/api/v1/students/me/results/16/memo?studentId=1"

Write-Host "`n=== ALL TESTS COMPLETED ===" -ForegroundColor Cyan
