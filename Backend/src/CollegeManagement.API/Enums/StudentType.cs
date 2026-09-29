using System.Text.Json.Serialization;

namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Student residential classification.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum StudentType : byte
    {
        NonResidential = 1,
        Residential = 2
    }
}
