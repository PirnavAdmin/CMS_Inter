using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StudyMaterialRepository : IStudyMaterialRepository
    {
        private static readonly List<StudyMaterial> _studyMaterials = new();

        public async Task<IEnumerable<StudyMaterial>> GetAllAsync()
        {
            return await Task.FromResult(_studyMaterials);
        }

        public async Task<StudyMaterial?> GetByIdAsync(int id)
        {
            return await Task.FromResult(
                _studyMaterials.FirstOrDefault(x => x.StudyMaterialId == id));
        }

        public async Task AddAsync(StudyMaterial studyMaterial)
        {
            studyMaterial.StudyMaterialId = _studyMaterials.Count + 1;

            _studyMaterials.Add(studyMaterial);

            await Task.CompletedTask;
        }
    }
}