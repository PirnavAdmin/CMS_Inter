using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelBlockService : IHostelBlockService
    {
        private readonly IHostelBlockRepository _repository;

        public HostelBlockService(IHostelBlockRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<HostelBlockResponseDto>> GetAllAsync(
            string? search = null,
            string? status = null)
        {
            var hostels = await _repository.GetAllAsync(search, status);

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
            var existing = await _repository.GetByCodeAsync(dto.HostelCode.Trim());

            if (existing != null)
            {
                return (
                    false,
                    "Hostel code already exists.",
                    null
                );
            }

            var hostel = new HostelBlock
            {
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

            var existingCode =
                await _repository.GetByCodeAsync(dto.HostelCode.Trim());

            if (existingCode != null &&
                existingCode.HostelId != hostelId)
            {
                return (
                    false,
                    "Hostel code already exists.",
                    null
                );
            }

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