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

            return await connection.QueryFirstOrDefaultAsync<StudentAdmissionResponseDto>(
                "sp_GetStudentAdmissionById",
                new
                {
                    p_AdmissionId = admissionId
                },
                commandType: CommandType.StoredProcedure);
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

            return result;
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

            return await connection
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
