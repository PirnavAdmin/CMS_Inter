using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
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
        // GET ALL STUDENTS
        // =========================================================

        public async Task<List<StudentListItemDto>> GetAllAsync()
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_GetAllStudents",
                commandType: CommandType.StoredProcedure);

            return result.ToList();
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
                        p_FatherEmail = request.FatherEmail,

                        // Mother
                        p_MotherName = request.MotherName,
                        p_MotherOccupation =
                            request.MotherOccupation,
                        p_MotherMobile = request.MotherMobile,
                        p_MotherEmail = request.MotherEmail,

                        // Guardian
                        p_GuardianName = request.GuardianName,
                        p_GuardianMobile =
                            request.GuardianMobile,
                        p_GuardianEmail =
                            request.GuardianEmail,

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
                        p_IsActive = request.IsActive
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

            string? normalizedEmail = null;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                normalizedEmail = request.Email.Trim().ToUpperInvariant();
                var existingUserWithEmail = await connection.QueryFirstOrDefaultAsync<User>(
                    "SELECT UserId, StudentId, Email FROM `Users` WHERE LOWER(`Email`) = LOWER(@Email) OR `Email` = @Email LIMIT 1;",
                    new { Email = normalizedEmail });

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
                        p_FatherEmail = request.FatherEmail,

                        p_MotherName = request.MotherName,
                        p_MotherOccupation = request.MotherOccupation,
                        p_MotherMobile = request.MotherMobile,
                        p_MotherEmail = request.MotherEmail,

                        p_GuardianName = request.GuardianName,
                        p_GuardianMobile = request.GuardianMobile,
                        p_GuardianEmail = request.GuardianEmail
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    const string sql = @"
                        UPDATE `Users` 
                        SET `Email` = @Email, 
                            `UpdatedAt` = @UpdatedAt 
                        WHERE `StudentId` = @StudentId;";
                    await connection.ExecuteAsync(sql, new { Email = normalizedEmail, UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);
                }

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

                const string sql = @"
                    UPDATE `Users` 
                    SET `IsActive` = 0, 
                        `UpdatedAt` = @UpdatedAt 
                    WHERE `StudentId` = @StudentId;";
                await connection.ExecuteAsync(sql, new { UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);

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
                    "SELECT UserId, StudentId, Email FROM `Users` WHERE LOWER(`Email`) = LOWER(@Email) OR `Email` = @Email LIMIT 1;",
                    new { Email = normalizedEmail });

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
                            request.GuardianMobile
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    const string sql = @"
                        UPDATE `Users` 
                        SET `Email` = @Email, 
                            `UpdatedAt` = @UpdatedAt 
                        WHERE `StudentId` = @StudentId;";
                    await connection.ExecuteAsync(sql, new { Email = normalizedEmail, UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);
                }

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

                const string sql = @"
                    UPDATE `Users` 
                    SET `IsActive` = 0, 
                        `UpdatedAt` = @UpdatedAt 
                    WHERE `StudentId` = @StudentId;";
                await connection.ExecuteAsync(sql, new { UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);

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

                const string sql = @"
                    UPDATE `Users` 
                    SET `IsActive` = 1, 
                        `UpdatedAt` = @UpdatedAt 
                    WHERE `StudentId` = @StudentId;";
                await connection.ExecuteAsync(sql, new { UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);

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
            bool? isActive)
        {
            var connection = _context.Database.GetDbConnection();

            var result = await connection.QueryAsync<StudentListItemDto>(
                "sp_SearchStudents",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search)
                        ? null
                        : search.Trim(),

                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_GroupId = groupId,
                    p_SectionId = sectionId,
                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
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
                "UPDATE Students SET Photo = @Photo, UpdatedAt = CURRENT_TIMESTAMP WHERE StudentId = @StudentId",
                new { Photo = photoPath, StudentId = studentId });
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
            var sql = $"UPDATE Students SET `{safeColumn}` = @DocumentPath, UpdatedAt = CURRENT_TIMESTAMP WHERE StudentId = @StudentId";
            var rows = await connection.ExecuteAsync(sql, new { DocumentPath = documentPath, StudentId = studentId });
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

            string? normalizedEmail = null;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                normalizedEmail = request.Email.Trim().ToUpperInvariant();
                var existingUserWithEmail = await connection.QueryFirstOrDefaultAsync<User>(
                    "SELECT UserId, StudentId, Email FROM `Users` WHERE LOWER(`Email`) = LOWER(@Email) OR `Email` = @Email LIMIT 1;",
                    new { Email = normalizedEmail });

                if (existingUserWithEmail != null && existingUserWithEmail.StudentId != studentId)
                {
                    throw new InvalidOperationException($"Email address '{request.Email}' is already registered to another user account.");
                }
            }

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
                        p_FatherEmail = request.FatherEmail,
                        p_MotherMobile = request.MotherMobile,
                        p_MotherEmail = request.MotherEmail,
                        p_GuardianMobile = request.GuardianMobile,
                        p_GuardianEmail = request.GuardianEmail
                    },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    const string sql = @"
                        UPDATE `Users` 
                        SET `Email` = @Email, 
                            `UpdatedAt` = @UpdatedAt 
                        WHERE `StudentId` = @StudentId;";
                    await connection.ExecuteAsync(sql, new { Email = normalizedEmail, UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);
                }

                transaction.Commit();
                return rows > 0;
            }
            catch
            {
                try { transaction.Rollback(); } catch { }
                throw;
            }
        }
    }
}