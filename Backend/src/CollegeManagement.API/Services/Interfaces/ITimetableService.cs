using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITimetableService
    {
        Task<TimetableResponseDto?> GetByIdAsync(int id);
        Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams);
        Task<IEnumerable<TimetableResponseDto>> GetFacultyTimetableAsync(int facultyId, int? academicYearId = null, int? campusId = null);
        Task<IEnumerable<TimetableResponseDto>> GetSectionTimetableAsync(int sectionId, int? academicYearId = null, bool? isPublished = null, int? campusId = null);
        Task<IEnumerable<TimetableResponseDto>> GetStudentTimetableAsync(int studentId);
        Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId, int? campusId = null);
        Task<TimetableResponseDto> CreateAsync(CreateTimetableDto dto);
        Task<TimetableResponseDto?> UpdateAsync(int id, UpdateTimetableDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> TogglePublishSlotAsync(int id, bool isPublished);
        Task<bool> PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished);
        Task<bool> CopyTimetableAsync(CopyTimetableDto dto);
        Task<GenerateTimetableResultDto> GenerateTheoryTimetableAsync(GenerateTimetableRequestDto dto);
        Task<ValidateTimetableResultDto> ValidateSectionTimetableAsync(int sectionId, int academicYearId);
        Task<ApproveTimetableResultDto> ApproveSectionTimetableAsync(int sectionId, int academicYearId);
        Task<TimetableBackupResponseDto?> GetPreviousTimetableAsync(int sectionId, int? academicYearId = null);
        Task<TimetableBackupResponseDto> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null);
        Task<RestoreTimetableResultDto> RestorePreviousTimetableAsync(int sectionId, int academicYearId, string? user = null);
    }
}
