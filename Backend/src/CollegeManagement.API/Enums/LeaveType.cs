using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the type of leave being requested.
    /// </summary>
    [JsonConverter(typeof(LeaveTypeJsonConverter))]
    public enum LeaveType : byte
    {
        /// <summary>
        /// Casual leave for personal reasons.
        /// </summary>
        Casual = 1,

        /// <summary>
        /// Sick leave due to health reasons.
        /// </summary>
        Sick = 2,

        /// <summary>
        /// Medical leave (alias for Sick leave).
        /// </summary>
        Medical = 2,

        /// <summary>
        /// Earned leave (accumulated privilege leave).
        /// </summary>
        Earned = 3,

        /// <summary>
        /// Maternity leave.
        /// </summary>
        Maternity = 4,

        /// <summary>
        /// Other types of leave not covered above.
        /// </summary>
        Other = 5
    }

    /// <summary>
    /// Tolerant JSON converter for LeaveType enum that handles case-insensitivity,
    /// common aliases (medical, sick, casual, earned, maternity, etc.), numbers,
    /// and gracefully defaults to LeaveType.Other without throwing 400 Bad Request.
    /// </summary>
    public class LeaveTypeJsonConverter : JsonConverter<LeaveType>
    {
        public override LeaveType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetByte(out byte byteVal) && Enum.IsDefined(typeof(LeaveType), byteVal))
                {
                    return (LeaveType)byteVal;
                }
                if (reader.TryGetInt32(out int intVal) && Enum.IsDefined(typeof(LeaveType), (byte)intVal))
                {
                    return (LeaveType)(byte)intVal;
                }
                return LeaveType.Other;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var stringValue = reader.GetString()?.Trim();
                if (string.IsNullOrWhiteSpace(stringValue))
                {
                    return LeaveType.Other;
                }

                // If numeric string e.g. "1", "2"
                if (byte.TryParse(stringValue, out byte parsedByte) && Enum.IsDefined(typeof(LeaveType), parsedByte))
                {
                    return (LeaveType)parsedByte;
                }

                var normalized = stringValue.ToLowerInvariant().Replace(" ", "").Replace("_", "").Replace("-", "");

                // Casual
                if (normalized == "casual" || normalized == "casualleave" || normalized == "cl")
                    return LeaveType.Casual;

                // Sick / Medical
                if (normalized == "sick" || normalized == "sickleave" || normalized == "sl" ||
                    normalized == "medical" || normalized == "medicalleave" || normalized == "med" ||
                    normalized == "health" || normalized == "doctor")
                    return LeaveType.Sick;

                // Earned
                if (normalized == "earned" || normalized == "earnedleave" || normalized == "el" ||
                    normalized == "privilege" || normalized == "privilegeleave" || normalized == "pl" ||
                    normalized == "annual" || normalized == "vacation")
                    return LeaveType.Earned;

                // Maternity / Paternity
                if (normalized == "maternity" || normalized == "maternityleave" || normalized == "ml" ||
                    normalized == "paternity" || normalized == "parental")
                    return LeaveType.Maternity;

                // Standard Enum.TryParse fallback
                if (Enum.TryParse<LeaveType>(stringValue, ignoreCase: true, out var parsedEnum))
                {
                    return parsedEnum;
                }

                return LeaveType.Other;
            }

            return LeaveType.Other;
        }

        public override void Write(Utf8JsonWriter writer, LeaveType value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString());
        }
    }
}
