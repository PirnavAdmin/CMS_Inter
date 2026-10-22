using System.Collections.Concurrent;
using System.IO;
using System.Text.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class RoleManagementService : IRoleManagementService
    {
        private readonly IRoleRepository _roleRepository;
        private readonly IPermissionRepository _permissionRepository;
        private readonly IUserRepository _userRepository;

        public RoleManagementService(
            IRoleRepository roleRepository,
            IPermissionRepository permissionRepository,
            IUserRepository userRepository)
        {
            _roleRepository = roleRepository;
            _permissionRepository = permissionRepository;
            _userRepository = userRepository;
        }

        public async Task<List<RoleResponse>> GetAllRolesAsync()
        {
            var cards = await _permissionRepository.GetRoleCardsAsync();
            if (cards.Count > 0)
            {
                return cards.Select(c => new RoleResponse
                {
                    RoleId = c.RoleId,
                    RoleName = c.RoleName,
                    Description = c.Description,
                    IsSystemRole = c.IsSystemRole,
                    IsActive = c.IsActive,
                    UserCount = c.UserCount,
                    PermissionsCount = c.PermissionsCount,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                }).ToList();
            }

            var roles = await _roleRepository.GetAllAsync();
            return roles.Select(r => new RoleResponse
            {
                RoleId = r.RoleId,
                RoleName = r.RoleName,
                Description = r.Description,
                IsSystemRole = r.IsSystemRole,
                IsActive = r.IsActive,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            }).ToList();
        }

        public async Task<RoleResponse?> GetRoleByIdAsync(int id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return null;

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole,
                IsActive = role.IsActive,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            };
        }

        public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request)
        {
            if (await _roleRepository.RoleExistsAsync(request.RoleName))
            {
                throw new InvalidOperationException($"Role '{request.RoleName}' already exists.");
            }

            var role = new Role
            {
                RoleName = request.RoleName,
                Description = request.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _roleRepository.AddAsync(role);

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole,
                IsActive = role.IsActive,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            };
        }

        public async Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return null;

            if (role.RoleName != request.RoleName && await _roleRepository.RoleExistsAsync(request.RoleName))
            {
                throw new InvalidOperationException($"Role '{request.RoleName}' already exists.");
            }

            role.RoleName = request.RoleName;
            if (request.Description != null) role.Description = request.Description;
            if (request.IsActive.HasValue) role.IsActive = request.IsActive.Value;
            role.UpdatedAt = DateTime.UtcNow;

            await _roleRepository.UpdateAsync(role);

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole,
                IsActive = role.IsActive,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            };
        }

        public async Task<bool> DeleteRoleAsync(int id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return false;

            if (role.IsSystemRole)
            {
                throw new InvalidOperationException($"System role '{role.RoleName}' cannot be deleted.");
            }

            await _roleRepository.DeleteAsync(id);
            return true;
        }

        public async Task<List<RoleCardDto>> GetRoleCardsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            return await _permissionRepository.GetRoleCardsAsync(campusId, boardId, academicYearId);
        }

        public async Task<RolePermissionsMatrixResponseDto> GetRolePermissionMatrixAsync(int roleId, int? userId = null)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null)
            {
                throw new KeyNotFoundException($"Role with ID {roleId} was not found.");
            }

            string? targetUserName = null;
            bool isMemberOverrideMode = false;

            if (userId.HasValue && userId.Value > 0)
            {
                var user = await _userRepository.GetByIdAsync(userId.Value);
                if (user != null)
                {
                    targetUserName = user.FullName;
                    isMemberOverrideMode = true;
                }
            }

            var permissions = await _permissionRepository.GetRolePermissionMatrixAsync(roleId, userId);

            return new RolePermissionsMatrixResponseDto
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                TargetUserId = userId,
                TargetUserName = targetUserName,
                IsMemberOverrideMode = isMemberOverrideMode,
                Permissions = permissions
            };
        }

        public async Task<bool> UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsRequest request)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null)
            {
                throw new KeyNotFoundException($"Role with ID {roleId} was not found.");
            }

            var applicableSubModules = await _permissionRepository.GetApplicableSubModulesForRoleAsync(roleId);
            var applicableSet = new HashSet<string>(applicableSubModules, StringComparer.OrdinalIgnoreCase);

            var normalizedModules = request.GetNormalizedModules();

            // Filter to only modules applicable to this role
            var filteredModules = normalizedModules
                .Where(m => applicableSet.Count == 0 || 
                            applicableSet.Contains(m.SubModule) || 
                            applicableSet.Contains(ModulePermissionMatrixDto.NormalizeToKebabCase(m.SubModule)))
                .ToList();

            // Enforce dependencies: Add/Edit/Delete require View
            foreach (var item in filteredModules)
            {
                if (item.CanAdd || item.CanEdit || item.CanDelete)
                {
                    item.CanView = true;
                }
                if (!item.CanView)
                {
                    item.CanAdd = false;
                    item.CanEdit = false;
                    item.CanDelete = false;
                }
            }

            await _permissionRepository.UpdateRolePermissionsAsync(roleId, filteredModules);
            return true;
        }

        public async Task<UserRoleAssignmentsResponseDto> GetUserRoleAssignmentsAsync(GetUserRoleAssignmentsRequestDto request)
        {
            return await _permissionRepository.GetUserRoleAssignmentsAsync(request);
        }

        public async Task<UserRoleDetailsDto?> GetUserRoleDetailsAsync(int userId)
        {
            return await _permissionRepository.GetUserRoleDetailsAsync(userId);
        }

        public async Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId, int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            return await _permissionRepository.GetRoleMembersAsync(roleId, campusId, boardId, academicYearId);
        }

        public async Task<List<ModulePermissionMatrixDto>> GetUserPermissionsAsync(int userId)
        {
            return await _permissionRepository.GetUserPermissionsAsync(userId);
        }

        public async Task<bool> AssignUserRoleAsync(int userId, int? roleId, string? roleCode = null)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"User with ID {userId} was not found.");
            }

            int resolvedRoleId = roleId ?? 0;
            if (resolvedRoleId <= 0 && !string.IsNullOrWhiteSpace(roleCode))
            {
                var normalizedCode = roleCode.Trim().ToUpperInvariant();
                var allRoles = await _roleRepository.GetAllAsync();
                var matched = allRoles.FirstOrDefault(r =>
                    r.RoleName.ToUpperInvariant().Replace(" ", "_").Replace("/", "_").Replace("-", "_") == normalizedCode ||
                    r.RoleName.Equals(roleCode, StringComparison.OrdinalIgnoreCase));

                if (matched != null)
                {
                    resolvedRoleId = matched.RoleId;
                }
            }

            if (resolvedRoleId <= 0)
            {
                throw new KeyNotFoundException($"Valid Role or RoleCode must be provided to assign role.");
            }

            var role = await _roleRepository.GetByIdAsync(resolvedRoleId);
            if (role == null)
            {
                throw new KeyNotFoundException($"Role with ID {resolvedRoleId} was not found.");
            }

            return await _permissionRepository.AssignUserRoleAsync(userId, resolvedRoleId);
        }

        public async Task<bool> RemoveUserRoleAsync(int userId, string? roleCode = null)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"User with ID {userId} was not found.");
            }

            return await _permissionRepository.RemoveUserRoleAsync(userId);
        }

        public async Task<bool> SaveUserPermissionOverridesAsync(int userId, SaveUserPermissionOverridesRequest request, int? adminUserId = null)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"User with ID {userId} was not found.");
            }

            var normalizedOverrides = request.GetNormalizedOverrides();
            await _permissionRepository.SaveUserPermissionOverridesAsync(userId, normalizedOverrides, adminUserId, request.Notes);
            return true;
        }

        public async Task<bool> ResetUserPermissionOverridesAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"User with ID {userId} was not found.");
            }

            return await _permissionRepository.ResetUserPermissionOverridesAsync(userId);
        }

        public List<object> GetModulesMetadata()
        {
            var all = GetAllModulesMetadataAsync().GetAwaiter().GetResult();
            return all.Select(m => (object)new
            {
                id = m.Id,
                name = m.Name,
                route = m.Route,
                section = m.Section,
                icon = m.Icon,
                isSystem = m.IsSystem,
                availableActions = m.AvailableActions,
                screens = m.Screens.Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    route = s.Route,
                    isSystem = s.IsSystem,
                    availableActions = s.AvailableActions
                }).ToArray()
            }).ToList();
        }

        public async Task<List<RoleModuleDto>> GetModulesForRoleAsync(int roleId)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null)
            {
                throw new KeyNotFoundException($"Role with ID {roleId} was not found.");
            }

            return await _permissionRepository.GetRoleModulesAsync(roleId);
        }

        public async Task<bool> SetModulesForRoleAsync(int roleId, UpdateRoleModulesRequest request)
        {
            var role = await _roleRepository.GetByIdAsync(roleId);
            if (role == null)
            {
                throw new KeyNotFoundException($"Role with ID {roleId} was not found.");
            }

            return await _permissionRepository.SetRoleModulesAsync(roleId, request.Modules);
        }

        #region Custom Modules & Screens Registry

        private static readonly ConcurrentDictionary<string, ModuleMetadataDto> _customModules = new(StringComparer.OrdinalIgnoreCase);
        private static readonly object _registryFileLock = new();
        private static bool _registryLoaded = false;

        private static string GetRegistryFilePath()
        {
            var dir = Path.Combine(AppContext.BaseDirectory, "App_Data");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            return Path.Combine(dir, "custom_modules_registry.json");
        }

        private static void EnsureRegistryLoaded()
        {
            if (_registryLoaded) return;
            lock (_registryFileLock)
            {
                if (_registryLoaded) return;
                try
                {
                    var path = GetRegistryFilePath();
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        var items = JsonSerializer.Deserialize<List<ModuleMetadataDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (items != null)
                        {
                            foreach (var item in items)
                            {
                                if (!string.IsNullOrWhiteSpace(item.Id))
                                {
                                    _customModules[item.Id] = item;
                                    UpdateRolePermissionsRequest.RegisterCustomModule(item.Id, item.Name);
                                }
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback to in-memory catalog
                }
                finally
                {
                    _registryLoaded = true;
                }
            }
        }

        private static void PersistRegistry()
        {
            lock (_registryFileLock)
            {
                try
                {
                    var path = GetRegistryFilePath();
                    var list = _customModules.Values.ToList();
                    var json = JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(path, json);
                }
                catch
                {
                    // Fallback
                }
            }
        }

        public async Task<ModuleMetadataDto> AddCustomModuleAsync(CreateCustomModuleRequest request)
        {
            EnsureRegistryLoaded();

            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ArgumentException("Module name is required.");
            }

            string id = !string.IsNullOrWhiteSpace(request.Id)
                ? request.Id.Trim().ToLowerInvariant().Replace(' ', '-')
                : request.Name.Trim().ToLowerInvariant().Replace(' ', '-');

            var actions = request.AvailableActions != null && request.AvailableActions.Count > 0
                ? request.AvailableActions
                : new List<string> { "view", "create", "edit", "delete" };

            var module = new ModuleMetadataDto
            {
                Id = id,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Route = !string.IsNullOrWhiteSpace(request.Route) ? request.Route.Trim() : $"/dashboard/custom/{id}",
                Section = !string.IsNullOrWhiteSpace(request.Section) ? request.Section.Trim() : "Custom",
                Icon = request.Icon,
                IsSystem = false,
                AvailableActions = actions,
                Screens = new List<ScreenMetadataDto>()
            };

            if (request.Screens != null && request.Screens.Count > 0)
            {
                foreach (var s in request.Screens)
                {
                    if (string.IsNullOrWhiteSpace(s.Name)) continue;
                    string sId = !string.IsNullOrWhiteSpace(s.Id)
                        ? s.Id.Trim().ToLowerInvariant().Replace(' ', '-')
                        : s.Name.Trim().ToLowerInvariant().Replace(' ', '-');

                    module.Screens.Add(new ScreenMetadataDto
                    {
                        Id = sId,
                        Name = s.Name.Trim(),
                        Description = s.Description?.Trim(),
                        Route = !string.IsNullOrWhiteSpace(s.Route) ? s.Route.Trim() : $"{module.Route}/{sId}",
                        IsSystem = false,
                        AvailableActions = s.AvailableActions != null && s.AvailableActions.Count > 0 ? s.AvailableActions : actions
                    });
                }
            }

            _customModules[id] = module;
            UpdateRolePermissionsRequest.RegisterCustomModule(module.Id, module.Name);
            PersistRegistry();

            return await Task.FromResult(module);
        }

        public async Task<ScreenMetadataDto> AddCustomScreenAsync(string moduleId, CreateCustomScreenRequest request)
        {
            EnsureRegistryLoaded();

            if (string.IsNullOrWhiteSpace(moduleId) || request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ArgumentException("Module ID and screen name are required.");
            }

            string cleanModuleId = moduleId.Trim().ToLowerInvariant();
            string sId = !string.IsNullOrWhiteSpace(request.Id)
                ? request.Id.Trim().ToLowerInvariant().Replace(' ', '-')
                : request.Name.Trim().ToLowerInvariant().Replace(' ', '-');

            var screen = new ScreenMetadataDto
            {
                Id = sId,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Route = !string.IsNullOrWhiteSpace(request.Route) ? request.Route.Trim() : $"/dashboard/custom/{cleanModuleId}/{sId}",
                IsSystem = false,
                AvailableActions = request.AvailableActions != null && request.AvailableActions.Count > 0
                    ? request.AvailableActions
                    : new List<string> { "view", "create", "edit", "delete" }
            };

            if (_customModules.TryGetValue(cleanModuleId, out var existingCustom))
            {
                existingCustom.Screens.RemoveAll(s => s.Id.Equals(sId, StringComparison.OrdinalIgnoreCase));
                existingCustom.Screens.Add(screen);
                PersistRegistry();
            }
            else
            {
                var systemMods = GetAllSystemModulesMetadata();
                var sysMod = systemMods.FirstOrDefault(m => m.Id.Equals(cleanModuleId, StringComparison.OrdinalIgnoreCase));
                var customWrapper = new ModuleMetadataDto
                {
                    Id = cleanModuleId,
                    Name = sysMod?.Name ?? cleanModuleId,
                    Route = sysMod?.Route ?? $"/dashboard/{cleanModuleId}",
                    Section = sysMod?.Section ?? "Custom",
                    IsSystem = false,
                    AvailableActions = sysMod?.AvailableActions ?? new List<string> { "view", "create", "edit", "delete" },
                    Screens = new List<ScreenMetadataDto> { screen }
                };
                _customModules[cleanModuleId] = customWrapper;
                PersistRegistry();
            }

            return await Task.FromResult(screen);
        }

        public async Task<bool> DeleteCustomModuleAsync(string moduleId)
        {
            EnsureRegistryLoaded();

            if (string.IsNullOrWhiteSpace(moduleId)) return false;
            string clean = moduleId.Trim().ToLowerInvariant();

            var sysMods = GetAllSystemModulesMetadata();
            if (sysMods.Any(m => m.Id.Equals(clean, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("Built-in system modules cannot be deleted.");
            }

            bool removed = _customModules.TryRemove(clean, out _);
            if (removed)
            {
                PersistRegistry();
            }
            return await Task.FromResult(removed);
        }

        public async Task<bool> DeleteCustomScreenAsync(string moduleId, string screenId)
        {
            EnsureRegistryLoaded();

            if (string.IsNullOrWhiteSpace(moduleId) || string.IsNullOrWhiteSpace(screenId)) return false;
            string cleanMod = moduleId.Trim().ToLowerInvariant();
            string cleanScreen = screenId.Trim().ToLowerInvariant();

            if (_customModules.TryGetValue(cleanMod, out var mod))
            {
                int count = mod.Screens.RemoveAll(s => s.Id.Equals(cleanScreen, StringComparison.OrdinalIgnoreCase));
                if (count > 0)
                {
                    PersistRegistry();
                    return await Task.FromResult(true);
                }
            }

            return await Task.FromResult(false);
        }

        public async Task<List<ModuleMetadataDto>> GetAllModulesMetadataAsync()
        {
            EnsureRegistryLoaded();

            var systemModules = GetAllSystemModulesMetadata();
            var result = new List<ModuleMetadataDto>(systemModules);

            foreach (var custom in _customModules.Values)
            {
                var existing = result.FirstOrDefault(m => m.Id.Equals(custom.Id, StringComparison.OrdinalIgnoreCase));
                if (existing != null)
                {
                    foreach (var s in custom.Screens)
                    {
                        if (!existing.Screens.Any(es => es.Id.Equals(s.Id, StringComparison.OrdinalIgnoreCase)))
                        {
                            existing.Screens.Add(s);
                        }
                    }
                }
                else
                {
                    result.Add(custom);
                }
            }

            return await Task.FromResult(result);
        }

        private List<ModuleMetadataDto> GetAllSystemModulesMetadata()
        {
            var actions = new List<string> { "view", "create", "edit", "delete" };
            return new List<ModuleMetadataDto>
            {
                new ModuleMetadataDto { Id = "dashboard", Name = "Dashboard", Route = "/dashboard", Section = "Overview", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "overview", Name = "Overview & Metrics", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "analytics", Name = "Analytics & BI", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "board-academic-year", Name = "Board & Academic Year", Route = "/dashboard/board-academic-year", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "boards-master", Name = "Boards & Universities", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "academic-years", Name = "Academic Years & Sessions", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "group-management", Name = "Group Management", Route = "/dashboard/courses", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "courses", Name = "Courses & Groups", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "batches", Name = "Batches & Streams", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "subject-management", Name = "Subject Management", Route = "/dashboard/subjects", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "subjects", Name = "Subjects Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "subject-assignment", Name = "Faculty Subject Allocation", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "section-room", Name = "Section & Room", Route = "/dashboard/sections", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "sections", Name = "Sections Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "rooms", Name = "Classrooms & Labs", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "timetable", Name = "Timetable", Route = "/dashboard/timetable", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "view-timetable", Name = "Weekly Timetable View", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "setup-timetable", Name = "Period Slots & Timetable Setup", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "draft-timetable", Name = "Draft Schedules & Revisions", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "generate-timetable", Name = "Auto Schedule Generator", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "faculty-timetable", Name = "Faculty Timetable & Substitutions", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "holiday-management", Name = "Holiday Management", Route = "/dashboard/holidays", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "academic-holidays", Name = "Holidays Calendar", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "inventory-management", Name = "Inventory Management", Route = "/dashboard/inventory-management", Section = "Academic", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "inventory-items", Name = "Items Catalog & Stocks", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "stock-movements", Name = "Stock Movements & Issues", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "purchase-orders", Name = "Vendors & Purchase Orders", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "student-admission", Name = "Student Admission", Route = "/dashboard/admission", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "admission-pipeline", Name = "Admission Inquiries & Forms", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "admission-approval", Name = "Verification & Approval", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "student-management", Name = "Student Management", Route = "/dashboard/students", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "student-directory", Name = "Student Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "student-profile", Name = "Student Profile & Bio", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "student-enrollment", Name = "Enrollment & Documents", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "section-allocation", Name = "Section Allocation", Route = "/dashboard/section-allocation", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "student-allocation", Name = "Allocate Sections", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "allocated-list", Name = "Allocated Students Register", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "roll-numbers", Name = "Roll Numbers", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "attendance", Name = "Attendance", Route = "/dashboard/attendance/student", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "student-attendance", Name = "Daily Attendance Entry", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "attendance-overview", Name = "Student Attendance Overview", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "attendance-reports", Name = "Attendance Reports & Defaulters", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "promotion", Name = "Promotion", Route = "/dashboard/promotion", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "eligible", Name = "Promotion Eligibility", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "single", Name = "Single Student Promotion", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "allocation", Name = "Section Allocation on Promotion", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "history", Name = "Promotion History & Audits", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "report", Name = "Promotion Analytics Report", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "transport", Name = "Transport", Route = "/dashboard/transport", Section = "Student", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "routes", Name = "Bus Routes & Stops", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "vehicles", Name = "Fleet & Vehicles", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "driver-assignment", Name = "Driver & Bus Allocations", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "student-transport", Name = "Student Transport Passes", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "live-tracking", Name = "Live GPS Tracking", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "staff-management", Name = "Staff Management", Route = "/dashboard/staff", Section = "Staff", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "teaching-staff", Name = "Teaching Faculty Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "non-teaching-staff", Name = "Non-Teaching Staff Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "staff-onboarding", Name = "Staff Onboarding & Review", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "staff-profile", Name = "Staff Profile & KYC Details", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "department-designation", Name = "Department & Designation", Route = "/dashboard/departments", Section = "Staff", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "departments", Name = "Departments Directory", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "designations", Name = "Designations Directory", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "staff-attendance", Name = "Staff Attendance", Route = "/dashboard/attendance/staff", Section = "Staff", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "my-attendance", Name = "My Attendance", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "mark-staff-attendance", Name = "Mark Staff Attendance", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "staff-attendance-overview", Name = "Staff Attendance Overview", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "staff-attendance-logs", Name = "Biometric Logs & Reports", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "staff-leave-management", Name = "Staff Leave Management", Route = "/dashboard/leave-management?tab=staff", Section = "Staff", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "apply-leave", Name = "Apply Leave", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "leave-applications", Name = "Leave Applications", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "leave-approvals", Name = "Leave Approvals", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "leave-balances", Name = "Leave Balance & History", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "reimbursement", Name = "Staff Reimbursements", Route = "/dashboard/reimbursements", Section = "Staff", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "submit-claim", Name = "Submit Reimbursement Claim", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "claim-approvals", Name = "Claim Approvals Desk", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "disbursement-history", Name = "Disbursement History", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "examination", Name = "Examination", Route = "/dashboard/examinations", Section = "Examinations", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "exam-schedules", Name = "Exam Schedules & Datesheets", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hall-allocation", Name = "Exam Hall Allocation", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hall-tickets", Name = "Hall Tickets", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "exam-reports", Name = "Exam Cell Reports", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "marks-evaluation", Name = "Marks Evaluation", Route = "/dashboard/marks-entry", Section = "Examinations", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "marks-entry", Name = "Enter Subject Marks", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "marks-verification", Name = "Marks Verification & Lock", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "results", Name = "Results", Route = "/dashboard/results", Section = "Examinations", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "process-results", Name = "Process & Calculate GPA", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "publish-results", Name = "Publish Results & Memos", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "fee-management", Name = "Fee Management", Route = "/dashboard/fee-structure", Section = "Finance", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "fee-structure", Name = "Fee Structure", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "student-fees", Name = "Student Fee Ledger", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hostel-fees", Name = "Hostel Fees", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "fee-collection", Name = "Fee Collection & Receipts", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "fee-reports", Name = "Fee Defaulters & Reports", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "payroll", Name = "Payroll", Route = "/dashboard/payroll", Section = "Finance", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "salary-structures", Name = "Salary Structures", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "payroll-assignments", Name = "Staff Salary Mapping", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "payroll-generation", Name = "Monthly Payroll Processing", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "payslips", Name = "Staff Payslips", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "salary-revisions", Name = "Revisions, Bonuses & Overtime", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "payroll-approvals", Name = "Payroll Approvals & Bank Files", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "certificates", Name = "Certificates", Route = "/dashboard/certificates", Section = "Documents & Reports", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "issue-certificates", Name = "Generate & Issue Certificates", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "certificate-history", Name = "Issued Certificates Register", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "reports-analytics", Name = "Reports & Analytics", Route = "/dashboard/reports", Section = "Documents & Reports", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "academic-reports", Name = "Academic & Performance Reports", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "administrative-reports", Name = "Enrollment & Administrative", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "custom-reports", Name = "Custom Exports & Data Dumps", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "hostel-management", Name = "Hostel Management", Route = "/dashboard/hostel", Section = "Hostel Management", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "hostel-rooms", Name = "Hostel Blocks, Rooms & Beds", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "bed-allocation", Name = "Resident Student Allocation", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hostel-attendance", Name = "Hostel Night Attendance", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hostel-complaints", Name = "Outpass, Leaves & Complaints", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "hostel-reports", Name = "Hostel Occupancy & Mess Dues", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "settings", Name = "Settings", Route = "/dashboard/settings", Section = "Administration", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "landing-configuration", Name = "Landing Page Configuration", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "login-configuration", Name = "Login Page Configuration", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "campus-images", Name = "Campus Images & Sliders", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "campus-configuration", Name = "Campus Configuration & Branches", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "number-series", Name = "Auto Number Series", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "templates", Name = "Templates & Bulk Uploaders", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "leave-types", Name = "Leave Types & Quotas", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "lop-configuration", Name = "LOP (Loss of Pay) Configuration", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "attendance-timing", Name = "Attendance Timings & Shifts", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "credentials", Name = "Credentials Generator", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "audit-logs", Name = "Audit & Security Logs", IsSystem = true, AvailableActions = actions }
                    }
                },
                new ModuleMetadataDto { Id = "roles-permissions", Name = "Roles & Permissions", Route = "/dashboard/settings/roles-permissions", Section = "Administration", IsSystem = true, AvailableActions = actions,
                    Screens = new List<ScreenMetadataDto> {
                        new ScreenMetadataDto { Id = "role-management", Name = "Role & Permission Matrix", IsSystem = true, AvailableActions = actions },
                        new ScreenMetadataDto { Id = "user-role-assignment", Name = "User Role Assignment", IsSystem = true, AvailableActions = actions }
                    }
                }
            };
        }

        #endregion
    }
}
