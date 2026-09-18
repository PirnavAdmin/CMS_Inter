using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Operations
{
    public class RouteStopDto
    {
        [JsonPropertyName("stopId")]
        public long StopId { get; set; }

        [JsonPropertyName("stopName")]
        public string StopName { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name => StopName;

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; } = 10;

        [JsonPropertyName("distance")]
        public string Distance => $"{DistanceKm} KM";

        [JsonPropertyName("scheduledTime")]
        public string ScheduledTime { get; set; } = "07:30 AM";

        [JsonPropertyName("time")]
        public string Time => ScheduledTime;
    }

    public class GpsVehicleTrackingDto
    {
        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("id")]
        public string Id => VehicleId.ToString();

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("busNumber")]
        public string BusNumber => VehicleNumber;

        [JsonPropertyName("vehicleName")]
        public string VehicleName { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("route")]
        public string Route => RouteName;

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("driver")]
        public string Driver => DriverName;

        [JsonPropertyName("driverMobile")]
        public string DriverMobile { get; set; } = string.Empty;

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = "Unassigned";

        [JsonPropertyName("busAttendant")]
        public string BusAttendant => AttendantName;

        [JsonPropertyName("speed")]
        public string Speed { get; set; } = "0 km/h";

        [JsonPropertyName("eta")]
        public string Eta { get; set; } = "0 mins";

        [JsonPropertyName("gpsSignal")]
        public string GpsSignal { get; set; } = "Offline";

        [JsonPropertyName("gpsStatus")]
        public string GpsStatus => GpsSignal;

        [JsonPropertyName("currentStop")]
        public string CurrentStop { get; set; } = "Beach";

        [JsonPropertyName("nextStop")]
        public string NextStop { get; set; } = "Beach";

        [JsonPropertyName("tripStatus")]
        public string TripStatus { get; set; } = "Idle";

        [JsonPropertyName("routeProgress")]
        public string RouteProgress { get; set; } = "Heading to Beach";

        [JsonPropertyName("routeStops")]
        public List<RouteStopDto> RouteStops { get; set; } = new();
    }
}

