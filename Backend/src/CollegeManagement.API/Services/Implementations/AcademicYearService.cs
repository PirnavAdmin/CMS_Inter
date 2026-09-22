using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MiniExcelLibs;

namespace CollegeManagement.API.Services.Implementations
{
    public class AcademicYearService : IAcademicYearService
    {
        private readonly IAcademicYearRepository _repository;

        public AcademicYearService(IAcademicYearRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync()
        {
            var years = await _repository.GetAllAsync();
            return years.Select(MapToResponseDto);
        }

        public async Task<PagedAcademicYearResponseDto> GetPagedAsync(AcademicYearSearchRequestDto request)
        {
            int pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            var (items, totalCount) = await _repository.GetPagedAsync(
                request.Search,
                request.Status,
                pageNumber,
                pageSize);

            return new PagedAcademicYearResponseDto
            {
                Items = items.Select(MapToResponseDto),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<IEnumerable<AcademicYearResponseDto>> GetActiveAsync()
        {
            var years = await _repository.GetAllAsync();
            return years.Where(y => y.IsActive).Select(MapToResponseDto);
        }

        public async Task<AcademicYearResponseDto?> GetByIdAsync(int id)
        {
            var year = await _repository.GetByIdAsync(id);
            return year == null ? null : MapToResponseDto(year);
        }

        public async Task<AcademicYearResponseDto> CreateAsync(CreateAcademicYearDto dto)
        {
            ValidateDates(dto.StartDate, dto.EndDate, dto.AdmissionStartDate, dto.AdmissionEndDate);

            var academicYear = new AcademicYear
            {
                AcademicYearName = dto.AcademicYearName.Trim(),
                BoardId = dto.BoardId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                AdmissionStartDate = dto.AdmissionStartDate,
                AdmissionEndDate = dto.AdmissionEndDate,
                IsActive = dto.IsActive,
                Description = dto.Description?.Trim()
            };

            await _repository.AddAsync(academicYear);
            var reloaded = await _repository.GetByIdAsync(academicYear.AcademicYearId);
            return MapToResponseDto(reloaded ?? academicYear);
        }

        public async Task<AcademicYearResponseDto?> UpdateAsync(int id, UpdateAcademicYearDto dto)
        {
            ValidateDates(dto.StartDate, dto.EndDate, dto.AdmissionStartDate, dto.AdmissionEndDate);

            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return null;
            }

            academicYear.AcademicYearName = dto.AcademicYearName.Trim();
            academicYear.BoardId = dto.BoardId;
            academicYear.StartDate = dto.StartDate;
            academicYear.EndDate = dto.EndDate;
            academicYear.AdmissionStartDate = dto.AdmissionStartDate;
            academicYear.AdmissionEndDate = dto.AdmissionEndDate;
            academicYear.IsActive = dto.IsActive;
            academicYear.Description = dto.Description?.Trim();

            await _repository.UpdateAsync(academicYear);
            var reloaded = await _repository.GetByIdAsync(id);
            return MapToResponseDto(reloaded ?? academicYear);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return false;
            }

            await _repository.DeleteAsync(academicYear);
            return true;
        }

        public async Task<bool> ActivateAsync(int id)
        {
            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return false;
            }

            if (academicYear.IsActive)
            {
                return true;
            }

            academicYear.IsActive = true;
            await _repository.UpdateAsync(academicYear);
            return true;
        }

        public async Task<bool> DeactivateAsync(int id)
        {
            var academicYear = await _repository.GetByIdAsync(id);
            if (academicYear == null)
            {
                return false;
            }

            academicYear.IsActive = false;
            await _repository.UpdateAsync(academicYear);
            return true;
        }

        public async Task<byte[]> ExportToCsvAsync(string? search, bool? status)
        {
            var years = await _repository.GetForExportAsync(search, status);
            var sb = new StringBuilder();
            sb.AppendLine("AcademicYearId,AcademicYearName,BoardName,StartDate,EndDate,AdmissionPeriod,Status,Description");

            foreach (var y in years)
            {
                var dto = MapToResponseDto(y);
                sb.AppendLine($"\"{dto.AcademicYearId}\",\"{dto.AcademicYearName}\",\"{dto.BoardName ?? "—"}\",\"{dto.StartDate:dd MMM yyyy}\",\"{dto.EndDate:dd MMM yyyy}\",\"{dto.AdmissionPeriod ?? "—"}\",\"{dto.Status}\",\"{dto.Description ?? ""}\"");
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportToExcelAsync(string? search, bool? status)
        {
            var years = await _repository.GetForExportAsync(search, status);
            var dataList = new List<Dictionary<string, object>>();

            foreach (var y in years)
            {
                var dto = MapToResponseDto(y);
                var row = new Dictionary<string, object>
                {
                    { "Academic Year ID", dto.AcademicYearId },
                    { "Academic Year Name", dto.AcademicYearName },
                    { "Board Name", dto.BoardName ?? "—" },
                    { "Start Date", dto.StartDate.ToString("dd MMM yyyy") },
                    { "End Date", dto.EndDate.ToString("dd MMM yyyy") },
                    { "Admission Period", dto.AdmissionPeriod ?? "—" },
                    { "Status", dto.Status },
                    { "Description / Notes", dto.Description ?? "" }
                };
                dataList.Add(row);
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Academic Years");
            return ms.ToArray();
        }

        private void ValidateDates(DateOnly start, DateOnly end, DateOnly? admissionStart, DateOnly? admissionEnd)
        {
            if (start >= end)
            {
                throw new ArgumentException("Start Date must be before End Date.");
            }

            if (admissionStart.HasValue && admissionEnd.HasValue)
            {
                if (admissionStart.Value >= admissionEnd.Value)
                {
                    throw new ArgumentException("Admission Start Date must be before Admission End Date.");
                }
            }
            else if (admissionStart.HasValue && !admissionEnd.HasValue)
            {
                throw new ArgumentException("Admission End Date is required when Admission Start Date is specified.");
            }
            else if (!admissionStart.HasValue && admissionEnd.HasValue)
            {
                throw new ArgumentException("Admission Start Date is required when Admission End Date is specified.");
            }
        }

        private AcademicYearResponseDto MapToResponseDto(AcademicYear ay)
        {
            string? admissionPeriod = null;
            if (ay.AdmissionStartDate.HasValue && ay.AdmissionEndDate.HasValue)
            {
                admissionPeriod = $"{ay.AdmissionStartDate.Value:dd MMM yyyy} – {ay.AdmissionEndDate.Value:dd MMM yyyy}";
            }

            var boardName = ay.Board != null ? ay.Board.BoardName : null;
            var boardCode = ay.Board != null ? ay.Board.BoardCode : null;

            return new AcademicYearResponseDto
            {
                AcademicYearId = ay.AcademicYearId,
                AcademicYearName = ay.AcademicYearName,
                BoardId = ay.BoardId,
                BoardName = boardName,
                BoardCode = boardCode,
                Board = boardName,
                BoardNames = boardName != null ? new List<string> { boardName } : new List<string>(),
                StartDate = ay.StartDate,
                EndDate = ay.EndDate,
                AdmissionStartDate = ay.AdmissionStartDate,
                AdmissionEndDate = ay.AdmissionEndDate,
                AdmissionPeriod = admissionPeriod,
                IsActive = ay.IsActive,
                Status = ay.IsActive ? "Active" : "Inactive",
                Description = ay.Description
            };
        }
    }
}
