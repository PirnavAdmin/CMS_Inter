using CollegeManagement.API.Dtos.Transport.Reports;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportReportService
    {
        Task<TransportDashboardReportResponseDto> GetDashboardReportAsync(ReportFilterDto filter);

        Task<IEnumerable<TripReportDto>> GetTripReportsAsync(ReportFilterDto filter);

        Task<IEnumerable<VehicleReportDto>> GetVehicleReportsAsync(ReportFilterDto filter);

        Task<IEnumerable<DriverReportDto>> GetDriverReportsAsync(ReportFilterDto filter);

        Task<IEnumerable<RouteReportDto>> GetRouteReportsAsync(ReportFilterDto filter);

        Task<IEnumerable<StudentTransportReportDto>> GetStudentTransportReportsAsync(ReportFilterDto filter);

        Task<IEnumerable<VehicleStudentReportDto>> GetVehicleWiseAsync(ReportFilterDto filter);

        Task<IEnumerable<RouteStudentReportDto>> GetRouteWiseAsync(ReportFilterDto filter);

        Task<IEnumerable<PickupPointReportDto>> GetPickupPointWiseAsync(ReportFilterDto filter);

        Task<IEnumerable<DriverVehicleReportDto>> GetDriverWiseAsync(ReportFilterDto filter);

        Task<IEnumerable<VehicleStudentReportDto>> GetSeatOccupancyAsync(ReportFilterDto filter);

        Task<IEnumerable<MaintenanceReportDto>> GetMaintenanceAsync(ReportFilterDto filter);

        Task<IEnumerable<MonthlyMaintenanceCostDto>> GetMonthlyCostAsync(ReportFilterDto filter);

        Task<string> GetPrintHtmlAsync(string reportType, ReportFilterDto filter);

        Task<byte[]> GetPdfExportAsync(string reportType, ReportFilterDto filter);

        Task<byte[]> GetCsvExportAsync(string reportType, ReportFilterDto filter);
    }
}
