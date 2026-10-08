using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;

namespace CollegeManagement.API.Tests
{
    public class RoleModuleApplicabilityTester
    {
        private readonly IRoleManagementService _roleService;
        private readonly IPermissionRepository _permissionRepo;

        public RoleModuleApplicabilityTester(
            IRoleManagementService roleService,
            IPermissionRepository permissionRepo)
        {
            _roleService = roleService;
            _permissionRepo = permissionRepo;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("        RUNNING ROLE MODULE APPLICABILITY & AUTHORIZATION TEST SUITE            ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            // Test 1: Principal, Faculty, Student module lists
            try
            {
                await TestModuleListsForRolesAsync();
                Console.WriteLine(" [PASS] Test 1: Principal, Faculty, Student module lists verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($" [FAIL] Test 1: {ex.Message}");
                failed++;
            }

            // Test 2: Permissions OFF while module remains applicable
            try
            {
                await TestPermissionsOffWhileModuleApplicableAsync();
                Console.WriteLine(" [PASS] Test 2: Permissions OFF while module remains applicable verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($" [FAIL] Test 2: {ex.Message}");
                failed++;
            }

            // Test 3: Role switching, selected-role save, dependency enforcement, and isolation
            try
            {
                await TestRoleSaveDependenciesAndIsolationAsync();
                Console.WriteLine(" [PASS] Test 3: Selected-role save, dependencies & isolation verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($" [FAIL] Test 3: {ex.Message}");
                failed++;
            }

            // Test 4: Effective user permissions and overrides
            try
            {
                await TestEffectiveUserPermissionsAsync();
                Console.WriteLine(" [PASS] Test 4: Effective user permissions & overrides verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($" [FAIL] Test 4: {ex.Message}");
                failed++;
            }

            // Test 5: Denied permission returns 403 Forbidden (not 500)
            try
            {
                await TestDeniedPermissionReturns403Async();
                Console.WriteLine(" [PASS] Test 5: Denied permission returns 403 Forbidden verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($" [FAIL] Test 5: {ex.Message}");
                failed++;
            }

            Console.WriteLine("================================================================================");
            Console.WriteLine($" RESULTS: {passed} PASSED, {failed} FAILED.");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }

        private async Task TestModuleListsForRolesAsync()
        {
            // 1. Faculty (Role 4) - Expect exactly 7 modules
            var facultyModules = await _roleService.GetModulesForRoleAsync(4);
            if (facultyModules.Count != 7)
            {
                throw new Exception($"Faculty expected 7 modules, got {facultyModules.Count}");
            }
            var facultyNames = facultyModules.Select(m => m.SubModule).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (!facultyNames.Contains("Timetable") || !facultyNames.Contains("Attendance") || !facultyNames.Contains("Marks Evaluation"))
            {
                throw new Exception("Faculty missing core academic/attendance modules.");
            }
            if (facultyNames.Contains("Payroll") || facultyNames.Contains("Hostel Management") || facultyNames.Contains("Transport"))
            {
                throw new Exception("Faculty contains unauthorized non-applicable operational modules.");
            }

            // 2. Student (Role 5) - Expect exactly 5 modules
            var studentModules = await _roleService.GetModulesForRoleAsync(5);
            if (studentModules.Count != 5)
            {
                throw new Exception($"Student expected 5 modules, got {studentModules.Count}");
            }
            var studentNames = studentModules.Select(m => m.SubModule).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (!studentNames.Contains("Timetable") || !studentNames.Contains("Attendance") || !studentNames.Contains("Results") || !studentNames.Contains("Fee Management"))
            {
                throw new Exception("Student missing core self-service modules.");
            }
            if (studentNames.Contains("Staff Management") || studentNames.Contains("Payroll") || studentNames.Contains("Settings"))
            {
                throw new Exception("Student contains unauthorized staff/admin modules.");
            }

            // 3. Principal (Role 15) - Expect 25 institutional modules
            var principalModules = await _roleService.GetModulesForRoleAsync(15);
            if (principalModules.Count != 25)
            {
                throw new Exception($"Principal expected 25 modules, got {principalModules.Count}");
            }
            var principalNames = principalModules.Select(m => m.SubModule).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (!principalNames.Contains("Staff Management") || !principalNames.Contains("Student Management") || !principalNames.Contains("Examination"))
            {
                throw new Exception("Principal missing leadership modules.");
            }
        }

        private async Task TestPermissionsOffWhileModuleApplicableAsync()
        {
            // Set all permissions to OFF for Faculty (Role 4)
            var modules = await _roleService.GetModulesForRoleAsync(4);
            var updateItems = modules.Select(m => new ModulePermissionUpdateItem
            {
                SubModule = m.SubModule,
                CanView = false,
                CanAdd = false,
                CanEdit = false,
                CanDelete = false
            }).ToList();

            await _roleService.UpdateRolePermissionsAsync(4, new UpdateRolePermissionsRequest
            {
                Modules = updateItems
            });

            // Retrieve permission matrix for Role 4
            var matrix = await _roleService.GetRolePermissionMatrixAsync(4);

            // Assert: All 7 modules still returned, all with permissions OFF
            if (matrix.Permissions.Count != 7)
            {
                throw new Exception($"Expected 7 modules in permission matrix when permissions are OFF, got {matrix.Permissions.Count}");
            }

            foreach (var perm in matrix.Permissions)
            {
                if (perm.CanView || perm.CanAdd || perm.CanEdit || perm.CanDelete)
                {
                    throw new Exception($"Module '{perm.SubModule}' has permissions enabled when all should be OFF.");
                }
            }
        }

        private async Task TestRoleSaveDependenciesAndIsolationAsync()
        {
            // 1. Test Dependency Enforcement: Add/Edit/Delete require View
            var modules = await _roleService.GetModulesForRoleAsync(4);
            var testItem = new ModulePermissionUpdateItem
            {
                SubModule = "Attendance",
                CanView = false,
                CanAdd = true, // invalid dependency: Add without View
                CanEdit = false,
                CanDelete = false
            };

            await _roleService.UpdateRolePermissionsAsync(4, new UpdateRolePermissionsRequest
            {
                Modules = new List<ModulePermissionUpdateItem> { testItem }
            });

            var facultyMatrix = await _roleService.GetRolePermissionMatrixAsync(4);
            var attendancePerm = facultyMatrix.Permissions.FirstOrDefault(p => p.SubModule == "Attendance");
            if (attendancePerm == null)
            {
                throw new Exception("Attendance module not found in Faculty matrix.");
            }

            // View must have been enforced because Add was true
            if (!attendancePerm.CanView)
            {
                throw new Exception("Dependency violation: CanAdd was true but CanView was not enabled.");
            }

            // 2. Test Isolation: Updating Role 4 must not modify Role 5 (Student)
            var studentMatrixBefore = await _roleService.GetRolePermissionMatrixAsync(5);
            int studentCountBefore = studentMatrixBefore.Permissions.Count;

            // Update Faculty with specific items
            await _roleService.UpdateRolePermissionsAsync(4, new UpdateRolePermissionsRequest
            {
                Modules = new List<ModulePermissionUpdateItem>
                {
                    new() { SubModule = "Timetable", CanView = true, CanAdd = false, CanEdit = false, CanDelete = false }
                }
            });

            var studentMatrixAfter = await _roleService.GetRolePermissionMatrixAsync(5);
            if (studentMatrixAfter.Permissions.Count != studentCountBefore)
            {
                throw new Exception("Isolation violation: Updating Faculty modified Student module count.");
            }

            // 3. Test Non-Applicable Modules: Sending "Payroll" for Faculty should not add it
            await _roleService.UpdateRolePermissionsAsync(4, new UpdateRolePermissionsRequest
            {
                Modules = new List<ModulePermissionUpdateItem>
                {
                    new() { SubModule = "Payroll", CanView = true, CanAdd = true, CanEdit = true, CanDelete = true }
                }
            });

            var facultyMatrixPost = await _roleService.GetRolePermissionMatrixAsync(4);
            if (facultyMatrixPost.Permissions.Any(p => p.SubModule.Equals("Payroll", StringComparison.OrdinalIgnoreCase)))
            {
                throw new Exception("Non-applicable module 'Payroll' was incorrectly admitted to Faculty permissions matrix.");
            }
        }

        private async Task TestEffectiveUserPermissionsAsync()
        {
            // Pick or verify a user
            var assignments = await _permissionRepo.GetUserRoleAssignmentsAsync(new GetUserRoleAssignmentsRequestDto
            {
                PageSize = 5
            });

            if (assignments.Items.Count == 0)
            {
                Console.WriteLine(" [NOTE] No users in user assignments to test override; skipping member override check.");
                return;
            }

            int testUserId = assignments.Items[0].UserId;

            // Retrieve effective permissions
            var userPerms = await _roleService.GetUserPermissionsAsync(testUserId);
            if (userPerms == null)
            {
                throw new Exception("GetUserPermissionsAsync returned null for user.");
            }

            // Apply override: toggle view on first module
            if (userPerms.Count > 0)
            {
                var targetModule = userPerms[0].SubModule;
                bool originalView = userPerms[0].CanView;

                await _roleService.SaveUserPermissionOverridesAsync(testUserId, new SaveUserPermissionOverridesRequest
                {
                    Overrides = new List<ModulePermissionUpdateItem>
                    {
                        new() { SubModule = targetModule, CanView = !originalView, CanAdd = false, CanEdit = false, CanDelete = false }
                    },
                    Notes = "Test override"
                });

                var updatedUserPerms = await _roleService.GetUserPermissionsAsync(testUserId);
                var updatedItem = updatedUserPerms.FirstOrDefault(p => p.SubModule == targetModule);
                if (updatedItem == null || updatedItem.CanView == originalView)
                {
                    throw new Exception("User override was not reflected in effective permissions.");
                }

                // Reset overrides
                await _roleService.ResetUserPermissionOverridesAsync(testUserId);
                var revertedUserPerms = await _roleService.GetUserPermissionsAsync(testUserId);
                var revertedItem = revertedUserPerms.FirstOrDefault(p => p.SubModule == targetModule);
                if (revertedItem == null || revertedItem.CanView != originalView)
                {
                    throw new Exception("User override was not reverted after reset.");
                }
            }
        }

        private async Task TestDeniedPermissionReturns403Async()
        {
            var filter = new RequirePermissionFilter("Academic", "Delete", _permissionRepo, NullLogger<RequirePermissionFilter>.Instance);

            // Construct HttpContext with a regular non-admin user (e.g. Student)
            var httpContext = new DefaultHttpContext();
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, "999999"), // non-existent or unprivileged user
                new("UserId", "999999"),
                new(ClaimTypes.Role, "Student")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            httpContext.User = new ClaimsPrincipal(identity);

            var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
            var authContext = new AuthorizationFilterContext(actionContext, new List<IFilterMetadata>());

            // Execute filter
            await filter.OnAuthorizationAsync(authContext);

            if (authContext.Result == null)
            {
                throw new Exception("Filter allowed request when permission should be denied.");
            }

            if (authContext.Result is not ObjectResult objResult)
            {
                throw new Exception($"Expected ObjectResult, got {authContext.Result.GetType().Name}");
            }

            if (objResult.StatusCode != StatusCodes.Status403Forbidden)
            {
                throw new Exception($"Expected HTTP 403 Forbidden, but received {objResult.StatusCode}");
            }

            var json = JsonSerializer.Serialize(objResult.Value);
            if (!json.Contains("403") && !json.Contains("Access denied"))
            {
                throw new Exception($"Expected 403 Access Denied JSON payload, got: {json}");
            }
        }
    }
}
