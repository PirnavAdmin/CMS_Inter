namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class SaveAdmissionFeeSelectionsRequest
    {
        public int AdmissionId { get; set; }

        public List<int> SelectedFeeStructureComponentIds { get; set; }
            = new List<int>();
    }
}