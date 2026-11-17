using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Filters;
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

        // 1. Unrestricted Multi-Campus Access ONLY for Platform Super Admins
        var roleName = _jwtTokenHelper.GetRole(user);
        bool isSuperAdmin = user.IsInRole("Super Admin")
                    || string.Equals(roleName, "Super Admin", StringComparison.OrdinalIgnoreCase);

        if (isSuperAdmin)
        {
            return new CampusResolutionResult
            {
                IsAuthorized = true,
                IsAdmin = true,
                EffectiveCampusId = requestedCampusId
            };
        }

        // 1B. Tenant-Scoped College Admin — restricted strictly to campuses of their own CollegeId
        bool isCollegeAdmin = user.IsInRole("Admin")
                    || string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase);

        if (isCollegeAdmin)
        {
            int? collegeId = _jwtTokenHelper.GetCollegeId(user);
            if (collegeId.HasValue && collegeId.Value > 0)
            {
                var adminConn = _db.Database.GetDbConnection();
                if (adminConn.State != System.Data.ConnectionState.Open)
                {
                    await adminConn.OpenAsync(ct);
                }

                var collegeCampuses = (await Dapper.SqlMapper.QueryAsync<int>(
                    adminConn,
                    "SELECT CampusId FROM Campuses WHERE CollegeId = @CollegeId AND IsActive = 1 ORDER BY IsHQ DESC, CampusId ASC;",
                    new { CollegeId = collegeId.Value })).ToList();

                if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
                {
                    if (requestedCampusId.Value == TenantIsolationActionFilter.NoCampusSentinel)
                    {
                        return new CampusResolutionResult
                        {
                            IsAuthorized = true,
                            IsAdmin = true,
                            EffectiveCampusId = TenantIsolationActionFilter.NoCampusSentinel,
                            AuthorizedCampusIds = collegeCampuses
                        };
                    }

                    int ownsCampus = await Dapper.SqlMapper.ExecuteScalarAsync<int>(
                        adminConn,
                        "SELECT COUNT(*) FROM Campuses WHERE CampusId = @CampusId AND CollegeId = @CollegeId;",
                        new { CampusId = requestedCampusId.Value, CollegeId = collegeId.Value });

                    if (ownsCampus == 0)
                    {
                        _logger.LogWarning(
                            "Tenant isolation block: College Admin (CollegeId {CollegeId}) attempted to access CampusId {CampusId}.",
                            collegeId.Value, requestedCampusId.Value);
                        return new CampusResolutionResult
                        {
                            IsAuthorized = false,
                            ErrorMessage = "Access denied: You do not have authorization to view data for this campus."
                        };
                    }

                    return new CampusResolutionResult
                    {
                        IsAuthorized = true,
                        IsAdmin = true,
                        EffectiveCampusId = requestedCampusId.Value,
                        AuthorizedCampusIds = collegeCampuses
                    };
                }

                return new CampusResolutionResult
                {
                    IsAuthorized = true,
                    IsAdmin = true,
                    EffectiveCampusId = collegeCampuses.FirstOrDefault() > 0 ? collegeCampuses.First() : TenantIsolationActionFilter.NoCampusSentinel,
                    AuthorizedCampusIds = collegeCampuses
                };
            }

            // Legacy single-tenant admin with no CollegeId
            return new CampusResolutionResult
            {
                IsAuthorized = true,
                IsAdmin = true,
                EffectiveCampusId = requestedCampusId
            };
        }

        // 2. Principal Role - Resolve and Enforce Assigned Campus via Dapper & Stored Procedure
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

        // Execute unified Stored Procedure via Dapper
        var conn = _db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(ct);
        }

        using var multi = await Dapper.SqlMapper.QueryMultipleAsync(
            conn,
            "sp_Staff_GetAssignedCampuses",
            new { p_UserId = userId.Value, p_StaffId = staffId ?? 0 },
            commandType: System.Data.CommandType.StoredProcedure);

        var meta = await multi.ReadFirstOrDefaultAsync<dynamic>();
        var assignedList = (await multi.ReadAsync<int>()).ToList();

        int resolvedStaffId = (int)(meta?.StaffId ?? 0);
        int primaryCampusId = (int)(meta?.PrimaryCampusId ?? 0);

        var authorizedCampuses = new HashSet<int>(assignedList.Where(id => id > 0));
        if (primaryCampusId > 0)
        {
            authorizedCampuses.Add(primaryCampusId);
        }

        if (authorizedCampuses.Count == 0)
        {
            _logger.LogWarning("Access Denied: Staff {StaffId} (User {UserId}) has no campus assigned in the database.", resolvedStaffId, userId);
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
        int defaultCampusId = (primaryCampusId > 0)
            ? primaryCampusId
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
        var conn = _db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(ct);
        }

        var campusId = await Dapper.SqlMapper.QueryFirstOrDefaultAsync<int>(
            conn,
            "SELECT CampusId FROM Campuses WHERE IsActive = 1 ORDER BY CampusId LIMIT 1;");

        return campusId > 0 ? campusId : 1;
    }
}
