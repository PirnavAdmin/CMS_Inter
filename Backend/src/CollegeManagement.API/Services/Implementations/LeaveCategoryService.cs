using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveCategoryService : ILeaveCategoryService
    {
        private readonly ILeaveCategoryRepository _repository;

        public LeaveCategoryService(ILeaveCategoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var categories = await _repository.GetAllAsync(ct);
            return categories.Select(MapToResponseDto).ToList();
        }

        public async Task<LeaveCategoryResponseDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return null;
            var category = await _repository.GetByIdAsync(id, ct);
            return category == null ? null : MapToResponseDto(category);
        }

        public async Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto, CancellationToken ct = default)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var codeUpper = (dto.CategoryCode ?? string.Empty).Trim().ToUpper();
            var nameTrimmed = (dto.CategoryName ?? string.Empty).Trim();

            var exists = await _repository.ExistsByCodeAsync(codeUpper, null, ct);
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

            var created = await _repository.CreateAsync(category, ct);

            // Auto-initialize balances for all active eligible staff members via SP
            await _repository.SyncStaffLeaveBalancesAsync(created.LeaveCategoryId, ct);

            return MapToResponseDto(created);
        }

        public async Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto, CancellationToken ct = default)
        {
            if (id <= 0)
                throw new NotFoundException($"Leave category with ID {id} not found.");

            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var existing = await _repository.GetByIdAsync(id, ct);
            if (existing == null)
            {
                throw new NotFoundException($"Leave category with ID {id} not found.");
            }

            var codeUpper = (dto.CategoryCode ?? string.Empty).Trim().ToUpper();
            var nameTrimmed = (dto.CategoryName ?? string.Empty).Trim();

            var codeExists = await _repository.ExistsByCodeAsync(codeUpper, id, ct);
            if (codeExists)
            {
                throw new ConflictException($"Leave category with code '{codeUpper}' already exists.");
            }

            existing.CategoryName = nameTrimmed;
            existing.CategoryCode = codeUpper;
            existing.AnnualQuota = dto.AnnualQuota;
            existing.ApplicableStaffType = string.IsNullOrWhiteSpace(dto.ApplicableStaffType) ? "All Staff" : dto.ApplicableStaffType.Trim();
            existing.AllowCarryForward = dto.AllowCarryForward;
            existing.RequiresProof = dto.RequiresProof;
            existing.Description = dto.Description?.Trim();
            existing.DisplayOrder = dto.DisplayOrder;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(existing, ct);
            if (updated == null)
            {
                throw new NotFoundException($"Leave category with ID {id} not found.");
            }

            return MapToResponseDto(updated);
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return false;
            var success = await _repository.DeleteAsync(id, ct);
            if (!success)
            {
                throw new NotFoundException($"Leave category with ID {id} not found.");
            }
            return true;
        }

        public async Task<bool> ResetDefaultsAsync(CancellationToken ct = default)
        {
            return await _repository.ResetDefaultsAsync(ct);
        }

        public async Task<LeaveCategorySummaryDto> GetSummaryAsync(CancellationToken ct = default)
        {
            var (allowance, total, badges) = await _repository.GetSummaryAsync(ct);

            return new LeaveCategorySummaryDto
            {
                StandardAnnualAllowance = allowance,
                TotalCategories = total,
                Badges = badges
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
