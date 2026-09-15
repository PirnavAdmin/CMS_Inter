using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services.Imports;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentImportService : IStudentImportService
    {
        private readonly AppDbContext _context;
        private readonly IUserProvisioningService _userProvisioningService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StudentImportService> _logger;

        private static readonly Regex PhoneRegex = new(@"^[6-9][0-9]{9}$", RegexOptions.Compiled);
        private static readonly Regex AadhaarRegex = new(@"^[0-9]{12}$", RegexOptions.Compiled);
        private static readonly Regex PincodeRegex = new(@"^[0-9]{6}$", RegexOptions.Compiled);
        private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly HashSet<string> ValidGenders = new(StringComparer.OrdinalIgnoreCase) { "Male", "Female", "Other" };
        private static readonly HashSet<string> ValidBloodGroups = new(StringComparer.OrdinalIgnoreCase) { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-" };
        private static readonly HashSet<string> ValidFeeStatuses = new(StringComparer.OrdinalIgnoreCase) { "Paid", "PartiallyPaid", "Unpaid" };

        public StudentImportService(
            AppDbContext context,
            IUserProvisioningService userProvisioningService,
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<StudentImportService> logger)
        {
            _context = context;
            _userProvisioningService = userProvisioningService;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        
        public async Task<byte[]> GenerateCredentialsPdfAsync(
            StudentCredentialPdfFilterDto? filter = null,
            CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();

            string sql = @"
                SELECT s.StudentId, s.AdmissionNo, s.RollNo, s.StudentName, s.DateOfBirth, s.Gender,
                       s.MobileNumber, s.Email, b.BoardCode, ay.AcademicYearName, al.LevelCode,
                       g.GroupCode, IFNULL(p.ProgramName, '') AS ProgramName, IFNULL(sec.SectionName, '') AS SectionName
                FROM Students s
                JOIN Boards b ON s.BoardId = b.BoardId
                JOIN AcademicYears ay ON s.AcademicYearId = ay.AcademicYearId
                JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
                JOIN `Groups` g ON s.GroupId = g.GroupId
                LEFT JOIN Programs p ON s.ProgramId = p.ProgramId
                LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
                WHERE s.IsActive = 1
                  AND (s.AdmissionId IS NULL)
                  AND (@BoardId IS NULL OR s.BoardId = @BoardId)
                  AND (@AcademicYearId IS NULL OR s.AcademicYearId = @AcademicYearId)
                  AND (@AcademicLevelId IS NULL OR s.AcademicLevelId = @AcademicLevelId)
                  AND (@GroupId IS NULL OR s.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR s.SectionId = @SectionId)
                  AND (@AdmissionNo IS NULL OR s.AdmissionNo = @AdmissionNo)
                ORDER BY s.StudentName ASC";

            var records = (await conn.QueryAsync(sql, new
            {
                BoardId = filter?.BoardId,
                AcademicYearId = filter?.AcademicYearId,
                AcademicLevelId = filter?.AcademicLevelId,
                GroupId = filter?.GroupId,
                SectionId = filter?.SectionId,
                AdmissionNo = filter?.AdmissionNo
            })).ToList();

            var models = new List<CollegeManagement.API.Services.Exports.StudentCredentialPdfModel>();
            foreach (var r in records)
            {
                DateTime dob = (DateTime)r.DateOfBirth;
                string tempPassword = "Sent to registered email";

                models.Add(new CollegeManagement.API.Services.Exports.StudentCredentialPdfModel
                {
                    StudentId = (int)r.StudentId,
                    AdmissionNo = (string)r.AdmissionNo,
                    RollNo = (string?)r.RollNo,
                    StudentName = (string)r.StudentName,
                    DateOfBirth = dob,
                    Gender = (string)r.Gender,
                    MobileNumber = (string?)r.MobileNumber,
                    Email = (string?)r.Email,
                    BoardCode = (string)r.BoardCode,
                    AcademicYearName = (string)r.AcademicYearName,
                    LevelCode = (string)r.LevelCode,
                    GroupCode = (string)r.GroupCode,
                    ProgramName = (string?)r.ProgramName,
                    SectionName = (string?)r.SectionName,
                    TemporaryPassword = tempPassword
                });
            }

            var document = new CollegeManagement.API.Services.Exports.StudentCredentialPdfDocument(models);
            using var stream = new MemoryStream();
            QuestPDF.Fluent.GenerateExtensions.GeneratePdf(document, stream);
            return stream.ToArray();
        }


        public async Task<byte[]> GenerateTemplateAsync(CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();

            var boards = (await conn.QueryAsync<(string Code, string Name)>(
                "SELECT BoardCode AS Code, BoardName AS Name FROM Boards WHERE IsActive = 1 ORDER BY BoardCode")).ToList();

            var years = (await conn.QueryAsync<string>(
                "SELECT AcademicYearName FROM AcademicYears WHERE IsActive = 1 ORDER BY AcademicYearName DESC")).ToList();

            var levels = (await conn.QueryAsync<(string Code, string Name)>(
                "SELECT LevelCode AS Code, LevelName AS Name FROM AcademicLevels WHERE IsActive = 1 ORDER BY LevelCode")).ToList();

            var groups = (await conn.QueryAsync<(string Code, string Name, string BoardCode, string LevelCode)>(
                @"SELECT g.GroupCode AS Code, g.GroupName AS Name, b.BoardCode, al.LevelCode
                  FROM Groups g
                  JOIN Boards b ON g.BoardId = b.BoardId
                  JOIN AcademicLevels al ON g.AcademicLevelId = al.AcademicLevelId
                  WHERE g.IsActive = 1
                  ORDER BY g.GroupCode")).ToList();

            var programs = (await conn.QueryAsync<(string ProgramName, string GroupCode)>(
                @"SELECT p.ProgramName, g.GroupCode
                  FROM GroupPrograms gp
                  JOIN Groups g ON gp.GroupId = g.GroupId
                  JOIN Programs p ON gp.ProgramId = p.ProgramId
                  WHERE p.IsActive = 1 AND g.IsActive = 1
                  ORDER BY g.GroupCode, p.ProgramName")).ToList();

            var sections = (await conn.QueryAsync<(string SectionName, string GroupCode, string ProgramName, string YearName, string LevelCode, string BoardCode)>(
                @"SELECT s.SectionName, g.GroupCode, IFNULL(p.ProgramName, '') AS ProgramName, IFNULL(ay.AcademicYearName, '') AS YearName, al.LevelCode, b.BoardCode
                  FROM Sections s
                  JOIN `Groups` g ON s.GroupId = g.GroupId
                  JOIN Boards b ON s.BoardId = b.BoardId
                  JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
                  LEFT JOIN Programs p ON s.ProgramId = p.ProgramId
                  LEFT JOIN AcademicYears ay ON s.AcademicYearId = ay.AcademicYearId
                  WHERE s.IsActive = 1
                  ORDER BY b.BoardCode, ay.AcademicYearName, al.LevelCode, g.GroupCode, s.SectionName")).ToList();

            return StudentExcelImportTemplateBuilder.BuildTemplate(boards, years, levels, groups, programs, sections);
        }

        public async Task<StudentImportResultDto> ValidateExcelAsync(IFormFile file, CancellationToken ct = default)
        {
            var (rows, errors, _) = await ProcessWorkbookInternalAsync(file, ct);

            return new StudentImportResultDto
            {
                TotalRows = rows.Count,
                SuccessfulRows = rows.Count - errors.Select(e => e.RowNumber).Distinct().Count(),
                FailedRows = errors.Select(e => e.RowNumber).Distinct().Count(),
                IsSuccess = errors.Count == 0,
                Message = errors.Count == 0
                    ? $"All {rows.Count} rows validated successfully."
                    : $"Validation completed with {errors.Count} error(s) across {errors.Select(e => e.RowNumber).Distinct().Count()} row(s).",
                Errors = errors
            };
        }

        public async Task<StudentImportResultDto> ImportExcelAsync(IFormFile file, bool allowPartial = false, CancellationToken ct = default)
        {
            var (rows, errors, resolvedEntities) = await ProcessWorkbookInternalAsync(file, ct);

            var distinctFailedRows = errors.Select(e => e.RowNumber).Distinct().ToHashSet();

            if (!allowPartial && errors.Count > 0)
            {
                return new StudentImportResultDto
                {
                    TotalRows = rows.Count,
                    SuccessfulRows = 0,
                    FailedRows = distinctFailedRows.Count,
                    IsSuccess = false,
                    Message = $"Strict import failed: {errors.Count} validation error(s) found across {distinctFailedRows.Count} row(s). No records were inserted.",
                    Errors = errors
                };
            }

            var validRowsToInsert = resolvedEntities
                .Where(r => !distinctFailedRows.Contains(r.RowNumber))
                .ToList();

            if (validRowsToInsert.Count == 0)
            {
                return new StudentImportResultDto
                {
                    TotalRows = rows.Count,
                    SuccessfulRows = 0,
                    FailedRows = distinctFailedRows.Count,
                    IsSuccess = false,
                    Message = "No valid rows available to import.",
                    Errors = errors
                };
            }

            // Execute Transactional Insertion
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync(ct);
            }

            const string insertSql = @"
                INSERT INTO Students
                (
                    AdmissionId,
                    AdmissionNo,
                    RollNo,
                    AdmissionDate,
                    AdmissionType,
                    AdmissionQuota,
                    Medium,
                    SecondLanguage,
                    StudentName,
                    Photo,
                    Gender,
                    DateOfBirth,
                    BloodGroup,
                    Email,
                    MobileNumber,
                    AadhaarNumber,
                    Nationality,
                    Religion,
                    Category,
                    Address,
                    City,
                    District,
                    State,
                    Pincode,
                    BoardId,
                    AcademicYearId,
                    AcademicLevelId,
                    GroupId,
                    ProgramId,
                    SectionId,
                    PreviousSchool,
                    PreviousHallTicketNumber,
                    PreviousBoard,
                    PreviousYearOfPassing,
                    PreviousPercentage,
                    StudentCategory,
                    ScholarshipStatus,
                    ScholarshipAmount,
                    FatherName,
                    FatherOccupation,
                    FatherMobile,
                    FatherEmail,
                    MotherName,
                    MotherOccupation,
                    MotherMobile,
                    MotherEmail,
                    GuardianName,
                    GuardianMobile,
                    GuardianEmail,
                    AnnualIncome,
                    FeeAmount,
                    FeePaid,
                    FeeStatus,
                    AttendancePercentage,
                    PerformanceGrade,
                    CGPA,
                    Rank,
                    Remarks,
                    PasswordHash,
                    IsFirstLogin,
                    Status,
                    IsActive,
                    CreatedAt
                )
                VALUES
                (
                    NULL,
                    @AdmissionNo,
                    @RollNo,
                    @AdmissionDate,
                    @AdmissionType,
                    @AdmissionQuota,
                    @Medium,
                    @SecondLanguage,
                    @StudentName,
                    @Photo,
                    @Gender,
                    @DateOfBirth,
                    @BloodGroup,
                    @Email,
                    @MobileNumber,
                    @AadhaarNumber,
                    @Nationality,
                    @Religion,
                    @Category,
                    @Address,
                    @City,
                    @District,
                    @State,
                    @Pincode,
                    @BoardId,
                    @AcademicYearId,
                    @AcademicLevelId,
                    @GroupId,
                    @ProgramId,
                    @SectionId,
                    @PreviousSchool,
                    @PreviousHallTicketNumber,
                    @PreviousBoard,
                    @PreviousYearOfPassing,
                    @PreviousPercentage,
                    @StudentCategory,
                    @ScholarshipStatus,
                    @ScholarshipAmount,
                    @FatherName,
                    @FatherOccupation,
                    @FatherMobile,
                    @FatherEmail,
                    @MotherName,
                    @MotherOccupation,
                    @MotherMobile,
                    @MotherEmail,
                    @GuardianName,
                    @GuardianMobile,
                    @GuardianEmail,
                    @AnnualIncome,
                    @FeeAmount,
                    @FeePaid,
                    @FeeStatus,
                    @AttendancePercentage,
                    @PerformanceGrade,
                    @CGPA,
                    @Rank,
                    @Remarks,
                    @PasswordHash,
                    @IsFirstLogin,
                    'Active',
                    1,
                    CURRENT_TIMESTAMP(6)
                );
                SELECT LAST_INSERT_ID();";

            var provisionedUsers = new List<UserProvisioningResult>();

            using var transaction = connection.BeginTransaction();
            try
            {
                foreach (var s in validRowsToInsert)
                {
                    var studentId = await connection.ExecuteScalarAsync<int>(
                        insertSql,
                        new
                        {
                            AdmissionNo = s.AdmissionNo,
                            RollNo = s.RollNo,
                            AdmissionDate = s.AdmissionDate,
                            AdmissionType = s.AdmissionType,
                            AdmissionQuota = s.AdmissionQuota,
                            Medium = s.Medium,
                            SecondLanguage = s.SecondLanguage,
                            StudentName = s.StudentName,
                            Photo = (string?)null,
                            Gender = s.Gender,
                            DateOfBirth = s.DateOfBirth,
                            BloodGroup = s.BloodGroup,
                            Email = s.Email,
                            MobileNumber = s.MobileNumber,
                            AadhaarNumber = s.AadhaarNumber,
                            Nationality = s.Nationality,
                            Religion = s.Religion,
                            Category = s.Category,
                            Address = s.Address,
                            City = s.City,
                            District = s.District,
                            State = s.State,
                            Pincode = s.Pincode,
                            BoardId = s.BoardId,
                            AcademicYearId = s.AcademicYearId,
                            AcademicLevelId = s.AcademicLevelId,
                            GroupId = s.GroupId,
                            ProgramId = s.ProgramId,
                            SectionId = s.SectionId,
                            PreviousSchool = s.PreviousSchool,
                            PreviousHallTicketNumber = s.PreviousHallTicketNumber,
                            PreviousBoard = s.PreviousBoard,
                            PreviousYearOfPassing = s.PreviousYearOfPassing,
                            PreviousPercentage = s.PreviousPercentage,
                            StudentCategory = s.StudentCategory,
                            ScholarshipStatus = s.ScholarshipStatus,
                            ScholarshipAmount = s.ScholarshipAmount,
                            FatherName = s.FatherName,
                            FatherOccupation = s.FatherOccupation,
                            FatherMobile = s.FatherMobile,
                            FatherEmail = s.FatherEmail,
                            MotherName = s.MotherName,
                            MotherOccupation = s.MotherOccupation,
                            MotherMobile = s.MotherMobile,
                            MotherEmail = s.MotherEmail,
                            GuardianName = s.GuardianName,
                            GuardianMobile = s.GuardianMobile,
                            GuardianEmail = s.GuardianEmail,
                            AnnualIncome = s.AnnualIncome,
                            FeeAmount = s.FeeAmount,
                            FeePaid = s.FeePaid,
                            FeeStatus = s.FeeStatus,
                            AttendancePercentage = s.AttendancePercentage,
                            PerformanceGrade = s.PerformanceGrade,
                            CGPA = s.CGPA,
                            Rank = s.Rank,
                            Remarks = s.Remarks,
                            PasswordHash = s.PasswordHash,
                            IsFirstLogin = true
                        },
                        transaction: transaction);

                    // Atomically provision User account if valid email is present
                    if (!string.IsNullOrWhiteSpace(s.Email) && EmailRegex.IsMatch(s.Email.Trim()))
                    {
                        var provisionReq = new ProvisionStudentUserRequest
                        {
                            StudentId = studentId,
                            FullName = s.StudentName,
                            Email = s.Email.Trim(),
                            PhoneNumber = s.MobileNumber
                        };

                        var userResult = await _userProvisioningService.ProvisionStudentUserAsync(
                            provisionReq,
                            connection: connection,
                            transaction: transaction);

                        if (!userResult.Success)
                        {
                            throw new ApplicationException($"Failed to provision user for student '{s.StudentName}' ({s.Email}): {userResult.ErrorMessage}");
                        }

                        if (!string.IsNullOrWhiteSpace(userResult.TemporaryPassword))
                        {
                            provisionedUsers.Add(userResult);
                        }
                    }
                }

                transaction.Commit();
                _logger.LogInformation("Successfully imported {Count} students and provisioned {UserCount} user accounts.", 
                    validRowsToInsert.Count, provisionedUsers.Count);

                // Post-commit: Dispatch initial credential onboarding emails
                if (provisionedUsers.Count > 0)
                {
                    var portalUrl = _configuration?["StudentPortal:LoginUrl"]
                                 ?? _configuration?["InstitutionSettings:PortalUrl"]
                                 ?? "http://localhost:5173";
                    var institutionName = _configuration?["InstitutionSettings:InstitutionName"]
                                       ?? "College Management System";

                    foreach (var provUser in provisionedUsers)
                    {
                        try
                        {
                            var emailBody = StudentCredentialHelper.BuildInitialCredentialEmailHtml(
                                provUser.FullName ?? "Student",
                                provUser.Email ?? string.Empty,
                                provUser.TemporaryPassword ?? string.Empty,
                                portalUrl,
                                institutionName);

                            await _emailService.SendEmailAsync(
                                provUser.Email,
                                $"Your Student Portal Account Credentials - {institutionName}",
                                emailBody);
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogWarning(emailEx, "Failed to send credential onboarding email to student {Email} after bulk import commit.", provUser.Email);
                        }
                    }
                }

                return new StudentImportResultDto
                {
                    TotalRows = rows.Count,
                    SuccessfulRows = validRowsToInsert.Count,
                    FailedRows = distinctFailedRows.Count,
                    IsSuccess = errors.Count == 0,
                    Message = errors.Count == 0
                        ? $"{validRowsToInsert.Count} students imported successfully."
                        : $"{validRowsToInsert.Count} students imported successfully. {distinctFailedRows.Count} row(s) had errors.",
                    Errors = errors
                };
            }
            catch (Exception ex)
            {
                try
                {
                    transaction.Rollback();
                }
                catch
                {
                    // Ignore rollback errors if already aborted
                }

                _logger.LogError(ex, "Transaction rolled back during student import.");
                throw new ApplicationException($"Database error during bulk insert: {ex.Message}", ex);
            }
        }

        private async Task<(List<StudentImportRowDto> Rows, List<StudentImportRowErrorDto> Errors, List<ResolvedStudentInsertModel> Resolved)>
            ProcessWorkbookInternalAsync(IFormFile file, CancellationToken ct)
        {
            var errors = new List<StudentImportRowErrorDto>();
            var resolvedStudents = new List<ResolvedStudentInsertModel>();

            if (file == null || file.Length == 0)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "No file was uploaded or the uploaded file is empty."
                });
                return (new List<StudentImportRowDto>(), errors, resolvedStudents);
            }

            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "Invalid file type. Only Excel (.xlsx) files are accepted."
                });
                return (new List<StudentImportRowDto>(), errors, resolvedStudents);
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "File size exceeds the 10 MB limit."
                });
                return (new List<StudentImportRowDto>(), errors, resolvedStudents);
            }

            using var stream = file.OpenReadStream();
            var (rows, structureErrors) = StudentExcelImportReader.ReadWorkbook(stream);

            if (structureErrors.Count > 0)
            {
                return (rows, structureErrors, resolvedStudents);
            }

            if (rows.Count == 0)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "Students",
                    ErrorMessage = "The 'Students' sheet does not contain any data rows to import."
                });
                return (rows, errors, resolvedStudents);
            }

            if (rows.Count > 1000)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "RowCount",
                    ErrorMessage = $"Batch contains {rows.Count} rows. Maximum allowed per import is 1000 rows."
                });
                return (rows, errors, resolvedStudents);
            }

            // Pre-load Master Data in 1 single batch
            var masterData = await PreloadMasterDataAsync();

            // In-File Duplicate Checking
            var seenAdmissionNos = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var seenAadhaars = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var seenEmails = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var r in rows)
            {
                if (!string.IsNullOrWhiteSpace(r.AdmissionNo))
                {
                    var adm = r.AdmissionNo.Trim();
                    if (seenAdmissionNos.TryGetValue(adm, out int firstRow))
                    {
                        errors.Add(new StudentImportRowErrorDto
                        {
                            RowNumber = r.RowNumber,
                            AdmissionNo = adm,
                            StudentName = r.StudentName,
                            FieldName = "Admission No",
                            InvalidValue = adm,
                            ErrorMessage = $"Duplicate Admission No '{adm}' found in workbook (first seen at Row {firstRow})."
                        });
                    }
                    else
                    {
                        seenAdmissionNos[adm] = r.RowNumber;
                    }
                }

                if (!string.IsNullOrWhiteSpace(r.AadhaarNumber))
                {
                    var aadh = r.AadhaarNumber.Trim();
                    if (seenAadhaars.TryGetValue(aadh, out int firstRow))
                    {
                        errors.Add(new StudentImportRowErrorDto
                        {
                            RowNumber = r.RowNumber,
                            AdmissionNo = r.AdmissionNo,
                            StudentName = r.StudentName,
                            FieldName = "Aadhaar Number",
                            InvalidValue = aadh,
                            ErrorMessage = $"Duplicate Aadhaar Number '{aadh}' found in workbook (first seen at Row {firstRow})."
                        });
                    }
                    else
                    {
                        seenAadhaars[aadh] = r.RowNumber;
                    }
                }

                if (!string.IsNullOrWhiteSpace(r.Email))
                {
                    var em = r.Email.Trim();
                    if (seenEmails.TryGetValue(em, out int firstRow))
                    {
                        errors.Add(new StudentImportRowErrorDto
                        {
                            RowNumber = r.RowNumber,
                            AdmissionNo = r.AdmissionNo,
                            StudentName = r.StudentName,
                            FieldName = "Email",
                            InvalidValue = em,
                            ErrorMessage = $"Duplicate Email '{em}' found in workbook (first seen at Row {firstRow})."
                        });
                    }
                    else
                    {
                        seenEmails[em] = r.RowNumber;
                    }
                }
            }

            // Existing DB Duplicate Check in 1 batch query
            var distinctAdmissionNos = rows
                .Where(r => !string.IsNullOrWhiteSpace(r.AdmissionNo))
                .Select(r => r.AdmissionNo!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var existingAdmissionNos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (distinctAdmissionNos.Count > 0)
            {
                var conn = _context.Database.GetDbConnection();
                var existing = await conn.QueryAsync<string>(
                    "SELECT AdmissionNo FROM Students WHERE AdmissionNo IN @AdmissionNos",
                    new { AdmissionNos = distinctAdmissionNos });
                foreach (var e in existing)
                {
                    existingAdmissionNos.Add(e);
                }
            }

            // Row-by-Row Validation & Resolution
            foreach (var r in rows)
            {
                var rowErrors = ValidateAndResolveRow(r, masterData, existingAdmissionNos);
                if (rowErrors.Errors.Count > 0)
                {
                    errors.AddRange(rowErrors.Errors);
                }
                else if (rowErrors.ResolvedModel != null)
                {
                    resolvedStudents.Add(rowErrors.ResolvedModel);
                }
            }

            return (rows, errors, resolvedStudents);
        }

        private (List<StudentImportRowErrorDto> Errors, ResolvedStudentInsertModel? ResolvedModel)
            ValidateAndResolveRow(
                StudentImportRowDto r,
                MasterDataCache master,
                HashSet<string> existingAdmissionNos)
        {
            var errors = new List<StudentImportRowErrorDto>();

            void AddError(string field, string? val, string msg)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    AdmissionNo = r.AdmissionNo,
                    StudentName = r.StudentName,
                    FieldName = field,
                    InvalidValue = val,
                    ErrorMessage = msg
                });
            }

            // 1. Mandatory Fields
            if (string.IsNullOrWhiteSpace(r.AdmissionNo))
                AddError("Admission No", r.AdmissionNo, "Admission No is required.");
            else if (r.AdmissionNo.Trim().Length > 50)
                AddError("Admission No", r.AdmissionNo, "Admission No cannot exceed 50 characters.");
            else if (existingAdmissionNos.Contains(r.AdmissionNo.Trim()))
                AddError("Admission No", r.AdmissionNo, $"Admission number '{r.AdmissionNo.Trim()}' already exists in the system.");

            if (string.IsNullOrWhiteSpace(r.StudentName))
                AddError("Student Name", r.StudentName, "Student Name is required.");
            else if (r.StudentName.Trim().Length > 150)
                AddError("Student Name", r.StudentName, "Student Name cannot exceed 150 characters.");
            else if (r.StudentName.Trim().Length < 2)
                AddError("Student Name", r.StudentName, "Student Name must be at least 2 characters.");

            if (string.IsNullOrWhiteSpace(r.Gender))
                AddError("Gender", r.Gender, "Gender is required.");
            else if (!ValidGenders.Contains(r.Gender.Trim()))
                AddError("Gender", r.Gender, "Gender must be 'Male', 'Female', or 'Other'.");

            if (!r.DateOfBirth.HasValue)
            {
                AddError("Date of Birth", null, "Date of Birth is required.");
            }
            else
            {
                var age = DateTime.UtcNow.Year - r.DateOfBirth.Value.Year;
                if (r.DateOfBirth.Value > DateTime.UtcNow.Date)
                    AddError("Date of Birth", r.DateOfBirth.Value.ToString("yyyy-MM-dd"), "Date of Birth cannot be in the future.");
                else if (age < 12)
                    AddError("Date of Birth", r.DateOfBirth.Value.ToString("yyyy-MM-dd"), "Student age must be at least 12 years.");
            }

            // Primitive Format Validations
            if (!string.IsNullOrWhiteSpace(r.MobileNumber) && !PhoneRegex.IsMatch(r.MobileNumber.Trim()))
                AddError("Mobile Number", r.MobileNumber, "Mobile Number must be a valid 10-digit Indian phone number (starting with 6-9).");

            if (!string.IsNullOrWhiteSpace(r.FatherMobile) && !PhoneRegex.IsMatch(r.FatherMobile.Trim()))
                AddError("Father Mobile", r.FatherMobile, "Father Mobile must be a valid 10-digit Indian phone number.");

            if (!string.IsNullOrWhiteSpace(r.MotherMobile) && !PhoneRegex.IsMatch(r.MotherMobile.Trim()))
                AddError("Mother Mobile", r.MotherMobile, "Mother Mobile must be a valid 10-digit Indian phone number.");

            if (!string.IsNullOrWhiteSpace(r.GuardianMobile) && !PhoneRegex.IsMatch(r.GuardianMobile.Trim()))
                AddError("Guardian Mobile", r.GuardianMobile, "Guardian Mobile must be a valid 10-digit Indian phone number.");

            if (!string.IsNullOrWhiteSpace(r.AadhaarNumber) && !AadhaarRegex.IsMatch(r.AadhaarNumber.Trim()))
                AddError("Aadhaar Number", r.AadhaarNumber, "Aadhaar Number must be exactly 12 digits.");

            if (!string.IsNullOrWhiteSpace(r.Email) && !EmailRegex.IsMatch(r.Email.Trim()))
                AddError("Email", r.Email, "Invalid Email address format.");

            if (!string.IsNullOrWhiteSpace(r.FatherEmail) && !EmailRegex.IsMatch(r.FatherEmail.Trim()))
                AddError("Father Email", r.FatherEmail, "Invalid Father Email address format.");

            if (!string.IsNullOrWhiteSpace(r.MotherEmail) && !EmailRegex.IsMatch(r.MotherEmail.Trim()))
                AddError("Mother Email", r.MotherEmail, "Invalid Mother Email address format.");

            if (!string.IsNullOrWhiteSpace(r.GuardianEmail) && !EmailRegex.IsMatch(r.GuardianEmail.Trim()))
                AddError("Guardian Email", r.GuardianEmail, "Invalid Guardian Email address format.");

            if (!string.IsNullOrWhiteSpace(r.BloodGroup) && !ValidBloodGroups.Contains(r.BloodGroup.Trim()))
                AddError("Blood Group", r.BloodGroup, "Invalid Blood Group. Accepted: A+, A-, B+, B-, O+, O-, AB+, AB-.");

            if (!string.IsNullOrWhiteSpace(r.Pincode) && !PincodeRegex.IsMatch(r.Pincode.Trim()))
                AddError("Pincode", r.Pincode, "Pincode must be exactly 6 digits.");

            if (r.PreviousPercentage.HasValue && (r.PreviousPercentage.Value < 0 || r.PreviousPercentage.Value > 100))
                AddError("Previous Percentage", r.PreviousPercentage.Value.ToString(), "Previous Percentage must be between 0.00 and 100.00.");

            if (r.FeeAmount.HasValue && r.FeeAmount.Value < 0)
                AddError("Fee Amount", r.FeeAmount.Value.ToString(), "Fee Amount cannot be negative.");

            if (r.FeePaid.HasValue && r.FeePaid.Value < 0)
                AddError("Fee Paid", r.FeePaid.Value.ToString(), "Fee Paid cannot be negative.");

            if (r.ScholarshipAmount.HasValue && r.ScholarshipAmount.Value < 0)
                AddError("Scholarship Amount", r.ScholarshipAmount.Value.ToString(), "Scholarship Amount cannot be negative.");

            if (r.AnnualIncome.HasValue && r.AnnualIncome.Value < 0)
                AddError("Annual Income", r.AnnualIncome.Value.ToString(), "Annual Income cannot be negative.");

            if (r.AttendancePercentage.HasValue && (r.AttendancePercentage.Value < 0 || r.AttendancePercentage.Value > 100))
                AddError("Attendance Percentage", r.AttendancePercentage.Value.ToString(), "Attendance Percentage must be between 0.00 and 100.00.");

            if (r.CGPA.HasValue && (r.CGPA.Value < 0 || r.CGPA.Value > 10))
                AddError("CGPA", r.CGPA.Value.ToString(), "CGPA must be between 0.00 and 10.00.");

            if (r.Rank.HasValue && r.Rank.Value < 1)
                AddError("Rank", r.Rank.Value.ToString(), "Rank must be a positive integer.");

            if (!string.IsNullOrWhiteSpace(r.FeeStatus) && !ValidFeeStatuses.Contains(r.FeeStatus.Trim()))
                AddError("Fee Status", r.FeeStatus, "Fee Status must be 'Paid', 'PartiallyPaid', or 'Unpaid'.");

            // 2. Academic Hierarchy Resolution
            int boardId = 0;
            if (string.IsNullOrWhiteSpace(r.BoardCode))
            {
                AddError("Board Code", r.BoardCode, "Board Code is required.");
            }
            else if (!master.BoardsByCode.TryGetValue(r.BoardCode.Trim(), out var b))
            {
                AddError("Board Code", r.BoardCode, $"Board Code '{r.BoardCode.Trim()}' does not exist or is inactive.");
            }
            else
            {
                boardId = b.BoardId;
            }

            int academicYearId = 0;
            if (string.IsNullOrWhiteSpace(r.AcademicYear))
            {
                AddError("Academic Year", r.AcademicYear, "Academic Year is required.");
            }
            else if (boardId > 0 && master.YearsByBoardAndName.TryGetValue($"{boardId}_{r.AcademicYear.Trim()}", out var byId))
            {
                academicYearId = byId;
            }
            else if (master.YearsByName.TryGetValue(r.AcademicYear.Trim(), out var yId))
            {
                academicYearId = yId;
            }
            else
            {
                AddError("Academic Year", r.AcademicYear, $"Academic Year '{r.AcademicYear.Trim()}' does not exist or is inactive.");
            }

            int academicLevelId = 0;
            if (string.IsNullOrWhiteSpace(r.AcademicLevel))
            {
                AddError("Academic Level", r.AcademicLevel, "Academic Level is required.");
            }
            else if (!master.LevelsByCodeOrName.TryGetValue(r.AcademicLevel.Trim(), out var lvlId))
            {
                AddError("Academic Level", r.AcademicLevel, $"Academic Level '{r.AcademicLevel.Trim()}' does not exist or is inactive.");
            }
            else
            {
                academicLevelId = lvlId;
            }

            int groupId = 0;
            if (string.IsNullOrWhiteSpace(r.GroupCode))
            {
                AddError("Group Code", r.GroupCode, "Group Code is required.");
            }
            else if (boardId > 0 && academicYearId > 0 && academicLevelId > 0)
            {
                string groupKey = $"{boardId}_{academicYearId}_{academicLevelId}_{r.GroupCode.Trim()}";
                if (!master.GroupsByContext.TryGetValue(groupKey, out var gId))
                {
                    AddError("Group Code", r.GroupCode, $"Group Code '{r.GroupCode.Trim()}' is not configured under Board '{r.BoardCode?.Trim()}', Year '{r.AcademicYear?.Trim()}', Level '{r.AcademicLevel?.Trim()}'.");
                }
                else
                {
                    groupId = gId;
                }
            }

            int? programId = null;
            if (!string.IsNullOrWhiteSpace(r.ProgramName))
            {
                if (groupId > 0)
                {
                    string progKey = $"{groupId}_{r.ProgramName.Trim()}";
                    if (!master.ProgramsByGroup.TryGetValue(progKey, out var pId))
                    {
                        AddError("Program Name", r.ProgramName, $"Program '{r.ProgramName.Trim()}' is not available for Group '{r.GroupCode?.Trim()}'.");
                    }
                    else
                    {
                        programId = pId;
                    }
                }
            }

            int? sectionId = null;
            if (!string.IsNullOrWhiteSpace(r.SectionName))
            {
                if (boardId > 0 && academicYearId > 0 && groupId > 0)
                {
                    string secName = r.SectionName.Trim();
                    int progId = programId ?? 0;

                    // Multi-tier hierarchical lookup:
                    // 1. Exact hierarchy (Board, Year, Level, Group, Program, Section)
                    string key1 = $"{boardId}_{academicYearId}_{academicLevelId}_{groupId}_{progId}_{secName}";
                    // 2. Hierarchy without Program (Board, Year, Level, Group, 0, Section)
                    string key2 = $"{boardId}_{academicYearId}_{academicLevelId}_{groupId}_0_{secName}";
                    // 3. Year & Group with Program (Board, Year, Group, Program, Section)
                    string key3 = $"{boardId}_{academicYearId}_{groupId}_{progId}_{secName}";
                    // 4. Year & Group without Program (Board, Year, Group, 0, Section)
                    string key4 = $"{boardId}_{academicYearId}_{groupId}_0_{secName}";
                    // 5. Group & Section fallback
                    string key5 = $"{groupId}_{secName}";

                    if (master.SectionsExact.TryGetValue(key1, out var sId) ||
                        master.SectionsExact.TryGetValue(key2, out sId) ||
                        master.SectionsByGroupYear.TryGetValue(key3, out sId) ||
                        master.SectionsByGroupYear.TryGetValue(key4, out sId) ||
                        master.SectionsByGroup.TryGetValue(key5, out sId))
                    {
                        sectionId = sId;
                    }
                    else
                    {
                        string progLabel = string.IsNullOrWhiteSpace(r.ProgramName) ? "(None)" : r.ProgramName.Trim();
                        AddError("Section Name", r.SectionName, $"Section '{r.SectionName.Trim()}' not found under Group '{r.GroupCode?.Trim()}' and Program '{progLabel}' for Year '{r.AcademicYear?.Trim()}'.");
                    }
                }
            }

            if (errors.Count > 0)
            {
                return (errors, null);
            }

            // Apply Defaults
            decimal feeAmount = r.FeeAmount ?? 0.00m;
            decimal feePaid = r.FeePaid ?? 0.00m;
            string feeStatus;
            if (!string.IsNullOrWhiteSpace(r.FeeStatus))
            {
                feeStatus = r.FeeStatus.Trim();
            }
            else
            {
                if (feeAmount <= 0 || feePaid >= feeAmount)
                    feeStatus = "Paid";
                else if (feePaid > 0)
                    feeStatus = "PartiallyPaid";
                else
                    feeStatus = "Unpaid";
            }

            DateTime admissionDate = r.AdmissionDate ?? DateTime.UtcNow.Date;
            string passwordHash = string.Empty;

            var resolved = new ResolvedStudentInsertModel
            {
                RowNumber = r.RowNumber,
                AdmissionNo = r.AdmissionNo!.Trim(),
                RollNo = r.RollNo?.Trim(),
                StudentName = r.StudentName!.Trim(),
                Gender = r.Gender!.Trim(),
                DateOfBirth = r.DateOfBirth!.Value,
                BloodGroup = r.BloodGroup?.Trim(),
                MobileNumber = r.MobileNumber?.Trim(),
                Email = r.Email?.Trim(),
                AadhaarNumber = r.AadhaarNumber?.Trim(),
                BoardId = boardId,
                AcademicYearId = academicYearId,
                AcademicLevelId = academicLevelId,
                GroupId = groupId,
                ProgramId = programId,
                SectionId = sectionId,
                AdmissionDate = admissionDate,
                AdmissionType = string.IsNullOrWhiteSpace(r.AdmissionType) ? "Regular" : r.AdmissionType.Trim(),
                AdmissionQuota = string.IsNullOrWhiteSpace(r.AdmissionQuota) ? "General" : r.AdmissionQuota.Trim(),
                Medium = string.IsNullOrWhiteSpace(r.Medium) ? "English" : r.Medium.Trim(),
                SecondLanguage = string.IsNullOrWhiteSpace(r.SecondLanguage) ? "Sanskrit" : r.SecondLanguage.Trim(),
                Nationality = string.IsNullOrWhiteSpace(r.Nationality) ? "Indian" : r.Nationality.Trim(),
                Religion = string.IsNullOrWhiteSpace(r.Religion) ? "Hindu" : r.Religion.Trim(),
                Category = string.IsNullOrWhiteSpace(r.Category) ? "General" : r.Category.Trim(),
                StudentCategory = string.IsNullOrWhiteSpace(r.StudentCategory) ? "Day Scholar" : r.StudentCategory.Trim(),
                FatherName = r.FatherName?.Trim(),
                FatherOccupation = r.FatherOccupation?.Trim(),
                FatherMobile = r.FatherMobile?.Trim(),
                FatherEmail = r.FatherEmail?.Trim(),
                MotherName = r.MotherName?.Trim(),
                MotherOccupation = r.MotherOccupation?.Trim(),
                MotherMobile = r.MotherMobile?.Trim(),
                MotherEmail = r.MotherEmail?.Trim(),
                GuardianName = r.GuardianName?.Trim(),
                GuardianMobile = r.GuardianMobile?.Trim(),
                GuardianEmail = r.GuardianEmail?.Trim(),
                Address = r.Address?.Trim(),
                City = r.City?.Trim(),
                District = r.District?.Trim(),
                State = r.State?.Trim(),
                Pincode = r.Pincode?.Trim(),
                PreviousSchool = r.PreviousSchool?.Trim(),
                PreviousBoard = r.PreviousBoard?.Trim(),
                PreviousHallTicketNumber = r.PreviousHallTicketNumber?.Trim(),
                PreviousYearOfPassing = r.PreviousYearOfPassing,
                PreviousPercentage = r.PreviousPercentage,
                FeeAmount = feeAmount,
                FeePaid = feePaid,
                FeeStatus = feeStatus,
                ScholarshipStatus = r.ScholarshipStatus?.Trim(),
                ScholarshipAmount = r.ScholarshipAmount,
                AnnualIncome = r.AnnualIncome,
                AttendancePercentage = r.AttendancePercentage ?? 0.00m,
                PerformanceGrade = r.PerformanceGrade?.Trim(),
                CGPA = r.CGPA,
                Rank = r.Rank,
                Remarks = r.Remarks?.Trim(),
                PasswordHash = passwordHash
            };

            return (errors, resolved);
        }

        private async Task<MasterDataCache> PreloadMasterDataAsync()
        {
            var cache = new MasterDataCache();
            var conn = _context.Database.GetDbConnection();

            // 1. Boards
            var boards = await conn.QueryAsync<(int BoardId, string BoardCode, string BoardName)>(
                "SELECT BoardId, BoardCode, BoardName FROM Boards WHERE IsActive = 1");
            foreach (var b in boards)
            {
                if (!string.IsNullOrWhiteSpace(b.BoardCode))
                    cache.BoardsByCode[b.BoardCode.Trim()] = (b.BoardId, b.BoardName);
            }

            // 2. Academic Years
            var years = await conn.QueryAsync<(int AcademicYearId, int BoardId, string AcademicYearName)>(
                "SELECT AcademicYearId, BoardId, AcademicYearName FROM AcademicYears WHERE IsActive = 1");
            foreach (var y in years)
            {
                if (!string.IsNullOrWhiteSpace(y.AcademicYearName))
                {
                    cache.YearsByBoardAndName[$"{y.BoardId}_{y.AcademicYearName.Trim()}"] = y.AcademicYearId;
                    if (!cache.YearsByName.ContainsKey(y.AcademicYearName.Trim()))
                    {
                        cache.YearsByName[y.AcademicYearName.Trim()] = y.AcademicYearId;
                    }
                }
            }

            // 3. Academic Levels
            var levels = await conn.QueryAsync<(int AcademicLevelId, string LevelCode, string LevelName)>(
                "SELECT AcademicLevelId, LevelCode, LevelName FROM AcademicLevels WHERE IsActive = 1");
            foreach (var l in levels)
            {
                if (!string.IsNullOrWhiteSpace(l.LevelCode))
                    cache.LevelsByCodeOrName[l.LevelCode.Trim()] = l.AcademicLevelId;
                if (!string.IsNullOrWhiteSpace(l.LevelName))
                    cache.LevelsByCodeOrName[l.LevelName.Trim()] = l.AcademicLevelId;
            }

            // 4. Groups
            var groups = await conn.QueryAsync<(int GroupId, int BoardId, int AcademicYearId, int AcademicLevelId, string GroupCode, string GroupName)>(
                "SELECT GroupId, BoardId, AcademicYearId, AcademicLevelId, GroupCode, GroupName FROM `Groups` WHERE IsActive = 1");
            foreach (var g in groups)
            {
                if (!string.IsNullOrWhiteSpace(g.GroupCode))
                {
                    string key = $"{g.BoardId}_{g.AcademicYearId}_{g.AcademicLevelId}_{g.GroupCode.Trim()}";
                    cache.GroupsByContext[key] = g.GroupId;
                }
                if (!string.IsNullOrWhiteSpace(g.GroupName))
                {
                    string keyName = $"{g.BoardId}_{g.AcademicYearId}_{g.AcademicLevelId}_{g.GroupName.Trim()}";
                    cache.GroupsByContext[keyName] = g.GroupId;
                }
            }

            // 5. Programs via GroupPrograms
            var groupPrograms = await conn.QueryAsync<(int GroupId, int ProgramId, string ProgramName)>(
                @"SELECT gp.GroupId, p.ProgramId, p.ProgramName
                  FROM GroupPrograms gp
                  JOIN Programs p ON gp.ProgramId = p.ProgramId
                  JOIN `Groups` g ON gp.GroupId = g.GroupId
                  WHERE p.IsActive = 1 AND g.IsActive = 1");
            foreach (var gp in groupPrograms)
            {
                if (!string.IsNullOrWhiteSpace(gp.ProgramName))
                {
                    string key = $"{gp.GroupId}_{gp.ProgramName.Trim()}";
                    cache.ProgramsByGroup[key] = gp.ProgramId;
                }
            }

            // 6. Sections
            var sections = await conn.QueryAsync<(int SectionId, int BoardId, int AcademicYearId, int AcademicLevelId, int GroupId, int? ProgramId, string SectionName)>(
                "SELECT SectionId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, SectionName FROM Sections WHERE IsActive = 1");
            foreach (var s in sections)
            {
                if (!string.IsNullOrWhiteSpace(s.SectionName))
                {
                    string sName = s.SectionName.Trim();
                    int progId = s.ProgramId ?? 0;

                    // 1 & 2: Exact
                    cache.SectionsExact[$"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_{progId}_{sName}"] = s.SectionId;
                    if (!cache.SectionsExact.ContainsKey($"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_0_{sName}"))
                    {
                        cache.SectionsExact[$"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_0_{sName}"] = s.SectionId;
                    }

                    // 3 & 4: Level-agnostic by Board, Year, Group
                    cache.SectionsByGroupYear[$"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_{progId}_{sName}"] = s.SectionId;
                    if (!cache.SectionsByGroupYear.ContainsKey($"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_0_{sName}"))
                    {
                        cache.SectionsByGroupYear[$"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_0_{sName}"] = s.SectionId;
                    }

                    // 5: Group fallback
                    if (!cache.SectionsByGroup.ContainsKey($"{s.GroupId}_{sName}"))
                    {
                        cache.SectionsByGroup[$"{s.GroupId}_{sName}"] = s.SectionId;
                    }
                }
            }

            return cache;
        }

        private class MasterDataCache
        {
            public Dictionary<string, (int BoardId, string BoardName)> BoardsByCode { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> YearsByBoardAndName { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> YearsByName { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> LevelsByCodeOrName { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> GroupsByContext { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> ProgramsByGroup { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> SectionsExact { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> SectionsByGroupYear { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, int> SectionsByGroup { get; } = new(StringComparer.OrdinalIgnoreCase);
        }

        public class ResolvedStudentInsertModel
        {
            public int RowNumber { get; set; }
            public string AdmissionNo { get; set; } = string.Empty;
            public string? RollNo { get; set; }
            public string StudentName { get; set; } = string.Empty;
            public string Gender { get; set; } = string.Empty;
            public DateTime DateOfBirth { get; set; }
            public string? BloodGroup { get; set; }
            public string? MobileNumber { get; set; }
            public string? Email { get; set; }
            public string? AadhaarNumber { get; set; }
            public int BoardId { get; set; }
            public int AcademicYearId { get; set; }
            public int AcademicLevelId { get; set; }
            public int GroupId { get; set; }
            public int? ProgramId { get; set; }
            public int? SectionId { get; set; }
            public DateTime AdmissionDate { get; set; }
            public string AdmissionType { get; set; } = "Regular";
            public string AdmissionQuota { get; set; } = "General";
            public string Medium { get; set; } = "English";
            public string SecondLanguage { get; set; } = "Sanskrit";
            public string Nationality { get; set; } = "Indian";
            public string Religion { get; set; } = "Hindu";
            public string Category { get; set; } = "General";
            public string StudentCategory { get; set; } = "Day Scholar";
            public string? FatherName { get; set; }
            public string? FatherOccupation { get; set; }
            public string? FatherMobile { get; set; }
            public string? FatherEmail { get; set; }
            public string? MotherName { get; set; }
            public string? MotherOccupation { get; set; }
            public string? MotherMobile { get; set; }
            public string? MotherEmail { get; set; }
            public string? GuardianName { get; set; }
            public string? GuardianMobile { get; set; }
            public string? GuardianEmail { get; set; }
            public string? Address { get; set; }
            public string? City { get; set; }
            public string? District { get; set; }
            public string? State { get; set; }
            public string? Pincode { get; set; }
            public string? PreviousSchool { get; set; }
            public string? PreviousBoard { get; set; }
            public string? PreviousHallTicketNumber { get; set; }
            public int? PreviousYearOfPassing { get; set; }
            public decimal? PreviousPercentage { get; set; }
            public decimal FeeAmount { get; set; }
            public decimal FeePaid { get; set; }
            public string FeeStatus { get; set; } = "Unpaid";
            public string? ScholarshipStatus { get; set; }
            public decimal? ScholarshipAmount { get; set; }
            public decimal? AnnualIncome { get; set; }
            public decimal AttendancePercentage { get; set; }
            public string? PerformanceGrade { get; set; }
            public decimal? CGPA { get; set; }
            public int? Rank { get; set; }
            public string? Remarks { get; set; }
            public string PasswordHash { get; set; } = string.Empty;
        }
    }
}
