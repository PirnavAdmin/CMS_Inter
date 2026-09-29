using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Helpers
{
    public class DateOnlyJsonConverter : JsonConverter<DateOnly>
    {
        private static readonly string[] Formats = 
        { 
            "yyyy-MM-dd", 
            "dd-MM-yyyy", 
            "dd/MM/yyyy", 
            "yyyy/MM/dd",
            "yyyy-MM-ddTHH:mm:ss.fffZ",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ss"
        };

        public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
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

            // Direct check for string starting with yyyy-MM-dd
            if (trimmed.Length >= 10 && DateOnly.TryParseExact(trimmed.Substring(0, 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var directDate))
            {
                return directDate;
            }

            foreach (var format in Formats)
            {
                if (DateOnly.TryParseExact(trimmed, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    return date;
                }
            }

            if (DateOnly.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var generalDate))
            {
                return generalDate;
            }

            if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return DateOnly.FromDateTime(dt);
            }

            throw new JsonException($"Unable to parse \"{value}\" as a date. Supported formats: yyyy-MM-dd, dd-MM-yyyy, ISO-8601 timestamps.");
        }

        public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }
    }

    public class NullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
    {
        private static readonly string[] Formats = 
        { 
            "yyyy-MM-dd", 
            "dd-MM-yyyy", 
            "dd/MM/yyyy", 
            "yyyy/MM/dd",
            "yyyy-MM-ddTHH:mm:ss.fffZ",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ss"
        };

        public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
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

            if (trimmed.Length >= 10 && DateOnly.TryParseExact(trimmed.Substring(0, 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var directDate))
            {
                return directDate;
            }

            foreach (var format in Formats)
            {
                if (DateOnly.TryParseExact(trimmed, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    return date;
                }
            }

            if (DateOnly.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var generalDate))
            {
                return generalDate;
            }

            if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return DateOnly.FromDateTime(dt);
            }

            throw new JsonException($"Unable to parse \"{value}\" as a date. Supported formats: yyyy-MM-dd, dd-MM-yyyy, ISO-8601 timestamps.");
        }

        public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}
