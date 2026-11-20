using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Enquiry;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class EnquiryService : IEnquiryService
    {
        private readonly IEnquiryRepository _enquiryRepo;
        private readonly INotificationService _notificationService;
        private readonly ILogger<EnquiryService> _logger;

        public EnquiryService(
            IEnquiryRepository enquiryRepo,
            INotificationService notificationService,
            ILogger<EnquiryService> logger)
        {
            _enquiryRepo = enquiryRepo;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<EnquiryDto> SubmitPublicEnquiryAsync(CreateEnquiryRequest request)
        {
            bool isAdmissions = string.Equals(request.EnquiryType, "Admissions", StringComparison.OrdinalIgnoreCase);
            string nameError = isAdmissions ? "Please enter a valid student name." : "Please enter a valid name.";

            if (string.IsNullOrWhiteSpace(request.FullName) || !System.Text.RegularExpressions.Regex.IsMatch(request.FullName.Trim(), @"^[a-zA-Z\s.'-]+$"))
                throw new ArgumentException(nameError);
            if (!string.IsNullOrWhiteSpace(request.GuardianName) &&
                (!System.Text.RegularExpressions.Regex.IsMatch(request.GuardianName.Trim(), @"^[a-zA-Z\s.'-]+$") ||
                 System.Text.RegularExpressions.Regex.IsMatch(request.GuardianName.Trim(), @"\d")))
            {
                throw new ArgumentException("Please enter a valid parent / guardian name.");
            }
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Email is required.");
            if (string.IsNullOrWhiteSpace(request.Mobile) || !System.Text.RegularExpressions.Regex.IsMatch(request.Mobile.Trim(), @"^(\+91[\-\s]?)?[0-9]{10}$"))
                throw new ArgumentException("Please enter a valid 10-digit mobile number.");
            if (string.IsNullOrWhiteSpace(request.Message))
                throw new ArgumentException("Message is required.");

            int id = await _enquiryRepo.CreateEnquiryAsync(request);
            var created = await _enquiryRepo.GetEnquiryByIdAsync(id)
                ?? throw new InvalidOperationException("Failed to retrieve created enquiry.");

            // Dispatch notification alert to Receptionist, Admin, and Principal roles
            try
            {
                var targetRoles = new[] { "Receptionist", "Admin", "Principal", "CollegeAdmin" };
                string title = $"New Enquiry: {request.EnquiryType}";
                string snippet = request.Message.Length > 80 ? request.Message.Substring(0, 80) + "..." : request.Message;
                string message = $"{request.FullName} ({request.Mobile}): {snippet}";

                await _notificationService.SendToRolesAsync(
                    targetRoles,
                    request.CampusId,
                    title,
                    message,
                    type: "Enquiry",
                    referenceId: id,
                    actionUrl: "/dashboard/enquiry-management");
            }
            catch (Exception notifEx)
            {
                _logger.LogWarning(notifEx, "Failed to send enquiry notification: {Message}", notifEx.Message);
            }

            return created;
        }

        public async Task<EnquiryDto?> GetEnquiryByIdAsync(int id)
        {
            return await _enquiryRepo.GetEnquiryByIdAsync(id);
        }

        public async Task<(List<EnquiryDto> Items, int TotalCount)> ListEnquiriesAsync(
            int? campusId = null,
            string? status = null,
            string? search = null,
            int page = 1,
            int pageSize = 20)
        {
            return await _enquiryRepo.ListEnquiriesAsync(campusId, status, search, page, pageSize);
        }

        public async Task<EnquiryStatsDto> GetStatsAsync(int? campusId = null)
        {
            return await _enquiryRepo.GetStatsAsync(campusId);
        }

        public async Task<TakeChargeResultDto> TakeChargeAsync(int id, int? userId, int? staffId, string staffName, string role)
        {
            if (string.IsNullOrWhiteSpace(staffName))
                staffName = "Staff Member";
            if (string.IsNullOrWhiteSpace(role))
                role = "Staff";

            return await _enquiryRepo.TakeChargeAsync(id, userId, staffId, staffName, role);
        }

        public async Task<bool> UpdateStatusAsync(int id, UpdateEnquiryStatusRequest request, int? callerUserId = null, string? callerStaffName = null, string? callerRole = null)
        {
            if (string.IsNullOrWhiteSpace(request.Status))
                throw new ArgumentException("Status is required.");

            // Concurrency & Ownership Enforcement:
            var existing = await _enquiryRepo.GetEnquiryByIdAsync(id);
            if (existing == null) return false;

            if (existing.HandledByUserId.HasValue || !string.IsNullOrWhiteSpace(existing.HandledByStaffName))
            {
                bool isSameUser = callerUserId.HasValue && existing.HandledByUserId.HasValue && callerUserId.Value == existing.HandledByUserId.Value;
                bool isSameStaffName = !string.IsNullOrWhiteSpace(callerStaffName) && string.Equals(existing.HandledByStaffName?.Trim(), callerStaffName.Trim(), StringComparison.OrdinalIgnoreCase);
                bool isAdminCaller = !string.IsNullOrWhiteSpace(callerRole) && callerRole.Contains("Admin", StringComparison.OrdinalIgnoreCase);

                if (!isSameUser && !isSameStaffName && !isAdminCaller)
                {
                    throw new UnauthorizedAccessException($"Only the assigned owner ({existing.HandledByRole}: {existing.HandledByStaffName}) or an Administrator can update the status of this enquiry.");
                }
            }

            return await _enquiryRepo.UpdateStatusAsync(id, request, callerUserId, callerStaffName, callerRole);
        }

        public async Task<List<EnquiryActivityDto>> GetActivitiesAsync(int enquiryId)
        {
            return await _enquiryRepo.GetActivitiesAsync(enquiryId);
        }

        public async Task<LandingContactConfigDto> GetLandingContactConfigAsync(int? campusId = null)
        {
            return await _enquiryRepo.GetLandingContactConfigAsync(campusId);
        }

        public async Task<bool> SaveLandingContactConfigAsync(SaveLandingContactConfigRequest request, int? updatedByUserId = null)
        {
            return await _enquiryRepo.SaveLandingContactConfigAsync(request, updatedByUserId);
        }
    }
}
