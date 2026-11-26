using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly AppDbContext _db;

        public NotificationHub(AppDbContext db)
        {
            _db = db;
        }

        public override async Task OnConnectedAsync()
        {
            var user = Context.User;
            var collegeClaim = user?.Claims.FirstOrDefault(c => c.Type == "CollegeId" || c.Type == "college_id" || c.Type == "collegeId")?.Value;
            int collegeId = 0;
            int.TryParse(collegeClaim, out collegeId);

            var roleClaims = user?.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles")
                .Select(c => c.Value)
                .Distinct()
                .ToList();

            bool isSuperAdmin = user?.IsInRole("Super Admin") == true || (roleClaims != null && roleClaims.Any(r => string.Equals(r, "Super Admin", StringComparison.OrdinalIgnoreCase)));

            if (roleClaims != null && roleClaims.Any())
            {
                foreach (var role in roleClaims)
                {
                    if (!string.IsNullOrWhiteSpace(role))
                    {
                        var trimmed = role.Trim();
                        if (collegeId > 0)
                        {
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"College_{collegeId}_Role_{trimmed.ToLowerInvariant()}");
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"College_{collegeId}_Role_{trimmed}");
                        }

                        if (isSuperAdmin)
                        {
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{trimmed.ToLowerInvariant()}");
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{trimmed}");
                        }
                    }
                }
            }

            if (collegeId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"College_{collegeId}");
            }

            var campusClaim = user?.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId")?.Value;
            if (int.TryParse(campusClaim, out int campusId) && campusId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Campus_{campusId}");
            }

            var staffClaim = user?.Claims.FirstOrDefault(c => c.Type == "StaffId" || c.Type == "staff_id" || c.Type == "staffId")?.Value;
            if (!string.IsNullOrEmpty(staffClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Staff_{staffClaim}");
            }

            var userIdClaim = user?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "UserId" || c.Type == "sub" || c.Type == "userId")?.Value;
            if (!string.IsNullOrEmpty(userIdClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userIdClaim}");
            }

            // Only Super Admin joins global AllNotifications group
            if (isSuperAdmin)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "AllNotifications");
            }

            await base.OnConnectedAsync();
        }

        public async Task JoinCampus(int campusId)
        {
            if (campusId <= 0) return;

            var user = Context.User;
            var roleClaims = user?.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles")
                .Select(c => c.Value);
            bool isSuperAdmin = user?.IsInRole("Super Admin") == true || (roleClaims != null && roleClaims.Any(r => string.Equals(r, "Super Admin", StringComparison.OrdinalIgnoreCase)));

            if (!isSuperAdmin)
            {
                var collegeClaim = user?.Claims.FirstOrDefault(c => c.Type == "CollegeId" || c.Type == "college_id" || c.Type == "collegeId")?.Value;
                if (int.TryParse(collegeClaim, out int collegeId) && collegeId > 0)
                {
                    bool belongs = await _db.Campuses.AnyAsync(c => c.CampusId == campusId && c.CollegeId == collegeId && c.IsActive);
                    if (!belongs)
                    {
                        return; // Forbidden campus
                    }
                }
                else
                {
                    return;
                }
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Campus_{campusId}");
        }

        public async Task LeaveCampus(int campusId)
        {
            if (campusId > 0)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Campus_{campusId}");
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
