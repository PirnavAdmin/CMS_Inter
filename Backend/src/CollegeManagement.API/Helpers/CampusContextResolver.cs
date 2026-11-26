using System.Security.Claims;
using CollegeManagement.API.Exceptions;

namespace CollegeManagement.API.Helpers;

public static class CampusContextResolver
{
    public static int? ResolveCollegeId(ClaimsPrincipal? user, Microsoft.AspNetCore.Http.HttpRequest? request = null)
    {
        if (request != null && request.Headers.TryGetValue("X-College-Id", out var xCol) &&
            int.TryParse(xCol.FirstOrDefault(), out int headerColId) && headerColId > 0)
        {
            return headerColId;
        }

        if (user != null)
        {
            var claim = user.FindFirst("CollegeId")?.Value
                     ?? user.FindFirst("collegeId")?.Value
                     ?? user.FindFirst("college_id")?.Value;
            if (int.TryParse(claim, out int colId) && colId > 0)
            {
                return colId;
            }
        }

        return null;
    }

    public static int? ResolveCampusId(ClaimsPrincipal? user, Microsoft.AspNetCore.Http.HttpRequest? request = null, int? requestedCampusId = null)
    {
        if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
        {
            return requestedCampusId.Value;
        }

        if (request != null && request.Headers.TryGetValue("X-Campus-Id", out var hVal) &&
            int.TryParse(hVal.FirstOrDefault(), out int hId) && hId > 0)
        {
            return hId;
        }

        if (user != null)
        {
            var claim = user.Claims.FirstOrDefault(c =>
                c.Type == "CampusId" ||
                c.Type == "campus_id" ||
                c.Type == "campusId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0)
            {
                return cid;
            }
        }

        return null;
    }

    public static int ResolveAndValidateCampusId(ClaimsPrincipal user, int? requestedCampusId)
    {
        var isPrivilegedAdmin = user.IsInRole("Super Admin") ||
                                user.IsInRole("SuperAdmin") ||
                                user.IsInRole("Admin") ||
                                user.IsInRole("Administrator") ||
                                user.HasClaim(c => (c.Type == ClaimTypes.Role || c.Type == "role") &&
                                    (c.Value == "Super Admin" || c.Value == "SuperAdmin" || c.Value == "Admin" || c.Value == "Administrator"));

        var userCampusClaim = user.Claims.FirstOrDefault(c =>
            c.Type == "CampusId" ||
            c.Type == "campus_id" ||
            c.Type == "campusId")?.Value;

        int userCampusId = int.TryParse(userCampusClaim, out int cid) ? cid : 0;

        if (!isPrivilegedAdmin)
        {
            // Gather all authorized campus IDs for this user
            var authorizedCampuses = user.Claims
                .Where(c => c.Type == "AssignedCampusId" || c.Type == "AssignedCampusIds" || c.Type == "assigned_campus_id")
                .Select(c => int.TryParse(c.Value, out int id) ? id : 0)
                .Where(id => id > 0)
                .ToHashSet();

            if (userCampusId > 0)
            {
                authorizedCampuses.Add(userCampusId);
            }

            if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
            {
                if (authorizedCampuses.Count > 0 && !authorizedCampuses.Contains(requestedCampusId.Value))
                {
                    throw new ForbiddenException($"Cross-campus access is forbidden. Caller is not authorized for requested campus ID {requestedCampusId.Value}.");
                }
                return requestedCampusId.Value;
            }

            return userCampusId > 0 ? userCampusId : 1;
        }

        return (requestedCampusId.HasValue && requestedCampusId.Value > 0) ? requestedCampusId.Value : (userCampusId > 0 ? userCampusId : 1);
    }
}
