using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ICampusTransferService
    {
        Task<int> CreateTransferRequestAsync(CreateCampusTransferRequestDto dto, int requestedById, CancellationToken cancellationToken = default);
        Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId, CancellationToken cancellationToken = default);
        Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId, CancellationToken cancellationToken = default);
        Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId, CancellationToken cancellationToken = default);
        Task ApproveTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto, CancellationToken cancellationToken = default);
        Task RejectTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto, CancellationToken cancellationToken = default);
    }
}
