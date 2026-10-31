using System;
using System.Linq;
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
            c.Type == "campusId" || 
            c.Type == "BranchId" || 
            c.Type == "branch_id")?.Value;

        int userCampusId = int.TryParse(userCampusClaim, out int cid) ? cid : 0;

        if (!isPrivilegedAdmin)
        {
            if (userCampusId <= 0)
            {
                if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
                {
                    return requestedCampusId.Value;
                }
                return 1;
            }

            if (requestedCampusId.HasValue && requestedCampusId.Value > 0 && requestedCampusId.Value != userCampusId)
            {
                throw new ForbiddenException($"Cross-campus inspection is forbidden. Caller is bound to campus ID {userCampusId}, but requested campus ID {requestedCampusId.Value}.");
            }

            return userCampusId;
        }

        if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
        {
            return requestedCampusId.Value;
        }

        return userCampusId > 0 ? userCampusId : 0;
    }
}
