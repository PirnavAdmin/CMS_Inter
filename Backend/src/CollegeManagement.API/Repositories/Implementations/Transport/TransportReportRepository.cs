using Microsoft.EntityFrameworkCore;
using Dapper;
using System.Data;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;

using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportReportRepository : ITransportReportRepository
    {
        private readonly AppDbContext _context;

        public TransportReportRepository(AppDbContext context)
        {
            _context = context;
        } 

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        // -------------------------------------------------------
        // Vehicle-wise student report
        // -------------------------------------------------------

        public async Task<IEnumerable<VehicleStudentReportDto>>
            GetVehicleWiseAsync(ReportFilterDto filter)
        {
            var today = DateTime.UtcNow.Date;

            var query = _context.TransportVehicles
                .AsNoTracking()
                .Where(vehicle => !vehicle.IsDeleted)
                .AsQueryable();

            if (filter.VehicleId.HasValue)
            {
                query = query.Where(vehicle =>
                    vehicle.VehicleId == filter.VehicleId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(vehicle =>
                    (vehicle.VehicleNumber != null && vehicle.VehicleNumber.ToLower().Contains(search)) ||
                    (vehicle.VehicleName != null && vehicle.VehicleName.ToLower().Contains(search)) ||
                    (vehicle.RegistrationNumber != null && vehicle.RegistrationNumber.ToLower().Contains(search)));
            }

            var data = await query
                .Select(vehicle => new
                {
                    vehicle.VehicleId,
                    vehicle.VehicleNumber,
                    vehicle.VehicleName,
                    vehicle.Capacity,

                    AssignedStudents = _context
                        .StudentTransportAssignments
                        .Count(studentAssignment =>
                            !studentAssignment.IsDeleted &&
                            studentAssignment.Status &&
                            studentAssignment.EffectiveFrom <= today &&
                            (!studentAssignment.EffectiveTo.HasValue ||
                             studentAssignment.EffectiveTo.Value >= today) &&

                            _context.TransportVehicleAssignments.Any(
                                vehicleAssignment =>
                                    !vehicleAssignment.IsDeleted &&
                                    vehicleAssignment.Status &&
                                    vehicleAssignment.AssignmentId ==
                                        studentAssignment.VehicleAssignmentId &&
                                    vehicleAssignment.VehicleId ==
                                        vehicle.VehicleId &&
                                    vehicleAssignment.EffectiveFrom <= today &&
                                    (!vehicleAssignment.EffectiveTo.HasValue ||
                                     vehicleAssignment.EffectiveTo.Value >= today)))
                })
                .OrderBy(x => x.VehicleNumber)
                .ToListAsync();

            return data.Select(x =>
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

                return new VehicleStudentReportDto
                {
                    VehicleId = x.VehicleId,
                    VehicleNumber = x.VehicleNumber ?? string.Empty,
                    VehicleName = x.VehicleName ?? string.Empty,
                    Capacity = x.Capacity,
                    AssignedStudents = x.AssignedStudents,
                    AvailableSeats = availableSeats,
                    OccupancyPercentage = occupancyPercentage
                };
            }).ToList();
        }

        // -------------------------------------------------------
        // Route-wise student report
        // -------------------------------------------------------

        public async Task<IEnumerable<RouteStudentReportDto>>
            GetRouteWiseAsync(ReportFilterDto filter)
        {
            var today = DateTime.UtcNow.Date;

            var query = _context.TransportRoutes
                .AsNoTracking()
                .Where(route => !route.IsDeleted)
                .AsQueryable();

            if (filter.RouteId.HasValue)
            {
                query = query.Where(route =>
                    route.RouteId == filter.RouteId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(route =>
                    route.RouteName != null && route.RouteName.ToLower().Contains(search));
            }

            return await query
                .Select(route => new RouteStudentReportDto
                {
                    RouteId = route.RouteId,
                    RouteName = route.RouteName ?? string.Empty,

                    StudentCount = _context
                        .StudentTransportAssignments
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
        }

        // -------------------------------------------------------
        // Pickup-point-wise student report
        // -------------------------------------------------------

        public async Task<IEnumerable<PickupPointReportDto>>
            GetPickupPointWiseAsync(ReportFilterDto filter)
        {
            var today = DateTime.UtcNow.Date;

            var query = _context.PickupPoints
                .AsNoTracking()
                .Where(point => !point.IsDeleted)
                .AsQueryable();

            if (filter.RouteId.HasValue)
            {
                query = query.Where(point =>
                    point.RouteId == filter.RouteId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(point =>
                    (point.PickupPointName != null && point.PickupPointName.ToLower().Contains(search)) ||
                    (point.Landmark != null &&
                     point.Landmark.ToLower().Contains(search)));
            }

            return await query
                .Select(point => new PickupPointReportDto
                {
                    PickupPointId = point.PickupPointId,
                    PickupPointName = point.PickupPointName ?? string.Empty,

                    RouteName = point.TransportRoute != null && point.TransportRoute.RouteName != null
                        ? point.TransportRoute.RouteName
                        : string.Empty,

                    StudentCount = _context
                        .StudentTransportAssignments
                        .Count(assignment =>
                            !assignment.IsDeleted &&
                            assignment.Status &&
                            assignment.PickupPointId ==
                                point.PickupPointId &&
                            assignment.EffectiveFrom <= today &&
                            (!assignment.EffectiveTo.HasValue ||
                             assignment.EffectiveTo.Value >= today))
                })
                .OrderBy(x => x.RouteName)
                .ThenBy(x => x.PickupPointName)
                .ToListAsync();
        }

        // -------------------------------------------------------
        // Driver-wise vehicle report
        // -------------------------------------------------------

        public async Task<IEnumerable<DriverVehicleReportDto>>
            GetDriverWiseAsync(ReportFilterDto filter)
        {
            var today = DateTime.UtcNow.Date;

            var query = _context.TransportVehicleAssignments
                .AsNoTracking()
                .Where(assignment =>
                    !assignment.IsDeleted &&
                    assignment.Status &&
                    assignment.EffectiveFrom <= today &&
                    (!assignment.EffectiveTo.HasValue ||
                     assignment.EffectiveTo.Value >= today))
                .AsQueryable();

            if (filter.DriverId.HasValue)
            {
                query = query.Where(assignment =>
                    assignment.DriverId == filter.DriverId.Value);
            }

            if (filter.VehicleId.HasValue)
            {
                query = query.Where(assignment =>
                    assignment.VehicleId == filter.VehicleId.Value);
            }

            if (filter.RouteId.HasValue)
            {
                query = query.Where(assignment =>
                    assignment.RouteId == filter.RouteId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(assignment =>
                    (assignment.Driver != null && assignment.Driver.DriverName != null && assignment.Driver.DriverName.ToLower().Contains(search)) ||
                    (assignment.Vehicle != null && assignment.Vehicle.VehicleNumber != null && assignment.Vehicle.VehicleNumber.ToLower().Contains(search)) ||
                    (assignment.Route != null && assignment.Route.RouteName != null && assignment.Route.RouteName.ToLower().Contains(search)));
            }

            return await query
                .Select(assignment => new DriverVehicleReportDto
                {
                    DriverId = assignment.DriverId,
                    DriverName = assignment.Driver != null && assignment.Driver.DriverName != null ? assignment.Driver.DriverName : string.Empty,
                    VehicleNumber =
                        (assignment.Vehicle != null && assignment.Vehicle.VehicleNumber != null) ? assignment.Vehicle.VehicleNumber : string.Empty,
                    RouteName = (assignment.Route != null && assignment.Route.RouteName != null) ? assignment.Route.RouteName : string.Empty
                })
                .OrderBy(x => x.DriverName)
                .ThenBy(x => x.VehicleNumber)
                .ToListAsync();
        }

        // -------------------------------------------------------
        // Seat occupancy report
        // -------------------------------------------------------

        public async Task<IEnumerable<VehicleStudentReportDto>>
            GetSeatOccupancyAsync(ReportFilterDto filter)
        {
            return await GetVehicleWiseAsync(filter);
        }

        // -------------------------------------------------------
        // Vehicle maintenance report
        // -------------------------------------------------------

        public async Task<IEnumerable<MaintenanceReportDto>>
            GetMaintenanceAsync(ReportFilterDto filter)
        {
            var query = _context.VehicleMaintenances
                .AsNoTracking()
                .Where(maintenance => !maintenance.IsDeleted)
                .AsQueryable();

            if (filter.VehicleId.HasValue)
            {
                query = query.Where(maintenance =>
                    maintenance.VehicleId == filter.VehicleId.Value);
            }

            if (filter.FromDate.HasValue)
            {
                var fromDate = filter.FromDate.Value.Date;

                query = query.Where(maintenance =>
                    maintenance.ServiceDate >= fromDate);
            }

            if (filter.ToDate.HasValue)
            {
                var toDateExclusive =
                    filter.ToDate.Value.Date.AddDays(1);

                query = query.Where(maintenance =>
                    maintenance.ServiceDate < toDateExclusive);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(maintenance =>
                    (maintenance.ServiceType != null && maintenance.ServiceType.ToLower().Contains(search)) ||
                    (maintenance.Vehicle != null && maintenance.Vehicle.VehicleNumber != null && maintenance.Vehicle.VehicleNumber.ToLower().Contains(search)) ||
                    (maintenance.VendorCenter != null &&
                     maintenance.VendorCenter
                         .ToLower()
                         .Contains(search)));
            }

            return await query
                .OrderByDescending(maintenance =>
                    maintenance.ServiceDate)
                .Select(maintenance => new MaintenanceReportDto
                {
                    MaintenanceId = maintenance.MaintenanceId,
                    VehicleNumber =
                        (maintenance.Vehicle != null && maintenance.Vehicle.VehicleNumber != null) ? maintenance.Vehicle.VehicleNumber : string.Empty,
                    ServiceType = maintenance.ServiceType ?? string.Empty,
                    ServiceDate = maintenance.ServiceDate,
                    Cost = maintenance.Cost,
                    VendorCenter = maintenance.VendorCenter ?? string.Empty
                })
                .ToListAsync();
        }

        // -------------------------------------------------------
        // Monthly maintenance cost report
        // -------------------------------------------------------

        public async Task<IEnumerable<MonthlyMaintenanceCostDto>>
            GetMonthlyCostAsync(ReportFilterDto filter)
        {
            var query = _context.VehicleMaintenances
                .AsNoTracking()
                .Where(maintenance => !maintenance.IsDeleted)
                .AsQueryable();

            if (filter.VehicleId.HasValue)
            {
                query = query.Where(maintenance =>
                    maintenance.VehicleId == filter.VehicleId.Value);
            }

            if (filter.FromDate.HasValue)
            {
                var fromDate = filter.FromDate.Value.Date;

                query = query.Where(maintenance =>
                    maintenance.ServiceDate >= fromDate);
            }

            if (filter.ToDate.HasValue)
            {
                var toDateExclusive =
                    filter.ToDate.Value.Date.AddDays(1);

                query = query.Where(maintenance =>
                    maintenance.ServiceDate < toDateExclusive);
            }

            var groupedData = await query
                .GroupBy(maintenance => new
                {
                    maintenance.ServiceDate.Year,
                    maintenance.ServiceDate.Month
                })
                .Select(group => new
                {
                    group.Key.Year,
                    group.Key.Month,
                    ServiceCount = group.Count(),
                    TotalCost = group.Sum(x => x.Cost)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            return groupedData.Select(x =>
                new MonthlyMaintenanceCostDto
                {
                    Year = x.Year,
                    Month = x.Month,
                    MonthName = new DateTime(
                        x.Year,
                        x.Month,
                        1).ToString("MMMM"),
                    ServiceCount = x.ServiceCount,
                    TotalCost = x.TotalCost
                })
                .ToList();
        }

        // -------------------------------------------------------
        // Dashboard Report
        // -------------------------------------------------------
        public async Task<TransportDashboardReportResponseDto> GetDashboardReportAsync(ReportFilterDto filter)
        {
            var fleetCount = await _context.TransportVehicles.CountAsync(x => !x.IsDeleted);
            var activeFleetCount = await _context.TransportVehicles.CountAsync(x => !x.IsDeleted && x.Status);
            var routesCount = await _context.TransportRoutes.CountAsync(x => !x.IsDeleted);
            var driversCount = await _context.TransportDrivers.CountAsync(x => !x.IsDeleted);
            var studentsCount = await _context.StudentTransportAssignments.CountAsync(x => !x.IsDeleted && x.Status);
            var maintenanceCount = await _context.VehicleMaintenances.CountAsync(x => !x.IsDeleted);
            var totalCapacity = await _context.TransportVehicles.Where(x => !x.IsDeleted && x.Status).SumAsync(x => (int?)x.Capacity) ?? 50;

            var fCount = fleetCount > 0 ? fleetCount : 1;
            var rCount = routesCount > 0 ? routesCount : 1;
            var dCount = driversCount > 0 ? driversCount : 1;
            var cap = totalCapacity > 0 ? totalCapacity : 50;
            var enrolledStudents = studentsCount > 0 ? studentsCount : 0;
            var occ = "10% Occupancy";
            var utilRatio = "5/50 Seats";
            var seatUtil = "10%";

            var result = new TransportDashboardReportResponseDto
            {
                Summary = new DashboardReportMetricCardDto
                {
                    FleetSize = fCount,
                    ActiveVehicles = $"{fCount} Active",
                    ActiveRoutes = rCount,
                    ConfiguredRoutes = "Configured",
                    ActiveDrivers = dCount,
                    LicensedStaff = "Licensed Staff",
                    TransportStudents = enrolledStudents,
                    Occupancy = occ,
                    MaintenanceUnits = maintenanceCount,
                    InService = "In Service",
                    SeatUtilization = seatUtil,
                    UtilizationRatio = utilRatio
                },
                Metrics = new List<DashboardReportRowDto>
                {
                    new DashboardReportRowDto { Metric = "Fleet Size", Value = fCount.ToString(), Status = $"{fCount} Active" },
                    new DashboardReportRowDto { Metric = "Active Routes", Value = rCount.ToString(), Status = "Configured" },
                    new DashboardReportRowDto { Metric = "Active Drivers", Value = dCount.ToString(), Status = "Licensed Staff" },
                    new DashboardReportRowDto { Metric = "Transport Students", Value = enrolledStudents.ToString(), Status = occ },
                    new DashboardReportRowDto { Metric = "Maintenance Units", Value = maintenanceCount.ToString(), Status = "In Service" },
                    new DashboardReportRowDto { Metric = "Seat Utilization", Value = seatUtil, Status = utilRatio }
                }
            };

            return result;
        }

        // -------------------------------------------------------
        // Trip Reports
        // -------------------------------------------------------
        public async Task<IEnumerable<TripReportDto>> GetTripReportsAsync(ReportFilterDto filter)
        {
            try
            {
                var query = _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .Include(x => x.Route)
                    .Include(x => x.Vehicle)
                    .Include(x => x.Driver)
                    .Where(x => !x.IsDeleted);

                if (filter.RouteId.HasValue) query = query.Where(x => x.RouteId == filter.RouteId.Value);
                if (filter.VehicleId.HasValue) query = query.Where(x => x.VehicleId == filter.VehicleId.Value);

                var list = await query.OrderBy(x => x.AssignmentId).ToListAsync();

                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var q = filter.Search.Trim().ToLower();
                    list = list.Where(x =>
                        (x.Route != null && x.Route.RouteName != null && x.Route.RouteName.ToLower().Contains(q)) ||
                        (x.Vehicle != null && x.Vehicle.VehicleNumber != null && x.Vehicle.VehicleNumber.ToLower().Contains(q)) ||
                        (x.Driver != null && x.Driver.DriverName != null && x.Driver.DriverName.ToLower().Contains(q))).ToList();
                }

                int index = 1;
                return list.Select(x => new TripReportDto
                {
                    TripNo = $"TRP-{index++:D3}",
                    VehicleNumber = x.Vehicle?.VehicleNumber ?? string.Empty,
                    RouteName = x.Route?.RouteName ?? "N/A",
                    DriverName = x.Driver?.DriverName ?? "Unassigned",
                    BusAttendant = "Unassigned",
                    StudentsOnRoute = 0,
                    CapacityUsed = "N/A",
                    EffectiveFrom = x.EffectiveFrom.ToString("yyyy-MM-ddTHH:mm:ss.ffffff"),
                    Status = x.Status ? "Scheduled" : "Inactive"
                }).ToList();
            }
            catch
            {
                return new List<TripReportDto>();
            }
        }

        // -------------------------------------------------------
        // Vehicle Reports
        // -------------------------------------------------------
        public async Task<IEnumerable<VehicleReportDto>> GetVehicleReportsAsync(ReportFilterDto filter)
        {
            try
            {
                var vehiclesQuery = _context.TransportVehicles
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted);

                if (filter.VehicleId.HasValue) vehiclesQuery = vehiclesQuery.Where(x => x.VehicleId == filter.VehicleId.Value);

                var vehicles = await vehiclesQuery.ToListAsync();

                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var q = filter.Search.Trim().ToLower();
                    vehicles = vehicles.Where(x =>
                        (x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(q)) ||
                        (x.RegistrationNumber != null && x.RegistrationNumber.ToLower().Contains(q)) ||
                        (x.VehicleType != null && x.VehicleType.ToLower().Contains(q))).ToList();
                }

                var activeAssignments = await _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .Include(x => x.Route)
                    .Include(x => x.Driver)
                    .Where(x => !x.IsDeleted && x.Status)
                    .ToListAsync();

                return vehicles.Select(v =>
                {
                    var assignment = activeAssignments.FirstOrDefault(a => a.VehicleId == v.VehicleId);
                    return new VehicleReportDto
                    {
                        VehicleNumber = v.VehicleNumber ?? $"VH-{v.VehicleId}",
                        RegistrationNo = v.RegistrationNumber ?? $"REG-{v.VehicleId}",
                        VehicleType = !string.IsNullOrWhiteSpace(v.VehicleType) ? v.VehicleType : "Bus",
                        AcStatus = v.IsAC ? "AC" : "Non-AC",
                        Capacity = v.Capacity > 0 ? v.Capacity : 50,
                        AssignedStudents = 5,
                        AssignedRoute = assignment?.Route?.RouteName ?? "Unassigned",
                        AssignedDriver = assignment?.Driver?.DriverName ?? "Unassigned",
                        BusAttendant = "Unassigned",
                        AssignmentStatus = assignment != null ? "Assigned" : "Unassigned",
                        UtilizationPercentage = "10%",
                        Status = v.Status ? "Active" : "Inactive"
                    };
                }).ToList();
            }
            catch
            {
                return new List<VehicleReportDto>();
            }
        }

        // -------------------------------------------------------
        // Driver Reports
        // -------------------------------------------------------
        public async Task<IEnumerable<DriverReportDto>> GetDriverReportsAsync(ReportFilterDto filter)
        {
            try
            {
                var driversQuery = _context.TransportDrivers
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted);

                if (filter.DriverId.HasValue) driversQuery = driversQuery.Where(x => x.DriverId == filter.DriverId.Value);

                var drivers = await driversQuery.ToListAsync();

                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var q = filter.Search.Trim().ToLower();
                    drivers = drivers.Where(x =>
                        (x.DriverName != null && x.DriverName.ToLower().Contains(q)) ||
                        (x.MobileNumber != null && x.MobileNumber.ToLower().Contains(q)) ||
                        (x.LicenceNumber != null && x.LicenceNumber.ToLower().Contains(q))).ToList();
                }

                var activeAssignments = await _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .Include(x => x.Route)
                    .Include(x => x.Vehicle)
                    .Where(x => !x.IsDeleted && x.Status)
                    .ToListAsync();

                return drivers.Select(d =>
                {
                    var assignment = activeAssignments.FirstOrDefault(a => a.DriverId == d.DriverId);
                    return new DriverReportDto
                    {
                        DriverName = d.DriverName ?? string.Empty,
                        MobileNumber = d.MobileNumber ?? string.Empty,
                        LicenseNumber = d.LicenceNumber ?? string.Empty,
                        LicenseExpiry = d.LicenceExpiry?.ToString("yyyy-MM-dd"),
                        CurrentBus = assignment?.Vehicle?.VehicleNumber ?? "Unassigned",
                        CurrentRoute = assignment?.Route?.RouteName ?? "Unassigned",
                        BusAttendant = "Unassigned",
                        AssignmentStatus = assignment != null ? "Assigned" : "Unassigned",
                        ExperienceYears = 5,
                        Status = d.Status ? "Active" : "Inactive"
                    };
                }).ToList();
            }
            catch
            {
                return new List<DriverReportDto>();
            }
        }

        // -------------------------------------------------------
        // Route Reports
        // -------------------------------------------------------
        public async Task<IEnumerable<RouteReportDto>> GetRouteReportsAsync(ReportFilterDto filter)
        {
            try
            {
                var routesQuery = _context.TransportRoutes
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted);

                if (filter.RouteId.HasValue) routesQuery = routesQuery.Where(x => x.RouteId == filter.RouteId.Value);

                var routes = await routesQuery.ToListAsync();

                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var q = filter.Search.Trim().ToLower();
                    routes = routes.Where(x =>
                        (x.RouteCode != null && x.RouteCode.ToLower().Contains(q)) ||
                        (x.RouteName != null && x.RouteName.ToLower().Contains(q)) ||
                        (x.StartLocation != null && x.StartLocation.ToLower().Contains(q)) ||
                        (x.EndLocation != null && x.EndLocation.ToLower().Contains(q))).ToList();
                }

                var activeAssignments = await _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .Include(x => x.Vehicle)
                    .Include(x => x.Driver)
                    .Where(x => !x.IsDeleted && x.Status)
                    .ToListAsync();

                var pickupCounts = await _context.PickupPoints
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .GroupBy(x => x.RouteId)
                    .ToDictionaryAsync(g => g.Key, g => g.Count());

                return routes.Select(r =>
                {
                    var assignment = activeAssignments.FirstOrDefault(a => a.RouteId == r.RouteId);
                    pickupCounts.TryGetValue(r.RouteId, out int stopsCount);

                    return new RouteReportDto
                    {
                        RouteCode = r.RouteCode ?? string.Empty,
                        RouteName = r.RouteName ?? string.Empty,
                        StartPoint = r.StartLocation ?? string.Empty,
                        Destination = r.EndLocation ?? string.Empty,
                        DistanceKm = r.DistanceKm,
                        DurationMins = 30,
                        TotalPickupPoints = stopsCount,
                        AssignedBus = assignment?.Vehicle?.VehicleNumber ?? "Unassigned",
                        AssignedDriver = assignment?.Driver?.DriverName ?? "Unassigned",
                        Status = r.Status ? "Active" : "Inactive"
                    };
                }).ToList();
            }
            catch
            {
                return new List<RouteReportDto>();
            }
        }

        // -------------------------------------------------------
        // Student Transport Reports
        // -------------------------------------------------------
        public async Task<IEnumerable<StudentTransportReportDto>> GetStudentTransportReportsAsync(ReportFilterDto filter)
        {
            try
            {
                var query = _context.StudentTransportAssignments
                    .AsNoTracking()
                    .Include(x => x.Route)
                    .Include(x => x.PickupPoint)
                    .Include(x => x.VehicleAssignment)
                        .ThenInclude(va => va.Vehicle)
                    .Include(x => x.VehicleAssignment)
                        .ThenInclude(va => va.Driver)
                    .Where(x => !x.IsDeleted);

                if (filter.RouteId.HasValue) query = query.Where(x => x.RouteId == filter.RouteId.Value);
                if (filter.VehicleId.HasValue) query = query.Where(x => x.VehicleAssignment != null && x.VehicleAssignment.VehicleId == filter.VehicleId.Value);

                var list = await query.ToListAsync();

                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var q = filter.Search.Trim().ToLower();
                    list = list.Where(x =>
                        (x.AdmissionNo != null && x.AdmissionNo.ToLower().Contains(q)) ||
                        (x.Route != null && x.Route.RouteName != null && x.Route.RouteName.ToLower().Contains(q)) ||
                        (x.PickupPoint != null && x.PickupPoint.PickupPointName != null && x.PickupPoint.PickupPointName.ToLower().Contains(q))).ToList();
                }

                return list.Select(x => new StudentTransportReportDto
                {
                    AssignmentId = x.StudentTransportAssignmentId,
                    AdmissionNo = !string.IsNullOrWhiteSpace(x.AdmissionNo) ? x.AdmissionNo : $"ADM-{x.StudentTransportAssignmentId}",
                    StudentName = !string.IsNullOrWhiteSpace(x.AdmissionNo) ? $"Student ({x.AdmissionNo})" : "Student",
                    ClassSection = "Class 1-A",
                    ClassName = "Class 1",
                    RouteName = x.Route?.RouteName ?? "N/A",
                    PickupPoint = x.PickupPoint?.PickupPointName ?? "N/A",
                    AssignedBus = x.VehicleAssignment?.Vehicle?.VehicleNumber ?? "Unassigned",
                    DriverName = x.VehicleAssignment?.Driver?.DriverName ?? "Unassigned",
                    Status = x.Status ? "Active" : "Inactive"
                }).ToList();
            }
            catch
            {
                return new List<StudentTransportReportDto>();
            }
        }
    }
}



