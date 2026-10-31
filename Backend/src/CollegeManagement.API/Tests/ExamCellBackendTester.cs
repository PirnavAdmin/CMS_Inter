using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Examination;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class ExamCellBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("          EXAMINATION CELL & MANAGEMENT DEEP OPTIMIZATION TEST SUITE");
            Console.WriteLine("================================================================================\n");

            int passed = 0;
            int failed = 0;

            void AssertTrue(bool condition, string testName, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"  [PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] {testName} - {details ?? "Assertion failed"}");
                    failed++;
                }
            }

            using var scope = serviceProvider.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var connectionString = config.GetConnectionString("DefaultConnection") 
                ?? "Server=localhost;Port=3306;Database=u819242402_CLM_System;User=root;Password=;";

            // 1. Deploy Stored Procedures
            Console.WriteLine("--- PHASE 1: DATABASE STORED PROCEDURES DEPLOYMENT ---");
            bool deployed = await ExamCellModuleDbDeployer.DeployProceduresAsync(connectionString);
            AssertTrue(deployed, "Deploy all 12 Examination Cell MySQL Stored Procedures & ExaminationSettings table");

            var examRepo = scope.ServiceProvider.GetRequiredService<IExaminationRepository>();
            var examService = scope.ServiceProvider.GetRequiredService<IExaminationService>();

            Console.WriteLine("\n--- PHASE 2: EXAMINATION SETTINGS LIFECYCLE TESTS ---");
            // Test 2.1: Get Default Settings
            var settings = await examService.GetExaminationSettingsAsync(1);
            AssertTrue(settings != null, "GetExaminationSettingsAsync returns non-null DTO");
            AssertTrue(settings!.CampusId == 1, "Settings CampusId matches requested campus");
            AssertTrue(settings.MinimumPassingPercentage > 0, "Settings MinimumPassingPercentage populated");

            // Test 2.2: Save Settings
            var updatedSettings = new ExaminationSettingsDto
            {
                CampusId = 1,
                MinimumPassingPercentage = 40.00m,
                MaximumGraceMarksLimit = 6,
                GradeScaleStandard = "10-Point CGPA (UGC / AICTE Standard)",
                ReEvaluationWindowDays = 20,
                EnableDoubleEvaluation = true,
                AllowNegativeMarking = false,
                MinAttendancePercent = 75.00m,
                CondonationThreshold = 65.00m,
                IncludePrincipalSign = true,
                AutoLockSeatingHours = 48,
                AllowManualHallTicketRelease = true,
                SmsAlertsOnPublish = true,
                EmailMarksheetCopy = true,
                RestrictResultsForFeeDue = false,
                AutoArchivePastExams = true
            };
            var saveResult = await examService.SaveExaminationSettingsAsync(1, updatedSettings);
            AssertTrue(saveResult != null, "SaveExaminationSettingsAsync returns non-null DTO");
            AssertTrue(saveResult!.MinimumPassingPercentage == 40.00m, "Saved MinimumPassingPercentage persisted as 40.00");
            AssertTrue(saveResult.MaximumGraceMarksLimit == 6, "Saved MaximumGraceMarksLimit persisted as 6");
            AssertTrue(saveResult.EnableDoubleEvaluation == true, "Saved EnableDoubleEvaluation persisted as true");

            // Test 2.3: Re-read Settings from DB
            var rereadSettings = await examService.GetExaminationSettingsAsync(1);
            AssertTrue(rereadSettings != null && rereadSettings.ReEvaluationWindowDays == 20, "Re-read persisted ReEvaluationWindowDays is 20");

            Console.WriteLine("\n--- PHASE 3: EXAMINATION SUBJECTS JUNCTION VIA STORED PROCEDURES ---");
            using var db = new MySqlConnection(connectionString);
            await db.OpenAsync();

            int testExamId = await db.ExecuteScalarAsync<int>("SELECT ExamId FROM `Examinations` WHERE `IsActive` = 1 LIMIT 1;");
            if (testExamId <= 0)
            {
                var createdExam = await examRepo.CreateExaminationAsync(new Examination
                {
                    ExamName = "Test Verification Exam",
                    BoardId = 1,
                    AcademicYearId = 1,
                    AcademicLevelId = 1,
                    GroupId = 1,
                    AssessmentTypeId = 1,
                    StartDate = DateOnly.FromDateTime(DateTime.Today),
                    EndDate = DateOnly.FromDateTime(DateTime.Today.AddDays(5)),
                    TotalMarks = 100,
                    PassPercentage = 35,
                    Status = "Draft",
                    CampusId = 1,
                    IsActive = true
                });
                testExamId = createdExam.ExaminationId;
            }

            var subjectIdsInDb = (await db.QueryAsync<int>("SELECT SubjectId FROM `Subjects` WHERE `IsActive` = 1 LIMIT 3;")).ToList();
            if (!subjectIdsInDb.Any()) subjectIdsInDb = new List<int> { 1, 2 };

            await examRepo.SaveExaminationSubjectsAsync(testExamId, subjectIdsInDb);
            var retrievedSubjectIds = await examRepo.GetExaminationSubjectIdsAsync(testExamId);
            AssertTrue(retrievedSubjectIds != null && retrievedSubjectIds.Count >= subjectIdsInDb.Count, 
                "SaveExaminationSubjectsAsync & GetExaminationSubjectIdsAsync successfully roundtrip subject IDs",
                $"Count: {retrievedSubjectIds?.Count}");

            Console.WriteLine("\n--- PHASE 4: INVIGILATOR BATCH ASSIGNMENTS & RESOLUTION ---");
            int testScheduleId = await db.ExecuteScalarAsync<int>("SELECT ScheduleId FROM `ExamSchedules` WHERE `IsActive` = 1 LIMIT 1;");
            if (testScheduleId <= 0)
            {
                var createdSch = await examRepo.CreateExamScheduleAsync(new ExamSchedule
                {
                    ExaminationId = testExamId,
                    SubjectId = subjectIdsInDb.FirstOrDefault(),
                    ExamDate = DateOnly.FromDateTime(DateTime.Today.AddDays(2)),
                    StartTime = new TimeOnly(9, 30),
                    EndTime = new TimeOnly(12, 30),
                    ScheduleMode = "SUBJECT_WISE",
                    Hall = "Hall-A",
                    CampusId = 1,
                    IsActive = true
                });
                testScheduleId = createdSch.ExamScheduleId;
            }

            var staffIds = (await db.QueryAsync<int>("SELECT Id FROM `Staff` WHERE `IsDeleted` = 0 LIMIT 2;")).ToList();
            int staff1 = staffIds.Count > 0 ? staffIds[0] : 1;
            int staff2 = staffIds.Count > 1 ? staffIds[1] : staff1;

            var assignments = new List<(int invigilatorId, string hallNumber)>
            {
                (staff1, "Hall-101"),
                (staff2, "Hall-102")
            };
            await examRepo.AssignInvigilatorHallsAsync(testScheduleId, assignments);

            // Test 4.2: Retrieve Invigilators via sp_GetInvigilatorsBySchedule (Fixed joins Staff & Users)
            var proctors = (await examRepo.GetInvigilatorsByScheduleIdAsync(testScheduleId)).ToList();
            AssertTrue(proctors.Count >= 1, "sp_GetInvigilatorsBySchedule returns assigned proctors batch", $"Count: {proctors.Count}");
            if (proctors.Any())
            {
                AssertTrue(!string.IsNullOrWhiteSpace(proctors[0].InvigilatorName), "Proctor name resolved successfully from Staff table");
            }

            Console.WriteLine("\n--- PHASE 5: ATOMIC SEQUENCE GENERATION VIA STORED PROCEDURE ---");
            // Test 5.1: Generate Exam Code
            string code1 = await examRepo.GenerateUniqueExamCodeAsync(1, 1, 1, null);
            string code2 = await examRepo.GenerateUniqueExamCodeAsync(1, 1, 1, null);
            AssertTrue(!string.IsNullOrWhiteSpace(code1) && code1.StartsWith("EXAM-"), "Exam code 1 generated with standard prefix: " + code1);
            AssertTrue(!string.IsNullOrWhiteSpace(code2) && code2.StartsWith("EXAM-"), "Exam code 2 generated with standard prefix: " + code2);

            Console.WriteLine("\n--- PHASE 6: CAPACITY & COLLISION FILTERING VIA STORED PROCEDURES ---");
            // Test 6.1: sp_GetAvailableHallsFiltered
            var halls = (await examRepo.GetAvailableHallsFilteredAsync(
                DateOnly.FromDateTime(DateTime.Today.AddDays(7)),
                new TimeOnly(9, 30),
                new TimeOnly(12, 30),
                requiredCapacity: 20)).ToList();
            AssertTrue(halls != null, "sp_GetAvailableHallsFiltered executed successfully");

            // Test 6.2: sp_GetAvailableInvigilatorsFiltered
            var faculty = (await examRepo.GetAvailableInvigilatorsFilteredAsync(
                DateOnly.FromDateTime(DateTime.Today.AddDays(7)),
                new TimeOnly(9, 30),
                new TimeOnly(12, 30),
                subjectIds: new List<int> { 1, 2 })).ToList();
            AssertTrue(faculty != null, "sp_GetAvailableInvigilatorsFiltered executed successfully");

            Console.WriteLine("\n--- PHASE 7: FACULTY EXAM DUTIES VIA STORED PROCEDURE ---");
            // Test 7.1: sp_GetFacultyExamDuties
            var duties = (await examService.GetFacultyExamDutiesAsync(null, null, 1, null, null)).ToList();
            AssertTrue(duties != null, "sp_GetFacultyExamDuties executed successfully, total duties returned: " + duties.Count);

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"  EXAMINATION CELL MODULE TEST RESULTS: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
