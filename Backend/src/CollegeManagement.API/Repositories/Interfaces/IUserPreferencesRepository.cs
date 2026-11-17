using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.UserPreferences;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IUserPreferencesRepository
    {
        Task<UserPreferencesDto> GetUserPreferencesAsync(int userId, CancellationToken ct = default);
        Task<UserPreferencesDto> SaveUserPreferencesAsync(int userId, UpdateUserPreferencesRequest request, CancellationToken ct = default);
    }
}
