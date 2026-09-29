
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
namespace CollegeManagement.API.Repositories.Interfaces {
    public interface ICampusTransferRepository {
        Task<int> CreateTransferRequestAsync(int studentId, int toCampusId, int requestedById, System.DateTime effectiveDate, string reason, string? remarks);
        Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId);
        Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId);
        Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId);
        Task ApproveTransferAsync(int transferId, int actionedById, string? remarks);
        Task RejectTransferAsync(int transferId, int actionedById, string? remarks);
    }
}