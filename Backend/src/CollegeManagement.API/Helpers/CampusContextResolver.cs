using System.Linq;
using System.Security.Claims;
using CollegeManagement.API.Exceptions;

namespace CollegeManagement.API.Helpers;

public static class CampusContextResolver
{
    public static int ResolveAndValidateCampusId(ClaimsPrincipal user, int? requestedCampusId)
    {
        var isSuperAdmin = user.IsInRole("Super Admin") || user.IsInRole("SuperAdmin");
        var userCampusClaim = user.Claims.FirstOrDefault(c => 
            c.Type == "CampusId" || 
            c.Type == "campus_id" || 
            c.Type == "campusId" || 
            c.Type == "BranchId" || 
            c.Type == "branch_id")?.Value;

        int userCampusId = int.TryParse(userCampusClaim, out int cid) ? cid : 0;

        if (!isSuperAdmin)
        {
            if (userCampusId <= 0)
            {
                throw new ForbiddenException("User account is not bound to a valid campus tenant.");
            }

            if (requestedCampusId.HasValue && requestedCampusId.Value > 0 && requestedCampusId.Value != userCampusId)
            {
                throw new ForbiddenException($"Cross-campus inspection is forbidden. Caller is bound to campus ID {userCampusId}, but requested campus ID {requestedCampusId.Value}.");
            }

            return userCampusId;
        }

        return requestedCampusId ?? 0;
    }
}
