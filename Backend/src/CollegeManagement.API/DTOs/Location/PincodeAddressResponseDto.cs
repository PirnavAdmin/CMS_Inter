namespace CollegeManagement.API.DTOs.Location;

public class PincodeAddressResponseDto
{
    public bool Found { get; set; }
    public string Pincode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
    public string State { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public List<string> Areas { get; set; } = new();
}
