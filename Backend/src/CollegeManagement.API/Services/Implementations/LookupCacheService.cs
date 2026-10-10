using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations
{
    public class LookupCacheService : ILookupCacheService
    {
        private readonly IMemoryCache _memoryCache;
        private static readonly ConcurrentDictionary<string, byte> _trackedKeys = new ConcurrentDictionary<string, byte>();

        public LookupCacheService(IMemoryCache memoryCache)
        {
            _memoryCache = memoryCache;
        }

        public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
        {
            if (_memoryCache.TryGetValue(key, out T? cachedValue) && cachedValue != null)
            {
                return cachedValue;
            }

            var value = await factory();
            if (value != null)
            {
                _memoryCache.Set(key, value, expiration ?? TimeSpan.FromMinutes(30));
                _trackedKeys.TryAdd(key, 0);
            }
            return value;
        }

        public void Remove(string key)
        {
            _memoryCache.Remove(key);
            _trackedKeys.TryRemove(key, out _);
        }

        public void RemoveByPrefix(string prefix)
        {
            var keysToRemove = _trackedKeys.Keys
                .Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var key in keysToRemove)
            {
                _memoryCache.Remove(key);
                _trackedKeys.TryRemove(key, out _);
            }
        }
    }
}
