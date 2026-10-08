using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Linq;

namespace CollegeManagement.API.Hubs
{
    [Authorize(Roles = "Driver,Bus Driver")]
    public class DriverNotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var staffIdClaim = Context.User?.Claims.FirstOrDefault(c => c.Type == "StaffId")?.Value;
            if (!string.IsNullOrEmpty(staffIdClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Staff_{staffIdClaim}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            var staffIdClaim = Context.User?.Claims.FirstOrDefault(c => c.Type == "StaffId")?.Value;
            if (!string.IsNullOrEmpty(staffIdClaim))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Staff_{staffIdClaim}");
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}
