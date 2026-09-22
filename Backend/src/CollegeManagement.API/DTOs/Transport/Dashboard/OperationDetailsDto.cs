using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Dashboard
{
    public class OperationDetailsDto
    {
        [JsonPropertyName("assignmentId")]
        public long AssignmentId { get; set; }

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

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Completed";

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom { get; set; }

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

        [JsonPropertyName("morningTripTime")]
        public string MorningTripTime { get; set; } = "07:00 AM";

        [JsonPropertyName("eveningTripTime")]
        public string EveningTripTime { get; set; } = "03:45 PM";

        [JsonPropertyName("capacity")]
        public int Capacity { get; set; } = 50;

        [JsonPropertyName("assignedStudentsCount")]
        public int AssignedStudentsCount { get; set; }

        [JsonPropertyName("totalStudents")]
        public int TotalStudents { get; set; }

        [JsonPropertyName("boysCount")]
        public int BoysCount { get; set; }

        [JsonPropertyName("girlsCount")]
        public int GirlsCount { get; set; }

        [JsonPropertyName("pickupPointsCount")]
        public int PickupPointsCount { get; set; }

        [JsonPropertyName("availableSeats")]
        public int AvailableSeats { get; set; }

        [JsonPropertyName("totalRouteDistanceKm")]
        public double TotalRouteDistanceKm { get; set; } = 18;

        [JsonPropertyName("estimatedTripDurationMins")]
        public int EstimatedTripDurationMins { get; set; } = 120;

        [JsonPropertyName("morningTripSequence")]
        public List<TripSequenceStopDto> MorningTripSequence { get; set; } = new();

        [JsonPropertyName("eveningTripSequence")]
        public List<TripSequenceStopDto> EveningTripSequence { get; set; } = new();

        [JsonPropertyName("studentList")]
        public List<OperationStudentDto> StudentList { get; set; } = new();

        [JsonPropertyName("tripHistory")]
        public List<OperationTripHistoryDto> TripHistory { get; set; } = new();
    }

    public class TripSequenceStopDto
    {
        [JsonPropertyName("stepNo")]
        public int StepNo { get; set; }

        [JsonPropertyName("stopName")]
        public string StopName { get; set; } = string.Empty;

        [JsonPropertyName("distanceKm")]
        public double DistanceKm { get; set; }

        [JsonPropertyName("scheduledTime")]
        public string ScheduledTime { get; set; } = string.Empty;

        [JsonPropertyName("boardingAlightingInfo")]
        public string BoardingAlightingInfo { get; set; } = "No Students Assigned";

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = "Stop";
    }

    public class OperationStudentDto
    {
        [JsonPropertyName("studentId")]
        public long StudentId { get; set; }

        [JsonPropertyName("admissionNo")]
        public string AdmissionNo { get; set; } = string.Empty;

        [JsonPropertyName("studentName")]
        public string StudentName { get; set; } = string.Empty;

        [JsonPropertyName("classSec")]
        public string ClassSec { get; set; } = string.Empty;

        [JsonPropertyName("gender")]
        public string Gender { get; set; } = string.Empty;

        [JsonPropertyName("pickupPointName")]
        public string PickupPointName { get; set; } = string.Empty;

        [JsonPropertyName("morningPickupTime")]
        public string MorningPickupTime { get; set; } = "07:00 AM";

        [JsonPropertyName("eveningDropTime")]
        public string EveningDropTime { get; set; } = "03:45 PM";

        [JsonPropertyName("parentName")]
        public string ParentName { get; set; } = string.Empty;

        [JsonPropertyName("parentMobile")]
        public string ParentMobile { get; set; } = string.Empty;
    }

    public class OperationTripHistoryDto
    {
        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = "Unassigned";

        [JsonPropertyName("morningStart")]
        public string MorningStart { get; set; } = "07:00 AM";

        [JsonPropertyName("morningEnd")]
        public string MorningEnd { get; set; } = "07:30 AM";

        [JsonPropertyName("eveningStart")]
        public string EveningStart { get; set; } = "03:45 PM";

        [JsonPropertyName("eveningEnd")]
        public string EveningEnd { get; set; } = "03:45 PM";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Completed";
    }
}

