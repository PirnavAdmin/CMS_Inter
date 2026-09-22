using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITimetableRepository
    {
        Task<TimetableResponseDto?> GetByIdAsync(int id);
        Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams);
        Task<IEnumerable<TimetableResponseDto>> GetByFacultyIdAsync(int facultyId, int? academicYearId = null);
        Task<IEnumerable<TimetableResponseDto>> GetBySectionIdAsync(int sectionId, int? academicYearId = null, bool? isPublished = null);
        Task<int> AddAsync(CreateTimetableDto dto);
        Task UpdateAsync(int id, UpdateTimetableDto dto);
        Task DeleteAsync(int id);
        Task TogglePublishSlotAsync(int id, bool isPublished);
        Task PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished);
        Task<bool> HasSectionSlotConflictAsync(int academicYearId, int sectionId, int dayOfWeek, int periodId, int? excludeId = null);
        Task<bool> HasFacultySlotConflictAsync(int academicYearId, int facultyId, int dayOfWeek, int periodId, int? excludeId = null);
        Task<bool> HasRoomSlotConflictAsync(int academicYearId, int roomId, int dayOfWeek, int periodId, int? excludeId = null);
        Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId);
        Task CopySectionTimetableAsync(CopyTimetableDto dto);
    }
}
