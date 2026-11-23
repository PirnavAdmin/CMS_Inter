using System;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Realtime;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class RealtimeEventService : IRealtimeEventService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<RealtimeEventService> _logger;

        public RealtimeEventService(
            IHubContext<NotificationHub> hubContext,
            ILogger<RealtimeEventService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task PublishDomainEventAsync(DomainEventPayload payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.Module))
            {
                return;
            }

            try
            {
                if (payload.CampusId.HasValue && payload.CampusId.Value > 0)
                {
                    await _hubContext.Clients.Group($"Campus_{payload.CampusId.Value}")
                        .SendAsync("DomainDataChanged", payload);
                }
                if (payload.CollegeId.HasValue && payload.CollegeId.Value > 0)
                {
                    await _hubContext.Clients.Group($"College_{payload.CollegeId.Value}")
                        .SendAsync("DomainDataChanged", payload);
                }
                await _hubContext.Clients.Group("Role_superadmin")
                    .SendAsync("DomainDataChanged", payload);
                await _hubContext.Clients.Group("Role_super admin")
                    .SendAsync("DomainDataChanged", payload);
                await _hubContext.Clients.Group("AllNotifications")
                    .SendAsync("DomainDataChanged", payload);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast real-time domain event for module '{Module}'", payload.Module);
            }
        }

        public Task PublishDomainChangeAsync(string module, string action, int? campusId = null, string? entityId = null)
        {
            return PublishDomainEventAsync(new DomainEventPayload
            {
                Module = module,
                Action = action,
                CampusId = campusId,
                EntityId = entityId
            });
        }
    }
}
