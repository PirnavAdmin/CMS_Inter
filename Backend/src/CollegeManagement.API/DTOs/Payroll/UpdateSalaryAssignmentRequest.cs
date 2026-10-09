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
        public string? IFSCCode { get => IfscCode; set => IfscCode = value; }
        public string? PanNumber { get; set; }
        public string? PANNumber { get => PanNumber; set => PanNumber = value; }
        public string? UanNumber { get; set; }
        public string? UANNumber { get => UanNumber; set => UanNumber = value; }
    }
}