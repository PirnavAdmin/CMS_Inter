using System;

namespace CollegeManagement.API.DTOs.Realtime
{
    public class DomainEventPayload
    {
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public int? CampusId { get; set; }
        public int? CollegeId { get; set; }
        public string? EntityId { get; set; }
        public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    }
}
