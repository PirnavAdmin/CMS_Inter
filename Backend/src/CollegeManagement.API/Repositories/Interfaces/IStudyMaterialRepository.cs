using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStudyMaterialRepository
    {
        Task<IEnumerable<StudyMaterial>> GetAllAsync();

        Task<StudyMaterial?> GetByIdAsync(int id);

        Task AddAsync(StudyMaterial studyMaterial);
    }
}