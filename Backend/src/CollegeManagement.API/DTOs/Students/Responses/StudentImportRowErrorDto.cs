namespace CollegeManagement.API.DTOs.Students
{
    public class StudentImportRowErrorDto
    {
        public int RowNumber { get; set; }
        public string? AdmissionNo { get; set; }
        public string? StudentName { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string? InvalidValue { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }
}