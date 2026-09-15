using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INumberSeriesRepository
    {
        Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync();
        Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode);
        Task<NumberSeriesConfiguration?> UpdateByCodeAsync(string seriesCode, string prefix, string formatPattern, int numberLength, int startNumber, string? description);
        Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode);
        Task EnsureTableAndSeedsAsync();
    }
}
