using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CollegeManagement.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var user = Context.User;
            var roleClaims = user?.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles")
                .Select(c => c.Value)
                .Distinct()
                .ToList();

            if (roleClaims != null && roleClaims.Any())
            {
                foreach (var role in roleClaims)
                {
                    if (!string.IsNullOrWhiteSpace(role))
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{role.Trim().ToLowerInvariant()}");
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{role.Trim()}");
                    }
                }
            }

            var campusClaim = user?.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId")?.Value;
            if (!string.IsNullOrEmpty(campusClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Campus_{campusClaim}");
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

            await Groups.AddToGroupAsync(Context.ConnectionId, "AllNotifications");
            await base.OnConnectedAsync();
        }

        public async Task JoinCampus(int campusId)
        {
            if (campusId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Campus_{campusId}");
            }
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
