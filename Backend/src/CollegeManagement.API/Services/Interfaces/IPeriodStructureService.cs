using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IPeriodStructureService
    {
        Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync();
        Task<PeriodStructureResponseDto?> GetByIdAsync(int id);
        Task<PreviewPeriodStructureResponseDto> PreviewStructureAsync(PreviewPeriodStructureRequestDto request);
        Task<PeriodStructureResponseDto> CreateAsync(CreatePeriodStructureDto dto);
        Task<PeriodStructureResponseDto?> UpdateAsync(int id, UpdatePeriodStructureDto dto);
        Task<bool> DeleteAsync(int id);
        Task<PeriodStructureAssignmentResponseDto> AssignContextAsync(AssignPeriodStructureDto dto);
        Task<IEnumerable<PeriodResponseDto>> GetActiveTeachingPeriodsForContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId);
        Task<IEnumerable<PeriodResponseDto>> GetPeriodsByContextAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId);
    }
}