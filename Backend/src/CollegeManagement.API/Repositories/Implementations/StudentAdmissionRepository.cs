using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StudentAdmissionRepository : IStudentAdmissionRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<StudentAdmissionRepository> _logger;

        public StudentAdmissionRepository(
            AppDbContext context,
            ILogger<StudentAdmissionRepository> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private async Task<IDbConnection> GetOpenConnectionAsync()
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            return connection;
        }

        // =========================================================
        // GET ALL STUDENT ADMISSIONS
        // =========================================================
        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync(int? campusId = null)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", (campusId.HasValue && campusId.Value > 0) ? campusId.Value : (int?)null, DbType.Int32);

            var result = await connection.QueryAsync<StudentAdmissionResponseDto>(
                "sp_GetAllStudentAdmissions",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        // =========================================================
        // GET STUDENT ADMISSION BY ID
        // =========================================================
        public async Task<StudentAdmissionResponseDto?> GetByIdAsync(int admissionId)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);

            using var multi = await connection.QueryMultipleAsync(
                "sp_GetStudentAdmissionById",
                parameters,
                commandType: CommandType.StoredProcedure);

            var admission = await multi.ReadFirstOrDefaultAsync<StudentAdmissionResponseDto>();
            if (admission != null)
            {
                if (!multi.IsConsumed)
                {
                    var componentIds = await multi.ReadAsync<int>();
                    admission.SelectedFeeStructureComponentIds = componentIds.ToList();
                }

                // Harmonize residential and transport display text
                admission.HostelBlock = !string.IsNullOrWhiteSpace(admission.HostelBlock) ? admission.HostelBlock : admission.FetchedHostelBlock;
                admission.HostelRoom = !string.IsNullOrWhiteSpace(admission.HostelRoom) ? admission.HostelRoom : admission.FetchedHostelRoom;
                admission.HostelBed = !string.IsNullOrWhiteSpace(admission.HostelBed) ? admission.HostelBed : admission.FetchedHostelBed;
                admission.BusRoute = !string.IsNullOrWhiteSpace(admission.BusRoute) ? admission.BusRoute : admission.FetchedBusRoute;
                admission.PickupPoint = !string.IsNullOrWhiteSpace(admission.PickupPoint) ? admission.PickupPoint : admission.FetchedPickupPoint;
            }

            return admission;
        }

        // =========================================================
        // GET CREATED STUDENT BY ADMISSION ID
        // =========================================================
        public async Task<Student?> GetStudentByAdmissionIdAsync(
            int admissionId,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            var conn = connection ?? await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);

            return await conn.QueryFirstOrDefaultAsync<Student>(
                "sp_GetStudentByAdmissionId",
                parameters,
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        // =========================================================
        // CREATE STUDENT ADMISSION (100% STORED PROCEDURE)
        // =========================================================
        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request,
            string? studentPhoto)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();

            parameters.Add("p_AdmissionDate", request.AdmissionDate, DbType.DateTime);
            parameters.Add("p_AdmissionNo", request.AdmissionNo, DbType.String);
            parameters.Add("p_AdmissionType", request.AdmissionType, DbType.String);
            parameters.Add("p_AdmissionQuota", request.AdmissionQuota, DbType.String);
            parameters.Add("p_CampusId", request.CampusId, DbType.Int32);
            parameters.Add("p_SourceCampusId", request.SourceCampusId, DbType.Int32);
            parameters.Add("p_IsReferral", request.IsReferral ? 1 : 0, DbType.Int16);
            parameters.Add("p_AdmittedById", request.AdmittedById, DbType.Int32);
            parameters.Add("p_BoardId", request.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId, DbType.Int32);
            parameters.Add("p_ProgramId", request.ProgramId, DbType.Int32);
            parameters.Add("p_FirstName", request.FirstName?.Trim(), DbType.String);
            parameters.Add("p_LastName", request.LastName?.Trim(), DbType.String);
            parameters.Add("p_Gender", request.Gender, DbType.String);
            parameters.Add("p_DateOfBirth", request.DateOfBirth, DbType.DateTime);
            parameters.Add("p_BloodGroup", request.BloodGroup, DbType.String);
            parameters.Add("p_StudentEmail", request.StudentEmail?.Trim(), DbType.String);
            parameters.Add("p_StudentMobileNumber", request.StudentMobileNumber?.Trim(), DbType.String);
            parameters.Add("p_StudentPhoto", studentPhoto, DbType.String);
            parameters.Add("p_AadhaarNumber", request.AadhaarNumber, DbType.String);
            parameters.Add("p_Nationality", request.Nationality, DbType.String);
            parameters.Add("p_Religion", request.Religion, DbType.String);
            parameters.Add("p_Category", request.Category, DbType.String);
            parameters.Add("p_FatherName", request.FatherName?.Trim(), DbType.String);
            parameters.Add("p_FatherOccupation", request.FatherOccupation, DbType.String);
            parameters.Add("p_FatherMobile", request.FatherMobile, DbType.String);
            parameters.Add("p_MotherName", request.MotherName?.Trim(), DbType.String);
            parameters.Add("p_MotherOccupation", request.MotherOccupation, DbType.String);
            parameters.Add("p_MotherMobile", request.MotherMobile, DbType.String);
            parameters.Add("p_GuardianName", request.GuardianName?.Trim(), DbType.String);
            parameters.Add("p_GuardianMobile", request.GuardianMobile, DbType.String);
            parameters.Add("p_ParentGuardianEmail", request.ParentGuardianEmail?.Trim(), DbType.String);
            parameters.Add("p_AnnualIncome", request.AnnualIncome, DbType.Decimal);
            parameters.Add("p_FeeStructureId", request.FeeStructureId, DbType.Int32);
            parameters.Add("p_PaymentPlan", request.PaymentPlan, DbType.String);
            parameters.Add("p_ScholarshipStatus", request.ScholarshipStatus, DbType.String);
            parameters.Add("p_HouseDoorNumber", request.HouseDoorNumber, DbType.String);
            parameters.Add("p_StreetVillage", request.StreetVillage, DbType.String);
            parameters.Add("p_City", request.City, DbType.String);
            parameters.Add("p_District", request.District, DbType.String);
            parameters.Add("p_State", request.State, DbType.String);
            parameters.Add("p_Pincode", request.Pincode, DbType.String);
            parameters.Add("p_PreviousSchool", request.PreviousSchool, DbType.String);
            parameters.Add("p_PreviousBoard", request.PreviousBoard, DbType.String);
            parameters.Add("p_PreviousPercentage", request.PreviousPercentage, DbType.Decimal);
            parameters.Add("p_PreviousYearOfPassing", request.PreviousYearOfPassing, DbType.Int32);
            parameters.Add("p_Medium", request.Medium, DbType.String);
            parameters.Add("p_SecondLanguage", request.SecondLanguage, DbType.String);
            parameters.Add("p_StudentType", request.StudentType, DbType.String);
            parameters.Add("p_TransportRequired", request.TransportRequired == true ? 1 : 0, DbType.Int16);
            parameters.Add("p_BusType", request.BusType, DbType.String);
            parameters.Add("p_RouteId", request.RouteId, DbType.Int32);
            parameters.Add("p_BusRoute", request.BusRoute, DbType.String);
            parameters.Add("p_PickupPointId", request.PickupPointId, DbType.Int32);
            parameters.Add("p_PickupPoint", request.PickupPoint, DbType.String);
            parameters.Add("p_HostelId", request.HostelId, DbType.Int32);
            parameters.Add("p_HostelBlock", request.HostelBlock, DbType.String);
            parameters.Add("p_RoomId", request.RoomId, DbType.Int32);
            parameters.Add("p_HostelRoom", request.HostelRoom, DbType.String);
            parameters.Add("p_BedId", request.BedId, DbType.Int32);
            parameters.Add("p_HostelBed", request.HostelBed, DbType.String);
            parameters.Add("p_HallTicketNumber", request.HallTicketNumber, DbType.String);

            using var multi = await connection.QueryMultipleAsync(
                "sp_CreateStudentAdmission",
                parameters,
                commandType: CommandType.StoredProcedure);

            var created = await multi.ReadFirstOrDefaultAsync<StudentAdmissionResponseDto>();
            if (created == null)
            {
                throw new InvalidOperationException("Student admission could not be created via stored procedure.");
            }

            if (!multi.IsConsumed)
            {
                var componentIds = await multi.ReadAsync<int>();
                created.SelectedFeeStructureComponentIds = componentIds.ToList();
            }

            return created;
        }

        // =========================================================
        // UPDATE STUDENT ADMISSION (100% STORED PROCEDURE)
        // =========================================================
        public async Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();

            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
            parameters.Add("p_AdmissionDate", request.AdmissionDate, DbType.DateTime);
            parameters.Add("p_AdmissionType", request.AdmissionType, DbType.String);
            parameters.Add("p_AdmissionQuota", request.AdmissionQuota, DbType.String);
            parameters.Add("p_CampusId", request.CampusId, DbType.Int32);
            parameters.Add("p_BoardId", request.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId, DbType.Int32);
            parameters.Add("p_ProgramId", request.ProgramId, DbType.Int32);
            parameters.Add("p_FirstName", request.FirstName?.Trim(), DbType.String);
            parameters.Add("p_LastName", request.LastName?.Trim(), DbType.String);
            parameters.Add("p_Gender", request.Gender, DbType.String);
            parameters.Add("DateOfBirth", request.DateOfBirth, DbType.DateTime);
            parameters.Add("p_DateOfBirth", request.DateOfBirth, DbType.DateTime);
            parameters.Add("p_BloodGroup", request.BloodGroup, DbType.String);
            parameters.Add("p_StudentEmail", request.StudentEmail?.Trim(), DbType.String);
            parameters.Add("p_StudentMobileNumber", request.StudentMobileNumber?.Trim(), DbType.String);
            parameters.Add("p_StudentPhoto", studentPhoto, DbType.String);
            parameters.Add("p_AadhaarNumber", request.AadhaarNumber, DbType.String);
            parameters.Add("p_Nationality", request.Nationality, DbType.String);
            parameters.Add("p_Religion", request.Religion, DbType.String);
            parameters.Add("p_Category", request.Category, DbType.String);
            parameters.Add("p_FatherName", request.FatherName?.Trim(), DbType.String);
            parameters.Add("p_FatherOccupation", request.FatherOccupation, DbType.String);
            parameters.Add("p_FatherMobile", request.FatherMobile, DbType.String);
            parameters.Add("p_MotherName", request.MotherName?.Trim(), DbType.String);
            parameters.Add("p_MotherOccupation", request.MotherOccupation, DbType.String);
            parameters.Add("p_MotherMobile", request.MotherMobile, DbType.String);
            parameters.Add("p_GuardianName", request.GuardianName?.Trim(), DbType.String);
            parameters.Add("p_GuardianMobile", request.GuardianMobile, DbType.String);
            parameters.Add("p_ParentGuardianEmail", request.ParentGuardianEmail?.Trim(), DbType.String);
            parameters.Add("p_AnnualIncome", request.AnnualIncome, DbType.Decimal);
            parameters.Add("p_FeeStructureId", request.FeeStructureId, DbType.Int32);
            parameters.Add("p_PaymentPlan", request.PaymentPlan, DbType.String);
            parameters.Add("p_ScholarshipStatus", request.ScholarshipStatus, DbType.String);
            parameters.Add("p_HouseDoorNumber", request.HouseDoorNumber, DbType.String);
            parameters.Add("p_StreetVillage", request.StreetVillage, DbType.String);
            parameters.Add("p_City", request.City, DbType.String);
            parameters.Add("p_District", request.District, DbType.String);
            parameters.Add("p_State", request.State, DbType.String);
            parameters.Add("p_Pincode", request.Pincode, DbType.String);
            parameters.Add("p_PreviousSchool", request.PreviousSchool, DbType.String);
            parameters.Add("p_PreviousBoard", request.PreviousBoard, DbType.String);
            parameters.Add("p_PreviousPercentage", request.PreviousPercentage, DbType.Decimal);
            parameters.Add("p_PreviousYearOfPassing", request.PreviousYearOfPassing, DbType.Int32);
            parameters.Add("p_Medium", request.Medium, DbType.String);
            parameters.Add("p_SecondLanguage", request.SecondLanguage, DbType.String);
            parameters.Add("p_StudentType", request.StudentType, DbType.String);
            parameters.Add("p_TransportRequired", request.TransportRequired == true ? 1 : 0, DbType.Int16);
            parameters.Add("p_BusType", request.BusType, DbType.String);
            parameters.Add("p_RouteId", request.RouteId, DbType.Int32);
            parameters.Add("p_BusRoute", request.BusRoute, DbType.String);
            parameters.Add("p_PickupPointId", request.PickupPointId, DbType.Int32);
            parameters.Add("p_PickupPoint", request.PickupPoint, DbType.String);
            parameters.Add("p_HostelId", request.HostelId, DbType.Int32);
            parameters.Add("p_HostelBlock", request.HostelBlock, DbType.String);
            parameters.Add("p_RoomId", request.RoomId, DbType.Int32);
            parameters.Add("p_HostelRoom", request.HostelRoom, DbType.String);
            parameters.Add("p_BedId", request.BedId, DbType.Int32);
            parameters.Add("p_HostelBed", request.HostelBed, DbType.String);
            parameters.Add("p_HallTicketNumber", request.HallTicketNumber, DbType.String);

            using var multi = await connection.QueryMultipleAsync(
                "sp_UpdateStudentAdmission",
                parameters,
                commandType: CommandType.StoredProcedure);

            var updated = await multi.ReadFirstOrDefaultAsync<StudentAdmissionResponseDto>();
            if (updated != null && !multi.IsConsumed)
            {
                var componentIds = await multi.ReadAsync<int>();
                updated.SelectedFeeStructureComponentIds = componentIds.ToList();
            }

            // Sync domain student and user records if admission is already approved
            await connection.ExecuteAsync(
                "sp_SyncApprovedStudentFromAdmission",
                new { p_AdmissionId = admissionId },
                commandType: CommandType.StoredProcedure);

            return updated;
        }

        // =========================================================
        // UPDATE ADMISSION NUMBER
        // =========================================================
        public async Task<bool> UpdateAdmissionNumberAsync(int admissionId, string admissionNo)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
            parameters.Add("p_AdmissionNo", admissionNo, DbType.String);

            var rows = await connection.ExecuteAsync(
                "sp_UpdateAdmissionNumber",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // VERIFY ADMISSION
        // =========================================================
        public async Task<bool> VerifyAsync(VerifyStudentAdmissionRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", request.AdmissionId, DbType.Int32);

            var rows = await connection.ExecuteAsync(
                "sp_VerifyStudentAdmission",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // APPROVE / REJECT ADMISSION REQUESTS (INTER-CAMPUS REFERRALS)
        // =========================================================
        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetOutgoingRequestsAsync(int campusId)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await connection.QueryAsync<StudentAdmissionResponseDto>(
                "sp_GetOutgoingAdmissionRequests",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetIncomingRequestsAsync(int campusId)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await connection.QueryAsync<StudentAdmissionResponseDto>(
                "sp_GetIncomingAdmissionRequests",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<bool> ApproveAdmissionRequestAsync(int admissionId, string generatedAdmissionNo, string? remarks)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
            parameters.Add("p_AdmissionNo", generatedAdmissionNo, DbType.String);
            parameters.Add("p_Remarks", remarks, DbType.String);

            var rows = await connection.ExecuteAsync(
                "sp_ApproveAdmissionRequest",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> RejectAdmissionRequestAsync(int admissionId, string rejectionReason, string? remarks)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
            parameters.Add("p_RejectionReason", rejectionReason, DbType.String);
            parameters.Add("p_Remarks", remarks, DbType.String);

            var rows = await connection.ExecuteAsync(
                "sp_RejectAdmissionRequest",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // APPROVE ADMISSION (TRANSACTIONAL DOMAIN STUDENT CREATION)
        // =========================================================
        public async Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request,
            string? passwordHash = null,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var conn = connection ?? await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", request.AdmissionId, DbType.Int32);
            parameters.Add("p_PasswordHash", passwordHash ?? string.Empty, DbType.String);

            var result = await conn.QuerySingleOrDefaultAsync<int>(
                "sp_ApproveStudentAdmission",
                parameters,
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            return result > 0;
        }

        // =========================================================
        // REJECT ADMISSION
        // =========================================================
        public async Task<bool> RejectAsync(RejectStudentAdmissionRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", request.AdmissionId, DbType.Int32);
            parameters.Add("p_RejectionReason", request.RejectionReason, DbType.String);
            parameters.Add("p_Remarks", request.Remarks, DbType.String);

            var rows = await connection.ExecuteAsync(
                "sp_RejectStudentAdmission",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // DELETE / SOFT DELETE
        // =========================================================
        public async Task<bool> DeleteAsync(int admissionId)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);

            var rows = await connection.ExecuteAsync(
                "sp_DeleteStudentAdmission",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        // =========================================================
        // GENERATE ADMISSION NUMBER
        // =========================================================
        public async Task<string> GenerateAdmissionNumberAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var connection = await GetOpenConnectionAsync();
            return await connection.QuerySingleAsync<string>(
                "sp_GenerateAdmissionNumber",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> GetActualAdmissionCountAsync(int campusId, int boardId, int academicYearId)
        {
            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId, DbType.Int32);
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

            return await connection.ExecuteScalarAsync<int>(
                "sp_GetMaxAdmissionSequence",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task SyncAdmissionSequenceAsync(int campusId, int boardId, int academicYearId, int correctSequence)
        {
            var connection = await GetOpenConnectionAsync();
            string seriesCode = $"ADMISSION_NO|B:{boardId}_AY:{academicYearId}";
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId, DbType.Int32);
            parameters.Add("p_SeriesCode", seriesCode, DbType.String);
            parameters.Add("p_CorrectSequence", correctSequence, DbType.Int32);

            await connection.ExecuteAsync(
                "sp_SyncAdmissionSequence",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // =========================================================
        // SECTION ALLOCATION
        // =========================================================
        public async Task<bool> AllocateSectionAsync(AllocateSectionRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", request.AdmissionId, DbType.Int32);
            parameters.Add("p_SectionId", request.SectionId, DbType.Int32);

            var rows = await connection.ExecuteAsync(
                "sp_AllocateStudentAdmissionSection",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<int> BulkAllocateSectionAsync(BulkSectionAllocationRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (request.AdmissionIds == null || request.AdmissionIds.Count == 0) return 0;

            var connection = await GetOpenConnectionAsync();
            var totalAllocated = 0;

            foreach (var admissionId in request.AdmissionIds)
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
                parameters.Add("p_SectionId", request.SectionId, DbType.Int32);

                var rows = await connection.ExecuteAsync(
                    "sp_AllocateStudentAdmissionSection",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (rows > 0)
                {
                    totalAllocated++;
                }
            }

            return totalAllocated;
        }

        // =========================================================
        // SAVE ADMISSION FEE SELECTIONS
        // =========================================================
        public async Task<int> SaveAdmissionFeeSelectionsAsync(
            int admissionId,
            SaveAdmissionFeeSelectionsRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync();
            var selectedIds = request.SelectedFeeStructureComponentIds ?? new List<int>();
            var json = JsonSerializer.Serialize(selectedIds);

            var parameters = new DynamicParameters();
            parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
            parameters.Add("p_SelectedComponentIds", json, DbType.String);

            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_SaveAdmissionFeeSelections",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result?.SelectedOptionalFees ?? 0;
        }

        // =========================================================
        // ROLL NUMBER ALLOCATION
        // =========================================================
        public async Task<int> BulkAllocateRollNumbersAsync(BulkRollNumberAllocationRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (request.AdmissionIds == null || request.AdmissionIds.Count == 0) return 0;

            var connection = await GetOpenConnectionAsync();
            var totalAllocated = 0;
            var rollNumber = request.StartingRollNumber;

            foreach (var admissionId in request.AdmissionIds)
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_AdmissionId", admissionId, DbType.Int32);
                parameters.Add("p_SectionId", request.SectionId, DbType.Int32);
                parameters.Add("p_RollNo", rollNumber.ToString(), DbType.String);

                var rows = await connection.ExecuteAsync(
                    "sp_AllocateStudentAdmissionRollNumber",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (rows > 0)
                {
                    totalAllocated++;
                }

                rollNumber++;
            }

            return totalAllocated;
        }
    }
}
