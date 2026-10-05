using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StudentAdmissionRepository : IStudentAdmissionRepository
    {
        private readonly AppDbContext _context;

        public StudentAdmissionRepository(AppDbContext context)
        {
            _context = context;
        }


        // =========================================================
        // GET ALL STUDENT ADMISSIONS
        // =========================================================
        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync(int? campusId = null)
        {
            var connection = _context.Database.GetDbConnection();

            try
            {
                var parameters = new DynamicParameters();
                if (campusId.HasValue && campusId.Value > 0)
                {
                    parameters.Add("p_CampusId", campusId.Value, DbType.Int32);
                }
                else
                {
                    parameters.Add("p_CampusId", null, DbType.Int32);
                }

                var result = (await connection.QueryAsync<StudentAdmissionResponseDto>(
                    "sp_GetAllStudentAdmissions",
                    parameters,
                    commandType: CommandType.StoredProcedure)).ToList();

                if (campusId.HasValue && campusId.Value > 0)
                {
                    result = result.Where(x => x.CampusId == campusId.Value).ToList();
                }

                return result;
            }
            catch
            {
                try
                {
                    var result = (await connection.QueryAsync<StudentAdmissionResponseDto>(
                        "sp_GetAllStudentAdmissions",
                        commandType: CommandType.StoredProcedure)).ToList();

                    if (campusId.HasValue && campusId.Value > 0)
                    {
                        result = result.Where(x => x.CampusId == campusId.Value).ToList();
                    }

                    return result;
                }
                catch
                {
                    const string sql = @"
                        SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, c.CampusName, CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
                        FROM StudentAdmissions sa
                        LEFT JOIN Boards b ON sa.BoardId = b.BoardId
                        LEFT JOIN AcademicYears ay ON sa.AcademicYearId = ay.AcademicYearId
                        LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
                        LEFT JOIN Staffs st ON sa.AdmittedById = st.Id
                        LEFT JOIN Campuses c ON sa.CampusId = c.CampusId
                        WHERE sa.IsActive = 1
                          AND (@CampusId IS NULL OR @CampusId = 0 OR sa.CampusId = @CampusId)
                        ORDER BY sa.AdmissionId DESC";

                    return await connection.QueryAsync<StudentAdmissionResponseDto>(
                        sql,
                        new { CampusId = campusId });
                }
            }
        }


        // =========================================================
        // GET STUDENT ADMISSION BY ID
        // =========================================================
        public async Task<StudentAdmissionResponseDto?> GetByIdAsync(
            int admissionId)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                "sp_GetStudentAdmissionById",
                new
                {
                    p_AdmissionId = admissionId
                },
                commandType: CommandType.StoredProcedure);

            if (result != null)
            {
                if (result.FeeStructureId.HasValue && string.IsNullOrWhiteSpace(result.FeeStructureName))
                {
                    result.FeeStructureName = await connection.QueryFirstOrDefaultAsync<string>(
                        "SELECT StructureName FROM FeeStructures WHERE FeeStructureId = @FeeStructureId LIMIT 1",
                        new { FeeStructureId = result.FeeStructureId.Value });
                }

                var componentIds = await connection.QueryAsync<int>(
                    "SELECT FeeStructureComponentId FROM AdmissionFeeSelections WHERE AdmissionId = @AdmissionId AND IsSelected = 1",
                    new { AdmissionId = admissionId });

                result.SelectedFeeStructureComponentIds = componentIds.ToList();

                result.HostelBlock = !string.IsNullOrWhiteSpace(result.HostelBlock) ? result.HostelBlock : result.FetchedHostelBlock;
                result.HostelRoom = !string.IsNullOrWhiteSpace(result.HostelRoom) ? result.HostelRoom : result.FetchedHostelRoom;
                result.HostelBed = !string.IsNullOrWhiteSpace(result.HostelBed) ? result.HostelBed : result.FetchedHostelBed;
                result.BusRoute = !string.IsNullOrWhiteSpace(result.BusRoute) ? result.BusRoute : result.FetchedBusRoute;
                result.PickupPoint = !string.IsNullOrWhiteSpace(result.PickupPoint) ? result.PickupPoint : result.FetchedPickupPoint;
            }

            return result;
        }

        // =========================================================
        // GET CREATED STUDENT BY ADMISSION ID
        // =========================================================
        public async Task<Student?> GetStudentByAdmissionIdAsync(
            int admissionId,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            var conn = connection ?? _context.Database.GetDbConnection();
            const string sql = @"
                SELECT * FROM Students 
                WHERE AdmissionId = @AdmissionId 
                ORDER BY StudentId DESC 
                LIMIT 1";
            return await conn.QueryFirstOrDefaultAsync<Student>(sql, new { AdmissionId = admissionId }, transaction: transaction);
        }


        // =========================================================
        // CREATE STUDENT ADMISSION
        // =========================================================
        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request,
            string? studentPhoto)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                "sp_CreateAdmission",
                new
                {
                    p_AdmissionDate = request.AdmissionDate,
                    p_AdmissionType = request.AdmissionType,
                    p_AdmissionQuota = request.AdmissionQuota,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_FirstName = request.FirstName,
                    p_LastName = request.LastName,
                    p_Gender = request.Gender,
                    p_DateOfBirth = request.DateOfBirth,
                    p_BloodGroup = request.BloodGroup,
                    p_StudentEmail = request.StudentEmail,
                    p_StudentMobileNumber = request.StudentMobileNumber,
                    p_StudentPhoto = studentPhoto,
                    p_AadhaarNumber = request.AadhaarNumber,
                    p_Nationality = request.Nationality,
                    p_Religion = request.Religion,
                    p_Category = request.Category,
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
                    p_FeeStructureId = request.FeeStructureId,
                    p_PaymentPlan = request.PaymentPlan,
                    p_ScholarshipStatus = request.ScholarshipStatus,
                    p_HouseDoorNumber = request.HouseDoorNumber,
                    p_StreetVillage = request.StreetVillage,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_PreviousSchool = request.PreviousSchool,
                    p_PreviousBoard = request.PreviousBoard,
                    p_PreviousPercentage = request.PreviousPercentage,
                    p_PreviousYearOfPassing = request.PreviousYearOfPassing,
                    p_Medium = request.Medium,
                    p_SecondLanguage = request.SecondLanguage,
                    p_StudentType = request.StudentType,
                    p_TransportRequired = request.TransportRequired == true ? "Yes" : "No",
                    p_BusRoute = request.BusRoute,
                    p_PickupPoint = request.PickupPoint,
                    p_HostelBlock = request.HostelBlock,
                    p_HostelRoom = request.HostelRoom,
                    p_HostelBed = request.HostelBed,
                    p_HallTicketNumber = request.HallTicketNumber,
                    p_AdmittedById = request.AdmittedById
                },
                commandType: CommandType.StoredProcedure);

            if (result == null)
            {
                throw new Exception(
                    "Student admission could not be created.");
            }

            // Force override the Admission Number with the one generated/provided by the frontend
            // This ensures context-isolated sequences (Board/AcademicYear) are saved correctly
            // instead of whatever the legacy SP generated internally.
            if (result.AdmissionId > 0 && !string.IsNullOrWhiteSpace(request.AdmissionNo))
            {
                await connection.ExecuteAsync(
                    "UPDATE `StudentAdmissions` SET `AdmissionNo` = @AdmNo WHERE `AdmissionId` = @AdmId",
                    new { AdmNo = request.AdmissionNo.Trim(), AdmId = result.AdmissionId });
                
                result.AdmissionNo = request.AdmissionNo.Trim();
            }

            if (result.AdmissionId > 0)
            {
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

                const string updateSql = @"
                    UPDATE StudentAdmissions
                    SET CampusId = COALESCE(@CampusId, CampusId),
                        StudentType = COALESCE(@StudentType, StudentType),
                        TransportRequired = COALESCE(@TransportRequired, TransportRequired),
                        BusType = COALESCE(@BusType, BusType),
                        RouteId = COALESCE(@RouteId, RouteId),
                        BusRoute = COALESCE(@BusRoute, BusRoute),
                        PickupPointId = COALESCE(@PickupPointId, PickupPointId),
                        PickupPoint = COALESCE(@PickupPoint, PickupPoint),
                        HostelId = COALESCE(@HostelId, HostelId),
                        HostelBlock = COALESCE(@HostelBlock, HostelBlock),
                        RoomId = COALESCE(@RoomId, RoomId),
                        HostelRoom = COALESCE(@HostelRoom, HostelRoom),
                        BedId = COALESCE(@BedId, BedId),
                        HostelBed = COALESCE(@HostelBed, HostelBed),
                        HallTicketNumber = COALESCE(@HallTicketNumber, HallTicketNumber)
                    WHERE AdmissionId = @AdmissionId";

                await connection.ExecuteAsync(updateSql, new
                {
                    AdmissionId = result.AdmissionId,
                    request.CampusId,
                    request.StudentType,
                    TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                    request.BusType,
                    request.RouteId,
                    BusRoute = busRoute,
                    request.PickupPointId,
                    PickupPoint = pickupPoint,
                    request.HostelId,
                    HostelBlock = hostelBlock,
                    request.RoomId,
                    HostelRoom = hostelRoom,
                    request.BedId,
                    HostelBed = hostelBed,
                    request.HallTicketNumber
                });

                result.CampusId = request.CampusId ?? result.CampusId;

                result.StudentType = request.StudentType ?? result.StudentType;
                result.TransportRequired = request.TransportRequired ?? result.TransportRequired;
                result.BusType = request.BusType ?? result.BusType;
                result.RouteId = request.RouteId ?? result.RouteId;
                result.BusRoute = busRoute ?? result.BusRoute;
                result.PickupPointId = request.PickupPointId ?? result.PickupPointId;
                result.PickupPoint = pickupPoint ?? result.PickupPoint;
                result.HostelId = request.HostelId ?? result.HostelId;
                result.HostelBlock = hostelBlock ?? result.HostelBlock;
                result.RoomId = request.RoomId ?? result.RoomId;
                result.HostelRoom = hostelRoom ?? result.HostelRoom;
                result.BedId = request.BedId ?? result.BedId;
                result.HostelBed = hostelBed ?? result.HostelBed;
                result.HallTicketNumber = request.HallTicketNumber ?? result.HallTicketNumber;
            }

            if (result != null)
            {
                result.FeeStructureId ??= request.FeeStructureId;
                result.PaymentPlan ??= request.PaymentPlan;
            }

            return result!;
        }


        // =========================================================
        // UPDATE STUDENT ADMISSION
        // =========================================================
        public async Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                "sp_UpdateStudentAdmission",
                new
                {
                    p_AdmissionId = admissionId,
                    p_AdmissionDate = request.AdmissionDate,
                    p_AdmissionType = request.AdmissionType,
                    p_AdmissionQuota = request.AdmissionQuota,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_FirstName = request.FirstName,
                    p_LastName = request.LastName,
                    p_Gender = request.Gender,
                    p_DateOfBirth = request.DateOfBirth,
                    p_BloodGroup = request.BloodGroup,
                    p_StudentEmail = request.StudentEmail,
                    p_StudentMobileNumber = request.StudentMobileNumber,
                    p_StudentPhoto = studentPhoto,
                    p_AadhaarNumber = request.AadhaarNumber,
                    p_Nationality = request.Nationality,
                    p_Religion = request.Religion,
                    p_Category = request.Category,
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
                    p_FeeStructureId = request.FeeStructureId,
                    p_PaymentPlan = request.PaymentPlan,
                    p_ScholarshipStatus = request.ScholarshipStatus,
                    p_HouseDoorNumber = request.HouseDoorNumber,
                    p_StreetVillage = request.StreetVillage,
                    p_City = request.City,
                    p_District = request.District,
                    p_State = request.State,
                    p_Pincode = request.Pincode,
                    p_PreviousSchool = request.PreviousSchool,
                    p_PreviousBoard = request.PreviousBoard,
                    p_PreviousPercentage = request.PreviousPercentage,
                    p_PreviousYearOfPassing = request.PreviousYearOfPassing,
                    p_Medium = request.Medium,
                    p_SecondLanguage = request.SecondLanguage,
                    p_StudentType = request.StudentType,
                    p_TransportRequired = request.TransportRequired == true ? "Yes" : "No",
                    p_BusRoute = request.BusRoute,
                    p_PickupPoint = request.PickupPoint,
                    p_HostelBlock = request.HostelBlock,
                    p_HostelRoom = request.HostelRoom,
                    p_HostelBed = request.HostelBed,
                    p_HallTicketNumber = request.HallTicketNumber
                },
                commandType: CommandType.StoredProcedure);

            if (result != null)
            {
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

                const string updateSql = @"
                    UPDATE StudentAdmissions
                    SET CampusId = COALESCE(@CampusId, CampusId),
                        StudentType = COALESCE(@StudentType, StudentType),
                        TransportRequired = COALESCE(@TransportRequired, TransportRequired),
                        BusType = COALESCE(@BusType, BusType),
                        RouteId = COALESCE(@RouteId, RouteId),
                        BusRoute = COALESCE(@BusRoute, BusRoute),
                        PickupPointId = COALESCE(@PickupPointId, PickupPointId),
                        PickupPoint = COALESCE(@PickupPoint, PickupPoint),
                        HostelId = COALESCE(@HostelId, HostelId),
                        HostelBlock = COALESCE(@HostelBlock, HostelBlock),
                        RoomId = COALESCE(@RoomId, RoomId),
                        HostelRoom = COALESCE(@HostelRoom, HostelRoom),
                        BedId = COALESCE(@BedId, BedId),
                        HostelBed = COALESCE(@HostelBed, HostelBed),
                        HallTicketNumber = COALESCE(@HallTicketNumber, HallTicketNumber)
                    WHERE AdmissionId = @AdmissionId";

                await connection.ExecuteAsync(updateSql, new
                {
                    AdmissionId = admissionId,
                    request.CampusId,
                    request.StudentType,
                    TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                    request.BusType,
                    request.RouteId,
                    BusRoute = busRoute,
                    request.PickupPointId,
                    PickupPoint = pickupPoint,
                    request.HostelId,
                    HostelBlock = hostelBlock,
                    request.RoomId,
                    HostelRoom = hostelRoom,
                    request.BedId,
                    HostelBed = hostelBed,
                    request.HallTicketNumber
                });

                result.CampusId = request.CampusId ?? result.CampusId;

                result.StudentType = request.StudentType ?? result.StudentType;
                result.TransportRequired = request.TransportRequired ?? result.TransportRequired;
                result.BusType = request.BusType ?? result.BusType;
                result.RouteId = request.RouteId ?? result.RouteId;
                result.BusRoute = busRoute ?? result.BusRoute;
                result.PickupPointId = request.PickupPointId ?? result.PickupPointId;
                result.PickupPoint = pickupPoint ?? result.PickupPoint;
                result.HostelId = request.HostelId ?? result.HostelId;
                result.HostelBlock = hostelBlock ?? result.HostelBlock;
                result.RoomId = request.RoomId ?? result.RoomId;
                result.HostelRoom = hostelRoom ?? result.HostelRoom;
                result.BedId = request.BedId ?? result.BedId;
                result.HostelBed = hostelBed ?? result.HostelBed;
                result.HallTicketNumber = request.HallTicketNumber ?? result.HallTicketNumber;
                result.FeeStructureId ??= request.FeeStructureId;
                result.PaymentPlan ??= request.PaymentPlan;

                // Sync changes to linked Students and Users records if this admission has already been approved/created
                await SyncApprovedStudentFromAdmissionAsync(
                    connection,
                    admissionId,
                    request,
                    studentPhoto,
                    busRoute,
                    pickupPoint,
                    hostelBlock,
                    hostelRoom,
                    hostelBed);
            }

            return result;
        }


        // =========================================================
        // VERIFY ADMISSION
        // =========================================================
        public async Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var result =
                await connection.QuerySingleOrDefaultAsync<int>(
                    "sp_VerifyStudentAdmission",
                    new
                    {
                        p_AdmissionId =
                            request.AdmissionId
                    },
                    commandType: CommandType.StoredProcedure);

            return result > 0;
        }


        // =========================================================
        // APPROVE ADMISSION
        // =========================================================
        public async Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request,
            string? passwordHash = null,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            var conn = connection ?? _context.Database.GetDbConnection();

            var result =
                await conn.QuerySingleOrDefaultAsync<int>(
                    "sp_ApproveStudentAdmission",
                    new
                    {
                        p_AdmissionId =
                            request.AdmissionId,
                        p_PasswordHash = passwordHash ?? string.Empty
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

            return result > 0;
        }


        // =========================================================
        // REJECT ADMISSION
        // =========================================================
        public async Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var result =
                await connection.QuerySingleOrDefaultAsync<int>(
                    "sp_RejectStudentAdmission",
                    new
                    {
                        p_AdmissionId =
                            request.AdmissionId,

                        p_RejectionReason =
                            request.RejectionReason,

                        p_Remarks =
                            request.Remarks
                    },
                    commandType: CommandType.StoredProcedure);

            return result > 0;
        }


        // =========================================================
        // DELETE / SOFT DELETE
        // =========================================================
        public async Task<bool> DeleteAsync(
            int admissionId)
        {
            var connection = _context.Database.GetDbConnection();

            try
            {
                var result =
                    await connection.QuerySingleOrDefaultAsync<int>(
                        "sp_DeleteStudentAdmission",
                        new
                        {
                            p_AdmissionId = admissionId
                        },
                        commandType: CommandType.StoredProcedure);

                return result > 0;
            }
            catch (MySqlConnector.MySqlException ex) when (ex.Message.Contains("does not exist"))
            {
                var rows = await connection.ExecuteAsync(
                    "DELETE FROM StudentAdmissions WHERE AdmissionId = @AdmissionId",
                    new { AdmissionId = admissionId });
                return rows > 0;
            }
        }


        // =========================================================
        // GENERATE ADMISSION NUMBER
        // =========================================================
        public async Task<string> GenerateAdmissionNumberAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QuerySingleAsync<string>(
                "sp_GenerateAdmissionNumber",
                commandType: CommandType.StoredProcedure);
        }


        public async Task<int> GetActualAdmissionCountAsync(int campusId, int boardId, int academicYearId)
        {
            var connection = _context.Database.GetDbConnection();
            return await connection.ExecuteScalarAsync<int>(
                "sp_GetMaxAdmissionSequence",
                new { p_CampusId = campusId, p_BoardId = boardId, p_AcademicYearId = academicYearId },
                commandType: CommandType.StoredProcedure
            );
        }

        public async Task SyncAdmissionSequenceAsync(int campusId, int boardId, int academicYearId, int correctSequence)
        {
            var connection = _context.Database.GetDbConnection();
            string seriesCode = $"ADMISSION_NO|B:{boardId}_AY:{academicYearId}";
            
            await connection.ExecuteAsync(
                "sp_SyncAdmissionSequence",
                new { p_CampusId = campusId, p_SeriesCode = seriesCode, p_CorrectSequence = correctSequence },
                commandType: CommandType.StoredProcedure
            );
        }

        // =========================================================
        // SINGLE SECTION ALLOCATION
        // =========================================================
        public async Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var result =
                await connection.QuerySingleOrDefaultAsync<int>(
                    "sp_AllocateStudentSection",
                    new
                    {
                        p_AdmissionId =
                            request.AdmissionId,

                        p_SectionId =
                            request.SectionId
                    },
                    commandType: CommandType.StoredProcedure);

            return result > 0;
        }


        // =========================================================
        // BULK SECTION ALLOCATION
        // =========================================================
        public async Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var totalAllocated = 0;

            foreach (var admissionId in request.AdmissionIds)
            {
                var result =
                    await connection.QuerySingleOrDefaultAsync<int>(
                        "sp_AllocateStudentSection",
                        new
                        {
                            p_AdmissionId =
                                admissionId,

                            p_SectionId =
                                request.SectionId
                        },
                        commandType: CommandType.StoredProcedure);

                if (result > 0)
                {
                    totalAllocated++;
                }
            }

            return totalAllocated;
        }
        //options check box//
        public async Task<int> SaveAdmissionFeeSelectionsAsync(
    int admissionId,
    SaveAdmissionFeeSelectionsRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var selectedIds =
                request.SelectedFeeStructureComponentIds
                    ?? new List<int>();

            var json =
                System.Text.Json.JsonSerializer.Serialize(selectedIds);

            var result =
                await connection.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_SaveAdmissionFeeSelections",
                    new
                    {
                        p_AdmissionId = admissionId,
                        p_SelectedComponentIds = json
                    },
                    commandType: CommandType.StoredProcedure);

            return result?.SelectedOptionalFees ?? 0;
        }

        // =========================================================
        // BULK ROLL NUMBER ALLOCATION
        // =========================================================
        public async Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request)
        {
            var connection = _context.Database.GetDbConnection();

            var totalAllocated = 0;

            var rollNumber =
                request.StartingRollNumber;

            foreach (var admissionId in request.AdmissionIds)
            {
                var result =
                    await connection.QuerySingleOrDefaultAsync<int>(
                        "sp_AllocateStudentRollNumber",
                        new
                        {
                            p_AdmissionId =
                                admissionId,

                            p_SectionId =
                                request.SectionId,

                            p_RollNo =
                                rollNumber.ToString()
                        },
                        commandType: CommandType.StoredProcedure);

                if (result > 0)
                {
                    totalAllocated++;
                }

                rollNumber++;
            }

            return totalAllocated;
        }

        // =========================================================
        // SYNC APPROVED STUDENT & USER FROM ADMISSION
        // =========================================================
        private async Task SyncApprovedStudentFromAdmissionAsync(
            IDbConnection connection,
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto,
            string? busRoute,
            string? pickupPoint,
            string? hostelBlock,
            string? hostelRoom,
            string? hostelBed)
        {
            // 1. Check if an approved/created student exists for this admission
            var student = await connection.QueryFirstOrDefaultAsync<Student>(
                "SELECT StudentId, StudentName, Email FROM Students WHERE AdmissionId = @AdmissionId LIMIT 1;",
                new { AdmissionId = admissionId });

            if (student == null)
            {
                return;
            }

            // 2. Build StudentName from FirstName and LastName
            string? studentName = null;
            if (!string.IsNullOrWhiteSpace(request.FirstName))
            {
                studentName = $"{request.FirstName.Trim()} {request.LastName?.Trim()}".Trim();
            }

            // 3. Build Address from HouseDoorNumber and StreetVillage
            string? address = null;
            if (!string.IsNullOrWhiteSpace(request.HouseDoorNumber) || !string.IsNullOrWhiteSpace(request.StreetVillage))
            {
                address = string.Join(", ", new[] { request.HouseDoorNumber?.Trim(), request.StreetVillage?.Trim() }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
            }

            // 4. Update Students table
            const string updateStudentSql = @"
                UPDATE Students
                SET
                    StudentName = COALESCE(@StudentName, StudentName),
                    Photo = COALESCE(@Photo, Photo),
                    Gender = COALESCE(@Gender, Gender),
                    DateOfBirth = COALESCE(@DateOfBirth, DateOfBirth),
                    BloodGroup = COALESCE(@BloodGroup, BloodGroup),
                    Email = COALESCE(@Email, Email),
                    MobileNumber = COALESCE(@MobileNumber, MobileNumber),
                    AadhaarNumber = COALESCE(@AadhaarNumber, AadhaarNumber),
                    Nationality = COALESCE(@Nationality, Nationality),
                    Religion = COALESCE(@Religion, Religion),
                    Category = COALESCE(@Category, Category),
                    Address = COALESCE(@Address, Address),
                    City = COALESCE(@City, City),
                    District = COALESCE(@District, District),
                    State = COALESCE(@State, State),
                    Pincode = COALESCE(@Pincode, Pincode),
                    BoardId = COALESCE(@BoardId, BoardId),
                    AcademicYearId = COALESCE(@AcademicYearId, AcademicYearId),
                    AcademicLevelId = COALESCE(@AcademicLevelId, AcademicLevelId),
                    GroupId = COALESCE(@GroupId, GroupId),
                    ProgramId = COALESCE(@ProgramId, ProgramId),
                    Medium = COALESCE(@Medium, Medium),
                    SecondLanguage = COALESCE(@SecondLanguage, SecondLanguage),
                    PreviousSchool = COALESCE(@PreviousSchool, PreviousSchool),
                    PreviousBoard = COALESCE(@PreviousBoard, PreviousBoard),
                    PreviousYearOfPassing = COALESCE(@PreviousYearOfPassing, PreviousYearOfPassing),
                    PreviousPercentage = COALESCE(@PreviousPercentage, PreviousPercentage),
                    PreviousHallTicketNumber = COALESCE(@HallTicketNumber, PreviousHallTicketNumber),
                    FatherName = COALESCE(@FatherName, FatherName),
                    FatherOccupation = COALESCE(@FatherOccupation, FatherOccupation),
                    FatherMobile = COALESCE(@FatherMobile, FatherMobile),
                    MotherName = COALESCE(@MotherName, MotherName),
                    MotherOccupation = COALESCE(@MotherOccupation, MotherOccupation),
                    MotherMobile = COALESCE(@MotherMobile, MotherMobile),
                    GuardianName = COALESCE(@GuardianName, GuardianName),
                    GuardianMobile = COALESCE(@GuardianMobile, GuardianMobile),
                    ParentGuardianEmail = COALESCE(@ParentGuardianEmail, ParentGuardianEmail),
                    AnnualIncome = COALESCE(@AnnualIncome, AnnualIncome),
                    StudentType = COALESCE(@StudentType, StudentType),
                    TransportRequired = COALESCE(@TransportRequired, TransportRequired),
                    BusType = COALESCE(@BusType, BusType),
                    RouteId = COALESCE(@RouteId, RouteId),
                    BusRoute = COALESCE(@BusRoute, BusRoute),
                    PickupPointId = COALESCE(@PickupPointId, PickupPointId),
                    PickupPoint = COALESCE(@PickupPoint, PickupPoint),
                    HostelId = COALESCE(@HostelId, HostelId),
                    HostelBlock = COALESCE(@HostelBlock, HostelBlock),
                    RoomId = COALESCE(@RoomId, RoomId),
                    HostelRoom = COALESCE(@HostelRoom, HostelRoom),
                    BedId = COALESCE(@BedId, BedId),
                    HostelBed = COALESCE(@HostelBed, HostelBed),
                    HallTicketNumber = COALESCE(@HallTicketNumber, HallTicketNumber),
                    CampusId = COALESCE(@CampusId, CampusId),
                    FeeStructureId = COALESCE(@FeeStructureId, FeeStructureId),
                    PaymentPlan = COALESCE(@PaymentPlan, PaymentPlan),
                    ScholarshipStatus = COALESCE(@ScholarshipStatus, ScholarshipStatus),
                    UpdatedAt = CURRENT_TIMESTAMP(6)
                WHERE StudentId = @StudentId;";

            await connection.ExecuteAsync(updateStudentSql, new
            {
                StudentId = student.StudentId,
                StudentName = studentName,
                Photo = studentPhoto,
                Gender = request.Gender,
                DateOfBirth = request.DateOfBirth,
                BloodGroup = request.BloodGroup,
                Email = request.StudentEmail,
                MobileNumber = request.StudentMobileNumber,
                AadhaarNumber = request.AadhaarNumber,
                Nationality = request.Nationality,
                Religion = request.Religion,
                Category = request.Category,
                Address = address,
                City = request.City,
                District = request.District,
                State = request.State,
                Pincode = request.Pincode,
                BoardId = request.BoardId,
                AcademicYearId = request.AcademicYearId,
                AcademicLevelId = request.AcademicLevelId,
                GroupId = request.GroupId,
                ProgramId = request.ProgramId,
                Medium = request.Medium,
                SecondLanguage = request.SecondLanguage,
                PreviousSchool = request.PreviousSchool,
                PreviousBoard = request.PreviousBoard,
                PreviousYearOfPassing = request.PreviousYearOfPassing,
                PreviousPercentage = request.PreviousPercentage,
                HallTicketNumber = request.HallTicketNumber,
                FatherName = request.FatherName,
                FatherOccupation = request.FatherOccupation,
                FatherMobile = request.FatherMobile,
                MotherName = request.MotherName,
                MotherOccupation = request.MotherOccupation,
                MotherMobile = request.MotherMobile,
                GuardianName = request.GuardianName,
                GuardianMobile = request.GuardianMobile,
                ParentGuardianEmail = request.ParentGuardianEmail,
                AnnualIncome = request.AnnualIncome,
                StudentType = request.StudentType,
                TransportRequired = request.TransportRequired.HasValue ? (request.TransportRequired.Value ? 1 : 0) : (int?)null,
                BusType = request.BusType,
                RouteId = request.RouteId,
                BusRoute = busRoute,
                PickupPointId = request.PickupPointId,
                PickupPoint = pickupPoint,
                HostelId = request.HostelId,
                HostelBlock = hostelBlock,
                RoomId = request.RoomId,
                HostelRoom = hostelRoom,
                BedId = request.BedId,
                HostelBed = hostelBed,
                CampusId = request.CampusId,
                FeeStructureId = request.FeeStructureId,
                PaymentPlan = request.PaymentPlan,
                ScholarshipStatus = request.ScholarshipStatus
            });

            // 5. Update Users table for Student Login / Display Name
            if (!string.IsNullOrWhiteSpace(studentName) || !string.IsNullOrWhiteSpace(request.StudentEmail) || !string.IsNullOrWhiteSpace(request.StudentMobileNumber))
            {
                const string updateUsersSql = @"
                    UPDATE Users
                    SET FullName = COALESCE(@FullName, FullName),
                        Email = COALESCE(@Email, Email),
                        PhoneNumber = COALESCE(@PhoneNumber, PhoneNumber),
                        UpdatedAt = CURRENT_TIMESTAMP(6)
                    WHERE StudentId = @StudentId;";

                await connection.ExecuteAsync(updateUsersSql, new
                {
                    FullName = !string.IsNullOrWhiteSpace(studentName) ? studentName.Trim() : null,
                    Email = !string.IsNullOrWhiteSpace(request.StudentEmail) ? request.StudentEmail.Trim() : null,
                    PhoneNumber = !string.IsNullOrWhiteSpace(request.StudentMobileNumber) ? request.StudentMobileNumber.Trim() : null,
                    StudentId = student.StudentId
                });
            }
        }
    }
}

