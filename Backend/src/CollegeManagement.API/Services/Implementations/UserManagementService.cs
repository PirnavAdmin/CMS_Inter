using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class UserManagementService : IUserManagementService
    {
        private readonly IUserRepository _userRepository;

        public UserManagementService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<List<UserResponse>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return users.Select(u => new UserResponse
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                RoleId = u.RoleId,
                RoleName = u.Role?.RoleName ?? string.Empty
            }).ToList();
        }

        public async Task<UserResponse?> GetUserByIdAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return null;

            return new UserResponse
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                RoleId = user.RoleId,
                RoleName = user.Role?.RoleName ?? string.Empty
            };
        }

        public async Task<UserResponse> CreateUserAsync(CreateUserRequest request)
        {
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                throw new Exception("User with this email already exists.");
            }

            // Hashing password, in a real scenario use proper hashing like BCrypt.Net.BCrypt.HashPassword
            // But per instruction, check how it's done or use BCryptNet if available. Let's use BCrypt
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = hashedPassword,
                PhoneNumber = request.PhoneNumber,
                RoleId = request.RoleId
            };

            await _userRepository.AddAsync(user);

            // Fetch again to get Role name
            var createdUser = await _userRepository.GetByIdAsync(user.UserId) ?? user;

            return new UserResponse
            {
                UserId = createdUser.UserId,
                FullName = createdUser.FullName,
                Email = createdUser.Email,
                PhoneNumber = createdUser.PhoneNumber,
                RoleId = createdUser.RoleId,
                RoleName = createdUser.Role?.RoleName ?? string.Empty
            };
        }

        public async Task<UserResponse?> UpdateUserAsync(int id, UpdateUserRequest request)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return null;

            var normalizedEmail = request.Email.Trim().ToUpperInvariant();
            if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail);
                if (existingUser != null && existingUser.UserId != id)
                {
                    throw new Exception("Email is already in use by another user.");
                }
            }

            user.FullName = request.FullName;
            user.Email = normalizedEmail;
            user.PhoneNumber = request.PhoneNumber;
            user.RoleId = request.RoleId;

            if (!string.IsNullOrEmpty(request.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            await _userRepository.UpdateAsync(user);

            var updatedUser = await _userRepository.GetByIdAsync(id) ?? user;

            return new UserResponse
            {
                UserId = updatedUser.UserId,
                FullName = updatedUser.FullName,
                Email = updatedUser.Email,
                PhoneNumber = updatedUser.PhoneNumber,
                RoleId = updatedUser.RoleId,
                RoleName = updatedUser.Role?.RoleName ?? string.Empty
            };
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return false;

            await _userRepository.DeleteAsync(id);
            return true;
        }
    }
}
