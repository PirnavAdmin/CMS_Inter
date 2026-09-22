using System;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ILookupCacheService
    {
        Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory);
    }
}
