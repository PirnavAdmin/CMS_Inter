using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.SuperAdmin;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class SuperAdminService : ISuperAdminService
    {
        private readonly ISuperAdminRepository _repository;
        private readonly ILogger<SuperAdminService> _logger;

        public SuperAdminService(ISuperAdminRepository repository, ILogger<SuperAdminService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<SuperAdminBootstrapDto> GetBootstrapDataAsync()
        {
            var (colleges, _) = await _repository.GetCollegesPagedAsync(null, null, null, 1, 100);
            var (users, _) = await _repository.GetGlobalUsersPagedAsync(null, null, null, null, 1, 500);
            var plans = await _repository.GetAllPlansAsync();
            var payments = await _repository.GetPaymentsAndInvoicesAsync();
            var (activities, _) = await _repository.GetAuditLogsPagedAsync(null, null, null, null, 1, 50);
            var settings = await _repository.GetPlatformSettingsAsync();
            var notifications = await _repository.GetNotificationsAsync(null, null);

            return new SuperAdminBootstrapDto
            {
                Colleges = colleges.ToList(),
                Users = users.ToList(),
                Plans = plans.ToList(),
                Payments = payments.ToList(),
                Activities = activities.ToList(),
                Settings = settings,
                Notifications = notifications.ToList()
            };
        }

        public Task<DashboardSummaryDto> GetDashboardSummaryAsync() =>
            _repository.GetDashboardSummaryAsync();

        public Task<(IEnumerable<CollegeDto> Colleges, int TotalCount)> GetCollegesPagedAsync(string? searchTerm, string? status, int? planId, int page, int pageSize) =>
            _repository.GetCollegesPagedAsync(searchTerm, status, planId, page, pageSize);

        public Task<CollegeDto?> GetCollegeByIdAsync(int collegeId) =>
            _repository.GetCollegeByIdAsync(collegeId);

        public async Task<int> CreateCollegeAsync(CreateCollegeRequest request, string currentUserName)
        {
            string defaultHash = PasswordHasher.HashPassword("PirnavAdmin@2026!");
            return await _repository.CreateCollegeWithAdminAsync(request, defaultHash);
        }

        public Task<bool> UpdateCollegeAsync(int collegeId, UpdateCollegeRequest request, string currentUserName) =>
            _repository.UpdateCollegeAsync(collegeId, request);

        public Task<bool> UpdateCollegeStatusAsync(int collegeId, string status, string currentUserName) =>
            _repository.UpdateCollegeStatusAsync(collegeId, status);

        public Task<IEnumerable<CollegeAdminDto>> GetCollegeAdminsAsync(int? collegeId) =>
            _repository.GetCollegeAdminsAsync(collegeId);

        public async Task<int> CreateCollegeAdminAsync(CreateCollegeAdminRequest request, string currentUserName)
        {
            string defaultHash = PasswordHasher.HashPassword("PirnavAdmin@2026!");
            return await _repository.CreateCollegeAdminAsync(request, defaultHash);
        }

        public Task<(IEnumerable<GlobalUserDto> Users, int TotalCount)> GetGlobalUsersPagedAsync(string? searchTerm, int? collegeId, string? role, string? status, int page, int pageSize) =>
            _repository.GetGlobalUsersPagedAsync(searchTerm, collegeId, role, status, page, pageSize);

        public Task<GlobalUserDto?> GetUserDetailAsync(int userId) =>
            _repository.GetUserDetailAsync(userId);

        public Task<bool> UpdateUserAsync(int userId, SuperAdminUpdateUserRequest request, string currentUserName) =>
            _repository.UpdateUserAsync(userId, request);

        public Task<bool> UpdateUserStatusAsync(int userId, bool isActive, string currentUserName) =>
            _repository.UpdateUserStatusAsync(userId, isActive);

        public async Task<bool> ResetUserPasswordAsync(int userId, string newPassword, string currentUserName)
        {
            string hash = PasswordHasher.HashPassword(newPassword);
            return await _repository.ResetUserPasswordAsync(userId, hash);
        }

        public Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync() =>
            _repository.GetAllPlansAsync();

        public Task<int> SavePlanAsync(SavePlanRequest request, int? planId, string currentUserName) =>
            _repository.SavePlanAsync(request, planId);

        public Task<bool> UpdatePlanStatusAsync(int planId, bool isActive, string currentUserName) =>
            _repository.UpdatePlanStatusAsync(planId, isActive);

        public Task<IEnumerable<CollegeSubscriptionDto>> GetCollegeSubscriptionsAsync() =>
            _repository.GetCollegeSubscriptionsAsync();

        public Task<bool> ChangeCollegePlanAsync(int collegeId, string newPlanName, string currentUserName) =>
            _repository.ChangeCollegePlanAsync(collegeId, newPlanName, currentUserName);

        public Task<bool> RenewCollegeSubscriptionAsync(int collegeId, int extensionDays, string currentUserName) =>
            _repository.RenewCollegeSubscriptionAsync(collegeId, extensionDays, currentUserName);

        public Task<bool> CancelCollegeSubscriptionAsync(int collegeId, string currentUserName) =>
            _repository.CancelCollegeSubscriptionAsync(collegeId, currentUserName);

        public Task<IEnumerable<AccountUsageDto>> GetAccountUsageStatsAsync() =>
            _repository.GetAccountUsageStatsAsync();

        public Task<(IEnumerable<RenewalDto> Renewals, int TotalCount)> GetRenewalsPagedAsync(int daysThreshold, int page, int pageSize) =>
            _repository.GetRenewalsPagedAsync(daysThreshold, page, pageSize);

        public Task<IEnumerable<PlatformPaymentDto>> GetPaymentsAndInvoicesAsync() =>
            _repository.GetPaymentsAndInvoicesAsync();

        public Task<bool> VerifyPlatformPaymentAsync(int paymentId, string currentUserName) =>
            _repository.VerifyPlatformPaymentAsync(paymentId, currentUserName);

        public Task<IEnumerable<PlanModuleItemDto>> GetPlanModuleMatrixAsync() =>
            _repository.GetPlanModuleMatrixAsync();

        public Task<bool> UpdatePlanModuleMatrixAsync(int planId, string moduleName, bool isEnabled, string currentUserName) =>
            _repository.UpdatePlanModuleMatrixAsync(planId, moduleName, isEnabled);

        public Task<IEnumerable<PlatformNotificationDto>> GetNotificationsAsync(bool? isRead, string? category) =>
            _repository.GetNotificationsAsync(isRead, category);

        public Task<int> CreatePlatformNotificationAsync(CreatePlatformNotificationRequest request, int createdBy) =>
            _repository.CreatePlatformNotificationAsync(request, createdBy);

        public Task<bool> MarkNotificationReadAsync(int notificationId) =>
            _repository.MarkNotificationReadAsync(notificationId);

        public Task<(IEnumerable<PlatformAuditLogDto> Logs, int TotalCount)> GetAuditLogsPagedAsync(int? collegeId, string? action, DateTime? fromDate, DateTime? toDate, int page, int pageSize) =>
            _repository.GetAuditLogsPagedAsync(collegeId, action, fromDate, toDate, page, pageSize);

        public Task<PlatformSettingsDto> GetPlatformSettingsAsync() =>
            _repository.GetPlatformSettingsAsync();

        public Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings, string currentUserName) =>
            _repository.UpdatePlatformSettingsAsync(settings, currentUserName);
    }
}
