using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPeriodStructureRepository
    {
        Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync(int? campusId = null);
        Task<PeriodStructure?> GetByIdAsync(int id);
        Task<PeriodStructure> AddAsync(PeriodStructure structure);
        Task UpdateAsync(PeriodStructure structure);
        Task DeleteAsync(int id);
        Task<bool> IsStructureReferencedInTimetablesAsync(int structureId);
        Task<IEnumerable<PeriodStructureItemDto>> GetItemsByStructureIdAsync(int structureId);
        Task AddItemsAsync(int structureId, IEnumerable<PeriodStructureItem> items);
        Task DeleteItemsByStructureIdAsync(int structureId);
        Task<int> AssignAsync(PeriodStructureAssignment assignment);
        Task<IEnumerable<PeriodStructureAssignmentResponseDto>> GetAssignmentsByStructureIdAsync(int structureId);
        Task<PeriodStructure?> GetActiveByContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId, int? campusId = null);
    }
}