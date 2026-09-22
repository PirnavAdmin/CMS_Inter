using CollegeManagement.API.DTOs.Users;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IUserManagementService
    {
        Task<List<UserResponse>> GetAllUsersAsync();
        Task<UserResponse?> GetUserByIdAsync(int id);
        Task<UserResponse> CreateUserAsync(CreateUserRequest request);
        Task<UserResponse?> UpdateUserAsync(int id, UpdateUserRequest request);
        Task<bool> DeleteUserAsync(int id);
    }
}
