using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Validators.StudentAdmission;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentAdmissionService
        : IStudentAdmissionService
    {
        private readonly IStudentAdmissionRepository _repository;
        private readonly IUserProvisioningService _userProvisioningService;
        private readonly IEmailService _emailService;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<StudentAdmissionService> _logger;
        private readonly INumberSeriesService _numberSeriesService;
        private readonly IAuditLoggingService _auditLoggingService;

        public StudentAdmissionService(
            IStudentAdmissionRepository repository,
            IUserProvisioningService userProvisioningService,
            IEmailService emailService,
            AppDbContext context,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<StudentAdmissionService> logger,
            INumberSeriesService numberSeriesService, IAuditLoggingService auditLoggingService)
        {
            _repository = repository;
            _userProvisioningService = userProvisioningService;
            _emailService = emailService;
            _context = context;
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
            _numberSeriesService = numberSeriesService;
            _auditLoggingService = auditLoggingService;
        }


        // =====================================================
        // CREATE ADMISSION (VALIDATED, TRANSACTIONAL, IDEMPOTENT)
        // =====================================================

        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request)
        {
            var result = await CreateIdempotentAsync(request, request?.IdempotencyKey, null);
            return result.Admission;
        }

        public async Task<StudentAdmissionCreateResultDto> CreateIdempotentAsync(
            CreateStudentAdmissionRequest request,
            string? idempotencyKey = null,
            int? createdByUserId = null)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var effectiveKey = string.IsNullOrWhiteSpace(idempotencyKey)
                ? (string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim())
                : idempotencyKey.Trim();

            if (!string.IsNullOrEmpty(effectiveKey) && effectiveKey.Length > 128)
                throw new ArgumentException("Idempotency-Key cannot exceed 128 characters.");

            // 1. Run ALL mandatory, business-rule, photo, and master reference validations BEFORE any sequence allocation
            await ValidateCreateAndPhotoAsync(request);
            await _repository.ValidateMasterReferencesAsync(request);

            // 2. Acquire or replay persistent DB idempotency record when key is present
            string? requestHash = null;
            if (!string.IsNullOrEmpty(effectiveKey))
            {
                requestHash = await ComputeCreateRequestHashAsync(request);
                var lockRecord = await _repository.TryBeginIdempotencyAsync(
                    effectiveKey,
                    request.CampusId,
                    createdByUserId,
                    requestHash,
                    DateTime.UtcNow.AddHours(24));

                if (lockRecord == null)
                    throw new InvalidOperationException("Failed to initialize admission idempotency lock.");

                if (lockRecord.LockAcquired == 0)
                {
                    return await ResolveExistingIdempotencyRecordAsync(effectiveKey, requestHash, lockRecord);
                }
            }

            // 3. Execute number allocation + photo write + admission insert + idempotency completion in ONE DB transaction
            string? savedPhotoPhysicalPath = null;
            try
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                StudentAdmissionResponseDto created = await strategy.ExecuteAsync(async () =>
                {
                    // Reset per execution-strategy attempt
                    if (!string.IsNullOrWhiteSpace(savedPhotoPhysicalPath) && File.Exists(savedPhotoPhysicalPath))
                    {
                        try { File.Delete(savedPhotoPhysicalPath); } catch { }
                        savedPhotoPhysicalPath = null;
                    }

                    await using var efTransaction = await _context.Database.BeginTransactionAsync();
                    var dbConnection = _context.Database.GetDbConnection();
                    var dbTransaction = efTransaction.GetDbTransaction();

                    try
                    {
                        if (!request.IsReferral)
                        {
                            var allocatedNumber = await GenerateAdmissionNumberAsync(
                                request.CampusId,
                                request.BoardId,
                                request.AcademicYearId,
                                isReferral: false);

                            if (string.IsNullOrWhiteSpace(allocatedNumber) || allocatedNumber == "0")
                            {
                                throw new InvalidOperationException("Active admission number could not be allocated.");
                            }

                            request.AdmissionNo = allocatedNumber;
                        }
                        else
                        {
                            request.AdmissionNo = null;
                        }

                        string? photoPath = null;
                        if (request.StudentPhoto != null)
                        {
                            var saved = await SaveStudentPhotoAsync(request.StudentPhoto);
                            photoPath = saved.RelativePath;
                            savedPhotoPhysicalPath = saved.PhysicalPath;
                        }

                        var inserted = await _repository.CreateAsync(
                            request,
                            photoPath,
                            dbConnection,
                            dbTransaction);

                        if (!string.IsNullOrEmpty(effectiveKey))
                        {
                            var responseJson = JsonSerializer.Serialize(inserted);
                            await _repository.CompleteIdempotencyAsync(
                                effectiveKey,
                                inserted.AdmissionId,
                                inserted.AdmissionNo,
                                201,
                                responseJson,
                                dbConnection,
                                dbTransaction);
                        }

                        await efTransaction.CommitAsync();
                        return inserted;
                    }
                    catch
                    {
                        await efTransaction.RollbackAsync();
                        if (!string.IsNullOrWhiteSpace(savedPhotoPhysicalPath) && File.Exists(savedPhotoPhysicalPath))
                        {
                            try { File.Delete(savedPhotoPhysicalPath); } catch { }
                            savedPhotoPhysicalPath = null;
                        }
                        throw;
                    }
                });

                return new StudentAdmissionCreateResultDto
                {
                    Admission = created,
                    IsIdempotentReplay = false,
                    IdempotencyKey = effectiveKey
                };
            }
            catch (Exception ex) when (
                !string.IsNullOrEmpty(effectiveKey) &&
                ex is not AdmissionIdempotencyConflictException &&
                ex is not AdmissionIdempotencyInProgressException)
            {
                if (!string.IsNullOrWhiteSpace(savedPhotoPhysicalPath) && File.Exists(savedPhotoPhysicalPath))
                {
                    try { File.Delete(savedPhotoPhysicalPath); } catch { }
                }

                int failureStatusCode = ex is ArgumentException ? 400 : 500;
                try
                {
                    await _repository.FailIdempotencyAsync(effectiveKey, failureStatusCode, ex.Message);
                }
                catch (Exception failEx)
                {
                    _logger.LogWarning(failEx, "Failed to mark idempotency key {IdempotencyKey} as FAILED.", effectiveKey);
                }

                throw;
            }
        }

        public async Task<StudentAdmissionRecoveryResponseDto?> RecoverByIdempotencyKeyAsync(string idempotencyKey)
        {
            if (string.IsNullOrWhiteSpace(idempotencyKey))
                throw new ArgumentException("Idempotency-Key is required.");

            var record = await _repository.GetIdempotencyRecordAsync(idempotencyKey.Trim());
            if (record == null)
                return null;

            StudentAdmissionResponseDto? admission = null;
            if (string.Equals(record.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                if (record.AdmissionId.HasValue && record.AdmissionId.Value > 0)
                {
                    admission = await _repository.GetByIdAsync(record.AdmissionId.Value);
                }

                if (admission == null && !string.IsNullOrWhiteSpace(record.ResponseJson))
                {
                    try
                    {
                        admission = JsonSerializer.Deserialize<StudentAdmissionResponseDto>(
                            record.ResponseJson,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    }
                    catch { }
                }
            }

            var normalizedStatus = record.Status.ToUpperInvariant();
            var resultStatus = normalizedStatus switch
            {
                "COMPLETED" => "Created",
                "IN_PROGRESS" => "Processing",
                "FAILED" => "Failed",
                _ => record.Status
            };

            return new StudentAdmissionRecoveryResponseDto
            {
                IdempotencyKey = record.IdempotencyKey,
                Status = normalizedStatus,
                ResultStatus = resultStatus,
                AdmissionId = record.AdmissionId,
                AdmissionNo = admission?.AdmissionNo ?? record.AdmissionNo,
                HttpStatusCode = record.HttpStatusCode ?? (normalizedStatus == "IN_PROGRESS" ? 202 : null),
                ErrorMessage = record.ErrorMessage,
                Admission = admission,
                CreatedAt = record.CreatedAt,
                UpdatedAt = record.UpdatedAt
            };
        }

        private async Task<StudentAdmissionCreateResultDto> ResolveExistingIdempotencyRecordAsync(
            string idempotencyKey,
            string requestHash,
            AdmissionIdempotencyRecordDto existing)
        {
            if (!string.Equals(existing.RequestHash, requestHash, StringComparison.OrdinalIgnoreCase))
            {
                throw new AdmissionIdempotencyConflictException(
                    idempotencyKey,
                    "Idempotency-Key has already been used with a different admission request payload.");
            }

            var current = existing;
            if (string.Equals(current.Status, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase))
            {
                // Briefly wait in case a simultaneous concurrent request is finishing commit
                for (int i = 0; i < 10; i++)
                {
                    await Task.Delay(250);
                    var refreshed = await _repository.GetIdempotencyRecordAsync(idempotencyKey);
                    if (refreshed == null) break;
                    current = refreshed;
                    if (!string.Equals(current.Status, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase))
                        break;
                }
            }

            if (string.Equals(current.Status, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase))
            {
                throw new AdmissionIdempotencyInProgressException(
                    idempotencyKey,
                    "An admission submission with this Idempotency-Key is currently in progress. Please check the recovery endpoint.");
            }

            if (string.Equals(current.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                StudentAdmissionResponseDto? replayDto = null;
                if (current.AdmissionId.HasValue && current.AdmissionId.Value > 0)
                {
                    replayDto = await _repository.GetByIdAsync(current.AdmissionId.Value);
                }

                if (replayDto == null && !string.IsNullOrWhiteSpace(current.ResponseJson))
                {
                    replayDto = JsonSerializer.Deserialize<StudentAdmissionResponseDto>(
                        current.ResponseJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }

                if (replayDto == null)
                {
                    throw new InvalidOperationException("Idempotent admission record is marked completed, but the admission details could not be loaded.");
                }

                return new StudentAdmissionCreateResultDto
                {
                    Admission = replayDto,
                    IsIdempotentReplay = true,
                    IdempotencyKey = idempotencyKey
                };
            }

            if (string.Equals(current.Status, "FAILED", StringComparison.OrdinalIgnoreCase))
            {
                var errMsg = current.ErrorMessage ?? "Previous submission with this Idempotency-Key failed.";
                if ((current.HttpStatusCode ?? 500) < 500)
                {
                    throw new ArgumentException(errMsg);
                }
                throw new InvalidOperationException(errMsg);
            }

            throw new InvalidOperationException($"Unsupported idempotency state '{current.Status}'.");
        }


        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<StudentAdmissionResponseDto?>
            GetByIdAsync(int admissionId)
        {
            if (admissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            var admission = await _repository.GetByIdAsync(
                admissionId);

            if (admission != null && admission.IsApproved && (!admission.StudentId.HasValue || admission.StudentId.Value <= 0))
            {
                var student = await _repository.GetStudentByAdmissionIdAsync(admissionId);
                if (student != null && student.StudentId > 0)
                {
                    admission.StudentId = student.StudentId;
                }
            }

            return admission;
        }


        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<IEnumerable<StudentAdmissionResponseDto>>
            GetAllAsync(int? campusId = null)
        {
            return await _repository.GetAllAsync(campusId);
        }


        // =====================================================
        // UPDATE
        // =====================================================

        public async Task<StudentAdmissionResponseDto?>
            UpdateAsync(
                int admissionId,
                UpdateStudentAdmissionRequest request)
        {
            if (admissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateUpdateRequest(request);

            string? photoPath = null;

            // Photo only if user uploads a new one
            if (request.StudentPhoto != null)
            {
                ValidateStudentPhoto(request.StudentPhoto);
                var saved = await SaveStudentPhotoAsync(request.StudentPhoto);
                photoPath = saved.RelativePath;
            }

            return await _repository.UpdateAsync(
                admissionId,
                request,
                photoPath);
        }


        //bloodgroup//
        public async Task<IEnumerable<string>> GetBloodGroupsAsync()
        {
            return await _repository.GetBloodGroupsAsync();
        }


        // =====================================================
        // VERIFY
        // =====================================================

        public async Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            return await _repository.VerifyAsync(
                request);
        }

        //generate//

        // =====================================================
        // PREVIEW ADMISSION NUMBER (NON-MUTATING)
        // =====================================================

        public async Task<string?> GetAdmissionNumberPreviewAsync(int? campusId = null, int? boardId = null, int? academicYearId = null, bool isReferral = false)
        {
            if (isReferral) return null;

            var seriesConfig = await _numberSeriesService.GetSeriesByCodeAsync("ADMISSION_NO", campusId);
            if (seriesConfig == null || !seriesConfig.IsActive)
            {
                throw new ArgumentException("Active admission number series configuration (ADMISSION_NO) was not found.");
            }

            string? boardCode = null;
            if (boardId.HasValue && boardId.Value > 0)
            {
                var b = await _context.Boards.FindAsync(boardId.Value);
                boardCode = b?.BoardCode;
            }

            string? ayName = null;
            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                var ay = await _context.AcademicYears.FindAsync(academicYearId.Value);
                ayName = ay?.AcademicYearName;
            }

            string? campusCode = null;
            if (campusId.HasValue && campusId.Value > 0)
            {
                var c = await _context.Campuses.FindAsync(campusId.Value);
                campusCode = c?.CampusCode;
            }

            var preview = await _numberSeriesService.GetLivePreviewAsync(
                "ADMISSION_NO",
                pattern: null,
                numberLength: null,
                prefix: null,
                campusId: campusId,
                board: boardCode ?? boardId?.ToString(),
                academicYear: ayName ?? academicYearId?.ToString(),
                campusCode: campusCode);

            if (string.IsNullOrWhiteSpace(preview) || preview == "0")
            {
                throw new InvalidOperationException("Unable to calculate admission number preview.");
            }

            return preview;
        }

        // =====================================================
        // GENERATE ADMISSION NUMBER (MUTATING SEQUENCE)
        // =====================================================

        public async Task<string?> GenerateAdmissionNumberAsync(int? campusId = null, int? boardId = null, int? academicYearId = null, bool isReferral = false)
        {
            if (isReferral) return null;

            string? boardCode = null;
            if (boardId.HasValue && boardId.Value > 0)
            {
                var b = await _context.Boards.FindAsync(boardId.Value);
                boardCode = b?.BoardCode;
            }

            string? ayName = null;
            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                var ay = await _context.AcademicYears.FindAsync(academicYearId.Value);
                ayName = ay?.AcademicYearName;
            }

            string? campusCode = null;
            if (campusId.HasValue && campusId.Value > 0)
            {
                var c = await _context.Campuses.FindAsync(campusId.Value);
                campusCode = c?.CampusCode;
            }

            var reqDto = new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto
            {
                Board = boardCode ?? boardId?.ToString(),
                BoardCode = boardCode,
                AcademicYear = ayName ?? academicYearId?.ToString(),
                CampusCode = campusCode
            };

            var generatedDto = await _numberSeriesService.GenerateNextNumberAsync("ADMISSION_NO", reqDto, campusId);
            if (generatedDto == null || string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber) || generatedDto.GeneratedNumber == "0")
            {
                throw new ArgumentException("Active admission number series configuration (ADMISSION_NO) could not generate the next number.");
            }

            return generatedDto.GeneratedNumber;
        }

        // =====================================================
        // APPROVE / REJECT ADMISSION REQUESTS (CROSS-CAMPUS REFERRALS)
        // =====================================================

        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetOutgoingRequestsAsync(int campusId)
        {
            return await _repository.GetOutgoingRequestsAsync(campusId);
        }

        public async Task<IEnumerable<StudentAdmissionResponseDto>> GetIncomingRequestsAsync(int campusId)
        {
            return await _repository.GetIncomingRequestsAsync(campusId);
        }

        public async Task<bool> ApproveAdmissionRequestAsync(int admissionId, string? remarks)
        {
            var admission = await _repository.GetByIdAsync(admissionId);
            if (admission == null)
                throw new KeyNotFoundException($"Admission request with ID {admissionId} not found.");

            string finalAdmissionNo = admission.AdmissionNo ?? string.Empty;
            var strategy = _context.Database.CreateExecutionStrategy();
            var result = await strategy.ExecuteAsync(async () =>
            {
                await using var efTransaction = await _context.Database.BeginTransactionAsync();
                var dbConn = _context.Database.GetDbConnection();
                var dbTx = efTransaction.GetDbTransaction();
                try
                {
                    string admissionNo = admission.AdmissionNo ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(admissionNo))
                    {
                        admissionNo = await GenerateAdmissionNumberAsync(admission.CampusId, admission.BoardId, admission.AcademicYearId, isReferral: false) ?? string.Empty;
                    }
                    finalAdmissionNo = admissionNo;

                    var ok = await _repository.ApproveAdmissionRequestAsync(admissionId, admissionNo, remarks, dbConn, dbTx);
                    if (!ok)
                    {
                        await efTransaction.RollbackAsync();
                        return false;
                    }
                    await efTransaction.CommitAsync();
                    return true;
                }
                catch
                {
                    await efTransaction.RollbackAsync();
                    throw;
                }
            });

            if (result)
            {
                await _auditLoggingService.LogAsync("Request Approved", "Admissions", finalAdmissionNo, "Info", "Success", remarks);
            }
            return result;
        }

        public async Task<bool> RejectAdmissionRequestAsync(int admissionId, string rejectionReason, string? remarks)
        {
            var admission = await _repository.GetByIdAsync(admissionId);
            if (admission == null)
                throw new KeyNotFoundException($"Admission request with ID {admissionId} not found.");

            var result = await _repository.RejectAdmissionRequestAsync(admissionId, rejectionReason, remarks);
            if (result)
            {
                await _auditLoggingService.LogAsync("Request Rejected", "Admissions", admission.AdmissionNo, "Warning", "Success", rejectionReason + " - " + remarks);
            }
            return result;
        }

        public async Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException("Invalid AdmissionId.");

            // 1. Fetch admission details
            var admission = await _repository.GetByIdAsync(request.AdmissionId);
            if (admission == null)
                throw new KeyNotFoundException($"Admission with ID {request.AdmissionId} not found.");

            if (admission.IsApproved)
            {
                _logger.LogInformation("Student admission {AdmissionId} is already approved.", request.AdmissionId);
                return true;
            }

            UserProvisioningResult? userProvisioningResult = null;
            ParentUserProvisioningResult? parentProvisioningResult = null;

            var strategy = _context.Database.CreateExecutionStrategy();
            var committed = await strategy.ExecuteAsync(async () =>
            {
                await using var efTransaction = await _context.Database.BeginTransactionAsync();
                var connection = _context.Database.GetDbConnection();
                var transaction = efTransaction.GetDbTransaction();
                userProvisioningResult = null;
                parentProvisioningResult = null;

                try
                {
                    if (string.IsNullOrWhiteSpace(admission.AdmissionNo))
                    {
                        admission.AdmissionNo = await GenerateAdmissionNumberAsync(admission.CampusId, admission.BoardId, admission.AcademicYearId);
                        if (!string.IsNullOrWhiteSpace(admission.AdmissionNo))
                        {
                            await _repository.UpdateAdmissionNumberAsync(admission.AdmissionId, admission.AdmissionNo, connection, transaction);
                        }
                    }
                // 3. Approve admission and create Student domain record in same transaction
                var approveSuccess = await _repository.ApproveAsync(
                    request,
                    passwordHash: null,
                    connection: connection,
                    transaction: transaction);

                if (!approveSuccess)
                {
                    transaction.Rollback();
                    return false;
                }

                // 4. Retrieve created Student domain record
                var student = await _repository.GetStudentByAdmissionIdAsync(
                    request.AdmissionId,
                    connection: connection,
                    transaction: transaction);

                if (student == null)
                {
                    transaction.Rollback();
                    throw new InvalidOperationException($"Approved Student domain record could not be found for AdmissionId {request.AdmissionId}.");
                }

                // 5. Evaluate Student Email for Student User account provisioning
                var studentEmail = !string.IsNullOrWhiteSpace(student.Email)
                    ? student.Email.Trim()
                    : (!string.IsNullOrWhiteSpace(admission.StudentEmail) ? admission.StudentEmail.Trim() : null);

                if (!string.IsNullOrWhiteSpace(studentEmail) && IsValidEmailFormat(studentEmail))
                {
                    var studentName = !string.IsNullOrWhiteSpace(student.StudentName)
                        ? student.StudentName.Trim()
                        : $"{admission.FirstName} {admission.LastName}".Trim();

                    var provisionRequest = new ProvisionStudentUserRequest
                    {
                        StudentId = student.StudentId,
                        FullName = studentName,
                        Email = studentEmail,
                        PhoneNumber = !string.IsNullOrWhiteSpace(student.MobileNumber)
                            ? student.MobileNumber.Trim()
                            : admission.StudentMobileNumber
                    };

                    // Atomically provision centralized User record inside same transaction
                    userProvisioningResult = await _userProvisioningService.ProvisionStudentUserAsync(
                        provisionRequest,
                        connection: connection,
                        transaction: transaction);

                    if (!userProvisioningResult.Success)
                    {
                        transaction.Rollback();
                        throw new InvalidOperationException($"Student user account provisioning failed: {userProvisioningResult.ErrorMessage}");
                    }
                }
                else
                {
                    _logger.LogInformation(
                        "Student admission {AdmissionId} (StudentId: {StudentId}) approved without a Student User account because no valid email was provided.",
                        request.AdmissionId, student.StudentId);
                }

                // 6. Evaluate Parent/Guardian Email for Parent User account provisioning & bridging mapping
                var parentEmail = !string.IsNullOrWhiteSpace(student.ParentGuardianEmail)
                    ? student.ParentGuardianEmail.Trim()
                    : (!string.IsNullOrWhiteSpace(admission.ParentGuardianEmail) ? admission.ParentGuardianEmail.Trim() : null);

                if (!string.IsNullOrWhiteSpace(parentEmail) && IsValidEmailFormat(parentEmail))
                {
                    var parentName = !string.IsNullOrWhiteSpace(student.FatherName)
                        ? student.FatherName.Trim()
                        : (!string.IsNullOrWhiteSpace(student.MotherName)
                            ? student.MotherName.Trim()
                            : (!string.IsNullOrWhiteSpace(student.GuardianName)
                                ? student.GuardianName.Trim()
                                : (!string.IsNullOrWhiteSpace(admission.FatherName)
                                    ? admission.FatherName.Trim()
                                    : (!string.IsNullOrWhiteSpace(admission.MotherName)
                                        ? admission.MotherName.Trim()
                                        : (!string.IsNullOrWhiteSpace(admission.GuardianName)
                                            ? admission.GuardianName.Trim()
                                            : "Parent / Guardian")))));

                    var parentPhone = !string.IsNullOrWhiteSpace(student.FatherMobile)
                        ? student.FatherMobile.Trim()
                        : (!string.IsNullOrWhiteSpace(student.MotherMobile)
                            ? student.MotherMobile.Trim()
                            : (!string.IsNullOrWhiteSpace(student.GuardianMobile)
                                ? student.GuardianMobile.Trim()
                                : (!string.IsNullOrWhiteSpace(admission.FatherMobile)
                                    ? admission.FatherMobile.Trim()
                                    : (!string.IsNullOrWhiteSpace(admission.MotherMobile)
                                        ? admission.MotherMobile.Trim()
                                        : admission.GuardianMobile))));

                    var relationshipType = !string.IsNullOrWhiteSpace(student.FatherName) || !string.IsNullOrWhiteSpace(admission.FatherName)
                        ? "Father"
                        : (!string.IsNullOrWhiteSpace(student.MotherName) || !string.IsNullOrWhiteSpace(admission.MotherName)
                            ? "Mother"
                            : "Guardian");

                    var parentProvisionRequest = new ProvisionParentUserRequest
                    {
                        StudentId = student.StudentId,
                        FullName = parentName,
                        Email = parentEmail,
                        PhoneNumber = parentPhone,
                        RelationshipType = relationshipType
                    };

                    parentProvisioningResult = await _userProvisioningService.ProvisionParentUserAsync(
                        parentProvisionRequest,
                        connection: connection,
                        transaction: transaction);

                    if (!parentProvisioningResult.Success)
                    {
                        transaction.Rollback();
                        throw new InvalidOperationException($"Parent user account provisioning failed: {parentProvisioningResult.ErrorMessage}");
                    }
                }
                else
                {
                    _logger.LogInformation(
                        "Student admission {AdmissionId} (StudentId: {StudentId}) approved without a Parent User account because no valid ParentGuardianEmail was provided.",
                        request.AdmissionId, student.StudentId);
                }

                    await efTransaction.CommitAsync();
                    _logger.LogInformation(
                        "Successfully committed Student approval for AdmissionId {AdmissionId} (StudentId: {StudentId}, StudentUserProvisioned: {StudentUser}, ParentUserProvisioned: {ParentUser})",
                        request.AdmissionId, student.StudentId, userProvisioningResult?.Success == true, parentProvisioningResult?.Success == true);
                    return true;
                }
                catch (Exception ex)
                {
                    try { await efTransaction.RollbackAsync(); } catch { }
                    _logger.LogError(ex, "Transaction rolled back during Student admission approval for AdmissionId {AdmissionId}", request.AdmissionId);
                    throw;
                }
            });

            if (!committed)
                return false;

            // 8. Post-commit Student initial credential onboarding email dispatch
            if (userProvisioningResult?.Success == true && !string.IsNullOrWhiteSpace(userProvisioningResult.TemporaryPassword))
            {
                try
                {
                    var portalUrl = _configuration?["StudentPortal:LoginUrl"]
                                 ?? _configuration?["InstitutionSettings:PortalUrl"]
                                 ?? "http://localhost:5173";

                    var institutionName = _configuration?["InstitutionSettings:InstitutionName"]
                                       ?? "College Management System";

                    var emailBody = StudentCredentialHelper.BuildInitialCredentialEmailHtml(
                        userProvisioningResult.FullName ?? $"{admission.FirstName} {admission.LastName}".Trim(),
                        userProvisioningResult.Email ?? admission.StudentEmail ?? string.Empty,
                        userProvisioningResult.TemporaryPassword,
                        portalUrl,
                        institutionName);

                    await _emailService.SendEmailAsync(
                        userProvisioningResult.Email,
                        $"Your Student Portal Account Credentials - {institutionName}",
                        emailBody);

                    _logger.LogInformation("Successfully sent student initial credential onboarding email to {Email}", userProvisioningResult.Email);
                }
                catch (Exception ex)
                {
                    // SMTP delivery failure after DB commit must NOT corrupt DB records or fail the API response.
                    _logger.LogWarning(ex, "Initial credential email delivery failed for student {Email} after successful commit.", userProvisioningResult.Email);
                }
            }

            // 9. Post-commit Parent onboarding or child linked notification email dispatch
            if (parentProvisioningResult?.Success == true && !string.IsNullOrWhiteSpace(parentProvisioningResult.Email))
            {
                try
                {
                    var portalUrl = _configuration?["ParentPortal:LoginUrl"]
                                 ?? _configuration?["InstitutionSettings:PortalUrl"]
                                 ?? "http://localhost:5173";

                    var institutionName = _configuration?["InstitutionSettings:InstitutionName"]
                                       ?? "College Management System";

                    var childDisplayName = !string.IsNullOrWhiteSpace(admission.FirstName)
                        ? $"{admission.FirstName} {admission.LastName}".Trim()
                        : "Student";

                    var admissionNoDisplay = admission.AdmissionNo ?? $"ADM-{request.AdmissionId}";

                    if (parentProvisioningResult.IsNewAccount && !string.IsNullOrWhiteSpace(parentProvisioningResult.TemporaryPassword))
                    {
                        var emailBody = ParentCredentialHelper.BuildInitialCredentialEmailHtml(
                            parentProvisioningResult.FullName ?? "Parent / Guardian",
                            parentProvisioningResult.Email,
                            parentProvisioningResult.TemporaryPassword,
                            childDisplayName,
                            admissionNoDisplay,
                            portalUrl,
                            institutionName);

                        await _emailService.SendEmailAsync(
                            parentProvisioningResult.Email,
                            $"Your Parent Portal Account Credentials - {institutionName}",
                            emailBody);

                        _logger.LogInformation("Successfully sent parent initial credential onboarding email to {Email}", parentProvisioningResult.Email);
                    }
                    else if (!parentProvisioningResult.IsNewAccount)
                    {
                        var emailBody = ParentCredentialHelper.BuildChildLinkedNotificationEmailHtml(
                            parentProvisioningResult.FullName ?? "Parent / Guardian",
                            parentProvisioningResult.Email,
                            childDisplayName,
                            admissionNoDisplay,
                            portalUrl,
                            institutionName);

                        await _emailService.SendEmailAsync(
                            parentProvisioningResult.Email,
                            $"New Student Linked to Your Parent Account - {institutionName}",
                            emailBody);

                        _logger.LogInformation("Successfully sent parent sibling linked notification email to {Email}", parentProvisioningResult.Email);
                    }
                }
                catch (Exception ex)
                {
                    // SMTP delivery failure after DB commit must NOT corrupt DB records or fail the API response.
                    _logger.LogWarning(ex, "Parent email delivery failed for parent {Email} after successful commit.", parentProvisioningResult.Email);
                }
            }

            return true;
        }

        private static bool IsValidEmailFormat(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new MailAddress(email.Trim());
                return addr.Address == email.Trim();
            }
            catch
            {
                return false;
            }
        }


        // =====================================================
        // REJECT
        // =====================================================

        public async Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (string.IsNullOrWhiteSpace(
                    request.RejectionReason))
            {
                throw new ArgumentException(
                    "Rejection reason is required.");
            }

            return await _repository.RejectAsync(
                request);
        }


        // =====================================================
        // SINGLE SECTION ALLOCATION
        // =====================================================

        public async Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.AdmissionId <= 0)
                throw new ArgumentException(
                    "Invalid AdmissionId.");

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            return await _repository
                .AllocateSectionAsync(request);
        }


        // =====================================================
        // BULK SECTION ALLOCATION
        // =====================================================

        public async Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            if (request.AdmissionIds == null ||
                request.AdmissionIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one admission must be selected.");
            }

            return await _repository
                .BulkAllocateSectionAsync(request);
        }


        // =====================================================
        // BULK ROLL NUMBER ALLOCATION
        // =====================================================

        public async Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            if (request.StartingRollNumber <= 0)
                throw new ArgumentException(
                    "Starting roll number must be greater than zero.");

            if (request.AdmissionIds == null ||
                request.AdmissionIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one admission must be selected.");
            }

            return await _repository
                .BulkAllocateRollNumbersAsync(request);
        }


        // =====================================================
        // CREATE VALIDATION
        // =====================================================

        private async Task ValidateCreateAndPhotoAsync(
            CreateStudentAdmissionRequest request)
        {
            ValidateCreateRequest(request);

            var validator = new CreateStudentAdmissionRequestValidator();
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                var firstError = validationResult.Errors.FirstOrDefault()?.ErrorMessage ?? "Invalid admission request payload.";
                throw new ArgumentException(firstError);
            }

            ValidateStudentPhoto(request.StudentPhoto);
        }

        private static void ValidateCreateRequest(
            CreateStudentAdmissionRequest request)
        {
            if (!request.CampusId.HasValue || request.CampusId.Value <= 0)
                throw new ArgumentException(
                    "Valid Campus is required.");

            if (request.AdmissionDate == default)
                throw new ArgumentException(
                    "Admission Date is required.");

            if (request.BoardId <= 0)
                throw new ArgumentException(
                    "Board is required.");

            if (request.AcademicYearId <= 0)
                throw new ArgumentException(
                    "Academic Year is required.");

            if (request.AcademicLevelId <= 0)
                throw new ArgumentException(
                    "Academic Level is required.");

            if (request.GroupId <= 0)
                throw new ArgumentException(
                    "Group is required.");

            if (request.ProgramId <= 0)
                throw new ArgumentException(
                    "Program is required.");

            if (!request.IsReferral && (!request.FeeStructureId.HasValue || request.FeeStructureId.Value <= 0))
                throw new ArgumentException(
                    "Fee structure is required.");

            if (string.IsNullOrWhiteSpace(
                    request.FirstName))
            {
                throw new ArgumentException(
                    "First name is required.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.Gender))
            {
                throw new ArgumentException(
                    "Gender is required.");
            }

            if (request.DateOfBirth == default)
                throw new ArgumentException(
                    "Date of birth is required.");
        }


        // =====================================================
        // UPDATE VALIDATION
        // =====================================================

        private static void ValidateUpdateRequest(
            UpdateStudentAdmissionRequest request)
        {
            if (request.BoardId <= 0)
                throw new ArgumentException(
                    "Board is required.");

            if (request.AcademicYearId <= 0)
                throw new ArgumentException(
                    "Academic Year is required.");

            if (request.AcademicLevelId <= 0)
                throw new ArgumentException(
                    "Academic Level is required.");

            if (request.GroupId <= 0)
                throw new ArgumentException(
                    "Group is required.");

            if (request.ProgramId <= 0)
                throw new ArgumentException(
                    "Program is required.");

            if (string.IsNullOrWhiteSpace(
                    request.FirstName))
            {
                throw new ArgumentException(
                    "First name is required.");
            }
        }
        //optional check box//
        public async Task<int> SaveAdmissionFeeSelectionsAsync(
            int admissionId,
            SaveAdmissionFeeSelectionsRequest request)
        {
            if (admissionId <= 0)
                throw new ArgumentException("Invalid AdmissionId.");

            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var deduplicatedIds = (request.SelectedFeeStructureComponentIds ?? new List<int>())
                .Distinct()
                .ToList();
            request.SelectedFeeStructureComponentIds = deduplicatedIds;

            await _repository.ValidateFeeSelectionInputsAsync(admissionId, deduplicatedIds);

            return await _repository.SaveAdmissionFeeSelectionsAsync(
                admissionId,
                request);
        }

        // =====================================================
        // PHOTO VALIDATION, FILE SAVE & REQUEST FINGERPRINTING
        // =====================================================

        private static void ValidateStudentPhoto(IFormFile? file)
        {
            if (file == null)
                return;

            if (file.Length <= 0)
                throw new ArgumentException("Uploaded student photo file cannot be empty.");

            const long maxFileSize = 5 * 1024 * 1024;
            if (file.Length > maxFileSize)
                throw new ArgumentException("Student photo must be less than 5 MB.");

            var extension = Path.GetExtension(file.FileName ?? string.Empty).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Only JPG, JPEG, PNG and WEBP photos are allowed.");

            Span<byte> header = stackalloc byte[12];
            using var stream = file.OpenReadStream();
            int read = stream.Read(header);
            if (read < 4)
                throw new ArgumentException("Invalid or corrupted student photo image.");

            bool validImage = extension switch
            {
                ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
                ".webp" => read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                                     && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
                _ => false
            };

            if (!validImage)
                throw new ArgumentException("Uploaded student photo content does not match a valid JPG, PNG, or WEBP image.");
        }

        private async Task<(string RelativePath, string PhysicalPath)> SaveStudentPhotoAsync(IFormFile file)
        {
            ValidateStudentPhoto(file);

            var extension = Path.GetExtension(file.FileName ?? string.Empty).ToLowerInvariant();
            var folder = Path.Combine(
                _environment.WebRootPath ?? "wwwroot",
                "uploads",
                "student-photos");

            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(folder, fileName);

            await using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            return ($"/uploads/student-photos/{fileName}", fullPath);
        }

        private static async Task<string> ComputeCreateRequestHashAsync(CreateStudentAdmissionRequest request)
        {
            string? photoHash = null;
            if (request.StudentPhoto != null && request.StudentPhoto.Length > 0)
            {
                using var photoStream = request.StudentPhoto.OpenReadStream();
                using var shaPhoto = SHA256.Create();
                var hashBytes = await shaPhoto.ComputeHashAsync(photoStream);
                photoHash = Convert.ToHexString(hashBytes);
            }

            var canonicalPayload = new
            {
                AdmissionDate = request.AdmissionDate.ToString("O"),
                AdmissionNo = request.AdmissionNo?.Trim() ?? string.Empty,
                AdmissionType = request.AdmissionType?.Trim() ?? string.Empty,
                AdmissionQuota = request.AdmissionQuota?.Trim() ?? string.Empty,
                request.CampusId,
                request.SourceCampusId,
                request.AdmittedById,
                request.IsReferral,
                request.BoardId,
                request.AcademicYearId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId,
                request.FeeStructureId,
                PaymentPlan = request.PaymentPlan?.Trim() ?? string.Empty,
                FirstName = request.FirstName?.Trim() ?? string.Empty,
                LastName = request.LastName?.Trim() ?? string.Empty,
                Gender = request.Gender?.Trim() ?? string.Empty,
                DateOfBirth = request.DateOfBirth.ToString("yyyy-MM-dd"),
                BloodGroup = request.BloodGroup?.Trim() ?? string.Empty,
                StudentEmail = request.StudentEmail?.Trim() ?? string.Empty,
                StudentMobileNumber = request.StudentMobileNumber?.Trim() ?? string.Empty,
                AadhaarNumber = request.AadhaarNumber?.Trim() ?? string.Empty,
                FatherName = request.FatherName?.Trim() ?? string.Empty,
                FatherMobile = request.FatherMobile?.Trim() ?? string.Empty,
                MotherName = request.MotherName?.Trim() ?? string.Empty,
                MotherMobile = request.MotherMobile?.Trim() ?? string.Empty,
                GuardianName = request.GuardianName?.Trim() ?? string.Empty,
                GuardianMobile = request.GuardianMobile?.Trim() ?? string.Empty,
                ParentGuardianEmail = request.ParentGuardianEmail?.Trim() ?? string.Empty,
                request.AnnualIncome,
                HouseDoorNumber = request.HouseDoorNumber?.Trim() ?? string.Empty,
                StreetVillage = request.StreetVillage?.Trim() ?? string.Empty,
                City = request.City?.Trim() ?? string.Empty,
                District = request.District?.Trim() ?? string.Empty,
                State = request.State?.Trim() ?? string.Empty,
                Pincode = request.Pincode?.Trim() ?? string.Empty,
                PreviousSchool = request.PreviousSchool?.Trim() ?? string.Empty,
                PreviousBoard = request.PreviousBoard?.Trim() ?? string.Empty,
                request.PreviousPercentage,
                request.PreviousYearOfPassing,
                StudentType = request.StudentType?.Trim() ?? string.Empty,
                request.TransportRequired,
                request.RouteId,
                request.PickupPointId,
                request.HostelId,
                request.RoomId,
                request.BedId,
                SelectedComponents = (request.SelectedFeeStructureComponentIds ?? new List<int>()).OrderBy(id => id).ToArray(),
                PhotoFileName = request.StudentPhoto?.FileName ?? string.Empty,
                PhotoLength = request.StudentPhoto?.Length ?? 0,
                PhotoHash = photoHash ?? string.Empty
            };

            var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(canonicalPayload));
            return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        }
    }
}





