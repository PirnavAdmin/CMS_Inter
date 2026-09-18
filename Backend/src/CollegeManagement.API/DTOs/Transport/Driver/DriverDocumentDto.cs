using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class DriverDocumentDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; } = 1;

        [JsonPropertyName("documentId")]
        public long DocumentId => Id;

        [JsonPropertyName("documentCategory")]
        public string DocumentCategory { get; set; } = "Medical Certificate";

        [JsonPropertyName("documentNumber")]
        public string DocumentNumber { get; set; } = "MED-VER-6372";

        [JsonPropertyName("certificateNo")]
        public string CertificateNo => DocumentNumber;

        [JsonPropertyName("issueDate")]
        public string IssueDate { get; set; } = DateTime.Today.ToString("yyyy-MM-dd");

        [JsonPropertyName("expiryDate")]
        public string ExpiryDate { get; set; } = DateTime.Today.AddYears(1).ToString("yyyy-MM-dd");

        [JsonPropertyName("badgeNumber")]
        public string BadgeNumber { get; set; } = "BDG-1034";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Verified";

        [JsonPropertyName("fileName")]
        public string FileName { get; set; } = "Certificate_Main_Driver.pdf";

        [JsonPropertyName("fileUrl")]
        public string FileUrl { get; set; } = "#";
    }
}

