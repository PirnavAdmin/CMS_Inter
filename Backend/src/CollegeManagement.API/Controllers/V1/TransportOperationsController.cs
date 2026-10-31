using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/transport/operations")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
    public class TransportOperationsController : ControllerBase
    {
        private readonly ITransportOperationsService _operationsService;

        public TransportOperationsController(ITransportOperationsService operationsService)
        {
            _operationsService = operationsService;
        }

        [HttpGet("trips")]
        [ProducesResponseType(typeof(VehicleTripsResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTrips(
            [FromQuery] long? routeId,
            [FromQuery] long? vehicleId,
            [FromQuery] DateTime? tripDate,
            [FromQuery] string? status,
            [FromQuery] string? search,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _operationsService.GetTripsResponseAsync(routeId, vehicleId, tripDate, status, search, ct);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to retrieve trips", error = ex.Message });
            }
        }

        [HttpPost("trips")]
        public async Task<IActionResult> CreateTrip(
            [FromBody] VehicleTripCardDto dto,
            CancellationToken ct = default)
        {
            try
            {
                var id = await _operationsService.CreateTripAsync(dto, ct);
                return Ok(new { success = true, data = id, message = "Trip created successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to create trip", error = ex.Message });
            }
        }

        [HttpPut("trips/{tripId}")]
        public async Task<IActionResult> UpdateTrip(
            long tripId,
            [FromBody] VehicleTripCardDto dto,
            CancellationToken ct = default)
        {
            try
            {
                var rows = await _operationsService.UpdateTripAsync(tripId, dto, ct);
                return Ok(new { success = rows, message = "Trip updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to update trip", error = ex.Message });
            }
        }

        [HttpDelete("trips/{tripId}")]
        public async Task<IActionResult> DeleteTrip(
            long tripId,
            CancellationToken ct = default)
        {
            try
            {
                var rows = await _operationsService.DeleteTripAsync(tripId, ct);
                return Ok(new { success = rows, message = "Trip deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to delete trip", error = ex.Message });
            }
        }

        [HttpGet("gps")]
        public async Task<IActionResult> GetGpsTracking(CancellationToken ct = default)
        {
            try
            {
                var list = await _operationsService.GetGpsTrackingAsync(ct);
                return Ok(new { success = true, data = list });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Failed to retrieve GPS tracking data", errors = new { } });
            }
        }
    }
}
