using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Models.Transport;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportDriverDashboardRepository : ITransportDriverDashboardRepository
    {
        private readonly AppDbContext _context;

        public TransportDriverDashboardRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<DriverSettingsResponseDto?> GetSettingsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverSettings",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await c.QueryMultipleAsync(cmd);
            var profile = await multi.ReadFirstOrDefaultAsync<DriverProfileSettingsDto>();
            if (profile == null) return null;

            var preferences = await multi.ReadFirstOrDefaultAsync<DriverPreferencesDto>() ?? new DriverPreferencesDto
            {
                EmailAttendanceAlerts = true,
                SmsUrgentAlerts = false,
                TripReminders = true,
                AutoLogoutMinutes = 30
            };

            return new DriverSettingsResponseDto
            {
                Profile = profile,
                Preferences = preferences
            };
        }

        public async Task<bool> UpdateProfileAsync(int staffId, DriverProfileUpdateRequestDto request, CancellationToken ct = default)
        {
            var nameParts = request.FullName.Trim().Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : "";

            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_UpdateDriverProfile",
                new
                {
                    p_StaffId = staffId,
                    p_FirstName = firstName,
                    p_LastName = lastName,
                    p_Mobile = request.Mobile?.Trim() ?? "",
                    p_Email = request.PersonalEmail?.Trim() ?? "",
                    p_Address = request.Address?.Trim() ?? ""
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteScalarAsync<int>(cmd);
            return rows > 0;
        }

        public async Task<bool> UpdatePreferencesAsync(int staffId, DriverPreferencesUpdateRequestDto request, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_SaveDriverPreferences",
                new
                {
                    p_StaffId = staffId,
                    p_EmailAttendanceAlerts = request.EmailAttendanceAlerts,
                    p_SmsUrgentAlerts = request.SmsUrgentAlerts,
                    p_TripReminders = request.TripReminders,
                    p_AutoLogoutMinutes = request.AutoLogoutMinutes
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var result = await c.ExecuteScalarAsync<int>(cmd);
            return result > 0;
        }

        public async Task<List<DriverNotification>> GetNotificationsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverNotifications",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var list = (await c.QueryAsync<dynamic>(cmd)).ToList();
            return list.Select(n => new DriverNotification
            {
                NotificationId = (long)(n.NotificationId ?? 0L),
                StaffId = Convert.ToInt32(n.StaffId ?? staffId),
                Title = (string)(n.Title ?? ""),
                Message = (string)(n.Message ?? ""),
                Type = (string)(n.NotificationType ?? n.Type ?? "General"),
                ReadTime = n.ReadTime != null ? (DateTime?)n.ReadTime : null,
                CreatedTime = n.CreatedTime != null ? (DateTime)n.CreatedTime : DateTime.UtcNow
            }).ToList();
        }

        public async Task<bool> MarkNotificationsAsReadAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_MarkDriverNotificationsRead",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteAsync(cmd);
            return rows >= 0;
        }

        public async Task<object?> GetDashboardDataAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverDashboardData",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await c.QueryFirstOrDefaultAsync<dynamic>(cmd);
            if (row == null) return null;

            return new
            {
                assignedVehicle = new
                {
                    vehicleId = (long?)row.VehicleId,
                    registrationNumber = (string?)row.RegistrationNumber,
                    vehicleType = (string?)row.VehicleType,
                    capacity = (int?)row.Capacity,
                    assignedDate = (DateTime?)row.AssignedDate
                },
                route = new
                {
                    routeId = (long?)row.RouteId,
                    routeName = (string?)row.RouteName,
                    routeCode = (string?)row.RouteCode,
                    StartLocation = (string?)row.StartLocation,
                    EndLocation = (string?)row.EndLocation
                },
                attendant = row.AttendantId == null ? null : new
                {
                    attendantId = (long)row.AttendantId,
                    attendantName = (string)(row.AttendantName ?? ("Attendant " + row.AttendantId)),
                    contactNumber = (string)(row.ContactNumber ?? "N/A")
                },
                assignmentId = (long)row.AssignmentId
            };
        }

        public async Task<object?> GetRouteDetailsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverRouteDetails",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await c.QueryMultipleAsync(cmd);
            var route = await multi.ReadFirstOrDefaultAsync<dynamic>();
            if (route == null) return null;

            var routeData = new
            {
                routeId = (long)(route.RouteId ?? 0L),
                routeName = (string)(route.RouteName ?? ""),
                routeCode = (string)(route.RouteCode ?? ""),
                StartLocation = (string)(route.StartLocation ?? ""),
                EndLocation = (string)(route.EndLocation ?? ""),
                DistanceKm = route.DistanceKm != null ? Convert.ToDecimal(route.DistanceKm) : 0m,
                EstimatedDurationMinutes = (int)(route.EstimatedDurationMinutes ?? 30)
            };

            var pickupRows = (await multi.ReadAsync<dynamic>()).ToList();
            var pickupPoints = pickupRows.Select(p => new
            {
                pickupPointId = (long)(p.PickupPointId ?? 0L),
                stopName = (string)(p.StopName ?? ""),
                pickupTime = p.PickupTime != null ? (p.PickupTime is TimeSpan ts ? ts.ToString(@"hh\:mm") : Convert.ToString(p.PickupTime)) : "07:30 AM",
                dropTime = p.DropTime != null ? (p.DropTime is TimeSpan dts ? dts.ToString(@"hh\:mm") : Convert.ToString(p.DropTime)) : "04:15 PM"
            }).ToList();

            return new { route = routeData, pickupPoints = pickupPoints };
        }

        public async Task<object?> GetProfileAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverProfile",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var driver = await c.QueryFirstOrDefaultAsync<dynamic>(cmd);
            if (driver == null) return null;

            return new
            {
                driverId = (long)(driver.DriverId ?? (long)staffId),
                driverName = (string)(driver.DriverName ?? "Driver"),
                fullName = (string)(driver.DriverName ?? "Driver"),
                name = (string)(driver.DriverName ?? "Driver"),
                employeeId = (string)(driver.EmployeeId ?? $"DRV-{staffId}"),
                licenseNumber = (string)(driver.LicenseNumber ?? ""),
                licenseExpiryDate = (string)(driver.LicenseExpiryDate ?? ""),
                licenseExpiry = (string)(driver.LicenseExpiryDate ?? ""),
                experienceYears = (int)(driver.ExperienceYears ?? 5),
                emergencyContact = (string)(driver.EmergencyContactNumber ?? ""),
                emergencyContactName = (string)(driver.EmergencyContactName ?? ""),
                emergencyContactPhone = (string)(driver.EmergencyContactNumber ?? ""),
                bloodGroup = (string)(driver.BloodGroup ?? ""),
                mobile = (string)(driver.Mobile ?? ""),
                email = (string)(driver.Email ?? ""),
                address = (string)(driver.Address ?? ""),
                isActive = driver.IsActive == null || Convert.ToBoolean(driver.IsActive),
                remarks = "N/A"
            };
        }

        public async Task<object> GetTripsAsync(int staffId, DateTime? tripDate = null, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverTrips",
                new { p_StaffId = staffId, p_TripDate = tripDate?.Date },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var list = (await c.QueryAsync<dynamic>(cmd)).ToList();

            dynamic? morning = list.FirstOrDefault(x => string.Equals((string)x.TripType, "Morning", StringComparison.OrdinalIgnoreCase));
            dynamic? evening = list.FirstOrDefault(x => string.Equals((string)x.TripType, "Evening", StringComparison.OrdinalIgnoreCase));

            return new
            {
                trips = new
                {
                    morningTrip = morning == null ? null : new
                    {
                        id = (long)morning.TripId,
                        time = $"{(string)morning.StartTime} - {(string)morning.EndTime}",
                        title = "Morning Pickup Operation",
                        type = "Morning Pickup",
                        route = (string)morning.RouteName,
                        stops = $"{Convert.ToInt32(morning.StopsCount)} Stops",
                        students = Convert.ToInt32(morning.StudentsCount),
                        status = (string)morning.Status
                    },
                    eveningTrip = evening == null ? null : new
                    {
                        id = (long)evening.TripId,
                        time = $"{(string)evening.StartTime} - {(string)evening.EndTime}",
                        title = "Evening Drop Operation",
                        type = "Evening Drop",
                        route = (string)evening.RouteName,
                        stops = $"{Convert.ToInt32(evening.StopsCount)} Stops",
                        students = Convert.ToInt32(evening.StudentsCount),
                        status = (string)evening.Status
                    }
                }
            };
        }

        public async Task<bool> StartTripAsync(long tripId, int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_StartDriverTrip",
                new { p_TripId = tripId, p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteScalarAsync<int>(cmd);
            return rows > 0;
        }

        public async Task<bool> EndTripAsync(long tripId, int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_EndDriverTrip",
                new { p_TripId = tripId, p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteScalarAsync<int>(cmd);
            return rows > 0;
        }

        public async Task<object> GetRouteStudentsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverRouteStudents",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = (await c.QueryAsync<dynamic>(cmd)).ToList();
            var students = rows.Select(r => new
            {
                id = (long)r.StudentId,
                name = (string)(r.StudentName ?? "Student"),
                rollNo = (string)(r.AdmissionNo ?? $"STU-{r.StudentId}"),
                stop = (string)(r.StopName ?? "Campus Gate"),
                time = (string)(r.PickupTime ?? "07:30 AM"),
                contact = (string)(r.ContactNumber ?? "N/A"),
                status = (string)(r.AttendanceStatus ?? "Pending")
            }).ToList();

            return new { students = students };
        }

        public async Task<bool> UpdateStudentAttendanceAsync(long studentId, long tripId, string status, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_UpdateDriverStudentAttendance",
                new { p_StudentId = studentId, p_TripId = tripId, p_Status = status },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var result = await c.ExecuteScalarAsync<int>(cmd);
            return result > 0;
        }

        public async Task<bool> UpdateStudentAttendanceBulkAsync(int staffId, string stopName, string status, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_UpdateDriverStudentAttendanceBulk",
                new { p_StaffId = staffId, p_StopName = stopName, p_Status = status },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteScalarAsync<int>(cmd);
            return rows > 0;
        }

        public async Task<object> GetCurrentGpsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverGpsCurrent",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await c.QueryFirstOrDefaultAsync<dynamic>(cmd);
            return new
            {
                lat = row != null ? Convert.ToDecimal(row.Latitude) : 17.4495m,
                lng = row != null ? Convert.ToDecimal(row.Longitude) : 78.3840m,
                speed = row != null ? Convert.ToDecimal(row.Speed) : 0m,
                heading = row != null ? Convert.ToDecimal(row.Heading) : 0m
            };
        }

        public async Task<bool> UpdateGpsLocationAsync(int staffId, decimal lat, decimal lng, decimal speed, decimal heading, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_UpdateDriverGpsTelemetry",
                new { p_StaffId = staffId, p_Latitude = lat, p_Longitude = lng, p_Speed = speed, p_Heading = heading },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var result = await c.ExecuteScalarAsync<int>(cmd);
            return result > 0;
        }

        public async Task<object> GetReportsAsync(int staffId, CancellationToken ct = default)
        {
            var c = Connection;
            var cmd = new CommandDefinition(
                "sp_GetDriverReports",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = (await c.QueryAsync<dynamic>(cmd)).ToList();
            return rows.Select(r => (object)new
            {
                id = $"TRIP-{r.Id}",
                date = (string)r.Date,
                tripType = (string)r.TripType,
                route = (string)r.Route,
                startTime = (string)r.StartTime,
                endTime = (string)r.EndTime,
                distanceKm = Convert.ToDecimal(r.DistanceKm),
                fuelAddedLiters = Convert.ToDecimal(r.FuelAddedLiters),
                studentsTransported = Convert.ToInt32(r.StudentsTransported),
                attendanceRate = (string)r.AttendanceRate,
                status = (string)r.Status,
                driverNotes = (string)r.DriverNotes
            }).ToList();
        }
    }
}
