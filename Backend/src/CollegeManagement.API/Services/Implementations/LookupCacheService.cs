using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations
{
    public class LookupCacheService : ILookupCacheService
    {
        private readonly IMemoryCache _memoryCache;

        public LookupCacheService(IMemoryCache memoryCache)
        {
            _memoryCache = memoryCache;
        }

        public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory)
        {
            if (_memoryCache.TryGetValue(key, out T? cachedValue) && cachedValue != null)
            {
                return cachedValue;
            }

            var value = await factory();
            if (value != null)
            {
                _memoryCache.Set(key, value, TimeSpan.FromMinutes(30)); // Cache for 30 minutes
            }
            return value;
        }
    }
}
