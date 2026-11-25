using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Assignment;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AssignmentRepository : IAssignmentRepository
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        private IDbConnection Connection =>
            _context.Database.GetDbConnection();

        public AssignmentRepository(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return 1;
        }

        private int ResolveCampusId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CampusId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("campusId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            if (_httpContextAccessor?.HttpContext?.Request.Headers.TryGetValue("X-Campus-Id", out var h) == true &&
                int.TryParse(h.FirstOrDefault(), out int hid) && hid > 0) return hid;
            return 0;
        }

        // =========================================================
        // GET ALL ASSIGNMENTS
        // Faculty + Admin assignments
        // =========================================================

        public async Task<IEnumerable<Assignment>> GetAllAsync()
        {
            var result = await Connection.QueryAsync<Assignment>(
                "sp_GetAllAssignments",
                new
                {
                    p_CollegeId = ResolveCollegeId(),
                    p_CampusId = ResolveCampusId()
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // GET ASSIGNMENT BY ID
        // =========================================================

        public async Task<Assignment?> GetByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<Assignment>(
                "sp_GetAssignmentById",
                new
                {
                    p_AssignmentId = id
                },
                commandType: CommandType.StoredProcedure);
        }


        // =========================================================
        // PUBLISH ASSIGNMENT
        // =========================================================

        public async Task<bool> PublishAssignmentAsync(int assignmentId)
        {
            var result = await Connection.QueryFirstOrDefaultAsync<Assignment>(
                "sp_PublishAssignment",
                new
                {
                    p_AssignmentId = assignmentId
                },
                commandType: CommandType.StoredProcedure);

            return result != null && result.AssignmentId > 0;
        }


        // =========================================================
        // GET PUBLISHED ASSIGNMENTS
        // =========================================================

        public async Task<IEnumerable<Assignment>> GetPublishedAssignmentsAsync()
        {
            var result = await Connection.QueryAsync<Assignment>(
                "sp_GetPublishedAssignments",
                new
                {
                    p_CollegeId = ResolveCollegeId(),
                    p_CampusId = ResolveCampusId()
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // CREATE FACULTY ASSIGNMENT
        // =========================================================

        public async Task AddAsync(Assignment assignment)
        {
            int collegeId = ResolveCollegeId();
            int campusId = ResolveCampusId();

            var result = await Connection.QueryFirstOrDefaultAsync<Assignment>(
                "sp_CreateAssignment",
                new
                {
                    p_Title = assignment.Title,
                    p_AcademicYearId = assignment.AcademicYearId,
                    p_AcademicLevel = assignment.AcademicLevel,
                    p_GroupId = assignment.GroupId,
                    p_SubjectId = assignment.SubjectId,
                    p_FacultyId = assignment.FacultyId,
                    p_Description = assignment.Description,
                    p_StartDate = assignment.StartDate,
                    p_DueDate = assignment.DueDate,
                    p_Attachment = assignment.Attachment,
                    p_MaximumMarks = assignment.MaximumMarks,
                    p_CollegeId = collegeId,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);

            if (result != null)
            {
                assignment.AssignmentId = result.AssignmentId;
                assignment.AcademicYearName = result.AcademicYearName;
                assignment.GroupName = result.GroupName;
                assignment.SubjectName = result.SubjectName;
                assignment.FacultyName = result.FacultyName;
                assignment.CreatedByType = result.CreatedByType;
            }
        }


        // =========================================================
        // UPDATE FACULTY ASSIGNMENT
        // =========================================================

        public async Task UpdateAsync(Assignment assignment)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateAssignment",
                new
                {
                    p_AssignmentId = assignment.AssignmentId,
                    p_Title = assignment.Title,
                    p_AcademicYearId = assignment.AcademicYearId,
                    p_AcademicLevel = assignment.AcademicLevel,
                    p_GroupId = assignment.GroupId,
                    p_SubjectId = assignment.SubjectId,
                    p_FacultyId = assignment.FacultyId,
                    p_Description = assignment.Description,
                    p_StartDate = assignment.StartDate,
                    p_DueDate = assignment.DueDate,
                    p_Attachment = assignment.Attachment,
                    p_MaximumMarks = assignment.MaximumMarks
                },
                commandType: CommandType.StoredProcedure);
        }


        // =========================================================
        // DELETE ASSIGNMENT
        // =========================================================

        public async Task DeleteAsync(Assignment assignment)
        {
            await Connection.ExecuteAsync(
                "sp_DeleteAssignment",
                new
                {
                    p_AssignmentId = assignment.AssignmentId
                },
                commandType: CommandType.StoredProcedure);
        }


        // =========================================================
        // CREATE ADMIN ASSIGNMENT
        // =========================================================

        public async Task<Assignment?> CreateAdminAssignmentAsync(
            Assignment assignment)
        {
            int collegeId = ResolveCollegeId();
            int campusId = ResolveCampusId();

            var result = await Connection.QueryFirstOrDefaultAsync<Assignment>(
                "sp_CreateAdminAssignment",
                new
                {
                    p_Title = assignment.Title,
                    p_AcademicYearId = assignment.AcademicYearId,
                    p_AcademicLevel = assignment.AcademicLevel,
                    p_GroupId = assignment.GroupId,
                    p_SubjectId = assignment.SubjectId,
                    p_Description = assignment.Description,
                    p_StartDate = assignment.StartDate,
                    p_DueDate = assignment.DueDate,
                    p_Attachment = assignment.Attachment,
                    p_MaximumMarks = assignment.MaximumMarks,
                    p_CollegeId = collegeId,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);

            return result;
        }


        // =========================================================
        // GET ADMIN ASSIGNMENTS
        // =========================================================

        public async Task<IEnumerable<Assignment>> GetAdminAssignmentsAsync()
        {
            var result = await Connection.QueryAsync<Assignment>(
                "sp_GetAdminAssignments",
                new
                {
                    p_CollegeId = ResolveCollegeId(),
                    p_CampusId = ResolveCampusId()
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // GET SUBJECTS BY GROUP
        // =========================================================

        public async Task<IEnumerable<SubjectDropdownDto>>
            GetSubjectsByGroupAsync(int groupId)
        {
            return await _context.Subjects
                .Where(x => x.GroupId == groupId)
                .Select(x => new SubjectDropdownDto
                {
                    SubjectId = x.SubjectId,
                    SubjectName = x.SubjectName
                })
                .ToListAsync();
        }


        // =========================================================
        // GET FACULTY BY SUBJECT
        // =========================================================

        public async Task<IEnumerable<FacultyDropdownDto>>
            GetFacultyBySubjectAsync(
                int subjectId,
                int groupId,
                int academicYearId,
                string academicLevel)
        {
            return await
            (
                from allocation in _context.FacultySubjectAllocations
                join faculty in _context.Faculties
                    on allocation.FacultyId equals faculty.Id
                where allocation.SubjectId == subjectId
                select new FacultyDropdownDto
                {
                    Id = faculty.Id,
                    FullName = faculty.FirstName + " " + faculty.LastName
                }
            ).ToListAsync();
        }
    }
}
