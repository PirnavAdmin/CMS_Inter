using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Data;
using System.Data;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly IOtpRepository _otpRepository;
        private readonly ILogger<AuthService> _logger;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly IEmailService? _emailService;

        public class VerifiedResetContext
        {
            public int UserId { get; set; }
            public string Email { get; set; } = string.Empty;
            public int OtpId { get; set; }
            public string ResetToken { get; set; } = string.Empty;
            public DateTime ExpiryTime { get; set; }
            public bool IsConsumed { get; set; }
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, VerifiedResetContext> _verifiedResetContexts = new();

        public AuthService(
            IUserRepository userRepository,
            IJwtTokenHelper jwtTokenHelper,
            IOtpRepository otpRepository,
            ILogger<AuthService> logger,
            IConfiguration configuration,
            AppDbContext context,
            IEmailService? emailService = null)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _jwtTokenHelper = jwtTokenHelper ?? throw new ArgumentNullException(nameof(jwtTokenHelper));
            _otpRepository = otpRepository ?? throw new ArgumentNullException(nameof(otpRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _emailService = emailService;
        }

        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            if (request == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Email or Password"
                };
            }

            var rawIdentifier = request.EmailOrMobile?.Trim();
            if (string.IsNullOrWhiteSpace(rawIdentifier) || string.IsNullOrWhiteSpace(request.Password))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Email or Password"
                };
            }

            // Centralized Login Contract: Authenticate strictly by Email only.
            // Reject phone numbers or invalid formats without '@'
            if (!rawIdentifier.Contains('@'))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid Email or Password"
                };
            }

            var normalizedEmail = rawIdentifier.ToLowerInvariant();
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            // 1. Authoritative Users table lookup
            var user = await _userRepository.GetByEmailAsync(normalizedEmail, connection);

            if (user != null)
            {
                // Verify password against centralized Users.PasswordHash
                if (!PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                // Verify Users account status
                if (!user.IsActive)
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                // Linked domain active-status validation
                if (user.AdminId.HasValue && user.AdminId.Value > 0)
                {
                    var adminActive = await connection.QueryFirstOrDefaultAsync<bool?>(
                        "SELECT IsActive FROM `admins` WHERE `id` = @Id LIMIT 1;",
                        new { Id = user.AdminId.Value });

                    if (adminActive != true)
                    {
                        return new AuthResult
                        {
                            Status = false,
                            Message = "Invalid Email or Password"
                        };
                    }
                }
                else if (user.StaffId.HasValue && user.StaffId.Value > 0)
                {
                    var staffStatus = await connection.QueryFirstOrDefaultAsync<(bool IsDeleted, string Status)?>(
                        "SELECT IsDeleted, Status FROM `Staff` WHERE `Id` = @Id LIMIT 1;",
                        new { Id = user.StaffId.Value });

                    if (!staffStatus.HasValue || staffStatus.Value.IsDeleted || !string.Equals(staffStatus.Value.Status, "Active", StringComparison.OrdinalIgnoreCase))
                    {
                        return new AuthResult
                        {
                            Status = false,
                            Message = "Invalid Email or Password"
                        };
                    }
                }
                else if (user.StudentId.HasValue && user.StudentId.Value > 0)
                {
                    var studentActive = await connection.QueryFirstOrDefaultAsync<bool?>(
                        "SELECT IsActive FROM `Students` WHERE `StudentId` = @Id LIMIT 1;",
                        new { Id = user.StudentId.Value });

                    if (studentActive != true)
                    {
                        return new AuthResult
                        {
                            Status = false,
                            Message = "Invalid Email or Password"
                        };
                    }
                }

                // Dynamically resolve role if needed
                if (user.Role == null && user.RoleId > 0)
                {
                    user.Role = await _userRepository.GetRoleByIdAsync(user.RoleId, connection) ?? null!;
                }

                // Update LastLogin on successful authentication
                var now = DateTime.UtcNow;
                await _userRepository.UpdateLastLoginAsync(user.UserId, now, connection);
                user.LastLogin = now;

                // Issue standardized JWT via Phase 6A helper
                var token = await _jwtTokenHelper.GenerateTokenAsync(user);

                return new AuthResult
                {
                    Status = true,
                    Message = "Login Successful",
                    AccessToken = token,
                    UserId = user.UserId,
                    Name = user.FullName,
                    Role = user.Role?.RoleName ?? (await _userRepository.GetRoleByIdAsync(user.RoleId, connection))?.RoleName ?? string.Empty
                };
            }

            // 2. Controlled Legacy JIT Migration (Users row does not exist)

            // 2A. Legacy Admin JIT Migration
            var legacyAdmin = await connection.QueryFirstOrDefaultAsync<Admin>(
                "SELECT id AS Id, Email, Password, IsActive FROM `admins` WHERE LOWER(Email) = @Email LIMIT 1;",
                new { Email = normalizedEmail });

            if (legacyAdmin != null)
            {
                if (!legacyAdmin.IsActive)
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                if (!PasswordHasher.VerifyPassword(request.Password, legacyAdmin.Password))
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                // Legacy credentials verified. Resolve canonical role dynamically
                string targetRoleName = "Admin";
                if (legacyAdmin.Email.Contains("superadmin", StringComparison.OrdinalIgnoreCase) ||
                    legacyAdmin.Email.Contains("super.admin", StringComparison.OrdinalIgnoreCase) ||
                    legacyAdmin.Email.Contains("super_admin", StringComparison.OrdinalIgnoreCase))
                {
                    targetRoleName = "Super Admin";
                }

                var canonicalRole = await _userRepository.GetRoleByNameAsync(targetRoleName, connection);
                if (canonicalRole == null)
                {
                    canonicalRole = await _userRepository.GetRoleByNameAsync("Admin", connection);
                }

                if (canonicalRole == null)
                {
                    _logger.LogError("Could not resolve canonical Admin role during JIT migration for {Email}", normalizedEmail);
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                var newAdminUser = new User
                {
                    FullName = legacyAdmin.Email.Split('@')[0],
                    Email = legacyAdmin.Email.Trim().ToLowerInvariant(),
                    PasswordHash = PasswordHasher.HashPassword(request.Password),
                    PhoneNumber = string.Empty,
                    RoleId = canonicalRole.RoleId,
                    Role = canonicalRole,
                    AdminId = legacyAdmin.Id,
                    StudentId = null,
                    StaffId = null,
                    IsFirstLogin = false,
                    IsActive = legacyAdmin.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };

                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        var newUserId = await _userRepository.CreateUserAsync(newAdminUser, connection, transaction);
                        transaction.Commit();
                        newAdminUser.UserId = newUserId;
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback();
                        _logger.LogWarning(ex, "Concurrency collision during Admin JIT user creation for {Email}. Re-reading Users row.", normalizedEmail);

                        var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail, connection);
                        if (existingUser != null)
                        {
                            newAdminUser = existingUser;
                            if (newAdminUser.Role == null && newAdminUser.RoleId > 0)
                            {
                                newAdminUser.Role = await _userRepository.GetRoleByIdAsync(newAdminUser.RoleId, connection) ?? null!;
                            }
                        }
                        else
                        {
                            return new AuthResult
                            {
                                Status = false,
                                Message = "Invalid Email or Password"
                            };
                        }
                    }
                }

                var adminToken = await _jwtTokenHelper.GenerateTokenAsync(newAdminUser);
                return new AuthResult
                {
                    Status = true,
                    Message = "Login Successful",
                    AccessToken = adminToken,
                    UserId = newAdminUser.UserId,
                    Name = newAdminUser.FullName,
                    Role = newAdminUser.Role?.RoleName ?? canonicalRole.RoleName
                };
            }

            // 2B. Legacy Student JIT Migration
            var legacyStudent = await connection.QueryFirstOrDefaultAsync<Student>(
                "SELECT StudentId, StudentName, Email, MobileNumber, PasswordHash, IsActive FROM `Students` WHERE LOWER(Email) = @Email LIMIT 1;",
                new { Email = normalizedEmail });

            if (legacyStudent != null)
            {
                if (string.IsNullOrWhiteSpace(legacyStudent.Email))
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                if (!legacyStudent.IsActive)
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                if (string.IsNullOrWhiteSpace(legacyStudent.PasswordHash) ||
                    !PasswordHasher.VerifyPassword(request.Password, legacyStudent.PasswordHash))
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                // Legacy student credentials verified. Resolve canonical Student role dynamically
                var studentRole = await _userRepository.GetRoleByNameAsync("Student", connection);
                if (studentRole == null)
                {
                    _logger.LogError("Could not resolve canonical Student role during JIT migration for {Email}", normalizedEmail);
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid Email or Password"
                    };
                }

                var newStudentUser = new User
                {
                    FullName = legacyStudent.StudentName,
                    Email = legacyStudent.Email.Trim().ToLowerInvariant(),
                    PasswordHash = PasswordHasher.HashPassword(request.Password),
                    PhoneNumber = legacyStudent.MobileNumber ?? string.Empty,
                    RoleId = studentRole.RoleId,
                    Role = studentRole,
                    StudentId = legacyStudent.StudentId,
                    StaffId = null,
                    AdminId = null,
                    IsFirstLogin = false,
                    IsActive = legacyStudent.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastLogin = DateTime.UtcNow
                };

                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        var newUserId = await _userRepository.CreateUserAsync(newStudentUser, connection, transaction);
                        transaction.Commit();
                        newStudentUser.UserId = newUserId;
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback();
                        _logger.LogWarning(ex, "Concurrency collision during Student JIT user creation for {Email}. Re-reading Users row.", normalizedEmail);

                        var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail, connection);
                        if (existingUser != null)
                        {
                            newStudentUser = existingUser;
                            if (newStudentUser.Role == null && newStudentUser.RoleId > 0)
                            {
                                newStudentUser.Role = await _userRepository.GetRoleByIdAsync(newStudentUser.RoleId, connection) ?? null!;
                            }
                        }
                        else
                        {
                            return new AuthResult
                            {
                                Status = false,
                                Message = "Invalid Email or Password"
                            };
                        }
                    }
                }

                var studentToken = await _jwtTokenHelper.GenerateTokenAsync(newStudentUser);
                return new AuthResult
                {
                    Status = true,
                    Message = "Login Successful",
                    AccessToken = studentToken,
                    UserId = newStudentUser.UserId,
                    Name = newStudentUser.FullName,
                    Role = newStudentUser.Role?.RoleName ?? studentRole.RoleName
                };
            }

            // 2C. Legacy Staff / Unknown
            // Staff has NO legacy password store and cannot be authenticated via JIT password migration
            return new AuthResult
            {
                Status = false,
                Message = "Invalid Email or Password"
            };
        }

        public async Task<AuthResult> RegisterAsync(RegisterRequest request)
        {
            if (request.Password != request.ConfirmPassword)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Password and Confirm Password do not match"
                };
            }

            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Email address is already registered."
                };
            }

            var role = await _userRepository.GetRoleByNameAsync(request.Role);
            if (role == null)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Selected role is invalid."
                };
            }

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.MobileNumber,
                PasswordHash = PasswordHasher.HashPassword(request.Password),
                RoleId = role.RoleId
            };

            await _userRepository.AddAsync(user);

            return new AuthResult
            {
                Status = true,
                Message = "Registration Successful",
                UserId = user.UserId,
                Name = user.FullName,
                Role = role.RoleName
            };
        }

        public async Task<AuthResult> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return new AuthResult
                {
                    Status = true,
                    Message = "OTP has been sent to your registered email."
                };
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var user = await _userRepository.GetByEmailAsync(normalizedEmail);

            // Enumeration protection: If user doesn't exist or is inactive, return generic success
            if (user == null || !user.IsActive)
            {
                return new AuthResult
                {
                    Status = true,
                    Message = "OTP has been sent to your registered email."
                };
            }

            // Check linked domain entity status
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            if (user.StudentId.HasValue)
            {
                var isStudentActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM Students WHERE StudentId = @StudentId LIMIT 1;",
                    new { StudentId = user.StudentId.Value });
                if (!isStudentActive)
                {
                    return new AuthResult { Status = true, Message = "OTP has been sent to your registered email." };
                }
            }
            else if (user.AdminId.HasValue)
            {
                var isAdminActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM admins WHERE id = @AdminId LIMIT 1;",
                    new { AdminId = user.AdminId.Value });
                if (!isAdminActive)
                {
                    return new AuthResult { Status = true, Message = "OTP has been sent to your registered email." };
                }
            }
            else if (user.StaffId.HasValue)
            {
                var isStaffActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT COUNT(*) FROM Staff WHERE Id = @StaffId AND Status != 'Inactive' AND IsDeleted = 0;",
                    new { StaffId = user.StaffId.Value });
                if (!isStaffActive)
                {
                    return new AuthResult { Status = true, Message = "OTP has been sent to your registered email." };
                }
            }

            // Cryptographically secure 6-digit OTP
            var otpCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            var otp = new OTP
            {
                Email = normalizedEmail,
                OTPCode = otpCode,
                ExpiryTime = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false
            };

            await _otpRepository.AddAsync(otp);

            _logger.LogInformation("Password reset OTP created for UserId: {UserId}", user.UserId);

            // Send email via _emailService if available
            if (_emailService != null)
            {
                try
                {
                    await _emailService.SendEmailAsync(
                        normalizedEmail,
                        "Password Reset OTP",
                        $@"
                        <h2>College Management System</h2>
                        <p>Your OTP for password reset is:</p>
                        <h1>{otpCode}</h1>
                        <p>This OTP is valid for 5 minutes.</p>");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to deliver OTP email to {Email}", normalizedEmail);
                }
            }

            return new AuthResult
            {
                Status = true,
                Message = "OTP has been sent to your registered email."
            };
        }

        public async Task<AuthResult> VerifyOtpAsync(VerifyOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var otpCode = request.Otp.Trim();

            var user = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (user == null || !user.IsActive)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            // Check domain active status
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            if (user.StudentId.HasValue)
            {
                var isStudentActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM Students WHERE StudentId = @StudentId LIMIT 1;",
                    new { StudentId = user.StudentId.Value });
                if (!isStudentActive)
                {
                    return new AuthResult { Status = false, Message = "Invalid or expired OTP" };
                }
            }
            else if (user.AdminId.HasValue)
            {
                var isAdminActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM admins WHERE id = @AdminId LIMIT 1;",
                    new { AdminId = user.AdminId.Value });
                if (!isAdminActive)
                {
                    return new AuthResult { Status = false, Message = "Invalid or expired OTP" };
                }
            }
            else if (user.StaffId.HasValue)
            {
                var isStaffActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT COUNT(*) FROM Staff WHERE Id = @StaffId AND Status != 'Inactive' AND IsDeleted = 0;",
                    new { StaffId = user.StaffId.Value });
                if (!isStaffActive)
                {
                    return new AuthResult { Status = false, Message = "Invalid or expired OTP" };
                }
            }

            var otpRecord = await _otpRepository.GetLatestActiveOtpAsync(normalizedEmail, otpCode);
            if (otpRecord == null || otpRecord.IsUsed || otpRecord.ExpiryTime <= DateTime.UtcNow)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired OTP"
                };
            }

            // Generate secure short-lived reset context token bound strictly to Users.UserId and normalizedEmail
            var resetToken = Guid.NewGuid().ToString("N");
            var context = new VerifiedResetContext
            {
                UserId = user.UserId,
                Email = normalizedEmail,
                OtpId = otpRecord.OTPId,
                ResetToken = resetToken,
                ExpiryTime = DateTime.UtcNow.AddMinutes(10),
                IsConsumed = false
            };

            // Store in verified contexts (index by resetToken AND by email+OTP code)
            _verifiedResetContexts[resetToken] = context;
            _verifiedResetContexts[$"email_{normalizedEmail}_{otpCode}"] = context;

            return new AuthResult
            {
                Status = true,
                Message = "OTP Verified Successfully",
                ResetToken = resetToken
            };
        }

        public async Task<AuthResult> ResetPasswordAsync(ResetPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Email address is required."
                };
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "New password is required."
                };
            }

            if (request.Password != request.ConfirmPassword)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Password and Confirm Password do not match"
                };
            }

            if (request.Password.Length < 6)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "New password must be at least 6 characters long."
                };
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var user = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (user == null || !user.IsActive)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired password reset session. Please request a new OTP."
                };
            }

            // Resolve verified reset context using ResetToken or email+OTP
            VerifiedResetContext? context = null;
            if (!string.IsNullOrWhiteSpace(request.ResetToken) && _verifiedResetContexts.TryGetValue(request.ResetToken.Trim(), out var ctx1))
            {
                context = ctx1;
            }
            else if (!string.IsNullOrWhiteSpace(request.OTP) && _verifiedResetContexts.TryGetValue($"email_{normalizedEmail}_{request.OTP.Trim()}", out var ctx2))
            {
                context = ctx2;
            }

            // Enforce verified reset context requirement:
            if (context == null || context.IsConsumed || context.ExpiryTime <= DateTime.UtcNow)
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired password reset session. Please request a new OTP."
                };
            }

            // Security binding: The verified reset context MUST match user.UserId and normalizedEmail
            if (context.UserId != user.UserId || !string.Equals(context.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                return new AuthResult
                {
                    Status = false,
                    Message = "Invalid or expired password reset session. Please request a new OTP."
                };
            }

            // Check linked domain status
            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            if (user.StudentId.HasValue)
            {
                var isStudentActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM Students WHERE StudentId = @StudentId LIMIT 1;",
                    new { StudentId = user.StudentId.Value });
                if (!isStudentActive)
                {
                    return new AuthResult { Status = false, Message = "Account is inactive or disabled." };
                }
            }
            else if (user.AdminId.HasValue)
            {
                var isAdminActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT IsActive FROM admins WHERE id = @AdminId LIMIT 1;",
                    new { AdminId = user.AdminId.Value });
                if (!isAdminActive)
                {
                    return new AuthResult { Status = false, Message = "Account is inactive or disabled." };
                }
            }
            else if (user.StaffId.HasValue)
            {
                var isStaffActive = await connection.ExecuteScalarAsync<bool>(
                    "SELECT COUNT(*) FROM Staff WHERE Id = @StaffId AND Status != 'Inactive' AND IsDeleted = 0;",
                    new { StaffId = user.StaffId.Value });
                if (!isStaffActive)
                {
                    return new AuthResult { Status = false, Message = "Account is inactive or disabled." };
                }
            }

            // Concurrency-safe atomic consumption of reset context
            lock (context)
            {
                if (context.IsConsumed)
                {
                    return new AuthResult
                    {
                        Status = false,
                        Message = "Invalid or expired password reset session. Please request a new OTP."
                    };
                }
                context.IsConsumed = true;
            }
            _verifiedResetContexts.TryRemove(context.ResetToken, out _);
            _verifiedResetContexts.TryRemove($"email_{context.Email}_{request.OTP?.Trim()}", out _);

            // Compute BCrypt hash using PasswordHasher
            var newPasswordHash = PasswordHasher.HashPassword(request.Password);

            // Perform atomic update in transaction
            using (var transaction = await connection.BeginTransactionAsync())
            {
                try
                {
                    await _userRepository.UpdatePasswordWithDualWriteAsync(
                        user.UserId,
                        newPasswordHash,
                        user.AdminId,
                        user.StudentId,
                        connection,
                        transaction);

                    var otpRecord = await _otpRepository.GetByIdAsync(context.OtpId, connection, transaction);
                    if (otpRecord != null)
                    {
                        otpRecord.IsUsed = true;
                        await _otpRepository.UpdateAsync(otpRecord, connection, transaction);
                    }

                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to update password for UserId: {UserId}", user.UserId);
                    return new AuthResult
                    {
                        Status = false,
                        Message = "An error occurred while resetting password."
                    };
                }
            }

            _logger.LogInformation("Password reset successfully for UserId: {UserId}", user.UserId);

            if (_emailService != null)
            {
                try
                {
                    await _emailService.SendEmailAsync(
                        normalizedEmail,
                        "Password Changed Successfully",
                        @"
                        <h2>College Management System</h2>
                        <p>Your password has been changed successfully.</p>
                        <p>If you did not make this change, please contact administration immediately.</p>");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send password reset confirmation email to {Email}", normalizedEmail);
                }
            }

            return new AuthResult
            {
                Status = true,
                Message = "Password Reset Successfully"
            };
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int userId, string oldPassword, string newPassword, string confirmPassword)
        {
            if (userId <= 0)
            {
                return (false, "Invalid user identifier.");
            }

            if (string.IsNullOrWhiteSpace(oldPassword))
            {
                return (false, "Old password is required.");
            }

            if (string.IsNullOrWhiteSpace(newPassword))
            {
                return (false, "New password is required.");
            }

            if (newPassword != confirmPassword)
            {
                return (false, "New password and confirmation password do not match.");
            }

            if (newPassword.Length < 6)
            {
                return (false, "New password must be at least 6 characters.");
            }

            if (oldPassword == newPassword)
            {
                return (false, "New password cannot be the same as the old password.");
            }

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            // 1. Authoritative Users table lookup
            var user = await _userRepository.GetByIdAsync(userId, connection);
            if (user == null || !user.IsActive)
            {
                return (false, "User account not found or is inactive.");
            }

            // 2. Linked domain active status validation
            if (user.AdminId.HasValue && user.AdminId.Value > 0)
            {
                var adminActive = await connection.QueryFirstOrDefaultAsync<bool?>(
                    "SELECT IsActive FROM `admins` WHERE `id` = @Id LIMIT 1;",
                    new { Id = user.AdminId.Value });

                if (adminActive != true)
                {
                    return (false, "Linked administrator account is inactive.");
                }
            }
            else if (user.StaffId.HasValue && user.StaffId.Value > 0)
            {
                var staffStatus = await connection.QueryFirstOrDefaultAsync<(bool IsDeleted, string Status)?>(
                    "SELECT IsDeleted, Status FROM `Staff` WHERE `Id` = @Id LIMIT 1;",
                    new { Id = user.StaffId.Value });

                if (!staffStatus.HasValue || staffStatus.Value.IsDeleted || !string.Equals(staffStatus.Value.Status, "Active", StringComparison.OrdinalIgnoreCase))
                {
                    return (false, "Linked staff account is inactive or deleted.");
                }
            }
            else if (user.StudentId.HasValue && user.StudentId.Value > 0)
            {
                var studentActive = await connection.QueryFirstOrDefaultAsync<bool?>(
                    "SELECT IsActive FROM `Students` WHERE `StudentId` = @Id LIMIT 1;",
                    new { Id = user.StudentId.Value });

                if (studentActive != true)
                {
                    return (false, "Linked student account is inactive.");
                }
            }

            // 3. Verify OldPassword strictly against Users.PasswordHash
            if (!PasswordHasher.VerifyPassword(oldPassword, user.PasswordHash))
            {
                return (false, "Old password is incorrect.");
            }

            // 4. Hash new password
            var newPasswordHash = PasswordHasher.HashPassword(newPassword);

            // 5. Transactional atomic update
            using (var transaction = connection.BeginTransaction())
            {
                try
                {
                    var updated = await _userRepository.UpdatePasswordWithDualWriteAsync(
                        userId,
                        newPasswordHash,
                        user.AdminId,
                        user.StudentId,
                        connection,
                        transaction);

                    if (!updated)
                    {
                        transaction.Rollback();
                        return (false, "Failed to update password.");
                    }

                    transaction.Commit();
                    return (true, "Password changed successfully.");
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    _logger.LogError(ex, "Transaction failed while changing password for UserId {UserId}", userId);
                    return (false, "Failed to update password.");
                }
            }
        }

        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return users.Select(u => new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                RoleName = u.Role?.RoleName ?? string.Empty
            }).ToList();
        }

        public async Task<UserDto?> GetUserByIdAsync(int id)
        {
            var u = await _userRepository.GetByIdAsync(id);
            if (u == null) return null;

            return new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                RoleName = u.Role?.RoleName ?? string.Empty
            };
        }
    }
}
