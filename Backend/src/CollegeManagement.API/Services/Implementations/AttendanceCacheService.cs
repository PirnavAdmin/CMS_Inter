using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations
{
    public class AttendanceCacheService : IAttendanceCacheService
    {
        private readonly IMemoryCache _memoryCache;
        private static readonly ConcurrentDictionary<string, byte> _keys = new ConcurrentDictionary<string, byte>();

        public AttendanceCacheService(IMemoryCache memoryCache)
        {
            _memoryCache = memoryCache;
        }

        public string GetCacheKey<T>(string endpointName, T request)
        {
            if (request == null)
            {
                return $"attendance:{endpointName}";
            }

            var json = JsonSerializer.Serialize(request);
            using (var sha256 = SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(json));
                var sb = new StringBuilder();
                foreach (var b in hashBytes)
                {
                    sb.Append(b.ToString("x2"));
                }
                return $"attendance:{endpointName}:{sb.ToString()}";
            }
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
                _memoryCache.Set(key, value, TimeSpan.FromMinutes(5));
                _keys.TryAdd(key, 0);
            }
            return value;
        }

        public void InvalidateAll()
        {
            foreach (var key in _keys.Keys)
            {
                _memoryCache.Remove(key);
            }
            _keys.Clear();
        }
    }
}
