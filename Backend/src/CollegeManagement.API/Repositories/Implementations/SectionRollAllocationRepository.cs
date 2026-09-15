using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class SectionRollAllocationRepository
        : ISectionRollAllocationRepository
    {
        private readonly AppDbContext _context;

        public SectionRollAllocationRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection =>
            _context.Database.GetDbConnection();


        // =========================================================
        // SECTION ALLOCATION PREVIEW
        // =========================================================

        public async Task<SectionAllocationPreviewResponse>
            PreviewSectionAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            // -----------------------------------------------------
            // 1. Get students in admission order
            // -----------------------------------------------------

            const string studentSql = @"
                SELECT
                    s.StudentId,
                    s.AdmissionNo,
                    s.StudentName,
                    s.AdmissionDate,
                    s.SectionId
                FROM `Students` s
                WHERE
                    s.AcademicYearId = @AcademicYearId
                    AND s.AcademicLevelId = @AcademicLevelId
                    AND s.GroupId = @GroupId
                    AND s.ProgramId = @ProgramId
                    AND (s.IsActive = 1 OR s.IsActive IS NULL)
                ORDER BY
                    s.AdmissionDate ASC,
                    s.StudentId ASC;";


            var students =
                (await Connection.QueryAsync<dynamic>(
                    studentSql,
                    new
                    {
                        request.AcademicYearId,
                        request.AcademicLevelId,
                        request.GroupId,
                        request.ProgramId
                    })).ToList();


            // -----------------------------------------------------
            // 2. Get existing active sections
            // -----------------------------------------------------

            const string sectionSql = @"
                SELECT
                    s.SectionId,
                    s.SectionName,
                    s.MaximumStrength,
                    s.IsActive
                FROM `Sections` s
                WHERE
                    s.AcademicYearId = @AcademicYearId
                    AND s.AcademicLevelId = @AcademicLevelId
                    AND s.GroupId = @GroupId
                    AND s.ProgramId = @ProgramId
                    AND s.IsActive = 1
                ORDER BY
                    s.SectionName ASC;";


            var sections =
                (await Connection.QueryAsync<dynamic>(
                    sectionSql,
                    new
                    {
                        request.AcademicYearId,
                        request.AcademicLevelId,
                        request.GroupId,
                        request.ProgramId
                    })).ToList();


            // -----------------------------------------------------
            // 3. No sections check
            // -----------------------------------------------------

            var unallocatedStudents = students
                .Where(s => s.SectionId == null)
                .ToList();


            if (unallocatedStudents.Count > 0 &&
                sections.Count == 0)
            {
                throw new InvalidOperationException(
                    "No active sections are available for this Group and Program.");
            }


            // -----------------------------------------------------
            // 4. Calculate current strength
            // -----------------------------------------------------

            var sectionStatus = sections
                .Select(s => new
                {
                    SectionId = (int)s.SectionId,
                    SectionName = (string)s.SectionName,
                    MaximumStrength = (int)s.MaximumStrength,

                    CurrentStrength = students.Count(
                        st => st.SectionId != null &&
                              (int)st.SectionId == (int)s.SectionId)
                })
                .ToList();


            // -----------------------------------------------------
            // 5. Admission-order based allocation
            // -----------------------------------------------------

            var preview =
                new List<SectionAllocationPreviewStudentDto>();


            foreach (var student in unallocatedStudents)
            {
                var targetSection = sectionStatus
                    .FirstOrDefault(s =>
                        s.CurrentStrength <
                        s.MaximumStrength);


                if (targetSection == null)
                {
                    throw new InvalidOperationException(
                        "Section capacity is not sufficient for all students.");
                }


                preview.Add(
                    new SectionAllocationPreviewStudentDto
                    {
                        StudentId = (int)student.StudentId,

                        AdmissionNo =
                            student.AdmissionNo?.ToString(),

                        StudentName =
                            student.StudentName?.ToString(),

                        AdmissionDate =
                            (DateTime)student.AdmissionDate,

                        SectionId =
                            targetSection.SectionId,

                        SectionName =
                            targetSection.SectionName,

                        ExistingSectionId = null,

                        ExistingSectionName = null
                    });


                // Increase temporary capacity count
                var index =
                    sectionStatus.IndexOf(targetSection);


                sectionStatus[index] = new
                {
                    targetSection.SectionId,
                    targetSection.SectionName,
                    targetSection.MaximumStrength,

                    CurrentStrength =
                        targetSection.CurrentStrength + 1
                };
            }


            // -----------------------------------------------------
            // 6. Response
            // -----------------------------------------------------

            return new SectionAllocationPreviewResponse
            {
                TotalStudents =
                    students.Count,

                StudentsToAllocate =
                    unallocatedStudents.Count,

                TotalCapacity =
                    sections.Sum(
                        s => (int)s.MaximumStrength),

                Students =
                    preview
            };
        }


        // =========================================================
        // CONFIRM SECTION ALLOCATION
        // =========================================================

        public async Task<int>
            ConfirmSectionAllocationAsync(
                ConfirmSectionAllocationRequest request)
        {
            var filter =
                new SectionRollAllocationFilterRequest
                {
                    AcademicYearId =
                        request.AcademicYearId,

                    AcademicLevelId =
                        request.AcademicLevelId,

                    GroupId =
                        request.GroupId,

                    ProgramId =
                        request.ProgramId
                };


            // Generate the same allocation
            var preview =
                await PreviewSectionAllocationAsync(
                    filter);


            if (preview.Students.Count == 0)
                return 0;


            // -----------------------------------------------------
            // Update only students which are still unallocated
            // -----------------------------------------------------

            const string updateSql = @"
                UPDATE `Students`
                SET
                    SectionId = @SectionId
                WHERE
                    StudentId = @StudentId
                    AND SectionId IS NULL;";


            var count = 0;


            foreach (var allocation in preview.Students)
            {
                var affected =
                    await Connection.ExecuteAsync(
                        updateSql,
                        new
                        {
                            allocation.StudentId,
                            allocation.SectionId
                        });


                count += affected;
            }


            return count;
        }


        // =========================================================
        // ROLL NUMBER PREVIEW
        // =========================================================

        public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            // -----------------------------------------------------
            // Get allocated students
            // -----------------------------------------------------

            const string sql = @"
                SELECT
                    s.StudentId,
                    s.AdmissionNo,
                    s.StudentName,
                    s.SectionId,
                    sec.SectionName,
                    s.RollNo
                FROM `Students` s
                INNER JOIN `Sections` sec
                    ON sec.SectionId = s.SectionId
                WHERE
                    s.AcademicYearId = @AcademicYearId
                    AND s.AcademicLevelId = @AcademicLevelId
                    AND s.GroupId = @GroupId
                    AND s.ProgramId = @ProgramId
                    AND s.SectionId IS NOT NULL
                    AND (s.IsActive = 1 OR s.IsActive IS NULL)
                ORDER BY
                    sec.SectionName ASC,
                    s.StudentName ASC,
                    s.StudentId ASC;";


            var students =
                (await Connection.QueryAsync<dynamic>(
                    sql,
                    new
                    {
                        request.AcademicYearId,
                        request.AcademicLevelId,
                        request.GroupId,
                        request.ProgramId
                    })).ToList();


            // -----------------------------------------------------
            // Only students without RollNo
            // -----------------------------------------------------

            var unallocatedRollStudents =
                students
                    .Where(s =>
                        string.IsNullOrWhiteSpace(
                            s.RollNo?.ToString()))
                    .ToList();


            // -----------------------------------------------------
            // Roll number allocation
            //
            // Section A → 1...
            // Section B → continue...
            // Section C → continue...
            // -----------------------------------------------------

            var result =
                new List<RollNumberPreviewStudentDto>();


            var rollNumber = 1;


            var sections =
                unallocatedRollStudents
                    .GroupBy(s => new
                    {
                        SectionId = (int)s.SectionId,
                        SectionName =
                            s.SectionName?.ToString() ?? ""
                    })
                    .OrderBy(g => g.Key.SectionName)
                    .ToList();


            foreach (var section in sections)
            {
                // Alphabetical inside section
                var sectionStudents =
                    section
                        .OrderBy(s =>
                            s.StudentName?.ToString())
                        .ThenBy(s =>
                            (int)s.StudentId)
                        .ToList();


                foreach (var student in sectionStudents)
                {
                    result.Add(
                        new RollNumberPreviewStudentDto
                        {
                            StudentId =
                                (int)student.StudentId,

                            AdmissionNo =
                                student.AdmissionNo?.ToString(),

                            StudentName =
                                student.StudentName?.ToString(),

                            SectionId =
                                (int)student.SectionId,

                            SectionName =
                                student.SectionName?.ToString()
                                ?? "",

                            RollNo =
                                rollNumber.ToString()
                        });


                    rollNumber++;
                }
            }


            return new RollNumberAllocationPreviewResponse
            {
                TotalStudents =
                    students.Count,

                StudentsToAllocate =
                    result.Count,

                Students =
                    result
            };
        }


        // =========================================================
        // CONFIRM ROLL NUMBER ALLOCATION
        // =========================================================

        public async Task<int>
            ConfirmRollNumberAllocationAsync(
                ConfirmRollNumberAllocationRequest request)
        {
            var filter =
                new SectionRollAllocationFilterRequest
                {
                    AcademicYearId =
                        request.AcademicYearId,

                    AcademicLevelId =
                        request.AcademicLevelId,

                    GroupId =
                        request.GroupId,

                    ProgramId =
                        request.ProgramId
                };


            var preview =
                await PreviewRollNumberAllocationAsync(
                    filter);


            if (preview.Students.Count == 0)
                return 0;


            const string updateSql = @"
                UPDATE `Students`
                SET
                    RollNo = @RollNo
                WHERE
                    StudentId = @StudentId
                    AND (RollNo IS NULL OR TRIM(RollNo) = '');";


            var count = 0;


            foreach (var allocation in preview.Students)
            {
                var affected =
                    await Connection.ExecuteAsync(
                        updateSql,
                        new
                        {
                            allocation.StudentId,
                            allocation.RollNo
                        });


                count += affected;
            }


            return count;
        }


        // =========================================================
        // IMPORTANT
        //
        // Your existing GetStudentsForAllocationAsync()
        // implementation should remain here.
        //
        // DO NOT delete your already-working GET STUDENTS method.
        // =========================================================
        // =========================================================
        // UPDATE STUDENT ALLOCATION
        // =========================================================

        public async Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request)
        {
            // ---------------------------------------------------------
            // 1. Get student
            // ---------------------------------------------------------

            const string studentSql = @"
        SELECT
            StudentId,
            AcademicYearId,
            AcademicLevelId,
            GroupId,
            ProgramId,
            SectionId,
            RollNo
        FROM `Students`
        WHERE StudentId = @StudentId
          AND (IsActive = 1 OR IsActive IS NULL)
        LIMIT 1;";

            var student =
                await Connection.QueryFirstOrDefaultAsync<dynamic>(
                    studentSql,
                    new
                    {
                        StudentId = studentId
                    });

            if (student == null)
                throw new KeyNotFoundException(
                    "Student not found.");


            // ---------------------------------------------------------
            // 2. Validate academic allocation
            // ---------------------------------------------------------

            if (student.AcademicYearId == null ||
                student.AcademicLevelId == null ||
                student.GroupId == null)
            {
                throw new ArgumentException(
                    "Student academic allocation is incomplete.");
            }


            var academicYearId =
                (int)student.AcademicYearId;

            var academicLevelId =
                (int)student.AcademicLevelId;

            var currentGroupId =
                (int)student.GroupId;

            var targetGroupId =
                request.GroupId ?? currentGroupId;


            // ---------------------------------------------------------
            // 3. Validate selected section
            // ---------------------------------------------------------

            const string sectionSql = @"
        SELECT
            SectionId,
            SectionName,
            AcademicYearId,
            AcademicLevelId,
            GroupId,
            ProgramId,
            MaximumStrength,
            IsActive
        FROM `Sections`
        WHERE SectionId = @SectionId
          AND IsActive = 1
        LIMIT 1;";

            var section =
                await Connection.QueryFirstOrDefaultAsync<dynamic>(
                    sectionSql,
                    new
                    {
                        request.SectionId
                    });

            if (section == null)
                throw new ArgumentException(
                    "Selected section not found or inactive.");


            // ---------------------------------------------------------
            // 4. Section must match student's academic details
            // ---------------------------------------------------------

            if ((int)section.AcademicYearId != academicYearId ||
                (int)section.AcademicLevelId != academicLevelId ||
                (int)section.GroupId != targetGroupId ||
                (int)section.ProgramId != request.ProgramId)
            {
                throw new ArgumentException(
                    "Selected section does not match the student's academic year, level, group and program.");
            }


            // ---------------------------------------------------------
            // 5. Check section capacity
            // ---------------------------------------------------------

            const string countSql = @"
        SELECT COUNT(*)
        FROM `Students`
        WHERE SectionId = @SectionId
          AND StudentId <> @StudentId
          AND (IsActive = 1 OR IsActive IS NULL);";

            var occupied =
                await Connection.ExecuteScalarAsync<int>(
                    countSql,
                    new
                    {
                        SectionId = request.SectionId,
                        StudentId = studentId
                    });

            var currentSectionId =
                student.SectionId == null
                    ? (int?)null
                    : (int)student.SectionId;

            if (occupied >= (int)section.MaximumStrength &&
                currentSectionId != request.SectionId)
            {
                throw new InvalidOperationException(
                    "The selected section has reached its maximum strength.");
            }


            // ---------------------------------------------------------
            // 6. Detect Group / Program change
            // ---------------------------------------------------------

            var programChanged =
                (student.ProgramId == null
                    ? (int?)null
                    : (int)student.ProgramId) != request.ProgramId
                ||
                currentGroupId != targetGroupId;


            // ---------------------------------------------------------
            // 7. Determine Roll Number
            // ---------------------------------------------------------

            string? desiredRoll =
                string.IsNullOrWhiteSpace(request.RollNo)
                    ? null
                    : request.RollNo.Trim();

            // Group or Program changed:
            // automatically continue from target Group + Program.
            if (programChanged)
            {
                desiredRoll =
                    (
                        await NextRollNo(
                            academicYearId,
                            academicLevelId,
                            targetGroupId,
                            request.ProgramId)
                    ).ToString();
            }

            // If Group/Program did not change and RollNo
            // was not supplied, preserve existing RollNo.
            if (string.IsNullOrWhiteSpace(desiredRoll))
            {
                desiredRoll =
                    student.RollNo?.ToString();
            }


            // ---------------------------------------------------------
            // 8. Duplicate Roll Number validation
            // ---------------------------------------------------------

            if (!string.IsNullOrWhiteSpace(desiredRoll))
            {
                const string duplicateSql = @"
            SELECT COUNT(*)
            FROM `Students`
            WHERE StudentId <> @StudentId
              AND AcademicYearId = @AcademicYearId
              AND AcademicLevelId = @AcademicLevelId
              AND GroupId = @GroupId
              AND ProgramId = @ProgramId
              AND RollNo = @RollNo
              AND (IsActive = 1 OR IsActive IS NULL);";

                var duplicateCount =
                    await Connection.ExecuteScalarAsync<int>(
                        duplicateSql,
                        new
                        {
                            StudentId = studentId,
                            AcademicYearId = academicYearId,
                            AcademicLevelId = academicLevelId,
                            GroupId = targetGroupId,
                            ProgramId = request.ProgramId,
                            RollNo = desiredRoll
                        });

                if (duplicateCount > 0)
                {
                    throw new InvalidOperationException(
                        "That roll number is already assigned in this academic year, level, group and program.");
                }
            }


            // ---------------------------------------------------------
            // 9. Update Student
            // ---------------------------------------------------------

            const string updateSql = @"
        UPDATE `Students`
        SET
            GroupId = @GroupId,
            ProgramId = @ProgramId,
            SectionId = @SectionId,
            RollNo = @RollNo,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentId = @StudentId;";

            await Connection.ExecuteAsync(
                updateSql,
                new
                {
                    StudentId = studentId,
                    GroupId = targetGroupId,
                    ProgramId = request.ProgramId,
                    SectionId = request.SectionId,
                    RollNo = desiredRoll
                });


            // ---------------------------------------------------------
            // 10. Response
            // ---------------------------------------------------------

            return new
            {
                message = "Allocation updated successfully.",
                studentId = studentId,
                sectionId = request.SectionId,
                sectionName = (string)section.SectionName,
                groupId = targetGroupId,
                programId = request.ProgramId,
                rollNo = desiredRoll
            };
        }


        // =========================================================
        // GET NEXT ROLL NUMBER
        // =========================================================

        private async Task<int>
            NextRollNo(
                int academicYearId,
                int academicLevelId,
                int groupId,
                int programId)
        {
            const string sql = @"
        SELECT RollNo
        FROM `Students`
        WHERE AcademicYearId = @AcademicYearId
          AND AcademicLevelId = @AcademicLevelId
          AND GroupId = @GroupId
          AND ProgramId = @ProgramId
          AND RollNo IS NOT NULL
          AND TRIM(RollNo) <> '';";

            var rolls =
                await Connection.QueryAsync<string>(
                    sql,
                    new
                    {
                        AcademicYearId = academicYearId,
                        AcademicLevelId = academicLevelId,
                        GroupId = groupId,
                        ProgramId = programId
                    });

            var maxRoll =
                rolls
                    .Select(x =>
                        int.TryParse(
                            x,
                            out var value)
                            ? value
                            : 0)
                    .DefaultIfEmpty(0)
                    .Max();

            return maxRoll + 1;
        }
    }
}