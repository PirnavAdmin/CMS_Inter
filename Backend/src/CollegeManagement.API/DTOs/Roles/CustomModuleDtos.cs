using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public class CreateCustomModuleRequest
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Route { get; set; }
        public string? Section { get; set; } = "Custom";
        public string? Icon { get; set; }
        public List<string>? AvailableActions { get; set; }
        public List<CreateCustomScreenRequest>? Screens { get; set; }
    }

    public class CreateCustomScreenRequest
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Route { get; set; }
        public List<string>? AvailableActions { get; set; }
    }

    public class ModuleMetadataDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string Section { get; set; } = "Custom";
        public string? Description { get; set; }
        public string? Icon { get; set; }
        public bool IsSystem { get; set; } = false;
        public List<string> AvailableActions { get; set; } = new();
        public List<ScreenMetadataDto> Screens { get; set; } = new();
    }

    public class ScreenMetadataDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Route { get; set; }
        public bool IsSystem { get; set; } = false;
        public List<string> AvailableActions { get; set; } = new();
    }
}
