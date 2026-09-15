using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Users;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Reusable service responsible for centralizing user account creation,
    /// cryptographic temporary password generation, BCrypt hashing, domain-link validation,
    /// and first-login lifecycle state.
    /// </summary>
    public interface IUserProvisioningService
    {
        /// <summary>
        /// Provisions a User account specifically linked to a Student.
        /// </summary>
        Task<UserProvisioningResult> ProvisionStudentUserAsync(
            ProvisionStudentUserRequest request, 
            IDbConnection? connection = null, 
            IDbTransaction? transaction = null);

        /// <summary>
        /// Provisions a User account specifically linked to a Staff member.
        /// </summary>
        Task<UserProvisioningResult> ProvisionStaffUserAsync(
            ProvisionStaffUserRequest request, 
            IDbConnection? connection = null, 
            IDbTransaction? transaction = null);

        /// <summary>
        /// Provisions a User account specifically linked to an Administrator.
        /// </summary>
        Task<UserProvisioningResult> ProvisionAdminUserAsync(
            ProvisionAdminUserRequest request, 
            IDbConnection? connection = null, 
            IDbTransaction? transaction = null);

        /// <summary>
        /// Generic user account provisioning for advanced or custom role-based assignments.
        /// </summary>
        Task<UserProvisioningResult> ProvisionUserAsync(
            ProvisionUserRequest request, 
            IDbConnection? connection = null, 
            IDbTransaction? transaction = null);

        /// <summary>
        /// Generates a cryptographically secure random temporary password.
        /// </summary>
        string GenerateSecureTemporaryPassword(int length = 14);
    }
}
