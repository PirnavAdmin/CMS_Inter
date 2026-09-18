using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Models.Holiday;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class HolidayService : IHolidayService
    {
        private readonly IHolidayRepository _holidayRepository;

        public HolidayService(IHolidayRepository holidayRepository)
        {
            _holidayRepository = holidayRepository;
        }

        public async Task<HolidaySummaryResponse> GetSummaryAsync(int? academicYearId, int? boardId)
        {
            return await _holidayRepository.GetSummaryAsync(academicYearId, boardId);
        }

        public async Task<(IEnumerable<HolidayResponse> Items, int TotalCount, int TotalPages)> GetPagedHolidaysAsync(HolidayFilterRequest filter)
        {
            var (items, totalCount) = await _holidayRepository.GetPagedHolidaysAsync(filter);
            var pageSize = filter.PageSize < 1 ? 10 : filter.PageSize;
            var totalPages = Math.Max(1, (int)Math.Ceiling((double)totalCount / pageSize));

            var dtos = items.Select(MapToResponse).ToList();
            return (dtos, totalCount, totalPages);
        }

        public async Task<HolidayResponse?> GetByIdAsync(int id)
        {
            var holiday = await _holidayRepository.GetByIdAsync(id);
            return holiday == null ? null : MapToResponse(holiday);
        }

        public async Task<HolidayResponse> CreateAsync(CreateHolidayRequest request)
        {
            ValidateHolidayRequest(request);

            var effectiveEndDate = request.DateType == "Date Range" && request.EndDate.HasValue
                ? request.EndDate.Value
                : request.StartDate;

            var isDuplicate = await _holidayRepository.ExistsDuplicateAsync(
                request.HolidayName,
                request.StartDate,
                effectiveEndDate,
                null,
                request.AcademicYearId);

            if (isDuplicate)
            {
                throw new ValidationException("A holiday with the same name and date already exists.");
            }

            var entity = new Holiday
            {
                HolidayName = request.HolidayName.Trim(),
                HolidayType = request.HolidayType.Trim(),
                AppliesTo = request.AppliesTo.Trim(),
                DateType = request.DateType.Trim(),
                StartDate = request.StartDate.ToDateTime(TimeOnly.MinValue),
                EndDate = effectiveEndDate.ToDateTime(TimeOnly.MinValue),
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                AcademicYearId = request.AcademicYearId,
                BoardId = request.BoardId
            };

            var created = await _holidayRepository.CreateAsync(entity);
            return MapToResponse(created);
        }

        public async Task<HolidayResponse?> UpdateAsync(int id, UpdateHolidayRequest request)
        {
            ValidateHolidayRequest(request);

            var existing = await _holidayRepository.GetByIdAsync(id);
            if (existing == null) return null;

            var effectiveEndDate = request.DateType == "Date Range" && request.EndDate.HasValue
                ? request.EndDate.Value
                : request.StartDate;

            var isDuplicate = await _holidayRepository.ExistsDuplicateAsync(
                request.HolidayName,
                request.StartDate,
                effectiveEndDate,
                id,
                request.AcademicYearId);

            if (isDuplicate)
            {
                throw new ValidationException("A holiday with the same name and date already exists.");
            }

            existing.HolidayName = request.HolidayName.Trim();
            existing.HolidayType = request.HolidayType.Trim();
            existing.AppliesTo = request.AppliesTo.Trim();
            existing.DateType = request.DateType.Trim();
            existing.StartDate = request.StartDate.ToDateTime(TimeOnly.MinValue);
            existing.EndDate = effectiveEndDate.ToDateTime(TimeOnly.MinValue);
            existing.Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim();
            existing.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            existing.AcademicYearId = request.AcademicYearId;
            existing.BoardId = request.BoardId;

            var updated = await _holidayRepository.UpdateAsync(id, existing);
            return updated == null ? null : MapToResponse(updated);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await _holidayRepository.DeleteAsync(id);
        }

        private static void ValidateHolidayRequest(CreateHolidayRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.HolidayName))
                throw new ValidationException("Holiday name is required.");

            if (request.DateType == "Date Range")
            {
                if (!request.EndDate.HasValue)
                    throw new ValidationException("End date is required for Date Range holidays.");

                if (request.EndDate.Value < request.StartDate)
                    throw new ValidationException("End date must be on or after the start date.");
            }
        }

        private static HolidayResponse MapToResponse(Holiday holiday)
        {
            var startDate = DateOnly.FromDateTime(holiday.StartDate);
            var endDate = DateOnly.FromDateTime(holiday.EndDate);
            var today = DateOnly.FromDateTime(DateTime.Today);
            string lifecycleStatus;

            if (string.Equals(holiday.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                lifecycleStatus = "Inactive";
            }
            else if (endDate < today)
            {
                lifecycleStatus = "Completed";
            }
            else
            {
                lifecycleStatus = "Active";
            }

            string formattedRange;
            var startStr = startDate.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);
            if (holiday.DateType == "Date Range" && endDate > startDate)
            {
                var endStr = endDate.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);
                formattedRange = $"{startStr} - {endStr}";
            }
            else
            {
                formattedRange = startStr;
            }

            return new HolidayResponse
            {
                Id = holiday.Id,
                HolidayCode = holiday.HolidayCode,
                AcademicYearId = holiday.AcademicYearId,
                BoardId = holiday.BoardId,
                HolidayName = holiday.HolidayName,
                HolidayType = holiday.HolidayType,
                AppliesTo = holiday.AppliesTo,
                DateType = holiday.DateType,
                StartDate = startDate,
                EndDate = endDate,
                FormattedDateRange = formattedRange,
                Status = holiday.Status,
                LifecycleStatus = lifecycleStatus,
                Description = holiday.Description,
                CreatedAt = holiday.CreatedAt,
                UpdatedAt = holiday.UpdatedAt
            };
        }
    }
}
