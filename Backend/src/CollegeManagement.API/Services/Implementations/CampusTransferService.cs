using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class CampusTransferService : ICampusTransferService
    {
        private readonly ICampusTransferRepository _repository;
        private readonly IFeeService _feeService;

        public CampusTransferService(ICampusTransferRepository repository, IFeeService feeService)
        {
            _repository = repository;
            _feeService = feeService;
        }

        public async Task<int> CreateTransferRequestAsync(
            CreateCampusTransferRequestDto dto,
            int requestedById,
            CancellationToken cancellationToken = default)
        {
            return await _repository.CreateTransferRequestAsync(dto.StudentId, dto.ToCampusId, requestedById, dto.EffectiveDate, dto.TransferReason, dto.Remarks, cancellationToken);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(
            int campusId,
            CancellationToken cancellationToken = default)
        {
            return await _repository.GetSentTransfersAsync(campusId, cancellationToken);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(
            int campusId,
            CancellationToken cancellationToken = default)
        {
            return await _repository.GetReceivedTransfersAsync(campusId, cancellationToken);
        }

        public async Task<CampusTransferResponseDto?> GetTransferByIdAsync(
            int transferId,
            CancellationToken cancellationToken = default)
        {
            return await _repository.GetTransferByIdAsync(transferId, cancellationToken);
        }

        public async Task ApproveTransferAsync(
            int transferId,
            int actionedById,
            ActionCampusTransferDto dto,
            CancellationToken cancellationToken = default)
        {
            var transfer = await _repository.GetTransferByIdAsync(transferId, cancellationToken);
            await _repository.ApproveTransferAsync(transferId, actionedById, dto.ActionRemarks, cancellationToken);

            if (transfer != null)
            {
                try
                {
                    await _feeService.ApplyCampusTransferFeeAsync(
                        transfer.StudentId,
                        transfer.ToCampusId,
                        dto.DestinationFeeStructureId,
                        dto.TransferPaidCredit);
                }
                catch
                {
                    // Non-fatal fee synchronization handling
                }
            }
        }

        public async Task RejectTransferAsync(
            int transferId,
            int actionedById,
            ActionCampusTransferDto dto,
            CancellationToken cancellationToken = default)
        {
            await _repository.RejectTransferAsync(transferId, actionedById, dto.ActionRemarks, cancellationToken);
        }
    }
}
