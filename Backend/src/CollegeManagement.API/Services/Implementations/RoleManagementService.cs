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
            var actions = new[] { "view", "create", "edit", "delete" };
            return new List<object>
            {
                new { id = "dashboard", name = "Dashboard", route = "/dashboard", section = "Overview", availableActions = actions,
                    screens = new[] {
                        new { id = "overview", name = "Overview & Metrics", availableActions = actions },
                        new { id = "analytics", name = "Analytics & BI", availableActions = actions }
                    }
                },
                new { id = "board-academic-year", name = "Board & Academic Year", route = "/dashboard/board-academic-year", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "boards-master", name = "Boards & Universities", availableActions = actions },
                        new { id = "academic-years", name = "Academic Years & Sessions", availableActions = actions }
                    }
                },
                new { id = "group-management", name = "Group Management", route = "/dashboard/courses", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "courses", name = "Courses & Groups", availableActions = actions },
                        new { id = "batches", name = "Batches & Streams", availableActions = actions }
                    }
                },
                new { id = "subject-management", name = "Subject Management", route = "/dashboard/subjects", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "subjects", name = "Subjects Directory", availableActions = actions },
                        new { id = "subject-assignment", name = "Faculty Subject Allocation", availableActions = actions }
                    }
                },
                new { id = "section-room", name = "Section & Room", route = "/dashboard/sections", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "sections", name = "Sections Directory", availableActions = actions },
                        new { id = "rooms", name = "Classrooms & Labs", availableActions = actions }
                    }
                },
                new { id = "timetable", name = "Timetable", route = "/dashboard/timetable", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "view-timetable", name = "Weekly Timetable View", availableActions = actions },
                        new { id = "setup-timetable", name = "Period Slots & Timetable Setup", availableActions = actions },
                        new { id = "draft-timetable", name = "Draft Schedules & Revisions", availableActions = actions },
                        new { id = "generate-timetable", name = "Auto Schedule Generator", availableActions = actions },
                        new { id = "faculty-timetable", name = "Faculty Timetable & Substitutions", availableActions = actions }
                    }
                },
                new { id = "holiday-management", name = "Holiday Management", route = "/dashboard/holidays", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "academic-holidays", name = "Holidays Calendar", availableActions = actions }
                    }
                },
                new { id = "inventory-management", name = "Inventory Management", route = "/dashboard/inventory-management", section = "Academic", availableActions = actions,
                    screens = new[] {
                        new { id = "inventory-items", name = "Items Catalog & Stocks", availableActions = actions },
                        new { id = "stock-movements", name = "Stock Movements & Issues", availableActions = actions },
                        new { id = "purchase-orders", name = "Vendors & Purchase Orders", availableActions = actions }
                    }
                },
                new { id = "student-admission", name = "Student Admission", route = "/dashboard/admission", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "admission-pipeline", name = "Admission Inquiries & Forms", availableActions = actions },
                        new { id = "admission-approval", name = "Verification & Approval", availableActions = actions }
                    }
                },
                new { id = "student-management", name = "Student Management", route = "/dashboard/students", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "student-directory", name = "Student Directory", availableActions = actions },
                        new { id = "student-profile", name = "Student Profile & Bio", availableActions = actions },
                        new { id = "student-enrollment", name = "Enrollment & Documents", availableActions = actions }
                    }
                },
                new { id = "section-allocation", name = "Section Allocation", route = "/dashboard/section-allocation", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "student-allocation", name = "Allocate Sections", availableActions = actions },
                        new { id = "allocated-list", name = "Allocated Students Register", availableActions = actions },
                        new { id = "roll-numbers", name = "Roll Numbers", availableActions = actions }
                    }
                },
                new { id = "attendance", name = "Attendance", route = "/dashboard/attendance/student", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "student-attendance", name = "Daily Attendance Entry", availableActions = actions },
                        new { id = "attendance-overview", name = "Student Attendance Overview", availableActions = actions },
                        new { id = "attendance-reports", name = "Attendance Reports & Defaulters", availableActions = actions }
                    }
                },
                new { id = "promotion", name = "Promotion", route = "/dashboard/promotion", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "eligible", name = "Promotion Eligibility", availableActions = actions },
                        new { id = "single", name = "Single Student Promotion", availableActions = actions },
                        new { id = "allocation", name = "Section Allocation on Promotion", availableActions = actions },
                        new { id = "history", name = "Promotion History & Audits", availableActions = actions },
                        new { id = "report", name = "Promotion Analytics Report", availableActions = actions }
                    }
                },
                new { id = "transport", name = "Transport", route = "/dashboard/transport", section = "Student", availableActions = actions,
                    screens = new[] {
                        new { id = "routes", name = "Bus Routes & Stops", availableActions = actions },
                        new { id = "vehicles", name = "Fleet & Vehicles", availableActions = actions },
                        new { id = "driver-assignment", name = "Driver & Bus Allocations", availableActions = actions },
                        new { id = "student-transport", name = "Student Transport Passes", availableActions = actions },
                        new { id = "live-tracking", name = "Live GPS Tracking", availableActions = actions }
                    }
                },
                new { id = "staff-management", name = "Staff Management", route = "/dashboard/staff", section = "Staff", availableActions = actions,
                    screens = new[] {
                        new { id = "teaching-staff", name = "Teaching Faculty Directory", availableActions = actions },
                        new { id = "non-teaching-staff", name = "Non-Teaching Staff Directory", availableActions = actions },
                        new { id = "staff-onboarding", name = "Staff Onboarding & Review", availableActions = actions },
                        new { id = "staff-profile", name = "Staff Profile & KYC Details", availableActions = actions }
                    }
                },
                new { id = "department-designation", name = "Department & Designation", route = "/dashboard/departments", section = "Staff", availableActions = actions,
                    screens = new[] {
                        new { id = "departments", name = "Departments Directory", availableActions = actions },
                        new { id = "designations", name = "Designations Directory", availableActions = actions }
                    }
                },
                new { id = "staff-attendance", name = "Staff Attendance", route = "/dashboard/attendance/staff", section = "Staff", availableActions = actions,
                    screens = new[] {
                        new { id = "my-attendance", name = "My Attendance", availableActions = actions },
                        new { id = "mark-staff-attendance", name = "Mark Staff Attendance", availableActions = actions },
                        new { id = "staff-attendance-overview", name = "Staff Attendance Overview", availableActions = actions },
                        new { id = "staff-attendance-logs", name = "Biometric Logs & Reports", availableActions = actions }
                    }
                },
                new { id = "staff-leave-management", name = "Staff Leave Management", route = "/dashboard/leave-management?tab=staff", section = "Staff", availableActions = actions,
                    screens = new[] {
                        new { id = "apply-leave", name = "Apply Leave", availableActions = actions },
                        new { id = "leave-applications", name = "Leave Applications", availableActions = actions },
                        new { id = "leave-approvals", name = "Leave Approvals", availableActions = actions },
                        new { id = "leave-balances", name = "Leave Balance & History", availableActions = actions }
                    }
                },
                new { id = "reimbursement", name = "Staff Reimbursements", route = "/dashboard/reimbursements", section = "Staff", availableActions = actions,
                    screens = new[] {
                        new { id = "submit-claim", name = "Submit Reimbursement Claim", availableActions = actions },
                        new { id = "claim-approvals", name = "Claim Approvals Desk", availableActions = actions },
                        new { id = "disbursement-history", name = "Disbursement History", availableActions = actions }
                    }
                },
                new { id = "examination", name = "Examination", route = "/dashboard/examinations", section = "Examinations", availableActions = actions,
                    screens = new[] {
                        new { id = "exam-schedules", name = "Exam Schedules & Datesheets", availableActions = actions },
                        new { id = "hall-allocation", name = "Exam Hall Allocation", availableActions = actions },
                        new { id = "hall-tickets", name = "Hall Tickets", availableActions = actions },
                        new { id = "exam-reports", name = "Exam Cell Reports", availableActions = actions }
                    }
                },
                new { id = "marks-evaluation", name = "Marks Evaluation", route = "/dashboard/marks-entry", section = "Examinations", availableActions = actions,
                    screens = new[] {
                        new { id = "marks-entry", name = "Enter Subject Marks", availableActions = actions },
                        new { id = "marks-verification", name = "Marks Verification & Lock", availableActions = actions }
                    }
                },
                new { id = "results", name = "Results", route = "/dashboard/results", section = "Examinations", availableActions = actions,
                    screens = new[] {
                        new { id = "process-results", name = "Process & Calculate GPA", availableActions = actions },
                        new { id = "publish-results", name = "Publish Results & Memos", availableActions = actions }
                    }
                },
                new { id = "fee-management", name = "Fee Management", route = "/dashboard/fee-structure", section = "Finance", availableActions = actions,
                    screens = new[] {
                        new { id = "fee-structure", name = "Fee Structure", availableActions = actions },
                        new { id = "student-fees", name = "Student Fee Ledger", availableActions = actions },
                        new { id = "hostel-fees", name = "Hostel Fees", availableActions = actions },
                        new { id = "fee-collection", name = "Fee Collection & Receipts", availableActions = actions },
                        new { id = "fee-reports", name = "Fee Defaulters & Reports", availableActions = actions }
                    }
                },
                new { id = "payroll", name = "Payroll", route = "/dashboard/payroll", section = "Finance", availableActions = actions,
                    screens = new[] {
                        new { id = "salary-structures", name = "Salary Structures", availableActions = actions },
                        new { id = "payroll-assignments", name = "Staff Salary Mapping", availableActions = actions },
                        new { id = "payroll-generation", name = "Monthly Payroll Processing", availableActions = actions },
                        new { id = "payslips", name = "Staff Payslips", availableActions = actions },
                        new { id = "salary-revisions", name = "Revisions, Bonuses & Overtime", availableActions = actions },
                        new { id = "payroll-approvals", name = "Payroll Approvals & Bank Files", availableActions = actions }
                    }
                },
                new { id = "certificates", name = "Certificates", route = "/dashboard/certificates", section = "Documents & Reports", availableActions = actions,
                    screens = new[] {
                        new { id = "issue-certificates", name = "Generate & Issue Certificates", availableActions = actions },
                        new { id = "certificate-history", name = "Issued Certificates Register", availableActions = actions }
                    }
                },
                new { id = "reports-analytics", name = "Reports & Analytics", route = "/dashboard/reports", section = "Documents & Reports", availableActions = actions,
                    screens = new[] {
                        new { id = "academic-reports", name = "Academic & Performance Reports", availableActions = actions },
                        new { id = "administrative-reports", name = "Enrollment & Administrative", availableActions = actions },
                        new { id = "custom-reports", name = "Custom Exports & Data Dumps", availableActions = actions }
                    }
                },
                new { id = "hostel-management", name = "Hostel Management", route = "/dashboard/hostel", section = "Hostel Management", availableActions = actions,
                    screens = new[] {
                        new { id = "hostel-rooms", name = "Hostel Blocks, Rooms & Beds", availableActions = actions },
                        new { id = "bed-allocation", name = "Resident Student Allocation", availableActions = actions },
                        new { id = "hostel-attendance", name = "Hostel Night Attendance", availableActions = actions },
                        new { id = "hostel-complaints", name = "Outpass, Leaves & Complaints", availableActions = actions },
                        new { id = "hostel-reports", name = "Hostel Occupancy & Mess Dues", availableActions = actions }
                    }
                },
                new { id = "settings", name = "Settings", route = "/dashboard/settings", section = "Administration", availableActions = actions,
                    screens = new[] {
                        new { id = "landing-configuration", name = "Landing Page Configuration", availableActions = actions },
                        new { id = "login-configuration", name = "Login Page Configuration", availableActions = actions },
                        new { id = "campus-images", name = "Campus Images & Sliders", availableActions = actions },
                        new { id = "campus-configuration", name = "Campus Configuration & Branches", availableActions = actions },
                        new { id = "number-series", name = "Auto Number Series", availableActions = actions },
                        new { id = "templates", name = "Templates & Bulk Uploaders", availableActions = actions },
                        new { id = "leave-types", name = "Leave Types & Quotas", availableActions = actions },
                        new { id = "lop-configuration", name = "LOP (Loss of Pay) Configuration", availableActions = actions },
                        new { id = "attendance-timing", name = "Attendance Timings & Shifts", availableActions = actions },
                        new { id = "credentials", name = "Credentials Generator", availableActions = actions },
                        new { id = "audit-logs", name = "Audit & Security Logs", availableActions = actions }
                    }
                },
                new { id = "roles-permissions", name = "Roles & Permissions", route = "/dashboard/settings/roles-permissions", section = "Administration", availableActions = actions,
                    screens = new[] {
                        new { id = "role-management", name = "Role & Permission Matrix", availableActions = actions },
                        new { id = "user-role-assignment", name = "User Role Assignment", availableActions = actions }
                    }
                },
                new { id = "library", name = "Library", route = "/dashboard/library", section = "Operations", availableActions = actions,
                    screens = new[] {
                        new { id = "book-catalog", name = "Book Catalog & Search", availableActions = actions },
                        new { id = "circulation", name = "Issue & Return Desk", availableActions = actions },
                        new { id = "library-members", name = "Student & Staff Cards", availableActions = actions }
                    }
                },
                new { id = "placement", name = "Placement", route = "/dashboard/placement", section = "Operations", availableActions = actions,
                    screens = new[] {
                        new { id = "placement-drives", name = "Recruitment Drives", availableActions = actions },
                        new { id = "student-applications", name = "Applications & Offers", availableActions = actions }
                    }
                }
            };
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
    }
}
