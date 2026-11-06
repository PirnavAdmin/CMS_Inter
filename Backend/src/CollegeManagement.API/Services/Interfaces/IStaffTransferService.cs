using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffTransferService
    {
        Task<StaffTransferPreflightCheckDto> PreflightCheckAsync(int staffId, int toCampusId);
        Task<StaffTransferResponseDto> InitiateTransferAsync(CreateStaffTransferDto dto, int requestedByUserId);
        Task<StaffTransferResponseDto> ApproveTransferAsync(int transferId, ApproveStaffTransferDto dto, int approvedByUserId);
        Task<StaffTransferResponseDto> RejectTransferAsync(int transferId, RejectStaffTransferDto dto, int rejectedByUserId);
        Task<StaffTransferResponseDto> GetTransferByIdAsync(int transferId);
        Task<IEnumerable<StaffTransferResponseDto>> GetTransfersAsync(int? campusId = null, string? status = null);
        Task<IEnumerable<StaffTransferResponseDto>> GetStaffTransferHistoryAsync(int staffId);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateTransferOrderPdfAsync(int transferId);
    }
}
