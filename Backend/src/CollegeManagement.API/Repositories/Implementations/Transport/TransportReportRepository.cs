using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Reports;
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

        public async Task<TransportDashboardReportResponseDto> GetDashboardReportAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync("sp_GetTransportDashboard", commandType: CommandType.StoredProcedure);
            var kpi = await multi.ReadFirstOrDefaultAsync<dynamic>();

            int fleet = (int)(kpi?.TotalVehicles ?? 0);
            int activeVehicles = (int)(kpi?.ActiveVehicles ?? 0);
            int routes = (int)(kpi?.TotalRoutes ?? 0);
            int drivers = (int)(kpi?.TotalDrivers ?? 0);
            int students = (int)(kpi?.ActiveStudents ?? 0);
            int maint = (int)(kpi?.MaintenanceVehicles ?? 0);
            int util = Convert.ToInt32(kpi?.Utilization ?? 0);

            var summary = new DashboardReportMetricCardDto
            {
                FleetSize = fleet,
                ActiveVehicles = $"{activeVehicles} Active",
                ActiveRoutes = routes,
                ConfiguredRoutes = "Configured",
                ActiveDrivers = drivers,
                LicensedStaff = "Licensed Staff",
                TransportStudents = students,
                Occupancy = $"{util}% Occupancy",
                MaintenanceUnits = maint,
                InService = "In Service",
                SeatUtilization = $"{util}%",
                UtilizationRatio = $"{students} Seats"
            };

            var rows = new List<DashboardReportRowDto>
            {
                new DashboardReportRowDto { Metric = "Fleet Size", Value = fleet.ToString(), Status = $"{activeVehicles} Active" },
                new DashboardReportRowDto { Metric = "Active Routes", Value = routes.ToString(), Status = "Configured" },
                new DashboardReportRowDto { Metric = "Active Drivers", Value = drivers.ToString(), Status = "Licensed Staff" },
                new DashboardReportRowDto { Metric = "Transport Students", Value = students.ToString(), Status = $"{util}% Occupancy" },
                new DashboardReportRowDto { Metric = "Maintenance Units", Value = maint.ToString(), Status = "In Service" },
                new DashboardReportRowDto { Metric = "Seat Utilization", Value = $"{util}%", Status = $"{students} Seats" }
            };

            return new TransportDashboardReportResponseDto { Summary = summary, Metrics = rows };
        }

        public async Task<IEnumerable<TripReportDto>> GetTripReportsAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportReports",
                new { p_ReportType = "trip-reports", p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_Status = filter.Status ?? "" },
                commandType: CommandType.StoredProcedure);

            var list = raw.ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x =>
                    ((string)(x.VehicleNumber ?? "")).ToLower().Contains(q) ||
                    ((string)(x.RouteName ?? "")).ToLower().Contains(q)).ToList();
            }

            int idx = 1;
            return list.Select(x => new TripReportDto
            {
                TripNo = $"TRP-{((long)(x.TripId ?? idx++)):D3}",
                VehicleNumber = (string)(x.VehicleNumber ?? ""),
                RouteName = (string)(x.RouteName ?? "N/A"),
                DriverName = "Assigned Driver",
                BusAttendant = "Assigned Attendant",
                StudentsOnRoute = (int)(x.StudentsPresent ?? 0),
                CapacityUsed = $"{x.StudentsPresent ?? 0} Students",
                EffectiveFrom = x.TripDate != null ? ((DateTime)x.TripDate).ToString("yyyy-MM-dd") : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Status = (string)(x.Status ?? "Completed")
            }).ToList();
        }

        public async Task<IEnumerable<VehicleReportDto>> GetVehicleReportsAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportReports",
                new { p_ReportType = "vehicle-reports", p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_Status = filter.Status ?? "" },
                commandType: CommandType.StoredProcedure);

            var list = raw.ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x =>
                    ((string)(x.VehicleNumber ?? "")).ToLower().Contains(q) ||
                    ((string)(x.RegistrationNumber ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x => new VehicleReportDto
            {
                VehicleNumber = (string)(x.VehicleNumber ?? ""),
                RegistrationNo = (string)(x.RegistrationNumber ?? ""),
                VehicleType = (string)(x.VehicleType ?? "Bus"),
                AcStatus = (string)(x.AC ?? "Non-AC"),
                Capacity = (int)(x.Capacity ?? 50),
                AssignedStudents = 0,
                AssignedRoute = "Active Route",
                AssignedDriver = "Active Driver",
                BusAttendant = "Active Attendant",
                AssignmentStatus = "Assigned",
                UtilizationPercentage = "80%",
                Status = (string)(x.Status ?? "Active")
            }).ToList();
        }

        public async Task<IEnumerable<DriverReportDto>> GetDriverReportsAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportReports",
                new { p_ReportType = "driver-reports", p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_Status = filter.Status ?? "" },
                commandType: CommandType.StoredProcedure);

            var list = raw.ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x =>
                    ((string)(x.DriverName ?? "")).ToLower().Contains(q) ||
                    ((string)(x.MobileNumber ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x => new DriverReportDto
            {
                DriverName = (string)(x.DriverName ?? ""),
                MobileNumber = (string)(x.MobileNumber ?? ""),
                LicenseNumber = (string)(x.LicenseNumber ?? ""),
                LicenseExpiry = x.LicenseExpiryDate != null ? ((DateTime)x.LicenseExpiryDate).ToString("yyyy-MM-dd") : "N/A",
                CurrentBus = "Assigned Bus",
                CurrentRoute = "Assigned Route",
                BusAttendant = "Attendant",
                AssignmentStatus = "Assigned",
                ExperienceYears = 5,
                Status = (string)(x.Status ?? "Active")
            }).ToList();
        }

        public async Task<IEnumerable<RouteReportDto>> GetRouteReportsAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportReports",
                new { p_ReportType = "route-reports", p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_Status = filter.Status ?? "" },
                commandType: CommandType.StoredProcedure);

            var list = raw.ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x =>
                    ((string)(x.RouteCode ?? "")).ToLower().Contains(q) ||
                    ((string)(x.RouteName ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x => new RouteReportDto
            {
                RouteCode = (string)(x.RouteCode ?? ""),
                RouteName = (string)(x.RouteName ?? ""),
                StartPoint = (string)(x.StartLocation ?? ""),
                Destination = (string)(x.EndLocation ?? ""),
                DistanceKm = Convert.ToDecimal(x.TotalDistanceKm ?? 0),
                DurationMins = 45,
                TotalPickupPoints = (int)(x.PickupPointCount ?? 0),
                AssignedBus = "Assigned Bus",
                AssignedDriver = "Assigned Driver",
                Status = (string)(x.Status ?? "Active")
            }).ToList();
        }

        public async Task<IEnumerable<StudentTransportReportDto>> GetStudentTransportReportsAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportReports",
                new { p_ReportType = "student-transport-reports", p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_Status = filter.Status ?? "" },
                commandType: CommandType.StoredProcedure);

            var list = raw.ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x =>
                    ((string)(x.AdmissionNo ?? "")).ToLower().Contains(q) ||
                    ((string)(x.StudentName ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x => new StudentTransportReportDto
            {
                AssignmentId = (long)(x.StudentTransportAssignmentId ?? 0),
                AdmissionNo = (string)(x.AdmissionNo ?? ""),
                StudentName = (string)(x.StudentName ?? ""),
                ClassSection = "Class 1-A",
                ClassName = "Class 1",
                RouteName = (string)(x.RouteName ?? "N/A"),
                PickupPoint = (string)(x.PickupPointName ?? "N/A"),
                AssignedBus = (string)(x.VehicleNumber ?? "Unassigned"),
                DriverName = "Assigned Driver",
                Status = (string)(x.Status ?? "Active")
            }).ToList();
        }

        public async Task<IEnumerable<VehicleStudentReportDto>> GetVehicleWiseAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync("sp_GetTransportDashboard", commandType: CommandType.StoredProcedure);
            await multi.ReadFirstOrDefaultAsync<dynamic>(); // skip KPI
            var occupancy = await multi.ReadAsync<dynamic>();

            var list = occupancy.ToList();
            if (filter.VehicleId.HasValue) list = list.Where(x => (long)x.VehicleId == filter.VehicleId.Value).ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x => ((string)(x.VehicleNumber ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x =>
            {
                int cap = (int)(x.Capacity ?? 0);
                int assigned = Convert.ToInt32(x.AssignedStudents ?? 0);
                return new VehicleStudentReportDto
                {
                    VehicleId = (long)x.VehicleId,
                    VehicleNumber = (string)(x.VehicleNumber ?? ""),
                    VehicleName = (string)(x.VehicleType ?? "Bus"),
                    Capacity = cap,
                    AssignedStudents = assigned,
                    AvailableSeats = Math.Max(0, cap - assigned),
                    OccupancyPercentage = cap > 0 ? Math.Round((decimal)assigned / cap * 100, 2) : 0
                };
            }).ToList();
        }

        public async Task<IEnumerable<RouteStudentReportDto>> GetRouteWiseAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync("sp_GetTransportDashboard", commandType: CommandType.StoredProcedure);
            await multi.ReadFirstOrDefaultAsync<dynamic>(); // skip KPI
            await multi.ReadAsync<dynamic>(); // skip occupancy
            var routes = await multi.ReadAsync<dynamic>();

            var list = routes.ToList();
            if (filter.RouteId.HasValue) list = list.Where(x => (long)x.RouteId == filter.RouteId.Value).ToList();
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var q = filter.Search.Trim().ToLower();
                list = list.Where(x => ((string)(x.RouteName ?? "")).ToLower().Contains(q)).ToList();
            }

            return list.Select(x => new RouteStudentReportDto
            {
                RouteId = (long)x.RouteId,
                RouteName = (string)(x.RouteName ?? ""),
                StudentCount = Convert.ToInt32(x.StudentCount ?? 0)
            }).ToList();
        }

        public async Task<IEnumerable<PickupPointReportDto>> GetPickupPointWiseAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetPickupPoints",
                new { p_RouteId = filter.RouteId, p_Search = filter.Search ?? "" },
                commandType: CommandType.StoredProcedure);

            return raw.Select(x => new PickupPointReportDto
            {
                PickupPointId = (long)x.PickupPointId,
                PickupPointName = (string)(x.StopName ?? ""),
                RouteName = (string)(x.RouteName ?? ""),
                StudentCount = 0
            }).ToList();
        }

        public async Task<IEnumerable<DriverVehicleReportDto>> GetDriverWiseAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetTransportVehicleAssignments",
                new { p_RouteId = filter.RouteId, p_VehicleId = filter.VehicleId, p_DriverId = filter.DriverId, p_Status = (byte?)null, p_Search = filter.Search ?? "" },
                commandType: CommandType.StoredProcedure);

            return raw.Select(x => new DriverVehicleReportDto
            {
                DriverId = (long)(x.DriverId ?? 0),
                DriverName = (string)(x.DriverName ?? ""),
                VehicleNumber = (string)(x.VehicleNumber ?? ""),
                RouteName = (string)(x.RouteName ?? "")
            }).ToList();
        }

        public async Task<IEnumerable<VehicleStudentReportDto>> GetSeatOccupancyAsync(ReportFilterDto filter)
        {
            return await GetVehicleWiseAsync(filter);
        }

        public async Task<IEnumerable<MaintenanceReportDto>> GetMaintenanceAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetVehicleMaintenances",
                new { p_VehicleId = filter.VehicleId, p_FromDate = filter.FromDate?.Date, p_ToDate = filter.ToDate?.Date, p_Status = (byte?)null, p_Search = filter.Search ?? "" },
                commandType: CommandType.StoredProcedure);

            return raw.Select(x => new MaintenanceReportDto
            {
                MaintenanceId = (long)x.MaintenanceId,
                VehicleNumber = (string)(x.VehicleNumber ?? ""),
                ServiceType = (string)(x.ServiceType ?? ""),
                ServiceDate = (DateTime)x.ServiceDate,
                Cost = Convert.ToDecimal(x.Cost ?? 0),
                VendorCenter = (string)(x.VendorCenter ?? "")
            }).ToList();
        }

        public async Task<IEnumerable<MonthlyMaintenanceCostDto>> GetMonthlyCostAsync(ReportFilterDto filter)
        {
            using var c = Connection();
            var raw = await c.QueryAsync<dynamic>(
                "sp_GetVehicleMaintenances",
                new { p_VehicleId = filter.VehicleId, p_FromDate = filter.FromDate?.Date, p_ToDate = filter.ToDate?.Date, p_Status = (byte?)null, p_Search = filter.Search ?? "" },
                commandType: CommandType.StoredProcedure);

            return raw
                .GroupBy(x => new { Year = ((DateTime)x.ServiceDate).Year, Month = ((DateTime)x.ServiceDate).Month })
                .Select(g => new MonthlyMaintenanceCostDto
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM"),
                    ServiceCount = g.Count(),
                    TotalCost = g.Sum(x => Convert.ToDecimal(x.Cost ?? 0))
                }).OrderBy(x => x.Year).ThenBy(x => x.Month).ToList();
        }
    }
}
