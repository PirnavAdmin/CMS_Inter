$baseUrl = "http://localhost:5000"

try {
    $exams = Invoke-RestMethod -Uri "$baseUrl/api/v1/examinations" -Method GET
    Write-Host "Found $($exams.Count) examinations in DB:" -ForegroundColor Cyan
    foreach ($e in $exams) {
        Write-Host "  ExamId=$($e.examinationId), Name=$($e.examName), BoardId=$($e.boardId), AcademicYearId=$($e.academicYearId), LevelId=$($e.academicLevelId), GroupId=$($e.groupId), AssessTypeId=$($e.assessmentTypeId)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
