using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Models.Transport;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations.Transport
{
    public class TransportDriverDashboardService : ITransportDriverDashboardService
    {
        private readonly ITransportDriverDashboardRepository _repository;

        public TransportDriverDashboardService(ITransportDriverDashboardRepository repository)
        {
            _repository = repository;
        }

        public Task<DriverSettingsResponseDto?> GetSettingsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetSettingsAsync(staffId, ct);

        public Task<bool> UpdateProfileAsync(int staffId, DriverProfileUpdateRequestDto request, CancellationToken ct = default) =>
            _repository.UpdateProfileAsync(staffId, request, ct);

        public Task<bool> UpdatePreferencesAsync(int staffId, DriverPreferencesUpdateRequestDto request, CancellationToken ct = default) =>
            _repository.UpdatePreferencesAsync(staffId, request, ct);

        public Task<List<DriverNotification>> GetNotificationsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetNotificationsAsync(staffId, ct);

        public Task<bool> MarkNotificationsAsReadAsync(int staffId, CancellationToken ct = default) =>
            _repository.MarkNotificationsAsReadAsync(staffId, ct);

        public Task<object?> GetDashboardDataAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetDashboardDataAsync(staffId, ct);

        public Task<object?> GetRouteDetailsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetRouteDetailsAsync(staffId, ct);

        public Task<object?> GetProfileAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetProfileAsync(staffId, ct);

        public Task<object> GetTripsAsync(int staffId, DateTime? tripDate = null, CancellationToken ct = default) =>
            _repository.GetTripsAsync(staffId, tripDate, ct);

        public Task<bool> StartTripAsync(long tripId, int staffId, CancellationToken ct = default) =>
            _repository.StartTripAsync(tripId, staffId, ct);

        public Task<bool> EndTripAsync(long tripId, int staffId, CancellationToken ct = default) =>
            _repository.EndTripAsync(tripId, staffId, ct);

        public Task<object> GetRouteStudentsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetRouteStudentsAsync(staffId, ct);

        public Task<bool> UpdateStudentAttendanceAsync(long studentId, long tripId, string status, CancellationToken ct = default) =>
            _repository.UpdateStudentAttendanceAsync(studentId, tripId, status, ct);

        public Task<bool> UpdateStudentAttendanceBulkAsync(int staffId, string stopName, string status, CancellationToken ct = default) =>
            _repository.UpdateStudentAttendanceBulkAsync(staffId, stopName, status, ct);

        public Task<object> GetCurrentGpsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetCurrentGpsAsync(staffId, ct);

        public Task<bool> UpdateGpsLocationAsync(int staffId, decimal lat, decimal lng, decimal speed, decimal heading, CancellationToken ct = default) =>
            _repository.UpdateGpsLocationAsync(staffId, lat, lng, speed, heading, ct);

        public Task<object> GetReportsAsync(int staffId, CancellationToken ct = default) =>
            _repository.GetReportsAsync(staffId, ct);
    }
}
