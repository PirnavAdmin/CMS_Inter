
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
namespace CollegeManagement.API.Services.Implementations {
    public class CampusTransferService : ICampusTransferService {
        private readonly ICampusTransferRepository _repository;
        private readonly IFeeService _feeService;

        public CampusTransferService(ICampusTransferRepository repository, IFeeService feeService) {
            _repository = repository;
            _feeService = feeService;
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
            var transfer = await _repository.GetTransferByIdAsync(transferId);
            await _repository.ApproveTransferAsync(transferId, actionedById, dto.ActionRemarks);

            if (transfer != null) {
                try {
                    await _feeService.ApplyCampusTransferFeeAsync(
                        transfer.StudentId,
                        transfer.ToCampusId,
                        dto.DestinationFeeStructureId,
                        dto.TransferPaidCredit);
                } catch {
                    // Log or handle non-fatal fee error
                }
            }
        }
        public async Task RejectTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto) {
            await _repository.RejectTransferAsync(transferId, actionedById, dto.ActionRemarks);
        }
    }
}