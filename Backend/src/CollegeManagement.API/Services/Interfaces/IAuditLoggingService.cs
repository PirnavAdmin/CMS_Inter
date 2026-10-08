using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAuditLoggingService
    {
        Task LogAsync(string action, string module, string target, string severity = "Info", string status = "Success", string? details = null);
    }
}
