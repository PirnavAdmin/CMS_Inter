using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INumberSeriesRepository
    {
        Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null, bool includeSubCounters = false);
        Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null);
        Task<NumberSeriesConfiguration?> UpdateByCodeAsync(string seriesCode, string prefix, string formatPattern, int numberLength, int startNumber, string? description, int? campusId = null, bool? isActive = null, string? seriesName = null);
        Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null);
        Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null);
        Task EnsureTableAndSeedsAsync();
    }
}
