using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Data;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Dapper;

namespace CollegeManagement.API.Services.Implementations
{
    public class AdminService : IAdminService
    {
        private readonly IAdminRepository _adminRepository;
        private readonly IOtpRepository _otpRepository;
        private readonly IUserRepository _userRepository;
        private readonly IUserProvisioningService _userProvisioningService;
        private readonly IEmailService _emailService;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminService> _logger;
        private readonly IAuthService? _authService;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment? _environment;

        private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        public AdminService(
            IAdminRepository adminRepository,
            IOtpRepository otpRepository,
            IUserRepository userRepository,
            IUserProvisioningService userProvisioningService,
            IEmailService emailService,
            AppDbContext context,
            IConfiguration configuration,
            ILogger<AdminService> logger,
            IAuthService? authService = null,
            Microsoft.AspNetCore.Hosting.IWebHostEnvironment? environment = null)
        {
            _adminRepository = adminRepository;
            _otpRepository = otpRepository;
            _userRepository = userRepository;
            _userProvisioningService = userProvisioningService;
            _emailService = emailService;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _authService = authService;
            _environment = environment;
        }

        public async Task<IEnumerable<AdminDto>> GetAllAdminsAsync()
        {
            var admins = await _adminRepository.GetAllAsync();
            return admins.Select(a => new AdminDto
            {
                Id = a.Id,
                FullName = a.FullName,
                Email = a.Email,
                PhoneNumber = a.PhoneNumber,
                PhotoPath = a.PhotoPath,
                RoleId = 2,
                RoleName = "Admin",
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            });
        }

        public async Task<AdminDto?> GetAdminByIdAsync(int id)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null) return null;

            return new AdminDto
            {
                Id = admin.Id,
                FullName = admin.FullName,
                Email = admin.Email,
                PhoneNumber = admin.PhoneNumber,
                PhotoPath = admin.PhotoPath,
                RoleId = 2,
                RoleName = "Admin",
                IsActive = admin.IsActive,
                CreatedAt = admin.CreatedAt,
                UpdatedAt = admin.UpdatedAt
            };
        }

        public async Task<AdminDto?> GetProfileAsync(int adminId)
        {
            return await GetAdminByIdAsync(adminId);
        }

        public async Task<(bool Success, string Message, AdminDto? Data)> UpdateProfileAsync(int adminId, UpdateAdminProfileRequest request)
        {
            if (request == null)
            {
                return (false, "Update request cannot be null.", null);
            }

            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
            {
                return (false, $"Admin with ID {adminId} not found.", null);
            }

            var normalizedEmail = request.Email?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
            {
                return (false, "A valid email address is required.", null);
            }

            // Check if email changed and if another admin already uses it
            if (!string.Equals(admin.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await _adminRepository.GetByEmailAsync(normalizedEmail);
                if (existing != null && existing.Id != adminId)
                {
                    return (false, $"Email '{normalizedEmail}' is already registered to another administrator.", null);
                }
            }

            var updatedAdmin = await _adminRepository.UpdateProfileAsync(
                adminId,
                request.FullName?.Trim() ?? admin.FullName,
                normalizedEmail,
                request.PhoneNumber?.Trim() ?? admin.PhoneNumber);

            if (updatedAdmin == null)
            {
                return (false, "Failed to update admin profile.", null);
            }

            var dto = new AdminDto
            {
                Id = updatedAdmin.Id,
                FullName = updatedAdmin.FullName,
                Email = updatedAdmin.Email,
                PhoneNumber = updatedAdmin.PhoneNumber,
                PhotoPath = updatedAdmin.PhotoPath,
                RoleId = 2,
                RoleName = "Admin",
                IsActive = updatedAdmin.IsActive,
                CreatedAt = updatedAdmin.CreatedAt,
                UpdatedAt = updatedAdmin.UpdatedAt
            };

            return (true, "Admin profile updated successfully.", dto);
        }

        public async Task<AdminPhotoUploadResultDto> UploadPhotoAsync(int adminId, Microsoft.AspNetCore.Http.IFormFile file, System.Threading.CancellationToken ct = default)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
            {
                return new AdminPhotoUploadResultDto
                {
                    Status = false,
                    Message = $"Admin with ID {adminId} not found.",
                    AdminId = adminId
                };
            }

            if (file == null || file.Length == 0)
            {
                return new AdminPhotoUploadResultDto
                {
                    Status = false,
                    Message = "No photo file uploaded or file is empty.",
                    AdminId = adminId
                };
            }

            var ext = System.IO.Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedImageExtensions.Contains(ext))
            {
                return new AdminPhotoUploadResultDto
                {
                    Status = false,
                    Message = "Invalid image format. Only JPG, JPEG, PNG, and WEBP formats are supported.",
                    AdminId = adminId
                };
            }

            if (file.Length > 3 * 1024 * 1024)
            {
                return new AdminPhotoUploadResultDto
                {
                    Status = false,
                    Message = "Photo file size cannot exceed 3 MB.",
                    AdminId = adminId
                };
            }

            var rootPath = _environment?.WebRootPath ?? System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = System.IO.Path.Combine(rootPath, "uploads", "admin-photos");
            if (!System.IO.Directory.Exists(uploadsFolder))
            {
                System.IO.Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"admin_photo_{adminId}_{DateTime.UtcNow.Ticks}{ext}";
            var physicalPath = System.IO.Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new System.IO.FileStream(physicalPath, System.IO.FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            var relativeUrl = $"/uploads/admin-photos/{uniqueFileName}";
            var updateSuccess = await _adminRepository.UpdatePhotoAsync(adminId, relativeUrl);

            if (!updateSuccess)
            {
                return new AdminPhotoUploadResultDto
                {
                    Status = false,
                    Message = "Failed to update profile photo reference in database.",
                    AdminId = adminId
                };
            }

            return new AdminPhotoUploadResultDto
            {
                Status = true,
                Message = "Profile photo uploaded successfully.",
                PhotoUrl = relativeUrl,
                AdminId = adminId
            };
        }

        public async Task<AuthResult> LoginAsync(AdminLoginRequest request)
        {
            if (request == null)
            {
                return new AuthResult { Status = false, Message = "Invalid Email or Password" };
            }

            // Phase 6G: Admin login is strictly email-only.
            // Reject phone numbers or any identifier that does not contain '@'.
            var rawEmail = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(rawEmail) || !rawEmail.Contains('@'))
            {
                return new AuthResult { Status = false, Message = "Invalid Email or Password" };
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return new AuthResult { Status = false, Message = "Invalid Email or Password" };
            }

            // Delegate to the centralized AuthService.LoginAsync.
            // AuthService handles:
            //   1. Users-first authentication against Users.PasswordHash
            //   2. Controlled legacy JIT migration (first-time login without existing Users row)
            //   3. Canonical JWT generation via JwtTokenHelper (sub = Users.UserId)
            //   4. Concurrent JIT duplicate-key recovery
            //   5. Inactive account / inactive linked domain rejection
            return await _authService!.LoginAsync(new LoginRequest
            {
                EmailOrMobile = rawEmail,
                Password = request.Password
            });
        }

        public async Task<AdminDto> CreateAdminAsync(CreateAdminRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new ValidationException("Email address is required for admin creation.");

            if (request.RoleId <= 0)
                throw new ValidationException("RoleId is required and must be greater than 0.");

            var normalizedEmail = request.Email.Trim();

            // 1. Dynamic Role Validation from Roles table
            var role = await _userRepository.GetRoleByIdAsync(request.RoleId);
            if (role == null)
            {
                throw new ValidationException($"Role with ID '{request.RoleId}' was not found in Roles table.");
            }

            var adminDomainRoles = new[] { "Super Admin", "Admin" };
            if (!System.Linq.Enumerable.Any(adminDomainRoles, r => string.Equals(r, role.RoleName, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ValidationException($"Role '{role.RoleName}' (RoleId: {role.RoleId}) cannot be assigned to an Administrator account. Please select a valid Admin-domain role.");
            }

            // 2. Uniqueness checks in admins and Users
            var existingAdmin = await _adminRepository.GetByEmailAsync(normalizedEmail);
            if (existingAdmin != null)
            {
                throw new InvalidOperationException($"Email address '{normalizedEmail}' is already registered to an admin account.");
            }

            var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (existingUser != null)
            {
                throw new InvalidOperationException($"Email address '{normalizedEmail}' is already registered to a user account.");
            }

            // 3. Atomic Transaction: admins + Users
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            int adminId = 0;
            UserProvisioningResult provisioningResult;

            try
            {
                var admin = new Admin
                {
                    Email = normalizedEmail,
                    Password = string.Empty,
                    IsActive = true
                };

                adminId = await _adminRepository.AddAsync(admin, connection, transaction);
                admin.Id = adminId;

                var provisioningRequest = new ProvisionAdminUserRequest
                {
                    AdminId = admin.Id,
                    FullName = string.IsNullOrWhiteSpace(request.FullName) ? normalizedEmail.Split('@')[0] : request.FullName.Trim(),
                    Email = normalizedEmail,
                    RoleId = role.RoleId
                };

                provisioningResult = await _userProvisioningService.ProvisionAdminUserAsync(provisioningRequest, connection, transaction);
                if (!provisioningResult.Success)
                {
                    throw new ValidationException(provisioningResult.ErrorMessage ?? "Admin user account provisioning failed.");
                }

                // Dual-write: Mirror the exact same BCrypt hash to admins.Password for legacy compatibility
                if (!string.IsNullOrWhiteSpace(provisioningResult.TemporaryPassword))
                {
                    var dualWriteHash = PasswordHasher.HashPassword(provisioningResult.TemporaryPassword);
                    await connection.ExecuteAsync(
                        "sp_UpdateAdminPassword",
                        new { p_Id = adminId, p_Password = dualWriteHash },
                        transaction: transaction,
                        commandType: CommandType.StoredProcedure);
                }

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }

            // 4. Post-Commit: Send initial credentials email with the EXACT provisioned temporary password
            var adminDisplayName = string.IsNullOrWhiteSpace(request.FullName) ? normalizedEmail.Split('@')[0] : request.FullName.Trim();
            if (!string.IsNullOrWhiteSpace(provisioningResult.TemporaryPassword))
            {
                try
                {
                    var emailBody = AdminCredentialHelper.BuildInitialCredentialEmailHtml(
                        adminDisplayName,
                        normalizedEmail,
                        role.RoleName,
                        provisioningResult.TemporaryPassword);

                    await _emailService.SendEmailAsync(
                        normalizedEmail,
                        "College Management System - Administrator Login Credentials",
                        emailBody);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Initial credential email delivery failed for admin {Email} after successful commit.", normalizedEmail);
                }
            }

            return new AdminDto
            {
                Id = adminId,
                Email = normalizedEmail,
                FullName = adminDisplayName,
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                IsActive = true
            };
        }

        public async Task<bool> UpdateStatusAsync(int id, bool isActive)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null) return false;

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                await _adminRepository.UpdateStatusAsync(id, isActive, connection, transaction);
                await _userRepository.UpdateStatusByAdminIdAsync(id, isActive, connection, transaction);
                transaction.Commit();
                return true;
            }
            catch (Exception ex)
            {
                try { transaction.Rollback(); } catch { }
                _logger.LogError(ex, "Failed to update admin status and sync Users for AdminId {AdminId}", id);
                throw;
            }
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            // Phase 6G: Delegate entirely to centralized AuthService.ChangePasswordAsync.
            // AuthService verifies OldPassword against Users.PasswordHash (not admins.Password),
            // performs an atomic dual-write (Users.PasswordHash + admins.Password), and
            // sets Users.IsFirstLogin = false after success.
            return await _authService!.ChangePasswordAsync(
                userId,
                request.OldPassword,
                request.NewPassword,
                request.ConfirmNewPassword);
        }

        public async Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            if (_authService != null)
            {
                return await _authService.ForgotPasswordAsync(request);
            }

            var admin = await _adminRepository.GetByEmailAsync(request.Email);
            if (admin == null)
            {
                return new AuthResult
                {
                    Status = true,
                    Message = "OTP has been sent to your registered email."
                };
            }

            var otpCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            var otp = new OTP
            {
                Email = request.Email.Trim().ToLowerInvariant(),
                OTPCode = otpCode,
                ExpiryTime = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false
            };

            await _otpRepository.AddAsync(otp);

            _logger.LogInformation("Admin OTP generated for Email: {Email}", request.Email);

            return new AuthResult
            {
                Status = true,
                Message = "OTP has been sent to your registered email."
            };
        }

        public async Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request)
        {
            if (_authService != null)
            {
                return await _authService.VerifyOtpAsync(request);
            }

            var otpRecord = await _otpRepository.GetLatestActiveOtpAsync(request.Email.Trim().ToLowerInvariant(), request.Otp.Trim());

            if (otpRecord == null || otpRecord.IsUsed || otpRecord.ExpiryTime <= DateTime.UtcNow)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            return new AuthResult
            {
                Status = true,
                Message = "OTP Verified Successfully"
            };
        }

        public async Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request)
        {
            if (_authService != null)
            {
                return await _authService.ResetPasswordAsync(request);
            }

            if (request.Password != request.ConfirmPassword)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Password and Confirm Password do not match"
                };
            }

            var otpRecord = await _otpRepository.GetLatestActiveOtpAsync(request.Email.Trim().ToLowerInvariant(), request.OTP.Trim());

            if (otpRecord == null || otpRecord.IsUsed || otpRecord.ExpiryTime <= DateTime.UtcNow)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            var admin = await _adminRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
            if (admin == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Admin account not found"
                };
            }

            var newPasswordHash = PasswordHasher.HashPassword(request.Password);
            otpRecord.IsUsed = true;

            await _adminRepository.UpdatePasswordAsync(admin.Id, newPasswordHash);
            await _otpRepository.UpdateAsync(otpRecord);

            return new AuthResult
            {
                Status = true,
                Message = "Admin Password Reset Successfully"
            };
        }
    }
}
