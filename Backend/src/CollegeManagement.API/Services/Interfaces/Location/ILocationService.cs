using CollegeManagement.API.DTOs.Location;

namespace CollegeManagement.API.Services.Location;

public interface ILocationService
{
    Task<PincodeAddressResponseDto> GetByPincodeAsync(string pincode, CancellationToken cancellationToken = default);
}
