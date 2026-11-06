using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffTransferService : IStaffTransferService
    {
        private readonly AppDbContext _db;
        private readonly INumberSeriesService _numberSeriesService;
        private readonly IEmailService _emailService;
        private readonly IStaffExperienceService _experienceService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StaffTransferService> _logger;

        public StaffTransferService(
            AppDbContext db,
            INumberSeriesService numberSeriesService,
            IEmailService emailService,
            IStaffExperienceService experienceService,
            IConfiguration configuration,
            ILogger<StaffTransferService> logger)
        {
            _db = db;
            _numberSeriesService = numberSeriesService;
            _emailService = emailService;
            _experienceService = experienceService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<StaffTransferPreflightCheckDto> PreflightCheckAsync(int staffId, int toCampusId)
        {
            var staff = await _db.Staffs
                .Include(s => s.Campus)
                .FirstOrDefaultAsync(s => s.Id == staffId && !s.IsDeleted);

            if (staff == null)
                throw new NotFoundException($"Staff with ID {staffId} not found.");

            int fromCampusId = staff.CampusId ?? 0;

            var result = new StaffTransferPreflightCheckDto
            {
                StaffId = staff.Id,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                EmployeeId = staff.EmployeeId,
                FromCampusId = fromCampusId,
                FromCampusName = staff.Campus?.CampusName ?? "Unknown Campus"
            };

            // Check active timetable slots at Source Campus
            var activeSlotsCount = await _db.Timetables
                .Where(t => t.StaffId == staffId && t.CampusId == fromCampusId && t.IsPublished)
                .CountAsync();
            result.ActiveTimetableSlotsCount = activeSlotsCount;

            if (activeSlotsCount > 0)
            {
                result.Warnings.Add($"Faculty has {activeSlotsCount} active timetable slot(s) allocated at the relieving campus. These slots will be unassigned upon transfer.");
            }

            // Check if transferring to same campus
            if (toCampusId > 0 && fromCampusId == toCampusId)
            {
                result.Warnings.Add("Source and destination campuses are identical. A transfer must target a different campus.");
                result.CanProceed = false;
            }

            // Check duplicate pending transfer
            if (toCampusId > 0)
            {
                var duplicatePending = await _db.StaffTransfers
                    .AnyAsync(t => t.StaffId == staffId && t.ToCampusId == toCampusId && t.Status == "PendingApproval");
                if (duplicatePending)
                {
                    result.Warnings.Add("A campus transfer request for this staff member to the target campus is already pending approval.");
                    result.CanProceed = false;
                }
            }

            return result;
        }

        public async Task<StaffTransferResponseDto> InitiateTransferAsync(CreateStaffTransferDto dto, int requestedByUserId)
        {
            var staff = await _db.Staffs
                .Include(s => s.Campus)
                .Include(s => s.BoardRef)
                .FirstOrDefaultAsync(s => s.Id == dto.StaffId && !s.IsDeleted);

            if (staff == null)
                throw new NotFoundException($"Staff with ID {dto.StaffId} not found.");

            int fromCampusId = staff.CampusId ?? 1;

            if (fromCampusId == dto.ToCampusId)
                throw new ValidationException("Destination campus must be different from the source campus.");

            var existingPending = await _db.StaffTransfers
                .AnyAsync(t => t.StaffId == staff.Id && t.ToCampusId == dto.ToCampusId && t.Status == "PendingApproval");
            if (existingPending)
                throw new ValidationException("A campus transfer request for this staff member to the target campus is already pending approval.");

            if (dto.ToBoardId.HasValue && dto.ToBoardId.Value > 0)
            {
                var boardExists = await _db.Boards.AnyAsync(b => b.BoardId == dto.ToBoardId.Value);
                if (!boardExists)
                    throw new ValidationException($"Selected destination board (ID: {dto.ToBoardId.Value}) is invalid.");
            }

            // Generate atomic TRANSFER_ORDER_NO
            var numRes = await _numberSeriesService.GenerateNextNumberAsync("TRANSFER_ORDER_NO", campusId: fromCampusId);
            string orderNo = numRes?.GeneratedNumber ?? $"TRF/{DateTime.UtcNow.Year}/{Guid.NewGuid().ToString().Substring(0, 4).ToUpperInvariant()}";

            var metaObj = new
            {
                toBoardId = dto.ToBoardId,
                toBoardName = dto.ToBoardName,
                academicYearId = dto.AcademicYearId,
                academicYearName = dto.AcademicYearName,
                academicLevelId = dto.AcademicLevelId,
                academicLevelName = dto.AcademicLevelName,
                groupId = dto.GroupId,
                groupName = dto.GroupName,
                sectionId = dto.SectionId,
                sectionName = dto.SectionName,
                allocatedSubjects = dto.AllocatedSubjectNames ?? new List<string>(),
                allocatedSubjectIds = dto.AllocatedSubjectIds ?? new List<int>(),
                roleId = dto.RoleId,
                roleName = dto.RoleName,
                adminRemarks = dto.ApprovalRemarks
            };

            var transfer = new StaffTransfer
            {
                TransferOrderNumber = orderNo,
                StaffId = staff.Id,
                FromCampusId = fromCampusId,
                ToCampusId = dto.ToCampusId,
                FromDepartmentId = staff.DepartmentId,
                ToDepartmentId = dto.ToDepartmentId ?? staff.DepartmentId,
                FromDesignationId = staff.DesignationId,
                ToDesignationId = dto.ToDesignationId ?? staff.DesignationId,
                TransferType = string.IsNullOrWhiteSpace(dto.TransferType) ? "Permanent" : dto.TransferType,
                Reason = dto.Reason,
                RequestedByUserId = requestedByUserId,
                RequestDate = DateTime.UtcNow,
                EffectiveDate = dto.EffectiveDate > DateTime.MinValue ? dto.EffectiveDate.Date : DateTime.UtcNow.Date,
                RelievingDate = dto.RelievingDate,
                JoiningDate = dto.JoiningDate,
                Status = dto.AutoApprove ? "Completed" : "PendingApproval",
                ApprovalRemarks = System.Text.Json.JsonSerializer.Serialize(metaObj),
                CreatedAt = DateTime.UtcNow
            };

            _db.StaffTransfers.Add(transfer);
            await _db.SaveChangesAsync();

            if (dto.AutoApprove)
            {
                await ExecuteTransferInternalAsync(transfer, dto, requestedByUserId);
            }

            return await MapToResponseDtoAsync(transfer.Id);
        }

        private async Task ExecuteTransferInternalAsync(StaffTransfer transfer, CreateStaffTransferDto? createDto, int approverUserId)
        {
            var effectiveDate = transfer.EffectiveDate.Date;
            transfer.ApprovedByUserId = approverUserId;
            transfer.Status = "Completed";
            transfer.UpdatedAt = DateTime.UtcNow;

            var strategy = _db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var staff = await _db.Staffs
                        .Include(s => s.StaffCampusAssignments)
                        .Include(s => s.StaffBoardAssignments)
                        .Include(s => s.StaffSubjectAllocations)
                        .FirstOrDefaultAsync(s => s.Id == transfer.StaffId);

                    if (staff != null)
                    {
                        // 1. Close active assignment at Source Campus
                        var sourceAssignments = await _db.StaffCampusAssignments
                            .Where(a => a.StaffId == transfer.StaffId && a.CampusId == transfer.FromCampusId && a.IsActive)
                            .ToListAsync();

                        foreach (var sa in sourceAssignments)
                        {
                            sa.IsActive = false;
                            sa.IsPrimary = false;
                            sa.Status = "TransferredOut";
                            sa.EndDate = effectiveDate;
                            sa.UpdatedAt = DateTime.UtcNow;
                        }

                        // 2. Insert or reactivate assignment at Destination Campus
                        var existingDestAssignment = await _db.StaffCampusAssignments
                            .FirstOrDefaultAsync(a => a.StaffId == transfer.StaffId && a.CampusId == transfer.ToCampusId);

                        if (existingDestAssignment != null)
                        {
                            existingDestAssignment.IsActive = true;
                            existingDestAssignment.IsPrimary = true;
                            existingDestAssignment.Status = "Active";
                            existingDestAssignment.AssignmentType = transfer.TransferType;
                            existingDestAssignment.DepartmentId = transfer.ToDepartmentId;
                            existingDestAssignment.DesignationId = transfer.ToDesignationId;
                            existingDestAssignment.StartDate = effectiveDate;
                            existingDestAssignment.EndDate = null;
                            existingDestAssignment.TransferId = transfer.Id;
                            existingDestAssignment.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            var destAssignment = new StaffCampusAssignment
                            {
                                StaffId = transfer.StaffId,
                                CampusId = transfer.ToCampusId,
                                AssignmentType = transfer.TransferType,
                                DepartmentId = transfer.ToDepartmentId,
                                DesignationId = transfer.ToDesignationId,
                                IsPrimary = true,
                                StartDate = effectiveDate,
                                IsActive = true,
                                Status = "Active",
                                TransferId = transfer.Id,
                                AssignedDate = DateTime.UtcNow,
                                CreatedAt = DateTime.UtcNow
                            };
                            _db.StaffCampusAssignments.Add(destAssignment);
                        }

                        // 3. Update staff primary master record
                        staff.CampusId = transfer.ToCampusId;
                        staff.Status = "Active";
                        staff.IsTransferred = true;
                        staff.TransferredFromCampusId = transfer.FromCampusId;
                        staff.TransferredToCampusId = transfer.ToCampusId;
                        staff.TransferStatus = "Transferred";
                        staff.TransferredAt = DateTime.UtcNow;

                        if (transfer.ToDepartmentId.HasValue && transfer.ToDepartmentId.Value > 0)
                        {
                            staff.DepartmentId = transfer.ToDepartmentId.Value;
                            var dept = await _db.Departments.FindAsync(transfer.ToDepartmentId.Value);
                            if (dept != null) staff.Department = dept.DepartmentName;
                        }
                        if (transfer.ToDesignationId.HasValue && transfer.ToDesignationId.Value > 0)
                        {
                            staff.DesignationId = transfer.ToDesignationId.Value;
                            var desig = await _db.Designations.FindAsync(transfer.ToDesignationId.Value);
                            if (desig != null)
                            {
                                staff.Designation = desig.Name;
                                var user = await _db.Users.FirstOrDefaultAsync(u => u.StaffId == staff.Id);
                                if (user != null) user.Designation = desig.Name;
                            }
                        }

                        // 4. Update Board if provided
                        if (createDto != null && createDto.ToBoardId.HasValue && createDto.ToBoardId.Value > 0)
                        {
                            staff.BoardId = createDto.ToBoardId.Value;
                            var board = await _db.Boards.FindAsync(createDto.ToBoardId.Value);
                            if (board != null) staff.BoardName = board.BoardName;
                            var hasBoard = await _db.StaffBoardAssignments
                                .AnyAsync(b => b.StaffId == staff.Id && b.BoardId == createDto.ToBoardId.Value);
                            if (!hasBoard)
                            {
                                _db.StaffBoardAssignments.Add(new StaffBoardAssignment
                                {
                                    StaffId = staff.Id,
                                    BoardId = createDto.ToBoardId.Value,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }

                        // 5. Subject Allocations for Teaching Staff
                        if (createDto != null && (staff.StaffType == "Teaching" || string.Equals(staff.StaffType, "Teaching", StringComparison.OrdinalIgnoreCase)))
                        {
                            var targetSubjectIds = new HashSet<int>();
                            if (createDto.AllocatedSubjectIds != null && createDto.AllocatedSubjectIds.Any())
                            {
                                foreach (var sid in createDto.AllocatedSubjectIds.Where(x => x > 0))
                                    targetSubjectIds.Add(sid);
                            }
                            if (createDto.AllocatedSubjectNames != null && createDto.AllocatedSubjectNames.Any())
                            {
                                var allSubjects = await _db.Subjects.AsNoTracking().ToListAsync();
                                foreach (var name in createDto.AllocatedSubjectNames)
                                {
                                    var clean = name?.Trim();
                                    if (string.IsNullOrEmpty(clean)) continue;
                                    var match = allSubjects.FirstOrDefault(s =>
                                        string.Equals(s.SubjectName.Trim(), clean, StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals(s.SubjectCode.Trim(), clean, StringComparison.OrdinalIgnoreCase));
                                    if (match != null) targetSubjectIds.Add(match.SubjectId);
                                }
                            }

                            if (targetSubjectIds.Any())
                            {
                                var existingAllocations = await _db.StaffSubjectAllocations
                                    .Where(a => a.StaffId == staff.Id)
                                    .ToListAsync();

                                foreach (var sid in targetSubjectIds)
                                {
                                    if (!existingAllocations.Any(a => a.SubjectId == sid))
                                    {
                                        _db.StaffSubjectAllocations.Add(new StaffSubjectAllocation
                                        {
                                            StaffId = staff.Id,
                                            SubjectId = sid,
                                            CreatedAt = DateTime.UtcNow
                                        });
                                    }
                                }
                            }
                        }

                        // 6. Role Update for Non-Teaching Staff
                        if (createDto != null && createDto.RoleId.HasValue && createDto.RoleId.Value > 0)
                        {
                            var user = await _db.Users.FirstOrDefaultAsync(u => u.StaffId == staff.Id);
                            if (user != null)
                            {
                                user.RoleId = createDto.RoleId.Value;
                                user.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        else
                        {
                            var user = await _db.Users.FirstOrDefaultAsync(u => u.StaffId == staff.Id);
                            if (user != null)
                            {
                                user.UpdatedAt = DateTime.UtcNow;
                            }
                        }

                        staff.UpdatedAt = DateTime.UtcNow;
                    }

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to execute atomic transfer for StaffTransfer ID {Id}", transfer.Id);
                    throw;
                }
            });

            // Recalculate experience
            try
            {
                await _experienceService.UpdateStaffExperienceColumnAsync(transfer.StaffId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Non-critical error recalculating experience after transfer for StaffId {StaffId}", transfer.StaffId);
            }

            // Send notification email with Transfer Order PDF attachment
            try
            {
                var (pdfBytes, contentType, fileName) = await GenerateTransferOrderPdfAsync(transfer.Id);
                var staff = await _db.Staffs.FirstOrDefaultAsync(s => s.Id == transfer.StaffId);
                if (staff != null && !string.IsNullOrWhiteSpace(staff.Email))
                {
                    string subject = $"Official Campus Transfer Order - {transfer.TransferOrderNumber}";
                    string body = $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;'>
                            <h2>Official Campus Transfer Order</h2>
                            <p>Dear {staff.FirstName} {staff.LastName},</p>
                            <p>Your official campus transfer order <strong>{transfer.TransferOrderNumber}</strong> has been executed by Central Administration.</p>
                            <p>Please find your official transfer order document attached to this email.</p>
                            <p>Best regards,<br/><strong>Central HR Administration</strong><br/>Pirnav Educational Society</p>
                        </div>";

                    await _emailService.SendEmailWithAttachmentAsync(staff.Email, subject, body, pdfBytes, fileName, contentType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch email for transfer order {OrderNo}", transfer.TransferOrderNumber);
            }
        }

        public async Task<StaffTransferResponseDto> ApproveTransferAsync(int transferId, ApproveStaffTransferDto dto, int approvedByUserId)
        {
            var transfer = await _db.StaffTransfers
                .Include(t => t.Staff)
                .FirstOrDefaultAsync(t => t.Id == transferId);

            if (transfer == null)
                throw new NotFoundException($"Transfer record {transferId} not found.");

            if (transfer.Status == "Completed" || transfer.Status == "Approved")
                throw new ValidationException("This transfer has already been approved.");

            var effectiveDate = dto.EffectiveDate?.Date ?? transfer.EffectiveDate.Date;
            transfer.EffectiveDate = effectiveDate;
            transfer.ApprovedByUserId = approvedByUserId;
            if (!string.IsNullOrWhiteSpace(dto.ApprovalRemarks))
            {
                transfer.ApprovalRemarks = dto.ApprovalRemarks;
            }

            // Parse any stored metadata from ApprovalRemarks
            CreateStaffTransferDto? metadataDto = null;
            if (!string.IsNullOrWhiteSpace(transfer.ApprovalRemarks) && transfer.ApprovalRemarks.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(transfer.ApprovalRemarks);
                    var root = doc.RootElement;
                    metadataDto = new CreateStaffTransferDto
                    {
                        StaffId = transfer.StaffId,
                        ToCampusId = transfer.ToCampusId,
                        ToDepartmentId = transfer.ToDepartmentId,
                        ToDesignationId = transfer.ToDesignationId
                    };
                    if (root.TryGetProperty("toBoardId", out var bi) && bi.TryGetInt32(out var bVal)) metadataDto.ToBoardId = bVal;
                    if (root.TryGetProperty("toBoardName", out var bn)) metadataDto.ToBoardName = bn.GetString();
                    if (root.TryGetProperty("roleId", out var ri) && ri.TryGetInt32(out var rVal)) metadataDto.RoleId = rVal;
                    if (root.TryGetProperty("allocatedSubjectIds", out var asids) && asids.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        metadataDto.AllocatedSubjectIds = asids.EnumerateArray().Select(x => x.GetInt32()).ToList();
                    }
                    if (root.TryGetProperty("allocatedSubjects", out var asnames) && asnames.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        metadataDto.AllocatedSubjectNames = asnames.EnumerateArray().Select(x => x.GetString() ?? "").Where(x => !string.IsNullOrEmpty(x)).ToList();
                    }
                }
                catch {}
            }

            await ExecuteTransferInternalAsync(transfer, metadataDto, approvedByUserId);
            return await MapToResponseDtoAsync(transfer.Id);
        }

        public async Task<StaffTransferResponseDto> RejectTransferAsync(int transferId, RejectStaffTransferDto dto, int rejectedByUserId)
        {
            var transfer = await _db.StaffTransfers.FirstOrDefaultAsync(t => t.Id == transferId);
            if (transfer == null)
                throw new NotFoundException($"Transfer record {transferId} not found.");

            if (transfer.Status == "Completed" || transfer.Status == "Approved")
                throw new ValidationException("A completed transfer cannot be rejected.");

            transfer.Status = "Rejected";
            transfer.ApprovedByUserId = rejectedByUserId;
            transfer.ApprovalRemarks = dto.Remarks;
            transfer.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await MapToResponseDtoAsync(transfer.Id);
        }

        public async Task<StaffTransferResponseDto> GetTransferByIdAsync(int transferId)
        {
            return await MapToResponseDtoAsync(transferId);
        }

        public async Task<IEnumerable<StaffTransferResponseDto>> GetTransfersAsync(int? campusId = null, string? status = null)
        {
            var query = _db.StaffTransfers
                .Include(t => t.Staff)
                .Include(t => t.FromCampus)
                .Include(t => t.ToCampus)
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(t => t.FromCampusId == campusId.Value || t.ToCampusId == campusId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(t => t.Status == status);
            }

            var list = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            var dtos = new List<StaffTransferResponseDto>();
            foreach (var item in list)
            {
                dtos.Add(await MapEntityToDto(item));
            }
            return dtos;
        }

        public async Task<IEnumerable<StaffTransferResponseDto>> GetStaffTransferHistoryAsync(int staffId)
        {
            var list = await _db.StaffTransfers
                .Include(t => t.Staff)
                .Include(t => t.FromCampus)
                .Include(t => t.ToCampus)
                .Where(t => t.StaffId == staffId)
                .OrderByDescending(t => t.EffectiveDate)
                .ToListAsync();

            var dtos = new List<StaffTransferResponseDto>();
            foreach (var item in list)
            {
                dtos.Add(await MapEntityToDto(item));
            }
            return dtos;
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateTransferOrderPdfAsync(int transferId)
        {
            var transfer = await _db.StaffTransfers
                .Include(t => t.Staff)
                .Include(t => t.FromCampus)
                .Include(t => t.ToCampus)
                .FirstOrDefaultAsync(t => t.Id == transferId);

            if (transfer == null)
                throw new NotFoundException($"Transfer record {transferId} not found.");

            var model = new StaffTransferOrderModel
            {
                TransferOrderNumber = transfer.TransferOrderNumber,
                StaffName = $"{transfer.Staff?.FirstName} {transfer.Staff?.LastName}".Trim(),
                EmployeeId = transfer.Staff?.EmployeeId ?? "PCTCH0000",
                Designation = transfer.Staff?.Designation ?? "Faculty Member",
                FromCampus = transfer.FromCampus?.CampusName ?? $"Campus #{transfer.FromCampusId}",
                ToCampus = transfer.ToCampus?.CampusName ?? $"Campus #{transfer.ToCampusId}",
                EffectiveDate = transfer.EffectiveDate,
                RelievingDate = transfer.RelievingDate,
                JoiningDate = transfer.JoiningDate,
                TransferType = transfer.TransferType,
                TransferReason = transfer.Reason,
                ApprovedBy = "Director of Human Resources",
                InstitutionName = _configuration["InstitutionSettings:InstitutionName"] ?? "PIRNAV EDUCATIONAL SOCIETY"
            };

            var doc = new StaffTransferOrderDocument(model);
            byte[] bytes = doc.GeneratePdf();
            string cleanOrderNo = transfer.TransferOrderNumber.Replace("/", "_").Replace("-", "_");
            return (bytes, "application/pdf", $"Transfer_Order_{cleanOrderNo}.pdf");
        }

        private async Task<StaffTransferResponseDto> MapToResponseDtoAsync(int transferId)
        {
            var item = await _db.StaffTransfers
                .Include(t => t.Staff)
                .Include(t => t.FromCampus)
                .Include(t => t.ToCampus)
                .FirstOrDefaultAsync(t => t.Id == transferId);

            if (item == null)
                throw new NotFoundException($"Transfer with ID {transferId} not found.");

            return await MapEntityToDto(item);
        }

        private async Task<StaffTransferResponseDto> MapEntityToDto(StaffTransfer item)
        {
            string? reqName = null;
            if (item.RequestedByUserId > 0)
            {
                var reqUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == item.RequestedByUserId);
                reqName = reqUser?.FullName;
            }

            string? appName = null;
            if (item.ApprovedByUserId.HasValue && item.ApprovedByUserId.Value > 0)
            {
                var appUser = await _db.Users.FirstOrDefaultAsync(u => u.UserId == item.ApprovedByUserId.Value);
                appName = appUser?.FullName;
            }

            string? fromDeptName = null;
            if (item.FromDepartmentId.HasValue)
            {
                var d = await _db.Departments.FirstOrDefaultAsync(x => x.DepartmentId == item.FromDepartmentId.Value);
                fromDeptName = d?.DepartmentName;
            }

            string? toDeptName = null;
            if (item.ToDepartmentId.HasValue)
            {
                var d = await _db.Departments.FirstOrDefaultAsync(x => x.DepartmentId == item.ToDepartmentId.Value);
                toDeptName = d?.DepartmentName;
            }

            int? metaBoardId = null;
            string? metaBoardName = null;
            List<string>? metaSubjects = null;

            if (!string.IsNullOrWhiteSpace(item.ApprovalRemarks) && item.ApprovalRemarks.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(item.ApprovalRemarks);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("toBoardId", out var bi) && bi.TryGetInt32(out var bVal)) metaBoardId = bVal;
                    if (root.TryGetProperty("toBoardName", out var bn)) metaBoardName = bn.GetString();
                    if (root.TryGetProperty("allocatedSubjects", out var asnames) && asnames.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        metaSubjects = asnames.EnumerateArray().Select(x => x.GetString() ?? "").Where(x => !string.IsNullOrEmpty(x)).ToList();
                    }
                }
                catch {}
            }

            return new StaffTransferResponseDto
            {
                Id = item.Id,
                TransferOrderNumber = item.TransferOrderNumber,
                StaffId = item.StaffId,
                StaffName = $"{item.Staff?.FirstName} {item.Staff?.LastName}".Trim(),
                EmployeeId = item.Staff?.EmployeeId ?? string.Empty,
                StaffType = item.Staff?.StaffType ?? "Teaching",
                FromCampusId = item.FromCampusId,
                FromCampusName = item.FromCampus?.CampusName ?? string.Empty,
                ToCampusId = item.ToCampusId,
                ToCampusName = item.ToCampus?.CampusName ?? string.Empty,
                FromDepartmentId = item.FromDepartmentId,
                FromDepartmentName = fromDeptName,
                ToDepartmentId = item.ToDepartmentId,
                ToDepartmentName = toDeptName,
                FromDesignationId = item.FromDesignationId,
                FromDesignationName = item.Staff?.Designation,
                ToDesignationId = item.ToDesignationId,
                ToDesignationName = item.Staff?.Designation,
                ToBoardId = metaBoardId,
                ToBoardName = metaBoardName,
                AllocatedSubjects = metaSubjects,
                TransferType = item.TransferType,
                Reason = item.Reason,
                RequestedByUserId = item.RequestedByUserId,
                RequestedByName = reqName,
                ApprovedByUserId = item.ApprovedByUserId,
                ApprovedByName = appName,
                RequestDate = item.RequestDate,
                EffectiveDate = item.EffectiveDate,
                RelievingDate = item.RelievingDate,
                JoiningDate = item.JoiningDate,
                Status = item.Status,
                ApprovalRemarks = item.ApprovalRemarks,
                GeneratedDocumentId = item.GeneratedDocumentId,
                CreatedAt = item.CreatedAt
            };
        }
    }
}
