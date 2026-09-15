using System;
using System.Collections.Generic;
using System.Data;
using System.Net.Mail;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
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

        public StudentAdmissionService(
            IStudentAdmissionRepository repository,
            IUserProvisioningService userProvisioningService,
            IEmailService emailService,
            AppDbContext context,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<StudentAdmissionService> logger)
        {
            _repository = repository;
            _userProvisioningService = userProvisioningService;
            _emailService = emailService;
            _context = context;
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }


        // =====================================================
        // CREATE ADMISSION
        // =====================================================

        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateCreateRequest(request);

            // ---------------------------------------------
            // Save only Student Photo
            // ---------------------------------------------

            string? photoPath = null;

            if (request.StudentPhoto != null &&
                request.StudentPhoto.Length > 0)
            {
                photoPath = await SaveStudentPhotoAsync(
                    request.StudentPhoto);
            }
            // ---------------------------------------------
            // Create Admission
            // ---------------------------------------------

            return await _repository.CreateAsync(
                request,
                photoPath);
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

            return await _repository.GetByIdAsync(
                admissionId);
        }


        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<IEnumerable<StudentAdmissionResponseDto>>
            GetAllAsync()
        {
            return await _repository.GetAllAsync();
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
            if (request.StudentPhoto != null &&
                request.StudentPhoto.Length > 0)
            {
                photoPath = await SaveStudentPhotoAsync(
                    request.StudentPhoto);
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
        // GENERATE ADMISSION NUMBER
        // =====================================================

        public async Task<string> GenerateAdmissionNumberAsync()
        {
            return await _repository.GenerateAdmissionNumberAsync();
        }

        // =====================================================
        // APPROVE (ATOMIC STUDENT DOMAIN + CENTRALIZED USER PROVISIONING)
        // =====================================================

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

            // 2. Open database connection and begin outer transaction for atomicity
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            UserProvisioningResult? userProvisioningResult = null;

            try
            {
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

                // 5. Evaluate Student Email for User account provisioning
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
                        "Student admission {AdmissionId} (StudentId: {StudentId}) approved without a User account because no valid email was provided.",
                        request.AdmissionId, student.StudentId);
                }

                // 6. Commit single atomic transaction (Student + User created atomically)
                transaction.Commit();
                _logger.LogInformation(
                    "Successfully committed Student approval for AdmissionId {AdmissionId} (StudentId: {StudentId}, UserProvisioned: {UserProvisioned})",
                    request.AdmissionId, student.StudentId, userProvisioningResult?.Success == true);
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

                _logger.LogError(ex, "Transaction rolled back during Student admission approval for AdmissionId {AdmissionId}", request.AdmissionId);
                throw;
            }

            // 7. Post-commit initial credential onboarding email dispatch
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

                    _logger.LogInformation("Successfully sent initial credential onboarding email to {Email}", userProvisioningResult.Email);
                }
                catch (Exception ex)
                {
                    // SMTP delivery failure after DB commit must NOT corrupt DB records or fail the API response.
                    _logger.LogWarning(ex, "Initial credential email delivery failed for student {Email} after successful commit.", userProvisioningResult.Email);
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

        private static void ValidateCreateRequest(
            CreateStudentAdmissionRequest request)
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

            if (request.FeeStructureId <= 0)
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

            request.SelectedFeeStructureComponentIds ??=
                new List<int>();

            return await _repository.SaveAdmissionFeeSelectionsAsync(
                admissionId,
                request);
        }

        // =====================================================
        // SAVE STUDENT PHOTO
        // =====================================================

        private async Task<string> SaveStudentPhotoAsync(
            IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException(
                    "Student photo is required.");

            var extension =
                Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

            var allowedExtensions = new[]
            {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp"
            };

            if (!allowedExtensions.Contains(extension))
            {
                throw new ArgumentException(
                    "Only JPG, JPEG, PNG and WEBP photos are allowed.");
            }

            const long maxFileSize = 5 * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                throw new ArgumentException(
                    "Student photo must be less than 5 MB.");
            }

            var folder = Path.Combine(
                _environment.WebRootPath ?? "wwwroot",
                "uploads",
                "student-photos");

            Directory.CreateDirectory(folder);

            var fileName =
                $"{Guid.NewGuid():N}{extension}";

            var fullPath =
                Path.Combine(folder, fileName);

            await using var stream =
                new FileStream(
                    fullPath,
                    FileMode.Create);

            await file.CopyToAsync(stream);

            return
                $"/uploads/student-photos/{fileName}";
        }
    }
}

