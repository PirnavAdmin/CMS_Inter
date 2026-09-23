using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    public class TransportAttendantLookupDto
    {
        [JsonPropertyName("attendantId")]
        public long AttendantId { get; set; }

        [JsonPropertyName("id")]
        public long Id => AttendantId;

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name => AttendantName;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonPropertyName("label")]
        public string Label => DisplayName;

        [JsonPropertyName("value")]
        public long Value => AttendantId;
    }
}

