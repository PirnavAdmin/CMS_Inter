using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Payroll
{
    public class UpdateSalaryAssignmentRequest
    {
        public int SalaryStructureId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public string? PaymentMode { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }

        public string? IfscCode { get; set; }

        [JsonIgnore]
        public string? IFSCCode { get => IfscCode; set => IfscCode = value; }

        public string? PanNumber { get; set; }

        [JsonIgnore]
        public string? PANNumber { get => PanNumber; set => PanNumber = value; }

        public string? UanNumber { get; set; }

        [JsonIgnore]
        public string? UANNumber { get => UanNumber; set => UanNumber = value; }
    }
}