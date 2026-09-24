using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class FineRuleService : IFineRuleService
    {
        private readonly IFineRuleRepository _repository;

        public FineRuleService(IFineRuleRepository repository)
        {
            _repository = repository;
        }

        public async Task<int> CreateAsync(CreateFineRuleRequest request)
        {
            var rule = new FineRule
            {
                FineRuleName = request.FineRuleName,
                ApplicableFeeId = request.ApplicableFeeId,
                FineType = request.FineType,
                FineAmount = request.FineAmount,
                GracePeriod = request.GracePeriod,
                Status = request.Status,
                CreatedAt = System.DateTime.UtcNow,
                UpdatedAt = System.DateTime.UtcNow
            };
            var created = await _repository.CreateAsync(rule);
            return created.FineRuleId;
        }

        public async Task<IEnumerable<FineRuleDto>> GetAllAsync()
        {
            var rules = await _repository.GetAllAsync();
            return rules.Select(r => new FineRuleDto
            {
                FineRuleId = r.FineRuleId,
                FineRuleName = r.FineRuleName,
                ApplicableFeeId = r.ApplicableFeeId,
                ApplicableFeeName = r.ApplicableFee?.FeeTypeName ?? "",
                FineType = r.FineType,
                FineAmount = r.FineAmount,
                GracePeriod = r.GracePeriod,
                Status = r.Status
            });
        }

        public async Task<FineRuleDto?> GetByIdAsync(int id)
        {
            var r = await _repository.GetByIdAsync(id);
            if (r == null) return null;
            return new FineRuleDto
            {
                FineRuleId = r.FineRuleId,
                FineRuleName = r.FineRuleName,
                ApplicableFeeId = r.ApplicableFeeId,
                ApplicableFeeName = r.ApplicableFee?.FeeTypeName ?? "",
                FineType = r.FineType,
                FineAmount = r.FineAmount,
                GracePeriod = r.GracePeriod,
                Status = r.Status
            };
        }

        public async Task<bool> UpdateAsync(int id, UpdateFineRuleRequest request)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return false;

            existing.FineRuleName = request.FineRuleName;
            existing.ApplicableFeeId = request.ApplicableFeeId;
            existing.FineType = request.FineType;
            existing.FineAmount = request.FineAmount;
            existing.GracePeriod = request.GracePeriod;
            existing.Status = request.Status;
            existing.UpdatedAt = System.DateTime.UtcNow;

            return await _repository.UpdateAsync(existing);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await _repository.DeleteAsync(id);
        }
    }
}
