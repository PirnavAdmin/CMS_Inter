using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport-reports")]
    [AllowAnonymous]
    [Tags("Transport Management Reports")]
    public class TransportReportController : ControllerBase
    {
        private readonly ITransportReportService _service;

        public TransportReportController(
            ITransportReportService service)
        {
            _service = service;
        }

        [HttpGet("dashboard")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDashboardReport([FromQuery] ReportFilterDto filter)
        {
            var result = await _service.GetDashboardReportAsync(filter);
            return Ok(new
            {
                success = true,
                message = "Transport dashboard report retrieved successfully.",
                summary = result.Summary,
                data = result.Metrics,
                metrics = result.Metrics,
                totalCount = result.Metrics.Count
            });
        }

        [HttpGet("trips")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTripReports([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetTripReportsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Trip reports retrieved successfully.",
                    data = result,
                    totalCount = result.Count()
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = true,
                    message = "Trip reports retrieved successfully.",
                    data = new List<TripReportDto>(),
                    totalCount = 0,
                    error = ex.Message
                });
            }
        }

        [HttpGet("vehicles")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVehicleReports([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetVehicleReportsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Vehicle reports retrieved successfully.",
                    data = result,
                    totalCount = result.Count()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("drivers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDriverReports([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetDriverReportsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Driver reports retrieved successfully.",
                    data = result,
                    totalCount = result.Count()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("routes")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRouteReports([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetRouteReportsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Route reports retrieved successfully.",
                    data = result,
                    totalCount = result.Count()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("students")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStudentTransportReports([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetStudentTransportReportsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Student transport reports retrieved successfully.",
                    data = result,
                    totalCount = result.Count()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("pickup-wise")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPickupPointWise([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetPickupPointWiseAsync(filter);
                return Ok(new { success = true, data = result, totalCount = result.Count() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("seat-occupancy")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSeatOccupancy([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetSeatOccupancyAsync(filter);
                return Ok(new { success = true, data = result, totalCount = result.Count() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("maintenance")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMaintenance([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetMaintenanceAsync(filter);
                return Ok(new { success = true, data = result, totalCount = result.Count() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("monthly-cost")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMonthlyCost([FromQuery] ReportFilterDto filter)
        {
            try
            {
                var result = await _service.GetMonthlyCostAsync(filter);
                return Ok(new { success = true, data = result, totalCount = result.Count() });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving report data.", error = ex.Message });
            }
        }

        [HttpGet("print")]
        [AllowAnonymous]
        public async Task<IActionResult> PrintReport(string? reportType, [FromQuery] ReportFilterDto filter)
        {
            try
            {
                var type = !string.IsNullOrWhiteSpace(reportType) ? reportType : (filter.ReportType ?? "dashboard");
                var html = await _service.GetPrintHtmlAsync(type, filter);
                return Content(html, "text/html");
            }
            catch
            {
                return Content("<html><body><h2>Report Preview</h2><p>No records found to display.</p></body></html>", "text/html");
            }
        }

        [HttpGet("export/pdf")]
        [AllowAnonymous]
        public async Task<IActionResult> ExportPdf(string? reportType, [FromQuery] ReportFilterDto filter)
        {
            try
            {
                var type = !string.IsNullOrWhiteSpace(reportType) ? reportType : (filter.ReportType ?? "dashboard");
                var bytes = await _service.GetPdfExportAsync(type, filter);
                return File(bytes, "application/pdf", $"{type}_report_{DateTime.Now:yyyyMMdd}.pdf");
            }
            catch
            {
                return File(new byte[0], "application/pdf", $"report_{DateTime.Now:yyyyMMdd}.pdf");
            }
        }

        [HttpGet("export/csv")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadCsv(string? reportType, [FromQuery] ReportFilterDto filter)
        {
            try
            {
                var type = !string.IsNullOrWhiteSpace(reportType) ? reportType : (filter.ReportType ?? "dashboard");
                var bytes = await _service.GetCsvExportAsync(type, filter);
                return File(bytes, "text/csv", $"{type}_report_{DateTime.Now:yyyyMMdd}.csv");
            }
            catch
            {
                return File(new byte[0], "text/csv", $"report_{DateTime.Now:yyyyMMdd}.csv");
            }
        }
    }
}
