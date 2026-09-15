$baseUrl = "http://localhost:5000"

function Check-Get ($endpoint) {
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/$endpoint" -Method GET
        Write-Host "[$endpoint] -> Count: $($res.Count)" -ForegroundColor Green
        if ($res.Count -gt 0) {
            Write-Host ($res | Select-Object -First 3 | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        }
    } catch {
        Write-Host "[$endpoint] -> Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Check-Get "api/v1/boards"
Check-Get "api/v1/academicyears"
Check-Get "api/v1/groups"
Check-Get "api/v1/academiclevels"
Check-Get "api/v1/examinations/types"
