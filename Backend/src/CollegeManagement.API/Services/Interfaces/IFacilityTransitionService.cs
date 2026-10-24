using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Models.Fee;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IFacilityTransitionService
    {
        Task<FacilityTransitionPreviewDto> PreviewHostelToTransportTransitionAsync(int studentId, long pickupPointId, DateTime? effectiveDate);

        Task<FacilityTransitionResultDto> ExecuteHostelToTransportTransitionAsync(FacilityTransitionRequestDto request, string performedBy = "System");

        Task<TransportToHostelPreviewDto> PreviewTransportToHostelTransitionAsync(int studentId, int hostelId, int roomId, int bedId, DateTime? effectiveDate, decimal? customAnnualFee = null);

        Task<TransportToHostelResultDto> ExecuteTransportToHostelTransitionAsync(TransportToHostelRequestDto request, string performedBy = "System");

        Task<DiscontinueFacilityPreviewDto> PreviewDiscontinuationToSelfAsync(int studentId, string fromFacility, DateTime? effectiveDate);

        Task<DiscontinueFacilityResultDto> ExecuteDiscontinuationToSelfAsync(DiscontinueFacilityRequestDto request, string performedBy = "System");

        Task<IEnumerable<FacilityTransitionHistory>> GetTransitionHistoryAsync(int studentId);
    }
}
