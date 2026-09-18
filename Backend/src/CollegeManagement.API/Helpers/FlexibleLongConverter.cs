using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SMS.Api.Common
{
    public class FlexibleLongConverter : JsonConverter<long>
    {
        public override long Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetInt64();
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                string? str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str))
                    return 0;

                if (long.TryParse(str, out long parsed))
                    return parsed;

                var digits = new string(str.Where(char.IsDigit).ToArray());
                if (!string.IsNullOrEmpty(digits) && long.TryParse(digits, out long extracted))
                    return extracted;
            }

            return 0;
        }

        public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }
}
