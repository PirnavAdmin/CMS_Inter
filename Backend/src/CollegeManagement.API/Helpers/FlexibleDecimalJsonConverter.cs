using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Globalization;

namespace CollegeManagement.API.Helpers
{
    public class FlexibleDecimalJsonConverter : JsonConverter<decimal>
    {
        public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetDecimal();
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str)) return 0.0m;

                var match = Regex.Match(str, @"[-+]?[0-9]*\.?[0-9]+");
                if (match.Success && decimal.TryParse(match.Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var val))
                {
                    return val;
                }
                return 0.0m;
            }

            if (reader.TokenType == JsonTokenType.Null)
            {
                return 0.0m;
            }

            if (reader.TokenType == JsonTokenType.StartArray)
            {
                using var doc = JsonDocument.ParseValue(ref reader);
                var arr = doc.RootElement;
                int count = arr.GetArrayLength();
                return count > 0 ? (decimal)count : 0.0m;
            }

            if (reader.TokenType == JsonTokenType.StartObject)
            {
                using var doc = JsonDocument.ParseValue(ref reader);
                return 0.0m;
            }

            return 0.0m;
        }

        public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }

    public class FlexibleNullableDecimalJsonConverter : JsonConverter<decimal?>
    {
        public override decimal? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetDecimal();
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str)) return null;

                var match = Regex.Match(str, @"[-+]?[0-9]*\.?[0-9]+");
                if (match.Success && decimal.TryParse(match.Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var val))
                {
                    return val;
                }
                return null;
            }

            if (reader.TokenType == JsonTokenType.StartArray || reader.TokenType == JsonTokenType.StartObject)
            {
                using var doc = JsonDocument.ParseValue(ref reader);
                return null;
            }

            return null;
        }

        public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
        {
            if (value.HasValue) writer.WriteNumberValue(value.Value);
            else writer.WriteNullValue();
        }
    }
}

