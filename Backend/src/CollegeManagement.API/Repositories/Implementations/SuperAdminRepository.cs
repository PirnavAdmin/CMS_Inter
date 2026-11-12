using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.SuperAdmin;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class SuperAdminRepository : ISuperAdminRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SuperAdminRepository> _logger;

        public SuperAdminRepository(AppDbContext context, ILogger<SuperAdminRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        #region 1. Dashboard
        public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
        {
            using var multi = await Connection.QueryMultipleAsync(
                "sp_SuperAdmin_GetDashboardSummary",
                commandType: CommandType.StoredProcedure);

            var summary = await multi.ReadFirstOrDefaultAsync<DashboardSummaryDto>() ?? new DashboardSummaryDto();
            summary.RegistrationTrend = (await multi.ReadAsync<RegistrationTrendDto>()).ToList();
            summary.PlanDistribution = (await multi.ReadAsync<PlanDistributionDto>()).ToList();

            return summary;
        }
        #endregion

        #region 2. Colleges
        public async Task<(IEnumerable<CollegeDto> Colleges, int TotalCount)> GetCollegesPagedAsync(string? searchTerm, string? status, int? planId, int page, int pageSize)
        {
            var p = new DynamicParameters();
            p.Add("p_SearchTerm", searchTerm);
            p.Add("p_Status", status);
            p.Add("p_PlanId", planId);
            p.Add("p_Page", page);
            p.Add("p_PageSize", pageSize);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_SuperAdmin_GetCollegesPaged",
                p,
                commandType: CommandType.StoredProcedure);

            int totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var collegesRaw = (await multi.ReadAsync<dynamic>()).ToList();

            var list = collegesRaw.Select(c => new CollegeDto
            {
                CollegeId = (int)c.CollegeId,
                Id = "COL-" + ((int)c.CollegeId).ToString("D3"),
                Code = (string)c.CollegeCode,
                Name = (string)c.CollegeName,
                Email = (string)c.OfficialEmail,
                Phone = (string?)c.ContactPhone,
                Address = (string?)c.Address,
                Logo = (string?)c.LogoUrl,
                Admin = (string?)c.OfficialEmail,
                Plan = (string)c.PlanName,
                Status = (string)c.Status,
                Registered = c.RegisteredAt != null ? ((DateTime)c.RegisteredAt).ToString("yyyy-MM-dd") : "",
                ActiveAccounts = Convert.ToInt32(c.ActiveUsersCount ?? 0),
                AccountLimit = Convert.ToInt32(c.AccountLimit ?? 25),
                Students = Convert.ToInt32(c.TotalStudents ?? c.TotalStudentsCount ?? 0),
                TotalStudents = Convert.ToInt32(c.TotalStudents ?? c.TotalStudentsCount ?? 0)
            }).ToList();

            return (list, totalCount);
        }

        public async Task<CollegeDto?> GetCollegeByIdAsync(int collegeId)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);

            var c = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_SuperAdmin_GetCollegeById",
                p,
                commandType: CommandType.StoredProcedure);

            if (c == null) return null;

            return new CollegeDto
            {
                CollegeId = (int)c.CollegeId,
                Id = "COL-" + ((int)c.CollegeId).ToString("D3"),
                Code = (string)c.CollegeCode,
                Name = (string)c.CollegeName,
                Email = (string)c.OfficialEmail,
                Phone = (string?)c.ContactPhone,
                Address = (string?)c.Address,
                Logo = (string?)c.LogoUrl,
                Admin = (string?)c.AdminFullName ?? (string?)c.OfficialEmail,
                Plan = (string)c.PlanName,
                Status = (string)c.Status,
                Registered = c.RegisteredAt != null ? ((DateTime)c.RegisteredAt).ToString("yyyy-MM-dd") : "",
                Renewal = c.RenewalDate != null ? ((DateTime)c.RenewalDate).ToString("yyyy-MM-dd") : "",
                ActiveAccounts = Convert.ToInt32(c.ActiveUsersCount ?? 0),
                AccountLimit = Convert.ToInt32(c.AccountLimit ?? 25)
            };
        }

        public async Task<int> CreateCollegeWithAdminAsync(CreateCollegeRequest request, string? adminPasswordHash)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeCode", request.Code.Trim().ToUpper());
            p.Add("p_CollegeName", request.Name.Trim());
            p.Add("p_OfficialEmail", request.Email.Trim().ToLower());
            p.Add("p_ContactPhone", request.Phone);
            p.Add("p_Address", request.Address);
            p.Add("p_LogoUrl", request.Logo);
            p.Add("p_AdminFullName", request.Admin ?? "College Admin");
            p.Add("p_AdminEmail", request.AdminEmail ?? request.Email);
            p.Add("p_AdminPasswordHash", adminPasswordHash);
            p.Add("p_CreatedBy", 1);
            p.Add("p_NewCollegeId", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                "sp_SuperAdmin_CreateCollegeWithAdmin",
                p,
                commandType: CommandType.StoredProcedure);

            return p.Get<int>("p_NewCollegeId");
        }

        public async Task<bool> UpdateCollegeAsync(int collegeId, UpdateCollegeRequest request)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_CollegeName", request.Name);
            p.Add("p_OfficialEmail", null);
            p.Add("p_ContactPhone", request.Phone);
            p.Add("p_Address", request.Address);
            p.Add("p_LogoUrl", request.Logo);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdateCollege",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> UpdateCollegeStatusAsync(int collegeId, string status)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_Status", status);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdateCollegeStatus",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 3. College Admins
        public async Task<IEnumerable<CollegeAdminDto>> GetCollegeAdminsAsync(int? collegeId)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_SearchTerm", null);
            p.Add("p_Status", null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetCollegeAdmins",
                p,
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => new CollegeAdminDto
            {
                UserId = (int)r.UserId,
                Id = "U-" + ((int)r.UserId).ToString(),
                Name = (string)r.FullName,
                Email = (string)r.Email,
                Phone = (string)(r.PhoneNumber ?? ""),
                PhoneNumber = (string)(r.PhoneNumber ?? ""),
                LastLogin = r.LastLogin != null ? ((DateTime)r.LastLogin).ToString("yyyy-MM-dd HH:mm:ss") : null,
                CollegeId = (int)(r.CollegeId ?? 0),
                CollegeName = (string)(r.CollegeName ?? ""),
                CollegeCode = (string)(r.CollegeCode ?? ""),
                Role = "CollegeAdmin",
                Active = Convert.ToBoolean(r.IsActive),
                LoginEnabled = true,
                CreatedAt = r.CreatedAt != null ? ((DateTime)r.CreatedAt).ToString("yyyy-MM-dd") : null
            });
        }

        public async Task<int> CreateCollegeAdminAsync(CreateCollegeAdminRequest request, string defaultPasswordHash)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", request.CollegeId);
            p.Add("p_FullName", request.Name);
            p.Add("p_Email", request.Email.Trim().ToLower());
            p.Add("p_PhoneNumber", request.PhoneNumber ?? request.Phone ?? "+91 9000000000");
            p.Add("p_PasswordHash", defaultPasswordHash);
            p.Add("p_CreatedBy", 1);
            p.Add("p_NewUserId", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                "sp_SuperAdmin_CreateCollegeAdmin",
                p,
                commandType: CommandType.StoredProcedure);

            return p.Get<int>("p_NewUserId");
        }
        #endregion

        #region 4. Global Users
        public async Task<(IEnumerable<GlobalUserDto> Users, int TotalCount)> GetGlobalUsersPagedAsync(string? searchTerm, int? collegeId, string? role, string? status, int page, int pageSize)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_RoleId", null);
            p.Add("p_Status", status);
            p.Add("p_SearchTerm", searchTerm);
            p.Add("p_Page", page);
            p.Add("p_PageSize", pageSize);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_SuperAdmin_GetGlobalUsersPaged",
                p,
                commandType: CommandType.StoredProcedure);

            int totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var rows = (await multi.ReadAsync<dynamic>()).ToList();

            var list = rows.Select(r => new GlobalUserDto
            {
                UserId = (int)r.UserId,
                Id = "U-" + ((int)r.UserId).ToString(),
                Name = (string)r.FullName,
                Email = (string)r.Email,
                Phone = (string)(r.PhoneNumber ?? ""),
                PhoneNumber = (string)(r.PhoneNumber ?? ""),
                CollegeId = r.CollegeId != null ? "COL-" + ((int)r.CollegeId).ToString("D3") : null,
                CollegeName = (string)(r.CollegeName ?? "Platform"),
                Role = (string)(r.RoleName ?? "User"),
                Active = Convert.ToBoolean(r.IsActive),
                LoginEnabled = true,
                AccountStatus = Convert.ToBoolean(r.IsActive) ? "Active" : "Inactive",
                LastLogin = r.LastLogin != null ? ((DateTime)r.LastLogin).ToString("yyyy-MM-dd HH:mm") : null,
                CreatedAt = r.CreatedAt != null ? ((DateTime)r.CreatedAt).ToString("yyyy-MM-dd") : null
            }).ToList();

            return (list, totalCount);
        }

        public async Task<GlobalUserDto?> GetUserDetailAsync(int userId)
        {
            var p = new DynamicParameters();
            p.Add("p_UserId", userId);

            var r = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_SuperAdmin_GetUserDetail",
                p,
                commandType: CommandType.StoredProcedure);

            if (r == null) return null;

            return new GlobalUserDto
            {
                UserId = (int)r.UserId,
                Id = "U-" + ((int)r.UserId).ToString(),
                Name = (string)r.FullName,
                Email = (string)r.Email,
                CollegeId = r.CollegeId != null ? "COL-" + ((int)r.CollegeId).ToString("D3") : null,
                CollegeName = (string)(r.CollegeName ?? "Platform"),
                Role = (string)(r.RoleName ?? "User"),
                Active = Convert.ToBoolean(r.IsActive),
                LoginEnabled = true,
                AccountStatus = Convert.ToBoolean(r.IsActive) ? "Active" : "Inactive",
                LastLogin = r.LastLogin != null ? ((DateTime)r.LastLogin).ToString("yyyy-MM-dd HH:mm") : null,
                CreatedAt = r.CreatedAt != null ? ((DateTime)r.CreatedAt).ToString("yyyy-MM-dd") : null
            };
        }

        public async Task<bool> UpdateUserAsync(int userId, SuperAdminUpdateUserRequest request)
        {
            var p = new DynamicParameters();
            p.Add("UserId", userId);
            p.Add("FullName", request.Name ?? request.FullName);
            p.Add("Email", request.Email?.Trim().ToLower());
            p.Add("PhoneNumber", request.Phone ?? request.PhoneNumber);
            p.Add("IsActive", request.Active ?? request.IsActive);
            p.Add("CollegeId", request.CollegeId);

            var sql = @"
                UPDATE Users
                SET FullName = COALESCE(@FullName, FullName),
                    Email = COALESCE(@Email, Email),
                    PhoneNumber = COALESCE(@PhoneNumber, PhoneNumber),
                    IsActive = COALESCE(@IsActive, IsActive),
                    CollegeId = COALESCE(@CollegeId, CollegeId),
                    UpdatedAt = CURRENT_TIMESTAMP(6)
                WHERE UserId = @UserId;";

            int rows = await Connection.ExecuteAsync(sql, p);
            return rows > 0;
        }

        public async Task<bool> UpdateUserStatusAsync(int userId, bool isActive)
        {
            var p = new DynamicParameters();
            p.Add("p_UserId", userId);
            p.Add("p_IsActive", isActive ? 1 : 0);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdateUserStatus",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> ResetUserPasswordAsync(int userId, string passwordHash)
        {
            var p = new DynamicParameters();
            p.Add("p_UserId", userId);
            p.Add("p_NewPasswordHash", passwordHash);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_ResetUserPassword",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 5. Subscription Plans
        public async Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync()
        {
            var plans = (await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetAllPlans",
                commandType: CommandType.StoredProcedure)).ToList();

            var matrix = (await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetPlanModuleMatrix",
                commandType: CommandType.StoredProcedure)).ToList();

            return plans.Select(p =>
            {
                int planId = (int)p.PlanId;
                var modules = matrix
                    .Where(m => (int)m.PlanId == planId && Convert.ToBoolean(m.IsEnabled))
                    .Select(m => (string)m.ModuleName)
                    .ToList();

                return new SubscriptionPlanDto
                {
                    PlanId = planId,
                    Name = (string)p.PlanName,
                    Description = (string?)p.Description,
                    Price = (decimal)p.Price,
                    Limit = (int)p.AccountLimit,
                    DurationDays = (int)p.DurationDays,
                    Active = Convert.ToBoolean(p.IsActive),
                    Modules = modules
                };
            });
        }

        public async Task<int> SavePlanAsync(SavePlanRequest request, int? planId)
        {
            var p = new DynamicParameters();
            p.Add("p_PlanId", planId);
            p.Add("p_PlanName", request.Name);
            p.Add("p_Description", request.Description);
            p.Add("p_Price", request.Price);
            p.Add("p_DurationDays", request.DurationDays);
            p.Add("p_AccountLimit", request.Limit);
            p.Add("p_UpdatedBy", 1);
            p.Add("p_ResultPlanId", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                "sp_SuperAdmin_SavePlan",
                p,
                commandType: CommandType.StoredProcedure);

            int savedPlanId = p.Get<int>("p_ResultPlanId");

            if (request.Modules != null && request.Modules.Any())
            {
                var standardModules = new[] { "Students", "Staff", "Attendance", "Fees", "Examinations", "Timetable", "Transport", "Hostel", "Library", "Reports" };
                foreach (var mod in standardModules)
                {
                    bool isEnabled = request.Modules.Contains(mod);
                    var modP = new DynamicParameters();
                    modP.Add("p_PlanId", savedPlanId);
                    modP.Add("p_ModuleName", mod);
                    modP.Add("p_IsEnabled", isEnabled ? 1 : 0);

                    await Connection.ExecuteAsync(
                        "sp_SuperAdmin_UpdatePlanModuleMatrix",
                        modP,
                        commandType: CommandType.StoredProcedure);
                }
            }

            return savedPlanId;
        }

        public async Task<bool> UpdatePlanStatusAsync(int planId, bool isActive)
        {
            var p = new DynamicParameters();
            p.Add("p_PlanId", planId);
            p.Add("p_IsActive", isActive ? 1 : 0);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdatePlanStatus",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 6. College Subscriptions
        public async Task<IEnumerable<CollegeSubscriptionDto>> GetCollegeSubscriptionsAsync()
        {
            var p = new DynamicParameters();
            p.Add("p_Status", null);
            p.Add("p_SearchTerm", null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetCollegeSubscriptions",
                p,
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => new CollegeSubscriptionDto
            {
                SubscriptionId = (int)(r.SubscriptionId ?? 0),
                CollegeId = (int)r.CollegeId,
                Name = (string)(r.CollegeName ?? ""),
                Code = (string)(r.CollegeCode ?? ""),
                Plan = (string)(r.PlanName ?? "-"),
                Active = Convert.ToInt32(r.ActiveUsersCount ?? 0),
                Limit = r.AccountLimit != null ? Convert.ToInt32(r.AccountLimit) : (int?)null,
                SubscriptionStart = r.StartDate != null ? ((DateTime)r.StartDate).ToString("yyyy-MM-dd") : null,
                Renewal = r.RenewalDate != null ? ((DateTime)r.RenewalDate).ToString("yyyy-MM-dd") : null,
                SubscriptionStatus = (string)(r.Status ?? "-"),
                Days = r.RenewalDate != null ? (int?)Math.Round(((DateTime)r.RenewalDate - DateTime.Today).TotalDays) : null
            });
        }

        public async Task<bool> ChangeCollegePlanAsync(int collegeId, string newPlanName, string performedBy)
        {
            var plans = await GetAllPlansAsync();
            var plan = plans.FirstOrDefault(p => string.Equals(p.Name, newPlanName, StringComparison.OrdinalIgnoreCase));
            if (plan == null) throw new InvalidOperationException($"Plan '{newPlanName}' not found.");

            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_NewPlanId", plan.PlanId);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_ChangeCollegePlan",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> RenewCollegeSubscriptionAsync(int collegeId, int extensionDays, string performedBy)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_DaysToAdd", extensionDays);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_RenewCollegeSubscription",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> CancelCollegeSubscriptionAsync(int collegeId, string performedBy)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_UpdatedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_CancelCollegeSubscription",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 7. Account Usage
        public async Task<IEnumerable<AccountUsageDto>> GetAccountUsageStatsAsync()
        {
            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetAccountUsageStats",
                commandType: CommandType.StoredProcedure);

            return rows.Select(r =>
            {
                int active = Convert.ToInt32(r.ActiveAccounts ?? 0);
                int limit = Convert.ToInt32(r.AccountLimit ?? 25);
                decimal pct = limit > 0 ? Math.Round(((decimal)active / limit) * 100, 1) : 0;
                int avail = Math.Max(0, limit - active);

                return new AccountUsageDto
                {
                    CollegeId = (int)r.CollegeId,
                    Name = (string)r.CollegeName,
                    Plan = (string)r.PlanName,
                    Active = active,
                    Limit = limit,
                    Available = avail,
                    Percentage = pct,
                    SubscriptionStatus = (string)r.SubscriptionStatus
                };
            });
        }
        #endregion

        #region 8. Renewals
        public async Task<(IEnumerable<RenewalDto> Renewals, int TotalCount)> GetRenewalsPagedAsync(int daysThreshold, int page, int pageSize)
        {
            var p = new DynamicParameters();
            p.Add("p_DaysAhead", daysThreshold);
            p.Add("p_PlanId", null);

            var rows = (await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetRenewalsPaged",
                p,
                commandType: CommandType.StoredProcedure)).ToList();

            var list = rows.Select(r => new RenewalDto
            {
                CollegeId = (int)r.CollegeId,
                Name = (string)r.CollegeName,
                Plan = (string)r.PlanName,
                Renewal = r.RenewalDate != null ? ((DateTime)r.RenewalDate).ToString("yyyy-MM-dd") : null,
                Days = r.RenewalDate != null ? (int?)Math.Round(((DateTime)r.RenewalDate - DateTime.Today).TotalDays) : null,
                SubscriptionStatus = (string)r.SubscriptionStatus
            }).ToList();

            return (list, list.Count);
        }
        #endregion

        #region 9. Payments & Invoices
        public async Task<IEnumerable<PlatformPaymentDto>> GetPaymentsAndInvoicesAsync()
        {
            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetPaymentsAndInvoices",
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => new PlatformPaymentDto
            {
                PaymentId = (int)r.PaymentId,
                Id = "PAY-" + ((int)r.PaymentId).ToString("D3"),
                Invoice = (string)r.InvoiceNumber,
                CollegeId = "COL-" + ((int)r.CollegeId).ToString("D3"),
                CollegeName = (string)r.CollegeName,
                Amount = (decimal)r.Amount,
                Date = ((DateTime)r.PaymentDate).ToString("yyyy-MM-dd"),
                Status = (string)r.Status,
                PaymentMethod = (string)(r.PaymentMethod ?? "Bank Transfer"),
                TransactionReference = (string?)r.TransactionReference
            });
        }

        public async Task<bool> VerifyPlatformPaymentAsync(int paymentId, string verifiedBy)
        {
            var p = new DynamicParameters();
            p.Add("p_PaymentId", paymentId);
            p.Add("p_VerifiedBy", 1);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_VerifyPlatformPayment",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 10. Module Management
        public async Task<IEnumerable<PlanModuleItemDto>> GetPlanModuleMatrixAsync()
        {
            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetPlanModuleMatrix",
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => new PlanModuleItemDto
            {
                PlanId = (int)r.PlanId,
                PlanName = (string)r.PlanName,
                ModuleName = (string)r.ModuleName,
                IsEnabled = Convert.ToBoolean(r.IsEnabled)
            });
        }

        public async Task<bool> UpdatePlanModuleMatrixAsync(int planId, string moduleName, bool isEnabled)
        {
            var p = new DynamicParameters();
            p.Add("p_PlanId", planId);
            p.Add("p_ModuleName", moduleName);
            p.Add("p_IsEnabled", isEnabled ? 1 : 0);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdatePlanModuleMatrix",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 11. Notifications
        public async Task<IEnumerable<PlatformNotificationDto>> GetNotificationsAsync(bool? isRead, string? category)
        {
            var p = new DynamicParameters();
            p.Add("p_IsRead", isRead.HasValue ? (isRead.Value ? 1 : 0) : null);
            p.Add("p_Category", category);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetNotifications",
                p,
                commandType: CommandType.StoredProcedure);

            return rows.Select(r => new PlatformNotificationDto
            {
                NotificationId = (int)r.Id,
                Id = "notif-" + ((int)r.Id).ToString(),
                Title = (string)r.Title,
                Message = (string)r.Message,
                Category = (string)(r.Category ?? "System Alerts"),
                Date = r.CreatedAt != null ? ((DateTime)r.CreatedAt).ToString("yyyy-MM-dd") : "",
                Status = "Delivered",
                RecipientScope = "Platform",
                Read = Convert.ToBoolean(r.IsRead) ? "Read" : "Unread"
            });
        }

        public async Task<int> CreatePlatformNotificationAsync(CreatePlatformNotificationRequest request, int createdBy)
        {
            var p = new DynamicParameters();
            p.Add("p_Title", request.Title);
            p.Add("p_Message", request.Message);
            p.Add("p_Category", request.Category);
            p.Add("p_CreatedBy", createdBy);
            p.Add("p_NewNotificationId", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                "sp_SuperAdmin_CreatePlatformNotification",
                p,
                commandType: CommandType.StoredProcedure);

            return p.Get<int>("p_NewNotificationId");
        }

        public async Task<bool> MarkNotificationReadAsync(int notificationId)
        {
            var p = new DynamicParameters();
            p.Add("p_NotificationId", notificationId);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_MarkNotificationRead",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion

        #region 12. Audit Logs
        public async Task<(IEnumerable<PlatformAuditLogDto> Logs, int TotalCount)> GetAuditLogsPagedAsync(int? collegeId, string? action, DateTime? fromDate, DateTime? toDate, int page, int pageSize)
        {
            var p = new DynamicParameters();
            p.Add("p_CollegeId", collegeId);
            p.Add("p_Action", action);
            p.Add("p_FromDate", fromDate);
            p.Add("p_ToDate", toDate);
            p.Add("p_Page", page);
            p.Add("p_PageSize", pageSize);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_SuperAdmin_GetAuditLogsPaged",
                p,
                commandType: CommandType.StoredProcedure);

            int totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var rows = (await multi.ReadAsync<dynamic>()).ToList();

            var list = rows.Select(r => new PlatformAuditLogDto
            {
                AuditLogId = (int)r.AuditLogId,
                Id = "AUD-" + ((int)r.AuditLogId).ToString(),
                Message = (string)(r.Description ?? r.Action),
                PerformedBy = (string)(r.UserName ?? "Super Administrator"),
                Role = (string)(r.UserName != null && ((string)r.UserName).Contains("ADM") ? "College Admin" : "Super Admin"),
                Module = (string)(r.EntityName ?? "Platform"),
                College = (string)(r.CollegeName ?? "All Colleges"),
                At = r.CreatedAt != null ? ((DateTime)r.CreatedAt).ToString("o") : DateTime.UtcNow.ToString("o"),
                ActionType = (string)r.Action,
                Status = "Success",
                Scope = r.CollegeId != null ? "College" : "Platform",
                Details = (string?)r.Description
            }).ToList();

            return (list, totalCount);
        }
        #endregion

        #region 13. Platform Settings
        public async Task<PlatformSettingsDto> GetPlatformSettingsAsync()
        {
            var rows = (await Connection.QueryAsync<dynamic>(
                "sp_SuperAdmin_GetPlatformSettings",
                commandType: CommandType.StoredProcedure)).ToDictionary(
                    r => (string)r.SettingKey,
                    r => (string)r.SettingValue);

            var settings = new PlatformSettingsDto();
            if (rows.TryGetValue("PlatformName", out var name) && !string.IsNullOrWhiteSpace(name))
                settings.PlatformName = name;
            if (rows.TryGetValue("SupportEmail", out var email) && !string.IsNullOrWhiteSpace(email))
                settings.SupportEmail = email;
            if (rows.TryGetValue("RenewalReminderDays", out var days) && int.TryParse(days, out int d))
                settings.RenewalDays = d;

            return settings;
        }

        public async Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings, string updatedBy)
        {
            var p = new DynamicParameters();
            p.Add("p_PlatformName", settings.PlatformName);
            p.Add("p_SupportEmail", settings.SupportEmail);
            p.Add("p_RenewalDays", settings.RenewalDays);
            p.Add("p_UpdatedBy", updatedBy);

            int rows = await Connection.ExecuteAsync(
                "sp_SuperAdmin_UpdatePlatformSettings",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
        #endregion
    }
}
