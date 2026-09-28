using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Campus;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ICampusRepository
    {
        Task<IEnumerable<CampusDto>> GetAllCampusesAsync(string? search = null, bool? isActive = null, int? boardId = null, CancellationToken cancellationToken = default);
        Task<CampusDto?> GetCampusByIdAsync(int campusId, CancellationToken cancellationToken = default);
        Task<CampusDto> CreateCampusAsync(CreateCampusDto dto, CancellationToken cancellationToken = default);
        Task<CampusDto?> UpdateCampusAsync(UpdateCampusDto dto, CancellationToken cancellationToken = default);
        Task<bool> DeleteCampusAsync(int campusId, CancellationToken cancellationToken = default);
        Task<bool> ToggleCampusStatusAsync(int campusId, CancellationToken cancellationToken = default);
        Task<IEnumerable<AffiliatedBoardDto>> GetAffiliatedBoardsByCampusIdAsync(int campusId, CancellationToken cancellationToken = default);
        Task<IEnumerable<CampusHeaderDropdownDto>> GetActiveHeaderCampusesAsync(CancellationToken cancellationToken = default);
        Task<CampusStatsDto> GetCampusStatsAsync(int? selectedCampusId = null, CancellationToken cancellationToken = default);
        Task<bool> CampusCodeExistsAsync(string campusCode, int? excludeCampusId = null, CancellationToken cancellationToken = default);
    }
}
