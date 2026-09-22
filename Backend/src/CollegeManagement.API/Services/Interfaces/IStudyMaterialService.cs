using CollegeManagement.API.DTOs.StudyMaterial;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStudyMaterialService
    {
        Task<IEnumerable<StudyMaterialResponseDto>> GetAllAsync();

        Task<StudyMaterialResponseDto?> GetByIdAsync(int id);

        Task<StudyMaterialResponseDto> CreateAsync(CreateStudyMaterialDto dto);
    }
}