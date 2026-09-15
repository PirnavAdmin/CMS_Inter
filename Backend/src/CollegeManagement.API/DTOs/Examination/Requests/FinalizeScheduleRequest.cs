using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class FinalizeScheduleRequest
    {
        public List<CreateExamScheduleRequest>? Schedules { get; set; }
    }
}
