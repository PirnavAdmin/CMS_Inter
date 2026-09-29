
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
namespace CollegeManagement.API.Services.Implementations {
    public class CampusTransferService : ICampusTransferService {
        private readonly ICampusTransferRepository _repository;
        public CampusTransferService(ICampusTransferRepository repository) {
            _repository = repository;
        }

        public async Task<int> CreateTransferRequestAsync(CreateCampusTransferRequestDto dto, int requestedById) {
            return await _repository.CreateTransferRequestAsync(dto.StudentId, dto.ToCampusId, requestedById, dto.EffectiveDate, dto.TransferReason, dto.Remarks);
        }
        public async Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId) {
            return await _repository.GetSentTransfersAsync(campusId);
        }
        public async Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId) {
            return await _repository.GetReceivedTransfersAsync(campusId);
        }
        public async Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId) {
            return await _repository.GetTransferByIdAsync(transferId);
        }
        public async Task ApproveTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto) {
            await _repository.ApproveTransferAsync(transferId, actionedById, dto.ActionRemarks);
        }
        public async Task RejectTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto) {
            await _repository.RejectTransferAsync(transferId, actionedById, dto.ActionRemarks);
        }
    }
}