using System.Data;
using Dapper;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AssignmentSubmissionRepository
        : IAssignmentSubmissionRepository
    {
        private readonly AppDbContext _context;

        public AssignmentSubmissionRepository(
            AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection =>
            _context.Database.GetDbConnection();

        public async Task<AssignmentSubmission?> CreateAsync(
            AssignmentSubmission submission)
        {
            return await Connection.QueryFirstOrDefaultAsync<AssignmentSubmission>(
                "sp_CreateAssignmentSubmission",
                new
                {
                    p_AssignmentId = submission.AssignmentId,
                    p_StudentId = submission.StudentId,
                    p_RollNo = submission.RollNo,
                    p_GroupId = submission.GroupId,
                    p_SectionId = submission.SectionId,
                    p_SubjectId = submission.SubjectId,
                    p_Title = submission.Title,
                    p_FileUrl = submission.FileUrl,
                    p_Description = submission.Description,
                    p_SubmissionStatus = submission.SubmissionStatus
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<List<AssignmentSubmission>>
            GetByAssignmentAsync(int assignmentId)
        {
            var result =
                await Connection.QueryAsync<AssignmentSubmission>(
                    "sp_GetAssignmentSubmissions",
                    new
                    {
                        p_AssignmentId = assignmentId
                    },
                    commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<AssignmentSubmission>>
            GetByStudentAsync(int studentId)
        {
            var result =
                await Connection.QueryAsync<AssignmentSubmission>(
                    "sp_GetStudentAssignmentSubmissions",
                    new
                    {
                        p_StudentId = studentId
                    },
                    commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<AssignmentSubmission?>
            GetByIdAsync(int submissionId)
        {
            return await Connection.QueryFirstOrDefaultAsync<AssignmentSubmission>(
                "sp_GetAssignmentSubmissionById",
                new
                {
                    p_SubmissionId = submissionId
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}