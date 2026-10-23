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
            var roleClaim = user?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role")?.Value;
            var campusClaim = user?.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId")?.Value;

            if (!string.IsNullOrEmpty(roleClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{roleClaim.ToLowerInvariant()}");
            }

            if (!string.IsNullOrEmpty(campusClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Campus_{campusClaim}");
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
