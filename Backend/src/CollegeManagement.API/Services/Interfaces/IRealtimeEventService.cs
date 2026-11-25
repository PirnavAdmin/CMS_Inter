using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Realtime;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IRealtimeEventService
    {
        Task PublishDomainEventAsync(DomainEventPayload payload);
        Task PublishDomainChangeAsync(string module, string action, int? campusId = null, string? entityId = null);
    }
}
