using System;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    /// <summary>
    /// Internal persisted idempotency state record mapped from sp_TryBeginAdmissionIdempotency / sp_GetAdmissionIdempotencyRecord.
    /// </summary>
    public class AdmissionIdempotencyRecordDto
    {
        public int LockAcquired { get; set; }
        public long Id { get; set; }
        public string IdempotencyKey { get; set; } = string.Empty;
        public int? CampusId { get; set; }
        public int? CreatedByUserId { get; set; }
        public string RequestHash { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? AdmissionId { get; set; }
        public string? AdmissionNo { get; set; }
        public int? HttpStatusCode { get; set; }
        public string? ResponseJson { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>
    /// Service result wrapper distinguishing fresh admission creation from idempotent replay.
    /// </summary>
    public class StudentAdmissionCreateResultDto
    {
        public StudentAdmissionResponseDto Admission { get; set; } = null!;
        public bool IsIdempotentReplay { get; set; }
        public string? IdempotencyKey { get; set; }
    }

    /// <summary>
    /// Recovery status payload for uncertain/timed-out admission creation requests.
    /// </summary>
    public class StudentAdmissionRecoveryResponseDto
    {
        public string IdempotencyKey { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ResultStatus { get; set; } = string.Empty;
        public int? AdmissionId { get; set; }
        public string? AdmissionNo { get; set; }
        public int? HttpStatusCode { get; set; }
        public string? ErrorMessage { get; set; }
        public StudentAdmissionResponseDto? Admission { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public sealed class AdmissionIdempotencyConflictException : Exception
    {
        public string IdempotencyKey { get; }

        public AdmissionIdempotencyConflictException(string idempotencyKey, string message)
            : base(message)
        {
            IdempotencyKey = idempotencyKey;
        }
    }

    public sealed class AdmissionIdempotencyInProgressException : Exception
    {
        public string IdempotencyKey { get; }

        public AdmissionIdempotencyInProgressException(string idempotencyKey, string message)
            : base(message)
        {
            IdempotencyKey = idempotencyKey;
        }
    }
}
