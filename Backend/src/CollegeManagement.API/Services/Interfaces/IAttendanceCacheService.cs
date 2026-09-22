using System;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAttendanceCacheService
    {
        string GetCacheKey<T>(string endpointName, T request);
        Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory);
        void InvalidateAll();
    }
}
