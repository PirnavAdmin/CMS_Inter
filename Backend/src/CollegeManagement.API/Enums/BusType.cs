using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Bus air conditioning classification.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum BusType : byte
    {
        [EnumMember(Value = "AC")]
        AC = 1,

        [EnumMember(Value = "Non-AC")]
        NonAC = 2
    }
}
