using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ISectionRepository
    {
        Task<IEnumerable<SectionResponse>> GetAllSectionsAsync(SectionFilterDto? filter = null);
        Task<SectionResponse?> GetSectionByIdAsync(int id);
        Task<int> CreateSectionAsync(Section section);
        Task<bool> UpdateSectionAsync(int id, Section section);
        Task<bool> DeleteSectionAsync(int id);
        Task<IEnumerable<SectionResponse>> GetSectionsByGroupAsync(int groupId);
        Task<IEnumerable<SectionResponse>> GetSectionsByGroupProgramAsync(int groupProgramId);
        Task<bool> IsSectionNameDuplicateAsync(int? boardId, int academicYearId, int? academicLevelId, int? groupId, int? groupProgramId, int? programId, string sectionName, int? excludeSectionId = null);
        Task<bool> AcademicYearExistsAsync(int academicYearId);
        Task<AcademicYear?> GetAcademicYearByIdAsync(int academicYearId);
        Task<bool> FacultyExistsAsync(int facultyId);
        Task<bool> RoomExistsAsync(int roomId);
        Task<CollegeManagement.API.Models.Timetable.Room?> GetRoomDetailsAsync(int? roomId, string? roomCode);
        Task<SectionResponse?> GetActiveSectionAssignedToRoomAsync(int? roomId, string? roomCode, int? excludeSectionId = null);
        Task<int?> ResolveBoardIdAsync(int? boardId, string? boardName);
        Task<int?> ResolveGroupIdAsync(int? groupId, string? groupName);
        Task<int?> ResolveAcademicLevelIdAsync(int? academicLevelId, string? levelName);
        Task<int?> ResolveProgramIdAsync(int? programId, string? programName, int? groupId);
        Task<int?> ResolveGroupProgramIdAsync(int? groupProgramId, int? groupId, int? programId);
        Task<(int? GroupId, int? ProgramId)> GetGroupAndProgramByGroupProgramIdAsync(int groupProgramId);
        Task<bool> IsProgramValidForGroupAsync(int groupId, int programId);
    }
}
