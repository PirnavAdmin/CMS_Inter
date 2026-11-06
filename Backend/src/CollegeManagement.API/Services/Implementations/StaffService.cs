using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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
using Dapper;

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
        private readonly INumberSeriesService _numberSeriesService;
        private readonly INotificationService _notificationService;
        private readonly IAuditLoggingService _auditLogger;

        private const decimal HoursPerClassPeriod = 1.0m;
        private const long MaxPhotoFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private const long MaxDocFileSizeBytes = 10 * 1024 * 1024; // 10 MB
        private static readonly string[] AllowedPhotoExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
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
            ILogger<StaffService> logger,
            INumberSeriesService numberSeriesService,
            INotificationService notificationService,
            IAuditLoggingService auditLogger)
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
            _numberSeriesService = numberSeriesService;
            _notificationService = notificationService;
            _auditLogger = auditLogger;
        }

        public async Task<PagedResult<StaffResponseDto>> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            var (staffs, totalCount) = await _staffRepository.GetPagedStaffAsync(queryParams);
            var dtos = _mapper.Map<List<StaffResponseDto>>(staffs);

            for (int i = 0; i < staffs.Count; i++)
            {
                var st = staffs[i];
                var dto = dtos[i];
                EnrichStaffDto(st, dto);
                if (queryParams.CampusId.HasValue && queryParams.CampusId.Value > 0)
                {
                    var targetCid = queryParams.CampusId.Value;
                    if (st.CampusId != targetCid)
                    {
                        var assignment = st.StaffCampusAssignments?.FirstOrDefault(a => a.CampusId == targetCid);
                        if (st.TransferredFromCampusId == targetCid || (assignment != null && (assignment.Status == "TransferredOut" || !assignment.IsActive)))
                        {
                            dto.Status = "Transferred";
                            dto.IsTransferred = true;
                            dto.TransferredToCampusId = st.CampusId;
                            dto.TransferredToCampusName = st.Campus?.CampusName;
                        }
                    }
                }
            }

            return new PagedResult<StaffResponseDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                PageNumber = queryParams.PageNumber < 1 ? 1 : queryParams.PageNumber,
                PageSize = queryParams.PageSize < 1 ? 5 : queryParams.PageSize
            };
        }

        public async Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null, int? campusId = null)
        {
            return await _staffRepository.GetStaffDropdownAsync(staffType, campusId);
        }

        public async Task<StaffResponseDto?> GetStaffByIdAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var dto = _mapper.Map<StaffResponseDto>(staff);
            EnrichStaffDto(staff, dto);
            var linkedUser = await _userRepository.GetByStaffIdAsync(id);
            if (linkedUser != null && linkedUser.RoleId > 0)
            {
                dto.RoleId = linkedUser.RoleId;
                dto.RoleName = linkedUser.Role?.RoleName ?? (await _userRepository.GetRoleByIdAsync(linkedUser.RoleId))?.RoleName;
            }
            return dto;
        }

        private void EnrichStaffDto(Staff staff, StaffResponseDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.BoardName) && staff.BoardRef != null)
            {
                dto.BoardName = staff.BoardRef.BoardName;
                dto.BoardCode = staff.BoardRef.BoardCode;
            }

            if (staff.IsTransferred || staff.TransferredFromCampusId.HasValue)
            {
                dto.IsTransferred = true;
                dto.TransferredFromCampusId = staff.TransferredFromCampusId;
                dto.TransferredToCampusId = staff.TransferredToCampusId;
                dto.TransferStatus = staff.TransferStatus ?? "Transferred";
                dto.TransferredAt = staff.TransferredAt;
                if (staff.TransferredFromCampus != null)
                    dto.TransferredFromCampusName = staff.TransferredFromCampus.CampusName;
                if (staff.TransferredToCampus != null)
                    dto.TransferredToCampusName = staff.TransferredToCampus.CampusName;
            }

            if (staff.StaffCampusAssignments != null && staff.StaffCampusAssignments.Any())
            {
                var activeCampuses = staff.StaffCampusAssignments.Where(a => a.IsActive).ToList();
                dto.AssignedCampusIds = activeCampuses.Select(a => a.CampusId).ToList();
                dto.AssignedCampuses = staff.StaffCampusAssignments.Select(a => new
                {
                    id = a.CampusId,
                    name = a.Campus != null ? a.Campus.CampusName : $"Campus #{a.CampusId}",
                    code = a.Campus != null ? a.Campus.CampusCode : "",
                    isPrimary = a.IsPrimary,
                    isActive = a.IsActive,
                    status = a.Status
                }).Cast<object>().ToList();

                var assignmentsList = activeCampuses.Select(a => new
                {
                    campusId = a.CampusId,
                    campusName = a.Campus?.CampusName ?? $"Campus #{a.CampusId}",
                    campusCode = a.Campus?.CampusCode ?? "",
                    isPrimary = a.IsPrimary,
                    boards = staff.StaffBoardAssignments?
                        .Select(b => new
                        {
                            boardId = b.BoardId,
                            boardName = b.Board?.BoardName ?? $"Board #{b.BoardId}",
                            boardCode = b.Board?.BoardCode ?? ""
                        }).ToList() ?? new()
                }).ToList();

                dto.CampusBoardAssignmentsJson = System.Text.Json.JsonSerializer.Serialize(assignmentsList);
            }

            if (staff.StaffBoardAssignments != null && staff.StaffBoardAssignments.Any())
            {
                dto.AssignedBoardIds = staff.StaffBoardAssignments.Select(b => b.BoardId).ToList();
                dto.AssignedBoards = staff.StaffBoardAssignments.Select(b => new
                {
                    id = b.BoardId,
                    name = b.Board != null ? b.Board.BoardName : $"Board #{b.BoardId}",
                    code = b.Board != null ? b.Board.BoardCode : ""
                }).Cast<object>().ToList();
            }
        }

        public async Task<StaffResponseDto?> GetStaffByEmployeeIdAsync(string employeeId)
        {
            var staff = await _staffRepository.GetByEmployeeIdAsync(employeeId);
            if (staff == null)
                throw new NotFoundException($"Staff record with Employee ID {employeeId} not found.");

            var dto = _mapper.Map<StaffResponseDto>(staff);
            EnrichStaffDto(staff, dto);
            var linkedUser = await _userRepository.GetByStaffIdAsync(staff.Id);
            if (linkedUser != null && linkedUser.RoleId > 0)
            {
                dto.RoleId = linkedUser.RoleId;
                dto.RoleName = linkedUser.Role?.RoleName ?? (await _userRepository.GetRoleByIdAsync(linkedUser.RoleId))?.RoleName;
            }
            return dto;
        }

        public async Task<StaffProfileFullDto> GetStaffProfileFullAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var dto = MapToFullProfileDto(staff);
            var linkedUser = await _userRepository.GetByStaffIdAsync(id);
            if (linkedUser != null && linkedUser.RoleId > 0)
            {
                dto.RoleId = linkedUser.RoleId;
                dto.RoleName = linkedUser.Role?.RoleName ?? (await _userRepository.GetRoleByIdAsync(linkedUser.RoleId))?.RoleName;
            }
            return dto;
        }

        public async Task<StaffProfileFullDto> GetStaffProfileByEmployeeIdAsync(string employeeId)
        {
            if (string.IsNullOrWhiteSpace(employeeId))
                throw new ValidationException("Employee ID cannot be empty.");

            var staff = await _staffRepository.GetByEmployeeIdAsync(employeeId.Trim());
            if (staff == null)
                throw new NotFoundException($"Staff record with Employee ID {employeeId} not found.");

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

        public async Task<string> GetNextEmployeeIdAsync(string staffType, int campusId = 1)
        {
            var isTeaching = !string.Equals(staffType?.Replace("-", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
            var seriesCode = isTeaching ? "TEACHING_STAFF_ID" : "NON_TEACHING_STAFF_ID";
            var generatedDto = await _numberSeriesService.GenerateNextNumberAsync(seriesCode, null, campusId);
            
            if (generatedDto != null && !string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber))
            {
                return generatedDto.GeneratedNumber;
            }
            return await _staffRepository.GenerateNextEmployeeIdAsync(staffType, campusId);
        }

        public async Task<StaffDashboardStatsDto> GetDashboardStatsAsync(int? boardId = null, int? campusId = null)
        {
            return await _staffRepository.GetDashboardStatsAsync(boardId, campusId);
        }

        public async Task<StaffResponseDto> CreateStaffAsync(CreateStaffDto dto)
        {
            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? "Teaching" : dto.StaffType.Trim();

            // Auto generate Employee ID if not supplied or empty
            string employeeId = dto.EmployeeId?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(employeeId))
            {
                var isTeaching = !string.Equals(staffType?.Replace("-", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
                var seriesCode = isTeaching ? "TEACHING_STAFF_ID" : "NON_TEACHING_STAFF_ID";
                var generatedDto = await _numberSeriesService.GenerateNextNumberAsync(seriesCode, null, dto.CampusId ?? 1);
                
                if (generatedDto != null && !string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber))
                {
                    employeeId = generatedDto.GeneratedNumber;
                }
                else
                {
                    employeeId = await _staffRepository.GenerateNextEmployeeIdAsync(staffType, dto.CampusId ?? 1);
                }
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

            // Email handling: Required for Teaching, optional for Non-Teaching (with fallback system login email)
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                if (string.Equals(staffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(staffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(staffType, "Non Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    var cleanEmp = Regex.Replace(employeeId.ToLowerInvariant(), @"[^a-z0-9]", "");
                    dto.Email = $"{cleanEmp}@college.local";
                }
                else
                {
                    throw new ValidationException("Email address is required for teaching staff creation.");
                }
            }

            if (!await _staffRepository.IsEmployeeIdUniqueAsync(employeeId))
            {
                var isTeaching = !string.Equals(staffType?.Replace("-", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
                var seriesCode = isTeaching ? "TEACHING_STAFF_ID" : "NON_TEACHING_STAFF_ID";
                var prefix = isTeaching ? "PCTCH" : "PCNT";

                // If this matches the auto-generated series format and was taken concurrently, safely fetch the next fresh ID
                if (employeeId.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    var generatedDto = await _numberSeriesService.GenerateNextNumberAsync(seriesCode, null, dto.CampusId ?? 1);
                    if (generatedDto != null && !string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber) && await _staffRepository.IsEmployeeIdUniqueAsync(generatedDto.GeneratedNumber))
                    {
                        employeeId = generatedDto.GeneratedNumber;
                    }
                    else
                    {
                        employeeId = await _staffRepository.GenerateNextEmployeeIdAsync(staffType, dto.CampusId ?? 1);
                    }
                }

                if (!await _staffRepository.IsEmployeeIdUniqueAsync(employeeId))
                    throw new ConflictException($"Employee ID '{employeeId}' is already registered.");
            }

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                if (!await _staffRepository.IsEmailUniqueAsync(dto.Email))
                {
                    if (dto.Email.EndsWith("@college.local", StringComparison.OrdinalIgnoreCase))
                    {
                        dto.Email = $"{Regex.Replace(employeeId.ToLowerInvariant(), @"[^a-z0-9]", "")}_{Guid.NewGuid().ToString("N").Substring(0, 4)}@college.local";
                    }
                    else
                    {
                        throw new ConflictException($"Email address '{dto.Email}' is already registered to a staff record.");
                    }
                }

                var existingUser = await _userRepository.GetByEmailAsync(dto.Email.Trim());
                if (existingUser != null)
                {
                    if (dto.Email.EndsWith("@college.local", StringComparison.OrdinalIgnoreCase))
                    {
                        dto.Email = $"{Regex.Replace(employeeId.ToLowerInvariant(), @"[^a-z0-9]", "")}_{Guid.NewGuid().ToString("N").Substring(0, 4)}@college.local";
                    }
                    else
                    {
                        throw new ConflictException($"Email address '{dto.Email}' is already registered to an existing authentication account.");
                    }
                }
            }

            if (!await _staffRepository.IsMobileUniqueAsync(dto.Mobile))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered.");

            if (!string.IsNullOrWhiteSpace(dto.Aadhaar) && !await _staffRepository.IsAadhaarUniqueAsync(dto.Aadhaar))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered.");

            var (resolvedBoardId, resolvedBoardName, _) = await ResolveBoardAsync(dto.BoardId, dto.BoardName ?? dto.Board, dto.BoardCode);

            var staff = _mapper.Map<Staff>(dto);
            staff.EmployeeId = employeeId;
            staff.StaffType = staffType;
            staff.DepartmentId = resolvedDepartmentId;
            staff.Department = deptName;
            staff.DesignationId = resolvedDesignationId;
            staff.Designation = resolvedDesignationName;
            staff.BoardId = resolvedBoardId;
            staff.BoardName = resolvedBoardName;
            staff.CampusId = dto.CampusId;
            
            // Multi-Campus / Multi-Board Assignments
            if (dto.AssignedCampusIds != null && dto.AssignedCampusIds.Any())
            {
                foreach (var cId in dto.AssignedCampusIds.Distinct())
                {
                    staff.StaffCampusAssignments.Add(new StaffCampusAssignment { CampusId = cId });
                }
                // Also set the primary CampusId if it's not set
                if (!staff.CampusId.HasValue) staff.CampusId = dto.AssignedCampusIds.First();
            }
            else if (dto.CampusId.HasValue)
            {
                staff.StaffCampusAssignments.Add(new StaffCampusAssignment { CampusId = dto.CampusId.Value });
            }

            if (dto.AssignedBoardIds != null && dto.AssignedBoardIds.Any())
            {
                foreach (var bId in dto.AssignedBoardIds.Distinct())
                {
                    staff.StaffBoardAssignments.Add(new StaffBoardAssignment { BoardId = bId });
                }
                // Also set primary BoardId if not set
                if (!staff.BoardId.HasValue) staff.BoardId = dto.AssignedBoardIds.First();
            }
            else if (resolvedBoardId.HasValue)
            {
                staff.StaffBoardAssignments.Add(new StaffBoardAssignment { BoardId = resolvedBoardId.Value });
            }

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
                dto.EducationJson, dto.ExperienceJson, dto.DocumentsJson, dto.BankDetailsJson, dto.EmergencyContactJson,
                dto.DepartmentSpecific, dto.Documents, dto.DepartmentSpecificJson);

            staff.ProfileCompletionPercentage = CalculateCompletionPercentage(staff);

            // Driver & Transport specific details
            var isDriver = !string.IsNullOrWhiteSpace(dto.DrivingLicenseNumber)
                || (!string.IsNullOrWhiteSpace(deptName) && deptName.Contains("Transport", StringComparison.OrdinalIgnoreCase))
                || (!string.IsNullOrWhiteSpace(resolvedDesignationName) && resolvedDesignationName.Contains("Driver", StringComparison.OrdinalIgnoreCase));

            staff.IsDriver = isDriver;
            if (!string.IsNullOrWhiteSpace(dto.DrivingLicenseNumber))
            {
                staff.DrivingLicenseNumber = dto.DrivingLicenseNumber.Trim();
            }
            else if (dto.DepartmentSpecific != null && dto.DepartmentSpecific.TryGetValue("licenseNumber", out var licVal) && licVal != null)
            {
                staff.DrivingLicenseNumber = licVal.ToString()?.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.DrivingLicenseExpiryDate) && DateTime.TryParse(dto.DrivingLicenseExpiryDate, out var expParsed))
            {
                staff.DrivingLicenseExpiryDate = expParsed;
            }
            else if (dto.DepartmentSpecific != null && dto.DepartmentSpecific.TryGetValue("licenseExpiry", out var expVal) && expVal != null && DateTime.TryParse(expVal.ToString(), out var expParsed2))
            {
                staff.DrivingLicenseExpiryDate = expParsed2;
            }

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
                if (dto.RoleId.HasValue && dto.RoleId.Value > 0)
                {
                    assignedRole = await _userRepository.GetRoleByIdAsync(dto.RoleId.Value, connection, dbTransaction);
                    if (assignedRole == null || !assignedRole.IsActive)
                    {
                        await transaction.RollbackAsync();
                        throw new ValidationException($"The selected role with ID '{dto.RoleId.Value}' does not exist or is inactive.");
                    }
                    if (!string.IsNullOrWhiteSpace(dto.RoleName) &&
                        !string.Equals(assignedRole.RoleName.Trim(), dto.RoleName.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        await transaction.RollbackAsync();
                        throw new ValidationException($"Submitted role name '{dto.RoleName}' does not match role ID '{dto.RoleId.Value}'.");
                    }
                }
                else if (!string.IsNullOrWhiteSpace(dto.RoleName))
                {
                    assignedRole = await _userRepository.GetRoleByNameAsync(dto.RoleName.Trim(), connection, dbTransaction);
                    if (assignedRole == null || !assignedRole.IsActive)
                    {
                        await transaction.RollbackAsync();
                        throw new ValidationException($"The selected role '{dto.RoleName}' does not exist or is inactive.");
                    }
                }
                else
                {
                    // Fallback to appropriate role (Faculty for Teaching, Staff/Faculty for Non-Teaching)
                    var targetRoleName = string.Equals(staffType, "Teaching", StringComparison.OrdinalIgnoreCase) ? "Faculty" : "Staff";
                    assignedRole = await _userRepository.GetRoleByNameAsync(targetRoleName, connection, dbTransaction);
                    if (assignedRole == null)
                    {
                        assignedRole = await _userRepository.GetRoleByNameAsync("Faculty", connection, dbTransaction);
                    }
                    if (assignedRole == null)
                    {
                        assignedRole = await _userRepository.GetRoleByIdAsync(4, connection, dbTransaction);
                    }
                    if (assignedRole == null)
                    {
                        await transaction.RollbackAsync();
                        throw new ValidationException("No valid default staff role (Faculty/Staff) could be resolved.");
                    }
                }

                var nonStaffRoles = new[] { "Super Admin", "Admin", "Student", "Parent" };
                if (nonStaffRoles.Any(r => string.Equals(r, assignedRole.RoleName, StringComparison.OrdinalIgnoreCase)))
                {
                    await transaction.RollbackAsync();
                    throw new ValidationException($"Role '{assignedRole.RoleName}' (RoleId: {assignedRole.RoleId}) cannot be assigned to a Staff account. Please select a valid Staff/Faculty role.");
                }

                // 2. Insert Staff domain record via EF Core inside this transaction
                await _staffRepository.AddAsync(staff);

                var initialPhoto = dto.PhotoPath ?? dto.Photo;
                var localSavedPhoto = await EnsurePhotoSavedLocallyAsync(staff.Id, initialPhoto);
                if (!string.IsNullOrWhiteSpace(localSavedPhoto))
                {
                    staff.PhotoPath = localSavedPhoto;
                    await _staffRepository.UpdatePhotoPathAsync(staff.Id, localSavedPhoto);
                }

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
            await EnsureStaffPayrollStructureProvisionedAsync(refreshedStaff);
            var responseDto = _mapper.Map<StaffResponseDto>(refreshedStaff);
            if (assignedRole != null)
            {
                responseDto.RoleId = assignedRole.RoleId;
                responseDto.RoleName = assignedRole.RoleName;
            }
            return responseDto;
        }

        public async Task<StaffResponseDto> UpdateStaffAsync(int id, UpdateStaffDto dto)
        {
            var existingStaff = await _staffRepository.GetByIdAsync(id);
            if (existingStaff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var staffType = string.IsNullOrWhiteSpace(dto.StaffType) ? existingStaff.StaffType : dto.StaffType.Trim();

            // Email handling for update
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                if (string.Equals(staffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(staffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(staffType, "Non Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    dto.Email = !string.IsNullOrWhiteSpace(existingStaff.Email) ? existingStaff.Email : $"{Regex.Replace(existingStaff.EmployeeId.ToLowerInvariant(), @"[^a-z0-9]", "")}@college.local";
                }
                else
                {
                    throw new ValidationException("Email address is required for teaching staff.");
                }
            }

            // Uniqueness Validations - only check if fields are actually changed to avoid false conflicts with legacy records
            var normalizedNewEmail = dto.Email?.Trim().ToUpperInvariant() ?? string.Empty;
            var normalizedOldEmail = existingStaff.Email?.Trim().ToUpperInvariant() ?? string.Empty;
            bool emailChanged = !string.IsNullOrWhiteSpace(normalizedNewEmail) && !string.Equals(normalizedNewEmail, normalizedOldEmail, StringComparison.OrdinalIgnoreCase);

            if (emailChanged && !string.IsNullOrWhiteSpace(dto.Email))
            {
                if (!await _staffRepository.IsEmailUniqueAsync(dto.Email, id))
                    throw new ConflictException($"Email address '{dto.Email}' is already registered to another staff member.");

                var existingUserWithNewEmail = await _userRepository.GetByEmailAsync(normalizedNewEmail);
                if (existingUserWithNewEmail != null && existingUserWithNewEmail.StaffId != id)
                {
                    throw new ConflictException($"Email address '{dto.Email}' is already registered to another authentication account.");
                }
            }

            var cleanNewMobile = dto.Mobile?.Trim() ?? string.Empty;
            var cleanOldMobile = existingStaff.Mobile?.Trim() ?? string.Empty;
            bool mobileChanged = !string.IsNullOrWhiteSpace(cleanNewMobile) && !string.Equals(cleanNewMobile, cleanOldMobile, StringComparison.OrdinalIgnoreCase);

            if (mobileChanged && !await _staffRepository.IsMobileUniqueAsync(cleanNewMobile, id))
                throw new ConflictException($"Mobile number '{dto.Mobile}' is already registered to another staff member.");

            var cleanNewAadhaar = dto.Aadhaar?.Trim() ?? string.Empty;
            var cleanOldAadhaar = existingStaff.Aadhaar?.Trim() ?? string.Empty;
            bool aadhaarChanged = !string.IsNullOrWhiteSpace(cleanNewAadhaar) && !string.Equals(cleanNewAadhaar, cleanOldAadhaar, StringComparison.OrdinalIgnoreCase);

            if (aadhaarChanged && !await _staffRepository.IsAadhaarUniqueAsync(cleanNewAadhaar, id))
                throw new ConflictException($"Aadhaar number '{dto.Aadhaar}' is already registered to another staff member.");

            // Department resolution - prioritize explicitly provided department name if changed
            int? resolvedDepartmentId = dto.DepartmentId;
            string deptName = dto.Department?.Trim() ?? string.Empty;

            var depts = await _departmentRepository.GetDepartmentsAsync();
            var deptByName = !string.IsNullOrWhiteSpace(deptName)
                ? depts?.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName, deptName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d.DepartmentCode, deptName, StringComparison.OrdinalIgnoreCase))
                : null;

            if (deptByName != null)
            {
                resolvedDepartmentId = deptByName.DepartmentId;
                deptName = deptByName.DepartmentName;
            }
            else if (resolvedDepartmentId.HasValue && resolvedDepartmentId.Value > 0)
            {
                var found = depts?.FirstOrDefault(d => d.DepartmentId == resolvedDepartmentId.Value);
                if (found != null)
                {
                    deptName = found.DepartmentName;
                }
            }
            else
            {
                resolvedDepartmentId = existingStaff.DepartmentId;
                deptName = existingStaff.Department;
            }

            // Designation resolution - prioritize explicitly provided designation name if changed
            int? resolvedDesignationId = dto.DesignationId;
            string resolvedDesignationName = dto.Designation?.Trim() ?? string.Empty;

            var desigByName = !string.IsNullOrWhiteSpace(resolvedDesignationName)
                ? await _designationRepository.GetByNameAsync(resolvedDesignationName)
                : null;

            if (desigByName != null)
            {
                resolvedDesignationId = desigByName.Id;
                resolvedDesignationName = desigByName.Name;
            }
            else if (resolvedDesignationId.HasValue && resolvedDesignationId.Value > 0)
            {
                var desig = await _designationRepository.GetByIdAsync(resolvedDesignationId.Value);
                if (desig != null)
                {
                    resolvedDesignationName = desig.Name;
                }
            }
            else
            {
                resolvedDesignationId = existingStaff.DesignationId;
                resolvedDesignationName = existingStaff.Designation;
            }

            var (resolvedBoardId, resolvedBoardName, _) = await ResolveBoardAsync(dto.BoardId, dto.BoardName ?? dto.Board, dto.BoardCode);
            if (!resolvedBoardId.HasValue || resolvedBoardId.Value <= 0)
            {
                resolvedBoardId = existingStaff.BoardId;
                resolvedBoardName = existingStaff.BoardName;
            }

            _mapper.Map(dto, existingStaff);
            existingStaff.StaffType = staffType;
            existingStaff.DepartmentId = resolvedDepartmentId;
            existingStaff.Department = deptName;
            existingStaff.DesignationId = resolvedDesignationId;
            existingStaff.Designation = resolvedDesignationName;
            existingStaff.BoardId = resolvedBoardId;
            existingStaff.BoardName = resolvedBoardName;
            if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
            {
                existingStaff.CampusId = dto.CampusId.Value;
            }

            // Multi-Campus / Multi-Board Assignments Update (Diff synchronization to avoid EF Core unique constraint / concurrency issues)
            var targetCampusIds = (dto.AssignedCampusIds != null && dto.AssignedCampusIds.Any())
                ? dto.AssignedCampusIds.Distinct().ToList()
                : (dto.CampusId.HasValue && dto.CampusId.Value > 0 ? new List<int> { dto.CampusId.Value } : new List<int>());

            if (targetCampusIds.Any())
            {
                var toRemove = existingStaff.StaffCampusAssignments
                    .Where(a => !targetCampusIds.Contains(a.CampusId))
                    .ToList();
                foreach (var rem in toRemove)
                {
                    existingStaff.StaffCampusAssignments.Remove(rem);
                }

                var primaryCampusId = dto.CampusId.HasValue && dto.CampusId.Value > 0 ? dto.CampusId.Value : (existingStaff.CampusId ?? targetCampusIds.First());
                var existingCampusIds = existingStaff.StaffCampusAssignments.Select(a => a.CampusId).ToHashSet();
                foreach (var cId in targetCampusIds)
                {
                    if (!existingCampusIds.Contains(cId))
                    {
                        existingStaff.StaffCampusAssignments.Add(new StaffCampusAssignment
                        {
                            CampusId = cId,
                            StaffId = existingStaff.Id,
                            IsPrimary = (cId == primaryCampusId),
                            IsActive = true,
                            Status = "Active",
                            StartDate = DateTime.UtcNow.Date
                        });
                    }
                    else
                    {
                        var assign = existingStaff.StaffCampusAssignments.FirstOrDefault(a => a.CampusId == cId);
                        if (assign != null)
                        {
                            assign.IsActive = true;
                            assign.Status = "Active";
                            assign.IsPrimary = (cId == primaryCampusId);
                        }
                    }
                }

                existingStaff.CampusId = primaryCampusId;
            }

            var targetBoardIds = (dto.AssignedBoardIds != null && dto.AssignedBoardIds.Any())
                ? dto.AssignedBoardIds.Distinct().ToList()
                : (resolvedBoardId.HasValue && resolvedBoardId.Value > 0 ? new List<int> { resolvedBoardId.Value } : new List<int>());

            if (targetBoardIds.Any())
            {
                var toRemove = existingStaff.StaffBoardAssignments
                    .Where(a => !targetBoardIds.Contains(a.BoardId))
                    .ToList();
                foreach (var rem in toRemove)
                {
                    existingStaff.StaffBoardAssignments.Remove(rem);
                }

                var existingBoardIds = existingStaff.StaffBoardAssignments.Select(a => a.BoardId).ToHashSet();
                foreach (var bId in targetBoardIds)
                {
                    if (!existingBoardIds.Contains(bId))
                    {
                        existingStaff.StaffBoardAssignments.Add(new StaffBoardAssignment { BoardId = bId, StaffId = existingStaff.Id });
                    }
                }

                if (!existingStaff.BoardId.HasValue || existingStaff.BoardId <= 0)
                    existingStaff.BoardId = targetBoardIds.First();
            }

            if (dto.JoiningDate.HasValue || dto.DateOfJoining.HasValue)
            {
                existingStaff.JoiningDate = dto.JoiningDate ?? dto.DateOfJoining!.Value;
            }

            SyncFlattenedPropertiesToJson(existingStaff, dto.BankName, dto.AccountHolder ?? dto.AccountHolderName, dto.AccountNumber, dto.Ifsc ?? dto.IfscCode, dto.Branch, dto.AccountType, dto.BasicSalary,
                dto.EmergencyName ?? dto.ContactName, dto.EmergencyRelationship ?? dto.Relationship, dto.EmergencyMobile, dto.EmergencyAlternate, dto.EmergencyAddress,
                dto.HighestQualification, dto.University, dto.Specialization, dto.PassingYear, dto.Percentage,
                dto.TotalExperience, dto.PreviousInstitution, dto.PreviousDesignation, dto.ExperienceFrom, dto.ExperienceTo,
                dto.AadhaarDocument, dto.PanDocument, dto.QualificationCertificate, dto.ExperienceCertificate, dto.Resume, dto.BankProof, dto.DrivingLicence, dto.OtherDocuments, dto.Photo, dto.Signature,
                dto.EducationJson, dto.ExperienceJson, dto.DocumentsJson, dto.BankDetailsJson, dto.EmergencyContactJson,
                dto.DepartmentSpecific, dto.Documents, dto.DepartmentSpecificJson);

            var updatePhotoRaw = dto.PhotoPath ?? dto.Photo;
            var updateLocalPhoto = await EnsurePhotoSavedLocallyAsync(existingStaff.Id, updatePhotoRaw);
            if (!string.IsNullOrWhiteSpace(updateLocalPhoto))
            {
                existingStaff.PhotoPath = updateLocalPhoto;
            }

            // Recalculate percentage
            existingStaff.ProfileCompletionPercentage = CalculateCompletionPercentage(existingStaff);

            // Driver & Transport specific details
            var isDriver = existingStaff.IsDriver || !string.IsNullOrWhiteSpace(dto.DrivingLicenseNumber)
                || (!string.IsNullOrWhiteSpace(deptName) && deptName.Contains("Transport", StringComparison.OrdinalIgnoreCase))
                || (!string.IsNullOrWhiteSpace(resolvedDesignationName) && resolvedDesignationName.Contains("Driver", StringComparison.OrdinalIgnoreCase));

            existingStaff.IsDriver = isDriver;
            if (!string.IsNullOrWhiteSpace(dto.DrivingLicenseNumber))
            {
                existingStaff.DrivingLicenseNumber = dto.DrivingLicenseNumber.Trim();
            }
            else if (dto.DepartmentSpecific != null && dto.DepartmentSpecific.TryGetValue("licenseNumber", out var licVal) && licVal != null)
            {
                existingStaff.DrivingLicenseNumber = licVal.ToString()?.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.DrivingLicenseExpiryDate) && DateTime.TryParse(dto.DrivingLicenseExpiryDate, out var expParsed))
            {
                existingStaff.DrivingLicenseExpiryDate = expParsed;
            }
            else if (dto.DepartmentSpecific != null && dto.DepartmentSpecific.TryGetValue("licenseExpiry", out var expVal) && expVal != null && DateTime.TryParse(expVal.ToString(), out var expParsed2))
            {
                existingStaff.DrivingLicenseExpiryDate = expParsed2;
            }

            // Role resolution & validation for update
            Role? updatedRole = null;
            if (dto.RoleId.HasValue && dto.RoleId.Value > 0)
            {
                updatedRole = await _userRepository.GetRoleByIdAsync(dto.RoleId.Value);
                if (updatedRole == null || !updatedRole.IsActive)
                {
                    throw new ValidationException($"The selected role with ID '{dto.RoleId.Value}' does not exist or is inactive.");
                }
                if (!string.IsNullOrWhiteSpace(dto.RoleName) &&
                    !string.Equals(updatedRole.RoleName.Trim(), dto.RoleName.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    throw new ValidationException($"Submitted role name '{dto.RoleName}' does not match role ID '{dto.RoleId.Value}'.");
                }
            }
            else if (!string.IsNullOrWhiteSpace(dto.RoleName))
            {
                updatedRole = await _userRepository.GetRoleByNameAsync(dto.RoleName.Trim());
                if (updatedRole == null || !updatedRole.IsActive)
                {
                    throw new ValidationException($"The selected role '{dto.RoleName}' does not exist or is inactive.");
                }
            }

            if (updatedRole != null)
            {
                var nonStaffRoles = new[] { "Super Admin", "Admin", "Student", "Parent" };
                if (nonStaffRoles.Any(r => string.Equals(r, updatedRole.RoleName, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new ValidationException($"Role '{updatedRole.RoleName}' (RoleId: {updatedRole.RoleId}) cannot be assigned to a Staff account.");
                }
            }

            // Transactional update: Staff domain + Users sync
            var updateStrategy = _context.Database.CreateExecutionStrategy();
            await updateStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var dbTransaction = transaction.GetDbTransaction();
                var connection = _context.Database.GetDbConnection();

                existingStaff.UpdatedAt = DateTime.UtcNow;
                await _staffRepository.UpdateAsync(existingStaff);

                if (emailChanged)
                {
                    await _userRepository.UpdateEmailByStaffIdAsync(id, normalizedNewEmail, connection, dbTransaction);
                }

                if (!string.IsNullOrWhiteSpace(dto.Status))
                {
                    bool newIsActive = !string.Equals(dto.Status.Trim(), "Inactive", StringComparison.OrdinalIgnoreCase);
                    await _userRepository.UpdateStatusByStaffIdAsync(id, newIsActive, connection, dbTransaction);
                }

                if (updatedRole != null)
                {
                    await _userRepository.UpdateRoleByStaffIdAsync(id, updatedRole.RoleId, connection, dbTransaction);
                }

                if (!string.IsNullOrWhiteSpace(resolvedDesignationName))
                {
                    try
                    {
                        await connection.ExecuteAsync(
                            "UPDATE Users SET Designation = @Designation WHERE StaffId = @StaffId",
                            new { Designation = resolvedDesignationName, StaffId = id },
                            dbTransaction);
                    }
                    catch { }
                }

                var subNames = dto.AllocatedSubjects ?? dto.Subjects;
                if (subNames != null)
                {
                    var deptDict = DeserializeObject<Dictionary<string, object>>(existingStaff.DepartmentSpecificJson) ?? new Dictionary<string, object>();
                    deptDict["allocatedSubjects"] = subNames;
                    deptDict["subjects"] = subNames;
                    existingStaff.DepartmentSpecificJson = JsonSerializer.Serialize(deptDict);
                    await _context.SaveChangesAsync();
                    await SyncStaffSubjectAllocationsAsync(existingStaff.Id, subNames);
                }

                await transaction.CommitAsync();
            });

            var refreshedStaff = await _staffRepository.GetByIdAsync(existingStaff.Id) ?? existingStaff;
            var responseDto = _mapper.Map<StaffResponseDto>(refreshedStaff);
            if (updatedRole != null)
            {
                responseDto.RoleId = updatedRole.RoleId;
                responseDto.RoleName = updatedRole.RoleName;
            }
            else
            {
                var linkedUser = await _userRepository.GetByStaffIdAsync(id);
                if (linkedUser != null && linkedUser.RoleId > 0)
                {
                    responseDto.RoleId = linkedUser.RoleId;
                    responseDto.RoleName = linkedUser.Role?.RoleName ?? (await _userRepository.GetRoleByIdAsync(linkedUser.RoleId))?.RoleName;
                }
            }
            return responseDto;
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
                await _staffRepository.SoftDeleteAsync(staff);

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

            var validityHours = dto.ValidityDays > 0 ? dto.ValidityDays * 24 : 72;
            var token = Guid.NewGuid().ToString("N");
            var sentAt = DateTime.UtcNow;
            var expiresAt = sentAt.AddHours(validityHours);
            var validityDays = (int)Math.Ceiling(validityHours / 24.0);

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

            var photoDocItem = dto.Documents?.FirstOrDefault(d => string.Equals(d.type, "Photo", StringComparison.OrdinalIgnoreCase) || string.Equals(d.name, "Photo", StringComparison.OrdinalIgnoreCase));
            var draftPhotoRaw = photoDocItem?.url;
            var draftLocalPhoto = await EnsurePhotoSavedLocallyAsync(staff.Id, draftPhotoRaw);
            if (!string.IsNullOrWhiteSpace(draftLocalPhoto))
            {
                staff.PhotoPath = draftLocalPhoto;
            }

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

            var percentage = CalculateCompletionPercentage(staff);
            if (percentage < 50)
            {
                throw new ValidationException($"Profile completion must be at least 50% to submit. Current completion is {percentage}%.");
            }

            var workflowConfig = await GetOfferLetterWorkflowConfigAsync();
            bool requiresAdminApproval = string.Equals(workflowConfig.WorkflowPreference, "AdminApproval", StringComparison.OrdinalIgnoreCase) || !workflowConfig.AutoSendOnSubmission;

            if (requiresAdminApproval)
            {
                // Workflow 2: Admin Approval Required Before Offer Letter Generation
                staff.ProfileStatus = "PendingApproval";
                if (!staff.SubmittedAt.HasValue)
                {
                    staff.SubmittedAt = DateTime.UtcNow;
                }
                staff.ProfileCompletionPercentage = Math.Max(percentage, staff.ProfileCompletionPercentage);
                staff.ProfileLinkToken = null; // Invalidate single-use token upon submission
                await _staffRepository.UpdateAsync(staff);

                // Staff-to-Admin Notification using existing notification infrastructure
                try
                {
                    string staffName = $"{staff.FirstName} {staff.LastName}".Trim();
                    string notifTitle = "Offer Letter Approval";
                    string notifMsg = $"{staffName} ({staff.EmployeeId}) has submitted onboarding details and is waiting for offer letter approval.";
                    string deepLink = $"/dashboard/settings/offer-letter-configuration?tab=automation&staffId={staff.Id}";

                    // Dispatch to Admin and Principal roles
                    await _notificationService.SendToRoleAsync("Admin", staff.CampusId, notifTitle, notifMsg, "OfferLetter", staff.Id, deepLink);
                    await _notificationService.SendToRoleAsync("Principal", staff.CampusId, notifTitle, notifMsg, "OfferLetter", staff.Id, deepLink);
                    _logger.LogInformation("Admin notification created for pending offer letter approval: staff #{StaffId}", staff.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to dispatch Admin notification for staff onboarding #{StaffId}", staff.Id);
                }

                try
                {
                    await _auditLogger.LogAsync("SubmitProfile", "StaffOnboarding", staff.EmployeeId ?? staff.Id.ToString(), "Info", "Success", "Staff submitted onboarding details. Status set to Pending Admin Approval.");
                }
                catch { }

                return MapToFullProfileDto(staff);
            }

            // Workflow 1: Automatic Offer Letter Generation
            bool alreadyCompleted = string.Equals(staff.ProfileStatus, "Completed", StringComparison.OrdinalIgnoreCase) && staff.SubmittedAt.HasValue;

            staff.ProfileStatus = "Completed";
            if (!staff.SubmittedAt.HasValue)
            {
                staff.SubmittedAt = DateTime.UtcNow;
            }
            if (!staff.ApprovedAt.HasValue)
            {
                staff.ApprovedAt = DateTime.UtcNow;
            }
            staff.ProfileCompletionPercentage = Math.Max(percentage, staff.ProfileCompletionPercentage);
            staff.ProfileLinkToken = null; // Invalidate single-use token upon completion
            await _staffRepository.UpdateAsync(staff);
            await EnsureStaffPayrollStructureProvisionedAsync(staff);

            // Generate Offer Letter PDF and dispatch via Email (idempotent: skip duplicate generation if already completed)
            if (!alreadyCompleted)
            {
                try
                {
                    var (pdfBytes, contentType, fileName) = await GenerateOfferLetterPdfAsync(staff.Id);
                    if (!string.IsNullOrWhiteSpace(staff.Email))
                    {
                        string staffFullName = $"{staff.FirstName} {staff.LastName}".Trim();
                        string subject = workflowConfig.EmailSubject ?? $"Official Appointment & Offer Letter - {staff.EmployeeId}";
                        subject = subject.Replace("{{StaffName}}", staffFullName).Replace("{{EmployeeId}}", staff.EmployeeId ?? "");

                        string body = workflowConfig.EmailBody ?? $@"
                            <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                                <h2>Welcome to Pirnav Educational Society</h2>
                                <p>Dear {staffFullName},</p>
                                <p>Congratulations! Your faculty profile onboarding has been submitted and verified.</p>
                                <p>Please find attached your official <strong>Letter of Appointment & Offer Letter</strong>.</p>
                                <p>Your full access to the faculty portal and academic management modules is now active.</p>
                                <p>Best regards,<br/><strong>Central HR Administration</strong><br/>Pirnav Educational Society</p>
                            </div>";
                        body = body.Replace("{{StaffName}}", staffFullName).Replace("{{EmployeeId}}", staff.EmployeeId ?? "");

                        await _emailService.SendEmailWithAttachmentAsync(staff.Email, subject, body, pdfBytes, fileName, contentType);

                        if (!string.IsNullOrWhiteSpace(workflowConfig.CcHrEmail) && workflowConfig.CcHrEmail != staff.Email)
                        {
                            try
                            {
                                await _emailService.SendEmailWithAttachmentAsync(workflowConfig.CcHrEmail, $"[HR Audit Copy] {subject}", body, pdfBytes, fileName, contentType);
                            }
                            catch { }
                        }

                        _logger.LogInformation("Offer Letter email dispatched to {Email} for staff #{StaffId}", staff.Email, staff.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Notice: Offer Letter email delivery notice for {Email}: {Msg}", staff.Email, ex.Message);
                }

                // Staff Portal Notification via existing notification infrastructure
                try
                {
                    await _notificationService.SendToStaffAsync(staff.Id, "Offer Letter Generated", "Your official offer letter has been generated and sent to your registered email.", "OfferLetter", staff.Id, "/faculty-dashboard/profile");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to deliver offer letter generated notification to staff #{StaffId}", staff.Id);
                }
            }

            try
            {
                await _auditLogger.LogAsync("SubmitProfile", "StaffOnboarding", staff.EmployeeId ?? staff.Id.ToString(), "Info", "Success", "Staff submitted onboarding details. Auto-generated and dispatched Offer Letter.");
            }
            catch { }

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
                staff.ProfileLinkToken = null; // Revoke onboarding token upon approval
                await _staffRepository.UpdateAsync(staff);
                await EnsureStaffPayrollStructureProvisionedAsync(staff);

                // Dispatch Offer Letter PDF via Email
                try
                {
                    var (pdfBytes, contentType, fileName) = await GenerateOfferLetterPdfAsync(staff.Id);
                    if (!string.IsNullOrWhiteSpace(staff.Email))
                    {
                        string subject = $"Official Appointment & Offer Letter - {staff.EmployeeId}";
                        string body = $@"
                            <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                                <h2>Welcome to Pirnav Educational Society</h2>
                                <p>Dear {staff.FirstName} {staff.LastName},</p>
                                <p>Congratulations! Your faculty profile has been verified and approved by Human Resources.</p>
                                <p>Please find attached your official <strong>Letter of Appointment & Offer Letter</strong>.</p>
                                <p>Your full access to the faculty portal and academic management modules is now active.</p>
                                <p>Best regards,<br/><strong>Central HR Administration</strong><br/>Pirnav Educational Society</p>
                            </div>";

                        await _emailService.SendEmailWithAttachmentAsync(staff.Email, subject, body, pdfBytes, fileName, contentType);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to generate or email offer letter for approved staff ID {StaffId}", staff.Id);
                }
            }
            else if (string.Equals(dto.Action, "RequestCorrection", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "NeedsCorrection";
                staff.CorrectionRequestedAt = DateTime.UtcNow;
                staff.CorrectionNotes = dto.CorrectionNotes?.Trim();
                await _staffRepository.UpdateAsync(staff);
            }
            else
            {
                throw new ValidationException($"Invalid review action '{dto.Action}'. Supported actions: 'Approve', 'RequestCorrection'.");
            }

            return _mapper.Map<StaffResponseDto>(staff);
        }

        private async Task<string?> EnsurePhotoSavedLocallyAsync(int staffId, string? photoString)
        {
            if (string.IsNullOrWhiteSpace(photoString)) return null;

            var trimmed = photoString.Trim();
            if (!trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) && !trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) && !trimmed.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            {
                // If it's a raw base64 string without data prefix
                if (!trimmed.Contains("/") && !trimmed.Contains("\\") && trimmed.Length > 200)
                {
                    trimmed = $"data:image/jpeg;base64,{trimmed}";
                }
            }

            if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var match = Regex.Match(trimmed, @"^data:image/(?<type>jpeg|jpg|png|webp);base64,(?<data>.+)$", RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        var type = match.Groups["type"].Value.ToLowerInvariant();
                        var ext = type == "jpeg" || type == "jpg" ? ".jpg" : $".{type}";
                        var base64Data = match.Groups["data"].Value;
                        var bytes = Convert.FromBase64String(base64Data);

                        var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                        var uploadDir = Path.Combine(rootPath, "uploads", "staff-photos");
                        if (!Directory.Exists(uploadDir))
                        {
                            Directory.CreateDirectory(uploadDir);
                        }

                        var fileName = $"photo_staff_{staffId}_{Guid.NewGuid():N}{ext}";
                        var physicalPath = Path.Combine(uploadDir, fileName);
                        await File.WriteAllBytesAsync(physicalPath, bytes);

                        var relativeUrl = $"/uploads/staff-photos/{fileName}";
                        return relativeUrl;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to decode and save base64 photo for staff #{StaffId}", staffId);
                }
            }

            if (trimmed.StartsWith("/") || trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            return trimmed.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) ? $"/{trimmed}" : trimmed;
        }

        private static void ValidateFileSignature(IFormFile file, string[] allowedExtensions)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                throw new ValidationException($"Invalid file type '{ext}'.");

            using var stream = file.OpenReadStream();
            var header = new byte[8];
            var bytesRead = stream.Read(header, 0, header.Length);
            if (bytesRead < 4)
                throw new ValidationException("Corrupted or empty file.");

            bool isValid = ext switch
            {
                ".pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
                ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
                ".webp" => header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46,
                _ => false
            };

            if (!isValid)
                throw new ValidationException($"File content does not match the expected signature for '{ext}'.");
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

            ValidateFileSignature(file, AllowedDocExtensions);

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

            var docList = DeserializeList<StaffDocumentPayloadItem>(staff.DocumentsJson);
            // Remove existing item of same documentType if present
            docList.RemoveAll(d => string.Equals(d.type, documentType, StringComparison.OrdinalIgnoreCase));

            docList.Add(new StaffDocumentPayloadItem
            {
                id = System.Guid.NewGuid().ToString(),
                type = documentType,
                name = file.FileName,
                size = (file.Length / 1024.0 / 1024.0).ToString("0.00") + " MB",
                url = relativePath,
                format = ext.TrimStart('.').ToUpper()
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

            var docList = DeserializeList<StaffDocumentPayloadItem>(staff.DocumentsJson);
            var item = docList.FirstOrDefault(d => string.Equals(d.type, documentType, StringComparison.OrdinalIgnoreCase));
            if (item != null)
            {
                // Attempt to delete physical file
                try
                {
                    var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var physicalPath = Path.Combine(webRoot, item.url.TrimStart('/'));
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

        public async Task<StaffImportResultDto> ImportStaffFromExcelAsync(IFormFile file, string? defaultStaffType = null, int? campusId = null)
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
            string? lastGeneratedTeachingEmpId = null;
            string? lastGeneratedNonTeachingEmpId = null;

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

                if (string.IsNullOrWhiteSpace(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Mobile number is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Auto-generate employee ID if empty or validate uniqueness
                if (string.IsNullOrWhiteSpace(empId))
                {
                    var isTeaching = !string.Equals(sType?.Replace("-", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
                    var prefix = isTeaching ? "PCTCH" : "PCNT";
                    var lastGen = isTeaching ? lastGeneratedTeachingEmpId : lastGeneratedNonTeachingEmpId;

                    if (string.IsNullOrWhiteSpace(lastGen))
                    {
                        lastGen = await GetNextEmployeeIdAsync(sType, campusId ?? 1);
                    }
                    else
                    {
                        var match = Regex.Match(lastGen, @"\d+");
                        if (match.Success && int.TryParse(match.Value, out int seqNum))
                        {
                            var numLen = match.Value.Length;
                            lastGen = $"{prefix}{(seqNum + 1).ToString($"D{numLen}")}";
                        }
                        else
                        {
                            lastGen = await GetNextEmployeeIdAsync(sType, campusId ?? 1);
                        }
                    }

                    while (toAdd.Any(x => string.Equals(x.EmployeeId, lastGen, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmployeeIdUniqueAsync(lastGen))
                    {
                        var match = Regex.Match(lastGen, @"\d+");
                        if (match.Success && int.TryParse(match.Value, out int seqNum))
                        {
                            var numLen = match.Value.Length;
                            lastGen = $"{prefix}{(seqNum + 1).ToString($"D{numLen}")}";
                        }
                        else
                        {
                            lastGen = $"{prefix}{Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant()}";
                        }
                    }

                    empId = lastGen;
                    if (isTeaching) lastGeneratedTeachingEmpId = empId;
                    else lastGeneratedNonTeachingEmpId = empId;
                }
                else if (toAdd.Any(x => string.Equals(x.EmployeeId, empId, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmployeeIdUniqueAsync(empId))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, EmployeeId = empId, StaffName = fName, ErrorMessage = $"Employee ID '{empId}' already exists." });
                    result.FailedRowsCount++;
                    continue;
                }

                // Email validation & Non-Teaching fallback handling
                if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                {
                    if (string.Equals(sType, "Non-Teaching", StringComparison.OrdinalIgnoreCase))
                    {
                        var cleanEmp = Regex.Replace((empId ?? fName).ToLowerInvariant(), @"[^a-z0-9]", "");
                        if (string.IsNullOrWhiteSpace(cleanEmp)) cleanEmp = "staff";
                        email = $"{cleanEmp}@college.local";
                        while (toAdd.Any(x => x.Email.Equals(email, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmailUniqueAsync(email))
                        {
                            email = $"{cleanEmp}_{Guid.NewGuid().ToString("N").Substring(0, 4)}@college.local";
                        }
                    }
                    else
                    {
                        result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = "Valid Email address is required." });
                        result.FailedRowsCount++;
                        continue;
                    }
                }
                else
                {
                    if (toAdd.Any(x => x.Email.Equals(email, StringComparison.OrdinalIgnoreCase)) || !await _staffRepository.IsEmailUniqueAsync(email))
                    {
                        result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Email '{email}' is already registered." });
                        result.FailedRowsCount++;
                        continue;
                    }
                }

                if (toAdd.Any(x => x.Mobile == mobile) || !await _staffRepository.IsMobileUniqueAsync(mobile))
                {
                    result.Errors.Add(new StaffImportRowError { RowNumber = rowNumber, StaffName = fName, ErrorMessage = $"Mobile '{mobile}' is already registered." });
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
                    CampusId = campusId ?? 1,
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
                if (campusId.HasValue && campusId.Value > 0)
                {
                    staff.StaffCampusAssignments.Add(new StaffCampusAssignment { CampusId = campusId.Value });
                }
                if (boardId.HasValue && boardId.Value > 0)
                {
                    staff.StaffBoardAssignments.Add(new StaffBoardAssignment { BoardId = boardId.Value });
                }
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
            var isNonTeaching = string.Equals(staffType?.Trim(), "Non-Teaching", StringComparison.OrdinalIgnoreCase);
            var sheetTitle = isNonTeaching ? "Non-Teaching Template" : "Teaching Template";
            var worksheet = workbook.Worksheets.Add(sheetTitle);

            var headers = isNonTeaching
                ? new[]
                {
                    "Board Name", "Employee ID", "First Name", "Middle Name", "Last Name",
                    "Date of Birth", "Gender", "Mobile", "Email", "Department",
                    "Designation", "Date of Joining", "Employment Type", "Status"
                }
                : new[]
                {
                    "Board Name", "Employee ID", "First Name", "Middle Name", "Last Name",
                    "Date of Birth", "Gender", "Mobile", "Email", "Department",
                    "Designation", "Subject Allocation", "Date of Joining", "Employment Type", "Status"
                };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2E7D32");
                cell.Style.Font.FontColor = XLColor.White;
            }

            // Zero prefilled data rows: template contains column headers only
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var bytes = stream.ToArray();
            var filename = $"{sheetTitle.Replace(" ", "_")}.xlsx";
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

                        // Role & Department Specific Details (Non-Teaching)
                        if (profile.DepartmentSpecific != null && profile.DepartmentSpecific.Count > 0)
                        {
                            col.Item().PaddingTop(10);
                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                            {
                                c.Item().Text($"{profile.Department} — Role Specific Information").Bold().FontSize(11).FontColor(Colors.Green.Darken3);
                                c.Item().PaddingTop(3).Column(detailCol =>
                                {
                                    var entries = profile.DepartmentSpecific.ToList();
                                    for (int i = 0; i < entries.Count; i += 2)
                                    {
                                        var item1 = entries[i];
                                        var val1 = item1.Value?.ToString() ?? "—";
                                        var item2 = i + 1 < entries.Count ? entries[i + 1] : default;

                                        detailCol.Item().PaddingBottom(2).Row(r =>
                                        {
                                            r.RelativeItem().Text($"{item1.Key}: {val1}");
                                            if (item2.Key != null)
                                            {
                                                var val2 = item2.Value?.ToString() ?? "—";
                                                r.RelativeItem().Text($"{item2.Key}: {val2}");
                                            }
                                            else
                                            {
                                                r.RelativeItem().Text("");
                                            }
                                        });
                                    }
                                });
                            });
                        }
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

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateOfferLetterPdfAsync(int id)
        {
            var profile = await GetStaffProfileFullAsync(id);
            var payroll = await GetStaffPayrollDetailsAsync(id);

            var numRes = await _numberSeriesService.GenerateNextNumberAsync("OFFER_LETTER_NO", campusId: profile.CampusId);
            string offerNo = numRes?.GeneratedNumber ?? $"PC-OL/{DateTime.UtcNow.Year}/{profile.EmployeeId}";

            string staffFullName = string.IsNullOrWhiteSpace(profile.MiddleName)
                ? $"{profile.FirstName} {profile.LastName}".Trim()
                : $"{profile.FirstName} {profile.MiddleName} {profile.LastName}".Trim();

            // Determine role category and specific target template
            bool isPrincipal = string.Equals(profile.RoleName, "Principal", StringComparison.OrdinalIgnoreCase)
                || profile.RoleId == 2
                || profile.RoleId == 15
                || (profile.Designation != null && profile.Designation.Contains("Principal", StringComparison.OrdinalIgnoreCase));

            bool isHOD = (profile.Designation != null && (profile.Designation.Contains("HOD", StringComparison.OrdinalIgnoreCase) || profile.Designation.Contains("Head of Department", StringComparison.OrdinalIgnoreCase)));

            bool isNonTeaching = string.Equals(profile.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase)
                || string.Equals(profile.RoleName, "Non-Teaching", StringComparison.OrdinalIgnoreCase);

            string targetTemplateCode = isPrincipal ? "OFFER_LETTER_PRINCIPAL"
                : isHOD ? "OFFER_LETTER_HOD"
                : isNonTeaching ? "OFFER_LETTER_NON_TEACHING"
                : "OFFER_LETTER_STANDARD";

            string roleCategory = isPrincipal ? "Principal"
                : isHOD ? "HOD / Senior Faculty"
                : isNonTeaching ? "Non-Teaching Staff"
                : "Teaching Staff";

            // Intermediate College defaults tailored to role
            string documentHeading = isPrincipal
                ? "EXECUTIVE APPOINTMENT & PRINCIPAL COMMISSION – INTERMEDIATE COLLEGE"
                : isHOD
                ? "APPOINTMENT ORDER – HEAD OF DEPARTMENT & SENIOR LECTURER"
                : isNonTeaching
                ? "OFFICIAL APPOINTMENT ORDER – CAMPUS ADMINISTRATIVE & SUPPORT STAFF"
                : "OFFICIAL APPOINTMENT ORDER – JUNIOR COLLEGE FACULTY";

            string departmentOffice = isPrincipal
                ? "OFFICE OF THE SECRETARY & GOVERNING BODY – PIRNAV EDUCATIONAL SOCIETY"
                : isNonTeaching
                ? "OFFICE OF HUMAN RESOURCES & CAMPUS ADMINISTRATION"
                : "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES";

            string reportingAuthority = isPrincipal
                ? "Board of Governors & Managing Secretary"
                : isNonTeaching
                ? "Campus Principal / Administrative Officer"
                : "Campus Principal";

            string signatoryName = isPrincipal ? "N. Venkateswara Rao" : (isNonTeaching ? "P. R. Mohan" : "Dr. K. V. Ramanamurthy");
            string signatoryRole = isPrincipal ? "Secretary & Managing Trustee" : (isNonTeaching ? "Registrar / Administrative Officer" : "Director of Human Resources");
            string boardName = !string.IsNullOrWhiteSpace(profile.BoardName) ? profile.BoardName : "Board of Intermediate Education, Andhra Pradesh (BIEAP)";
            string primaryCampus = !string.IsNullOrWhiteSpace(profile.CampusName) ? profile.CampusName : "Main Campus (HQ)";
            string institutionName = _configuration["InstitutionSettings:InstitutionName"] ?? "PIRNAV EDUCATIONAL SOCIETY";

            string openingStatement = isPrincipal
                ? $"The Board of Governors is pleased to appoint you as Campus Principal & Executive Head of Institution for {primaryCampus}, with dual institutional purview over Intermediate academic instruction (BIEAP / TGBIE curriculum) and campus administrative operations."
                : isHOD
                ? $"We are pleased to appoint you as Head of Department (HOD) & Senior Lecturer in {profile.Department} at our {primaryCampus} campus under the Board of Intermediate Education curriculum."
                : isNonTeaching
                ? $"We are pleased to offer you appointment as {profile.Designation} in the {profile.Department} division at our {primaryCampus} campus."
                : $"We have pleasure in offering you an official appointment as {profile.Designation} in the Department of {profile.Department} at our {primaryCampus} campus under the Board of Intermediate Education (BIEAP/TGBIE) curriculum.";

            string terms = isPrincipal
                ? "1. Institutional Governance: The Principal exercises dual oversight over Teaching Faculty (syllabus pacing, lesson plans, lab practicals) and Non-Teaching Staff (campus accounting, fee collections, student registers, timings, discipline).\n2. Board Compliance & Academic Results: Directly responsible for statutory Board of Intermediate Education affiliations, IPE board examination center management, student pass percentages, and integrated EAMCET / JEE / NEET competitive ranks.\n3. Administration & Fee Governance: Accountable for campus fee structures, student admissions, fee reconciliation, campus infrastructure security, and Loss of Pay (LOP) policy enforcement.\n4. Notice Period: Service notice period for Principal leadership is six (6) calendar months or equivalent salary in lieu thereof to maintain institutional leadership continuity.\n5. Multi-Campus Oversight: The Governing Body may depute cross-campus administrative or academic inspection duties across affiliated junior colleges based on operational exigencies."
                : isHOD
                ? "1. Departmental Leadership: Lead teaching faculty in the department, supervise theory lecture coverage, laboratory practical logbooks, and enforce BIEAP/TGBIE curriculum benchmarks.\n2. Academic Quality & Practical Examinations: Oversee science laboratories, ensure safety protocols, coordinate internal college examinations, and liaise with the Principal for IPE board examinations.\n3. Mentorship & Valuation: Mentor Junior Lecturers, review student progress in weekly tests, and coordinate IPE external spot valuation assignments.\n4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent salary in lieu thereof."
                : isNonTeaching
                ? "1. Campus Duties: Carry out designated administrative, accounting, student registry, laboratory assistance, or campus maintenance tasks under the direction of the Principal and Administrative Officer.\n2. Diligence & Timings: Strictly adhere to campus biometric timings, fee counter protocols, admission record safety, and institutional asset care. Unexcused absence will incur Loss of Pay (LOP) deductions.\n3. Service Notice Period: Service notice period is strictly one (1) calendar month or equivalent gross salary in lieu thereof.\n4. Code of Conduct: Abide by institutional service bylaws and maintain absolute confidentiality of student records and accounts."
                : "1. Teaching Obligations: The Lecturer shall conduct regular theory periods, laboratory practicals, and special study hours in accordance with the Board of Intermediate Education (BIEAP/TGBIE) curriculum and annual academic calendar.\n2. Student Academic Progress: Responsible for student syllabus completion, weekly unit test valuations, and intensive coaching for Intermediate Public Examinations (IPE) and integrated competitive entrance examinations (EAMCET / JEE / NEET).\n3. Examination Duties: Mandatory participation in BIEAP/TGBIE practical examination supervision, internal college assessments, and external spot valuation when deputed by the Principal.\n4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent gross salary in lieu thereof. Mid-academic-session resignations are strictly barred to safeguard student syllabus continuity.\n5. Campus Postings: The management reserves the right to depute or transfer teaching assignments across affiliated junior college campuses based on institutional requirements without altering service seniority.";

            // Check if Admin configured a custom template in Database for this role
            var customTemplate = await _context.Templates
                .Where(t => t.TemplateCode == targetTemplateCode && t.IsActive)
                .OrderByDescending(t => t.UpdatedAt)
                .FirstOrDefaultAsync();

            if (customTemplate == null)
            {
                // Fallback to general offer letter template if exact role template is not in DB
                customTemplate = await _context.Templates
                    .Where(t => (t.Category == "Offer Letter" || t.Category == "OfferLetter" || t.TemplateCode.StartsWith("OFFER_LETTER")) && t.IsActive)
                    .OrderByDescending(t => t.UpdatedAt)
                    .FirstOrDefaultAsync();
            }

            if (customTemplate != null && !string.IsNullOrWhiteSpace(customTemplate.ContentBody))
            {
                try
                {
                    using var docJson = System.Text.Json.JsonDocument.Parse(customTemplate.ContentBody);
                    var root = docJson.RootElement;
                    if (root.TryGetProperty("documentHeading", out var dh) && !string.IsNullOrWhiteSpace(dh.GetString()))
                        documentHeading = dh.GetString()!;
                    if (root.TryGetProperty("departmentOffice", out var dof) && !string.IsNullOrWhiteSpace(dof.GetString()))
                        departmentOffice = dof.GetString()!;
                    if (root.TryGetProperty("reportingAuthority", out var ra) && !string.IsNullOrWhiteSpace(ra.GetString()))
                        reportingAuthority = ra.GetString()!;
                    if (root.TryGetProperty("authorizedSignatoryName", out var asn) && !string.IsNullOrWhiteSpace(asn.GetString()))
                        signatoryName = asn.GetString()!;
                    if (root.TryGetProperty("authorizedSignatoryRole", out var asr) && !string.IsNullOrWhiteSpace(asr.GetString()))
                        signatoryRole = asr.GetString()!;
                    if (root.TryGetProperty("institutionName", out var inProp) && !string.IsNullOrWhiteSpace(inProp.GetString()))
                        institutionName = inProp.GetString()!;
                    if (root.TryGetProperty("openingStatement", out var osProp) && !string.IsNullOrWhiteSpace(osProp.GetString()))
                        openingStatement = osProp.GetString()!;
                    if (root.TryGetProperty("termsAndConditions", out var tcProp) && !string.IsNullOrWhiteSpace(tcProp.GetString()))
                        terms = tcProp.GetString()!;
                }
                catch
                {
                    if (!customTemplate.ContentBody.TrimStart().StartsWith("<") && !customTemplate.ContentBody.TrimStart().StartsWith("{"))
                        terms = customTemplate.ContentBody;
                }
            }

            // Replace dynamic tokens in opening statement and terms
            string ResolveTokens(string input)
            {
                if (string.IsNullOrWhiteSpace(input)) return string.Empty;
                return input
                    .Replace("{{StaffName}}", staffFullName)
                    .Replace("{{EmployeeId}}", profile.EmployeeId ?? string.Empty)
                    .Replace("{{Designation}}", profile.Designation ?? string.Empty)
                    .Replace("{{Department}}", profile.Department ?? string.Empty)
                    .Replace("{{PrimaryCampus}}", primaryCampus)
                    .Replace("{{BoardName}}", boardName)
                    .Replace("{{InstitutionName}}", institutionName)
                    .Replace("{{ReportingAuthority}}", reportingAuthority)
                    .Replace("{{BasicSalary}}", payroll?.BasicSalary.HasValue == true ? $"₹{payroll.BasicSalary.Value:N0}" : "₹45,000")
                    .Replace("{{GrossSalary}}", payroll?.GrossSalary.HasValue == true ? $"₹{payroll.GrossSalary.Value:N0}" : "₹68,500")
                    .Replace("{{AnnualCTC}}", payroll?.GrossSalary.HasValue == true ? $"₹{(payroll.GrossSalary.Value * 12):N0}" : "₹8,22,000")
                    .Replace("{{DateOfJoining}}", (profile.JoiningDate > DateTime.MinValue ? profile.JoiningDate : DateTime.UtcNow.Date).ToString("dd MMM yyyy"));
            }

            openingStatement = ResolveTokens(openingStatement);
            terms = ResolveTokens(terms);

            var model = new CollegeManagement.API.Services.Exports.StaffOfferLetterModel
            {
                OfferLetterNumber = offerNo,
                StaffName = staffFullName,
                EmployeeId = profile.EmployeeId,
                Designation = profile.Designation,
                Department = profile.Department,
                PrimaryCampus = primaryCampus,
                InstitutionName = institutionName,
                DocumentHeading = documentHeading,
                DepartmentOffice = departmentOffice,
                OpeningStatement = openingStatement,
                BoardName = boardName,
                RoleCategory = roleCategory,
                DateOfJoining = profile.JoiningDate > DateTime.MinValue ? profile.JoiningDate : DateTime.UtcNow.Date,
                BasicSalary = payroll?.BasicSalary,
                GrossSalary = payroll?.GrossSalary,
                ReportingAuthority = reportingAuthority,
                AuthorizedSignatoryName = signatoryName,
                AuthorizedSignatoryRole = signatoryRole,
                TermsAndConditions = terms
            };

            var doc = new CollegeManagement.API.Services.Exports.StaffOfferLetterDocument(model);
            byte[] bytes = doc.GeneratePdf();
            return (bytes, "application/pdf", $"Offer_Letter_{profile.EmployeeId}.pdf");
        }

        public async Task<StaffExperienceSummaryDto> GetStaffExperienceSummaryAsync(int id)
        {
            var expService = new StaffExperienceService(_context);
            return await expService.CalculateExperienceAsync(id);
        }

        public async Task<StaffResponseDto> UploadPhotoAsync(UploadStaffPhotoDto dto)
        {
            if (dto == null)
                throw new ValidationException("Invalid photo upload request.");

            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {dto.StaffId} not found.");

            var file = dto.GetFile();
            if (file == null || file.Length == 0)
                throw new ValidationException("Please choose a photo file.");

            if (file.Length > MaxPhotoFileSizeBytes)
                throw new ValidationException("Photo file size cannot exceed 5 MB.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(ext) || !AllowedPhotoExtensions.Contains(ext))
                throw new ValidationException("Only JPEG, PNG, and WEBP photos are accepted.");

            ValidateFileSignature(file, AllowedPhotoExtensions);

            var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadDir = Path.Combine(rootPath, "uploads", "staff-photos");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            // Cleanup previous photo file if it exists and belongs to uploads/staff-photos
            if (!string.IsNullOrWhiteSpace(staff.PhotoPath))
            {
                try
                {
                    var oldRel = staff.PhotoPath.TrimStart('/').Replace('\\', '/');
                    if (oldRel.StartsWith("uploads/staff-photos/", StringComparison.OrdinalIgnoreCase))
                    {
                        var oldPhysicalPath = Path.Combine(rootPath, oldRel.Replace('/', Path.DirectorySeparatorChar));
                        if (File.Exists(oldPhysicalPath))
                        {
                            File.Delete(oldPhysicalPath);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete previous staff photo file for staff {StaffId}", staff.Id);
                }
            }

            var fileName = $"photo_staff_{staff.Id}_{Guid.NewGuid():N}{ext}";
            var physicalPath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var newPhotoPath = $"/uploads/staff-photos/{fileName}";
            await _staffRepository.UpdatePhotoPathAsync(staff.Id, newPhotoPath);
            
            staff.PhotoPath = newPhotoPath;
            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id)
        {
            var photoPath = await _staffRepository.GetPhotoPathAsync(id);
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var contentRoot = Directory.GetCurrentDirectory();

            if (!string.IsNullOrWhiteSpace(photoPath))
            {
                var cleanRel = photoPath.TrimStart('/').Replace('\\', '/');
                var pathInWebRoot = Path.Combine(webRoot, cleanRel.Replace('/', Path.DirectorySeparatorChar));
                var pathInContentRoot = Path.Combine(contentRoot, cleanRel.Replace('/', Path.DirectorySeparatorChar));

                string? foundPath = null;
                if (File.Exists(pathInWebRoot))
                {
                    foundPath = pathInWebRoot;
                }
                else if (File.Exists(pathInContentRoot))
                {
                    foundPath = pathInContentRoot;
                }

                if (foundPath != null)
                {
                    var ext = Path.GetExtension(foundPath).ToLowerInvariant();
                    var contentType = ext switch
                    {
                        ".png" => "image/png",
                        ".webp" => "image/webp",
                        _ => "image/jpeg"
                    };
                    return (foundPath, contentType);
                }
            }

            // Return default avatar placeholder
            var defaultAvatar = Path.Combine(webRoot, "images", "default-avatar.png");
            if (File.Exists(defaultAvatar))
            {
                return (defaultAvatar, "image/png");
            }

            var fallbackAvatar = Path.Combine(contentRoot, "wwwroot", "images", "default-avatar.png");
            if (File.Exists(fallbackAvatar))
            {
                return (fallbackAvatar, "image/png");
            }

            throw new NotFoundException("No photo available.");
        }

        public async Task<StaffSubjectAllocationResponseDto> AssignSubjectAsync(AssignStaffSubjectDto dto)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
            if (staff == null) throw new NotFoundException($"Staff with ID {dto.StaffId} not found.");

            if (dto.SubjectId <= 0 && !string.IsNullOrWhiteSpace(dto.SubjectName))
            {
                var allSubjects = await _subjectRepository.GetAllAsync();
                var cleanName = dto.SubjectName.Trim();
                var matched = allSubjects.FirstOrDefault(s =>
                    string.Equals(s.SubjectName.Trim(), cleanName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.SubjectCode.Trim(), cleanName, StringComparison.OrdinalIgnoreCase) ||
                    cleanName.StartsWith(s.SubjectName.Trim(), StringComparison.OrdinalIgnoreCase) ||
                    s.SubjectName.Trim().StartsWith(cleanName, StringComparison.OrdinalIgnoreCase));

                if (matched != null)
                {
                    dto.SubjectId = matched.SubjectId;
                }
                else
                {
                    var validGroup = await _context.Groups.AsNoTracking().FirstOrDefaultAsync();
                    var validLevel = await _context.AcademicLevels.AsNoTracking().FirstOrDefaultAsync();
                    var validBoard = await _context.Boards.AsNoTracking().FirstOrDefaultAsync();
                    var validYear = await _context.AcademicYears.AsNoTracking().FirstOrDefaultAsync();

                    var cleanCode = "SUB-" + (cleanName.Length > 4 ? cleanName.Substring(0, 4).ToUpper() : cleanName.ToUpper()) + "-" + new Random().Next(100, 999);
                    var newSub = new Subject
                    {
                        SubjectName = cleanName,
                        SubjectCode = cleanCode,
                        BoardId = staff.BoardId ?? (validBoard?.BoardId ?? 1),
                        GroupId = validGroup?.GroupId ?? 37,
                        AcademicLevelId = validLevel?.AcademicLevelId ?? 1,
                        AcademicYearId = validYear?.AcademicYearId,
                        SubjectType = "Theory",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Subjects.Add(newSub);
                    await _context.SaveChangesAsync();
                    dto.SubjectId = newSub.SubjectId;
                }
            }

            var subject = await _subjectRepository.GetByIdAsync(dto.SubjectId);
            if (subject == null) throw new NotFoundException($"Subject with ID {dto.SubjectId} not found.");

            var existingAllocs = await _allocationRepository.GetByStaffIdAsync(dto.StaffId);
            var alreadyAllocated = existingAllocs.FirstOrDefault(a => a.SubjectId == dto.SubjectId);
            if (alreadyAllocated != null)
            {
                alreadyAllocated.Staff = staff;
                alreadyAllocated.Subject = subject;
                return _mapper.Map<StaffSubjectAllocationResponseDto>(alreadyAllocated);
            }

            var allocation = _mapper.Map<StaffSubjectAllocation>(dto);
            allocation.IsActive = true;
            allocation.CreatedAt = DateTime.UtcNow;
            var created = await _allocationRepository.AddAsync(allocation);
            created.Staff = staff;
            created.Subject = subject;

            try
            {
                var deptDict = DeserializeObject<Dictionary<string, object>>(staff.DepartmentSpecificJson) ?? new Dictionary<string, object>();
                var currentSubs = new List<string>();
                if (deptDict.TryGetValue("allocatedSubjects", out var sObj) && sObj is IEnumerable<object> sEnum)
                {
                    currentSubs = sEnum.Select(x => x.ToString() ?? "").Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
                }
                if (!currentSubs.Contains(subject.SubjectName))
                {
                    currentSubs.Add(subject.SubjectName);
                    deptDict["allocatedSubjects"] = currentSubs;
                    deptDict["subjects"] = currentSubs;
                    staff.DepartmentSpecificJson = JsonSerializer.Serialize(deptDict);
                    await _context.SaveChangesAsync();
                }
            }
            catch { }

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
            var subjectCount = allocations.Count;
            if (subjectCount == 0 && !string.IsNullOrWhiteSpace(staff.DepartmentSpecificJson))
            {
                try
                {
                    using var jsonDoc = JsonDocument.Parse(staff.DepartmentSpecificJson);
                    if (jsonDoc.RootElement.ValueKind == JsonValueKind.Object &&
                        (jsonDoc.RootElement.TryGetProperty("allocatedSubjects", out var allocEl) || jsonDoc.RootElement.TryGetProperty("subjects", out allocEl)))
                    {
                        if (allocEl.ValueKind == JsonValueKind.Array)
                        {
                            subjectCount = allocEl.GetArrayLength();
                        }
                    }
                }
                catch { }
            }

            return new StaffWorkloadResponseDto
            {
                StaffId = staff.Id,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                EmployeeId = staff.EmployeeId,
                Department = staff.DepartmentRef?.DepartmentName ?? staff.Department ?? string.Empty,
                Designation = staff.DesignationRef?.Name ?? staff.Designation ?? string.Empty,
                TotalAllocatedSubjects = subjectCount,
                TotalAssignedSubjects = subjectCount,
                TotalAllocatedWeeklyHours = subjectCount * 4,
                Status = "Normal",
                Allocations = _mapper.Map<List<StaffSubjectAllocationResponseDto>>(allocations)
            };
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================

        private async Task<(int? BoardId, string? BoardName, string? BoardCode)> ResolveBoardAsync(int? boardId, string? boardName, string? boardCode)
        {
            var rawName = boardName?.Trim();
            var rawCode = boardCode?.Trim();

            if (boardId.HasValue && boardId.Value > 0)
            {
                try
                {
                    var b = await _boardRepository.GetBoardByIdAsync(boardId.Value);
                    if (b != null)
                    {
                        return (b.BoardId, b.BoardName, b.BoardCode);
                    }
                }
                catch { }
            }

            try
            {
                var boards = (await _boardRepository.GetBoardsForExportAsync(new BoardExportRequest())).ToList();
                if (boards.Any())
                {
                    var match = boards.FirstOrDefault(b =>
                        (!string.IsNullOrWhiteSpace(rawCode) && string.Equals(b.BoardCode, rawCode, StringComparison.OrdinalIgnoreCase)) ||
                        (!string.IsNullOrWhiteSpace(rawName) && (
                            string.Equals(b.BoardName, rawName, StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(b.BoardCode, rawName, StringComparison.OrdinalIgnoreCase)
                        ))
                    );

                    if (match != null)
                    {
                        return (match.BoardId, match.BoardName, match.BoardCode);
                    }

                    var activeBoard = boards.FirstOrDefault(b => b.IsActive) ?? boards.FirstOrDefault();
                    if (activeBoard != null)
                    {
                        return (activeBoard.BoardId, activeBoard.BoardName, activeBoard.BoardCode);
                    }
                }
            }
            catch { }

            return (boardId, rawName, rawCode);
        }

        private StaffProfileFullDto MapToFullProfileDto(Staff staff)
        {
            var dto = _mapper.Map<StaffProfileFullDto>(staff);
            if (!string.IsNullOrWhiteSpace(staff.CurrentAddress))
            {
                var addrParts = staff.CurrentAddress.Split(new[] { ',' }, 2);
                dto.HouseNumber = addrParts[0].Trim();
                if (addrParts.Length > 1) dto.Street = addrParts[1].Trim();
            }
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

            if ((dto.AllocatedSubjects == null || !dto.AllocatedSubjects.Any()) && !string.IsNullOrWhiteSpace(staff.DepartmentSpecificJson))
            {
                try
                {
                    using var jsonDoc = JsonDocument.Parse(staff.DepartmentSpecificJson);
                    if (jsonDoc.RootElement.ValueKind == JsonValueKind.Object)
                    {
                        if (jsonDoc.RootElement.TryGetProperty("allocatedSubjects", out var allocEl) ||
                            jsonDoc.RootElement.TryGetProperty("subjects", out allocEl))
                        {
                            if (allocEl.ValueKind == JsonValueKind.Array)
                            {
                                dto.AllocatedSubjects = allocEl.EnumerateArray()
                                    .Select(e => e.GetString())
                                    .Where(s => !string.IsNullOrWhiteSpace(s))
                                    .Select(s => s!)
                                    .Distinct()
                                    .ToList();
                            }
                            else if (allocEl.ValueKind == JsonValueKind.String)
                            {
                                var str = allocEl.GetString();
                                if (!string.IsNullOrWhiteSpace(str))
                                {
                                    dto.AllocatedSubjects = str.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                                        .Select(s => s.Trim())
                                        .Where(s => !string.IsNullOrWhiteSpace(s))
                                        .Distinct()
                                        .ToList();
                                }
                            }
                        }
                    }
                }
                catch { }
            }
            dto.Subjects = dto.AllocatedSubjects;

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
            var docList = dto.DocumentsList != null && dto.DocumentsList.Any() ? dto.DocumentsList : DeserializeList<StaffDocumentPayloadItem>(staff.DocumentsJson);
            dto.DocumentsList = docList;
            foreach (var d in docList)
            {
                var type = d.type?.ToLowerInvariant() ?? "";
                if (type.Contains("aadhaar")) dto.AadhaarDocument = d.name;
                else if (type.Contains("pan")) dto.PanDocument = d.name;
                else if (type.Contains("qualif")) dto.QualificationCertificate = d.name;
                else if (type.Contains("exp")) dto.ExperienceCertificate = d.name;
                else if (type.Contains("resume")) dto.Resume = d.name;
                else if (type.Contains("bank")) dto.BankProof = d.name;
                else if (type.Contains("driv")) dto.DrivingLicence = d.name;
                else if (type.Contains("photo")) dto.Photo = d.name;
                else if (type.Contains("sign")) dto.Signature = d.name;
                else dto.OtherDocuments = d.name;
            }

            // Dynamic Role-Specific / Department Specific details
            if (!string.IsNullOrWhiteSpace(staff.DepartmentSpecificJson))
            {
                try
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(staff.DepartmentSpecificJson);
                    if (dict != null)
                    {
                        dto.DepartmentSpecific = dict;
                    }
                }
                catch { }
            }

            // Dynamic documents map for frontend lookup
            if (docList.Any())
            {
                foreach (var d in docList)
                {
                    if (!string.IsNullOrWhiteSpace(d.type) && !string.IsNullOrWhiteSpace(d.name))
                    {
                        dto.DocumentsMap[d.type] = d.name;
                    }
                }
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
                var mobVal = dto.Personal.Mobile ?? dto.Personal.Phone ?? dto.Personal.PhoneNumber;
                if (!string.IsNullOrWhiteSpace(mobVal)) staff.Mobile = mobVal.Trim();
            }

            if (dto.Address != null)
            {
                if (dto.Address.AlternateMobile != null) staff.AlternateMobile = dto.Address.AlternateMobile.Trim();
                var resolvedCurrent = dto.Address.CurrentAddress;
                if (!string.IsNullOrWhiteSpace(dto.Address.HouseNumber) || !string.IsNullOrWhiteSpace(dto.Address.Street))
                {
                    resolvedCurrent = string.Join(", ", new[] { dto.Address.HouseNumber, dto.Address.Street }.Where(s => !string.IsNullOrWhiteSpace(s)));
                }
                if (!string.IsNullOrWhiteSpace(resolvedCurrent)) staff.CurrentAddress = resolvedCurrent.Trim();
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

            if (dto.Documents != null && dto.Documents.Any())
            {
                staff.DocumentsJson = JsonSerializer.Serialize(dto.Documents);
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

            if (dto.DepartmentSpecific != null && dto.DepartmentSpecific.Any())
            {
                staff.DepartmentSpecificJson = JsonSerializer.Serialize(dto.DepartmentSpecific);
            }


        }

        private static void SyncFlattenedPropertiesToJson(
            Staff staff,
            string? bankName, string? accountHolder, string? accountNumber, string? ifsc, string? branch, string? accountType, decimal? basicSalary,
            string? emergencyName, string? emergencyRelationship, string? emergencyMobile, string? emergencyAlternate, string? emergencyAddress,
            string? highestQualification, string? university, string? specialization, string? passingYear, string? percentage,
            string? totalExp, string? previousInstitution, string? previousDesignation, string? expFrom, string? expTo,
            string? aadhaarDoc, string? panDoc, string? qualCert, string? expCert, string? resume, string? bankProof, string? drivingLicence, string? otherDocs, string? photo, string? signature,
            string? rawEduJson, string? rawExpJson, string? rawDocJson, string? rawBankJson, string? rawEmergencyJson,
            Dictionary<string, object>? departmentSpecific = null,
            object? documentsMap = null,
            string? rawDeptSpecificJson = null)
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
                var docList = DeserializeList<StaffDocumentPayloadItem>(staff.DocumentsJson);
                void AddOrUpdateDoc(string type, string? fileName)
                {
                    if (string.IsNullOrWhiteSpace(fileName)) return;
                    docList.RemoveAll(d => string.Equals(d.type, type, StringComparison.OrdinalIgnoreCase));
                    docList.Add(new StaffDocumentPayloadItem
                    {
                        id = System.Guid.NewGuid().ToString(),
                        type = type,
                        name = fileName,
                        size = "Unknown",
                        url = $"/uploads/staff-documents/{fileName}",
                        format = Path.GetExtension(fileName).TrimStart('.').ToUpper()
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

                // Dynamic documents from frontend map
                if (documentsMap != null)
                {
                    if (documentsMap is Dictionary<string, string> dictStr)
                    {
                        foreach (var kvp in dictStr)
                        {
                            if (!string.IsNullOrWhiteSpace(kvp.Key) && !string.IsNullOrWhiteSpace(kvp.Value))
                            {
                                AddOrUpdateDoc(kvp.Key, kvp.Value);
                            }
                        }
                    }
                    else if (documentsMap is Dictionary<string, object> dictObj)
                    {
                        foreach (var kvp in dictObj)
                        {
                            if (!string.IsNullOrWhiteSpace(kvp.Key) && kvp.Value != null)
                            {
                                AddOrUpdateDoc(kvp.Key, kvp.Value.ToString() ?? "");
                            }
                        }
                    }
                    else if (documentsMap is JsonElement el && el.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var prop in el.EnumerateObject())
                        {
                            if (!string.IsNullOrWhiteSpace(prop.Name))
                            {
                                var val = prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : prop.Value.ToString();
                                if (!string.IsNullOrWhiteSpace(val))
                                {
                                    AddOrUpdateDoc(prop.Name, val);
                                }
                            }
                        }
                    }
                }

                if (docList.Any())
                {
                    staff.DocumentsJson = JsonSerializer.Serialize(docList);
                }
            }

            // 6. Department Specific / Role Specific Details for Non-Teaching Staff
            if (!string.IsNullOrWhiteSpace(rawDeptSpecificJson))
            {
                staff.DepartmentSpecificJson = rawDeptSpecificJson;
            }
            else if (departmentSpecific != null && departmentSpecific.Count > 0)
            {
                staff.DepartmentSpecificJson = JsonSerializer.Serialize(departmentSpecific);
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

                    if (subject == null)
                    {
                        var cleanCode = "SUB-" + (name.Length > 4 ? name.Substring(0, 4).ToUpper() : name.ToUpper()) + "-" + new Random().Next(100, 999);
                        var newSubject = new Subject
                        {
                            SubjectName = name,
                            SubjectCode = cleanCode,
                            BoardId = 1,
                            GroupId = 1,
                            AcademicLevelId = 1,
                            SubjectType = "Theory",
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Subjects.Add(newSubject);
                        await _context.SaveChangesAsync();

                        var allocation = new StaffSubjectAllocation
                        {
                            StaffId = staffId,
                            SubjectId = newSubject.SubjectId,
                            AcademicYearId = 1,
                            MaxWeeklyHours = 18,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _allocationRepository.AddAsync(allocation);
                    }
                    else
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
                _logger.LogWarning(ex, "[StaffSubjectAllocationSync] Notice: {Message}", ex.Message);
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
            var docs = DeserializeList<StaffDocumentPayloadItem>(staff.DocumentsJson);
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

        public async Task<StaffPayrollDetailsDto?> GetStaffPayrollDetailsAsync(int id)
        {
            var staff = await _staffRepository.GetByIdAsync(id);
            if (staff == null)
                throw new NotFoundException($"Staff record with ID {id} not found.");

            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            var query = @"
                SELECT 
                    s.Id AS StaffId,
                    s.EmployeeId,
                    CONCAT(s.FirstName, ' ', s.LastName) AS StaffName,
                    COALESCE(NULLIF(psa.BankName, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.BankName')), ''), 'State Bank of India') AS BankName,
                    COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.AccountHolderName')), ''), CONCAT(s.FirstName, ' ', s.LastName)) AS AccountHolderName,
                    COALESCE(NULLIF(psa.AccountNumber, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.AccountNumber')), ''), CONCAT('30', LPAD(s.Id, 9, '0'))) AS AccountNumber,
                    COALESCE(NULLIF(psa.IFSCCode, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.IfscCode')), ''), 'SBIN0001234') AS IfscCode,
                    COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.Branch')), ''), 'Main Branch') AS Branch,
                    COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.AccountType')), ''), 'Savings') AS AccountType,
                    pss.BasicPay AS BasicSalary,
                    (pss.BasicPay + pss.HRA + pss.DA + pss.ConveyanceAllowance + pss.MedicalAllowance + pss.OtherAllowance) AS GrossSalary,
                    COALESCE(NULLIF(psa.PANNumber, ''), NULLIF(s.PanNumber, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.PanNumber')), ''), CONCAT('ABCDE', LPAD(s.Id, 4, '0'), 'F')) AS PanNumber,
                    s.Aadhaar,
                    COALESCE(NULLIF(psa.UANNumber, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.BankDetailsJson, '$.UanNumber')), ''), CONCAT('100', LPAD(s.Id, 9, '0'))) AS UanNumber,
                    pss.StructureName AS SalaryStructureName,
                    psa.EffectiveFrom,
                    COALESCE(psa.Status, 'Active') AS Status
                FROM Staffs s
                LEFT JOIN payroll_staff_salaries psa ON psa.StaffId = s.Id AND psa.Status = 'Active'
                LEFT JOIN payroll_salary_structures pss ON pss.Id = psa.SalaryStructureId
                WHERE s.Id = @StaffId;";

            var dto = await conn.QueryFirstOrDefaultAsync<StaffPayrollDetailsDto>(query, new { StaffId = id });
            if (dto == null)
            {
                dto = new StaffPayrollDetailsDto
                {
                    StaffId = staff.Id,
                    EmployeeId = staff.EmployeeId,
                    StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                    Status = "Active"
                };
            }
            return dto;
        }

        private async Task EnsureStaffPayrollStructureProvisionedAsync(Staff staff)
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }

                // Check if staff already has an active salary assignment
                var existingAssignment = await conn.QueryFirstOrDefaultAsync<int?>(
                    "SELECT Id FROM `payroll_staff_salaries` WHERE `StaffId` = @StaffId AND `Status` = 'Active' LIMIT 1;",
                    new { StaffId = staff.Id });

                if (existingAssignment.HasValue && existingAssignment.Value > 0)
                {
                    return; // Already provisioned
                }

                // Look for default structure for staff's designation or staff type
                int? structureId = null;
                if (staff.DesignationId.HasValue && staff.DesignationId.Value > 0)
                {
                    structureId = await conn.QueryFirstOrDefaultAsync<int?>(
                        "SELECT Id FROM `payroll_salary_structures` WHERE `DesignationId` = @DesignationId AND `Status` = 'Active' ORDER BY Id ASC LIMIT 1;",
                        new { DesignationId = staff.DesignationId.Value });
                }

                if (!structureId.HasValue && !string.IsNullOrWhiteSpace(staff.StaffType))
                {
                    structureId = await conn.QueryFirstOrDefaultAsync<int?>(
                        "SELECT Id FROM `payroll_salary_structures` WHERE `StaffType` = @StaffType AND `Status` = 'Active' ORDER BY Id ASC LIMIT 1;",
                        new { StaffType = staff.StaffType });
                }

                if (!structureId.HasValue)
                {
                    structureId = await conn.QueryFirstOrDefaultAsync<int?>(
                        "SELECT Id FROM `payroll_salary_structures` WHERE `Status` = 'Active' ORDER BY Id ASC LIMIT 1;");
                }

                // If no structure exists at all in the database, auto-create a default base structure
                if (!structureId.HasValue)
                {
                    var insertStructureSql = @"
                        INSERT INTO `payroll_salary_structures` 
                        (`StructureName`, `StaffType`, `DesignationId`, `BasicPay`, `HRA`, `DA`, `ConveyanceAllowance`, `MedicalAllowance`, `OtherAllowance`, `PF`, `ProfessionalTax`, `TDS`, `ESI`, `InsuranceOtherDeduction`, `Status`, `CreatedAt`)
                        VALUES
                        (@StructureName, @StaffType, @DesignationId, 30000.00, 6000.00, 3000.00, 1500.00, 1500.00, 1000.00, 3600.00, 200.00, 1500.00, 0.00, 0.00, 'Active', NOW());
                        SELECT LAST_INSERT_ID();";

                    structureId = await conn.QuerySingleAsync<int>(insertStructureSql, new
                    {
                        StructureName = $"Standard {staff.Designation ?? staff.StaffType ?? "Staff"} Structure",
                        StaffType = staff.StaffType ?? "Teaching",
                        DesignationId = staff.DesignationId
                    });
                }

                // Extract bank details if available
                string bankName = "State Bank of India";
                string accountNo = $"30{staff.Id.ToString().PadLeft(9, '0')}";
                string ifsc = "SBIN0001234";
                string pan = !string.IsNullOrWhiteSpace(staff.PanNumber) ? staff.PanNumber : $"ABCDE{staff.Id.ToString().PadLeft(4, '0')}F";
                string uan = $"100{staff.Id.ToString().PadLeft(9, '0')}";

                if (!string.IsNullOrWhiteSpace(staff.BankDetailsJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(staff.BankDetailsJson);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("BankName", out var bNameProp) && !string.IsNullOrWhiteSpace(bNameProp.GetString()))
                            bankName = bNameProp.GetString()!;
                        if (root.TryGetProperty("AccountNumber", out var accProp) && !string.IsNullOrWhiteSpace(accProp.GetString()))
                            accountNo = accProp.GetString()!;
                        if (root.TryGetProperty("IfscCode", out var ifscProp) && !string.IsNullOrWhiteSpace(ifscProp.GetString()))
                            ifsc = ifscProp.GetString()!;
                        if (root.TryGetProperty("PanNumber", out var panProp) && !string.IsNullOrWhiteSpace(panProp.GetString()))
                            pan = panProp.GetString()!;
                        if (root.TryGetProperty("UanNumber", out var uanProp) && !string.IsNullOrWhiteSpace(uanProp.GetString()))
                            uan = uanProp.GetString()!;
                    }
                    catch { }
                }

                // Assign to payroll_staff_salaries
                var assignSql = @"
                    INSERT INTO `payroll_staff_salaries`
                    (`StaffId`, `SalaryStructureId`, `EffectiveFrom`, `Status`, `PaymentMode`, `BankName`, `AccountNumber`, `IFSCCode`, `PANNumber`, `UANNumber`, `CreatedAt`)
                    VALUES
                    (@StaffId, @SalaryStructureId, @EffectiveFrom, 'Active', 'Bank Transfer', @BankName, @AccountNumber, @IFSCCode, @PANNumber, @UANNumber, NOW());";

                await conn.ExecuteAsync(assignSql, new
                {
                    StaffId = staff.Id,
                    SalaryStructureId = structureId.Value,
                    EffectiveFrom = staff.JoiningDate != default ? staff.JoiningDate.Date : DateTime.UtcNow.Date,
                    BankName = bankName,
                    AccountNumber = accountNo,
                    IFSCCode = ifsc,
                    PANNumber = pan,
                    UANNumber = uan
                });

                _logger.LogInformation("Successfully auto-provisioned payroll salary structure {StructureId} for staff {StaffId} ({EmployeeId})", structureId.Value, staff.Id, staff.EmployeeId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-provision payroll salary structure for staff {StaffId} ({EmployeeId})", staff.Id, staff.EmployeeId);
            }
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
        public async Task<bool> UpdateCurrentStaffContactAsync(System.Security.Claims.ClaimsPrincipal user, UpdateStaffContactDto dto)
        {
            var staffIdClaim = user.Claims.FirstOrDefault(c => c.Type == "StaffId" || c.Type == "staff_id" || c.Type == "staffId")?.Value;
            Staff? staff = null;
            if (int.TryParse(staffIdClaim, out int sId) && sId > 0)
            {
                staff = await _staffRepository.GetByIdAsync(sId);
            }

            if (staff == null)
            {
                var empIdClaim = user.Claims.FirstOrDefault(c => c.Type == "EmployeeId" || c.Type == "empId" || c.Type == "employee_id")?.Value;
                if (!string.IsNullOrWhiteSpace(empIdClaim))
                {
                    staff = await _staffRepository.GetByEmployeeIdAsync(empIdClaim);
                }
            }

            if (staff == null)
            {
                var emailClaim = user.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email || c.Type == "email")?.Value;
                if (!string.IsNullOrWhiteSpace(emailClaim))
                {
                    staff = await _staffRepository.GetByEmailAsync(emailClaim);
                }
            }

            if (staff == null)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(dto.Mobile))
                staff.Mobile = dto.Mobile.Trim();
            if (!string.IsNullOrWhiteSpace(dto.EmergencyContact))
                staff.AlternateMobile = dto.EmergencyContact.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Address))
                staff.CurrentAddress = dto.Address.Trim();

            await _staffRepository.UpdateAsync(staff);
            return true;
        }

        public async Task<bool> UnassignSubjectAsync(int staffId, string? subjectName, int? subjectId)
        {
            var allocations = await _allocationRepository.GetByStaffIdAsync(staffId);
            if (!allocations.Any()) return false;

            StaffSubjectAllocation? target = null;
            if (subjectId.HasValue && subjectId.Value > 0)
            {
                target = allocations.FirstOrDefault(a => a.SubjectId == subjectId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(subjectName))
            {
                var clean = subjectName.Trim().ToLowerInvariant();
                target = allocations.FirstOrDefault(a =>
                    (a.Subject != null && (a.Subject.SubjectName.ToLower() == clean || a.Subject.SubjectCode.ToLower() == clean)) ||
                    (a.Subject != null && clean.Contains(a.Subject.SubjectName.ToLower())));
            }

            if (target != null)
            {
                await _allocationRepository.DeleteAsync(target);
                return true;
            }

            return false;
        }

        public async Task<OfferLetterWorkflowConfigDto> GetOfferLetterWorkflowConfigAsync()
        {
            try
            {
                var template = await _context.Templates.AsNoTracking()
                    .FirstOrDefaultAsync(t => t.TemplateCode == "OFFER_LETTER_AUTOMATION_CONFIG");
                if (template != null && !string.IsNullOrWhiteSpace(template.ContentBody))
                {
                    var config = JsonSerializer.Deserialize<OfferLetterWorkflowConfigDto>(template.ContentBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (config != null) return config;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize offer letter workflow config from database, using defaults.");
            }
            return new OfferLetterWorkflowConfigDto();
        }

        public async Task<OfferLetterWorkflowConfigDto> SaveOfferLetterWorkflowConfigAsync(OfferLetterWorkflowConfigDto dto)
        {
            if (dto == null) throw new ValidationException("Workflow configuration payload cannot be null.");

            dto.WorkflowPreference = string.Equals(dto.WorkflowPreference, "AdminApproval", StringComparison.OrdinalIgnoreCase)
                ? "AdminApproval" : "Automatic";

            var template = await _context.Templates
                .FirstOrDefaultAsync(t => t.TemplateCode == "OFFER_LETTER_AUTOMATION_CONFIG");

            string json = JsonSerializer.Serialize(dto, new JsonSerializerOptions { WriteIndented = true });

            if (template == null)
            {
                template = new CollegeManagement.API.Models.Settings.Template
                {
                    TemplateCode = "OFFER_LETTER_AUTOMATION_CONFIG",
                    Title = "Offer Letter Automation & Workflow Preference",
                    Category = "OfferLetterConfig",
                    ContentBody = json,
                    PlaceholdersJson = "[]",
                    IsActive = true,
                    Version = "1",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.Templates.AddAsync(template);
            }
            else
            {
                template.ContentBody = json;
                template.UpdatedAt = DateTime.UtcNow;
                template.IsActive = true;
            }

            await _context.SaveChangesAsync();

            try
            {
                await _auditLogger.LogAsync("SaveWorkflowConfig", "OfferLetterSettings", "OFFER_LETTER_AUTOMATION_CONFIG", "Info", "Success", $"Updated workflow preference to: {dto.WorkflowPreference}");
            }
            catch { }

            return dto;
        }

        public async Task<List<StaffOnboardingRequestDto>> GetOfferLetterOnboardingRequestsAsync(string? status, int? campusId)
        {
            var query = _context.Staffs.AsNoTracking()
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.Campus)
                .Include(s => s.BoardRef)
                .Where(s => !s.IsDeleted);

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(s => s.CampusId == campusId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim().ToLowerInvariant();
                if (st == "pending")
                {
                    query = query.Where(s => s.ProfileStatus == "PendingApproval" || s.ProfileStatus == "UnderVerification" || s.ProfileStatus == "Submitted" || s.ProfileStatus == "Changes Required" || s.ProfileStatus == "NeedsCorrection");
                }
                else
                {
                    query = query.Where(s => s.ProfileStatus.ToLower() == st);
                }
            }

            var list = await query
                .OrderByDescending(s => s.SubmittedAt ?? s.UpdatedAt ?? s.CreatedAt)
                .Take(100)
                .ToListAsync();

            return list.Select(s => new StaffOnboardingRequestDto
            {
                StaffId = s.Id,
                EmployeeId = s.EmployeeId,
                StaffName = $"{s.FirstName} {s.LastName}".Trim(),
                FirstName = s.FirstName,
                LastName = s.LastName,
                Department = s.DepartmentRef?.DepartmentName ?? s.Department ?? string.Empty,
                Designation = s.DesignationRef?.Name ?? s.Designation ?? string.Empty,
                CampusName = s.Campus?.CampusName ?? s.CampusName,
                CampusId = s.CampusId,
                BoardName = s.BoardRef?.BoardName ?? s.BoardName,
                ProfileStatus = s.ProfileStatus,
                ProfileCompletionPercentage = s.ProfileCompletionPercentage,
                SubmittedAt = s.SubmittedAt,
                ApprovedAt = s.ApprovedAt,
                CorrectionRequestedAt = s.CorrectionRequestedAt,
                CorrectionNotes = s.CorrectionNotes,
                JoiningDate = s.JoiningDate,
                PhotoPath = s.PhotoPath,
                Email = s.Email,
                Mobile = s.Mobile,
                Status = s.Status,
                HasOfferLetter = string.Equals(s.ProfileStatus, "Completed", StringComparison.OrdinalIgnoreCase) || string.Equals(s.ProfileStatus, "Approved", StringComparison.OrdinalIgnoreCase)
            }).ToList();
        }

        public async Task<StaffResponseDto> VerifyStaffOnboardingAsync(int staffId, VerifyStaffOnboardingDto dto, int adminUserId)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null) throw new NotFoundException($"Staff #{staffId} not found.");

            staff.ProfileStatus = "UnderVerification";
            if (!string.IsNullOrWhiteSpace(dto?.VerificationNotes))
            {
                staff.CorrectionNotes = dto.VerificationNotes.Trim();
            }
            await _staffRepository.UpdateAsync(staff);

            try
            {
                await _auditLogger.LogAsync("VerifyStaffOnboarding", "StaffOnboarding", staff.EmployeeId ?? staff.Id.ToString(), "Info", "Success", $"Admin (User #{adminUserId}) verified onboarding details. Notes: {dto?.VerificationNotes}");
            }
            catch { }

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffResponseDto> ApproveStaffOfferLetterAsync(int staffId, ApproveStaffOfferLetterDto dto, int adminUserId)
        {
            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null) throw new NotFoundException($"Staff #{staffId} not found.");

            staff.ProfileStatus = "Completed";
            staff.ApprovedAt = DateTime.UtcNow;
            staff.CorrectionNotes = null;
            staff.ProfileLinkToken = null; // Revoke onboarding token upon approval
            await _staffRepository.UpdateAsync(staff);
            await EnsureStaffPayrollStructureProvisionedAsync(staff);

            var workflowConfig = await GetOfferLetterWorkflowConfigAsync();

            // Generate Offer Letter PDF and dispatch via Email
            try
            {
                var (pdfBytes, contentType, fileName) = await GenerateOfferLetterPdfAsync(staff.Id);
                if (!string.IsNullOrWhiteSpace(staff.Email))
                {
                    string staffFullName = $"{staff.FirstName} {staff.LastName}".Trim();
                    string subject = workflowConfig.EmailSubject ?? $"Official Appointment & Offer Letter - {staff.EmployeeId}";
                    subject = subject.Replace("{{StaffName}}", staffFullName).Replace("{{EmployeeId}}", staff.EmployeeId ?? "");

                    string portalUrl = _configuration["App:ClientUrl"] ?? "http://localhost:5173/login";
                    if (!portalUrl.EndsWith("/login") && !portalUrl.Contains("login"))
                    {
                        portalUrl = portalUrl.TrimEnd('/') + "/login";
                    }

                    string body = $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>
                            <div style='background: #355e3b; padding: 24px; text-align: center; color: #ffffff;'>
                                <h2 style='margin: 0; font-size: 20px;'>Pirnav Educational Society</h2>
                                <p style='margin: 4px 0 0; opacity: 0.9; font-size: 13px;'>Official Appointment &amp; Offer Letter</p>
                            </div>
                            <div style='padding: 28px; background: #ffffff;'>
                                <p>Dear <strong>{staffFullName}</strong>,</p>
                                <p>Your onboarding request has been reviewed and approved by Central Administration, and your offer letter has been generated successfully.</p>
                                <p>You can now access the Staff Portal to view and download your offer letter.</p>
                                <div style='margin: 30px 0; text-align: center;'>
                                    <a href='{portalUrl}' style='background: #355e3b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(53, 94, 59, 0.25);'>Access Your Staff Portal &rarr;</a>
                                </div>
                                <p style='font-size: 13px; color: #64748b; margin-top: 24px;'>Please find attached your official signed QuestPDF document for your personal records.</p>
                                <p style='font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;'>Best regards,<br/><strong>Central HR Administration</strong><br/>Pirnav Educational Society</p>
                            </div>
                        </div>";

                    await _emailService.SendEmailWithAttachmentAsync(staff.Email, subject, body, pdfBytes, fileName, contentType);

                    if (!string.IsNullOrWhiteSpace(workflowConfig.CcHrEmail) && workflowConfig.CcHrEmail != staff.Email)
                    {
                        try
                        {
                            await _emailService.SendEmailWithAttachmentAsync(workflowConfig.CcHrEmail, $"[HR Audit Copy] {subject}", body, pdfBytes, fileName, contentType);
                        }
                        catch { }
                    }
                    _logger.LogInformation("Offer Letter approval email dispatched to {Email} for staff #{StaffId}", staff.Email, staff.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notice: Offer Letter approval email delivery failure for {Email}: {Msg}", staff.Email, ex.Message);
            }

            // Staff Portal Notification via existing notification infrastructure
            try
            {
                await _notificationService.SendToStaffAsync(staff.Id, "Offer Letter Available", "Your onboarding request has been approved and your official offer letter is now available in your portal.", "OfferLetter", staff.Id, "/faculty-dashboard/profile?tab=offerletter");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deliver approval notification to staff #{StaffId}", staff.Id);
            }

            try
            {
                await _auditLogger.LogAsync("ApproveStaffOfferLetter", "StaffOnboarding", staff.EmployeeId ?? staff.Id.ToString(), "Info", "Success", $"Admin (User #{adminUserId}) approved offer letter for staff #{staff.Id}. Remarks: {dto?.Remarks}");
            }
            catch { }

            return _mapper.Map<StaffResponseDto>(staff);
        }

        public async Task<StaffResponseDto> RejectStaffOfferLetterAsync(int staffId, RejectStaffOfferLetterDto dto, int adminUserId)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.RejectionReason))
                throw new ValidationException("Rejection reason is mandatory.");

            var staff = await _staffRepository.GetByIdAsync(staffId);
            if (staff == null) throw new NotFoundException($"Staff #{staffId} not found.");

            string reason = dto.RejectionReason.Trim();
            string scenario = dto.Scenario?.Trim() ?? "Correction";
            string staffFullName = $"{staff.FirstName} {staff.LastName}".Trim();

            if (string.Equals(scenario, "DateChange", StringComparison.OrdinalIgnoreCase))
            {
                if (!dto.RevisedOnboardingDate.HasValue)
                    throw new ValidationException("Revised onboarding date is required for Date Change scenario.");

                staff.JoiningDate = dto.RevisedOnboardingDate.Value;
                staff.CorrectionNotes = $"[Date Rescheduled to {dto.RevisedOnboardingDate.Value:dd MMM yyyy}]: {reason}";
                await _staffRepository.UpdateAsync(staff);

                // Email
                if (!string.IsNullOrWhiteSpace(staff.Email))
                {
                    string subject = $"Onboarding Date Rescheduled - {staff.EmployeeId}";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                            <h2>Onboarding Rescheduled</h2>
                            <p>Dear {staffFullName},</p>
                            <p>Your official onboarding date has been revised to <strong>{dto.RevisedOnboardingDate.Value:dd MMMM yyyy}</strong>.</p>
                            <p><strong>Reason:</strong> {reason}</p>
                            <p>Best regards,<br/><strong>Central HR Administration</strong></p>
                        </div>";
                    try { await _emailService.SendEmailAsync(staff.Email, subject, body); } catch { }
                }

                // Staff Notification via existing notification infrastructure
                try
                {
                    await _notificationService.SendToStaffAsync(staff.Id, "Onboarding Date Rescheduled", $"Your onboarding date has been revised to {dto.RevisedOnboardingDate.Value:dd MMM yyyy}. Reason: {reason}", "OfferLetter", staff.Id, "/faculty-dashboard/profile");
                }
                catch { }
            }
            else if (string.Equals(scenario, "Discontinue", StringComparison.OrdinalIgnoreCase))
            {
                staff.ProfileStatus = "Onboarding Discontinued";
                staff.Status = "Discontinued";
                staff.CorrectionNotes = $"[Onboarding Discontinued]: {reason}";
                await _staffRepository.UpdateAsync(staff);

                // Email
                if (!string.IsNullOrWhiteSpace(staff.Email))
                {
                    string subject = $"Onboarding Status Notice - {staff.EmployeeId}";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                            <h2>Onboarding Discontinued</h2>
                            <p>Dear {staffFullName},</p>
                            <p>We regret to inform you that your onboarding process has been discontinued by the institution.</p>
                            <p><strong>Reason:</strong> {reason}</p>
                            <p>Best regards,<br/><strong>Central HR Administration</strong></p>
                        </div>";
                    try { await _emailService.SendEmailAsync(staff.Email, subject, body); } catch { }
                }

                // Staff Notification via existing notification infrastructure
                try
                {
                    await _notificationService.SendToStaffAsync(staff.Id, "Onboarding Discontinued", $"Your onboarding process has been discontinued. Reason: {reason}", "OfferLetter", staff.Id, "/faculty-dashboard/profile");
                }
                catch { }
            }
            else // Default: "Correction" / "Changes Required"
            {
                staff.ProfileStatus = "Changes Required";
                staff.CorrectionRequestedAt = DateTime.UtcNow;
                staff.CorrectionNotes = reason;
                await _staffRepository.UpdateAsync(staff);

                // Email
                if (!string.IsNullOrWhiteSpace(staff.Email))
                {
                    string subject = $"Onboarding Details Require Correction - {staff.EmployeeId}";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                            <h2>Profile Correction Required</h2>
                            <p>Dear {staffFullName},</p>
                            <p>Your onboarding request has been reviewed by the Admin and requires corrections before approval.</p>
                            <p><strong>Reason / Requested Changes:</strong><br/>{reason}</p>
                            <p>Please log in to your Staff Portal, update the required details, and submit your profile again.</p>
                            <p>Best regards,<br/><strong>Central HR Administration</strong></p>
                        </div>";
                    try { await _emailService.SendEmailAsync(staff.Email, subject, body); } catch { }
                }

                // Staff Notification via existing notification infrastructure
                try
                {
                    await _notificationService.SendToStaffAsync(staff.Id, "Onboarding Details Require Correction", $"HR requested corrections: {reason}. Please update your details and resubmit.", "OfferLetter", staff.Id, "/faculty-dashboard/profile");
                }
                catch { }
            }

            try
            {
                await _auditLogger.LogAsync("RejectStaffOfferLetter", "StaffOnboarding", staff.EmployeeId ?? staff.Id.ToString(), "Warning", "Success", $"Admin (User #{adminUserId}) processed rejection [{scenario}]. Reason: {reason}");
            }
            catch { }

            return _mapper.Map<StaffResponseDto>(staff);
        }
    }
}