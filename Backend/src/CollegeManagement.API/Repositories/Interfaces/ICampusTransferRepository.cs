using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ICampusTransferRepository
    {
        Task<int> CreateTransferRequestAsync(int studentId, int toCampusId, int requestedById, DateTime effectiveDate, string reason, string? remarks, CancellationToken cancellationToken = default);
        Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId, CancellationToken cancellationToken = default);
        Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId, CancellationToken cancellationToken = default);
        Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId, CancellationToken cancellationToken = default);
        Task ApproveTransferAsync(int transferId, int actionedById, string? remarks, CancellationToken cancellationToken = default);
        Task RejectTransferAsync(int transferId, int actionedById, string? remarks, CancellationToken cancellationToken = default);
    }
}
