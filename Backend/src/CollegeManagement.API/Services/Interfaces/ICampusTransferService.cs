
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
namespace CollegeManagement.API.Services.Interfaces {
    public interface ICampusTransferService {
        Task<int> CreateTransferRequestAsync(CreateCampusTransferRequestDto dto, int requestedById);
        Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId);
        Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId);
        Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId);
        Task ApproveTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto);
        Task RejectTransferAsync(int transferId, int actionedById, ActionCampusTransferDto dto);
    }
}