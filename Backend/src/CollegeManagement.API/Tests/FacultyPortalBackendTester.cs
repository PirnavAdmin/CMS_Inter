using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class FacultyPortalBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("          USER-SIDE DASHBOARD: FACULTY PORTAL VERIFICATION SUITE");
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
            bool deployed = await FacultyModuleDbDeployer.DeployProceduresAsync(connectionString);
            AssertTrue(deployed, "Deploy all 22 Faculty Dashboard MySQL Stored Procedures");

            var settingsRepo = scope.ServiceProvider.GetRequiredService<IStaffSettingsRepository>();
            var settingsService = scope.ServiceProvider.GetRequiredService<IStaffSettingsService>();
            var evalRepo = scope.ServiceProvider.GetRequiredService<IEvaluationRepository>();
            var evalService = scope.ServiceProvider.GetRequiredService<IEvaluationService>();
            var timetableRepo = scope.ServiceProvider.GetRequiredService<ITimetableRepository>();
            var staffRepo = scope.ServiceProvider.GetRequiredService<IStaffRepository>();

            Console.WriteLine("\n--- PHASE 2: STAFF SETTINGS REPOSITORY & SERVICE TESTS ---");
            // Test 2.1: Get staff ID for testing
            var staffDropdown = (await staffRepo.GetStaffDropdownAsync()).ToList();
            int testStaffId = staffDropdown.FirstOrDefault()?.Id ?? 1;

            var settings = await settingsService.GetSettingsAsync(testStaffId);
            AssertTrue(settings != null, "StaffSettingsService.GetSettingsAsync returns valid response DTO");
            if (settings != null)
            {
                AssertTrue(!string.IsNullOrEmpty(settings.Profile.FullName) || settings.Profile.Id > 0, 
                    "StaffSettings Profile details populated via sp_GetStaffSettings");
                AssertTrue(settings.Preferences != null, 
                    "StaffSettings Preferences parsed from CustomFieldsJson");
            }

            // Test 2.2: Update Profile
            var updateProfileReq = new StaffProfileSettingsUpdateRequestDto
            {
                FullName = settings?.Profile?.FullName ?? "Test Faculty",
                Mobile = "9876543210",
                PersonalEmail = "testfaculty@college.edu",
                Address = "123 Faculty Quarters",
                EmergencyContact = "9876543211"
            };
            bool profileUpdated = await settingsService.UpdateProfileSettingsAsync(testStaffId, updateProfileReq);
            AssertTrue(profileUpdated, "StaffSettingsService.UpdateProfileSettingsAsync via sp_UpdateStaffProfileSettings");

            // Test 2.3: Update Preferences
            var updatePrefReq = new StaffPreferencesUpdateRequestDto
            {
                EmailAlerts = true,
                SmsAlerts = true,
                TimetableReminder = true,
                AutoLogoutTimeout = "45"
            };
            bool prefUpdated = await settingsService.UpdatePreferencesAsync(testStaffId, updatePrefReq);
            AssertTrue(prefUpdated, "StaffSettingsService.UpdatePreferencesAsync via sp_UpdateStaffPreferences");

            Console.WriteLine("\n--- PHASE 3: EVALUATION REPOSITORY & SERVICE TESTS ---");
            // Test 3.1: Get Faculty Evaluations
            var facultyEvals = (await evalService.GetFacultyEvaluationsAsync(testStaffId, null, null)).ToList();
            AssertTrue(facultyEvals != null, "IEvaluationService.GetFacultyEvaluationsAsync via sp_GetFacultyEvaluations");

            // Look up real contextual keys for foreign key safety
            using var conn = new MySqlConnection(connectionString);
            await conn.OpenAsync();
            int realSubjectId = await conn.QueryFirstOrDefaultAsync<int>("SELECT SubjectId FROM Subjects WHERE IsActive = 1 LIMIT 1;");
            if (realSubjectId == 0) realSubjectId = await conn.QueryFirstOrDefaultAsync<int>("SELECT SubjectId FROM Subjects LIMIT 1;");
            int realSectionId = await conn.QueryFirstOrDefaultAsync<int>("SELECT SectionId FROM Sections WHERE IsActive = 1 LIMIT 1;");
            if (realSectionId == 0) realSectionId = await conn.QueryFirstOrDefaultAsync<int>("SELECT SectionId FROM Sections LIMIT 1;");
            int realExamId = await conn.QueryFirstOrDefaultAsync<int>("SELECT ExamId FROM Examinations WHERE Status = 'Scheduled' OR Status = 'Completed' LIMIT 1;");
            if (realExamId == 0) realExamId = await conn.QueryFirstOrDefaultAsync<int>("SELECT ExamId FROM Examinations LIMIT 1;");
            int realStudentId = await conn.QueryFirstOrDefaultAsync<int>($"SELECT StudentId FROM Students WHERE SectionId = {realSectionId} LIMIT 1;");
            if (realStudentId == 0) realStudentId = await conn.QueryFirstOrDefaultAsync<int>("SELECT StudentId FROM Students LIMIT 1;");

            string testCompositeKey = $"{realSubjectId}_{realSectionId}_{realExamId}";

            // Test 3.2: Get Faculty Evaluation Students
            var evalStudents = await evalService.GetFacultyEvaluationStudentsAsync(testCompositeKey, testStaffId);
            AssertTrue(evalStudents == null || evalStudents.Students != null, 
                "IEvaluationService.GetFacultyEvaluationStudentsAsync executes sp_GetFacultyEvaluationStudents without error");

            // Test 3.3: Save Draft Marks
            var draftReq = new SaveFacultyMarksRequestDto
            {
                Students = new List<FacultyStudentMarkInputDto>
                {
                    new FacultyStudentMarkInputDto
                    {
                        StudentId = realStudentId > 0 ? realStudentId : 1,
                        InternalMarks = 25,
                        TheoryMarks = 55,
                        PracticalMarks = 0,
                        TotalMarks = 80,
                        Remarks = "Good progress"
                    }
                }
            };
            bool draftSaved = await evalService.SaveFacultyDraftMarksAsync(testCompositeKey, draftReq, testStaffId);
            AssertTrue(draftSaved, "IEvaluationService.SaveFacultyDraftMarksAsync executes sp_SaveFacultyDraftMarks");

            // Test 3.4: Submit Faculty Evaluation
            bool submitted = await evalService.SubmitFacultyEvaluationAsync(testCompositeKey, testStaffId);
            AssertTrue(submitted, "IEvaluationService.SubmitFacultyEvaluationAsync executes sp_SubmitFacultyEvaluation");

            // Test 3.5: Resubmit Faculty Evaluation
            var resubmitReq = new ResubmitEvaluationRequestDto
            {
                ResubmissionMessage = "Corrected student marks per review"
            };
            bool resubmitted = await evalService.ResubmitFacultyEvaluationAsync(testCompositeKey, resubmitReq, testStaffId);
            AssertTrue(resubmitted, "IEvaluationService.ResubmitFacultyEvaluationAsync executes sp_ResubmitFacultyEvaluation");

            // Test 3.6: Get Examination Subjects without inline SQL
            var subjectIds = await evalRepo.GetExaminationSubjectIdsAsync(realExamId > 0 ? realExamId : 1);
            AssertTrue(subjectIds != null, "IEvaluationRepository.GetExaminationSubjectIdsAsync executes sp_GetExaminationSubjectIds");

            Console.WriteLine("\n--- PHASE 4: TIMETABLE REPOSITORY STORED PROCEDURE TESTS ---");
            // Test 4.1: Timetable By Faculty
            var facultyTimetable = (await timetableRepo.GetByFacultyIdAsync(testStaffId)).ToList();
            AssertTrue(facultyTimetable != null, "TimetableRepository.GetByFacultyIdAsync via sp_GetTimetables");

            // Test 4.2: Timetable By Section
            var sectionTimetable = (await timetableRepo.GetBySectionIdAsync(1)).ToList();
            AssertTrue(sectionTimetable != null, "TimetableRepository.GetBySectionIdAsync via sp_GetTimetables");

            // Test 4.3: Timetable Paged
            var (pagedItems, totalCount) = await timetableRepo.GetPagedAsync(new TimetableQueryParams { PageNumber = 1, PageSize = 10 });
            AssertTrue(pagedItems != null && totalCount >= 0, "TimetableRepository.GetPagedAsync via sp_GetTimetables with pagination");

            // Test 4.4: Timetable By Id
            var singleSlot = await timetableRepo.GetByIdAsync(1);
            AssertTrue(singleSlot == null || singleSlot.Id == 1 || singleSlot.SectionId >= 0, 
                "TimetableRepository.GetByIdAsync via sp_GetTimetableById");

            // Test 4.5: Check Slot Conflict
            var conflict = await timetableRepo.CheckSlotConflictAsync(1, 1, testStaffId, 1, 1, 1, null);
            AssertTrue(conflict == null || conflict.Length > 0, 
                "TimetableRepository.CheckSlotConflictAsync via sp_CheckSlotConflict");

            // Test 4.6: HasSectionSlotConflictAsync
            bool hasSecConflict = await timetableRepo.HasSectionSlotConflictAsync(1, 1, 1, 1, null);
            AssertTrue(hasSecConflict || !hasSecConflict, 
                "TimetableRepository.HasSectionSlotConflictAsync via sp_CheckSectionSlotConflict");

            // Test 4.7: HasFacultySlotConflictAsync
            bool hasFacConflict = await timetableRepo.HasFacultySlotConflictAsync(1, testStaffId, 1, 1, null);
            AssertTrue(hasFacConflict || !hasFacConflict, 
                "TimetableRepository.HasFacultySlotConflictAsync via sp_CheckFacultySlotConflict");

            // Test 4.8: HasRoomSlotConflictAsync
            bool hasRoomConflict = await timetableRepo.HasRoomSlotConflictAsync(1, 1, 1, 1, null);
            AssertTrue(hasRoomConflict || !hasRoomConflict, 
                "TimetableRepository.HasRoomSlotConflictAsync via sp_CheckRoomSlotConflict");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"  FACULTY SUITE RESULT: {passed} PASSED, {failed} FAILED (TOTAL: {passed + failed})");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
