using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AutoMapper;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using System.Data;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffService : IStaffService
    {
        private readonly IStaffRepository _staffRepository;
        private readonly IStaffSubjectAllocationRepository _allocationRepository;
        private readonly ISubjectRepository _subjectRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITimetableRepository _timetableRepository;
        private readonly IDesignationRepository _designationRepository;
        private readonly IBoardRepository _boardRepository;
        private readonly IEmailService _emailService;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly IUserProvisioningService _userProvisioningService;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<StaffService> _logger;

        private const decimal HoursPerClassPeriod = 1.0m;
        private const long MaxPhotoFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private const long MaxDocFileSizeBytes = 10 * 1024 * 1024; // 10 MB
        private static readonly string[] AllowedPhotoExtensions = { ".jpg", ".jpeg", ".png" };
        private static readonly string[] AllowedDocExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };

        public StaffService(
            IStaffRepository staffRepository,
            IStaffSubjectAllocationRepository allocationRepository,
            ISubjectRepository subjectRepository,
            IDepartmentRepository departmentRepository,
            ITimetableRepository timetableRepository,
            IDesignationRepository designationRepository,
            IBoardRepository boardRepository,
            IEmailService emailService,
            IMapper mapper,
            IWebHostEnvironment environment,
            Microsoft.Extensions.Configuration.IConfiguration configuration,
            AppDbContext context,
            IUserProvisioningService userProvisioningService,
            IUserRepository userRepository,
            ILogger<StaffService> logger)
        {
            _staffRepository = staffRepository;
            _allocationRepository = allocationRepository;
            _subjectRepository = subjectRepository;
            _departmentRepository = departmentRepository;
            _timetableRepository = timetableRepository;
            _designationRepository = designationRepository;
            _boardRepository = boardRepository;
            _emailService = emailService;
            _mapper = mapper;
            _environment = environment;
            _configuration = configuration;
            _context = context;
            _userProvisioningService = userProvisioningService;
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<PagedResult<StaffResponseDto>> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            var (staffs, totalCount) = await _staffRepository.GetPagedStaffAsync(queryParams);
            var dtos = _mapper.Map<List<StaffResponseDto>>(staffs);

            return new PagedResult<StaffResponseDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                PageNumber = queryParams.PageNumber < 1 ? 1 : queryParams.PageNumber,
                PageSize = queryParams.PageSize < 1 ? 5 : queryParams.PageSize
            };
        }

        public async Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null)
        {
            return await _staffRepository.GetStaffDropdownAsync(staffType);
        }

        public async Task<StaffResponseDto?> GetStaffByIdAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffResponseDto?> GetStaffByEmployeeIdAsync(string employeeId)
        {
            var staff = await _staffRepository.GetByEmployeeIdAsync(employeeId);
            if (staff == null)
                throw new NotFoundException($"Staff record with Employee ID {employeeId} not found.");

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffProfileFullDto> GetStaffProfileFullAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> GetStaffProfileByTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                throw new ValidationException("Token cannot be empty.");

            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile link token.");

            return MapToFullProfileDto(staff);
        }

        public async Task<string> GetNextEmployeeIdAsync(string staffType)
        {
            return await _staffRepository.GenerateNextEmployeeIdAsync(staffType);
        }

        public async Task<StaffDashboardStatsDto> GetDashboardStatsAsync()
        {
            return await _staffRepository.GetDashboardStatsAsync();
        }

        public async Task<StaffResponseDto> CreateStaffAsync(CreateStaffDto dto)
        {
            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? "Teaching" : dto.StaffType.Trim();

            // Auto generate Employee ID if not supplied or empty
            string employeeId = dto.EmployeeId?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(employeeId))
            {
                employeeId = await _staffRepository.GenerateNextEmployeeIdAsync(staffType);
            }

            // Department resolution
            int? resolvedDepartmentId = dto.DepartmentId;
            string deptName = dto.Department?.Trim() ?? string.Empty;

            if (resolvedDepartmentId.HasValue && resolvedDepartmentId.Value > 0)
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var found = depts.FirstOrDefault(d => d.DepartmentId == resolvedDepartmentId.Value);
                if (found != null)
                {
                    deptName = found.DepartmentName;
                }
            }
            else if (!string.IsNullOrWhiteSpace(deptName))
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var dept = depts?.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));

                if (dept != null)
                {
                    resolvedDepartmentId = dept.DepartmentId;
                    deptName = dept.DepartmentName;
                }
                else
                {
                    var newDept = new Department
                    {
                        DepartmentName = deptName,
                        DepartmentCode = $"DEP_{deptName.Substring(0, Math.Min(8, deptName.Length)).ToUpper().Replace(" ", "")}",
                        StaffType = staffType,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    var createdDept = await _departmentRepository.AddDepartmentAsync(newDept);
                    resolvedDepartmentId = createdDept.DepartmentId;
                }
            }

            if (!resolvedDepartmentId.HasValue || resolvedDepartmentId.Value <= 0)
            {
                var depts = (await _departmentRepository.GetDepartmentsAsync()).ToList();
                var defaultDept = depts.FirstOrDefault(d => string.Equals(d.StaffType, staffType, StringComparison.OrdinalIgnoreCase)) ?? depts.FirstOrDefault();
                if (defaultDept != null)
                {
                    resolvedDepartmentId = defaultDept.DepartmentId;
                    deptName = defaultDept.DepartmentName;
                }
            }

            // Designation resolution
            int? resolvedDesignationId = dto.DesignationId;
            string resolvedDesignationName = dto.Designation?.Trim() ?? string.Empty;

            if (resolvedDesignationId.HasValue && resolvedDesignationId.Value > 0)
            {
                var desig = await _designationRepository.GetByIdAsync(resolvedDesignationId.Value);
                if (desig != null)
                {
                    resolvedDesignationName = desig.Name;
                }
            }
            else if (!string.IsNullOrWhiteSpace(resolvedDesignationName))
            {
                var desig = await _designationRepository.GetByNameAsync(resolvedDesignationName);
                if (desig != null)
                {
                    resolvedDesignationId = desig.Id;
                    resolvedDesignationName = desig.Name;
                }
                else
                {
                    var newDesig = new Designation
                    {
                        Name = resolvedDesignationName,
                        StaffType = staffType,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    var createdDesig = await _designationRepository.AddAsync(newDesig);
                    resolvedDesignationId = createdDesig.Id;
                }
            }

            if (!resolvedDesignationId.HasValue || resolvedDesignationId.Value <= 0)
            {
                var desigs = (await _designationRepository.GetAllAsync()).ToList();
                var defaultDesig = desigs.FirstOrDefault(d => string.Equals(d.StaffType, staffType, StringComparison.OrdinalIgnoreCase)) ?? desigs.FirstOrDefault();
                if (defaultDesig != null)
                {
                    resolvedDesignationId = defaultDesig.Id;
                    resolvedDesignationName = defaultDesig.Name;
                }
            }

            // Uniqueness Validations for new staff
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new ValidationException("Email address is required for staff creation.");

            if (!dto.RoleId.HasValue || dto.RoleId.Value <= 0)
                throw new ValidationException("RoleId is required and must be greater than 0.");

            if (!await _staffRepository.IsEmployeeIdUniqueAsync(employeeId))
                throw new ConflictException($"Employee ID '{employeeId}' is already registered.");

            if (!await _staffRepository.IsEmailUniqueAsync(dto.Email))
                throw new ConflictException($"Email address '{dto.Email}' is already registered to a staff record.");

            var existingUser = await _userRepository.GetByEmailAsync(dto.Email.Trim());
            if (existingUser != null)
                throw new ConflictException($"Email address '{dto.Email}' is already registered to an existing authentication account.");

            if (!await _staffRepository.IsMobileUniqueAsync(dto.Mobile))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered.");

            if (!string.IsNullOrWhiteSpace(dto.Aadhaar) && !await _staffRepository.IsAadhaarUniqueAsync(dto.Aadhaar))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered.");

            var staff = _mapper.Map<Staff>(dto);
            staff.EmployeeId = employeeId;
            staff.StaffType = staffType;
            staff.DepartmentId = resolvedDepartmentId;
            staff.Department = deptName;
            staff.DesignationId = resolvedDesignationId;
            staff.Designation = resolvedDesignationName;
            staff.BoardId = dto.BoardId;
            staff.BoardName = dto.BoardName ?? dto.Board;
            staff.Gender = !string.IsNullOrWhiteSpace(dto.Gender) ? dto.Gender : (!string.IsNullOrWhiteSpace(staff.Gender) ? staff.Gender : "Male");
            staff.DateOfBirth = dto.DateOfBirth.HasValue ? dto.DateOfBirth.Value : (staff.DateOfBirth != default ? staff.DateOfBirth : DateTime.UtcNow.AddYears(-25));
            staff.Qualification = !string.IsNullOrWhiteSpace(dto.Qualification) ? dto.Qualification : (!string.IsNullOrWhiteSpace(staff.Qualification) ? staff.Qualification : "Graduate");
            staff.ProfileStatus = string.IsNullOrWhiteSpace(dto.ProfileStatus) ? "PendingLink" : dto.ProfileStatus;
            staff.ProfileCompletionPercentage = dto.ProfileCompletionPercentage ?? 30;
            staff.ProfileLinkToken = Guid.NewGuid().ToString("N");
            staff.JoiningDate = dto.JoiningDate ?? (dto.DateOfJoining ?? DateTime.UtcNow);

            SyncFlattenedPropertiesToJson(staff, dto.BankName, dto.AccountHolder ?? dto.AccountHolderName, dto.AccountNumber, dto.Ifsc ?? dto.IfscCode, dto.Branch, dto.AccountType, dto.BasicSalary,
                dto.EmergencyName ?? dto.ContactName, dto.EmergencyRelationship ?? dto.Relationship, dto.EmergencyMobile, dto.EmergencyAlternate, dto.EmergencyAddress,
                dto.HighestQualification, dto.University, dto.Specialization, dto.PassingYear, dto.Percentage,
                dto.TotalExperience, dto.PreviousInstitution, dto.PreviousDesignation, dto.ExperienceFrom, dto.ExperienceTo,
                dto.AadhaarDocument, dto.PanDocument, dto.QualificationCertificate, dto.ExperienceCertificate, dto.Resume, dto.BankProof, dto.DrivingLicence, dto.OtherDocuments, dto.Photo, dto.Signature,
                dto.EducationJson, dto.ExperienceJson, dto.DocumentsJson, dto.BankDetailsJson, dto.EmergencyContactJson);

            staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);

            // ==================================================================================
            // ATOMIC TRANSACTION: Create Staff + User Account (Shared EF Core + Dapper Connection)
            // ==================================================================================
            Role? assignedRole = null;
            UserProvisioningResult provResult = default!;

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var dbTransaction = transaction.GetDbTransaction();
                var connection = _context.Database.GetDbConnection();

                // 1. Dynamic Role Validation and Staff-Role Security Check
                assignedRole = await _userRepository.GetRoleByIdAsync(dto.RoleId.Value, connection, dbTransaction);
                if (assignedRole == null)
                {
                    await transaction.RollbackAsync();
                    throw new ValidationException($"Role with ID '{dto.RoleId.Value}' was not found in Roles table.");
                }

                var nonStaffRoles = new[] { "Super Admin", "Admin", "Student", "Parent" };
                if (nonStaffRoles.Any(r => string.Equals(r, assignedRole.RoleName, StringComparison.OrdinalIgnoreCase)))
                {
                    await transaction.RollbackAsync();
                    throw new ValidationException($"Role '{assignedRole.RoleName}' (RoleId: {assignedRole.RoleId}) cannot be assigned to a Staff account. Please select a valid Staff/Faculty role.");
                }

                // 2. Insert Staff domain record via EF Core inside this transaction
                _context.Staffs.Add(staff);
                await _context.SaveChangesAsync();

                // 3. Subject Allocations
                var subNames = dto.AllocatedSubjects ?? dto.Subjects;
                if (subNames != null && subNames.Any())
                {
                    await SyncStaffSubjectAllocationsAsync(staff.Id, subNames);
                }

                // 4. Centralized User Account Provisioning via Dapper on the SAME connection and transaction
                var provRequest = new ProvisionStaffUserRequest
                {
                    StaffId = staff.Id,
                    RoleId = assignedRole.RoleId,
                    Email = staff.Email,
                    FullName = $"{staff.FirstName} {staff.LastName}".Trim(),
                    PhoneNumber = staff.Mobile
                };

                provResult = await _userProvisioningService.ProvisionStaffUserAsync(provRequest, connection, dbTransaction);
                if (!provResult.Success)
                {
                    await transaction.RollbackAsync();
                    throw new ValidationException(provResult.ErrorMessage ?? "Failed to provision centralized user account for staff member.");
                }

                // 5. Commit both Staff and User creation atomically
                await transaction.CommitAsync();
            });

            // ==================================================================================
            // POST-COMMIT: Initial Credential Onboarding Email Delivery
            // ==================================================================================
            if (!string.IsNullOrWhiteSpace(provResult.TemporaryPassword))
            {
                try
                {
                    var portalUrl = _configuration["InstitutionSettings:PortalUrl"] ?? _configuration["StudentPortal:LoginUrl"] ?? "http://localhost:5173";
                    var institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? "College Management System";
                    var emailBody = StaffCredentialHelper.BuildInitialCredentialEmailHtml(
                        $"{staff.FirstName} {staff.LastName}".Trim(),
                        staff.Email,
                        staff.EmployeeId,
                        assignedRole.RoleName,
                        provResult.TemporaryPassword,
                        portalUrl,
                        institutionName);

                    await _emailService.SendEmailAsync(
                        staff.Email,
                        $"Welcome to {institutionName} - Staff Portal Login Credentials",
                        emailBody);

                    _logger.LogInformation("Successfully sent initial credential email to staff {Email} (StaffId: {StaffId}, Role: {Role})", staff.Email, staff.Id, assignedRole.RoleName);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Initial credential email delivery failed for staff {Email} (StaffId: {StaffId}) after successful transaction commit.", staff.Email, staff.Id);
                }
            }

            var refreshedStaff = await _staffRepository.GetByIdAsync(staff.Id) ?? staff;
            return _mapper.Map<StaffResponseDto>(refreshedStaff);
        }

        public async Task<StaffResponseDto> UpdateStaffAsync(int id, UpdateStaffDto dto)
        {
            var existingStaff = await _staffRepository.GetByIdAsync(id);
            if (existingStaff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            // Uniqueness Validations
            if (!await _staffRepository.IsEmailUniqueAsync(dto.Email, id))
                throw new ConflictException($"Email address '{dto.Email}' is already registered to another staff member.");

            var normalizedNewEmail = dto.Email.Trim().ToUpperInvariant();
            var normalizedOldEmail = existingStaff.Email.Trim().ToUpperInvariant();
            bool emailChanged = !string.Equals(normalizedNewEmail, normalizedOldEmail, StringComparison.OrdinalIgnoreCase);
            if (emailChanged)
            {
                var existingUserWithNewEmail = await _userRepository.GetByEmailAsync(normalizedNewEmail);
                if (existingUserWithNewEmail != null && existingUserWithNewEmail.StaffId != id)
                {
                    throw new ConflictException($"Email address '{dto.Email}' is already registered to another authentication account.");
                }
            }

            if (!await _staffRepository.IsMobileUniqueAsync(dto.Mobile, id))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered to another staff member.");

            if (!string.IsNullOrWhiteSpace(dto.Aadhaar) && !await _staffRepository.IsAadhaarUniqueAsync(dto.Aadhaar, id))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered to another staff member.");

            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? existingStaff.StaffType : dto.StaffType.Trim();

            // Department resolution
            int? resolvedDepartmentId = dto.DepartmentId;
            string deptName = dto.Department?.Trim() ?? string.Empty;

            if (resolvedDepartmentId.HasValue && resolvedDepartmentId.Value > 0)
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var found = depts.FirstOrDefault(d => d.DepartmentId == resolvedDepartmentId.Value);
                if (found != null)
                {
                    deptName = found.DepartmentName;
                }
            }
            else if (!string.IsNullOrWhiteSpace(deptName))
            {
                var depts = await _departmentRepository.GetDepartmentsAsync();
                var dept = depts?.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));

                if (dept != null)
                {
                    resolvedDepartmentId = dept.DepartmentId;
                    deptName = dept.DepartmentName;
                }
            }
            else
            {
                resolvedDepartmentId = existingStaff.DepartmentId;
                deptName = existingStaff.Department;
            }

            // Designation resolution
            int? resolvedDesignationId = dto.DesignationId;
            string resolvedDesignationName = dto.Designation?.Trim() ?? string.Empty;

            if (resolvedDesignationId.HasValue && resolvedDesignationId.Value > 0)
            {
                var desig = await _designationRepository.GetByIdAsync(resolvedDesignationId.Value);
                if (desig != null)
                {
                    resolvedDesignationName = desig.Name;
                }
            }
            else if (!string.IsNullOrWhiteSpace(resolvedDesignationName))
            {
                var desig = await _designationRepository.GetByNameAsync(resolvedDesignationName);
                if (desig != null)
                {
                    resolvedDesignationId = desig.Id;
                    resolvedDesignationName = desig.Name;
                }
            }
            else
            {
                resolvedDesignationId = existingStaff.DesignationId;
                resolvedDesignationName = existingStaff.Designation;
            }

            _mapper.Map(dto, existingStaff);
            existingStaff.StaffType = staffType;
            existingStaff.DepartmentId = resolvedDepartmentId;
            existingStaff.Department = deptName;
            existingStaff.DesignationId = resolvedDesignationId;
            existingStaff.Designation = resolvedDesignationName;
            existingStaff.BoardId = dto.BoardId ?? existingStaff.BoardId;
            existingStaff.BoardName = dto.BoardName ?? dto.Board ?? existingStaff.BoardName;

            if (dto.JoiningDate.HasValue || dto.DateOfJoining.HasValue)
            {
                existingStaff.JoiningDate = dto.JoiningDate ?? dto.DateOfJoining!.Value;
            }

            SyncFlattenedPropertiesToJson(existingStaff, dto.BankName, dto.AccountHolder ?? dto.AccountHolderName, dto.AccountNumber, dto.Ifsc ?? dto.IfscCode, dto.Branch, dto.AccountType, dto.BasicSalary,
                dto.EmergencyName ?? dto.ContactName, dto.EmergencyRelationship ?? dto.Relationship, dto.EmergencyMobile, dto.EmergencyAlternate, dto.EmergencyAddress,
                dto.HighestQualification, dto.University, dto.Specialization, dto.PassingYear, dto.Percentage,
                dto.TotalExperience, dto.PreviousInstitution, dto.PreviousDesignation, dto.ExperienceFrom, dto.ExperienceTo,
                dto.AadhaarDocument, dto.PanDocument, dto.QualificationCertificate, dto.ExperienceCertificate, dto.Resume, dto.BankProof, dto.DrivingLicence, dto.OtherDocuments, dto.Photo, dto.Signature,
                dto.EducationJson, dto.ExperienceJson, dto.DocumentsJson, dto.BankDetailsJson, dto.EmergencyContactJson);

            // Recalculate percentage
            existingStaff.ProfileCompletionPercentage = CalculateCompletionPercentage(existingStaff);

            // Transactional update: Staff domain + Users sync
            var updateStrategy = _context.Database.CreateExecutionStrategy();
            await updateStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var dbTransaction = transaction.GetDbTransaction();
                var connection = _context.Database.GetDbConnection();

                existingStaff.UpdatedAt = DateTime.UtcNow;
                _context.Staffs.Update(existingStaff);
                await _context.SaveChangesAsync();

                if (emailChanged)
                {
                    await _userRepository.UpdateEmailByStaffIdAsync(id, normalizedNewEmail, connection, dbTransaction);
                }

                if (!string.IsNullOrWhiteSpace(dto.Status))
                {
                    bool newIsActive = !string.Equals(dto.Status.Trim(), "Inactive", StringComparison.OrdinalIgnoreCase);
                    await _userRepository.UpdateStatusByStaffIdAsync(id, newIsActive, connection, dbTransaction);
                }

                var subNames = dto.AllocatedSubjects ?? dto.Subjects;
                if (subNames != null)
                {
                    await SyncStaffSubjectAllocationsAsync(existingStaff.Id, subNames);
                }

                await transaction.CommitAsync();
            });

            var refreshedStaff = await _staffRepository.GetByIdAsync(existingStaff.Id) ?? existingStaff;
            return _mapper.Map<StaffResponseDto>(refreshedStaff);
        }

        public async Task<bool> DeleteStaffAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var deleteStrategy = _context.Database.CreateExecutionStrategy();
            await deleteStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var dbTransaction = transaction.GetDbTransaction();
                var connection = _context.Database.GetDbConnection();

                staff.IsDeleted = true;
                staff.UpdatedAt = DateTime.UtcNow;
                _context.Staffs.Update(staff);
                await _context.SaveChangesAsync();

                await _userRepository.UpdateStatusByStaffIdAsync(id, false, connection, dbTransaction);
                await transaction.CommitAsync();
            });

            return true;
        }

        public async Task<SendProfileLinkResponseDto> SendProfileLinkAsync(int id, SendProfileLinkRequestDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var validityDays = dto.ValidityDays > 0 ? dto.ValidityDays : 7;
            var token = string.IsNullOrWhiteSpace(staff.ProfileLinkToken) ? Guid.NewGuid().ToString("N") : staff.ProfileLinkToken;
            var sentAt = DateTime.UtcNow;
            var expiresAt = sentAt.AddDays(validityDays);

            var toEmail = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : staff.Email;
            var toMobile = !string.IsNullOrWhiteSpace(dto.Mobile) ? dto.Mobile.Trim() : staff.Mobile;

            if (!string.IsNullOrWhiteSpace(toEmail) && !string.Equals(staff.Email, toEmail, StringComparison.OrdinalIgnoreCase))
            {
                staff.Email = toEmail;
            }
            if (!string.IsNullOrWhiteSpace(toMobile) && !string.Equals(staff.Mobile, toMobile, StringComparison.OrdinalIgnoreCase))
            {
                staff.Mobile = toMobile;
            }

            staff.ProfileLinkToken = token;
            staff.ProfileLinkSentAt = sentAt;
            staff.ProfileLinkExpiresAt = expiresAt;
            if (staff.ProfileStatus == "PendingLink" || string.IsNullOrWhiteSpace(staff.ProfileStatus))
            {
                staff.ProfileStatus = "LinkSent";
            }
            await _staffRepository.UpdateAsync(staff);

            var staffFullName = string.IsNullOrWhiteSpace(staff.MiddleName) ? $"{staff.FirstName} {staff.LastName}".Trim() : $"{staff.FirstName} {staff.MiddleName} {staff.LastName}".Trim();

            var institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? (!string.IsNullOrWhiteSpace(staff.BoardName) ? staff.BoardName : "Pirnav College");
            var portalBase = _configuration["InstitutionSettings:PortalUrl"] ?? "http://localhost:5173";
            var profileUrl = $"{portalBase.TrimEnd('/')}/mock-staff-portal/{staff.Id}";

            bool emailSent = false;
            string? emailError = null;

            // Send Email Notification
            if (!string.IsNullOrWhiteSpace(toEmail))
            {
                try
                {
                    var customMsg = !string.IsNullOrWhiteSpace(dto.CustomMessage)
                        ? dto.CustomMessage
                        : $"You are invited to complete your official staff profile for {institutionName}. Please use the secure link below to fill your personal, address, qualification, and document details.";

                    var emailBody = $@"
                    <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;"">
                        <div style=""background-color: #6F8400; color: #ffffff; padding: 28px 24px; text-align: center;"">
                            <h2 style=""margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;"">{institutionName}</h2>
                            <p style=""margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #f4f7eb;"">Official Staff Profile Onboarding</p>
                        </div>
                        <div style=""padding: 28px 24px; color: #1e293b; line-height: 1.6;"">
                            <p style=""font-size: 16px; margin-top: 0;"">Dear <strong>{staffFullName}</strong> ({staff.EmployeeId}),</p>
                            <p style=""font-size: 14px; color: #334155; margin: 12px 0 20px 0;"">{customMsg}</p>
                            <div style=""text-align: center; margin: 30px 0;"">
                                <a href=""{profileUrl}"" style=""background-color: #6F8400; color: #ffffff; text-decoration: none; padding: 12px 32px; font-weight: 600; border-radius: 8px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"">Complete Your Profile</a>
                            </div>
                            <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 20px;"">
                                <p style=""font-size: 12px; color: #64748b; margin: 0 0 6px 0;"">Direct Link (if button doesn't open):</p>
                                <a href=""{profileUrl}"" style=""font-size: 13px; color: #6F8400; word-break: break-all; text-decoration: underline;"">{profileUrl}</a>
                            </div>
                            <p style=""font-size: 13px; color: #64748b; margin-top: 20px;"">⏱️ This link is valid for <strong>{validityDays} days</strong> (Expires on {expiresAt:dd MMM yyyy, hh:mm tt UTC}).</p>
                            <hr style=""border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;"">
                            <p style=""font-size: 12px; color: #94a3b8; margin-bottom: 0;"">Regards,<br><strong style=""color: #475569;"">{institutionName} Administration</strong></p>
                        </div>
                    </div>";

                    await _emailService.SendEmailAsync(toEmail, $"Complete Your Staff Profile - {institutionName}", emailBody);
                    emailSent = true;
                }
                catch (Exception ex)
                {
                    emailSent = false;
                    emailError = ex.Message;
                }
            }
            else
            {
                emailError = "No recipient email address specified.";
            }

            return new SendProfileLinkResponseDto
            {
                Success = true,
                Message = emailSent 
                    ? $"Profile completion link sent successfully to {toEmail}." 
                    : (emailError != null ? $"Link generated, but email could not be delivered: {emailError}" : "Profile completion link generated successfully."),
                Token = token,
                ProfileLink = profileUrl,
                SentAt = sentAt,
                ExpiresAt = expiresAt,
                EmailSent = emailSent,
                EmailRecipient = toEmail,
                EmailError = emailError
            };
        }

        public async Task<StaffBulkSendResultDto> BulkSendProfileLinksAsync(StaffBulkSendLinksDto dto)
        {
            var result = new StaffBulkSendResultDto
            {
                TotalRequested = dto.StaffIds.Count
            };

            var validityDays = dto.ValidityDays > 0 ? dto.ValidityDays : 7;
            var sentAt = DateTime.UtcNow;
            var expiresAt = sentAt.AddDays(validityDays);

            foreach (var id in dto.StaffIds)
            {
                try
                {
                    await SendProfileLinkAsync(id, new SendProfileLinkRequestDto
                    {
                        ValidityDays = validityDays,
                        CustomMessage = dto.CustomMessage
                    });
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Messages.Add($"Staff ID {id}: {ex.Message}");
                }
            }

            return result;
        }

        public async Task<StaffProfileFullDto> SaveProfileDraftAsync(int id, UpdateStaffProfileSectionDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            ApplySectionUpdate(staff, dto);

            // Calculate percentage
            var percentage = CalculateCompletionPercentage(staff);
            staff.ProfileCompletionPercentage = percentage;

            // 30% Threshold Workflow Rule:
            if (percentage > 30 && (staff.ProfileStatus == "PendingLink" || staff.ProfileStatus == "LinkSent" || string.IsNullOrWhiteSpace(staff.ProfileStatus)))
            {
                staff.ProfileStatus = "InProgress";
            }

            await _staffRepository.UpdateAsync(staff);
            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> SaveProfileDraftByTokenAsync(string token, UpdateStaffProfileSectionDto dto)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await SaveProfileDraftAsync(staff.Id, dto);
        }

        public async Task<StaffProfileFullDto> SubmitProfileAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            staff.ProfileStatus = "Submitted";
            staff.SubmittedAt = DateTime.UtcNow;
            staff.ProfileCompletionPercentage = 100;
            await _staffRepository.UpdateAsync(staff);

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> SubmitProfileByTokenAsync(string token)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await SubmitProfileAsync(staff.Id);
        }

        public async Task<StaffResponseDto> AdminReviewProfileAsync(int id, AdminReviewStaffDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            if (string.Equals(dto.Action, "Approve", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "Completed";
                staff.ApprovedAt = DateTime.UtcNow;
                staff.CorrectionNotes = null;
            }
            else if (string.Equals(dto.Action, "RequestCorrection", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "NeedsCorrection";
                staff.CorrectionRequestedAt = DateTime.UtcNow;
                staff.CorrectionNotes = dto.CorrectionNotes?.Trim();
            }
            else
            {
                throw new ValidationException($"Invalid review action '{dto.Action}'. Supported actions: 'Approve', 'RequestCorrection'.");
            }

            await _staffRepository.UpdateAsync(staff);
            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffProfileFullDto> UploadDocumentAsync(int staffId, string documentType, IFormFile file)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {staffId} not found.");

            if (file == null || file.Length == 0)
                throw new ValidationException("Please choose a file to upload.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedDocExtensions.Contains(ext))
                throw new ValidationException($"Invalid file type '{ext}'. Only PDF and image files are accepted.");

            if (file.Length > MaxDocFileSizeBytes)
                throw new ValidationException("File size exceeds maximum allowed limit of 10 MB.");

            var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "staff-documents");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            var safeDocType = documentType.Replace(" ", "").Replace("/", "");
            var fileName = $"staff_{staffId}_{safeDocType}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var physicalPath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"/uploads/staff-documents/{fileName}";

            var docList = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            // Remove existing item of same documentType if present
            docList.RemoveAll(d => string.Equals(d.DocumentType, documentType, StringComparison.OrdinalIgnoreCase));

            docList.Add(new StaffDocumentItem
            {
                DocumentType = documentType,
                DocumentName = file.FileName,
                FileName = fileName,
                FilePath = relativePath,
                FileType = ext.TrimStart('.').ToUpper(),
                FileSizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            });

            staff.DocumentsJson = JsonSerializer.Serialize(docList);
            staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);
            await _staffRepository.UpdateAsync(staff);

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> UploadDocumentByTokenAsync(string token, string documentType, IFormFile file)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await UploadDocumentAsync(staff.Id, documentType, file);
        }

        public async Task<StaffProfileFullDto> DeleteDocumentAsync(int staffId, string documentType)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {staffId} not found.");

            var docList = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            var item = docList.FirstOrDefault(d => string.Equals(d.DocumentType, documentType, StringComparison.OrdinalIgnoreCase));
            if (item != null)
            {
                // Attempt to delete physical file
                try
                {
                    var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var physicalPath = Path.Combine(webRoot, item.FilePath.TrimStart('/'));
                    if (File.Exists(physicalPath))
                    {
                        File.Delete(physicalPath);
                    }
                }
                catch { }

                docList.Remove(item);
                staff.DocumentsJson = JsonSerializer.Serialize(docList);
                staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);
                await _staffRepository.UpdateAsync(staff);
            }

            return MapToFullProfileDto(staff);
        }

        public async Task<StaffProfileFullDto> DeleteDocumentByTokenAsync(string token, string documentType)
        {
            var staff = await _staffRepository.GetByTokenAsync(token);
            if (staff == null)
                throw new NotFoundException("Invalid or expired profile token.");

            return await DeleteDocumentAsync(staff.Id, documentType);
        }

        public async Task<StaffImportResultDto> ImportStaffFromExcelAsync(IFormFile file, string? defaultStaffType = null)
        {
            if (file == null || file.Length == 0)
                throw new ValidationException("Please upload a valid Excel file (.xlsx).");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new ValidationException("Unsupported file format. Please upload an Excel workbook (.xlsx).");

            var result = new StaffImportResultDto();
            var departments = (await _departmentRepository.GetDepartmentsAsync()).ToList();
            var designations = (await _designationRepository.GetAllAsync()).ToList();
            var boards = (await _boardRepository.GetBoardsForExportAsync(new BoardExportRequest())).ToList();

            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
                throw new ValidationException("Excel file contains no worksheets.");

            var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();
            if (rows == null || rows.Count < 2)
                throw new ValidationException("Excel worksheet is empty or missing data rows.");

            // Read header row
            var headerRow = rows[0];
            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (int col = 1; col <= headerRow.Cells().Count(); col++)
            {
                var val = headerRow.Cell(col).GetString().Trim();
                if (!string.IsNullOrWhiteSpace(val) && !headerMap.ContainsKey(val))
                {
                    headerMap[val] = col;
                }
            }

            // Helper to get cell value
            string GetVal(IXLRangeRow row, params string[] names)
            {
                foreach (var name in names)
                {
                    if (headerMap.TryGetValue(name, out int colIdx))
                    {
                        var cellVal = row.Cell(colIdx).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(cellVal)) return cellVal;
                    }
                }
                return string.Empty;
            }

            result.TotalRowsRead = rows.Count - 1;
            var toAdd = new List<Staff>();

            for (int i = 1; i < rows.Count; i++)
            {
                var rowNumber = i + 1;
                var row = rows[i];

                var empId = GetVal(row, "Employee ID", "EmployeeId", "EmpId", "Employee_ID");
                var fName = GetVal(row, "First Name", "FirstName", "First_Name", "Name");
                var mName = GetVal(row, "Middle Name", "MiddleName", "Middle_Name");
                var lName = GetVal(row, "Last Name", "LastName", "Last_Name", "Surname");
                var sType = GetVal(row, "Staff Type", "StaffType", "Staff_Type", "FacultyType");
                var deptName = GetVal(row, "Department", "DepartmentName", "Dept");
                var desigName = GetVal(row, "Designation", "DesignationName", "Role");
                var boardName = GetVal(row, "Board", "Board Name", "BoardName");
                var gender = GetVal(row, "Gender", "Sex");
                var dobStr = GetVal(row, "Date of Birth", "DateOfBirth", "DOB");
                var mobile = GetVal(row, "Mobile", "Mobile Number", "Phone", "MobileNumber");
                var email = GetVal(row, "Email", "Email Address", "EmailAddress");
                var joinStr = GetVal(row, "Joining Date", "JoiningDate", "Date of Joining", "DateOfJoining");
                var expStr = GetVal(row, "Experience", "Experience (Years)", "ExperienceYears");
                var status = GetVal(row, "Status", "Employment Status");

                // Determine staff type
                if (string.IsNullOrWhiteSpace(sType))
                {
                    sType = !string.IsNullOrWhiteSpace(defaultStaffType) ? defaultStaffType : "Teaching";
                }
                else if (sType.IndexOf("non", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    sType = "Non-Teaching";
                }
                else
                {
                    sType = "Teaching";
                }

                // Row Validations
                if (string.IsNullOrWhiteSpace(fName))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, ErrorMessage = "First Name is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Valid Email address is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Mobile number is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Uniqueness check in DB & in current batch
                if (toAdd.Any(x => x.Email.Equals(email, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmailUniqueAsync(email))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Email '{email}' is already registered." });
                    result.FailedRowsCount++;
                    continue;
                }

                if (toAdd.Any(x => x.Mobile == mobile) || !await _staffRepository.IsMobileUniqueAsync(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Mobile '{mobile}' is already registered." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Auto-generate employee ID if empty or validate uniqueness
                if (string.IsNullOrWhiteSpace(empId))
                {
                    empId = await _staffRepository.GenerateNextEmployeeIdAsync(sType);
                }
                else if (toAdd.Any(x => x.EmployeeId == empId) || !await _staffRepository.IsEmployeeIdUniqueAsync(empId))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, EmployeeId = empId, StaffName = fName, ErrorMessage = $"Employee ID '{empId}' already exists." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Department Resolution
                int? deptId = null;
                if (!string.IsNullOrWhiteSpace(deptName))
                {
                    var foundDept = departments.FirstOrDefault(d =>
                        string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase));
                    if (foundDept != null)
                    {
                        deptId = foundDept.DepartmentId;
                        deptName = foundDept.DepartmentName;
                    }
                    else
                    {
                        // Dynamically create department
                        var newDept = new Department
                        {
                            DepartmentName = deptName,
                            DepartmentCode = $"DEP_{deptName.Substring(0, Math.Min(8, deptName.Length)).ToUpper().Replace(" ", "")}",
                            StaffType = sType,
                            IsActive = true
                        };
                        var created = await _departmentRepository.AddDepartmentAsync(newDept);
                        deptId = created.DepartmentId;
                        departments.Add(created);
                    }
                }

                // Designation Resolution
                int? desigId = null;
                if (!string.IsNullOrWhiteSpace(desigName))
                {
                    var foundDesig = designations.FirstOrDefault(d => string.Equals(d.Name, desigName, StringComparison.OrdinalIgnoreCase));
                    if (foundDesig != null)
                    {
                        desigId = foundDesig.Id;
                        desigName = foundDesig.Name;
                    }
                    else
                    {
                        var newDesig = new Designation
                        {
                            Name = desigName,
                            StaffType = sType,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        var created = await _designationRepository.AddAsync(newDesig);
                        desigId = created.Id;
                        designations.Add(created);
                    }
                }

                // Board Resolution
                int? boardId = null;
                if (!string.IsNullOrWhiteSpace(boardName))
                {
                    var foundBoard = boards.FirstOrDefault(b =>
                        string.Equals(b.BoardName, boardName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(b.BoardCode, boardName, StringComparison.OrdinalIgnoreCase));
                    if (foundBoard != null)
                    {
                        boardId = foundBoard.BoardId;
                        boardName = foundBoard.BoardName;
                    }
                }

                // Dates parsing
                var dob = DateTime.TryParse(dobStr, out var parsedDob) ? parsedDob : new DateTime(1990, 1, 1);
                var joinDate = DateTime.TryParse(joinStr, out var parsedJoin) ? parsedJoin : DateTime.UtcNow;
                decimal.TryParse(expStr, out var exp);

                var staff = new Staff
                {
                    EmployeeId = empId,
                    FirstName = fName,
                    MiddleName = mName,
                    LastName = string.IsNullOrWhiteSpace(lName) ? "." : lName,
                    StaffType = sType,
                    DepartmentId = deptId,
                    Department = deptName ?? "",
                    DesignationId = desigId,
                    Designation = desigName ?? (sType == "Teaching" ? "Lecturer" : "Office Assistant"),
                    BoardId = boardId,
                    BoardName = boardName,
                    Gender = string.IsNullOrWhiteSpace(gender) ? "Male" : gender,
                    DateOfBirth = dob,
                    Mobile = mobile,
                    Email = email,
                    JoiningDate = joinDate,
                    Experience = exp,
                    Status = string.IsNullOrWhiteSpace(status) ? "Active" : status,
                    ProfileStatus = "PendingLink",
                    ProfileCompletionPercentage = 30,
                    ProfileLinkToken = Guid.NewGuid().ToString("N"),
                    CreatedAt = DateTime.UtcNow
                };

                toAdd.Add(staff);
                if (sType == "Teaching") result.TeachingImported++;
                else result.NonTeachingImported++;
            }

            if (toAdd.Count > 0)
            {
                await _staffRepository.AddRangeAsync(toAdd);
                result.Success = true;
                result.SummaryMessage = $"Successfully imported {toAdd.Count} staff members ({result.TeachingImported} Teaching, {result.NonTeachingImported} Non-Teaching).";
            }
            else
            {
                result.Success = false;
                result.SummaryMessage = "No valid staff records could be imported from the Excel file.";
            }

            return result;
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> ExportStaffExcelAsync(StaffQueryParams queryParams)
        {
            queryParams.PageSize = 10000;
            queryParams.PageNumber = 1;

            var paged = await _staffRepository.GetPagedStaffAsync(queryParams);
            var items = paged.Items;

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Staff Directory");

            // Header Row
            var headers = new[]
            {
                "Employee ID", "First Name", "Middle Name", "Last Name", "Staff Type",
                "Department", "Designation", "Board", "Gender", "Date of Birth",
                "Mobile", "Alternate Mobile", "Email", "Joining Date", "Experience (Years)",
                "Employment Type", "Status", "Profile Status", "Completion %", "City", "State"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2E7D32");
                cell.Style.Font.FontColor = XLColor.White;
            }

            int rowIdx = 2;
            foreach (var s in items)
            {
                worksheet.Cell(rowIdx, 1).Value = s.EmployeeId;
                worksheet.Cell(rowIdx, 2).Value = s.FirstName;
                worksheet.Cell(rowIdx, 3).Value = s.MiddleName ?? "";
                worksheet.Cell(rowIdx, 4).Value = s.LastName;
                worksheet.Cell(rowIdx, 5).Value = s.StaffType;
                worksheet.Cell(rowIdx, 6).Value = s.Department;
                worksheet.Cell(rowIdx, 7).Value = s.Designation;
                worksheet.Cell(rowIdx, 8).Value = s.BoardName ?? s.Board ?? "";
                worksheet.Cell(rowIdx, 9).Value = s.Gender;
                worksheet.Cell(rowIdx, 10).Value = s.DateOfBirth.ToString("yyyy-MM-dd");
                worksheet.Cell(rowIdx, 11).Value = s.Mobile;
                worksheet.Cell(rowIdx, 12).Value = s.AlternateMobile ?? "";
                worksheet.Cell(rowIdx, 13).Value = s.Email;
                worksheet.Cell(rowIdx, 14).Value = s.JoiningDate.ToString("yyyy-MM-dd");
                worksheet.Cell(rowIdx, 15).Value = (double)s.Experience;
                worksheet.Cell(rowIdx, 16).Value = s.EmploymentType ?? "Full Time";
                worksheet.Cell(rowIdx, 17).Value = s.Status;
                worksheet.Cell(rowIdx, 18).Value = s.ProfileStatus;
                worksheet.Cell(rowIdx, 19).Value = s.ProfileCompletionPercentage;
                worksheet.Cell(rowIdx, 20).Value = s.City ?? "";
                worksheet.Cell(rowIdx, 21).Value = s.State ?? "";
                rowIdx++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var bytes = stream.ToArray();
            var filename = $"Staff_Export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
            return (bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateTemplateExcelAsync(string? staffType = null)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Staff Import Template");

            var headers = new[]
            {
                "Employee ID", "First Name", "Middle Name", "Last Name", "Staff Type",
                "Department", "Designation", "Board", "Gender", "Date of Birth",
                "Mobile", "Email", "Joining Date", "Experience (Years)", "Status"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2E7D32");
                cell.Style.Font.FontColor = XLColor.White;
            }

            // Sample rows
            var sType1 = !string.IsNullOrWhiteSpace(staffType) ? staffType : "Teaching";
            var sType2 = !string.IsNullOrWhiteSpace(staffType) ? staffType : "Non-Teaching";

            worksheet.Cell(2, 1).Value = "PCTCH0001";
            worksheet.Cell(2, 2).Value = "Rahul";
            worksheet.Cell(2, 3).Value = "Kumar";
            worksheet.Cell(2, 4).Value = "Sharma";
            worksheet.Cell(2, 5).Value = sType1;
            worksheet.Cell(2, 6).Value = "Mathematics";
            worksheet.Cell(2, 7).Value = "Lecturer";
            worksheet.Cell(2, 8).Value = "Board of Intermediate Education";
            worksheet.Cell(2, 9).Value = "Male";
            worksheet.Cell(2, 10).Value = "1990-05-15";
            worksheet.Cell(2, 11).Value = "9876543210";
            worksheet.Cell(2, 12).Value = "rahul.sharma@example.com";
            worksheet.Cell(2, 13).Value = "2024-06-01";
            worksheet.Cell(2, 14).Value = 4.5;
            worksheet.Cell(2, 15).Value = "Active";

            worksheet.Cell(3, 1).Value = "PCNT0001";
            worksheet.Cell(3, 2).Value = "Priya";
            worksheet.Cell(3, 3).Value = "";
            worksheet.Cell(3, 4).Value = "Reddy";
            worksheet.Cell(3, 5).Value = sType2;
            worksheet.Cell(3, 6).Value = "Administration";
            worksheet.Cell(3, 7).Value = "Administrative Officer";
            worksheet.Cell(3, 8).Value = "Board of Intermediate Education";
            worksheet.Cell(3, 9).Value = "Female";
            worksheet.Cell(3, 10).Value = "1992-08-20";
            worksheet.Cell(3, 11).Value = "9876543211";
            worksheet.Cell(3, 12).Value = "priya.reddy@example.com";
            worksheet.Cell(3, 13).Value = "2024-06-01";
            worksheet.Cell(3, 14).Value = 3.0;
            worksheet.Cell(3, 15).Value = "Active";

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var bytes = stream.ToArray();
            var filename = $"Staff_Import_Template_{staffType ?? "Universal"}.xlsx";
            return (bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateProfilePdfAsync(int id)
        {
            var profile = await GetStaffProfileFullAsync(id);
            var fullName = string.IsNullOrWhiteSpace(profile.MiddleName) ? $"{profile.FirstName} {profile.LastName}".Trim() : $"{profile.FirstName} {profile.MiddleName} {profile.LastName}".Trim();

            var institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? (!string.IsNullOrWhiteSpace(profile.BoardName) ? profile.BoardName : "College Management System");

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(25);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Helvetica"));

                    // Header
                    page.Header().Column(col =>
                    {
                        col.Item().Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text(institutionName.ToUpperInvariant()).Bold().FontSize(18).FontColor(Colors.Green.Darken2);
                                c.Item().Text("Staff Member Official Profile Summary").FontSize(10).FontColor(Colors.Grey.Darken1);
                            });
                            r.ConstantItem(120).AlignRight().Column(c =>
                            {
                                c.Item().Text($"Employee ID: {profile.EmployeeId}").Bold().FontSize(10);
                                c.Item().Text($"Status: {profile.Status}").FontColor(Colors.Green.Darken1);
                            });
                        });
                        col.Item().PaddingTop(5).PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                    });

                    // Content
                    page.Content().Column(col =>
                    {
                        // Basic & Employment Card
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(r =>
                        {
                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Basic Information").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Full Name: {fullName}");
                                c.Item().Text($"Gender: {profile.Gender} | DOB: {profile.DateOfBirth:yyyy-MM-dd}");
                                c.Item().Text($"Aadhaar: {profile.Aadhaar ?? "—"} | PAN: {profile.PanNumber ?? "—"}");
                                c.Item().Text($"Mobile: {profile.Mobile} | Email: {profile.Email}");
                                c.Item().Text($"Marital Status: {profile.MaritalStatus ?? "—"} | Nationality: {profile.Nationality ?? "Indian"}");
                            });

                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Employment Details").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Staff Type: {profile.StaffType}");
                                c.Item().Text($"Department: {profile.Department}");
                                c.Item().Text($"Designation: {profile.Designation}");
                                c.Item().Text($"Board: {profile.BoardName ?? "—"}");
                                c.Item().Text($"Joining Date: {profile.JoiningDate:yyyy-MM-dd} | Exp: {profile.Experience} Yrs");
                                c.Item().Text($"Employment Type: {profile.EmploymentType ?? "Full Time"}");
                            });
                        });

                        col.Item().PaddingTop(10);

                        // Address & Emergency Contact
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(r =>
                        {
                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Contact & Address").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Current Address: {profile.CurrentAddress ?? "—"}");
                                c.Item().Text($"City: {profile.City ?? "—"} | District: {profile.District ?? "—"}");
                                c.Item().Text($"State: {profile.State ?? "—"} | PIN: {profile.Pincode ?? "—"}");
                            });

                            r.RelativeItem(2).Column(c =>
                            {
                                c.Item().Text("Emergency Contact").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Text($"Contact Name: {profile.EmergencyContact?.ContactName ?? "—"}");
                                c.Item().Text($"Relationship: {profile.EmergencyContact?.Relationship ?? "—"}");
                                c.Item().Text($"Mobile: {profile.EmergencyContact?.Mobile ?? "—"}");
                            });
                        });

                        col.Item().PaddingTop(10);

                        // Education List
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Educational Qualifications").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                            if (profile.EducationList != null && profile.EducationList.Count > 0)
                            {
                                c.Item().PaddingTop(3).Table(t =>
                                {
                                    t.ColumnsDefinition(cd =>
                                    {
                                        cd.RelativeColumn(2);
                                        cd.RelativeColumn(3);
                                        cd.ConstantColumn(60);
                                        cd.ConstantColumn(60);
                                    });
                                    t.Header(h =>
                                    {
                                        h.Cell().Text("Degree / Level").Bold();
                                        h.Cell().Text("Institution / University").Bold();
                                        h.Cell().Text("Year").Bold();
                                        h.Cell().Text("Grade/%").Bold();
                                    });
                                    foreach (var edu in profile.EducationList)
                                    {
                                        t.Cell().Text($"{edu.Level} {edu.Degree}".Trim());
                                        t.Cell().Text($"{edu.Institution} {edu.BoardUniversity}".Trim());
                                        t.Cell().Text(edu.PassingYear ?? "");
                                        t.Cell().Text(edu.PercentageCgpa ?? "");
                                    }
                                });
                            }
                            else
                            {
                                c.Item().PaddingTop(3).Text($"Highest Qualification: {profile.Qualification}");
                            }
                        });

                        col.Item().PaddingTop(10);

                        // Bank Details
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("Bank & Financial Information").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                            c.Item().PaddingTop(3).Row(r =>
                            {
                                r.RelativeItem().Text($"Bank: {profile.BankDetails?.BankName ?? "—"}");
                                r.RelativeItem().Text($"Account No: {profile.BankDetails?.AccountNumber ?? "—"}");
                                r.RelativeItem().Text($"IFSC: {profile.BankDetails?.IfscCode ?? "—"}");
                                r.RelativeItem().Text($"Branch: {profile.BankDetails?.Branch ?? "—"}");
                            });
                        });
                    });

                    // Footer
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Generated on ");
                        x.Span(DateTime.UtcNow.ToString("dd MMM yyyy, hh:mm tt"));
                        x.Span($" | {institutionName}");
                    });
                });
            });

            using var ms = new MemoryStream();
            doc.GeneratePdf(ms);
            var bytes = ms.ToArray();
            var filename = $"Staff_Profile_{profile.EmployeeId}_{DateTime.UtcNow:yyyyMMdd}.pdf";
            return (bytes, "application/pdf", filename);
        }

        public async Task<StaffResponseDto> UploadPhotoAsync(UploadStaffPhotoDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {dto.StaffId} not found.");

            if (dto.Photo == null || dto.Photo.Length == 0)
                throw new ValidationException("Please choose a photo file.");

            var ext = Path.GetExtension(dto.Photo.FileName).ToLowerInvariant();
            if (!AllowedPhotoExtensions.Contains(ext))
                throw new ValidationException("Only JPEG and PNG photos are accepted.");

            var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "staff-photos");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            var fileName = $"photo_staff_{staff.Id}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var physicalPath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await dto.Photo.CopyToAsync(stream);
            }

            staff.PhotoPath = $"/uploads/staff-photos/{fileName}";
            await _staffRepository.UpdateAsync(staff);
            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id)
        {
            var photoPath = await _staffRepository.GetPhotoPathAsync(id);
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            if (!string.IsNullOrWhiteSpace(photoPath))
            {
                var fullPath = Path.Combine(webRoot, photoPath.TrimStart('/'));
                if (File.Exists(fullPath))
                {
                    var ext = Path.GetExtension(fullPath).ToLowerInvariant();
                    var contentType = ext == ".png" ? "image/png" : "image/jpeg";
                    return (fullPath, contentType);
                }
            }

            // Return default avatar placeholder
            var defaultAvatar = Path.Combine(webRoot, "images", "default-avatar.png");
            if (File.Exists(defaultAvatar))
            {
                return (defaultAvatar, "image/png");
            }

            throw new NotFoundException("No photo available.");
        }

        public async Task<StaffSubjectAllocationResponseDto> AssignSubjectAsync(AssignStaffSubjectDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null) throw new NotFoundException($"Staff with ID {dto.StaffId} not found.");

            var subject = await _subjectRepository.GetByIdAsync(dto.SubjectId);
            if (subject == null) throw new NotFoundException($"Subject with ID {dto.SubjectId} not found.");

            var allocation = _mapper.Map<StaffSubjectAllocation>(dto);
            var created = await _allocationRepository.AddAsync(allocation);
            created.Staff = staff;
            created.Subject = subject;

            return _mapper.Map<StaffSubjectAllocationResponseDto>(created);
        }

        public async Task<StaffSubjectAllocationResponseDto> UpdateSubjectAllocationAsync(int id, UpdateStaffSubjectAllocationDto dto)
        {
            var allocation = await _allocationRepository.GetByIdAsync(id);
            if (allocation == null) throw new NotFoundException($"Subject allocation with ID {id} not found.");

            _mapper.Map(dto, allocation);
            await _allocationRepository.UpdateAsync(allocation);
            return _mapper.Map<StaffSubjectAllocationResponseDto>(allocation);
        }

        public async Task<bool> DeleteSubjectAllocationAsync(int id)
        {
            var allocation = await _allocationRepository.GetByIdAsync(id);
            if (allocation == null) throw new NotFoundException($"Subject allocation with ID {id} not found.");

            await _allocationRepository.DeleteAsync(allocation);
            return true;
        }

        public async Task<List<StaffSubjectAllocationResponseDto>> GetStaffSubjectAllocationsAsync(int staffId)
        {
            var list = await _allocationRepository.GetByStaffIdAsync(staffId);
            return _mapper.Map<List<StaffSubjectAllocationResponseDto>>(list);
        }

        public async Task<StaffWorkloadResponseDto?> GetStaffWorkloadAsync(int staffId)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null) throw new NotFoundException($"Staff with ID {staffId} not found.");

            var allocations = await _allocationRepository.GetByStaffIdAsync(staffId);
            return new StaffWorkloadResponseDto
            {
                StaffId = staff.Id,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                EmployeeId = staff.EmployeeId,
                TotalAllocatedSubjects = allocations.Count,
                TotalAllocatedWeeklyHours = allocations.Count * 4,
                Status = "Normal"
            };
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================

        private StaffProfileFullDto MapToFullProfileDto(Staff staff)
        {
            var dto = _mapper.Map<StaffProfileFullDto>(staff);
            dto.FullName = string.IsNullOrWhiteSpace(staff.MiddleName) ? $"{staff.FirstName} {staff.LastName}".Trim() : $"{staff.FirstName} {staff.MiddleName} {staff.LastName}".Trim();
            if (!string.IsNullOrWhiteSpace(staff.PhotoPath))
            {
                dto.PhotoUrl = $"/api/v1/staff/photo/{staff.Id}";
            }
            if (staff.DepartmentRef != null) dto.Department = staff.DepartmentRef.DepartmentName;
            if (staff.BoardRef != null)
            {
                dto.BoardName = staff.BoardRef.BoardName;
                dto.BoardCode = staff.BoardRef.BoardCode;
            }
            if (staff.DesignationRef != null && string.IsNullOrWhiteSpace(dto.Designation)) dto.Designation = staff.DesignationRef.Name;

            // Allocated Subjects list
            if (staff.StaffSubjectAllocations != null && staff.StaffSubjectAllocations.Any())
            {
                dto.AllocatedSubjects = staff.StaffSubjectAllocations
                    .Select(a => a.Subject != null ? a.Subject.SubjectName : string.Empty)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct()
                    .ToList();
            }

            // Educational Qualifications
            var eduList = dto.EducationList != null && dto.EducationList.Any() ? dto.EducationList : DeserializeList<StaffEducationItem>(staff.EducationJson);
            dto.EducationList = eduList;
            if (eduList.Any())
            {
                var primaryEdu = eduList.FirstOrDefault();
                if (primaryEdu != null)
                {
                    dto.HighestQualification = !string.IsNullOrWhiteSpace(primaryEdu.Degree) ? primaryEdu.Degree : primaryEdu.Level;
                    dto.University = !string.IsNullOrWhiteSpace(primaryEdu.BoardUniversity) ? primaryEdu.BoardUniversity : primaryEdu.Institution;
                    dto.Specialization = primaryEdu.Specialization;
                    dto.PassingYear = primaryEdu.PassingYear;
                    dto.Percentage = primaryEdu.PercentageCgpa;
                }
            }
            if (string.IsNullOrWhiteSpace(dto.HighestQualification))
            {
                dto.HighestQualification = staff.Qualification;
            }

            // Experience
            var expList = dto.ExperienceList != null && dto.ExperienceList.Any() ? dto.ExperienceList : DeserializeList<StaffExperienceItem>(staff.ExperienceJson);
            dto.ExperienceList = expList;
            if (expList.Any())
            {
                var primaryExp = expList.FirstOrDefault();
                if (primaryExp != null)
                {
                    dto.PreviousInstitution = primaryExp.Organization;
                    dto.PreviousDesignation = primaryExp.Designation;
                    dto.ExperienceFrom = primaryExp.FromDate;
                    dto.ExperienceTo = primaryExp.ToDate;
                    var total = expList.Sum(e => e.TotalYears);
                    dto.TotalExperience = total > 0 ? $"{total} Years" : $"{staff.Experience} Years";
                }
            }
            if (string.IsNullOrWhiteSpace(dto.TotalExperience))
            {
                dto.TotalExperience = staff.Experience > 0 ? $"{staff.Experience} Years" : "0 Years";
            }

            // Bank Details
            var bank = dto.BankDetails != null && !string.IsNullOrWhiteSpace(dto.BankDetails.BankName) ? dto.BankDetails : DeserializeObject<StaffBankDetails>(staff.BankDetailsJson);
            if (bank != null)
            {
                dto.BankDetails = bank;
                dto.BankName = bank.BankName;
                dto.AccountHolderName = bank.AccountHolderName;
                dto.AccountHolder = bank.AccountHolderName;
                dto.AccountNumber = bank.AccountNumber;
                dto.IfscCode = bank.IfscCode;
                dto.Ifsc = bank.IfscCode;
                dto.Branch = bank.Branch;
                dto.AccountType = bank.AccountType;
                dto.BasicSalary = bank.BasicSalary;
            }

            // Emergency Contact
            var emergency = dto.EmergencyContact != null && !string.IsNullOrWhiteSpace(dto.EmergencyContact.ContactName) ? dto.EmergencyContact : DeserializeObject<StaffEmergencyContact>(staff.EmergencyContactJson);
            if (emergency != null)
            {
                dto.EmergencyContact = emergency;
                dto.ContactName = emergency.ContactName;
                dto.EmergencyName = emergency.ContactName;
                dto.Relationship = emergency.Relationship;
                dto.EmergencyRelationship = emergency.Relationship;
                dto.EmergencyMobile = emergency.Mobile;
                dto.EmergencyAlternate = emergency.AlternateMobile;
                dto.EmergencyAddress = emergency.Address;
            }

            // Documents
            var docList = dto.DocumentsList != null && dto.DocumentsList.Any() ? dto.DocumentsList : DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            dto.DocumentsList = docList;
            foreach (var d in docList)
            {
                var type = d.DocumentType?.ToLowerInvariant() ?? "";
                if (type.Contains("aadhaar")) dto.AadhaarDocument = d.FileName;
                else if (type.Contains("pan")) dto.PanDocument = d.FileName;
                else if (type.Contains("qualif")) dto.QualificationCertificate = d.FileName;
                else if (type.Contains("exp")) dto.ExperienceCertificate = d.FileName;
                else if (type.Contains("resume")) dto.Resume = d.FileName;
                else if (type.Contains("bank")) dto.BankProof = d.FileName;
                else if (type.Contains("driv")) dto.DrivingLicence = d.FileName;
                else if (type.Contains("photo")) dto.Photo = d.FileName;
                else if (type.Contains("sign")) dto.Signature = d.FileName;
                else dto.OtherDocuments = d.FileName;
            }

            return dto;
        }

        private static void ApplySectionUpdate(Staff staff, UpdateStaffProfileSectionDto dto)
        {
            if (dto.Personal != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Personal.FirstName)) staff.FirstName = dto.Personal.FirstName.Trim();
                if (dto.Personal.MiddleName != null) staff.MiddleName = dto.Personal.MiddleName.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Personal.LastName)) staff.LastName = dto.Personal.LastName.Trim();
                if (dto.Personal.FatherOrHusbandName != null || dto.Personal.GuardianName != null)
                    staff.FatherOrHusbandName = (dto.Personal.FatherOrHusbandName ?? dto.Personal.GuardianName)?.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Personal.Gender)) staff.Gender = dto.Personal.Gender.Trim();
                if (dto.Personal.DateOfBirth.HasValue) staff.DateOfBirth = dto.Personal.DateOfBirth.Value;
                if (dto.Personal.MaritalStatus != null) staff.MaritalStatus = dto.Personal.MaritalStatus.Trim();
                if (dto.Personal.Nationality != null) staff.Nationality = dto.Personal.Nationality.Trim();
                if (dto.Personal.Aadhaar != null) staff.Aadhaar = dto.Personal.Aadhaar.Trim();
                if (dto.Personal.PanNumber != null || dto.Personal.Pan != null)
                    staff.PanNumber = (dto.Personal.PanNumber ?? dto.Personal.Pan)?.Trim();
                if (dto.Personal.BloodGroup != null) staff.BloodGroup = dto.Personal.BloodGroup.Trim();
            }

            if (dto.Address != null)
            {
                if (dto.Address.AlternateMobile != null) staff.AlternateMobile = dto.Address.AlternateMobile.Trim();
                if (dto.Address.CurrentAddress != null) staff.CurrentAddress = dto.Address.CurrentAddress.Trim();
                if (dto.Address.PermanentAddress != null) staff.PermanentAddress = dto.Address.PermanentAddress.Trim();
                if (dto.Address.City != null) staff.City = dto.Address.City.Trim();
                if (dto.Address.District != null) staff.District = dto.Address.District.Trim();
                if (dto.Address.State != null) staff.State = dto.Address.State.Trim();
                if (dto.Address.Pincode != null || dto.Address.Pin != null)
                    staff.Pincode = (dto.Address.Pincode ?? dto.Address.Pin)?.Trim();
                if (dto.Address.Country != null) staff.Country = dto.Address.Country.Trim();
            }

            if (dto.Education != null && dto.Education.Any())
            {
                staff.EducationJson = JsonSerializer.Serialize(dto.Education);
                var first = dto.Education.FirstOrDefault();
                if (first != null && !string.IsNullOrWhiteSpace(first.Degree))
                {
                    staff.Qualification = first.Degree;
                }
            }

            if (dto.Experience != null && dto.Experience.Any())
            {
                staff.ExperienceJson = JsonSerializer.Serialize(dto.Experience);
                var total = dto.Experience.Sum(e => e.TotalYears);
                if (total > 0) staff.Experience = total;
            }

            if (dto.Bank != null)
            {
                staff.BankDetailsJson = JsonSerializer.Serialize(dto.Bank);
                if (!string.IsNullOrWhiteSpace(dto.Bank.PanNumber))
                {
                    staff.PanNumber = dto.Bank.PanNumber.Trim();
                }
            }

            if (dto.Emergency != null)
            {
                staff.EmergencyContactJson = JsonSerializer.Serialize(dto.Emergency);
            }

            if (dto.Employment != null)
            {
                if (dto.Employment.DepartmentId.HasValue) staff.DepartmentId = dto.Employment.DepartmentId.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.Department)) staff.Department = dto.Employment.Department.Trim();
                if (dto.Employment.DesignationId.HasValue) staff.DesignationId = dto.Employment.DesignationId.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.Designation)) staff.Designation = dto.Employment.Designation.Trim();
                if (dto.Employment.JoiningDate.HasValue || dto.Employment.DateOfJoining.HasValue)
                    staff.JoiningDate = dto.Employment.JoiningDate ?? dto.Employment.DateOfJoining!.Value;
                if (dto.Employment.Experience.HasValue) staff.Experience = dto.Employment.Experience.Value;
                if (!string.IsNullOrWhiteSpace(dto.Employment.EmploymentType)) staff.EmploymentType = dto.Employment.EmploymentType.Trim();
                if (!string.IsNullOrWhiteSpace(dto.Employment.Status)) staff.Status = dto.Employment.Status.Trim();
            }
        }

        private static void SyncFlattenedPropertiesToJson(
            Staff staff,
            string? bankName, string? accountHolder, string? accountNumber, string? ifsc, string? branch, string? accountType, decimal? basicSalary,
            string? emergencyName, string? emergencyRelationship, string? emergencyMobile, string? emergencyAlternate, string? emergencyAddress,
            string? highestQualification, string? university, string? specialization, string? passingYear, string? percentage,
            string? totalExp, string? previousInstitution, string? previousDesignation, string? expFrom, string? expTo,
            string? aadhaarDoc, string? panDoc, string? qualCert, string? expCert, string? resume, string? bankProof, string? drivingLicence, string? otherDocs, string? photo, string? signature,
            string? rawEduJson, string? rawExpJson, string? rawDocJson, string? rawBankJson, string? rawEmergencyJson)
        {
            // 1. Bank Details
            if (!string.IsNullOrWhiteSpace(rawBankJson))
            {
                staff.BankDetailsJson = rawBankJson;
            }
            else if (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(accountNumber) || !string.IsNullOrWhiteSpace(ifsc))
            {
                var bank = DeserializeObject<StaffBankDetails>(staff.BankDetailsJson) ?? new StaffBankDetails();
                if (!string.IsNullOrWhiteSpace(bankName)) bank.BankName = bankName.Trim();
                if (!string.IsNullOrWhiteSpace(accountHolder)) bank.AccountHolderName = accountHolder.Trim();
                if (!string.IsNullOrWhiteSpace(accountNumber)) bank.AccountNumber = accountNumber.Trim();
                if (!string.IsNullOrWhiteSpace(ifsc)) bank.IfscCode = ifsc.Trim();
                if (!string.IsNullOrWhiteSpace(branch)) bank.Branch = branch.Trim();
                if (!string.IsNullOrWhiteSpace(accountType)) bank.AccountType = accountType.Trim();
                if (basicSalary.HasValue) bank.BasicSalary = basicSalary.Value;
                staff.BankDetailsJson = JsonSerializer.Serialize(bank);
            }

            // 2. Emergency Contact
            if (!string.IsNullOrWhiteSpace(rawEmergencyJson))
            {
                staff.EmergencyContactJson = rawEmergencyJson;
            }
            else if (!string.IsNullOrWhiteSpace(emergencyName) || !string.IsNullOrWhiteSpace(emergencyMobile) || !string.IsNullOrWhiteSpace(emergencyAddress))
            {
                var em = DeserializeObject<StaffEmergencyContact>(staff.EmergencyContactJson) ?? new StaffEmergencyContact();
                if (!string.IsNullOrWhiteSpace(emergencyName)) em.ContactName = emergencyName.Trim();
                if (!string.IsNullOrWhiteSpace(emergencyRelationship)) em.Relationship = emergencyRelationship.Trim();
                if (!string.IsNullOrWhiteSpace(emergencyMobile)) em.Mobile = emergencyMobile.Trim();
                if (!string.IsNullOrWhiteSpace(emergencyAlternate)) em.AlternateMobile = emergencyAlternate.Trim();
                if (!string.IsNullOrWhiteSpace(emergencyAddress)) em.Address = emergencyAddress.Trim();
                staff.EmergencyContactJson = JsonSerializer.Serialize(em);
            }

            // 3. Education List
            if (!string.IsNullOrWhiteSpace(rawEduJson))
            {
                staff.EducationJson = rawEduJson;
            }
            else if (!string.IsNullOrWhiteSpace(highestQualification) || !string.IsNullOrWhiteSpace(university))
            {
                var eduList = DeserializeList<StaffEducationItem>(staff.EducationJson);
                if (!eduList.Any())
                {
                    eduList.Add(new StaffEducationItem
                    {
                        Level = "Highest Qualification",
                        Degree = highestQualification ?? staff.Qualification,
                        BoardUniversity = university ?? string.Empty,
                        Institution = university ?? string.Empty,
                        Specialization = specialization ?? string.Empty,
                        PassingYear = passingYear ?? string.Empty,
                        PercentageCgpa = percentage ?? string.Empty
                    });
                }
                else
                {
                    var first = eduList.First();
                    if (!string.IsNullOrWhiteSpace(highestQualification)) first.Degree = highestQualification.Trim();
                    if (!string.IsNullOrWhiteSpace(university)) { first.BoardUniversity = university.Trim(); first.Institution = university.Trim(); }
                    if (!string.IsNullOrWhiteSpace(specialization)) first.Specialization = specialization.Trim();
                    if (!string.IsNullOrWhiteSpace(passingYear)) first.PassingYear = passingYear.Trim();
                    if (!string.IsNullOrWhiteSpace(percentage)) first.PercentageCgpa = percentage.Trim();
                }
                staff.EducationJson = JsonSerializer.Serialize(eduList);
                if (!string.IsNullOrWhiteSpace(highestQualification)) staff.Qualification = highestQualification.Trim();
            }

            // 4. Experience List
            if (!string.IsNullOrWhiteSpace(rawExpJson))
            {
                staff.ExperienceJson = rawExpJson;
            }
            else if (!string.IsNullOrWhiteSpace(previousInstitution) || !string.IsNullOrWhiteSpace(previousDesignation) || !string.IsNullOrWhiteSpace(totalExp))
            {
                var expList = DeserializeList<StaffExperienceItem>(staff.ExperienceJson);
                decimal parsedYears = staff.Experience;
                if (!string.IsNullOrWhiteSpace(totalExp))
                {
                    var cleanYears = totalExp.Replace("Years", "").Replace("years", "").Replace("Yrs", "").Trim();
                    decimal.TryParse(cleanYears, out parsedYears);
                }

                if (!expList.Any())
                {
                    expList.Add(new StaffExperienceItem
                    {
                        Organization = previousInstitution ?? string.Empty,
                        Designation = previousDesignation ?? string.Empty,
                        FromDate = expFrom ?? string.Empty,
                        ToDate = expTo ?? string.Empty,
                        TotalYears = parsedYears
                    });
                }
                else
                {
                    var first = expList.First();
                    if (!string.IsNullOrWhiteSpace(previousInstitution)) first.Organization = previousInstitution.Trim();
                    if (!string.IsNullOrWhiteSpace(previousDesignation)) first.Designation = previousDesignation.Trim();
                    if (!string.IsNullOrWhiteSpace(expFrom)) first.FromDate = expFrom.Trim();
                    if (!string.IsNullOrWhiteSpace(expTo)) first.ToDate = expTo.Trim();
                    first.TotalYears = parsedYears;
                }
                staff.ExperienceJson = JsonSerializer.Serialize(expList);
                if (parsedYears > 0) staff.Experience = parsedYears;
            }

            // 5. Documents List
            if (!string.IsNullOrWhiteSpace(rawDocJson))
            {
                staff.DocumentsJson = rawDocJson;
            }
            else
            {
                var docList = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
                void AddOrUpdateDoc(string type, string? fileName)
                {
                    if (string.IsNullOrWhiteSpace(fileName)) return;
                    docList.RemoveAll(d => string.Equals(d.DocumentType, type, StringComparison.OrdinalIgnoreCase));
                    docList.Add(new StaffDocumentItem
                    {
                        DocumentType = type,
                        DocumentName = fileName,
                        FileName = fileName,
                        FilePath = $"/uploads/staff-documents/{fileName}",
                        FileType = Path.GetExtension(fileName).TrimStart('.').ToUpper(),
                        UploadedAt = DateTime.UtcNow
                    });
                }

                AddOrUpdateDoc("Aadhaar", aadhaarDoc);
                AddOrUpdateDoc("PAN", panDoc);
                AddOrUpdateDoc("Qualification", qualCert);
                AddOrUpdateDoc("Experience", expCert);
                AddOrUpdateDoc("Resume", resume);
                AddOrUpdateDoc("BankProof", bankProof);
                AddOrUpdateDoc("DrivingLicence", drivingLicence);
                AddOrUpdateDoc("Other", otherDocs);
                AddOrUpdateDoc("Photo", photo);
                AddOrUpdateDoc("Signature", signature);

                if (docList.Any())
                {
                    staff.DocumentsJson = JsonSerializer.Serialize(docList);
                }
            }
        }

        private async Task SyncStaffSubjectAllocationsAsync(int staffId, List<string> subjectNames)
        {
            try
            {
                var existingAllocations = await _allocationRepository.GetByStaffIdAsync(staffId);
                foreach (var alloc in existingAllocations)
                {
                    await _allocationRepository.DeleteAsync(alloc);
                }

                var distinctNames = subjectNames
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s.Trim())
                    .Distinct()
                    .ToList();

                if (!distinctNames.Any()) return;

                var allSubjects = await _subjectRepository.GetAllAsync();

                foreach (var name in distinctNames)
                {
                    var subject = allSubjects.FirstOrDefault(s =>
                        string.Equals(s.SubjectName, name, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(s.SubjectCode, name, StringComparison.OrdinalIgnoreCase));

                    if (subject != null)
                    {
                        var allocation = new StaffSubjectAllocation
                        {
                            StaffId = staffId,
                            SubjectId = subject.SubjectId,
                            AcademicYearId = 1,
                            MaxWeeklyHours = 18,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _allocationRepository.AddAsync(allocation);
                    }
                }
            }
            catch (Exception ex)
            {
                // Fallback gracefully without breaking staff save
                Console.WriteLine($"[StaffSubjectAllocationSync] Notice: {ex.Message}");
            }
        }

        private static int CalculateCompletionPercentage(Staff staff)
        {
            int score = 0;

            // 1. Basic & Personal Details (20%)
            if (!string.IsNullOrWhiteSpace(staff.FirstName) && !string.IsNullOrWhiteSpace(staff.LastName) && !string.IsNullOrWhiteSpace(staff.Gender) && staff.DateOfBirth > DateTime.MinValue)
            {
                score += 15;
            }
            if (!string.IsNullOrWhiteSpace(staff.Aadhaar) || !string.IsNullOrWhiteSpace(staff.PanNumber) || !string.IsNullOrWhiteSpace(staff.FatherOrHusbandName))
            {
                score += 5;
            }

            // 2. Contact & Address (15%)
            if (!string.IsNullOrWhiteSpace(staff.CurrentAddress) || !string.IsNullOrWhiteSpace(staff.PermanentAddress))
            {
                score += 8;
            }
            if (!string.IsNullOrWhiteSpace(staff.City) && !string.IsNullOrWhiteSpace(staff.State) && !string.IsNullOrWhiteSpace(staff.Pincode))
            {
                score += 7;
            }

            // 3. Educational Qualifications (15%)
            var edu = DeserializeList<StaffEducationItem>(staff.EducationJson);
            if (edu.Count > 0 || !string.IsNullOrWhiteSpace(staff.Qualification))
            {
                score += 15;
            }

            // 4. Experience (10%)
            var exp = DeserializeList<StaffExperienceItem>(staff.ExperienceJson);
            if (exp.Count > 0 || staff.Experience > 0)
            {
                score += 10;
            }
            else
            {
                score += 10; // Treat 0 exp as Fresher filled
            }

            // 5. Documents Upload (15%)
            var docs = DeserializeList<StaffDocumentItem>(staff.DocumentsJson);
            if (docs.Count >= 2)
            {
                score += 15;
            }
            else if (docs.Count == 1)
            {
                score += 8;
            }

            // 6. Bank Details (15%)
            var bank = DeserializeObject<StaffBankDetails>(staff.BankDetailsJson);
            if (bank != null && !string.IsNullOrWhiteSpace(bank.AccountNumber) && !string.IsNullOrWhiteSpace(bank.IfscCode))
            {
                score += 15;
            }

            // 7. Emergency Contact (10%)
            var emergency = DeserializeObject<StaffEmergencyContact>(staff.EmergencyContactJson);
            if (emergency != null && !string.IsNullOrWhiteSpace(emergency.ContactName) && !string.IsNullOrWhiteSpace(emergency.Mobile))
            {
                score += 10;
            }

            return Math.Min(100, Math.Max(30, score));
        }

        private static List<T> DeserializeList<T>(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<T>();
            try
            {
                return JsonSerializer.Deserialize<List<T>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<T>();
            }
            catch
            {
                return new List<T>();
            }
        }

        private static T? DeserializeObject<T>(string? json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }
    }
}
