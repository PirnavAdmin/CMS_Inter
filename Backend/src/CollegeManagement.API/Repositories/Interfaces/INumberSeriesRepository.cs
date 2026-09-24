using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INumberSeriesRepository
    {
        Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null);
        Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null);
        Task<NumberSeriesConfiguration?> UpdateByCodeAsync(string seriesCode, string prefix, string formatPattern, int numberLength, int startNumber, string? description, int? campusId = null);
        Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null);
        Task EnsureTableAndSeedsAsync();
    }
}
