using System;
using System.Data;
using System.Net.Mail;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Implements centralized user account provisioning with cryptographically secure temporary passwords,
    /// BCrypt hashing, and domain-link constraint enforcement.
    /// </summary>
    public class UserProvisioningService : IUserProvisioningService
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UserProvisioningService> _logger;

        public UserProvisioningService(
            IUserRepository userRepository,
            ILogger<UserProvisioningService> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        public string GenerateSecureTemporaryPassword(int length = 14)
        {
            return SecurePasswordGenerator.Generate(length);
        }

        public async Task<UserProvisioningResult> ProvisionStudentUserAsync(
            ProvisionStudentUserRequest request,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            if (request == null)
            {
                return UserProvisioningResult.Failed("Student provisioning request cannot be null.");
            }

            if (request.StudentId <= 0)
            {
                return UserProvisioningResult.Failed("A valid StudentId (> 0) is required.");
            }

            // Dynamically resolve canonical Student role from Roles table
            var studentRole = await _userRepository.GetRoleByNameAsync("Student", connection, transaction);
            if (studentRole == null)
            {
                return UserProvisioningResult.Failed("Canonical 'Student' role was not found in Roles table.");
            }

            // If caller provided a RoleId, ensure it matches the canonical Student role
            if (request.RoleId.HasValue && request.RoleId.Value > 0 && request.RoleId.Value != studentRole.RoleId)
            {
                return UserProvisioningResult.Failed($"Invalid RoleId '{request.RoleId.Value}'. Student account must only use canonical Student role (RoleId: {studentRole.RoleId}).");
            }

            var genericRequest = new ProvisionUserRequest
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                RoleId = studentRole.RoleId,
                StudentId = request.StudentId,
                StaffId = null,
                AdminId = null
            };

            return await ProvisionUserAsync(genericRequest, connection, transaction);
        }

        public async Task<UserProvisioningResult> ProvisionStaffUserAsync(
            ProvisionStaffUserRequest request,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            if (request == null)
            {
                return UserProvisioningResult.Failed("Staff provisioning request cannot be null.");
            }

            if (request.StaffId <= 0)
            {
                return UserProvisioningResult.Failed("A valid StaffId (> 0) is required.");
            }

            if (request.RoleId <= 0)
            {
                return UserProvisioningResult.Failed("A valid RoleId (> 0) is required for Staff user provisioning.");
            }

            // 1. Dynamic Role lookup from Roles table
            var role = await _userRepository.GetRoleByIdAsync(request.RoleId, connection, transaction);
            if (role == null)
            {
                return UserProvisioningResult.Failed($"Role with ID '{request.RoleId}' was not found in Roles table.");
            }

            // 2. Staff Role Security: Prohibit assigning non-staff domain roles (Super Admin, Admin, Student, Parent)
            var nonStaffRoles = new[] { "Super Admin", "Admin", "Student", "Parent" };
            if (System.Linq.Enumerable.Any(nonStaffRoles, r => string.Equals(r, role.RoleName, StringComparison.OrdinalIgnoreCase)))
            {
                return UserProvisioningResult.Failed($"Role '{role.RoleName}' (RoleId: {role.RoleId}) cannot be assigned to a Staff account. Please select a valid Staff/Faculty role.");
            }

            var genericRequest = new ProvisionUserRequest
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                RoleId = role.RoleId,
                StudentId = null,
                StaffId = request.StaffId,
                AdminId = null
            };

            return await ProvisionUserAsync(genericRequest, connection, transaction);
        }

        public async Task<UserProvisioningResult> ProvisionAdminUserAsync(
            ProvisionAdminUserRequest request,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            if (request == null)
            {
                return UserProvisioningResult.Failed("Admin provisioning request cannot be null.");
            }

            if (request.AdminId <= 0)
            {
                return UserProvisioningResult.Failed("A valid AdminId (> 0) is required.");
            }

            if (request.RoleId <= 0)
            {
                return UserProvisioningResult.Failed("A valid RoleId (> 0) is required for Admin user provisioning.");
            }

            // 1. Dynamic Role lookup from Roles table
            var role = await _userRepository.GetRoleByIdAsync(request.RoleId, connection, transaction);
            if (role == null)
            {
                return UserProvisioningResult.Failed($"Role with ID '{request.RoleId}' was not found in Roles table.");
            }

            // 2. Admin Role Security: Prohibit assigning non-admin domain roles (Student, Parent, Faculty, HOD, Accounts, etc.)
            var adminDomainRoles = new[] { "Super Admin", "Admin" };
            if (!System.Linq.Enumerable.Any(adminDomainRoles, r => string.Equals(r, role.RoleName, StringComparison.OrdinalIgnoreCase)))
            {
                return UserProvisioningResult.Failed($"Role '{role.RoleName}' (RoleId: {role.RoleId}) cannot be assigned to an Administrator account. Please select a valid Admin-domain role.");
            }

            var genericRequest = new ProvisionUserRequest
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                RoleId = role.RoleId,
                StudentId = null,
                StaffId = null,
                AdminId = request.AdminId
            };

            return await ProvisionUserAsync(genericRequest, connection, transaction);
        }

        public async Task<UserProvisioningResult> ProvisionUserAsync(
            ProvisionUserRequest request,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            if (request == null)
            {
                return UserProvisioningResult.Failed("Provisioning request cannot be null.");
            }

            // 1. Validate FullName
            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return UserProvisioningResult.Failed("FullName is required for user account provisioning.");
            }

            // 2. Validate Email
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return UserProvisioningResult.Failed("Email is required for user account provisioning.");
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            if (!IsValidEmailFormat(normalizedEmail))
            {
                return UserProvisioningResult.Failed($"The email address '{request.Email}' is not in a valid format.");
            }

            // 3. Validate Role
            if (request.RoleId <= 0)
            {
                return UserProvisioningResult.Failed("A valid RoleId (> 0) must be specified.");
            }

            // 4. Validate Domain Links (At most one domain link may be populated)
            int domainLinkCount = 0;
            if (request.StudentId.HasValue && request.StudentId.Value > 0) domainLinkCount++;
            if (request.StaffId.HasValue && request.StaffId.Value > 0) domainLinkCount++;
            if (request.AdminId.HasValue && request.AdminId.Value > 0) domainLinkCount++;

            if (domainLinkCount > 1)
            {
                return UserProvisioningResult.Failed("A User account cannot be linked to multiple domain entities (Student/Staff/Admin). Only one link is allowed.");
            }

            try
            {
                // 5. Check Email Uniqueness in Users table
                var existingUserByEmail = await _userRepository.GetByEmailAsync(normalizedEmail, connection, transaction);
                if (existingUserByEmail != null)
                {
                    return UserProvisioningResult.Failed($"A user account with email '{normalizedEmail}' already exists (UserId: {existingUserByEmail.UserId}).");
                }

                // 6. Check Domain Link Uniqueness
                if (request.StudentId.HasValue && request.StudentId.Value > 0)
                {
                    var existingStudentUser = await _userRepository.GetByStudentIdAsync(request.StudentId.Value, connection, transaction);
                    if (existingStudentUser != null)
                    {
                        return UserProvisioningResult.Failed($"A user account is already linked to StudentId {request.StudentId.Value} (UserId: {existingStudentUser.UserId}).");
                    }
                }

                if (request.StaffId.HasValue && request.StaffId.Value > 0)
                {
                    var existingStaffUser = await _userRepository.GetByStaffIdAsync(request.StaffId.Value, connection, transaction);
                    if (existingStaffUser != null)
                    {
                        return UserProvisioningResult.Failed($"A user account is already linked to StaffId {request.StaffId.Value} (UserId: {existingStaffUser.UserId}).");
                    }
                }

                if (request.AdminId.HasValue && request.AdminId.Value > 0)
                {
                    var existingAdminUser = await _userRepository.GetByAdminIdAsync(request.AdminId.Value, connection, transaction);
                    if (existingAdminUser != null)
                    {
                        return UserProvisioningResult.Failed($"A user account is already linked to AdminId {request.AdminId.Value} (UserId: {existingAdminUser.UserId}).");
                    }
                }

                // 7. Generate Secure Temporary Password & BCrypt Hash
                var temporaryPassword = GenerateSecureTemporaryPassword(14);
                var passwordHash = PasswordHasher.HashPassword(temporaryPassword);

                // 8. Construct User Entity
                var user = new User
                {
                    FullName = request.FullName.Trim(),
                    Email = normalizedEmail,
                    PasswordHash = passwordHash,
                    PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
                    RoleId = request.RoleId,
                    StudentId = request.StudentId,
                    StaffId = request.StaffId,
                    AdminId = request.AdminId,
                    IsFirstLogin = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // 9. Persist User Record
                var userId = await _userRepository.CreateUserAsync(user, connection, transaction);

                _logger.LogInformation("Successfully provisioned User account (UserId: {UserId}, Email: {Email}, RoleId: {RoleId}, StudentId: {StudentId}, StaffId: {StaffId}, AdminId: {AdminId})",
                    userId, normalizedEmail, request.RoleId, request.StudentId, request.StaffId, request.AdminId);

                // 10. Return Result (Plaintext password exists in-memory on result object for future email dispatch)
                return UserProvisioningResult.Succeeded(
                    userId: userId,
                    fullName: user.FullName,
                    email: user.Email,
                    roleId: user.RoleId,
                    roleName: null,
                    studentId: user.StudentId,
                    staffId: user.StaffId,
                    adminId: user.AdminId,
                    temporaryPassword: temporaryPassword);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to provision User account for email {Email}", normalizedEmail);
                return UserProvisioningResult.Failed($"Database error occurred during user account provisioning: {ex.Message}");
            }
        }

        private static bool IsValidEmailFormat(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
    }
}
