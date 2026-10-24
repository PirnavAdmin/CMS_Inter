using System;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Helpers
{
    public static class AuditCorrelationHelper
    {
        public const string CorrelationIdHeader = "X-Correlation-ID";

        public static string GetOrCreateCorrelationId(HttpContext? context)
        {
            if (context == null) return Guid.NewGuid().ToString("N");

            if (context.Items.TryGetValue(CorrelationIdHeader, out var existing) && existing is string corrId && !string.IsNullOrWhiteSpace(corrId))
            {
                return corrId;
            }

            if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var headerVal) && !string.IsNullOrWhiteSpace(headerVal))
            {
                var id = headerVal.ToString().Trim();
                if (id.Length > 64) id = id[..64];
                context.Items[CorrelationIdHeader] = id;
                return id;
            }

            var newId = Guid.NewGuid().ToString("N");
            context.Items[CorrelationIdHeader] = newId;
            return newId;
        }

        public static string GetRequestId(HttpContext? context)
        {
            if (context == null) return Guid.NewGuid().ToString("N");
            return context.TraceIdentifier ?? Guid.NewGuid().ToString("N");
        }
    }
}
