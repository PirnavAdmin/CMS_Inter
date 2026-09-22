using CollegeManagement.API.DTOs.StudyMaterial;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudyMaterialService : IStudyMaterialService
    {
        private readonly IStudyMaterialRepository _repository;

        public StudyMaterialService(IStudyMaterialRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<StudyMaterialResponseDto>> GetAllAsync()
        {
            var materials = await _repository.GetAllAsync();

            return materials.Select(x => new StudyMaterialResponseDto
            {
                StudyMaterialId = x.StudyMaterialId,
                Title = x.Title,
                Subject = x.Subject,
                Faculty = x.Faculty,
                FilePath = x.FilePath,
                UploadedAt = x.UploadedAt
            });
        }

        public async Task<StudyMaterialResponseDto?> GetByIdAsync(int id)
        {
            var material = await _repository.GetByIdAsync(id);

            if (material == null)
                return null;

            return new StudyMaterialResponseDto
            {
                StudyMaterialId = material.StudyMaterialId,
                Title = material.Title,
                Subject = material.Subject,
                Faculty = material.Faculty,
                FilePath = material.FilePath,
                UploadedAt = material.UploadedAt
            };
        }

        public async Task<StudyMaterialResponseDto> CreateAsync(CreateStudyMaterialDto dto)
        {
            var material = new StudyMaterial
            {
                Title = dto.Title,
                Subject = dto.Subject,
                Faculty = dto.Faculty,
                FilePath = dto.FilePath
            };

            await _repository.AddAsync(material);

            return new StudyMaterialResponseDto
            {
                StudyMaterialId = material.StudyMaterialId,
                Title = material.Title,
                Subject = material.Subject,
                Faculty = material.Faculty,
                FilePath = material.FilePath,
                UploadedAt = material.UploadedAt
            };
        }
    }
}