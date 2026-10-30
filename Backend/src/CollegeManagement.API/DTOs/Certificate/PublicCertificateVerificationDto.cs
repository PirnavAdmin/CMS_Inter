using System;

namespace CollegeManagement.API.DTOs.Certificate
{
    public class PublicCertificateVerificationDto
    {
        public string CertificateNumber { get; set; } = string.Empty;
        public string StudentNameMasked { get; set; } = string.Empty; // e.g. "R****h K***r"
        public string CertificateType { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public string IssuingInstitution { get; set; } = string.Empty;
        public string ValidityStatus { get; set; } = "Valid";
        public string VerificationHash { get; set; } = string.Empty;
    }
}
