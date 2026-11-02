using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories
{
    public class StudentRepository : IStudentRepository
    {
        private readonly AppDbContext _context;

        public StudentRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        // =========================================================
        // GET ALL / PAGED STUDENTS (100% STORED PROCEDURE)
        // =========================================================

        public async Task<PagedResult<StudentListItemDto>> GetPagedAsync(
            string? search = null,
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? programId = null,
            int? sectionId = null,
            string? status = null,
            bool? isActive = null,
            int? campusId = null,
            int pageNumber = 1,
            int pageSize = 10)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 500) pageSize = 500;

            var connection = Connection;
            using var multi = await connection.QueryMultipleAsync(
                "sp_GetStudentsPaged",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId,
                    p_ProgramId = programId,
                    p_SectionId = sectionId,
                    p_Status = string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
                    p_IsActive = isActive,
                    p_CampusId = campusId,
                    p_PageNumber = pageNumber,
                    p_PageSize = pageSize
                },
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstAsync<int>();
            var items = (await multi.ReadAsync<StudentListItemDto>()).ToList();

            return new PagedResult<StudentListItemDto>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task<List<StudentListItemDto>> GetAllAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? programId = null,
            int? sectionId = null,
            string? status = null,
            int? campusId = null,
            string? search = null)
        {
            var connection = Connection;

            if (!boardId.HasValue && !academicYearId.HasValue && !academicLevelId.HasValue && 
                !groupId.HasValue && !programId.HasValue && !sectionId.HasValue && 
                string.IsNullOrWhiteSpace(status) && !campusId.HasValue && string.IsNullOrWhiteSpace(search))
            {
                var all = await connection.QueryAsync<StudentListItemDto>(
                    "sp_GetAllStudents",
                    commandType: CommandType.StoredProcedure);
                return all.ToList();
            }

            using var multi = await connection.QueryMultipleAsync(
                "sp_GetStudentsPaged",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId,
                    p_ProgramId = programId,
                    p_SectionId = sectionId,
                    p_Status = string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
                    p_IsActive = (bool?)null,
                    p_CampusId = campusId,
                    p_PageNumber = 1,
                    p_PageSize = 100000
                },
                commandType: CommandType.StoredProcedure);

            await multi.ReadFirstAsync<int>();
            return (await multi.ReadAsync<StudentListItemDto>()).ToList();
        }

        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        public async Task<StudentResponse?> GetByIdAsync(int studentId)
        {
            var connection = Connection;

            return await connection.QueryFirstOrDefaultAsync<StudentResponse>(
                "sp_GetStudentById",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }

        // =========================================================
        // CREATE STUDENT
        // =========================================================

        public async Task<StudentResponse> CreateAsync(CreateStudentRequest request)
        {
            var connection = Connection;

            var result = await connection.QueryFirstOrDefaultAsync<StudentResponse>(
                "sp_CreateStudent",
                new
                {
                    p_AdmissionNo = request.AdmissionNo,
                    p_RollNo = request.RollNo,
                    p_AdmissionDate = request.AdmissionDate,
                    p_AdmissionType = request.AdmissionType,
                    p_AdmissionQuota = request.AdmissionQuota,
                    p_Medium = request.Medium,
                    p_SecondLanguage = request.SecondLanguage,
                    p_StudentName = request.StudentName,
                    p_Photo = request.Photo,
                    p_Gender = request.Gender,
                    p_DateOfBirth = request.DateOfBirth,
                    p_BloodGroup = request.BloodGroup,
                    p_Email = request.Email,
                    p_MobileNumber = request.MobileNumber,
                    p_AadhaarNumber = request.AadhaarNumber,
                    p_Nationality = request.Nationality,
                    p_Religion = request.Religion,
                    p_Category = request.Category,
                    p_Address = request.Address,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_SectionId = request.SectionId,
                    p_PreviousSchool = request.PreviousSchool,
                    p_PreviousHallTicketNumber = request.PreviousHallTicketNumber,
                    p_PreviousBoard = request.PreviousBoard,
                    p_PreviousYearOfPassing = request.PreviousYearOfPassing,
                    p_PreviousPercentage = request.PreviousPercentage,
                    p_StudentCategory = request.StudentCategory,
                    p_ScholarshipStatus = request.ScholarshipStatus,
                    p_ScholarshipAmount = request.ScholarshipAmount,
                    p_FatherName = request.FatherName,
                    p_FatherOccupation = request.FatherOccupation,
                    p_FatherMobile = request.FatherMobile,
                    p_MotherName = request.MotherName,
                    p_MotherOccupation = request.MotherOccupation,
                    p_MotherMobile = request.MotherMobile,
                    p_GuardianName = request.GuardianName,
                    p_GuardianMobile = request.GuardianMobile,
                    p_ParentGuardianEmail = request.ParentGuardianEmail,
                    p_AnnualIncome = request.AnnualIncome,
                    p_FeeAmount = request.FeeAmount,
                    p_FeePaid = request.FeePaid,
                    p_FeeStatus = request.FeeStatus,
                    p_AttendancePercentage = request.AttendancePercentage,
                    p_PerformanceGrade = request.PerformanceGrade,
                    p_CGPA = request.CGPA,
                    p_Rank = request.Rank,
                    p_Remarks = request.Remarks,
                    p_PasswordHash = request.PasswordHash,
                    p_IsFirstLogin = request.IsFirstLogin,
                    p_IsActive = request.IsActive,
                    p_StudentType = request.StudentType,
                    p_TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                    p_BusType = request.BusType,
                    p_RouteId = request.RouteId,
                    p_BusRoute = request.BusRoute,
                    p_PickupPointId = request.PickupPointId,
                    p_PickupPoint = request.PickupPoint,
                    p_HostelId = request.HostelId,
                    p_HostelBlock = request.HostelBlock,
                    p_RoomId = request.RoomId,
                    p_HostelRoom = request.HostelRoom,
                    p_BedId = request.BedId,
                    p_HostelBed = request.HostelBed,
                    p_HallTicketNumber = request.HallTicketNumber ?? request.PreviousHallTicketNumber,
                    p_CampusId = request.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure);

            return result!;
        }

        // =========================================================
        // UPDATE STUDENT
        // =========================================================

        public async Task<StudentResponse?> UpdateAsync(int studentId, UpdateStudentRequest request)
        {
            var connection = Connection;

            var result = await connection.QueryFirstOrDefaultAsync<StudentResponse>(
                "sp_UpdateStudent",
                new
                {
                    p_StudentId = studentId,
                    p_AdmissionId = request.AdmissionId,
                    p_AdmissionNo = request.AdmissionNo,
                    p_AdmissionDate = request.AdmissionDate,
                    p_AdmissionType = request.AdmissionType,
                    p_AdmissionQuota = request.AdmissionQuota,
                    p_Medium = request.Medium,
                    p_SecondLanguage = request.SecondLanguage,
                    p_StudentName = request.StudentName,
                    p_Photo = request.Photo,
                    p_Gender = request.Gender,
                    p_DateOfBirth = request.DateOfBirth,
                    p_BloodGroup = request.BloodGroup,
                    p_Email = request.Email,
                    p_MobileNumber = request.MobileNumber,
                    p_AadhaarNumber = request.AadhaarNumber,
                    p_Nationality = request.Nationality,
                    p_Religion = request.Religion,
                    p_Category = request.Category,
                    p_Address = request.Address,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_SectionId = request.SectionId,
                    p_RollNo = request.RollNo,
                    p_PreviousSchool = request.PreviousSchool,
                    p_PreviousHallTicketNumber = request.PreviousHallTicketNumber,
                    p_PreviousBoard = request.PreviousBoard,
                    p_PreviousYearOfPassing = request.PreviousYearOfPassing,
                    p_PreviousPercentage = request.PreviousPercentage,
                    p_FatherName = request.FatherName,
                    p_FatherOccupation = request.FatherOccupation,
                    p_FatherMobile = request.FatherMobile,
                    p_MotherName = request.MotherName,
                    p_MotherOccupation = request.MotherOccupation,
                    p_MotherMobile = request.MotherMobile,
                    p_GuardianName = request.GuardianName,
                    p_GuardianMobile = request.GuardianMobile,
                    p_ParentGuardianEmail = request.ParentGuardianEmail,
                    p_StudentType = request.StudentType,
                    p_TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                    p_BusType = request.BusType,
                    p_RouteId = request.RouteId,
                    p_BusRoute = request.BusRoute,
                    p_PickupPointId = request.PickupPointId,
                    p_PickupPoint = request.PickupPoint,
                    p_HostelId = request.HostelId,
                    p_HostelBlock = request.HostelBlock,
                    p_RoomId = request.RoomId,
                    p_HostelRoom = request.HostelRoom,
                    p_BedId = request.BedId,
                    p_HostelBed = request.HostelBed,
                    p_HallTicketNumber = request.HallTicketNumber ?? request.PreviousHallTicketNumber,
                    p_CampusId = request.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure);

            return result;
        }

        // =========================================================
        // DELETE STUDENT
        // =========================================================

        public async Task<bool> DeleteAsync(int studentId)
        {
            var connection = Connection;

            var result = await connection.QueryFirstAsync<int>(
                "sp_DeleteStudent",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        // =========================================================
        // STUDENT PROFILE (ADMIN)
        // =========================================================

        public async Task<StudentProfileDto?> GetProfileAsync(int studentId)
        {
            var connection = Connection;

            return await connection.QueryFirstOrDefaultAsync<StudentProfileDto>(
                "sp_GetStudentProfile",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<StudentProfileDto?> UpdateProfileAsync(int studentId, StudentProfileDto request)
        {
            var connection = Connection;

            var result = await connection.QueryFirstOrDefaultAsync<StudentProfileDto>(
                "sp_UpdateStudentProfile",
                new
                {
                    p_StudentId = studentId,
                    p_Photo = request.Photo,
                    p_Email = request.Email,
                    p_MobileNumber = request.MobileNumber,
                    p_Address = request.Address,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_FatherName = request.FatherName,
                    p_FatherMobile = request.FatherMobile,
                    p_MotherName = request.MotherName,
                    p_MotherMobile = request.MotherMobile,
                    p_GuardianName = request.GuardianName,
                    p_GuardianMobile = request.GuardianMobile,
                    p_ParentGuardianEmail = request.ParentGuardianEmail
                },
                commandType: CommandType.StoredProcedure);

            return result;
        }

        // =========================================================
        // SELF-SERVICE PROFILE & CREDENTIALS
        // =========================================================

        public async Task<StudentSelfProfileResponseDto?> GetSelfProfileAsync(int studentId)
        {
            var connection = Connection;

            return await connection.QueryFirstOrDefaultAsync<StudentSelfProfileResponseDto>(
                "sp_GetStudentSelfProfile",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateSelfProfileAsync(int studentId, StudentSelfProfileDto request)
        {
            var connection = Connection;

            var rows = await connection.ExecuteAsync(
                "sp_UpdateStudentSelfProfile",
                new
                {
                    p_StudentId = studentId,
                    p_MobileNumber = request.MobileNumber,
                    p_Email = request.Email,
                    p_Address = request.Address,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_BloodGroup = request.BloodGroup,
                    p_AadhaarNumber = request.AadhaarNumber,
                    p_Nationality = request.Nationality,
                    p_Religion = request.Religion,
                    p_PreviousSchool = request.PreviousSchool,
                    p_PreviousHallTicketNumber = request.PreviousHallTicketNumber,
                    p_PreviousBoard = request.PreviousBoard,
                    p_PreviousYearOfPassing = request.PreviousYearOfPassing,
                    p_PreviousPercentage = request.PreviousPercentage,
                    p_FatherMobile = request.FatherMobile,
                    p_MotherMobile = request.MotherMobile,
                    p_GuardianMobile = request.GuardianMobile,
                    p_ParentGuardianEmail = request.ParentGuardianEmail
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // ACADEMIC OPERATIONS
        // =========================================================

        public async Task<bool> ChangeSectionAsync(int studentId, ChangeSectionRequest request)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_ChangeStudentSection",
                new
                {
                    p_StudentId = studentId,
                    p_SectionId = request.SectionId,
                    p_Remarks = request.Remarks
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<bool> ChangeGroupAsync(int studentId, ChangeGroupRequest request)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_ChangeStudentGroup",
                new
                {
                    p_StudentId = studentId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_Remarks = request.Remarks
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<bool> TransferAsync(int studentId, TransferStudentRequest request)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_TransferStudent",
                new
                {
                    p_StudentId = studentId,
                    p_TransferReason = request.TransferReason,
                    p_Remarks = request.Remarks
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        // =========================================================
        // STUDENT STATUS
        // =========================================================

        public async Task<bool> SuspendAsync(int studentId, SuspendStudentRequest request)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_SuspendStudent",
                new
                {
                    p_StudentId = studentId,
                    p_Reason = request.Reason,
                    p_Remarks = request.Remarks
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<bool> ActivateAsync(int studentId)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_ActivateStudent",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        // =========================================================
        // RESET PASSWORD
        // =========================================================

        public async Task<bool> ResetPasswordAsync(int studentId)
        {
            var connection = Connection;

            var result = await connection.ExecuteAsync(
                "sp_ResetStudentLogin",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        // =========================================================
        // DASHBOARD
        // =========================================================

        public async Task<StudentDashboardDto?> GetDashboardAsync(int studentId)
        {
            var connection = Connection;

            return await connection.QueryFirstOrDefaultAsync<StudentDashboardDto>(
                "sp_GetStudentDashboard",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }

        // =========================================================
        // SEARCH STUDENTS (FILTERED LIST)
        // =========================================================

        public async Task<List<StudentListItemDto>> SearchAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            int? sectionId,
            bool? isActive,
            int? campusId = null)
        {
            var connection = Connection;

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_SearchStudents",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId,
                    p_SectionId = sectionId,
                    p_IsActive = isActive,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        // =========================================================
        // GET BY GROUP / SECTION / ACTIVE
        // =========================================================

        public async Task<List<StudentListItemDto>> GetByGroupAsync(int groupId)
        {
            var connection = Connection;

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetStudentsByGroupId",
                new
                {
                    p_GroupId = groupId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<StudentListItemDto>> GetBySectionAsync(int sectionId)
        {
            var connection = Connection;

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetStudentsBySectionId",
                new
                {
                    p_SectionId = sectionId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<StudentListItemDto>> GetActiveAsync()
        {
            var connection = Connection;

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetActiveStudents",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        // =========================================================
        // VALIDATION
        // =========================================================

        public async Task<bool> EmailExistsAsync(string email, int? excludeStudentId = null)
        {
            var connection = Connection;

            var count = await connection.ExecuteScalarAsync<int>(
                "sp_CheckStudentEmail",
                new
                {
                    p_Email = email.Trim(),
                    p_ExcludeStudentId = excludeStudentId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> MobileExistsAsync(string mobile, int? excludeStudentId = null)
        {
            var connection = Connection;

            var count = await connection.ExecuteScalarAsync<int>(
                "sp_CheckStudentMobile",
                new
                {
                    p_MobileNumber = mobile.Trim(),
                    p_ExcludeStudentId = excludeStudentId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        // =========================================================
        // COMMON STUDENT PHOTO & DOCUMENT UPDATES
        // =========================================================

        public async Task<bool> UpdatePhotoPathAsync(int studentId, string photoPath)
        {
            var connection = Connection;
            var rows = await connection.ExecuteAsync(
                "sp_UpdateStudentPhotoPath",
                new
                {
                    p_StudentId = studentId,
                    p_PhotoPath = photoPath
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> UpdateDocumentPathAsync(int studentId, string documentColumn, string documentPath)
        {
            var validColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "BirthCertificate", "TransferCertificate", "StudyCertificate", "AadhaarDocument",
                "CommunityCertificate", "IncomeCertificate", "CasteCertificate", "TenthCertificate", "MarksMemo"
            };

            if (!validColumns.TryGetValue(documentColumn, out var safeColumn))
                throw new ArgumentException($"Invalid document column: {documentColumn}");

            var connection = Connection;
            var rows = await connection.ExecuteAsync(
                "sp_UpdateStudentDocumentPath",
                new
                {
                    p_StudentId = studentId,
                    p_DocumentColumn = safeColumn,
                    p_DocumentPath = documentPath
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // PARENT PORTAL - GET CHILDREN
        // =========================================================

        public async Task<IEnumerable<ParentChildDto>> GetParentChildrenAsync(int parentUserId)
        {
            var connection = Connection;

            var children = await connection.QueryAsync<ParentChildDto>(
                "sp_GetParentChildren",
                new { p_ParentUserId = parentUserId },
                commandType: CommandType.StoredProcedure);

            return children;
        }
    }
}
