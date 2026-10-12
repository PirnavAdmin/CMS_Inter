using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public class RoleModuleDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string SubModule { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public List<string> AvailableActions { get; set; } = new();
    }

    public class UpdateRoleModulesRequest
    {
        public List<string> Modules { get; set; } = new();
    }
}
