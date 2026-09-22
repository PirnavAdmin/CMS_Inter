using System;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    /// <summary>
    /// Response DTO containing historical audit logs details.
    /// </summary>
    public class BoardHistoryResponse
    {
        public long AuditLogId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
