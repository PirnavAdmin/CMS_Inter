using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Result of campus access resolution and authorization.
/// </summary>
public class CampusResolutionResult
{
    /// <summary>True if the user is authorized to access the resolved campus.</summary>
    public bool IsAuthorized { get; set; }

    /// <summary>Failure message if authorization fails (HTTP 403 Forbidden).</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>The resolved campus ID to use for queries.</summary>
    public int? EffectiveCampusId { get; set; }

    /// <summary>List of campus IDs the user has assignment/permission to access.</summary>
    public IReadOnlyList<int> AuthorizedCampusIds { get; set; } = new List<int>();

    /// <summary>Indicates whether the user has administrative bypass privileges.</summary>
    public bool IsAdmin { get; set; }
}

/// <summary>
/// Service to resolve and enforce campus-level data isolation.
/// Ensures Principals cannot spoof or access other campuses by changing campusId in requests.
/// Preserves full multi-campus selection for Admin/Super Admin roles.
/// </summary>
public interface ICampusAuthorizationService
{
    /// <summary>
    /// Resolves and validates campus access for the authenticated user.
    /// If user is Principal, ensures requestedCampusId belongs to their assigned campuses in Staff / StaffCampusAssignments.
    /// If requestedCampusId is omitted, defaults to their primary assigned campus.
    /// Returns IsAuthorized = false (403 Forbidden) if a Principal attempts cross-campus access or has no assigned campus.
    /// If user is Admin / Super Admin, allows any requested campus or null for all campuses.
    /// </summary>
    Task<CampusResolutionResult> ResolveCampusAccessAsync(
        ClaimsPrincipal? user, 
        int? requestedCampusId, 
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves the system default active campus ID (fallback for Admins when no campus is selected).
    /// </summary>
    Task<int> GetDefaultCampusIdAsync(CancellationToken ct = default);
}
