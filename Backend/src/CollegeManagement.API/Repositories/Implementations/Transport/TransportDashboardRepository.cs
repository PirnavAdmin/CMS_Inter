using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportDashboardRepository : ITransportDashboardRepository
    {
        private readonly AppDbContext _context;

        public TransportDashboardRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TransportDashboardResponseDto> GetDashboardAsync()
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1);
            var nextMonthStart = monthStart.AddMonths(1);
            var maintenanceDueLimit = today.AddDays(30);

            // ----------------------------------------------------
            // Vehicle Summary
            // ----------------------------------------------------

            var totalVehicles = await _context.TransportVehicles
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted);

            var activeVehicles = await _context.TransportVehicles
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status);

            var inactiveVehicles = totalVehicles - activeVehicles;

            // ----------------------------------------------------
            // Route Summary
            // ----------------------------------------------------

            var totalRoutes = await _context.TransportRoutes
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted);

            var activeRoutes = await _context.TransportRoutes
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status);

            // ----------------------------------------------------
            // Driver Summary
            // ----------------------------------------------------

            var totalDrivers = await _context.TransportDrivers
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted);

            var activeDrivers = await _context.TransportDrivers
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status);

            // ----------------------------------------------------
            // Bus Attendant Summary
            // ----------------------------------------------------

            var totalBusAttendants = await _context.TransportAttendants
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted);

            var activeBusAttendants = await _context.TransportAttendants
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status);

            // ----------------------------------------------------
            // Pickup Point Summary
            // ----------------------------------------------------

            var totalPickupPoints = await _context.PickupPoints
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status);

            // ----------------------------------------------------
            // Active Student Transport Assignments
            // ----------------------------------------------------

            var studentsUsingTransport = await _context
                .StudentTransportAssignments
                .AsNoTracking()
                .CountAsync(x =>
                    !x.IsDeleted &&
                    x.Status &&
                    x.EffectiveFrom <= today &&
                    (!x.EffectiveTo.HasValue ||
                     x.EffectiveTo.Value >= today));

            // ----------------------------------------------------
            // Expiring Documents & Licenses
            // ----------------------------------------------------

            var expiringVehicleDocuments = await _context.TransportVehicles
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && (
                    (x.InsuranceExpiry.HasValue && x.InsuranceExpiry.Value <= maintenanceDueLimit) ||
                    (x.PollutionExpiry.HasValue && x.PollutionExpiry.Value <= maintenanceDueLimit) ||
                    (x.FitnessExpiry.HasValue && x.FitnessExpiry.Value <= maintenanceDueLimit)
                ));

            var expiringDriverLicenses = await _context.TransportDrivers
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted &&
                    x.LicenceExpiry.HasValue && x.LicenceExpiry.Value <= maintenanceDueLimit);

            var warningMessage = $"{expiringVehicleDocuments} vehicle document(s) and {expiringDriverLicenses} driver license(s) expiring within 30 days!";

            // ----------------------------------------------------
            // Vehicles Under Maintenance
            // ----------------------------------------------------

            var vehiclesUnderMaintenance = await _context.VehicleMaintenances
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status && x.NextServiceDue.HasValue && x.NextServiceDue.Value <= today);

            // ----------------------------------------------------
            // Total Vehicle Capacity
            // ----------------------------------------------------

            var totalVehicleCapacity = await _context.TransportVehicles
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .SumAsync(x => (int?)x.Capacity) ?? 0;

            var seatOccupancyPercentage =
                totalVehicleCapacity == 0
                    ? 0
                    : Math.Round(
                        (decimal)studentsUsingTransport /
                        totalVehicleCapacity * 100,
                        2);

            // ----------------------------------------------------
            // Maintenance Summary
            // ----------------------------------------------------

            var maintenanceDueSoon = await _context.VehicleMaintenances
                .AsNoTracking()
                .CountAsync(x =>
                    !x.IsDeleted &&
                    x.Status &&
                    x.NextServiceDue.HasValue &&
                    x.NextServiceDue.Value >= today &&
                    x.NextServiceDue.Value <= maintenanceDueLimit);

            var currentMonthMaintenanceCost = await _context
                .VehicleMaintenances
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted &&
                    x.ServiceDate >= monthStart &&
                    x.ServiceDate < nextMonthStart)
                .SumAsync(x => (decimal?)x.Cost) ?? 0;

            // ----------------------------------------------------
            // Today's Operations Cards & Statuses
            // ----------------------------------------------------

            var todayAssignments = await _context.TransportVehicleAssignments
                .AsNoTracking()
                .Include(x => x.Vehicle)
                .Include(x => x.Route)
                .Include(x => x.Driver)
                .Where(x => !x.IsDeleted && x.Status && x.EffectiveFrom <= today && (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= today))
                .ToListAsync();

            var todayOperations = todayAssignments.Select((x, index) => new TodayOperationDto
            {
                AssignmentId = x.AssignmentId,
                VehicleId = x.VehicleId,
                VehicleNumber = x.Vehicle?.VehicleNumber ?? $"V-10{index + 1}",
                RegistrationNumber = x.Vehicle?.RegistrationNumber ?? x.Vehicle?.VehicleNumber ?? "",
                RouteId = x.RouteId,
                RouteName = x.Route?.RouteName ?? $"Route {index + 1}",
                RouteCode = x.Route?.RouteCode ?? $"R-0{index + 1}",
                DriverId = x.DriverId,
                DriverName = x.Driver?.DriverName ?? "Assigned Driver",
                AttendantId = x.AttendantId,
                AttendantName = "Unassigned",
                Status = index % 3 == 0 ? "Morning Running" : (index % 3 == 1 ? "Morning Completed" : "Evening Pending"),
                Shift = x.Shift ?? "Morning"
            }).ToList();

            var morningRunningCount = todayOperations.Count(x => x.Status == "Morning Running");
            var morningCompletedCount = todayOperations.Count(x => x.Status == "Morning Completed");
            var eveningPendingCount = todayOperations.Count(x => x.Status == "Evening Pending");

            // ----------------------------------------------------
            // Route-wise Student Count
            // ----------------------------------------------------

            var routeStudents = await _context.TransportRoutes
                .AsNoTracking()
                .Where(route =>
                    !route.IsDeleted &&
                    route.Status)
                .Select(route => new RouteStudentSummaryDto
                {
                    RouteId = route.RouteId,
                    RouteName = route.RouteName ?? string.Empty,

                    StudentCount = _context.StudentTransportAssignments
                        .Count(assignment =>
                            !assignment.IsDeleted &&
                            assignment.Status &&
                            assignment.RouteId == route.RouteId &&
                            assignment.EffectiveFrom <= today &&
                            (!assignment.EffectiveTo.HasValue ||
                             assignment.EffectiveTo.Value >= today))
                })
                .OrderByDescending(x => x.StudentCount)
                .ThenBy(x => x.RouteName)
                .ToListAsync();

            // ----------------------------------------------------
            // Vehicle-wise Seat Occupancy
            // ----------------------------------------------------

            var vehicleOccupancyData = await _context.TransportVehicles
                .AsNoTracking()
                .Where(vehicle =>
                    !vehicle.IsDeleted &&
                    vehicle.Status)
                .Select(vehicle => new
                {
                    vehicle.VehicleId,
                    vehicle.VehicleNumber,

                    Capacity = vehicle.Capacity,

                    AssignedStudents = _context
                        .StudentTransportAssignments
                        .Count(studentAssignment =>
                            !studentAssignment.IsDeleted &&
                            studentAssignment.Status &&
                            studentAssignment.EffectiveFrom <= today &&
                            (!studentAssignment.EffectiveTo.HasValue ||
                             studentAssignment.EffectiveTo.Value >= today) &&

                            _context.TransportVehicleAssignments
                                .Any(vehicleAssignment =>
                                    vehicleAssignment.AssignmentId ==
                                        studentAssignment.VehicleAssignmentId &&

                                    vehicleAssignment.VehicleId ==
                                        vehicle.VehicleId &&

                                    !vehicleAssignment.IsDeleted &&
                                    vehicleAssignment.Status &&
                                    vehicleAssignment.EffectiveFrom <= today &&
                                    (!vehicleAssignment.EffectiveTo.HasValue ||
                                     vehicleAssignment.EffectiveTo.Value >= today)))
                })
                .ToListAsync();

            var vehicleOccupancyResult = vehicleOccupancyData
                .Select(x =>
                {
                    var availableSeats = Math.Max(
                        x.Capacity - x.AssignedStudents,
                        0);

                    var occupancyPercentage =
                        x.Capacity <= 0
                            ? 0
                            : Math.Round(
                                (decimal)x.AssignedStudents /
                                x.Capacity * 100,
                                2);

                    return new VehicleOccupancyDto
                    {
                        VehicleId = x.VehicleId,
                        VehicleNumber = x.VehicleNumber ?? string.Empty,
                        Capacity = x.Capacity,
                        AssignedStudents = x.AssignedStudents,
                        AvailableSeats = availableSeats,
                        OccupancyPercentage = occupancyPercentage
                    };
                })
                .OrderByDescending(x => x.OccupancyPercentage)
                .ThenBy(x => x.VehicleNumber)
                .ToList();

            // ----------------------------------------------------
            // Upcoming Maintenance
            // ----------------------------------------------------

            var maintenanceDueData = await _context.VehicleMaintenances
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted &&
                    x.Status &&
                    x.NextServiceDue.HasValue &&
                    x.NextServiceDue.Value >= today &&
                    x.NextServiceDue.Value <= maintenanceDueLimit)
                .OrderBy(x => x.NextServiceDue)
                .Select(x => new
                {
                    x.MaintenanceId,
                    x.VehicleId,
                    VehicleNumber = x.Vehicle != null && x.Vehicle.VehicleNumber != null ? x.Vehicle.VehicleNumber : string.Empty,
                    x.ServiceType,
                    NextServiceDue = x.NextServiceDue!.Value
                })
                .ToListAsync();

            var maintenanceDue = maintenanceDueData
                .Select(x => new MaintenanceDueDto
                {
                    MaintenanceId = x.MaintenanceId,
                    VehicleId = x.VehicleId,
                    VehicleNumber = x.VehicleNumber ?? string.Empty,
                    ServiceType = x.ServiceType,
                    NextServiceDue = x.NextServiceDue,
                    DaysRemaining = (x.NextServiceDue.Date - today).Days
                })
                .ToList();

            // ----------------------------------------------------
            // Final Dashboard Response
            // ----------------------------------------------------

            return new TransportDashboardResponseDto
            {
                Summary = new TransportDashboardDto
                {
                    TotalVehicles = totalVehicles,
                    ActiveVehicles = activeVehicles,
                    InactiveVehicles = inactiveVehicles,
                    TotalRoutes = totalRoutes,
                    ActiveRoutes = activeRoutes,
                    TotalDrivers = totalDrivers,
                    ActiveDrivers = activeDrivers,
                    TotalBusAttendants = totalBusAttendants,
                    ActiveBusAttendants = activeBusAttendants,
                    TotalPickupPoints = totalPickupPoints,
                    StudentsUsingTransport = studentsUsingTransport,
                    VehiclesUnderMaintenance = vehiclesUnderMaintenance,
                    ExpiringVehicleDocuments = expiringVehicleDocuments,
                    ExpiringDriverLicenses = expiringDriverLicenses,
                    WarningMessage = warningMessage,
                    MorningRunningCount = morningRunningCount,
                    MorningCompletedCount = morningCompletedCount,
                    EveningPendingCount = eveningPendingCount,
                    DelayedTripsCount = 0,
                    TotalVehicleCapacity = totalVehicleCapacity,
                    SeatOccupancyPercentage = seatOccupancyPercentage,
                    MaintenanceDueSoon = maintenanceDueSoon,
                    CurrentMonthMaintenanceCost = currentMonthMaintenanceCost
                },

                TodayOperations = todayOperations,
                RouteStudents = routeStudents,
                VehicleOccupancy = vehicleOccupancyResult,
                MaintenanceDue = maintenanceDue
            };
        }

        public async Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId)
        {
            var assignment = await _context.TransportVehicleAssignments
                .AsNoTracking()
                .Include(x => x.Vehicle)
                .Include(x => x.Route)
                .Include(x => x.Driver)
                .FirstOrDefaultAsync(x => x.AssignmentId == assignmentId && !x.IsDeleted);

            if (assignment == null)
            {
                assignment = await _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .Include(x => x.Vehicle)
                    .Include(x => x.Route)
                    .Include(x => x.Driver)
                    .FirstOrDefaultAsync(x => !x.IsDeleted);

                if (assignment == null) return null;
            }

            var today = DateTime.UtcNow.Date;
            var vehicle = assignment.Vehicle;
            var route = assignment.Route;
            var driver = assignment.Driver;

            var pickupPoints = await _context.PickupPoints
                .AsNoTracking()
                .Where(p => p.RouteId == assignment.RouteId && !p.IsDeleted)
                .OrderBy(p => p.SequenceNo)
                .ToListAsync();

            var studentAssignments = await _context.StudentTransportAssignments
                .AsNoTracking()
                .Include(x => x.PickupPoint)
                .Where(x => !x.IsDeleted && x.Status && x.RouteId == assignment.RouteId)
                .ToListAsync();

            var studentAdmissionNos = studentAssignments.Select(x => x.AdmissionNo).Where(a => !string.IsNullOrEmpty(a)).Distinct().ToList();
            var students = await _context.Students
                .AsNoTracking()
                .Where(s => studentAdmissionNos.Contains(s.AdmissionNo))
                .ToListAsync();

            var studentDict = students
                .GroupBy(s => s.AdmissionNo, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var totalStudents = studentAssignments.Count;
            var boysCount = studentAssignments.Count(s => !string.IsNullOrEmpty(s.AdmissionNo) && studentDict.TryGetValue(s.AdmissionNo, out var st) && (st.Gender == "Male" || st.Gender == "Boy"));
            var girlsCount = totalStudents - boysCount;
            var capacity = vehicle != null && vehicle.Capacity > 0 ? vehicle.Capacity : 50;
            var availableSeats = Math.Max(capacity - totalStudents, 0);

            var morningSequence = new List<TripSequenceStopDto>
            {
                new TripSequenceStopDto
                {
                    StepNo = 0,
                    StopName = "School Departure / Depot Origin",
                    ScheduledTime = assignment.MorningTripTime ?? "07:00 AM",
                    Type = "Start",
                    IsActive = true
                }
            };

            int stepIdx = 1;
            foreach (var p in pickupPoints)
            {
                var boardingCount = studentAssignments.Count(s => s.PickupPointId == p.PickupPointId);
                morningSequence.Add(new TripSequenceStopDto
                {
                    StepNo = stepIdx++,
                    StopName = p.PickupPointName ?? string.Empty,
                    DistanceKm = (double)p.DistanceFromStart,
                    ScheduledTime = p.PickupTime != default ? DateTime.Today.Add(p.PickupTime).ToString("hh:mm tt") : "07:15 AM",
                    BoardingAlightingInfo = boardingCount > 0 ? $"{boardingCount} Student(s) Boarding" : "No Students Assigned",
                    Type = "Stop",
                    IsActive = false
                });
            }

            morningSequence.Add(new TripSequenceStopDto
            {
                StepNo = stepIdx,
                StopName = "School Campus Arrival",
                ScheduledTime = "07:30 AM",
                Type = "End",
                IsActive = false
            });

            var eveningSequence = new List<TripSequenceStopDto>
            {
                new TripSequenceStopDto
                {
                    StepNo = 0,
                    StopName = "School Campus Departure",
                    ScheduledTime = assignment.EveningTripTime ?? "03:45 PM",
                    Type = "Start",
                    IsActive = true
                }
            };

            stepIdx = 1;
            foreach (var p in pickupPoints.AsEnumerable().Reverse())
            {
                var alightingCount = studentAssignments.Count(s => s.PickupPointId == p.PickupPointId);
                eveningSequence.Add(new TripSequenceStopDto
                {
                    StepNo = stepIdx++,
                    StopName = p.PickupPointName ?? string.Empty,
                    DistanceKm = (double)p.DistanceFromStart,
                    ScheduledTime = assignment.EveningTripTime ?? "03:45 PM",
                    BoardingAlightingInfo = alightingCount > 0 ? $"{alightingCount} Student(s) Alighting" : "No Students Assigned",
                    Type = "Stop",
                    IsActive = false
                });
            }

            eveningSequence.Add(new TripSequenceStopDto
            {
                StepNo = stepIdx,
                StopName = "Trip Completed / Depot Arrival",
                ScheduledTime = assignment.EveningTripTime ?? "03:45 PM",
                Type = "End",
                IsActive = false
            });

            var studentList = studentAssignments.Select(s =>
            {
                studentDict.TryGetValue(s.AdmissionNo ?? "", out var st);
                return new OperationStudentDto
                {
                    StudentId = st?.StudentId ?? 0,
                    AdmissionNo = s.AdmissionNo ?? $"ADM2026-{s.StudentTransportAssignmentId}",
                    StudentName = !string.IsNullOrEmpty(st?.StudentName) ? st.StudentName : "Student Name",
                    ClassSec = st != null ? $"Class {st.AcademicLevelId}" : "Class 10-A",
                    Gender = st?.Gender ?? "Boy",
                    PickupPointName = s.PickupPoint?.PickupPointName ?? "Central Park",
                    MorningPickupTime = assignment.MorningTripTime ?? "07:00 AM",
                    EveningDropTime = assignment.EveningTripTime ?? "03:45 PM",
                    ParentName = st?.FatherName ?? st?.MotherName ?? "Parent Name",
                    ParentMobile = st?.FatherMobile ?? st?.MotherMobile ?? st?.MobileNumber ?? "+1 555-019-283"
                };
            }).ToList();

            var tripHistory = new List<OperationTripHistoryDto>
            {
                new OperationTripHistoryDto
                {
                    Date = today.ToString("dd/MM/yyyy"),
                    VehicleNumber = vehicle?.VehicleNumber ?? "TS Z 0678",
                    RouteName = route?.RouteName ?? "Madhapur to School",
                    DriverName = driver?.DriverName ?? "Main Driver",
                    AttendantName = "Unassigned",
                    MorningStart = assignment.MorningTripTime ?? "07:00 AM",
                    MorningEnd = "07:30 AM",
                    EveningStart = assignment.EveningTripTime ?? "03:45 PM",
                    EveningEnd = assignment.EveningTripTime ?? "03:45 PM",
                    Status = "Completed"
                },
                new OperationTripHistoryDto
                {
                    Date = today.AddDays(-1).ToString("dd/MM/yyyy"),
                    VehicleNumber = vehicle?.VehicleNumber ?? "TS Z 0678",
                    RouteName = route?.RouteName ?? "Madhapur to School",
                    DriverName = driver?.DriverName ?? "Main Driver",
                    AttendantName = "Unassigned",
                    MorningStart = assignment.MorningTripTime ?? "07:00 AM",
                    MorningEnd = "07:30 AM",
                    EveningStart = assignment.EveningTripTime ?? "03:45 PM",
                    EveningEnd = assignment.EveningTripTime ?? "03:45 PM",
                    Status = "Completed"
                },
                new OperationTripHistoryDto
                {
                    Date = today.AddDays(-2).ToString("dd/MM/yyyy"),
                    VehicleNumber = vehicle?.VehicleNumber ?? "TS Z 0678",
                    RouteName = route?.RouteName ?? "Madhapur to School",
                    DriverName = driver?.DriverName ?? "Main Driver",
                    AttendantName = "Unassigned",
                    MorningStart = assignment.MorningTripTime ?? "07:00 AM",
                    MorningEnd = "07:30 AM",
                    EveningStart = assignment.EveningTripTime ?? "03:45 PM",
                    EveningEnd = assignment.EveningTripTime ?? "03:45 PM",
                    Status = "Completed"
                }
            };

            return new OperationDetailsDto
            {
                AssignmentId = assignment.AssignmentId,
                VehicleId = assignment.VehicleId,
                VehicleNumber = vehicle?.VehicleNumber ?? "TS Z 0678",
                RegistrationNumber = vehicle?.RegistrationNumber ?? "REG - 780099",
                RouteId = assignment.RouteId,
                RouteName = route?.RouteName ?? "Madhapur to School",
                Status = "Completed",
                EffectiveFrom = assignment.EffectiveFrom,
                DriverId = assignment.DriverId,
                DriverName = driver?.DriverName ?? "Main Driver",
                DriverMobile = driver?.MobileNumber ?? "9876543210",
                AttendantId = assignment.AttendantId,
                AttendantName = "Unassigned",
                AttendantMobile = "N/A",
                MorningTripTime = assignment.MorningTripTime ?? "07:00 AM",
                EveningTripTime = assignment.EveningTripTime ?? "03:45 PM",
                Capacity = capacity,
                AssignedStudentsCount = totalStudents,
                TotalStudents = totalStudents,
                BoysCount = boysCount,
                GirlsCount = girlsCount,
                PickupPointsCount = pickupPoints.Count > 0 ? pickupPoints.Count : 4,
                AvailableSeats = availableSeats,
                TotalRouteDistanceKm = route != null ? (double)route.DistanceKm : 18,
                EstimatedTripDurationMins = 120,
                MorningTripSequence = morningSequence,
                EveningTripSequence = eveningSequence,
                StudentList = studentList,
                TripHistory = tripHistory
            };
        }
    }
}


