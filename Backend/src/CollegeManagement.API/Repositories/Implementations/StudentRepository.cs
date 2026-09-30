using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories
{
    public class StudentRepository : IStudentRepository
    {
        private readonly AppDbContext _context;

        public StudentRepository(AppDbContext context)
        {
            _context = context;
        }


        // =========================================================
        // GET ALL / PAGED STUDENTS
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

            var query = _context.Students
                .Include(s => s.BoardNavigation)
                .Include(s => s.AcademicYear)
                .Include(s => s.AcademicLevelNavigation)
                .Include(s => s.GroupNavigation)
                .Include(s => s.SectionNavigation)
                .Include(s => s.CampusNavigation)
                .Include(s => s.ProgramNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
                query = query.Where(s => s.CampusId == campusId.Value);

            if (boardId.HasValue && boardId.Value > 0)
                query = query.Where(s => s.BoardId == boardId.Value);

            if (academicYearId.HasValue && academicYearId.Value > 0)
                query = query.Where(s => s.AcademicYearId == academicYearId.Value);

            if (academicLevelId.HasValue && academicLevelId.Value > 0)
                query = query.Where(s => s.AcademicLevelId == academicLevelId.Value);

            if (groupId.HasValue && groupId.Value > 0)
                query = query.Where(s => s.GroupId == groupId.Value);

            if (programId.HasValue && programId.Value > 0)
                query = query.Where(s => s.ProgramId == programId.Value);

            if (sectionId.HasValue && sectionId.Value > 0)
                query = query.Where(s => s.SectionId == sectionId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var sTerm = search.Trim();
                query = query.Where(s =>
                    s.StudentName.Contains(sTerm) ||
                    (s.AdmissionNo != null && s.AdmissionNo.Contains(sTerm)) ||
                    (s.RollNo != null && s.RollNo.Contains(sTerm)) ||
                    (s.MobileNumber != null && s.MobileNumber.Contains(sTerm)) ||
                    (s.Email != null && s.Email.Contains(sTerm)));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(s => s.StudentName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentListItemDto
                {
                    StudentId = s.StudentId,
                    AdmissionNo = s.AdmissionNo ?? "",
                    RollNo = s.RollNo ?? "",
                    StudentName = s.StudentName,
                    Photo = s.Photo,
                    Gender = s.Gender,
                    Email = s.Email,
                    MobileNumber = s.MobileNumber,
                    CampusId = s.CampusId,
                    CampusName = s.CampusNavigation != null ? s.CampusNavigation.CampusName : null,
                    BoardId = s.BoardId,
                    BoardName = s.BoardNavigation != null ? s.BoardNavigation.BoardName : null,
                    AcademicYearId = s.AcademicYearId,
                    AcademicYearName = s.AcademicYear != null ? s.AcademicYear.AcademicYearName : null,
                    AcademicLevelId = s.AcademicLevelId ?? 0,
                    AcademicLevelName = s.AcademicLevelNavigation != null ? s.AcademicLevelNavigation.LevelName : null,
                    GroupId = s.GroupId ?? 0,
                    GroupName = s.GroupNavigation != null ? s.GroupNavigation.GroupName : null,
                    SectionId = s.SectionId ?? 0,
                    SectionName = s.SectionNavigation != null ? s.SectionNavigation.SectionName : null,
                    ProgramId = s.ProgramId ?? 0,
                    ProgramName = s.ProgramNavigation != null ? s.ProgramNavigation.ProgramName : null,
                    IsActive = s.IsActive,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    StudentType = s.StudentType,
                    TransportRequired = s.TransportRequired,
                    HostelBlock = s.HostelBlock,
                    BusRoute = s.BusRoute
                })
                .ToListAsync();

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
            var paged = await GetPagedAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                programId,
                sectionId,
                status,
                null,
                campusId,
                1,
                int.MaxValue);

            return paged.Items.ToList();
        }


        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        public async Task<StudentResponse?> GetByIdAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();

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
        // NOTE:
        // Normally Student is automatically created when
        // StudentAdmission is APPROVED.
        // This method is kept because existing project
        // already has Student CRUD.
        // =========================================================

        public async Task<StudentResponse> CreateAsync(
            CreateStudentRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            string? hostelBlock = request.HostelBlock;
            if (string.IsNullOrWhiteSpace(hostelBlock) && request.HostelId.HasValue)
            {
                hostelBlock = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT HostelName FROM hostel_blocks WHERE HostelId = @HostelId LIMIT 1",
                    new { request.HostelId });
            }

            string? hostelRoom = request.HostelRoom;
            if (string.IsNullOrWhiteSpace(hostelRoom) && request.RoomId.HasValue)
            {
                hostelRoom = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT RoomNumber FROM room_masters WHERE RoomId = @RoomId LIMIT 1",
                    new { request.RoomId });
            }

            string? hostelBed = request.HostelBed;
            if (string.IsNullOrWhiteSpace(hostelBed) && request.BedId.HasValue)
            {
                hostelBed = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT BedNumber FROM hostel_beds WHERE BedId = @BedId LIMIT 1",
                    new { request.BedId });
            }

            string? busRoute = request.BusRoute;
            if (string.IsNullOrWhiteSpace(busRoute) && request.RouteId.HasValue)
            {
                busRoute = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT RouteName FROM TransportRoutes WHERE RouteId = @RouteId LIMIT 1",
                    new { request.RouteId });
            }

            string? pickupPoint = request.PickupPoint;
            if (string.IsNullOrWhiteSpace(pickupPoint) && request.PickupPointId.HasValue)
            {
                pickupPoint = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT COALESCE(StopName, PickupPointName) FROM PickupPoints WHERE PickupPointId = @PickupPointId LIMIT 1",
                    new { request.PickupPointId });
            }

            var result =
                await connection.QueryFirstOrDefaultAsync<StudentResponse>(
                    "sp_CreateStudent",
                    new
                    {
                        // Admission
                        p_AdmissionNo = request.AdmissionNo,
                        p_RollNo = request.RollNo,
                        p_AdmissionDate = request.AdmissionDate,
                        p_AdmissionType = request.AdmissionType,
                        p_AdmissionQuota = request.AdmissionQuota,
                        p_Medium = request.Medium,
                        p_SecondLanguage = request.SecondLanguage,

                        // Student
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

                        // Address
                        p_Address = request.Address,
                        p_City = request.City,
                        p_District = request.District,
                        p_State = request.State,
                        p_Pincode = request.Pincode,

                        // Academic IDs
                        p_BoardId = request.BoardId,
                        p_AcademicYearId = request.AcademicYearId,
                        p_AcademicLevelId = request.AcademicLevelId,
                        p_GroupId = request.GroupId,
                        p_ProgramId = request.ProgramId,
                        p_SectionId = request.SectionId,

                        // Previous Education
                        p_PreviousSchool = request.PreviousSchool,
                        p_PreviousHallTicketNumber =
                            request.PreviousHallTicketNumber,
                        p_PreviousBoard = request.PreviousBoard,
                        p_PreviousYearOfPassing =
                            request.PreviousYearOfPassing,
                        p_PreviousPercentage =
                            request.PreviousPercentage,

                        // Category / Scholarship
                        p_StudentCategory = request.StudentCategory,
                        p_ScholarshipStatus =
                            request.ScholarshipStatus,
                        p_ScholarshipAmount =
                            request.ScholarshipAmount,

                        // Father
                        p_FatherName = request.FatherName,
                        p_FatherOccupation =
                            request.FatherOccupation,
                        p_FatherMobile = request.FatherMobile,

                        // Mother
                        p_MotherName = request.MotherName,
                        p_MotherOccupation =
                            request.MotherOccupation,
                        p_MotherMobile = request.MotherMobile,

                        // Guardian
                        p_GuardianName = request.GuardianName,
                        p_GuardianMobile =
                            request.GuardianMobile,
                        p_ParentGuardianEmail =
                            request.ParentGuardianEmail,

                        p_AnnualIncome =
                            request.AnnualIncome,

                        // Fees
                        p_FeeAmount = request.FeeAmount,
                        p_FeePaid = request.FeePaid,
                        p_FeeStatus = request.FeeStatus,

                        // Performance
                        p_AttendancePercentage =
                            request.AttendancePercentage,
                        p_PerformanceGrade =
                            request.PerformanceGrade,
                        p_CGPA = request.CGPA,
                        p_Rank = request.Rank,

                        // Remarks
                        p_Remarks = request.Remarks,

                        // Login
                        p_PasswordHash =
                            request.PasswordHash,
                        p_IsFirstLogin =
                            request.IsFirstLogin,

                        // Status
                        p_IsActive = request.IsActive,

                        // Residential & Transport
                        p_StudentType = request.StudentType,
                        p_TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                        p_BusType = request.BusType,
                        p_RouteId = request.RouteId,
                        p_BusRoute = busRoute,
                        p_PickupPointId = request.PickupPointId,
                        p_PickupPoint = pickupPoint,
                        p_HostelId = request.HostelId,
                        p_HostelBlock = hostelBlock,
                        p_RoomId = request.RoomId,
                        p_HostelRoom = hostelRoom,
                        p_BedId = request.BedId,
                        p_HostelBed = hostelBed,
                        p_HallTicketNumber = request.HallTicketNumber ?? request.PreviousHallTicketNumber,
                        p_CampusId = request.CampusId ?? 1
                    },
                    commandType: CommandType.StoredProcedure);

            return result!;
        }


        public async Task<StudentResponse?> UpdateAsync(
            int studentId,
            UpdateStudentRequest request)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            string? hostelBlock = request.HostelBlock;
            if (string.IsNullOrWhiteSpace(hostelBlock) && request.HostelId.HasValue)
            {
                hostelBlock = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT HostelName FROM hostel_blocks WHERE HostelId = @HostelId LIMIT 1",
                    new { request.HostelId });
            }

            string? hostelRoom = request.HostelRoom;
            if (string.IsNullOrWhiteSpace(hostelRoom) && request.RoomId.HasValue)
            {
                hostelRoom = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT RoomNumber FROM room_masters WHERE RoomId = @RoomId LIMIT 1",
                    new { request.RoomId });
            }

            string? hostelBed = request.HostelBed;
            if (string.IsNullOrWhiteSpace(hostelBed) && request.BedId.HasValue)
            {
                hostelBed = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT BedNumber FROM hostel_beds WHERE BedId = @BedId LIMIT 1",
                    new { request.BedId });
            }

            string? busRoute = request.BusRoute;
            if (string.IsNullOrWhiteSpace(busRoute) && request.RouteId.HasValue)
            {
                busRoute = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT RouteName FROM TransportRoutes WHERE RouteId = @RouteId LIMIT 1",
                    new { request.RouteId });
            }

            string? pickupPoint = request.PickupPoint;
            if (string.IsNullOrWhiteSpace(pickupPoint) && request.PickupPointId.HasValue)
            {
                pickupPoint = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT COALESCE(StopName, PickupPointName) FROM PickupPoints WHERE PickupPointId = @PickupPointId LIMIT 1",
                    new { request.PickupPointId });
            }

            string? normalizedEmail = null;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                normalizedEmail = request.Email.Trim().ToUpperInvariant();
                var existingUserWithEmail = await connection.QueryFirstOrDefaultAsync<User>(
                    "sp_CheckUserEmailExists",
                    new { p_Email = normalizedEmail },
                    commandType: CommandType.StoredProcedure);

                if (existingUserWithEmail != null && existingUserWithEmail.StudentId != studentId)
                {
                    throw new InvalidOperationException($"Email address '{request.Email}' is already registered to another user account.");
                }
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                var result = await connection.QueryFirstOrDefaultAsync<StudentResponse>(
                    "sp_UpdateStudent",
                    new
                    {
                        p_StudentId = studentId,

                        p_AdmissionId = request.AdmissionId,
                        p_AdmissionNo = request.AdmissionNo,
                        p_AdmissionDate = request.AdmissionDate,
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
                        p_BusRoute = busRoute,
                        p_PickupPointId = request.PickupPointId,
                        p_PickupPoint = pickupPoint,
                        p_HostelId = request.HostelId,
                        p_HostelBlock = hostelBlock,
                        p_RoomId = request.RoomId,
                        p_HostelRoom = hostelRoom,
                        p_BedId = request.BedId,
                        p_HostelBed = hostelBed,
                        p_HallTicketNumber = request.HallTicketNumber ?? request.PreviousHallTicketNumber,
                        p_CampusId = request.CampusId
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    await connection.ExecuteAsync(
                        "sp_UpdateUserEmailByLinkedEntity",
                        new { p_StaffId = (int?)null, p_StudentId = studentId, p_Email = normalizedEmail },
                        transaction,
                        commandType: CommandType.StoredProcedure);
                }

                var parentFullName = !string.IsNullOrWhiteSpace(request.FatherName)
                    ? request.FatherName.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotherName)
                        ? request.MotherName.Trim()
                        : (!string.IsNullOrWhiteSpace(request.GuardianName)
                            ? request.GuardianName.Trim()
                            : null));

                var parentMobile = !string.IsNullOrWhiteSpace(request.FatherMobile)
                    ? request.FatherMobile.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotherMobile)
                        ? request.MotherMobile.Trim()
                        : (!string.IsNullOrWhiteSpace(request.GuardianMobile)
                            ? request.GuardianMobile.Trim()
                            : null));

                var relationshipType = !string.IsNullOrWhiteSpace(request.FatherName)
                    ? "Father"
                    : (!string.IsNullOrWhiteSpace(request.MotherName)
                        ? "Mother"
                        : (!string.IsNullOrWhiteSpace(request.GuardianName)
                            ? "Guardian"
                            : "Parent"));

                await SyncParentUserMappingAsync(
                    connection,
                    transaction,
                    studentId,
                    request.ParentGuardianEmail,
                    parentFullName,
                    parentMobile,
                    relationshipType);

                transaction.Commit();
                return result;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }



        // =========================================================
        // DELETE STUDENT
        // =========================================================

        public async Task<bool> DeleteAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                var result = await connection.QueryFirstAsync<int>(
                    "sp_DeleteStudent",
                    new
                    {
                        p_StudentId = studentId
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                await connection.ExecuteAsync(
                    "sp_UpdateUserStatusByLinkedEntity",
                    new { p_StaffId = (int?)null, p_StudentId = studentId, p_AdminId = (int?)null, p_IsActive = 0 },
                    transaction,
                    commandType: CommandType.StoredProcedure);

                transaction.Commit();
                return result == 1;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }


        // =========================================================
        // GET STUDENT PROFILE
        // =========================================================

        public async Task<StudentProfileDto?> GetProfileAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QueryFirstOrDefaultAsync<StudentProfileDto>(
                "sp_GetStudentProfile",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }


        // =========================================================
        // UPDATE STUDENT PROFILE
        // =========================================================
        // Student dashboard nundi editable profile details.
        // AcademicLevel / Group / Program / Section / RollNo
        // ikkada update cheyyamu.
        // =========================================================

        public async Task<StudentProfileDto?> UpdateProfileAsync(
            int studentId,
            StudentProfileDto request)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            string? normalizedEmail = null;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                normalizedEmail = request.Email.Trim().ToUpperInvariant();
                var existingUserWithEmail = await connection.QueryFirstOrDefaultAsync<User>(
                    "sp_CheckUserEmailExists",
                    new { p_Email = normalizedEmail },
                    commandType: CommandType.StoredProcedure);

                if (existingUserWithEmail != null && existingUserWithEmail.StudentId != studentId)
                {
                    throw new InvalidOperationException($"Email address '{request.Email}' is already registered to another user account.");
                }
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                var result = await connection.QueryFirstOrDefaultAsync<StudentProfileDto>(
                    "sp_UpdateStudentProfile",
                    new
                    {
                        p_StudentId = studentId,

                        p_Photo = request.Photo,
                        p_Email = request.Email,
                        p_MobileNumber =
                            request.MobileNumber,

                        p_Address = request.Address,
                        p_City = request.City,
                        p_District = request.District,
                        p_State = request.State,
                        p_Pincode = request.Pincode,

                        p_FatherName =
                            request.FatherName,
                        p_FatherMobile =
                            request.FatherMobile,

                        p_MotherName =
                            request.MotherName,
                        p_MotherMobile =
                            request.MotherMobile,

                        p_GuardianName =
                            request.GuardianName,
                        p_GuardianMobile =
                            request.GuardianMobile,
                        p_ParentGuardianEmail =
                            request.ParentGuardianEmail
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    await connection.ExecuteAsync(
                        "sp_UpdateUserEmailByLinkedEntity",
                        new { p_StaffId = (int?)null, p_StudentId = studentId, p_Email = normalizedEmail },
                        transaction,
                        commandType: CommandType.StoredProcedure);
                }

                var parentFullName = !string.IsNullOrWhiteSpace(request.FatherName)
                    ? request.FatherName.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotherName)
                        ? request.MotherName.Trim()
                        : (!string.IsNullOrWhiteSpace(request.GuardianName)
                            ? request.GuardianName.Trim()
                            : null));

                var parentMobile = !string.IsNullOrWhiteSpace(request.FatherMobile)
                    ? request.FatherMobile.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotherMobile)
                        ? request.MotherMobile.Trim()
                        : (!string.IsNullOrWhiteSpace(request.GuardianMobile)
                            ? request.GuardianMobile.Trim()
                            : null));

                var relationshipType = !string.IsNullOrWhiteSpace(request.FatherName)
                    ? "Father"
                    : (!string.IsNullOrWhiteSpace(request.MotherName)
                        ? "Mother"
                        : (!string.IsNullOrWhiteSpace(request.GuardianName)
                            ? "Guardian"
                            : "Parent"));

                await SyncParentUserMappingAsync(
                    connection,
                    transaction,
                    studentId,
                    request.ParentGuardianEmail,
                    parentFullName,
                    parentMobile,
                    relationshipType);

                transaction.Commit();
                return result;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }


        // =========================================================
        // CHANGE STUDENT SECTION
        // =========================================================

        public async Task<bool> ChangeSectionAsync(
            int studentId,
            ChangeSectionRequest request)
        {
            var connection = _context.Database.GetDbConnection();

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


        // =========================================================
        // CHANGE STUDENT GROUP
        // =========================================================

        public async Task<bool> ChangeGroupAsync(
            int studentId,
            ChangeGroupRequest request)
        {
            var connection = _context.Database.GetDbConnection();

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


        // =========================================================
        // TRANSFER STUDENT
        // =========================================================

        public async Task<bool> TransferAsync(
            int studentId,
            TransferStudentRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.ExecuteAsync(
                "sp_TransferStudent",
                new
                {
                    p_StudentId = studentId,
                    p_TransferReason =
                        request.TransferReason,
                    p_Remarks = request.Remarks
                },
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }


        // =========================================================
        // SUSPEND STUDENT
        // =========================================================

        public async Task<bool> SuspendAsync(
            int studentId,
            SuspendStudentRequest request)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                var result = await connection.ExecuteAsync(
                    "sp_SuspendStudent",
                    new
                    {
                        p_StudentId = studentId,
                        p_Reason = request.Reason,
                        p_Remarks = request.Remarks
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                await connection.ExecuteAsync(
                    "sp_UpdateUserStatusByLinkedEntity",
                    new { p_StaffId = (int?)null, p_StudentId = studentId, p_AdminId = (int?)null, p_IsActive = 0 },
                    transaction,
                    commandType: CommandType.StoredProcedure);

                transaction.Commit();
                return result >= 0;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }


        // =========================================================
        // ACTIVATE STUDENT
        // =========================================================

        public async Task<bool> ActivateAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                var result = await connection.ExecuteAsync(
                    "sp_ActivateStudent",
                    new
                    {
                        p_StudentId = studentId
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                await connection.ExecuteAsync(
                    "sp_UpdateUserStatusByLinkedEntity",
                    new { p_StaffId = (int?)null, p_StudentId = studentId, p_AdminId = (int?)null, p_IsActive = 1 },
                    transaction,
                    commandType: CommandType.StoredProcedure);

                transaction.Commit();
                return result >= 0;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }


        // =========================================================
        // RESET STUDENT PASSWORD
        // =========================================================

        public async Task<bool> ResetPasswordAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();

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
        // STUDENT DASHBOARD
        // =========================================================

        public async Task<StudentDashboardDto?> GetDashboardAsync(
            int studentId)
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QueryFirstOrDefaultAsync<StudentDashboardDto>(
                "sp_GetStudentDashboard",
                new
                {
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);
        }



        // =========================================================
        // SEARCH STUDENTS
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
            var connection = _context.Database.GetDbConnection();

            try
            {
                var result = await connection.QueryAsync<StudentListItemDto>(
                    "sp_SearchStudents",
                    new
                    {
                        p_Search = string.IsNullOrWhiteSpace(search)
                            ? null
                            : search.Trim(),

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
            catch
            {
                // Resilient EF Core Fallback
                var query = _context.Students
                    .Include(s => s.BoardNavigation)
                    .Include(s => s.AcademicYear)
                    .Include(s => s.AcademicLevelNavigation)
                    .Include(s => s.GroupNavigation)
                    .Include(s => s.SectionNavigation)
                    .Include(s => s.CampusNavigation)
                    .AsNoTracking()
                    .AsQueryable();

                if (campusId.HasValue && campusId.Value > 0)
                    query = query.Where(s => s.CampusId == campusId.Value);

                if (boardId.HasValue && boardId.Value > 0)
                    query = query.Where(s => s.BoardId == boardId.Value);

                if (academicYearId.HasValue && academicYearId.Value > 0)
                    query = query.Where(s => s.AcademicYearId == academicYearId.Value);

                if (academicLevelId.HasValue && academicLevelId.Value > 0)
                    query = query.Where(s => s.AcademicLevelId == academicLevelId.Value);

                if (groupId.HasValue && groupId.Value > 0)
                    query = query.Where(s => s.GroupId == groupId.Value);

                if (sectionId.HasValue && sectionId.Value > 0)
                    query = query.Where(s => s.SectionId == sectionId.Value);

                if (isActive.HasValue)
                    query = query.Where(s => s.IsActive == isActive.Value);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var sTerm = search.Trim();
                    query = query.Where(s =>
                        s.StudentName.Contains(sTerm) ||
                        s.AdmissionNo.Contains(sTerm) ||
                        (s.RollNo != null && s.RollNo.Contains(sTerm)) ||
                        (s.MobileNumber != null && s.MobileNumber.Contains(sTerm)) ||
                        (s.Email != null && s.Email.Contains(sTerm)));
                }

                return await query
                    .OrderBy(s => s.StudentName)
                    .Select(s => new StudentListItemDto
                    {
                        StudentId = s.StudentId,
                        AdmissionNo = s.AdmissionNo,
                        RollNo = s.RollNo ?? string.Empty,
                        StudentName = s.StudentName,
                        Photo = s.Photo,
                        Gender = s.Gender,
                        Email = s.Email,
                        MobileNumber = s.MobileNumber,
                        CampusId = s.CampusId,
                        CampusName = s.CampusNavigation != null ? s.CampusNavigation.CampusName : null,
                        BoardId = s.BoardId,
                        BoardName = s.BoardNavigation != null ? s.BoardNavigation.BoardName : null,
                        AcademicYearId = s.AcademicYearId,
                        AcademicYearName = s.AcademicYear != null ? s.AcademicYear.AcademicYearName : null,
                        AcademicLevelId = s.AcademicLevelId ?? 0,
                        AcademicLevelName = s.AcademicLevelNavigation != null ? s.AcademicLevelNavigation.LevelName : null,
                        GroupId = s.GroupId ?? 0,
                        GroupName = s.GroupNavigation != null ? s.GroupNavigation.GroupName : null,
                        SectionId = s.SectionId ?? 0,
                        SectionName = s.SectionNavigation != null ? s.SectionNavigation.SectionName : null,
                        IsActive = s.IsActive,
                        Status = s.Status,
                        CreatedAt = s.CreatedAt
                    })
                    .ToListAsync();
            }
        }


        // =========================================================
        // GET BY GROUP
        // =========================================================

        public async Task<List<StudentListItemDto>> GetByGroupAsync(
            int groupId)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetStudentsByGroupId",
                new
                {
                    p_GroupId = groupId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // GET BY SECTION
        // =========================================================

        public async Task<List<StudentListItemDto>> GetBySectionAsync(
            int sectionId)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetStudentsBySectionId",
                new
                {
                    p_SectionId = sectionId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        public async Task<List<StudentListItemDto>> GetActiveAsync()
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetActiveStudents",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }


        // =========================================================
        // CHECK EMAIL
        // =========================================================

        public async Task<bool> EmailExistsAsync(
            string email,
            int? excludeStudentId = null)
        {
            var connection = _context.Database.GetDbConnection();

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


        // =========================================================
        // CHECK MOBILE
        // =========================================================

        public async Task<bool> MobileExistsAsync(
            string mobile,
            int? excludeStudentId = null)
        {
            var connection = _context.Database.GetDbConnection();

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
        // COMMON STUDENT PHOTO & DOCUMENT UPDATES (CATEGORY B)
        // =========================================================

        public async Task<bool> UpdatePhotoPathAsync(int studentId, string photoPath)
        {
            var connection = _context.Database.GetDbConnection();
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

            var connection = _context.Database.GetDbConnection();
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
        // SELF-SERVICE PROFILE & CREDENTIALS
        // =========================================================

        public async Task<StudentSelfProfileResponseDto?> GetSelfProfileAsync(int studentId)
        {
            var connection = _context.Database.GetDbConnection();

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
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            var normalizedEmail = !string.IsNullOrWhiteSpace(request.Email) ? request.Email.Trim() : null;
            using var transaction = connection.BeginTransaction();
            try
            {
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
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    await connection.ExecuteAsync(
                        "sp_UpdateUserEmailByLinkedEntity",
                        new { p_StaffId = (int?)null, p_StudentId = studentId, p_Email = normalizedEmail },
                        transaction,
                        commandType: CommandType.StoredProcedure);
                }

                var parentMobile = !string.IsNullOrWhiteSpace(request.FatherMobile)
                    ? request.FatherMobile.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotherMobile)
                        ? request.MotherMobile.Trim()
                        : (!string.IsNullOrWhiteSpace(request.GuardianMobile)
                            ? request.GuardianMobile.Trim()
                            : null));

                await SyncParentUserMappingAsync(
                    connection,
                    transaction,
                    studentId,
                    request.ParentGuardianEmail,
                    parentFullName: null,
                    parentPhoneNumber: parentMobile,
                    relationshipType: "Parent");

                transaction.Commit();
                return rows > 0;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }

        // =========================================================
        // PARENT EMAIL & BRIDGING MAPPING SYNCHRONIZATION HELPER
        // =========================================================

        private async Task SyncParentUserMappingAsync(
            IDbConnection connection,
            IDbTransaction transaction,
            int studentId,
            string? rawNewParentEmail,
            string? parentFullName = null,
            string? parentPhoneNumber = null,
            string? relationshipType = "Parent")
        {
            var newParentEmail = !string.IsNullOrWhiteSpace(rawNewParentEmail)
                ? rawNewParentEmail.Trim().ToLowerInvariant()
                : null;

            // 1. Find existing parent mapping for this student
            const string findMappingSql = @"
                SELECT Id, ParentUserId, StudentId, RelationshipType, IsPrimaryContact 
                FROM ParentStudentMappings 
                WHERE StudentId = @StudentId 
                LIMIT 1;";

            var existingMapping = await connection.QueryFirstOrDefaultAsync<ParentStudentMapping>(
                findMappingSql, new { StudentId = studentId }, transaction: transaction);

            int? oldParentUserId = existingMapping?.ParentUserId;
            string? oldParentEmail = null;

            if (oldParentUserId.HasValue && oldParentUserId.Value > 0)
            {
                const string findUserSql = "SELECT Email FROM Users WHERE UserId = @UserId LIMIT 1;";
                oldParentEmail = await connection.QueryFirstOrDefaultAsync<string>(
                    findUserSql, new { UserId = oldParentUserId.Value }, transaction: transaction);
                oldParentEmail = oldParentEmail?.Trim().ToLowerInvariant();
            }

            // If both emails are empty or identical, no changes needed to parent account/mapping
            if (string.Equals(oldParentEmail, newParentEmail, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            // 2. Case A: Admin removed/cleared the Parent Email
            if (string.IsNullOrWhiteSpace(newParentEmail))
            {
                if (oldParentUserId.HasValue)
                {
                    // Remove mapping for this student
                    await connection.ExecuteAsync(
                        "DELETE FROM ParentStudentMappings WHERE StudentId = @StudentId;",
                        new { StudentId = studentId }, transaction: transaction);

                    // Check if old parent user has any other children remaining
                    var remainingChildren = await connection.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM ParentStudentMappings WHERE ParentUserId = @ParentUserId;",
                        new { ParentUserId = oldParentUserId.Value }, transaction: transaction);

                    if (remainingChildren == 0)
                    {
                        // Deactivate orphan parent user so they cannot log in with the old email
                        await connection.ExecuteAsync(
                            "UPDATE Users SET IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE UserId = @UserId;",
                            new { UserId = oldParentUserId.Value }, transaction: transaction);
                    }
                }
                return;
            }

            // 3. Case B: Admin set or changed the Parent Email to a new valid email
            // Check if a target user with new email already exists in Users
            var targetUser = await connection.QueryFirstOrDefaultAsync<User>(
                "SELECT UserId, Email, RoleId FROM Users WHERE LOWER(Email) = @Email LIMIT 1;",
                new { Email = newParentEmail }, transaction: transaction);

            if (targetUser != null)
            {
                // Target Parent user ALREADY EXISTS (e.g. Sibling Parent account)
                int targetUserId = targetUser.UserId;

                // Upsert / Re-link mapping for this student to target parent
                const string upsertMappingSql = @"
                    INSERT INTO ParentStudentMappings (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
                    VALUES (@ParentUserId, @StudentId, @RelationshipType, 1, CURRENT_TIMESTAMP(6))
                    ON DUPLICATE KEY UPDATE ParentUserId = VALUES(ParentUserId), RelationshipType = VALUES(RelationshipType);";

                await connection.ExecuteAsync(upsertMappingSql, new
                {
                    ParentUserId = targetUserId,
                    StudentId = studentId,
                    RelationshipType = string.IsNullOrWhiteSpace(relationshipType) ? "Parent" : relationshipType.Trim()
                }, transaction: transaction);

                // If old parent user was different, clean up old mapping & check for orphan
                if (oldParentUserId.HasValue && oldParentUserId.Value != targetUserId)
                {
                    await connection.ExecuteAsync(
                        "DELETE FROM ParentStudentMappings WHERE ParentUserId = @OldParentUserId AND StudentId = @StudentId;",
                        new { OldParentUserId = oldParentUserId.Value, StudentId = studentId }, transaction: transaction);

                    var remainingChildren = await connection.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM ParentStudentMappings WHERE ParentUserId = @ParentUserId;",
                        new { ParentUserId = oldParentUserId.Value }, transaction: transaction);

                    if (remainingChildren == 0)
                    {
                        // Deactivate the old orphan user so old credentials cannot log in
                        await connection.ExecuteAsync(
                            "UPDATE Users SET IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE UserId = @UserId;",
                            new { UserId = oldParentUserId.Value }, transaction: transaction);
                    }
                }
            }
            else
            {
                // Target user with new email DOES NOT EXIST in Users table
                // Check if old parent user existed and had ONLY this child (Single-child parent email edit / typo correction)
                if (oldParentUserId.HasValue)
                {
                    var oldChildCount = await connection.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM ParentStudentMappings WHERE ParentUserId = @ParentUserId;",
                        new { ParentUserId = oldParentUserId.Value }, transaction: transaction);

                    if (oldChildCount <= 1)
                    {
                        // Exactly 1 child -> UPDATE the existing Parent User's Email in place!
                        // This preserves their password, updates username to new email, and permanently revokes old email login.
                        const string updateEmailSql = @"
                            UPDATE Users 
                            SET Email = @Email,
                                FullName = COALESCE(@FullName, FullName),
                                PhoneNumber = COALESCE(@PhoneNumber, PhoneNumber),
                                UpdatedAt = CURRENT_TIMESTAMP(6)
                            WHERE UserId = @UserId;";

                        await connection.ExecuteAsync(updateEmailSql, new
                        {
                            Email = newParentEmail,
                            FullName = !string.IsNullOrWhiteSpace(parentFullName) ? parentFullName.Trim() : null,
                            PhoneNumber = !string.IsNullOrWhiteSpace(parentPhoneNumber) ? parentPhoneNumber.Trim() : null,
                            UserId = oldParentUserId.Value
                        }, transaction: transaction);

                        if (!string.IsNullOrWhiteSpace(relationshipType))
                        {
                            await connection.ExecuteAsync(
                                "UPDATE ParentStudentMappings SET RelationshipType = @RelationshipType WHERE StudentId = @StudentId;",
                                new { RelationshipType = relationshipType.Trim(), StudentId = studentId }, transaction: transaction);
                        }

                        return;
                    }
                }

                // Otherwise (Old parent had multiple children, or this is a brand new parent mapping):
                // 1. If old parent had multiple children, remove old mapping for this student
                if (oldParentUserId.HasValue)
                {
                    await connection.ExecuteAsync(
                        "DELETE FROM ParentStudentMappings WHERE ParentUserId = @OldParentUserId AND StudentId = @StudentId;",
                        new { OldParentUserId = oldParentUserId.Value, StudentId = studentId }, transaction: transaction);
                }

                // 2. Resolve 'Parent' role
                var parentRoleId = await connection.ExecuteScalarAsync<int?>(
                    "SELECT RoleId FROM Roles WHERE RoleName = 'Parent' LIMIT 1;", transaction: transaction) ?? 6;

                // 3. Create new Parent User
                var tempPassword = SecurePasswordGenerator.Generate(14);
                var passwordHash = PasswordHasher.HashPassword(tempPassword);

                var insertUserSql = @"
                    INSERT INTO Users (FullName, Email, PasswordHash, PhoneNumber, RoleId, StudentId, StaffId, AdminId, IsFirstLogin, IsActive, CreatedAt, UpdatedAt)
                    VALUES (@FullName, @Email, @PasswordHash, @PhoneNumber, @RoleId, NULL, NULL, NULL, 1, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));
                    SELECT LAST_INSERT_ID();";

                var newUserId = await connection.ExecuteScalarAsync<int>(insertUserSql, new
                {
                    FullName = !string.IsNullOrWhiteSpace(parentFullName) ? parentFullName.Trim() : "Parent / Guardian",
                    Email = newParentEmail,
                    PasswordHash = passwordHash,
                    PhoneNumber = parentPhoneNumber?.Trim() ?? string.Empty,
                    RoleId = parentRoleId
                }, transaction: transaction);

                // 4. Insert mapping in ParentStudentMappings
                const string insertMappingSql = @"
                    INSERT INTO ParentStudentMappings (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
                    VALUES (@ParentUserId, @StudentId, @RelationshipType, 1, CURRENT_TIMESTAMP(6));";

                await connection.ExecuteAsync(insertMappingSql, new
                {
                    ParentUserId = newUserId,
                    StudentId = studentId,
                    RelationshipType = string.IsNullOrWhiteSpace(relationshipType) ? "Parent" : relationshipType.Trim()
                }, transaction: transaction);
            }
        }
    }
}
