using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Custom JsonConverter for TimeSpan to handle standard and shortened time strings like "HH:mm" and "HH:mm:ss".
    /// </summary>
    public class TimeSpanJsonConverter : JsonConverter<TimeSpan>
    {
        private static readonly string[] Formats = { @"hh\:mm\:ss", @"hh\:mm", @"h\:mm", @"h\:mm\:ss", "c", "g", "G" };

        public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
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

            if (TimeSpan.TryParseExact(value.Trim(), Formats, CultureInfo.InvariantCulture, TimeSpanStyles.None, out var timeSpanExact))
            {
                return timeSpanExact;
            }

            if (TimeSpan.TryParse(value.Trim(), CultureInfo.InvariantCulture, out var timeSpan))
            {
                return timeSpan;
            }

            throw new JsonException($"Unable to parse \"{value}\" as a valid time. Expected format: HH:mm or HH:mm:ss.");
        }

        public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString(@"hh\:mm\:ss", CultureInfo.InvariantCulture));
        }
    }

    /// <summary>
    /// Custom JsonConverter for nullable TimeSpan to handle nulls, empty strings, and shortened time strings.
    /// </summary>
    public class NullableTimeSpanJsonConverter : JsonConverter<TimeSpan?>
    {
        private static readonly string[] Formats = { @"hh\:mm\:ss", @"hh\:mm", @"h\:mm", @"h\:mm\:ss", "c", "g", "G" };

        public override TimeSpan? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
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

            if (TimeSpan.TryParseExact(value.Trim(), Formats, CultureInfo.InvariantCulture, TimeSpanStyles.None, out var timeSpanExact))
            {
                return timeSpanExact;
            }

            if (TimeSpan.TryParse(value.Trim(), CultureInfo.InvariantCulture, out var timeSpan))
            {
                return timeSpan;
            }

            throw new JsonException($"Unable to parse \"{value}\" as a valid time. Expected format: HH:mm or HH:mm:ss.");
        }

        public override void Write(Utf8JsonWriter writer, TimeSpan? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteStringValue(value.Value.ToString(@"hh\:mm\:ss", CultureInfo.InvariantCulture));
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}
