using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveCategoryService : ILeaveCategoryService
    {
        private readonly AppDbContext _context;

        public LeaveCategoryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync()
        {
            var categories = await _context.LeaveCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.LeaveCategoryId)
                .ToListAsync();

            return categories.Select(MapToResponseDto).ToList();
        }

        public async Task<LeaveCategoryResponseDto?> GetByIdAsync(int id)
        {
            var category = await _context.LeaveCategories
                .FirstOrDefaultAsync(c => c.LeaveCategoryId == id && c.IsActive);

            return category == null ? null : MapToResponseDto(category);
        }

        public async Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto)
        {
            var codeUpper = (dto.CategoryCode ?? string.Empty).Trim().ToUpper();
            var nameTrimmed = (dto.CategoryName ?? string.Empty).Trim();

            var exists = await _context.LeaveCategories
                .AnyAsync(c => c.IsActive && c.CategoryCode.ToUpper() == codeUpper);

            if (exists)
            {
                throw new ConflictException($"Leave category with code '{codeUpper}' already exists.");
            }

            var category = new LeaveCategory
            {
                CategoryName = nameTrimmed,
                CategoryCode = codeUpper,
                AnnualQuota = dto.AnnualQuota,
                ApplicableStaffType = string.IsNullOrWhiteSpace(dto.ApplicableStaffType) ? "All Staff" : dto.ApplicableStaffType.Trim(),
                AllowCarryForward = dto.AllowCarryForward,
                RequiresProof = dto.RequiresProof,
                Description = dto.Description?.Trim(),
                DisplayOrder = dto.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.LeaveCategories.Add(category);
            await _context.SaveChangesAsync();

            // Auto-initialize balances for all active eligible staff members
            await AutoInitializeBalancesForCategoryAsync(category);

            return MapToResponseDto(category);
        }

        public async Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto)
        {
            var category = await _context.LeaveCategories
                .FirstOrDefaultAsync(c => c.LeaveCategoryId == id);

            if (category == null)
            {
                throw new NotFoundException($"Leave category with ID {id} not found.");
            }

            var codeUpper = (dto.CategoryCode ?? string.Empty).Trim().ToUpper();
            var nameTrimmed = (dto.CategoryName ?? string.Empty).Trim();

            var codeExists = await _context.LeaveCategories
                .AnyAsync(c => c.LeaveCategoryId != id && c.IsActive && c.CategoryCode.ToUpper() == codeUpper);

            if (codeExists)
            {
                throw new ConflictException($"Leave category with code '{codeUpper}' already exists.");
            }

            var oldQuota = category.AnnualQuota;
            category.CategoryName = nameTrimmed;
            category.CategoryCode = codeUpper;
            category.AnnualQuota = dto.AnnualQuota;
            category.ApplicableStaffType = string.IsNullOrWhiteSpace(dto.ApplicableStaffType) ? "All Staff" : dto.ApplicableStaffType.Trim();
            category.AllowCarryForward = dto.AllowCarryForward;
            category.RequiresProof = dto.RequiresProof;
            category.Description = dto.Description?.Trim();
            category.DisplayOrder = dto.DisplayOrder;
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTime.UtcNow;

            // If quota changed, adjust balances
            if (oldQuota != dto.AnnualQuota)
            {
                var balances = await _context.StaffLeaveBalances
                    .Where(b => b.LeaveCategoryId == id)
                    .ToListAsync();

                foreach (var bal in balances)
                {
                    bal.TotalDays = dto.AnnualQuota;
                    bal.RemainingDays = Math.Max(0, dto.AnnualQuota - bal.UsedDays);
                    bal.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return MapToResponseDto(category);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var category = await _context.LeaveCategories
                .FirstOrDefaultAsync(c => c.LeaveCategoryId == id);

            if (category == null)
            {
                throw new NotFoundException($"Leave category with ID {id} not found.");
            }

            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ResetDefaultsAsync()
        {
            var defaults = new List<(string Name, string Code, decimal Quota, string StaffType, bool Carry, bool Proof, string Desc, int Order)>
            {
                ("Casual Leave", "CL", 12.00m, "All Staff", true, false, "Standard casual leave for personal reasons, emergencies, or short absences.", 1),
                ("Sick Leave", "SL", 10.00m, "All Staff", true, true, "Medical leave for illness, surgery, health appointments, or medical recovery.", 2),
                ("Earned Leave", "EL", 15.00m, "Teaching Staff Only", true, false, "Accumulated annual vacation/privilege leave credited per academic term.", 3),
                ("Maternity Leave", "ML", 17.00m, "All Staff", false, true, "Fully paid parental leave for expecting and new mothers.", 4),
                ("Compensatory Off", "CO", 5.00m, "Non-Teaching Staff", false, false, "Compensatory rest for extra duties performed on scheduled holidays or institutional events.", 5)
            };

            foreach (var item in defaults)
            {
                var existing = await _context.LeaveCategories
                    .FirstOrDefaultAsync(c => c.CategoryCode == item.Code);

                if (existing != null)
                {
                    existing.CategoryName = item.Name;
                    existing.AnnualQuota = item.Quota;
                    existing.ApplicableStaffType = item.StaffType;
                    existing.AllowCarryForward = item.Carry;
                    existing.RequiresProof = item.Proof;
                    existing.Description = item.Desc;
                    existing.DisplayOrder = item.Order;
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.LeaveCategories.Add(new LeaveCategory
                    {
                        CategoryName = item.Name,
                        CategoryCode = item.Code,
                        AnnualQuota = item.Quota,
                        ApplicableStaffType = item.StaffType,
                        AllowCarryForward = item.Carry,
                        RequiresProof = item.Proof,
                        Description = item.Desc,
                        DisplayOrder = item.Order,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LeaveCategorySummaryDto> GetSummaryAsync()
        {
            var activeCategories = await _context.LeaveCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.LeaveCategoryId)
                .ToListAsync();

            // Baseline allowance matches standard baseline categories (CL 12d + SL 10d + EL 15d = 37 Days in UI)
            // or sum of general categories
            var baselineCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "CL", "SL", "EL" };
            var baselineTotal = activeCategories
                .Where(c => baselineCodes.Contains(c.CategoryCode))
                .Sum(c => c.AnnualQuota);

            if (baselineTotal == 0 && activeCategories.Any())
            {
                baselineTotal = activeCategories.Sum(c => c.AnnualQuota);
            }

            var badges = activeCategories.Select(c => new LeaveCategoryBadgeDto
            {
                Code = c.CategoryCode,
                Days = c.AnnualQuota,
                Label = c.CategoryName.Replace("Leave", "").Trim()
            }).ToList();

            return new LeaveCategorySummaryDto
            {
                StandardAnnualAllowance = baselineTotal,
                TotalCategories = activeCategories.Count,
                Badges = badges
            };
        }

        private async Task AutoInitializeBalancesForCategoryAsync(LeaveCategory category)
        {
            try
            {
                var currentYear = await _context.AcademicYears
                    .FirstOrDefaultAsync(y => y.IsActive);

                if (currentYear == null) return;

                var staffQuery = _context.Staffs.Where(s => !s.IsDeleted);

                if (category.ApplicableStaffType.Equals("Teaching Staff Only", StringComparison.OrdinalIgnoreCase))
                {
                    staffQuery = staffQuery.Where(s => s.StaffType == "Teaching");
                }
                else if (category.ApplicableStaffType.Equals("Non-Teaching Staff", StringComparison.OrdinalIgnoreCase))
                {
                    staffQuery = staffQuery.Where(s => s.StaffType != "Teaching");
                }

                var eligibleStaff = await staffQuery.Select(s => s.Id).ToListAsync();

                var existingBalanceStaffIds = await _context.StaffLeaveBalances
                    .Where(b => b.LeaveCategoryId == category.LeaveCategoryId && b.AcademicYearId == currentYear.AcademicYearId)
                    .Select(b => b.StaffId)
                    .ToListAsync();

                var toAdd = new List<StaffLeaveBalance>();
                foreach (var staffId in eligibleStaff)
                {
                    if (!existingBalanceStaffIds.Contains(staffId))
                    {
                        toAdd.Add(new StaffLeaveBalance
                        {
                            StaffId = staffId,
                            LeaveCategoryId = category.LeaveCategoryId,
                            LeaveType = MapCodeToLeaveType(category.CategoryCode),
                            AcademicYearId = currentYear.AcademicYearId,
                            TotalDays = category.AnnualQuota,
                            UsedDays = 0,
                            RemainingDays = category.AnnualQuota,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                if (toAdd.Any())
                {
                    _context.StaffLeaveBalances.AddRange(toAdd);
                    await _context.SaveChangesAsync();
                }
            }
            catch
            {
                // Non-blocking fallback so category creation succeeds
            }
        }

        private static LeaveType MapCodeToLeaveType(string code)
        {
            return (code?.ToUpper()) switch
            {
                "CL" => LeaveType.Casual,
                "SL" => LeaveType.Sick,
                "EL" => LeaveType.Earned,
                "ML" => LeaveType.Maternity,
                _ => LeaveType.Other
            };
        }

        private static LeaveCategoryResponseDto MapToResponseDto(LeaveCategory c)
        {
            return new LeaveCategoryResponseDto
            {
                LeaveCategoryId = c.LeaveCategoryId,
                CategoryName = c.CategoryName,
                CategoryCode = c.CategoryCode,
                AnnualQuota = c.AnnualQuota,
                ApplicableStaffType = c.ApplicableStaffType,
                AllowCarryForward = c.AllowCarryForward,
                RequiresProof = c.RequiresProof,
                Description = c.Description,
                IsActive = c.IsActive,
                DisplayOrder = c.DisplayOrder,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            };
        }
    }
}
