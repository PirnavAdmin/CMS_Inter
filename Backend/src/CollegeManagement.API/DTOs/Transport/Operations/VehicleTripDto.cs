using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Operations
{
    public class VehicleTripMetricsDto
    {
        [JsonPropertyName("vehiclesRunning")]
        public int VehiclesRunning { get; set; } = 0;

        [JsonPropertyName("tripsCompleted")]
        public int TripsCompleted { get; set; } = 7;

        [JsonPropertyName("delayedTrips")]
        public int DelayedTrips { get; set; } = 0;

        [JsonPropertyName("offlineGpsDevices")]
        public int OfflineGpsDevices { get; set; } = 7;

        [JsonPropertyName("activeMorningTrips")]
        public int ActiveMorningTrips { get; set; } = 0;

        [JsonPropertyName("studentsOnBoard")]
        public int StudentsOnBoard { get; set; } = 0;

        [JsonPropertyName("activeEveningTrips")]
        public int ActiveEveningTrips { get; set; } = 0;
    }

    public class VehicleTripCardDto
    {
        [JsonPropertyName("tripId")]
        public long TripId { get; set; }

        [JsonPropertyName("id")]
        public string Id => TripId.ToString();

        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("registrationNumber")]
        public string RegistrationNumber { get; set; } = string.Empty;

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("driverId")]
        public long DriverId { get; set; }

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("driverMobile")]
        public string DriverMobile { get; set; } = string.Empty;

        [JsonPropertyName("attendantId")]
        public long? AttendantId { get; set; }

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = "Unassigned";

        [JsonPropertyName("attendantMobile")]
        public string AttendantMobile { get; set; } = "N/A";

        [JsonPropertyName("studentsCount")]
        public int StudentsCount { get; set; } = 0;

        [JsonPropertyName("capacity")]
        public int Capacity { get; set; } = 50;

        [JsonPropertyName("morningTripTime")]
        public string MorningTripTime { get; set; } = "07:00 AM";

        [JsonPropertyName("eveningTripTime")]
        public string EveningTripTime { get; set; } = "03:45 PM";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Completed";

        [JsonPropertyName("gpsStatus")]
        public string GpsStatus { get; set; } = "GPS Offline";
    }

    public class VehicleTripsResponseDto
    {
        [JsonPropertyName("metrics")]
        public VehicleTripMetricsDto Metrics { get; set; } = new();

        [JsonPropertyName("trips")]
        public List<VehicleTripCardDto> Trips { get; set; } = new();
    }
}

