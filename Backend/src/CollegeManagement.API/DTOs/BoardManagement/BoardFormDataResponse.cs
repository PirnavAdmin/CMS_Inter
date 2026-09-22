using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Board.Responses
{
    public class BoardFormDataResponse
    {
        public IEnumerable<CountryResponse> Countries { get; set; } = new List<CountryResponse>();
        public IEnumerable<AcademicLevelResponse> AcademicLevels { get; set; } = new List<AcademicLevelResponse>();
        public IEnumerable<GradingSystemResponse> GradingSystems { get; set; } = new List<GradingSystemResponse>();
        public IEnumerable<string> BoardTypes { get; set; } = new List<string>();
    }
}
