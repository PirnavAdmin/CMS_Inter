using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Dtos.Transport.Operations;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportOperationsService
    {
        Task<VehicleTripsResponseDto> GetTripsResponseAsync(
            long? routeId,
            long? vehicleId,
            DateTime? tripDate,
            string? status,
            string? search,
            CancellationToken ct = default);

        Task<long> CreateTripAsync(
            VehicleTripCardDto dto,
            CancellationToken ct = default);

        Task<bool> UpdateTripAsync(
            long tripId,
            VehicleTripCardDto dto,
            CancellationToken ct = default);

        Task<bool> DeleteTripAsync(
            long tripId,
            CancellationToken ct = default);

        Task<List<GpsVehicleTrackingDto>> GetGpsTrackingAsync(
            CancellationToken ct = default);
    }
}
