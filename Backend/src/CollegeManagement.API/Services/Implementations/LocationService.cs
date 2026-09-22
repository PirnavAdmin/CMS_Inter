using System.Text.Json;
using CollegeManagement.API.DTOs.Location;

namespace CollegeManagement.API.Services.Location;

public sealed class LocationService : ILocationService
{
    private readonly HttpClient _httpClient;

    public LocationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PincodeAddressResponseDto> GetByPincodeAsync(string pincode, CancellationToken cancellationToken = default)
    {
        var value = (pincode ?? string.Empty).Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(value, "^[1-9][0-9]{5}$"))
            throw new ArgumentException("Pincode must be exactly 6 digits and cannot start with 0.");

        using var response = await _httpClient.GetAsync($"pincode/{value}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException("Unable to fetch address details for the supplied pincode.");

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var records = await JsonSerializer.DeserializeAsync<List<PostOfficeResponse>>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, cancellationToken);

        var first = records?.FirstOrDefault();
        if (first == null || !string.Equals(first.Status, "Success", StringComparison.OrdinalIgnoreCase) || first.PostOffice == null || first.PostOffice.Count == 0)
            return new PincodeAddressResponseDto { Found = false, Pincode = value };

        var offices = first.PostOffice;
        var representative = offices[0];
        return new PincodeAddressResponseDto
        {
            Found = true,
            Pincode = value,
            Country = representative.Country ?? "India",
            State = representative.State ?? string.Empty,
            District = representative.District ?? string.Empty,
            City = representative.Division ?? representative.Block ?? representative.District ?? string.Empty,
            Areas = offices.Select(x => x.Name ?? string.Empty).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToList()
        };
    }

    private sealed class PostOfficeResponse
    {
        public string? Message { get; set; }
        public string? Status { get; set; }
        public List<PostOffice>? PostOffice { get; set; }
    }

    private sealed class PostOffice
    {
        public string? Name { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Division { get; set; }
        public string? Block { get; set; }
    }
}
