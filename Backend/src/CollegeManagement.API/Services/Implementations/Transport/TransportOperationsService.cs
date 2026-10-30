using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations.Transport
{
    public class TransportOperationsService : ITransportOperationsService
    {
        private readonly ITransportOperationsRepository _repository;

        public TransportOperationsService(ITransportOperationsRepository repository)
        {
            _repository = repository;
        }

        public async Task<VehicleTripsResponseDto> GetTripsResponseAsync(
            long? routeId,
            long? vehicleId,
            DateTime? tripDate,
            string? status,
            string? search,
            CancellationToken ct = default)
        {
            var tripCards = await _repository.GetTripsAsync(routeId, vehicleId, tripDate, status, search, ct);

            var metrics = new VehicleTripMetricsDto
            {
                VehiclesRunning = tripCards.Count(x => x.Status == "Running"),
                TripsCompleted = tripCards.Count(x => x.Status == "Completed"),
                DelayedTrips = tripCards.Count(x => x.Status == "Delayed" || x.Status == "Cancelled"),
                OfflineGpsDevices = 0,
                ActiveMorningTrips = tripCards.Count(x => x.Status == "Running"),
                StudentsOnBoard = tripCards.Sum(x => x.StudentsCount),
                ActiveEveningTrips = 0
            };

            return new VehicleTripsResponseDto
            {
                Metrics = metrics,
                Trips = tripCards
            };
        }

        public Task<long> CreateTripAsync(VehicleTripCardDto dto, CancellationToken ct = default) =>
            _repository.CreateTripAsync(dto, ct);

        public Task<bool> UpdateTripAsync(long tripId, VehicleTripCardDto dto, CancellationToken ct = default) =>
            _repository.UpdateTripAsync(tripId, dto, ct);

        public Task<bool> DeleteTripAsync(long tripId, CancellationToken ct = default) =>
            _repository.DeleteTripAsync(tripId, ct);

        public Task<List<GpsVehicleTrackingDto>> GetGpsTrackingAsync(CancellationToken ct = default) =>
            _repository.GetGpsTrackingAsync(ct);
    }
}
