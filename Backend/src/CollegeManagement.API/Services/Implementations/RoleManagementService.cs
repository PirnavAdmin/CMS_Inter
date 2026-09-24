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

        public async Task<List<RoleCardDto>> GetRoleCardsAsync()
        {
            return await _permissionRepository.GetRoleCardsAsync();
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

            var normalizedModules = request.GetNormalizedModules();
            await _permissionRepository.UpdateRolePermissionsAsync(roleId, normalizedModules);
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

        public async Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId)
        {
            return await _permissionRepository.GetRoleMembersAsync(roleId);
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
            var actions = new[] { "view", "create", "edit", "delete" };
            return new List<object>
            {
                new { id = "dashboard", name = "Dashboard", route = "/dashboard", section = "Overview", availableActions = new[] { "view", "export" } },
                new { id = "group-management", name = "Group Management", route = "/dashboard/courses", section = "Academic", availableActions = actions },
                new { id = "subject-management", name = "Subject Management", route = "/dashboard/subjects", section = "Academic", availableActions = actions },
                new { id = "section-room", name = "Section & Room", route = "/dashboard/sections", section = "Academic", availableActions = actions },
                new { id = "timetable", name = "Timetable", route = "/dashboard/timetable", section = "Academic", availableActions = actions },
                new { id = "holiday-management", name = "Holiday Management", route = "/dashboard/holidays", section = "Academic", availableActions = actions },
                new { id = "student-admission", name = "Student Admission", route = "/dashboard/admission", section = "Student", availableActions = actions },
                new { id = "student-management", name = "Student Management", route = "/dashboard/students", section = "Student", availableActions = actions },
                new { id = "section-allocation", name = "Section Allocation", route = "/dashboard/section-allocation", section = "Student", availableActions = actions },
                new { id = "attendance", name = "Attendance", route = "/dashboard/attendance/student", section = "Student", availableActions = actions },
                new { id = "promotion", name = "Promotion", route = "/dashboard/promotion", section = "Student", availableActions = actions },
                new { id = "transport", name = "Transport", route = "/dashboard/transport", section = "Student", availableActions = actions },
                new { id = "staff-management", name = "Staff Management", route = "/dashboard/staff", section = "Staff", availableActions = actions },
                new { id = "department-designation", name = "Department & Designation", route = "/dashboard/departments", section = "Staff", availableActions = actions },
                new { id = "staff-attendance", name = "Staff Attendance", route = "/dashboard/attendance/staff", section = "Staff", availableActions = actions },
                new { id = "staff-leave-management", name = "Staff Leave Management", route = "/dashboard/staff/leaves", section = "Staff", availableActions = actions },
                new { id = "examination", name = "Examination", route = "/dashboard/examinations", section = "Examinations", availableActions = actions },
                new { id = "marks-evaluation", name = "Marks Evaluation", route = "/dashboard/marks", section = "Examinations", availableActions = actions },
                new { id = "results", name = "Results", route = "/dashboard/results", section = "Examinations", availableActions = actions },
                new { id = "fee-management", name = "Fee Management", route = "/dashboard/fees", section = "Finance", availableActions = actions },
                new { id = "payroll", name = "Payroll", route = "/dashboard/payroll", section = "Finance", availableActions = actions },
                new { id = "certificates", name = "Certificates", route = "/dashboard/certificates", section = "Documents & Reports", availableActions = actions },
                new { id = "reports-analytics", name = "Reports & Analytics", route = "/dashboard/reports", section = "Documents & Reports", availableActions = actions },
                new { id = "hostel-management", name = "Hostel Management", route = "/dashboard/hostel", section = "Hostel Management", availableActions = actions },
                new { id = "library", name = "Library", route = "/dashboard/library", section = "Operations", availableActions = actions },
                new { id = "placement", name = "Placement", route = "/dashboard/placement", section = "Operations", availableActions = actions },
                new { id = "settings", name = "Settings", route = "/dashboard/settings", section = "Administration", availableActions = actions },
                new { id = "roles-permissions", name = "Roles & Permissions", route = "/dashboard/roles", section = "Administration", availableActions = actions }
            };
        }
    }
}
