namespace CollegeManagement.API.DTOs.MasterGroups
{
    public class EligibleAcademicLevelDto
    {
        public int AcademicLevelId { get; set; }
        public string LevelName { get; set; } = string.Empty;
        public string AcademicLevelName
        {
            get => LevelName;
            set => LevelName = value;
        }
        public string LevelCode { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public int LevelOrder
        {
            get => DisplayOrder;
            set => DisplayOrder = value;
        }
        public bool IsActive { get; set; }
    }
}
