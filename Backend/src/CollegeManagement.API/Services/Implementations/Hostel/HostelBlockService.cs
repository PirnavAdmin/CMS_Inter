using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelBlockService : IHostelBlockService
    {
        private readonly IHostelBlockRepository _repository;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelBlockService(IHostelBlockRepository repository, IHttpContextAccessor? httpContextAccessor = null)
        {
            _repository = repository;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<IEnumerable<HostelBlockResponseDto>> GetAllAsync(
            string? search = null,
            string? status = null,
            int? campusId = null)
        {
            var hostels = await _repository.GetAllAsync(search, status, campusId);

            return hostels.Select(MapToResponse);
        }

        public async Task<HostelBlockResponseDto?> GetByIdAsync(int hostelId)
        {
            var hostel = await _repository.GetByIdAsync(hostelId);

            if (hostel == null)
            {
                return null;
            }

            return MapToResponse(hostel);
        }

        public async Task<(bool Success, string Message, HostelBlockResponseDto? Data)>
            CreateAsync(CreateHostelBlockDto dto)
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            int? resolvedCampusId = dto.CampusId;
            if ((!resolvedCampusId.HasValue || resolvedCampusId.Value <= 0) && httpContext != null)
            {
                resolvedCampusId = CampusContextResolver.ResolveCampusId(httpContext.User, httpContext.Request, dto.CampusId);
            }

            if (resolvedCampusId == TenantIsolationActionFilter.NoCampusSentinel ||
                (httpContext != null && (!resolvedCampusId.HasValue || resolvedCampusId.Value <= 0)))
            {
                return (
                    false,
                    "Please create or select a valid campus before adding a hostel block.",
                    null
                );
            }

            int? effectiveCampusId = resolvedCampusId.HasValue && resolvedCampusId.Value > 0
                ? resolvedCampusId.Value
                : null;

            var existing = await _repository.GetByCodeAsync(dto.HostelCode.Trim(), effectiveCampusId);

            if (existing != null)
            {
                return (
                    false,
                    "Hostel code already exists.",
                    null
                );
            }

            int collegeId = CampusContextResolver.ResolveCollegeId(httpContext?.User, httpContext?.Request) ?? 0;

            var hostel = new HostelBlock
            {
                CollegeId = collegeId,
                CampusId = effectiveCampusId,
                HostelName = dto.HostelName.Trim(),
                HostelCode = dto.HostelCode.Trim(),
                HostelType = dto.HostelType.Trim(),
                TotalFloors = dto.TotalFloors,
                PrimaryMobileNumber = dto.PrimaryMobileNumber?.Trim(),
                AlternateMobileNumber = dto.AlternateMobileNumber?.Trim(),
                Email = dto.Email?.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim(),
                Address = dto.Address?.Trim()
            };

            var id = await _repository.CreateAsync(hostel);

            hostel.HostelId = id;

            var created = await _repository.GetByIdAsync(id);

            return (
                true,
                "Hostel block created successfully.",
                created == null ? MapToResponse(hostel) : MapToResponse(created)
            );
        }

        public async Task<(bool Success, string Message, HostelBlockResponseDto? Data)>
            UpdateAsync(int hostelId, UpdateHostelBlockDto dto)
        {
            var hostel = await _repository.GetByIdAsync(hostelId);

            if (hostel == null)
            {
                return (
                    false,
                    "Hostel block not found.",
                    null
                );
            }

            int? effectiveCampusId = dto.CampusId.HasValue
                && dto.CampusId.Value > 0
                && dto.CampusId.Value != TenantIsolationActionFilter.NoCampusSentinel
                ? dto.CampusId.Value
                : hostel.CampusId;

            var existingCode =
                await _repository.GetByCodeAsync(dto.HostelCode.Trim(), effectiveCampusId);

            if (existingCode != null &&
                existingCode.HostelId != hostelId)
            {
                return (
                    false,
                    "Hostel code already exists.",
                    null
                );
            }

            hostel.CampusId = effectiveCampusId;
            hostel.HostelName = dto.HostelName.Trim();
            hostel.HostelCode = dto.HostelCode.Trim();
            hostel.HostelType = dto.HostelType.Trim();
            hostel.TotalFloors = dto.TotalFloors;
            hostel.PrimaryMobileNumber = dto.PrimaryMobileNumber?.Trim();
            hostel.AlternateMobileNumber = dto.AlternateMobileNumber?.Trim();
            hostel.Email = dto.Email?.Trim();
            hostel.Status = string.IsNullOrWhiteSpace(dto.Status)
                ? "Active"
                : dto.Status.Trim();
            hostel.Address = dto.Address?.Trim();

            var updated = await _repository.UpdateAsync(hostel);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update hostel block.",
                    null
                );
            }

            var result = await _repository.GetByIdAsync(hostelId);

            return (
                true,
                "Hostel block updated successfully.",
                result == null ? MapToResponse(hostel) : MapToResponse(result)
            );
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int hostelId)
        {
            var exists = await _repository.ExistsAsync(hostelId);

            if (!exists)
            {
                return (
                    false,
                    "Hostel block not found."
                );
            }

            var deleted = await _repository.DeleteAsync(hostelId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete hostel block."
                );
            }

            return (
                true,
                "Hostel block deleted successfully."
            );
        }

        private static HostelBlockResponseDto MapToResponse(
            HostelBlock hostel)
        {
            return new HostelBlockResponseDto
            {
                HostelId = hostel.HostelId,
                CampusId = hostel.CampusId,
                HostelName = hostel.HostelName,
                HostelCode = hostel.HostelCode,
                HostelType = hostel.HostelType,
                TotalFloors = hostel.TotalFloors,
                WardenName = hostel.WardenName,
                PrimaryMobileNumber = hostel.PrimaryMobileNumber,
                AlternateMobileNumber = hostel.AlternateMobileNumber,
                Email = hostel.Email,
                Status = hostel.Status,
                Address = hostel.Address,
                CreatedAt = hostel.CreatedAt
            };
        }
    }
}