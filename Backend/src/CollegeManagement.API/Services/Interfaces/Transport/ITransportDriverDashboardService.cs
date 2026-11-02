using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Models.Transport;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportDriverDashboardService
    {
        Task<DriverSettingsResponseDto?> GetSettingsAsync(int staffId, CancellationToken ct = default);
        Task<bool> UpdateProfileAsync(int staffId, DriverProfileUpdateRequestDto request, CancellationToken ct = default);
        Task<bool> UpdatePreferencesAsync(int staffId, DriverPreferencesUpdateRequestDto request, CancellationToken ct = default);
        Task<List<DriverNotification>> GetNotificationsAsync(int staffId, CancellationToken ct = default);
        Task<bool> MarkNotificationsAsReadAsync(int staffId, CancellationToken ct = default);
        Task<object?> GetDashboardDataAsync(int staffId, CancellationToken ct = default);
        Task<object?> GetRouteDetailsAsync(int staffId, CancellationToken ct = default);
        Task<object?> GetProfileAsync(int staffId, CancellationToken ct = default);

        Task<object> GetTripsAsync(int staffId, DateTime? tripDate = null, CancellationToken ct = default);
        Task<bool> StartTripAsync(long tripId, int staffId, CancellationToken ct = default);
        Task<bool> EndTripAsync(long tripId, int staffId, CancellationToken ct = default);
        Task<object> GetRouteStudentsAsync(int staffId, CancellationToken ct = default);
        Task<bool> UpdateStudentAttendanceAsync(long studentId, long tripId, string status, CancellationToken ct = default);
        Task<bool> UpdateStudentAttendanceBulkAsync(int staffId, string stopName, string status, CancellationToken ct = default);
        Task<object> GetCurrentGpsAsync(int staffId, CancellationToken ct = default);
        Task<bool> UpdateGpsLocationAsync(int staffId, decimal lat, decimal lng, decimal speed, decimal heading, CancellationToken ct = default);
        Task<object> GetReportsAsync(int staffId, CancellationToken ct = default);
    }
}
