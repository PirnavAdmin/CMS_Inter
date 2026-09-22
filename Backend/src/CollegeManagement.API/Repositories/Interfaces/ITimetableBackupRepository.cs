using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITimetableBackupRepository
    {
        Task<TimetableBackupResponseDto?> GetPreviousBySectionAsync(int sectionId, int? academicYearId = null);
        Task<int> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null);
        Task<int> SwapRestoreSectionTimetableAsync(int sectionId, int academicYearId, string? user = null);
        Task DeleteBackupAsync(int sectionId, int academicYearId);
    }
}