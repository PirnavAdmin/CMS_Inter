using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveCategoryService : ILeaveCategoryService
    {
        private readonly ILeaveCategoryRepository _repository;

        public LeaveCategoryService(ILeaveCategoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        public async Task<LeaveCategoryResponseDto?> GetByIdAsync(int id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public async Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto)
        {
            return await _repository.CreateAsync(dto);
        }

        public async Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto)
        {
            return await _repository.UpdateAsync(id, dto);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await _repository.DeleteAsync(id);
        }

        public async Task<bool> ResetDefaultsAsync()
        {
            return await _repository.ResetDefaultsAsync();
        }

        public async Task<LeaveCategorySummaryDto> GetSummaryAsync()
        {
            return await _repository.GetSummaryAsync();
        }
    }
}
