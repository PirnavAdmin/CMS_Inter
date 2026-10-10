using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Profiles;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;

Console.WriteLine("=================================================================");
Console.WriteLine("  EXAMINATION MODULE VERIFICATION TEST SUITE (PARTS A - F)      ");
Console.WriteLine("=================================================================");

Dapper.SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());
Dapper.SqlMapper.AddTypeHandler(new NullableTimeOnlyTypeHandler());

var services = new ServiceCollection();

string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;";
var serverVersion = new MySqlServerVersion(new Version(8, 0, 30));

services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connStr, serverVersion));

services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Warning));
services.AddMemoryCache();

services.AddAutoMapper(
    typeof(ExaminationMappingProfile));

services.AddScoped<IExaminationRepository, ExaminationRepository>();
services.AddScoped<INumberSeriesRepository, NumberSeriesRepository>();
services.AddScoped<INumberSeriesService, NumberSeriesService>();
services.AddScoped<IExaminationService, ExaminationService>();

var sp = services.BuildServiceProvider();
using var scope = sp.CreateScope();
var examService = scope.ServiceProvider.GetRequiredService<IExaminationService>();
var examRepo = scope.ServiceProvider.GetRequiredService<IExaminationRepository>();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

int passedTests = 0;
int totalTests = 5;

// ============================================================================
// TEST 1: PART A & B - ORDINARY DETAIL UPDATE PERSISTENCE (EXAM 162, SCHED 447)
// ============================================================================
Console.WriteLine("\n[TEST 1] Ordinary examination update persistence on diagnostic Exam 162...");
try
{
    var beforeExam = await examService.GetExaminationByIdAsync(162);
    if (beforeExam == null) throw new Exception("Exam 162 not found!");

    Console.WriteLine($"  Existing: Name='{beforeExam.ExamName}', Schedules={beforeExam.ScheduledSubjectsCount}, Status={beforeExam.Status}");

    var updateReq = new UpdateExaminationRequest
    {
        CampusId = beforeExam.CampusId,
        ExamName = "mains grand test - verification",
        Description = "Automated test description",
        BoardId = beforeExam.BoardId,
        AcademicYearId = beforeExam.AcademicYearId,
        AcademicLevelId = beforeExam.AcademicLevelId,
        GroupId = beforeExam.GroupId,
        ProgramId = beforeExam.ProgramId,
        AssessmentTypeId = beforeExam.AssessmentTypeId,
        StartDate = beforeExam.StartDate,
        EndDate = beforeExam.EndDate,
        ExamPattern = beforeExam.ExamPattern,
        Status = beforeExam.Status
    };

    var putResult = await examService.UpdateExaminationAsync(162, updateReq);
    if (putResult == null) throw new Exception("PUT returned null!");

    // Verify PUT response fields
    bool nameUpdated = putResult.ExamName == "mains grand test - verification";
    bool descUpdated = putResult.Description == "Automated test description";
    bool schedPreserved = putResult.Schedules.Any(s => s.ExamScheduleId == 447);
    bool pidsPopulated = putResult.ProgramIds.Contains(1);
    bool gidsPopulated = putResult.GroupIds.Contains(37);
    bool subsPopulated = putResult.SelectedSubjectIds.Contains(11);

    // Verify subsequent GET
    var freshGet = await examService.GetExaminationByIdAsync(162);
    bool getMatches = freshGet != null && freshGet.ExamName == putResult.ExamName && freshGet.Description == putResult.Description;

    Console.WriteLine($"  PUT Name Updated: {nameUpdated} ('{putResult.ExamName}')");
    Console.WriteLine($"  PUT Description Updated: {descUpdated}");
    Console.WriteLine($"  Schedule 447 Preserved: {schedPreserved}");
    Console.WriteLine($"  ProgramIds Populated: {pidsPopulated} ([{string.Join(",", putResult.ProgramIds)}])");
    Console.WriteLine($"  GroupIds Populated: {gidsPopulated} ([{string.Join(",", putResult.GroupIds)}])");
    Console.WriteLine($"  SelectedSubjectIds Populated: {subsPopulated} ([{string.Join(",", putResult.SelectedSubjectIds)}])");
    Console.WriteLine($"  Subsequent GET matches PUT: {getMatches}");

    // Revert back
    updateReq.ExamName = "mains grand test";
    updateReq.Description = "";
    await examService.UpdateExaminationAsync(162, updateReq);

    if (nameUpdated && descUpdated && schedPreserved && pidsPopulated && gidsPopulated && subsPopulated && getMatches)
    {
        Console.WriteLine(">>> TEST 1 PASSED!");
        passedTests++;
    }
    else
    {
        Console.WriteLine(">>> TEST 1 FAILED!");
    }
}
catch (Exception ex)
{
    Console.WriteLine(">>> TEST 1 FAILED with exception: " + ex.Message);
}

// ============================================================================
// TEST 2: PART B - CONDITIONAL RESCHEDULING ON PERIOD CHANGE
// ============================================================================
Console.WriteLine("\n[TEST 2] Conditional rescheduling support on period change...");
try
{
    var before = await examService.GetExaminationByIdAsync(162);
    var newPeriodStart = new DateOnly(2027, 1, 5);
    var newPeriodEnd = new DateOnly(2027, 1, 5);

    var updateReq = new UpdateExaminationRequest
    {
        CampusId = before!.CampusId,
        ExamName = before.ExamName,
        Description = before.Description,
        BoardId = before.BoardId,
        AcademicYearId = before.AcademicYearId,
        AcademicLevelId = before.AcademicLevelId,
        GroupId = before.GroupId,
        ProgramId = before.ProgramId,
        AssessmentTypeId = before.AssessmentTypeId,
        StartDate = newPeriodStart,
        EndDate = newPeriodEnd,
        ExamPattern = before.ExamPattern,
        Status = before.Status
    };

    var result = await examService.UpdateExaminationAsync(162, updateReq);
    if (result == null) throw new Exception("Period update returned null!");

    bool datesUpdated = result.StartDate == newPeriodStart && result.EndDate == newPeriodEnd;
    bool schedulePreserved = result.Schedules.Any(s => s.ExamScheduleId == 447);
    bool flaggedRescheduling = result.RequiresRescheduling;
    bool outOfRangeCount = result.OutOfRangeScheduleCount == 1;
    bool schedHasWarning = result.Schedules.Any(s => s.ExamScheduleId == 447 && s.IsOutOfRange);

    Console.WriteLine($"  Dates Updated Successfully: {datesUpdated} ({result.StartDate} to {result.EndDate})");
    Console.WriteLine($"  Schedule 447 Preserved (NOT deleted): {schedulePreserved}");
    Console.WriteLine($"  RequiresRescheduling Flag: {flaggedRescheduling}");
    Console.WriteLine($"  OutOfRangeScheduleCount: {result.OutOfRangeScheduleCount}");
    Console.WriteLine($"  Rescheduling Diagnostic Message: '{result.ReschedulingMessage}'");
    Console.WriteLine($"  Schedule 447 OutOfRange Warning: {schedHasWarning}");

    // Revert dates back to 2026-12-30
    updateReq.StartDate = new DateOnly(2026, 12, 30);
    updateReq.EndDate = new DateOnly(2026, 12, 30);
    await examService.UpdateExaminationAsync(162, updateReq);

    if (datesUpdated && schedulePreserved && flaggedRescheduling && outOfRangeCount && schedHasWarning)
    {
        Console.WriteLine(">>> TEST 2 PASSED!");
        passedTests++;
    }
    else
    {
        Console.WriteLine(">>> TEST 2 FAILED!");
    }
}
catch (Exception ex)
{
    Console.WriteLine(">>> TEST 2 FAILED with exception: " + ex.Message);
}

// ============================================================================
// TEST 3: PART C - IN-PLACE SCHEDULE UPDATE & EXCLUDING SELF CONFLICT
// ============================================================================
Console.WriteLine("\n[TEST 3] In-place schedule update and self-exclusion conflict validation...");
try
{
    var beforeSched = await examService.GetExamScheduleByIdAsync(447);
    if (beforeSched == null) throw new Exception("Schedule 447 not found!");

    Console.WriteLine($"  Schedule 447 Initial: Date={beforeSched.ExamDate}, Time={beforeSched.StartTime}-{beforeSched.EndTime}, Hall='{beforeSched.Hall}'");

    var schedUpdate = new UpdateExamScheduleRequest
    {
        CampusId = 1,
        SubjectId = beforeSched.SubjectId,
        ExamDate = beforeSched.ExamDate,
        StartTime = new TimeOnly(10, 0, 0),
        EndTime = new TimeOnly(13, 0, 0),
        Hall = beforeSched.Hall,
        InvigilatorId = beforeSched.InvigilatorId,
        Invigilator = beforeSched.Invigilator,
        RoomId = beforeSched.RoomId,
        ExamMode = beforeSched.ExamMode,
        MaxMarks = beforeSched.MaxMarks,
        PassingMarks = beforeSched.PassingMarks
    };

    var updatedResult = await examService.UpdateExamScheduleAsync(447, schedUpdate);
    if (updatedResult == null) throw new Exception("Schedule update returned null!");

    bool idPreserved = updatedResult.ExamScheduleId == 447;
    bool timeUpdated = updatedResult.StartTime == new TimeOnly(10, 0, 0) && updatedResult.EndTime == new TimeOnly(13, 0, 0);

    // Verify DB count hasn't increased (no duplicate rows)
    var allScheds = await examService.GetExamSchedulesAsync(162);
    bool noDuplicates = allScheds.Count() == 1;

    Console.WriteLine($"  ExamScheduleId Preserved: {idPreserved} (ID: {updatedResult.ExamScheduleId})");
    Console.WriteLine($"  Time Updated In Place: {timeUpdated} ({updatedResult.StartTime} - {updatedResult.EndTime})");
    Console.WriteLine($"  No Duplicate Rows: {noDuplicates} (Count: {allScheds.Count()})");

    // Revert timing back
    schedUpdate.StartTime = new TimeOnly(9, 0, 0);
    schedUpdate.EndTime = new TimeOnly(12, 0, 0);
    await examService.UpdateExamScheduleAsync(447, schedUpdate);

    if (idPreserved && timeUpdated && noDuplicates)
    {
        Console.WriteLine(">>> TEST 3 PASSED!");
        passedTests++;
    }
    else
    {
        Console.WriteLine(">>> TEST 3 FAILED!");
    }
}
catch (Exception ex)
{
    Console.WriteLine(">>> TEST 3 FAILED with exception: " + ex.Message);
}

// ============================================================================
// TEST 4: PART D - AUTHORITATIVE STATUS TRANSITIONS IN IST
// ============================================================================
Console.WriteLine("\n[TEST 4] Authoritative dynamic status lifecycle in IST timezone...");
try
{
    var istNow = ExaminationStatusHelper.GetIstNow();
    Console.WriteLine($"  Current IST Now: {istNow:yyyy-MM-dd HH:mm:ss}");

    // Case A: Future examination schedule -> SCHEDULED
    var futureDate = DateOnly.FromDateTime(istNow.AddDays(10));
    var futureSchedules = new List<ExamSchedule>
    {
        new ExamSchedule { ExamDate = futureDate, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0), IsActive = true }
    };
    var statusA = ExaminationStatusHelper.CalculateAuthoritativeStatus("SCHEDULED", futureDate, futureDate, futureSchedules, istNow);
    bool checkA = statusA == "SCHEDULED";
    Console.WriteLine($"  Future session status: '{statusA}' (Expected: 'SCHEDULED') -> {checkA}");

    // Case B: Ongoing session happening right now -> ONGOING
    var todayDate = DateOnly.FromDateTime(istNow);
    var ongoingSchedules = new List<ExamSchedule>
    {
        new ExamSchedule { ExamDate = todayDate, StartTime = TimeOnly.FromDateTime(istNow.AddMinutes(-30)), EndTime = TimeOnly.FromDateTime(istNow.AddMinutes(30)), IsActive = true }
    };
    var statusB = ExaminationStatusHelper.CalculateAuthoritativeStatus("SCHEDULED", todayDate, todayDate, ongoingSchedules, istNow);
    bool checkB = statusB == "ONGOING";
    Console.WriteLine($"  Active session status: '{statusB}' (Expected: 'ONGOING') -> {checkB}");

    // Case C: Past sessions concluded -> COMPLETED
    var pastDate = DateOnly.FromDateTime(istNow.AddDays(-2));
    var pastSchedules = new List<ExamSchedule>
    {
        new ExamSchedule { ExamDate = pastDate, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0), IsActive = true }
    };
    var statusC = ExaminationStatusHelper.CalculateAuthoritativeStatus("SCHEDULED", pastDate, pastDate, pastSchedules, istNow);
    bool checkC = statusC == "COMPLETED";
    Console.WriteLine($"  Concluded sessions status: '{statusC}' (Expected: 'COMPLETED') -> {checkC}");

    // Case D: Explicitly CANCELLED exam -> CANCELLED preserved
    var statusD = ExaminationStatusHelper.CalculateAuthoritativeStatus("CANCELLED", pastDate, pastDate, pastSchedules, istNow);
    bool checkD = statusD == "CANCELLED";
    Console.WriteLine($"  Cancelled exam status: '{statusD}' (Expected: 'CANCELLED') -> {checkD}");

    // Case E: Unfinalized DRAFT exam -> DRAFT preserved
    var statusE = ExaminationStatusHelper.CalculateAuthoritativeStatus("DRAFT", futureDate, futureDate, null, istNow);
    bool checkE = statusE == "DRAFT";
    Console.WriteLine($"  Draft exam status: '{statusE}' (Expected: 'DRAFT') -> {checkE}");

    if (checkA && checkB && checkC && checkD && checkE)
    {
        Console.WriteLine(">>> TEST 4 PASSED!");
        passedTests++;
    }
    else
    {
        Console.WriteLine(">>> TEST 4 FAILED!");
    }
}
catch (Exception ex)
{
    Console.WriteLine(">>> TEST 4 FAILED with exception: " + ex.Message);
}

// ============================================================================
// TEST 5: PART C - CONFLICT PREVENTION FOR CONCURRENT BOOKINGS
// ============================================================================
Console.WriteLine("\n[TEST 5] Conflict prevention for overlapping hall/room bookings...");
try
{
    // Exam 162 has schedule 447 on 2026-12-30 in hall C-105 from 09:00 to 12:00.
    // Check if another schedule at 10:00 to 11:00 in hall C-105 on the same day detects conflict
    var conflictDate = new DateOnly(2026, 12, 30);
    var conflictStart = new TimeOnly(10, 0, 0);
    var conflictEnd = new TimeOnly(11, 0, 0);

    // Without excludeScheduleId (representing a new schedule being created)
    bool hasConflict = await examRepo.HasRoomConflictAsync(conflictDate, conflictStart, conflictEnd, "C-105");
    Console.WriteLine($"  Overlapping booking detected as conflict: {hasConflict} (Expected: True)");

    // With excludeScheduleId = 447 (representing schedule 447 editing itself)
    bool selfConflict = await examRepo.HasRoomConflictAsync(conflictDate, conflictStart, conflictEnd, "C-105", excludeScheduleId: 447);
    Console.WriteLine($"  Self-edit excluded from conflict: {!selfConflict} (Expected: True / false conflict)");

    // Non-overlapping time slot on same day in same hall: 13:00 to 16:00
    bool nonOverlapConflict = await examRepo.HasRoomConflictAsync(conflictDate, new TimeOnly(13, 0, 0), new TimeOnly(16, 0, 0), "C-105");
    Console.WriteLine($"  Non-overlapping time slot has no conflict: {!nonOverlapConflict} (Expected: True / false conflict)");

    if (hasConflict && !selfConflict && !nonOverlapConflict)
    {
        Console.WriteLine(">>> TEST 5 PASSED!");
        passedTests++;
    }
    else
    {
        Console.WriteLine(">>> TEST 5 FAILED!");
    }
}
catch (Exception ex)
{
    Console.WriteLine(">>> TEST 5 FAILED with exception: " + ex.Message);
}

// ============================================================================
// SUMMARY
// ============================================================================
Console.WriteLine("\n=================================================================");
Console.WriteLine($"  VERIFICATION RESULTS: {passedTests}/{totalTests} TESTS PASSED");
Console.WriteLine("=================================================================");
