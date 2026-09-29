using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelFeeConfigRepository
    {
        Task<int> CreateAsync(CreateHostelFeeConfigRequest request);
        Task<IEnumerable<HostelFeeConfigDto>> GetAllAsync(int? hostelId, string? status, int? campusId = null, int? boardId = null, int? academicYearId = null);
        Task<HostelFeeConfigDto?> GetByIdAsync(int feeConfigId);
        Task<bool> UpdateAsync(int feeConfigId, UpdateHostelFeeConfigRequest request);
        Task<bool> DeleteAsync(int feeConfigId);
    }
}
