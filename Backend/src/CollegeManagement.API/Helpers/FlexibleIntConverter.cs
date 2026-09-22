using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SMS.Api.Common
{
    public class FlexibleIntConverter : JsonConverter<int>
    {
        public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetInt32();
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                string? str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str))
                    return 0;

                if (int.TryParse(str, out int parsed))
                    return parsed;

                var digits = new string(str.Where(char.IsDigit).ToArray());
                if (!string.IsNullOrEmpty(digits) && int.TryParse(digits, out int extracted))
                    return extracted;
            }

            return 0;
        }

        public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }
}
