using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelFeeConfigService : IHostelFeeConfigService
    {
        private readonly IHostelFeeConfigRepository _repository;

        public HostelFeeConfigService(IHostelFeeConfigRepository repository)
        {
            _repository = repository;
        }

        public async Task<int> CreateAsync(CreateHostelFeeConfigRequest request)
        {
            return await _repository.CreateAsync(request);
        }

        public async Task<IEnumerable<HostelFeeConfigDto>> GetAllAsync(int? hostelId, string? status)
        {
            return await _repository.GetAllAsync(hostelId, status);
        }

        public async Task<HostelFeeConfigDto?> GetByIdAsync(int feeConfigId)
        {
            return await _repository.GetByIdAsync(feeConfigId);
        }

        public async Task<bool> UpdateAsync(int feeConfigId, UpdateHostelFeeConfigRequest request)
        {
            return await _repository.UpdateAsync(feeConfigId, request);
        }

        public async Task<bool> DeleteAsync(int feeConfigId)
        {
            return await _repository.DeleteAsync(feeConfigId);
        }
    }
}
