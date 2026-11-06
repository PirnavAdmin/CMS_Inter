using System.Security.Claims;
using CollegeManagement.API.Exceptions;

namespace CollegeManagement.API.Helpers;

public static class CampusContextResolver
{
    public static int ResolveAndValidateCampusId(ClaimsPrincipal user, int? requestedCampusId)
    {
        var isPrivilegedAdmin = user.IsInRole("Super Admin") || 
                                user.IsInRole("SuperAdmin") || 
                                user.IsInRole("Admin") || 
                                user.IsInRole("Administrator") || 
                                user.IsInRole("Principal") ||
                                user.HasClaim(c => (c.Type == ClaimTypes.Role || c.Type == "role") && 
                                    (c.Value == "Super Admin" || c.Value == "SuperAdmin" || c.Value == "Admin" || c.Value == "Administrator" || c.Value == "Principal"));

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
