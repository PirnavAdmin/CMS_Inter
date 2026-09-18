using System.Text.Json;
using System.Text.Json.Serialization;

namespace SMS.Api.Common
{
    public class FlexibleBoolConverter : JsonConverter<bool>
    {
        public override bool Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.True) return true;
            if (reader.TokenType == JsonTokenType.False) return false;
            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString();
                return string.Equals(str, "Active", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(str, "true", StringComparison.OrdinalIgnoreCase) ||
                       str == "1";
            }
            if (reader.TokenType == JsonTokenType.Number)
            {
                return reader.GetInt32() != 0;
            }
            return false;
        }

        public override void Write(Utf8JsonWriter writer, bool value, JsonSerializerOptions options)
        {
            writer.WriteBooleanValue(value);
        }
    }
}
