using CollegeManagement.API.DTOs.AcademicYear;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAcademicYearService
    {
        Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync();
        Task<PagedAcademicYearResponseDto> GetPagedAsync(AcademicYearSearchRequestDto request);
        Task<IEnumerable<AcademicYearResponseDto>> GetActiveAsync();
        Task<AcademicYearResponseDto?> GetByIdAsync(int id);
        Task<AcademicYearResponseDto> CreateAsync(CreateAcademicYearDto dto);
        Task<AcademicYearResponseDto?> UpdateAsync(int id, UpdateAcademicYearDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ActivateAsync(int id);
        Task<bool> DeactivateAsync(int id);
        Task<byte[]> ExportToCsvAsync(string? search, bool? status);
        Task<byte[]> ExportToExcelAsync(string? search, bool? status);
    }
}
