using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Custom JsonConverter for TimeOnly to support standard and flexible time strings
    /// such as "HH:mm:ss", "HH:mm", "h:mm tt", "hh:mm tt", etc.
    /// </summary>
    public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
    {
        private static readonly string[] Formats = 
        {
            "HH:mm:ss",
            "HH:mm",
            "H:mm:ss",
            "H:mm",
            "h:mm:ss tt",
            "h:mm tt",
            "hh:mm:ss tt",
            "hh:mm tt",
            "HH:mm:ss.FFFFFFF",
            "HH:mm:ss.FFF"
        };

        public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return default;
            }

            var value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return default;
            }

            var trimmed = value.Trim();

            // Try exact matching against known formats
            foreach (var fmt in Formats)
            {
                if (TimeOnly.TryParseExact(trimmed, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedExact))
                {
                    return parsedExact;
                }
            }

            // Try general TimeOnly parsing
            if (TimeOnly.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return parsed;
            }

            // Fallback: try TimeSpan parsing
            if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out var ts))
            {
                return TimeOnly.FromTimeSpan(ts);
            }

            // Fallback: try DateTime parsing (e.g. if an ISO string is sent)
            if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return TimeOnly.FromDateTime(dt);
            }

            throw new JsonException($"Unable to parse \"{value}\" as a valid time. Expected format: HH:mm or HH:mm:ss.");
        }

        public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("HH:mm:ss", CultureInfo.InvariantCulture));
        }
    }

    /// <summary>
    /// Custom JsonConverter for nullable TimeOnly.
    /// </summary>
    public class NullableTimeOnlyJsonConverter : JsonConverter<TimeOnly?>
    {
        private static readonly string[] Formats = 
        {
            "HH:mm:ss",
            "HH:mm",
            "H:mm:ss",
            "H:mm",
            "h:mm:ss tt",
            "h:mm tt",
            "hh:mm:ss tt",
            "hh:mm tt",
            "HH:mm:ss.FFFFFFF",
            "HH:mm:ss.FFF"
        };

        public override TimeOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            var value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();

            foreach (var fmt in Formats)
            {
                if (TimeOnly.TryParseExact(trimmed, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedExact))
                {
                    return parsedExact;
                }
            }

            if (TimeOnly.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return parsed;
            }

            if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out var ts))
            {
                return TimeOnly.FromTimeSpan(ts);
            }

            if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return TimeOnly.FromDateTime(dt);
            }

            throw new JsonException($"Unable to parse \"{value}\" as a valid time. Expected format: HH:mm or HH:mm:ss.");
        }

        public override void Write(Utf8JsonWriter writer, TimeOnly? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteStringValue(value.Value.ToString("HH:mm:ss", CultureInfo.InvariantCulture));
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}
