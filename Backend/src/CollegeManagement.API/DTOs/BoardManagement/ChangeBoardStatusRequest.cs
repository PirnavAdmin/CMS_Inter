namespace CollegeManagement.API.DTOs.Board.Requests
{
    public class ChangeBoardStatusRequest
    {
        public bool Status { get; set; }
        public uint RowVersion { get; set; }
    }
}
