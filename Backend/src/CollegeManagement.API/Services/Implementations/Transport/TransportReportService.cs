using System.Text;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportReportService : ITransportReportService
    {
        private readonly ITransportReportRepository _repository;

        public TransportReportService(
            ITransportReportRepository repository)
        {
            _repository = repository;
        }

        private static void ValidateFilter(ReportFilterDto filter)
        {
            filter ??= new ReportFilterDto();

            if (filter.FromDate.HasValue &&
                filter.ToDate.HasValue &&
                filter.FromDate > filter.ToDate)
            {
                throw new ArgumentException(
                    "From Date cannot be greater than To Date.");
            }

            filter.Search = filter.Search?.Trim();
        }

        public async Task<TransportDashboardReportResponseDto> GetDashboardReportAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetDashboardReportAsync(filter);
        }

        public async Task<IEnumerable<TripReportDto>> GetTripReportsAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetTripReportsAsync(filter);
        }

        public async Task<IEnumerable<VehicleReportDto>> GetVehicleReportsAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetVehicleReportsAsync(filter);
        }

        public async Task<IEnumerable<DriverReportDto>> GetDriverReportsAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetDriverReportsAsync(filter);
        }

        public async Task<IEnumerable<RouteReportDto>> GetRouteReportsAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetRouteReportsAsync(filter);
        }

        public async Task<IEnumerable<StudentTransportReportDto>> GetStudentTransportReportsAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetStudentTransportReportsAsync(filter);
        }

        public async Task<IEnumerable<VehicleStudentReportDto>> GetVehicleWiseAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetVehicleWiseAsync(filter);
        }

        public async Task<IEnumerable<RouteStudentReportDto>> GetRouteWiseAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetRouteWiseAsync(filter);
        }

        public async Task<IEnumerable<PickupPointReportDto>> GetPickupPointWiseAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetPickupPointWiseAsync(filter);
        }

        public async Task<IEnumerable<DriverVehicleReportDto>> GetDriverWiseAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetDriverWiseAsync(filter);
        }

        public async Task<IEnumerable<VehicleStudentReportDto>> GetSeatOccupancyAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetSeatOccupancyAsync(filter);
        }

        public async Task<IEnumerable<MaintenanceReportDto>> GetMaintenanceAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetMaintenanceAsync(filter);
        }

        public async Task<IEnumerable<MonthlyMaintenanceCostDto>> GetMonthlyCostAsync(ReportFilterDto filter)
        {
            ValidateFilter(filter);
            return await _repository.GetMonthlyCostAsync(filter);
        }

        public async Task<string> GetPrintHtmlAsync(string reportType, ReportFilterDto filter)
        {
            ValidateFilter(filter);
            reportType = (reportType ?? "dashboard").ToLower();

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html><head><meta charset='utf-8'><title>PIRNAV SCHOOLS - Transport Report</title>");
            sb.AppendLine("<style>");
            sb.AppendLine("body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #fff; color: #1e293b; }");
            sb.AppendLine(".header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }");
            sb.AppendLine(".title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }");
            sb.AppendLine(".subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }");
            sb.AppendLine("table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }");
            sb.AppendLine("th { background-color: #f1f5f9; color: #1e293b; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; }");
            sb.AppendLine("td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }");
            sb.AppendLine("tr:nth-child(even) { background-color: #f8fafc; }");
            sb.AppendLine(".badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; }");
            sb.AppendLine(".footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }");
            sb.AppendLine("@media print { body { padding: 0; } }");
            sb.AppendLine("</style></head><body>");

            sb.AppendLine("<div class='header'>");
            sb.AppendLine("  <div><div class='title'>PIRNAV SCHOOLS</div><div class='subtitle'>Transport Management System - Official Report</div></div>");
            sb.AppendLine($"  <div style='text-align:right;'><div style='font-weight:bold; color:#2563eb;'>{reportType.ToUpper()} REPORT</div><div class='subtitle'>Generated: {DateTime.Now:yyyy-MM-dd HH:mm}</div></div>");
            sb.AppendLine("</div>");

            if (reportType.Contains("student"))
            {
                var students = await _repository.GetStudentTransportReportsAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Admission No</th><th>Student Name</th><th>Class</th><th>Route Name</th><th>Pickup Point</th><th>Assigned Bus</th><th>Driver Name</th><th>Status</th></tr></thead><tbody>");
                foreach (var s in students)
                {
                    sb.AppendLine($"<tr><td><strong>{s.AdmissionNo}</strong></td><td>{s.StudentName}</td><td>{s.ClassSection}</td><td>{s.RouteName}</td><td>{s.PickupPoint}</td><td>{s.AssignedBus}</td><td>{s.DriverName}</td><td><span class='badge'>{s.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else if (reportType.Contains("maintenance"))
            {
                var maintenance = await _repository.GetMaintenanceAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Vehicle Number</th><th>Service Type</th><th>Service Date</th><th>Vendor</th><th>Cost (₹)</th></tr></thead><tbody>");
                foreach (var m in maintenance)
                {
                    sb.AppendLine($"<tr><td><strong>{m.VehicleNumber}</strong></td><td>{m.ServiceType}</td><td>{m.ServiceDate:yyyy-MM-dd}</td><td>{m.VendorCenter}</td><td>₹{m.Cost}</td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else if (reportType.Contains("trip"))
            {
                var trips = await _repository.GetTripReportsAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Trip No</th><th>Vehicle Number</th><th>Route Name</th><th>Driver Name</th><th>Bus Attendant</th><th>Students</th><th>Status</th></tr></thead><tbody>");
                foreach (var t in trips)
                {
                    sb.AppendLine($"<tr><td><strong>{t.TripNo}</strong></td><td>{t.VehicleNumber}</td><td>{t.RouteName}</td><td>{t.DriverName}</td><td>{t.BusAttendant}</td><td>{t.StudentsOnRoute}</td><td><span class='badge'>{t.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else if (reportType.Contains("vehicle"))
            {
                var vehicles = await _repository.GetVehicleReportsAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Vehicle Number</th><th>Reg No</th><th>Type</th><th>AC</th><th>Capacity</th><th>Assigned Route</th><th>Assigned Driver</th><th>Status</th></tr></thead><tbody>");
                foreach (var v in vehicles)
                {
                    sb.AppendLine($"<tr><td><strong>{v.VehicleNumber}</strong></td><td>{v.RegistrationNo}</td><td>{v.VehicleType}</td><td>{v.AcStatus}</td><td>{v.Capacity}</td><td>{v.AssignedRoute}</td><td>{v.AssignedDriver}</td><td><span class='badge'>{v.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else if (reportType.Contains("driver"))
            {
                var drivers = await _repository.GetDriverReportsAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Driver Name</th><th>Mobile Number</th><th>License Number</th><th>License Expiry</th><th>Current Bus</th><th>Current Route</th><th>Status</th></tr></thead><tbody>");
                foreach (var d in drivers)
                {
                    sb.AppendLine($"<tr><td><strong>{d.DriverName}</strong></td><td>{d.MobileNumber}</td><td>{d.LicenseNumber}</td><td>{d.LicenseExpiry ?? "N/A"}</td><td>{d.CurrentBus}</td><td>{d.CurrentRoute}</td><td><span class='badge'>{d.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else if (reportType.Contains("route"))
            {
                var routes = await _repository.GetRouteReportsAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Route Code</th><th>Route Name</th><th>Start Point</th><th>Destination</th><th>Distance</th><th>Stops</th><th>Assigned Bus</th><th>Status</th></tr></thead><tbody>");
                foreach (var r in routes)
                {
                    sb.AppendLine($"<tr><td><strong>{r.RouteCode}</strong></td><td>{r.RouteName}</td><td>{r.StartPoint}</td><td>{r.Destination}</td><td>{r.DistanceKm} KM</td><td>{r.TotalPickupPoints}</td><td>{r.AssignedBus}</td><td><span class='badge'>{r.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }
            else
            {
                var dash = await _repository.GetDashboardReportAsync(filter);
                sb.AppendLine("<table><thead><tr><th>Metric</th><th>Value</th><th>Status</th></tr></thead><tbody>");
                foreach (var m in dash.Metrics)
                {
                    sb.AppendLine($"<tr><td><strong>{m.Metric}</strong></td><td>{m.Value}</td><td><span class='badge'>{m.Status}</span></td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }

            sb.AppendLine("<div class='footer'>");
            sb.AppendLine("  <div>Confidential - Internal School Management Record</div>");
            sb.AppendLine("  <div>Page 1 of 1</div>");
            sb.AppendLine("</div>");
            sb.AppendLine("<script>window.onload = function() { window.print(); }</script>");
            sb.AppendLine("</body></html>");

            return sb.ToString();
        }

        public async Task<byte[]> GetPdfExportAsync(string reportType, ReportFilterDto filter)
        {
            var html = await GetPrintHtmlAsync(reportType, filter);
            return Encoding.UTF8.GetBytes(html);
        }

        public async Task<byte[]> GetCsvExportAsync(string reportType, ReportFilterDto filter)
        {
            ValidateFilter(filter);
            reportType = (reportType ?? "dashboard").ToLower();

            var sb = new StringBuilder();

            if (reportType.Contains("student"))
            {
                var data = await _repository.GetStudentTransportReportsAsync(filter);
                sb.AppendLine("Admission No,Student Name,Class,Route Name,Pickup Point,Assigned Bus,Driver Name,Status");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.AdmissionNo}\",\"{x.StudentName}\",\"{x.ClassSection}\",\"{x.RouteName}\",\"{x.PickupPoint}\",\"{x.AssignedBus}\",\"{x.DriverName}\",\"{x.Status}\"");
                }
            }
            else if (reportType.Contains("maintenance"))
            {
                var data = await _repository.GetMaintenanceAsync(filter);
                sb.AppendLine("Vehicle Number,Service Type,Service Date,Vendor,Cost");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.VehicleNumber}\",\"{x.ServiceType}\",\"{x.ServiceDate:yyyy-MM-dd}\",\"{x.VendorCenter}\",{x.Cost}");
                }
            }
            else if (reportType.Contains("trip"))
            {
                var data = await _repository.GetTripReportsAsync(filter);
                sb.AppendLine("Trip No,Vehicle Number,Route Name,Driver Name,Bus Attendant,Students On Route,Effective From,Status");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.TripNo}\",\"{x.VehicleNumber}\",\"{x.RouteName}\",\"{x.DriverName}\",\"{x.BusAttendant}\",{x.StudentsOnRoute},\"{x.EffectiveFrom}\",\"{x.Status}\"");
                }
            }
            else if (reportType.Contains("vehicle"))
            {
                var data = await _repository.GetVehicleReportsAsync(filter);
                sb.AppendLine("Vehicle Number,Registration No,Vehicle Type,AC Status,Capacity,Assigned Route,Assigned Driver,Bus Attendant,Status");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.VehicleNumber}\",\"{x.RegistrationNo}\",\"{x.VehicleType}\",\"{x.AcStatus}\",{x.Capacity},\"{x.AssignedRoute}\",\"{x.AssignedDriver}\",\"{x.BusAttendant}\",\"{x.Status}\"");
                }
            }
            else if (reportType.Contains("driver"))
            {
                var data = await _repository.GetDriverReportsAsync(filter);
                sb.AppendLine("Driver Name,Mobile Number,License Number,License Expiry,Current Bus,Current Route,Bus Attendant,Status");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.DriverName}\",\"{x.MobileNumber}\",\"{x.LicenseNumber}\",\"{x.LicenseExpiry}\",\"{x.CurrentBus}\",\"{x.CurrentRoute}\",\"{x.BusAttendant}\",\"{x.Status}\"");
                }
            }
            else if (reportType.Contains("route"))
            {
                var data = await _repository.GetRouteReportsAsync(filter);
                sb.AppendLine("Route Code,Route Name,Start Point,Destination,Distance (KM),Duration (Mins),Total Pickup Points,Assigned Bus,Status");
                foreach (var x in data)
                {
                    sb.AppendLine($"\"{x.RouteCode}\",\"{x.RouteName}\",\"{x.StartPoint}\",\"{x.Destination}\",{x.DistanceKm},{x.DurationMins},{x.TotalPickupPoints},\"{x.AssignedBus}\",\"{x.Status}\"");
                }
            }
            else
            {
                var data = await _repository.GetDashboardReportAsync(filter);
                sb.AppendLine("Metric,Value,Status");
                foreach (var x in data.Metrics)
                {
                    sb.AppendLine($"\"{x.Metric}\",\"{x.Value}\",\"{x.Status}\"");
                }
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }
    }
}
