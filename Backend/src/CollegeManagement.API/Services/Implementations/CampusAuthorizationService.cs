using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Enforces server-side campus scoping and isolation for Principals and dashboard consumers.
/// </summary>
public class CampusAuthorizationService : ICampusAuthorizationService
{
    private readonly AppDbContext _db;
    private readonly IJwtTokenHelper _jwtTokenHelper;
    private readonly ILogger<CampusAuthorizationService> _logger;

    public CampusAuthorizationService(
        AppDbContext db,
        IJwtTokenHelper jwtTokenHelper,
        ILogger<CampusAuthorizationService> logger)
    {
        _db = db;
        _jwtTokenHelper = jwtTokenHelper;
        _logger = logger;
    }

    public async Task<CampusResolutionResult> ResolveCampusAccessAsync(
        ClaimsPrincipal? user, 
        int? requestedCampusId, 
        CancellationToken ct = default)
    {
        if (user?.Identity?.IsAuthenticated != true)
        {
            return new CampusResolutionResult
            {
                IsAuthorized = false,
                ErrorMessage = "Authentication required to access dashboard resources."
            };
        }

        // 1. Unrestricted Multi-Campus Access for Platform Admins
        bool isAdmin = user.IsInRole("Super Admin") 
                    || user.IsInRole("Admin") 
                    || string.Equals(_jwtTokenHelper.GetRole(user), "Super Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(_jwtTokenHelper.GetRole(user), "Admin", StringComparison.OrdinalIgnoreCase);

        if (isAdmin)
        {
            return new CampusResolutionResult
            {
                IsAuthorized = true,
                IsAdmin = true,
                EffectiveCampusId = requestedCampusId
            };
        }

        // 2. Principal Role - Resolve and Enforce Assigned Campus
        bool isPrincipal = user.IsInRole("Principal")
                        || string.Equals(_jwtTokenHelper.GetRole(user), "Principal", StringComparison.OrdinalIgnoreCase);

        int? userId = _jwtTokenHelper.GetUserId(user);
        if (!userId.HasValue || userId.Value <= 0)
        {
            return new CampusResolutionResult
            {
                IsAuthorized = false,
                ErrorMessage = "User session does not contain a valid user identifier."
            };
        }

        int? staffId = _jwtTokenHelper.GetStaffId(user);
        if (!staffId.HasValue || staffId.Value <= 0)
        {
            staffId = await _db.Users.AsNoTracking()
                .Where(u => u.UserId == userId.Value)
                .Select(u => u.StaffId)
                .FirstOrDefaultAsync(ct);
        }

        if (!staffId.HasValue || staffId.Value <= 0)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                staffId = await _db.Staffs.AsNoTracking()
                    .Where(s => s.Email == email && !s.IsDeleted)
                    .Select(s => (int?)s.Id)
                    .FirstOrDefaultAsync(ct);
            }
        }

        if (!staffId.HasValue || staffId.Value <= 0)
        {
            _logger.LogWarning("Access Denied: User {UserId} in role Principal has no associated Staff record.", userId);
            return new CampusResolutionResult
            {
                IsAuthorized = false,
                ErrorMessage = "User has no associated staff profile or campus assignment."
            };
        }

        // Retrieve assigned campuses from Staffs and StaffCampusAssignments
        var primaryCampusId = await _db.Staffs.AsNoTracking()
            .Where(s => s.Id == staffId.Value)
            .Select(s => s.CampusId)
            .FirstOrDefaultAsync(ct);

        var assignedCampusIds = await _db.StaffCampusAssignments.AsNoTracking()
            .Where(a => a.StaffId == staffId.Value)
            .Select(a => a.CampusId)
            .ToListAsync(ct);

        var authorizedCampuses = new HashSet<int>(assignedCampusIds.Where(id => id > 0));
        if (primaryCampusId.HasValue && primaryCampusId.Value > 0)
        {
            authorizedCampuses.Add(primaryCampusId.Value);
        }

        if (authorizedCampuses.Count == 0)
        {
            _logger.LogWarning("Access Denied: Staff {StaffId} (User {UserId}) has no campus assigned in the database.", staffId, userId);
            return new CampusResolutionResult
            {
                IsAuthorized = false,
                ErrorMessage = "Principal is not assigned to any campus."
            };
        }

        var authorizedList = authorizedCampuses.ToList();

        // Check if client explicitly requested a specific campus
        if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
        {
            if (authorizedCampuses.Contains(requestedCampusId.Value))
            {
                return new CampusResolutionResult
                {
                    IsAuthorized = true,
                    EffectiveCampusId = requestedCampusId.Value,
                    AuthorizedCampusIds = authorizedList
                };
            }

            _logger.LogWarning("Cross-Campus Access Denied: User {UserId} requested Campus {RequestedCampusId}, but is only authorized for [{AuthorizedCampuses}].",
                userId, requestedCampusId.Value, string.Join(", ", authorizedList));

            return new CampusResolutionResult
            {
                IsAuthorized = false,
                ErrorMessage = $"Access denied. You do not have permission to view data for campus ID {requestedCampusId.Value}.",
                AuthorizedCampusIds = authorizedList
            };
        }

        // When not specified, default to primary campus or first assigned campus
        int defaultCampusId = (primaryCampusId.HasValue && primaryCampusId.Value > 0)
            ? primaryCampusId.Value
            : authorizedList[0];

        return new CampusResolutionResult
        {
            IsAuthorized = true,
            EffectiveCampusId = defaultCampusId,
            AuthorizedCampusIds = authorizedList
        };
    }

    public async Task<int> GetDefaultCampusIdAsync(CancellationToken ct = default)
    {
        var campusId = await _db.Campuses.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.CampusId)
            .Select(c => c.CampusId)
            .FirstOrDefaultAsync(ct);

        return campusId > 0 ? campusId : 1;
    }
}
