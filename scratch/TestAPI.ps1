$body = @{ boardId = 1; academicYearId = 9 } | ConvertTo-Json
$headers = @{ "X-Campus-Id" = "12"; "Content-Type" = "application/json" }
$response = Invoke-RestMethod -Uri "http://localhost:5167/api/v1/student-admissions/generate-number" -Method Post -Headers $headers -Body $body
Write-Output $response.admissionNumber
