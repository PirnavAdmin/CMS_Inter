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
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Imports;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentImportService : IStudentImportService
    {
        private readonly AppDbContext _context;
        private readonly IStudentImportRepository _studentImportRepository;
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
            IStudentImportRepository studentImportRepository,
            IUserProvisioningService userProvisioningService,
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<StudentImportService> logger)
        {
            _context = context;
            _studentImportRepository = studentImportRepository;
            _userProvisioningService = userProvisioningService;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<byte[]> GenerateCredentialsPdfAsync(
            StudentCredentialPdfFilterDto? filter = null,
            CancellationToken ct = default)
        {
            var records = await _studentImportRepository.GetStudentCredentialsForExportAsync(filter, ct);

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
            var lookups = await _studentImportRepository.GetTemplateLookupsAsync(ct);

            return StudentExcelImportTemplateBuilder.BuildTemplate(
                lookups.Boards,
                lookups.AcademicYears,
                lookups.AcademicLevels,
                lookups.Groups,
                lookups.Programs,
                lookups.Sections);
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
                    Message = "No valid records available for import.",
                    Errors = errors
                };
            }

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)connection).OpenAsync(ct);
            }

            var provisionedUsers = new List<UserProvisioningResult>();

            using var transaction = connection.BeginTransaction();
            try
            {
                foreach (var s in validRowsToInsert)
                {
                    var studentId = await _studentImportRepository.InsertImportedStudentAsync(s, connection, transaction);

                    if (!string.IsNullOrWhiteSpace(s.Email) && EmailRegex.IsMatch(s.Email))
                    {
                        var provReq = new ProvisionStudentUserRequest
                        {
                            StudentId = studentId,
                            FullName = s.StudentName,
                            Email = s.Email,
                            PhoneNumber = s.MobileNumber
                        };

                        var userResult = await _userProvisioningService.ProvisionStudentUserAsync(
                            provReq,
                            connection,
                            transaction);

                        if (userResult.Success)
                        {
                            provisionedUsers.Add(userResult);
                        }
                        else
                        {
                            _logger.LogWarning("Failed to provision centralized user account for imported student {AdmissionNo} ({Email}): {Error}",
                                s.AdmissionNo, s.Email, userResult.ErrorMessage);
                        }
                    }
                }

                transaction.Commit();
            }
            catch (Exception ex)
            {
                try { transaction.Rollback(); } catch { }
                _logger.LogError(ex, "Transaction rolled back during Excel student import batch.");
                throw;
            }

            // Post-commit: background async dispatch of onboarding credential emails
            _ = Task.Run(async () =>
            {
                var portalUrl = _configuration?["StudentPortal:LoginUrl"]
                             ?? _configuration?["InstitutionSettings:PortalUrl"]
                             ?? "http://localhost:5173";

                var institutionName = _configuration?["InstitutionSettings:InstitutionName"]
                                   ?? "College Management System";

                foreach (var u in provisionedUsers)
                {
                    if (string.IsNullOrWhiteSpace(u.Email) || string.IsNullOrWhiteSpace(u.TemporaryPassword))
                        continue;

                    try
                    {
                        var emailBody = StudentCredentialHelper.BuildInitialCredentialEmailHtml(
                            u.FullName ?? "Student",
                            u.Email,
                            u.TemporaryPassword,
                            portalUrl,
                            institutionName);

                        await _emailService.SendEmailAsync(
                            u.Email,
                            $"Your Student Portal Account Credentials - {institutionName}",
                            emailBody);
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogWarning(emailEx, "Failed to send onboarding credentials email to {Email}", u.Email);
                    }
                }
            }, ct);

            int insertedCount = validRowsToInsert.Count;
            int failedCount = distinctFailedRows.Count;

            return new StudentImportResultDto
            {
                TotalRows = rows.Count,
                SuccessfulRows = insertedCount,
                FailedRows = failedCount,
                IsSuccess = failedCount == 0,
                Message = failedCount == 0
                    ? $"Successfully imported all {insertedCount} student(s)."
                    : $"Imported {insertedCount} valid student(s). {failedCount} row(s) failed validation.",
                Errors = errors
            };
        }

        private async Task<(List<StudentImportRowDto> Rows, List<StudentImportRowErrorDto> Errors, List<ResolvedStudentInsertModel> ResolvedModels)>
            ProcessWorkbookInternalAsync(IFormFile file, CancellationToken ct)
        {
            var errors = new List<StudentImportRowErrorDto>();
            var resolvedList = new List<ResolvedStudentInsertModel>();

            if (file == null || file.Length == 0)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "Please select a valid Excel file to import."
                });
                return (new List<StudentImportRowDto>(), errors, resolvedList);
            }

            var extension = Path.GetExtension(file.FileName);
            if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(extension, ".xls", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "Only .xlsx and .xls Excel files are supported."
                });
                return (new List<StudentImportRowDto>(), errors, resolvedList);
            }

            List<StudentImportRowDto> rows;
            using (var stream = new MemoryStream())
            {
                await file.CopyToAsync(stream, ct);
                stream.Position = 0;
                var parsed = StudentExcelImportReader.ReadWorkbook(stream);
                rows = parsed.Rows;
                if (parsed.StructureErrors.Count > 0)
                {
                    errors.AddRange(parsed.StructureErrors);
                    return (rows, errors, resolvedList);
                }
            }

            if (rows.Count == 0)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = "The uploaded Excel sheet contains no data rows to process."
                });
                return (rows, errors, resolvedList);
            }

            // 1. Preload master lookup caches
            var masterData = await PreloadMasterDataAsync();

            // 2. Intra-file Duplicate Tracking
            var seenAdmissionNos = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
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
                            FieldName = "AdmissionNo",
                            InvalidValue = adm,
                            ErrorMessage = $"Duplicate Admission No '{adm}' found in workbook (first seen at Row {firstRow})."
                        });
                    }
                    else
                    {
                        seenAdmissionNos[adm] = r.RowNumber;
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

            // 3. Existing DB Duplicate Check in 1 batch query via Repository
            var distinctAdmissionNos = rows
                .Where(r => !string.IsNullOrWhiteSpace(r.AdmissionNo))
                .Select(r => r.AdmissionNo!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var existingAdmissionNos = await _studentImportRepository.GetExistingAdmissionNumbersAsync(distinctAdmissionNos, ct);

            // 4. Row-by-Row Validation & Resolution
            foreach (var r in rows)
            {
                var rowErrors = ValidateAndResolveRow(r, masterData, existingAdmissionNos);
                if (rowErrors.Errors.Count > 0)
                {
                    errors.AddRange(rowErrors.Errors);
                }
                else if (rowErrors.ResolvedModel != null)
                {
                    resolvedList.Add(rowErrors.ResolvedModel);
                }
            }

            return (rows, errors, resolvedList);
        }

        private (List<StudentImportRowErrorDto> Errors, ResolvedStudentInsertModel? ResolvedModel)
            ValidateAndResolveRow(StudentImportRowDto r, MasterDataCache master, HashSet<string> existingAdmissionNos)
        {
            var errors = new List<StudentImportRowErrorDto>();

            // Mandatory Student Name
            if (string.IsNullOrWhiteSpace(r.StudentName))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "StudentName",
                    InvalidValue = r.StudentName,
                    ErrorMessage = "Student Name is required."
                });
            }

            // Mandatory Admission No
            if (string.IsNullOrWhiteSpace(r.AdmissionNo))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "AdmissionNo",
                    InvalidValue = r.AdmissionNo,
                    ErrorMessage = "Admission Number is required."
                });
            }
            else if (existingAdmissionNos.Contains(r.AdmissionNo.Trim()))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "AdmissionNo",
                    InvalidValue = r.AdmissionNo,
                    ErrorMessage = $"Admission Number '{r.AdmissionNo.Trim()}' already exists in the system database."
                });
            }

            // Gender
            string cleanGender = "Other";
            if (string.IsNullOrWhiteSpace(r.Gender))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "Gender",
                    InvalidValue = r.Gender,
                    ErrorMessage = "Gender is required (Male, Female, or Other)."
                });
            }
            else if (!ValidGenders.Contains(r.Gender.Trim()))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "Gender",
                    InvalidValue = r.Gender,
                    ErrorMessage = $"Invalid Gender '{r.Gender}'. Supported values are: Male, Female, Other."
                });
            }
            else
            {
                cleanGender = ValidGenders.First(g => string.Equals(g, r.Gender.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            // Date of Birth
            DateTime parsedDob = default;
            if (!r.DateOfBirth.HasValue)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "DateOfBirth",
                    InvalidValue = null,
                    ErrorMessage = "Date of Birth is required (Format: YYYY-MM-DD or DD/MM/YYYY)."
                });
            }
            else if (r.DateOfBirth.Value > DateTime.Today || r.DateOfBirth.Value < DateTime.Today.AddYears(-100))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "DateOfBirth",
                    InvalidValue = r.DateOfBirth.Value.ToString("yyyy-MM-dd"),
                    ErrorMessage = $"Invalid Date of Birth '{r.DateOfBirth.Value:yyyy-MM-dd}'. Must be a valid past date."
                });
            }
            else
            {
                parsedDob = r.DateOfBirth.Value;
            }

            // Mobile Number
            if (!string.IsNullOrWhiteSpace(r.MobileNumber))
            {
                var mob = r.MobileNumber.Trim();
                if (!PhoneRegex.IsMatch(mob))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "MobileNumber",
                        InvalidValue = r.MobileNumber,
                        ErrorMessage = "Mobile Number must be a valid 10-digit Indian phone number starting with 6-9."
                    });
                }
            }

            // Email
            if (!string.IsNullOrWhiteSpace(r.Email))
            {
                var em = r.Email.Trim();
                if (!EmailRegex.IsMatch(em))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "Email",
                        InvalidValue = r.Email,
                        ErrorMessage = "Email must be a valid email address format."
                    });
                }
            }

            // Aadhaar Number
            if (!string.IsNullOrWhiteSpace(r.AadhaarNumber))
            {
                var aadh = r.AadhaarNumber.Trim();
                if (!AadhaarRegex.IsMatch(aadh))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "AadhaarNumber",
                        InvalidValue = r.AadhaarNumber,
                        ErrorMessage = "Aadhaar Number must be exactly 12 digits."
                    });
                }
            }

            // Blood Group
            string? cleanBloodGroup = null;
            if (!string.IsNullOrWhiteSpace(r.BloodGroup))
            {
                var bg = r.BloodGroup.Trim();
                if (!ValidBloodGroups.Contains(bg))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "BloodGroup",
                        InvalidValue = r.BloodGroup,
                        ErrorMessage = $"Invalid Blood Group '{bg}'. Allowed values: A+, A-, B+, B-, O+, O-, AB+, AB-."
                    });
                }
                else
                {
                    cleanBloodGroup = ValidBloodGroups.First(b => string.Equals(b, bg, StringComparison.OrdinalIgnoreCase));
                }
            }

            // Pincode
            if (!string.IsNullOrWhiteSpace(r.Pincode))
            {
                var pin = r.Pincode.Trim();
                if (!PincodeRegex.IsMatch(pin))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "Pincode",
                        InvalidValue = r.Pincode,
                        ErrorMessage = "Pincode must be exactly 6 digits."
                    });
                }
            }

            // -------------------------------------------------------------
            // Hierarchy Resolution: Board -> Year -> Level -> Group -> Program -> Section
            // -------------------------------------------------------------
            int resolvedBoardId = 0;
            if (string.IsNullOrWhiteSpace(r.BoardCode))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "BoardCode",
                    InvalidValue = r.BoardCode,
                    ErrorMessage = "Board Code is required."
                });
            }
            else if (!master.BoardsByCode.TryGetValue(r.BoardCode.Trim(), out var bInfo))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "BoardCode",
                    InvalidValue = r.BoardCode,
                    ErrorMessage = $"Board Code '{r.BoardCode}' is invalid or inactive."
                });
            }
            else
            {
                resolvedBoardId = bInfo.BoardId;
            }

            int resolvedYearId = 0;
            if (string.IsNullOrWhiteSpace(r.AcademicYear))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "AcademicYear",
                    InvalidValue = r.AcademicYear,
                    ErrorMessage = "Academic Year is required."
                });
            }
            else
            {
                var yKey = $"{resolvedBoardId}_{r.AcademicYear.Trim()}";
                if (master.YearsByBoardAndName.TryGetValue(yKey, out int yId))
                {
                    resolvedYearId = yId;
                }
                else if (master.YearsByName.TryGetValue(r.AcademicYear.Trim(), out int yFallbackId))
                {
                    resolvedYearId = yFallbackId;
                }
                else
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "AcademicYear",
                        InvalidValue = r.AcademicYear,
                        ErrorMessage = $"Academic Year '{r.AcademicYear}' was not found or is inactive."
                    });
                }
            }

            int resolvedLevelId = 0;
            if (string.IsNullOrWhiteSpace(r.AcademicLevel))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "AcademicLevel",
                    InvalidValue = r.AcademicLevel,
                    ErrorMessage = "Academic Level is required."
                });
            }
            else if (!master.LevelsByCodeOrName.TryGetValue(r.AcademicLevel.Trim(), out resolvedLevelId))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "AcademicLevel",
                    InvalidValue = r.AcademicLevel,
                    ErrorMessage = $"Academic Level '{r.AcademicLevel}' is invalid or inactive."
                });
            }

            int resolvedGroupId = 0;
            if (string.IsNullOrWhiteSpace(r.GroupCode))
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = r.RowNumber,
                    FieldName = "GroupCode",
                    InvalidValue = r.GroupCode,
                    ErrorMessage = "Group Code/Name is required."
                });
            }
            else
            {
                var gKey = $"{resolvedBoardId}_{resolvedYearId}_{resolvedLevelId}_{r.GroupCode.Trim()}";
                if (!master.GroupsByContext.TryGetValue(gKey, out resolvedGroupId))
                {
                    var looseMatch = master.GroupsByContext.FirstOrDefault(kv => kv.Key.EndsWith($"_{r.GroupCode.Trim()}", StringComparison.OrdinalIgnoreCase));
                    if (looseMatch.Value > 0)
                    {
                        resolvedGroupId = looseMatch.Value;
                    }
                    else
                    {
                        errors.Add(new StudentImportRowErrorDto
                        {
                            RowNumber = r.RowNumber,
                            FieldName = "GroupCode",
                            InvalidValue = r.GroupCode,
                            ErrorMessage = $"Group '{r.GroupCode}' does not exist under the specified Board/Year/Level context."
                        });
                    }
                }
            }

            int? resolvedProgramId = null;
            if (!string.IsNullOrWhiteSpace(r.ProgramName))
            {
                var pKey = $"{resolvedGroupId}_{r.ProgramName.Trim()}";
                if (master.ProgramsByGroup.TryGetValue(pKey, out int pId))
                {
                    resolvedProgramId = pId;
                }
                else
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "ProgramName",
                        InvalidValue = r.ProgramName,
                        ErrorMessage = $"Program '{r.ProgramName}' is not mapped to Group '{r.GroupCode}'."
                    });
                }
            }

            int? resolvedSectionId = null;
            if (!string.IsNullOrWhiteSpace(r.SectionName))
            {
                var secName = r.SectionName.Trim();
                int progId = resolvedProgramId ?? 0;

                string sKey1 = $"{resolvedBoardId}_{resolvedYearId}_{resolvedLevelId}_{resolvedGroupId}_{progId}_{secName}";
                string sKey2 = $"{resolvedBoardId}_{resolvedYearId}_{resolvedLevelId}_{resolvedGroupId}_0_{secName}";
                string sKey3 = $"{resolvedBoardId}_{resolvedYearId}_{resolvedGroupId}_{progId}_{secName}";
                string sKey4 = $"{resolvedBoardId}_{resolvedYearId}_{resolvedGroupId}_0_{secName}";
                string sKey5 = $"{resolvedGroupId}_{secName}";

                if (master.SectionsExact.TryGetValue(sKey1, out int sId) ||
                    master.SectionsExact.TryGetValue(sKey2, out sId) ||
                    master.SectionsByGroupYear.TryGetValue(sKey3, out sId) ||
                    master.SectionsByGroupYear.TryGetValue(sKey4, out sId) ||
                    master.SectionsByGroup.TryGetValue(sKey5, out sId))
                {
                    resolvedSectionId = sId;
                }
                else
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = r.RowNumber,
                        FieldName = "SectionName",
                        InvalidValue = r.SectionName,
                        ErrorMessage = $"Section '{secName}' was not found under Group '{r.GroupCode}'."
                    });
                }
            }

            if (errors.Count > 0)
            {
                return (errors, null);
            }

            DateTime admDate = r.AdmissionDate ?? DateTime.Today;

            string cleanFeeStatus = "Unpaid";
            if (!string.IsNullOrWhiteSpace(r.FeeStatus) && ValidFeeStatuses.Contains(r.FeeStatus.Trim()))
            {
                cleanFeeStatus = ValidFeeStatuses.First(f => string.Equals(f, r.FeeStatus.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword("Student@123");

            var resolved = new ResolvedStudentInsertModel
            {
                RowNumber = r.RowNumber,
                AdmissionNo = r.AdmissionNo!.Trim(),
                RollNo = r.RollNo?.Trim(),
                StudentName = r.StudentName!.Trim(),
                Gender = cleanGender,
                DateOfBirth = parsedDob,
                BloodGroup = cleanBloodGroup,
                MobileNumber = r.MobileNumber?.Trim(),
                Email = r.Email?.Trim(),
                AadhaarNumber = r.AadhaarNumber?.Trim(),
                BoardId = resolvedBoardId,
                AcademicYearId = resolvedYearId,
                AcademicLevelId = resolvedLevelId,
                GroupId = resolvedGroupId,
                ProgramId = resolvedProgramId,
                SectionId = resolvedSectionId,
                AdmissionDate = admDate,
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
                FeeAmount = r.FeeAmount,
                FeePaid = r.FeePaid,
                FeeStatus = cleanFeeStatus,
                ScholarshipStatus = r.ScholarshipStatus?.Trim(),
                ScholarshipAmount = r.ScholarshipAmount,
                AnnualIncome = r.AnnualIncome,
                AttendancePercentage = r.AttendancePercentage,
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
            var raw = await _studentImportRepository.GetMasterDataAsync();

            // 1. Boards
            foreach (var b in raw.Boards)
            {
                if (!string.IsNullOrWhiteSpace(b.BoardCode))
                    cache.BoardsByCode[b.BoardCode.Trim()] = (b.BoardId, b.BoardName);
            }

            // 2. Academic Years
            foreach (var y in raw.AcademicYears)
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
            foreach (var l in raw.AcademicLevels)
            {
                if (!string.IsNullOrWhiteSpace(l.LevelCode))
                    cache.LevelsByCodeOrName[l.LevelCode.Trim()] = l.AcademicLevelId;
                if (!string.IsNullOrWhiteSpace(l.LevelName))
                    cache.LevelsByCodeOrName[l.LevelName.Trim()] = l.AcademicLevelId;
            }

            // 4. Groups
            foreach (var g in raw.Groups)
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
            foreach (var gp in raw.GroupPrograms)
            {
                if (!string.IsNullOrWhiteSpace(gp.ProgramName))
                {
                    string key = $"{gp.GroupId}_{gp.ProgramName.Trim()}";
                    cache.ProgramsByGroup[key] = gp.ProgramId;
                }
            }

            // 6. Sections
            foreach (var s in raw.Sections)
            {
                if (!string.IsNullOrWhiteSpace(s.SectionName))
                {
                    string sName = s.SectionName.Trim();
                    int progId = s.ProgramId ?? 0;

                    cache.SectionsExact[$"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_{progId}_{sName}"] = s.SectionId;
                    if (!cache.SectionsExact.ContainsKey($"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_0_{sName}"))
                    {
                        cache.SectionsExact[$"{s.BoardId}_{s.AcademicYearId}_{s.AcademicLevelId}_{s.GroupId}_0_{sName}"] = s.SectionId;
                    }

                    cache.SectionsByGroupYear[$"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_{progId}_{sName}"] = s.SectionId;
                    if (!cache.SectionsByGroupYear.ContainsKey($"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_0_{sName}"))
                    {
                        cache.SectionsByGroupYear[$"{s.BoardId}_{s.AcademicYearId}_{s.GroupId}_0_{sName}"] = s.SectionId;
                    }

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
            public decimal? FeeAmount { get; set; }
            public decimal? FeePaid { get; set; }
            public string FeeStatus { get; set; } = "Unpaid";
            public string? ScholarshipStatus { get; set; }
            public decimal? ScholarshipAmount { get; set; }
            public decimal? AnnualIncome { get; set; }
            public decimal? AttendancePercentage { get; set; }
            public string? PerformanceGrade { get; set; }
            public decimal? CGPA { get; set; }
            public int? Rank { get; set; }
            public string? Remarks { get; set; }
            public string PasswordHash { get; set; } = string.Empty;
        }
    }
}
