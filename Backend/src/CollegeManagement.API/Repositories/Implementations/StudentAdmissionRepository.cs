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
        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync()
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QueryAsync<StudentAdmissionResponseDto>(
                "sp_GetAllStudentAdmissions",
                commandType: CommandType.StoredProcedure);
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

            var result =
                await connection.QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                    "sp_CreateAdmission",
                    new
                    {
                        // -------------------------------------------------
                        // ADMISSION
                        // -------------------------------------------------
                        p_AdmissionDate = request.AdmissionDate,
                        p_AdmissionType = request.AdmissionType,
                        p_AdmissionQuota = request.AdmissionQuota,


                        // -------------------------------------------------
                        // ACADEMIC
                        // -------------------------------------------------
                        p_BoardId = request.BoardId,
                        p_AcademicYearId = request.AcademicYearId,
                        p_AcademicLevelId = request.AcademicLevelId,
                        p_GroupId = request.GroupId,
                        p_ProgramId = request.ProgramId,


                        // -------------------------------------------------
                        // STUDENT
                        // -------------------------------------------------
                        p_FirstName = request.FirstName,
                        p_LastName = request.LastName,
                        p_Gender = request.Gender,
                        p_DateOfBirth = request.DateOfBirth,
                        p_BloodGroup = request.BloodGroup,

                        p_StudentEmail = request.StudentEmail,
                        p_StudentMobileNumber =
                            request.StudentMobileNumber,

                        p_StudentPhoto = studentPhoto,


                        // -------------------------------------------------
                        // PERSONAL
                        // -------------------------------------------------
                        p_AadhaarNumber = request.AadhaarNumber,
                        p_Nationality = request.Nationality,
                        p_Religion = request.Religion,
                        p_Category = request.Category,


                        // -------------------------------------------------
                        // FATHER
                        // -------------------------------------------------
                        p_FatherName = request.FatherName,
                        p_FatherOccupation =
                            request.FatherOccupation,
                        p_FatherMobile =
                            request.FatherMobile,
                        p_FatherEmail =
                            request.FatherEmail,


                        // -------------------------------------------------
                        // MOTHER
                        // -------------------------------------------------
                        p_MotherName = request.MotherName,
                        p_MotherOccupation =
                            request.MotherOccupation,
                        p_MotherMobile =
                            request.MotherMobile,
                        p_MotherEmail =
                            request.MotherEmail,


                        // -------------------------------------------------
                        // GUARDIAN
                        // -------------------------------------------------
                        p_GuardianName = request.GuardianName,
                        p_GuardianMobile =
                            request.GuardianMobile,
                        p_GuardianEmail =
                            request.GuardianEmail,


                        // -------------------------------------------------
                        // OTHER
                        // -------------------------------------------------
                        p_AnnualIncome =
                            request.AnnualIncome,
                        p_FeeStructureId = request.FeeStructureId,
                        p_PaymentPlan = request.PaymentPlan,

                        p_ScholarshipStatus =
                            request.ScholarshipStatus,


                        // -------------------------------------------------
                        // ADDRESS
                        // -------------------------------------------------
                      p_HouseDoorNumber = request.HouseDoorNumber,
                        p_StreetVillage = request.StreetVillage,

        
                        p_City = request.City,
                        p_District = request.District,
                        p_State = request.State,
                        p_Pincode = request.Pincode,


                        // -------------------------------------------------
                        // PREVIOUS EDUCATION
                        // -------------------------------------------------
                        p_PreviousSchool =
                            request.PreviousSchool,

                        p_PreviousBoard =
                            request.PreviousBoard,

                        p_PreviousPercentage =
                            request.PreviousPercentage,

                        p_PreviousYearOfPassing =
                            request.PreviousYearOfPassing,


                        // -------------------------------------------------
                        // OTHER ACADEMIC DETAILS
                        // -------------------------------------------------
                        p_Medium = request.Medium,

                        p_SecondLanguage =
                            request.SecondLanguage
                    },
                    commandType: CommandType.StoredProcedure);

            if (result == null)
            {
                throw new Exception(
                    "Student admission could not be created.");
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
                    SET StudentType = COALESCE(@StudentType, StudentType),
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

            var result = await connection
                .QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                    "sp_UpdateStudentAdmission",
                    new
                    {
                        p_AdmissionId = admissionId,


                        // -------------------------------------------------
                        // ADMISSION
                        // -------------------------------------------------
                        p_AdmissionDate =
                            request.AdmissionDate,

                        p_AdmissionType =
                            request.AdmissionType,

                        p_AdmissionQuota =
                            request.AdmissionQuota,


                        // -------------------------------------------------
                        // ACADEMIC
                        // -------------------------------------------------
                        p_BoardId =
                            request.BoardId,

                        p_AcademicYearId =
                            request.AcademicYearId,

                        p_AcademicLevelId =
                            request.AcademicLevelId,

                        p_GroupId =
                            request.GroupId,

                        p_ProgramId =
                            request.ProgramId,


                        // -------------------------------------------------
                        // STUDENT
                        // -------------------------------------------------
                        p_FirstName =
                            request.FirstName,

                        p_LastName =
                            request.LastName,

                        p_Gender =
                            request.Gender,

                        p_DateOfBirth =
                            request.DateOfBirth,

                        p_BloodGroup =
                            request.BloodGroup,

                        p_StudentEmail =
                            request.StudentEmail,

                        p_StudentMobileNumber =
                            request.StudentMobileNumber,

                        p_StudentPhoto =
                            studentPhoto,


                        // -------------------------------------------------
                        // PERSONAL
                        // -------------------------------------------------
                        p_AadhaarNumber =
                            request.AadhaarNumber,

                        p_Nationality =
                            request.Nationality,

                        p_Religion =
                            request.Religion,

                        p_Category =
                            request.Category,


                        // -------------------------------------------------
                        // FATHER
                        // -------------------------------------------------
                        p_FatherName =
                            request.FatherName,

                        p_FatherOccupation =
                            request.FatherOccupation,

                        p_FatherMobile =
                            request.FatherMobile,

                        p_FatherEmail =
                            request.FatherEmail,


                        // -------------------------------------------------
                        // MOTHER
                        // -------------------------------------------------
                        p_MotherName =
                            request.MotherName,

                        p_MotherOccupation =
                            request.MotherOccupation,

                        p_MotherMobile =
                            request.MotherMobile,

                        p_MotherEmail =
                            request.MotherEmail,


                        // -------------------------------------------------
                        // GUARDIAN
                        // -------------------------------------------------
                        p_GuardianName =
                            request.GuardianName,

                        p_GuardianMobile =
                            request.GuardianMobile,

                        p_GuardianEmail =
                            request.GuardianEmail,


                        // -------------------------------------------------
                        // OTHER
                        // -------------------------------------------------
                        p_AnnualIncome =
                            request.AnnualIncome,
                        p_FeeStructureId = request.FeeStructureId,
                        p_PaymentPlan = request.PaymentPlan,

                        p_ScholarshipStatus =
                            request.ScholarshipStatus,


                        // -------------------------------------------------
                        // ADDRESS
                        // -------------------------------------------------
                        p_HouseDoorNumber = request.HouseDoorNumber,
                        p_StreetVillage = request.StreetVillage,
                        p_City =
                            request.City,

                        p_District =
                            request.District,

                        p_State =
                            request.State,

                        p_Pincode =
                            request.Pincode,


                        // -------------------------------------------------
                        // PREVIOUS EDUCATION
                        // -------------------------------------------------
                        p_PreviousSchool =
                            request.PreviousSchool,

                        p_PreviousBoard =
                            request.PreviousBoard,

                        p_PreviousPercentage =
                            request.PreviousPercentage,

                        p_PreviousYearOfPassing =
                            request.PreviousYearOfPassing,


                        // -------------------------------------------------
                        // OTHER ACADEMIC
                        // -------------------------------------------------
                        p_Medium =
                            request.Medium,

                        p_SecondLanguage =
                            request.SecondLanguage
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
                    SET StudentType = COALESCE(@StudentType, StudentType),
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
        public async Task<string> GenerateAdmissionNumberAsync()
        {
            var connection = _context.Database.GetDbConnection();

            return await connection.QuerySingleAsync<string>(
                "sp_GenerateAdmissionNumber",
                commandType: CommandType.StoredProcedure);
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
    }
}
