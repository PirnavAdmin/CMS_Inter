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

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private async Task<IDbConnection> GetOpenConnectionAsync()
        {
            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                if (conn is System.Data.Common.DbConnection dbConn)
                    await dbConn.OpenAsync();
                else
                    conn.Open();
            }
            return conn;
        }

        // =========================================================
        // SECTION ALLOCATION PREVIEW
        // =========================================================

        public async Task<SectionAllocationPreviewResponse>
            PreviewSectionAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            var conn = await GetOpenConnectionAsync();

            using var grid = await conn.QueryMultipleAsync(
                "sp_GetStudentsAndSectionsForAllocation",
                new
                {
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_CampusId = request.CampusId
                },
                commandType: CommandType.StoredProcedure);

            var students = (await grid.ReadAsync<dynamic>()).ToList();
            var sections = (await grid.ReadAsync<dynamic>()).ToList();

            var unallocatedStudents = students
                .Where(s => s.SectionId == null)
                .ToList();

            if (unallocatedStudents.Count > 0 && sections.Count == 0)
            {
                throw new InvalidOperationException(
                    "No active sections are available for this Group and Program.");
            }

            var sectionStatus = sections
                .Select(s => new
                {
                    SectionId = (int)s.SectionId,
                    SectionName = (string)s.SectionName,
                    MaximumStrength = (int)s.MaximumStrength,
                    CurrentStrength = s.CurrentStrength != null ? Convert.ToInt32(s.CurrentStrength) : 0
                })
                .ToList();

            var preview = new List<SectionAllocationPreviewStudentDto>();

            foreach (var student in unallocatedStudents)
            {
                var targetSection = sectionStatus
                    .FirstOrDefault(s => s.CurrentStrength < s.MaximumStrength);

                if (targetSection == null)
                {
                    throw new InvalidOperationException(
                        "Section capacity is not sufficient for all students.");
                }

                preview.Add(
                    new SectionAllocationPreviewStudentDto
                    {
                        StudentId = (int)student.StudentId,
                        AdmissionNo = student.AdmissionNo?.ToString(),
                        StudentName = student.StudentName?.ToString(),
                        AdmissionDate = (DateTime)student.AdmissionDate,
                        SectionId = targetSection.SectionId,
                        SectionName = targetSection.SectionName,
                        ExistingSectionId = null,
                        ExistingSectionName = null
                    });

                var index = sectionStatus.IndexOf(targetSection);
                sectionStatus[index] = new
                {
                    targetSection.SectionId,
                    targetSection.SectionName,
                    targetSection.MaximumStrength,
                    CurrentStrength = targetSection.CurrentStrength + 1
                };
            }

            return new SectionAllocationPreviewResponse
            {
                TotalStudents = students.Count,
                StudentsToAllocate = unallocatedStudents.Count,
                TotalCapacity = sections.Sum(s => (int)s.MaximumStrength),
                Students = preview
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
                    AcademicYearId = request.AcademicYearId,
                    AcademicLevelId = request.AcademicLevelId,
                    GroupId = request.GroupId,
                    ProgramId = request.ProgramId,
                    CampusId = request.CampusId
                };

            var preview = await PreviewSectionAllocationAsync(filter);

            if (preview.Students.Count == 0)
                return 0;

            var conn = await GetOpenConnectionAsync();
            using var trans = conn.BeginTransaction();
            try
            {
                var count = 0;
                foreach (var allocation in preview.Students)
                {
                    var affected = await conn.ExecuteAsync(
                        "sp_ConfirmStudentSectionAllocation",
                        new
                        {
                            p_StudentId = allocation.StudentId,
                            p_SectionId = allocation.SectionId
                        },
                        transaction: trans,
                        commandType: CommandType.StoredProcedure);

                    count += affected;
                }

                trans.Commit();
                return count;
            }
            catch
            {
                trans.Rollback();
                throw;
            }
        }

        // =========================================================
        // ROLL NUMBER PREVIEW
        // =========================================================

        public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            var conn = await GetOpenConnectionAsync();

            var students = (await conn.QueryAsync<dynamic>(
                "sp_GetAllocatedStudentsForRollNumbering",
                new
                {
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_CampusId = request.CampusId
                },
                commandType: CommandType.StoredProcedure)).ToList();

            var unallocatedRollStudents = students
                .Where(s => string.IsNullOrWhiteSpace(s.RollNo?.ToString()))
                .ToList();

            var result = new List<RollNumberPreviewStudentDto>();
            var rollNumber = 1;

            var sections = unallocatedRollStudents
                .GroupBy(s => new
                {
                    SectionId = (int)s.SectionId,
                    SectionName = s.SectionName?.ToString() ?? ""
                })
                .OrderBy(g => g.Key.SectionName)
                .ToList();

            foreach (var section in sections)
            {
                var sectionStudents = section
                    .OrderBy(s => s.StudentName?.ToString())
                    .ThenBy(s => (int)s.StudentId)
                    .ToList();

                foreach (var student in sectionStudents)
                {
                    result.Add(
                        new RollNumberPreviewStudentDto
                        {
                            StudentId = (int)student.StudentId,
                            AdmissionNo = student.AdmissionNo?.ToString(),
                            StudentName = student.StudentName?.ToString(),
                            SectionId = (int)student.SectionId,
                            SectionName = student.SectionName?.ToString() ?? "",
                            RollNo = rollNumber.ToString()
                        });

                    rollNumber++;
                }
            }

            return new RollNumberAllocationPreviewResponse
            {
                TotalStudents = students.Count,
                StudentsToAllocate = result.Count,
                Students = result
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
                    AcademicYearId = request.AcademicYearId,
                    AcademicLevelId = request.AcademicLevelId,
                    GroupId = request.GroupId,
                    ProgramId = request.ProgramId,
                    CampusId = request.CampusId
                };

            var preview = await PreviewRollNumberAllocationAsync(filter);

            if (preview.Students.Count == 0)
                return 0;

            return await SaveRollNumberAllocationsAsync(preview.Students);
        }

        
        public async Task<int> SaveRollNumberAllocationsAsync(List<RollNumberPreviewStudentDto> allocations)
        {
            if (allocations == null || allocations.Count == 0) return 0;
            
            var conn = await GetOpenConnectionAsync();
            using var trans = conn.BeginTransaction();
            try
            {
                var count = 0;
                foreach (var allocation in allocations)
                {
                    var affected = await conn.ExecuteAsync(
                        "sp_ConfirmStudentRollNumberAllocation",
                        new
                        {
                            p_StudentId = allocation.StudentId,
                            p_RollNo = allocation.RollNo
                        },
                        transaction: trans,
                        commandType: CommandType.StoredProcedure);

                    count += affected;
                }

                trans.Commit();
                return count;
            }
            catch
            {
                trans.Rollback();
                throw;
            }
        }

        // =========================================================
        // UPDATE STUDENT ALLOCATION
        // =========================================================

        public async Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request)
        {
            var conn = await GetOpenConnectionAsync();

            var student = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetStudentById",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);

            if (student == null)
                throw new KeyNotFoundException("Student not found.");

            if (student.AcademicYearId == null ||
                student.AcademicLevelId == null ||
                student.GroupId == null)
            {
                throw new ArgumentException("Student academic allocation is incomplete.");
            }

            var academicYearId = (int)student.AcademicYearId;
            var academicLevelId = (int)student.AcademicLevelId;
            var currentGroupId = (int)student.GroupId;
            var targetGroupId = request.GroupId ?? currentGroupId;

            var section = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetSectionById",
                new { p_SectionId = request.SectionId },
                commandType: CommandType.StoredProcedure);

            if (section == null)
                throw new ArgumentException("Selected section not found or inactive.");

            if ((int)section.AcademicYearId != academicYearId ||
                (int)section.AcademicLevelId != academicLevelId ||
                (int)section.GroupId != targetGroupId ||
                (int)section.ProgramId != request.ProgramId)
            {
                throw new ArgumentException(
                    "Selected section does not match the student's academic year, level, group and program.");
            }

            var programChanged =
                (student.ProgramId == null ? (int?)null : (int)student.ProgramId) != request.ProgramId
                || currentGroupId != targetGroupId;

            string? desiredRoll = string.IsNullOrWhiteSpace(request.RollNo)
                ? null
                : request.RollNo.Trim();

            if (programChanged)
            {
                desiredRoll = (await NextRollNo(academicYearId, academicLevelId, targetGroupId)).ToString();
            }

            if (string.IsNullOrWhiteSpace(desiredRoll))
            {
                desiredRoll = student.RollNo?.ToString();
            }

            await Connection.ExecuteAsync(
                "sp_UpdateStudentSectionRollAllocation",
                new
                {
                    p_StudentId = studentId,
                    p_GroupId = targetGroupId,
                    p_ProgramId = request.ProgramId,
                    p_SectionId = request.SectionId,
                    p_RollNo = desiredRoll
                },
                commandType: CommandType.StoredProcedure);

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
                int groupId)
        {
            var conn = await GetOpenConnectionAsync();

            var rolls = await conn.QueryAsync<string>(
                "sp_GetMaxRollNumber",
                new
                {
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId
                },
                commandType: CommandType.StoredProcedure);

            var maxRoll = rolls
                .Select(x => int.TryParse(x, out var value) ? value : 0)
                .DefaultIfEmpty(0)
                .Max();

            return maxRoll + 1;
        }
    
        public async Task<(string Year, string Board, string BoardCode, string Level, string LevelCode, string Group, string GroupCode, string Program)> GetContextMetadataAsync(int? ayId, int? boardId, int? levelId, int? groupId, int? programId)
        {
            var conn = await GetOpenConnectionAsync();
            var row = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetAcademicContextMetadata",
                new
                {
                    p_AcademicYearId = ayId,
                    p_BoardId = boardId,
                    p_AcademicLevelId = levelId,
                    p_GroupId = groupId,
                    p_ProgramId = programId
                },
                commandType: CommandType.StoredProcedure);

            if (row == null)
                return ("", "", "", "", "", "", "", "");

            return (
                row.AcademicYearName?.ToString() ?? "",
                row.BoardName?.ToString() ?? "",
                row.BoardCode?.ToString() ?? "",
                row.LevelName?.ToString() ?? "",
                row.LevelCode?.ToString() ?? "",
                row.GroupName?.ToString() ?? "",
                row.GroupCode?.ToString() ?? "",
                row.ProgramName?.ToString() ?? ""
            );
        }
    }
}
