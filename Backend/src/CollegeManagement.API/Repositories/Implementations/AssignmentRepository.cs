using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

using Dapper;
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

        private IDbConnection Connection =>
            _context.Database.GetDbConnection();

        public AssignmentRepository(AppDbContext context)
        {
            _context = context;
        }


        // =========================================================
        // GET ALL ASSIGNMENTS
        // Faculty + Admin assignments
        // =========================================================

        public async Task<IEnumerable<Assignment>> GetAllAsync()
        {
            var result = await Connection.QueryAsync<Assignment>(
                "sp_GetAllAssignments",
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
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // CREATE FACULTY ASSIGNMENT
        // =========================================================

        public async Task AddAsync(Assignment assignment)
        {
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
                    p_MaximumMarks = assignment.MaximumMarks
                },
                commandType: CommandType.StoredProcedure);

            // Copy returned database values back into the object
            // so that the service can return the created assignment.
            if (result != null)
            {
                assignment.AssignmentId = result.AssignmentId;

                assignment.AcademicYearName =
                    result.AcademicYearName;

                assignment.GroupName =
                    result.GroupName;

                assignment.SubjectName =
                    result.SubjectName;

                assignment.FacultyName =
                    result.FacultyName;

                assignment.CreatedByType =
                    result.CreatedByType;
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
                    p_MaximumMarks = assignment.MaximumMarks
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

                    FullName =
                        faculty.FirstName + " " +
                        faculty.LastName
                }

            ).ToListAsync();
        }
    }
}