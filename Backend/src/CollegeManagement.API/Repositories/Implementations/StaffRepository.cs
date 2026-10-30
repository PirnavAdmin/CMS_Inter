using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffRepository : IStaffRepository
    {
        private readonly AppDbContext _context;

        public StaffRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<Staff?> GetByIdAsync(int id)
        {
            try
            {
                using var multi = await Connection.QueryMultipleAsync(
                    "sp_GetStaffById",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);

                var staff = await multi.ReadFirstOrDefaultAsync<Staff>();
                if (staff != null)
                {
                    if (!multi.IsConsumed)
                    {
                        var allocations = (await multi.ReadAsync<StaffSubjectAllocation>()).ToList();
                        staff.StaffSubjectAllocations = allocations;
                    }
                    return staff;
                }
            }
            catch
            {
                // Fallback to EF Core if SP is not available
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .Include(s => s.StaffCampusAssignments)
                    .ThenInclude(sca => sca.Campus)
                .Include(s => s.StaffBoardAssignments)
                    .ThenInclude(sba => sba.Board)
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        }

        public async Task<Staff?> GetByEmployeeIdAsync(string employeeId)
        {
            if (string.IsNullOrWhiteSpace(employeeId)) return null;
            var cleanEmpId = employeeId.Trim();

            try
            {
                var staff = await Connection.QueryFirstOrDefaultAsync<Staff>(
                    "sp_GetStaffByEmployeeId",
                    new { p_EmployeeId = cleanEmpId },
                    commandType: CommandType.StoredProcedure);

                if (staff != null) return staff;
            }
            catch
            {
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .Include(s => s.StaffCampusAssignments)
                    .ThenInclude(sca => sca.Campus)
                .Include(s => s.StaffBoardAssignments)
                    .ThenInclude(sba => sba.Board)
                .FirstOrDefaultAsync(s => s.EmployeeId == cleanEmpId && !s.IsDeleted);
        }

        public async Task<Staff?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var cleanEmail = email.Trim();

            try
            {
                var staff = await Connection.QueryFirstOrDefaultAsync<Staff>(
                    "sp_GetStaffByEmail",
                    new { p_Email = cleanEmail },
                    commandType: CommandType.StoredProcedure);

                if (staff != null) return staff;
            }
            catch
            {
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.Email == cleanEmail && !s.IsDeleted);
        }

        public async Task<Staff?> GetByMobileAsync(string mobile)
        {
            if (string.IsNullOrWhiteSpace(mobile)) return null;
            var cleanMobile = mobile.Trim();

            try
            {
                var staff = await Connection.QueryFirstOrDefaultAsync<Staff>(
                    "sp_GetStaffByMobile",
                    new { p_Mobile = cleanMobile },
                    commandType: CommandType.StoredProcedure);

                if (staff != null) return staff;
            }
            catch
            {
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.Mobile == cleanMobile && !s.IsDeleted);
        }

        public async Task<Staff?> GetByAadhaarAsync(string aadhaar)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return null;
            var cleanAadhaar = aadhaar.Trim();

            try
            {
                var staff = await Connection.QueryFirstOrDefaultAsync<Staff>(
                    "sp_GetStaffByAadhaar",
                    new { p_Aadhaar = cleanAadhaar },
                    commandType: CommandType.StoredProcedure);

                if (staff != null) return staff;
            }
            catch
            {
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.Aadhaar == cleanAadhaar && !s.IsDeleted);
        }

        public async Task<Staff?> GetByTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;
            var cleanToken = token.Trim();

            try
            {
                var staff = await Connection.QueryFirstOrDefaultAsync<Staff>(
                    "sp_GetStaffByToken",
                    new { p_Token = cleanToken },
                    commandType: CommandType.StoredProcedure);

                if (staff != null) return staff;
            }
            catch
            {
            }

            return await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .FirstOrDefaultAsync(s => s.ProfileLinkToken == cleanToken && 
                                          !s.IsDeleted && 
                                          (!s.ProfileLinkExpiresAt.HasValue || s.ProfileLinkExpiresAt.Value > DateTime.UtcNow) && 
                                          s.ProfileStatus != "Completed");
        }

        public async Task<string?> GetPhotoPathAsync(int id)
        {
            try
            {
                var path = await Connection.ExecuteScalarAsync<string>(
                    "sp_GetStaffPhotoPath",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);

                if (!string.IsNullOrWhiteSpace(path)) return path;
            }
            catch
            {
            }

            return await _context.Staffs
                .Where(s => s.Id == id && !s.IsDeleted)
                .Select(s => s.PhotoPath)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> IsEmployeeIdUniqueAsync(string employeeId, int? excludeId = null)
        {
            try
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckStaffEmployeeIdUnique",
                    new { p_EmployeeId = employeeId.Trim(), p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count == 0;
            }
            catch
            {
                var query = _context.Staffs.Where(s => s.EmployeeId == employeeId.Trim() && !s.IsDeleted);
                if (excludeId.HasValue)
                {
                    query = query.Where(s => s.Id != excludeId.Value);
                }
                return !await query.AnyAsync();
            }
        }

        public async Task<bool> IsEmailUniqueAsync(string email, int? excludeId = null)
        {
            try
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckStaffEmailUnique",
                    new { p_Email = email.Trim(), p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count == 0;
            }
            catch
            {
                var query = _context.Staffs.Where(s => s.Email == email.Trim() && !s.IsDeleted);
                if (excludeId.HasValue)
                {
                    query = query.Where(s => s.Id != excludeId.Value);
                }
                return !await query.AnyAsync();
            }
        }

        public async Task<bool> IsMobileUniqueAsync(string mobile, int? excludeId = null)
        {
            try
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckStaffMobileUnique",
                    new { p_Mobile = mobile.Trim(), p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count == 0;
            }
            catch
            {
                var query = _context.Staffs.Where(s => s.Mobile == mobile.Trim() && !s.IsDeleted);
                if (excludeId.HasValue)
                {
                    query = query.Where(s => s.Id != excludeId.Value);
                }
                return !await query.AnyAsync();
            }
        }

        public async Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return true;

            try
            {
                var count = await Connection.ExecuteScalarAsync<int>(
                    "sp_CheckStaffAadhaarUnique",
                    new { p_Aadhaar = aadhaar.Trim(), p_ExcludeId = excludeId },
                    commandType: CommandType.StoredProcedure);

                return count == 0;
            }
            catch
            {
                var query = _context.Staffs.Where(s => s.Aadhaar == aadhaar.Trim() && !s.IsDeleted);
                if (excludeId.HasValue)
                {
                    query = query.Where(s => s.Id != excludeId.Value);
                }
                return !await query.AnyAsync();
            }
        }

        public async Task<(List<Staff> Items, int TotalCount)> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            int pageNumber = queryParams.PageNumber < 1 ? 1 : queryParams.PageNumber;
            int pageSize = queryParams.PageSize < 1 ? 5 : queryParams.PageSize;

            try
            {
                var p = new DynamicParameters();
                p.Add("p_PageNumber", pageNumber);
                p.Add("p_PageSize", pageSize);
                p.Add("p_SearchTerm", string.IsNullOrWhiteSpace(queryParams.SearchTerm) ? null : queryParams.SearchTerm.Trim());
                p.Add("p_Department", string.IsNullOrWhiteSpace(queryParams.Department) ? null : queryParams.Department.Trim());
                p.Add("p_DepartmentId", queryParams.DepartmentId ?? 0);
                p.Add("p_Designation", string.IsNullOrWhiteSpace(queryParams.Designation) ? null : queryParams.Designation.Trim());
                p.Add("p_DesignationId", queryParams.DesignationId ?? 0);
                p.Add("p_StaffType", string.IsNullOrWhiteSpace(queryParams.StaffType) ? null : queryParams.StaffType.Trim());
                p.Add("p_Status", string.IsNullOrWhiteSpace(queryParams.Status) ? null : queryParams.Status.Trim());
                p.Add("p_ProfileStatus", string.IsNullOrWhiteSpace(queryParams.ProfileStatus) ? null : queryParams.ProfileStatus.Trim());
                p.Add("p_BoardId", queryParams.BoardId ?? 0);
                p.Add("p_BoardName", string.IsNullOrWhiteSpace(queryParams.BoardName) ? null : queryParams.BoardName.Trim());
                p.Add("p_SortBy", string.IsNullOrWhiteSpace(queryParams.SortBy) ? "id" : queryParams.SortBy.Trim());
                p.Add("p_SortOrder", string.IsNullOrWhiteSpace(queryParams.SortOrder) ? "DESC" : queryParams.SortOrder.Trim());

                using var multi = await Connection.QueryMultipleAsync("sp_GetPagedStaff", p, commandType: CommandType.StoredProcedure);
                if (!multi.IsConsumed)
                {
                    var meta = await multi.ReadFirstOrDefaultAsync<dynamic>();
                    var staffList = (await multi.ReadAsync<Staff>()).ToList();
                    int total = meta != null && meta.TotalCount != null ? (int)meta.TotalCount : staffList.Count;
                    return (staffList, total);
                }
            }
            catch
            {
                // Fallback to EF Core LINQ query if SP is missing or fails
            }

            var query = _context.Staffs
                .AsNoTracking()
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.StaffSubjectAllocations)
                    .ThenInclude(ssa => ssa.Subject)
                .Where(s => !s.IsDeleted);

            // 1. Search Term
            if (!string.IsNullOrWhiteSpace(queryParams.SearchTerm))
            {
                var term = queryParams.SearchTerm.Trim();
                query = query.Where(s =>
                    s.FirstName.Contains(term) ||
                    s.LastName.Contains(term) ||
                    (s.MiddleName != null && s.MiddleName.Contains(term)) ||
                    s.EmployeeId.Contains(term) ||
                    s.Email.Contains(term) ||
                    s.Mobile.Contains(term) ||
                    (s.DepartmentRef != null && (s.DepartmentRef.DepartmentName.Contains(term) || s.DepartmentRef.DepartmentCode.Contains(term))) ||
                    (s.Designation != null && s.Designation.Contains(term)) ||
                    (s.DesignationRef != null && s.DesignationRef.Name.Contains(term)) ||
                    (s.BoardRef != null && (s.BoardRef.BoardName.Contains(term) || s.BoardRef.BoardCode.Contains(term))));
            }

            // 2. Department filter
            if (queryParams.DepartmentId.HasValue && queryParams.DepartmentId.Value > 0)
            {
                query = query.Where(s => s.DepartmentId == queryParams.DepartmentId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.Department) &&
                     !queryParams.Department.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                     !queryParams.Department.Equals("All Departments", StringComparison.OrdinalIgnoreCase))
            {
                var dept = queryParams.Department.Trim();
                query = query.Where(s =>
                    s.DepartmentRef != null && (s.DepartmentRef.DepartmentName == dept || s.DepartmentRef.DepartmentCode == dept));
            }

            // 3. Designation filter
            if (queryParams.DesignationId.HasValue && queryParams.DesignationId.Value > 0)
            {
                query = query.Where(s => s.DesignationId == queryParams.DesignationId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.Designation) &&
                     !queryParams.Designation.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                     !queryParams.Designation.Equals("All Designations", StringComparison.OrdinalIgnoreCase))
            {
                var desig = queryParams.Designation.Trim();
                query = query.Where(s =>
                    s.Designation == desig ||
                    (s.DesignationRef != null && s.DesignationRef.Name == desig));
            }

            // 4. Board filter
            if (queryParams.BoardId.HasValue && queryParams.BoardId.Value > 0)
            {
                query = query.Where(s => s.BoardId == queryParams.BoardId.Value || s.BoardId == null);
            }
            else if (!string.IsNullOrWhiteSpace(queryParams.BoardName) &&
                     !queryParams.BoardName.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                     !queryParams.BoardName.Equals("All Boards", StringComparison.OrdinalIgnoreCase))
            {
                var bName = queryParams.BoardName.Trim();
                query = query.Where(s =>
                    s.BoardRef != null && (s.BoardRef.BoardName == bName || s.BoardRef.BoardCode == bName));
            }

            // 4.1 Campus filter
            if (queryParams.CampusId.HasValue && queryParams.CampusId.Value > 0)
            {
                query = query.Where(s => s.CampusId == queryParams.CampusId.Value);
            }

            // 5. Staff Type filter
            if (!string.IsNullOrWhiteSpace(queryParams.StaffType) &&
                !queryParams.StaffType.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var st = queryParams.StaffType.Trim();
                if (st.Equals("NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                    st.Equals("Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                    st.Equals("Non Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.StaffType != "Teaching" && s.StaffType != null && s.StaffType != "");
                }
                else if (st.Equals("Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.StaffType == "Teaching" || s.StaffType == null || s.StaffType == "");
                }
                else
                {
                    query = query.Where(s => s.StaffType == st);
                }
            }

            // 6. Status filter
            if (!string.IsNullOrWhiteSpace(queryParams.Status) &&
                !queryParams.Status.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                !queryParams.Status.Equals("All Status", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(s => s.Status == queryParams.Status.Trim());
            }

            // 7. Profile Status filter
            if (!string.IsNullOrWhiteSpace(queryParams.ProfileStatus) &&
                !queryParams.ProfileStatus.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var ps = queryParams.ProfileStatus.Trim();
                if (ps.Equals("Completed", StringComparison.OrdinalIgnoreCase) || ps.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "Completed" || s.ProfileStatus == "Approved");
                }
                else if (ps.Equals("Pending", StringComparison.OrdinalIgnoreCase) || ps.Equals("Pending Profile Completion", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus != "Completed" && s.ProfileStatus != "Approved");
                }
                else
                {
                    query = query.Where(s => s.ProfileStatus == ps);
                }
            }

            // 8. Pending Sub-tab filter
            if (!string.IsNullOrWhiteSpace(queryParams.PendingSubTab))
            {
                var subTab = queryParams.PendingSubTab.Trim();
                if (subTab.Equals("LinkSent", StringComparison.OrdinalIgnoreCase) || subTab.Equals("Link Sent", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "LinkSent" || s.ProfileStatus == "PendingLink" || s.ProfileStatus == null);
                }
                else if (subTab.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || subTab.Equals("In Progress", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "InProgress");
                }
                else if (subTab.Equals("NeedsCorrection", StringComparison.OrdinalIgnoreCase) || subTab.Equals("Needs Correction", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "NeedsCorrection");
                }
                else if (subTab.Equals("Submitted", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.ProfileStatus == "Submitted");
                }
            }

            var totalCount = await query.CountAsync();

            query = (queryParams.SortBy?.ToLowerInvariant(), queryParams.SortOrder?.ToUpperInvariant()) switch
            {
                ("firstname", "ASC") => query.OrderBy(s => s.FirstName).ThenByDescending(s => s.Id),
                ("firstname", _) => query.OrderByDescending(s => s.FirstName).ThenByDescending(s => s.Id),
                ("employeeid", "ASC") => query.OrderBy(s => s.EmployeeId).ThenByDescending(s => s.Id),
                ("employeeid", _) => query.OrderByDescending(s => s.EmployeeId).ThenByDescending(s => s.Id),
                ("joiningdate", "ASC") => query.OrderBy(s => s.JoiningDate).ThenByDescending(s => s.Id),
                ("joiningdate", _) => query.OrderByDescending(s => s.JoiningDate).ThenByDescending(s => s.Id),
                ("profilecompletionpercentage", "ASC") => query.OrderBy(s => s.ProfileCompletionPercentage).ThenByDescending(s => s.Id),
                ("profilecompletionpercentage", _) => query.OrderByDescending(s => s.ProfileCompletionPercentage).ThenByDescending(s => s.Id),
                ("id", "ASC") => query.OrderBy(s => s.Id),
                _ => query.OrderByDescending(s => s.Id)
            };

            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            foreach (var item in items)
            {
                if (item.DepartmentRef != null) item.Department = item.DepartmentRef.DepartmentName;
                if (item.BoardRef != null) item.BoardName = item.BoardRef.BoardName;
                if (item.DesignationRef != null && string.IsNullOrWhiteSpace(item.Designation)) item.Designation = item.DesignationRef.Name;
            }

            return (items, totalCount);
        }

        public async Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null, int? campusId = null)
        {
            try
            {
                var list = await Connection.QueryAsync<StaffDropdownDto>(
                    "sp_GetStaffDropdown",
                    new { p_StaffType = staffType },
                    commandType: CommandType.StoredProcedure);

                if (list != null && list.Any())
                {
                    return list;
                }
            }
            catch
            {
            }

            var query = _context.Staffs.AsNoTracking().Where(s => !s.IsDeleted && s.Status == "Active");
            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(s => s.CampusId == campusId.Value);
            }
            if (!string.IsNullOrWhiteSpace(staffType) && !staffType.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var st = staffType.Trim();
                if (st.Equals("NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                    st.Equals("Non-Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.StaffType == "Non-Teaching" || s.StaffType == "NonTeaching");
                }
                else if (st.Equals("Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.StaffType == "Teaching" || s.StaffType == null || s.StaffType == "");
                }
                else
                {
                    query = query.Where(s => s.StaffType == st);
                }
            }

            return await query
                .OrderBy(s => s.FirstName)
                .Select(s => new StaffDropdownDto
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    FullName = $"{s.FirstName} {s.LastName}".Trim(),
                    Designation = s.Designation,
                    Department = s.DepartmentRef != null ? s.DepartmentRef.DepartmentName : s.Department,
                    StaffType = s.StaffType
                })
                .ToListAsync();
        }

        public async Task<string> GenerateNextEmployeeIdAsync(string staffType, int campusId)
        {
            var isTeaching = !string.Equals(staffType?.Replace("-", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
            var seriesCode = isTeaching ? "TEACHING_STAFF_ID" : "NON_TEACHING_STAFF_ID";
            
            string? nextId = null;
            try
            {
                using var conn = _context.Database.GetDbConnection();
                var parameters = new DynamicParameters();
                parameters.Add("p_SeriesCode", seriesCode, DbType.String);
                parameters.Add("p_CampusId", campusId, DbType.Int32);

                nextId = await conn.QueryFirstOrDefaultAsync<string>(
                    "sp_GenerateNextNumberSeries",
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(nextId))
            {
                var prefix = isTeaching ? "PCTCH" : "PCNT";
                try
                {
                    using var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open) await _context.Database.OpenConnectionAsync();

                    // Ensure sequence row exists atomically
                    await conn.ExecuteAsync(
                        @"INSERT INTO `NumberSeriesConfigurations` 
                          (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
                          SELECT @sCode, @sName, @pfx, '{PREFIX}{SEQ}', 4, 1, 0, @cId, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
                          FROM DUAL
                          WHERE NOT EXISTS (SELECT 1 FROM `NumberSeriesConfigurations` WHERE `SeriesCode` = @sCode AND (`CampusId` = @cId OR `CampusId` IS NULL));",
                        new { sCode = seriesCode, sName = isTeaching ? "Teaching Staff ID" : "Non-Teaching Staff ID", pfx = prefix, cId = campusId });

                    // Atomic increment with LAST_INSERT_ID
                    var seq = await conn.QuerySingleOrDefaultAsync<int>(
                        @"UPDATE `NumberSeriesConfigurations` 
                          SET `CurrentSequence` = LAST_INSERT_ID(CASE WHEN `CurrentSequence` < `StartNumber` THEN `StartNumber` ELSE `CurrentSequence` + 1 END),
                              `UpdatedAt` = UTC_TIMESTAMP()
                          WHERE `SeriesCode` = @sCode AND (`CampusId` = @cId OR `CampusId` IS NULL)
                          ORDER BY `CampusId` DESC LIMIT 1;
                          SELECT LAST_INSERT_ID();",
                        new { sCode = seriesCode, cId = campusId });

                    if (seq > 0)
                    {
                        return $"{prefix}{seq:D4}";
                    }
                }
                catch { }

                var max = await _context.Staffs
                    .Where(s => s.CampusId == campusId && !s.IsDeleted && s.EmployeeId != null && s.EmployeeId.StartsWith(prefix))
                    .CountAsync();
                return $"{prefix}{(max + 1):D4}";
            }

            return nextId;
        }

        public async Task<StaffDashboardStatsDto> GetDashboardStatsAsync(int? boardId = null, int? campusId = null)
        {
            try
            {
                var stats = await Connection.QueryFirstOrDefaultAsync<StaffDashboardStatsDto>(
                    "sp_GetStaffDashboardStats",
                    new { p_BoardId = boardId },
                    commandType: CommandType.StoredProcedure);

                if (stats != null)
                {
                    if (stats.TotalCount == 0 && stats.TotalStaff > 0) stats.TotalCount = stats.TotalStaff;
                    return stats;
                }
            }
            catch
            {
                // Fallback to single SQL aggregation query if stored procedure signature differs
                try
                {
                    var sql = @"
                        SELECT 
                            COUNT(*) AS TotalStaff,
                            COUNT(*) AS TotalCount,
                            SUM(CASE WHEN s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '' THEN 1 ELSE 0 END) AS TeachingStaff,
                            SUM(CASE WHEN s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching') THEN 1 ELSE 0 END) AS NonTeachingStaff,
                            SUM(CASE WHEN s.ProfileStatus IN ('Completed', 'Approved') OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS CompletedProfiles,
                            SUM(CASE WHEN s.ProfileStatus IN ('Completed', 'Approved') OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS Completed,
                            SUM(CASE WHEN s.ProfileStatus != 'Completed' AND (s.ProfileCompletionPercentage < 100 OR s.ProfileCompletionPercentage IS NULL) THEN 1 ELSE 0 END) AS PendingProfileCompletion,
                            SUM(CASE WHEN s.ProfileStatus IN ('LinkSent', 'PendingLink') OR s.ProfileStatus IS NULL THEN 1 ELSE 0 END) AS Pending,
                            SUM(CASE WHEN s.ProfileStatus = 'InProgress' THEN 1 ELSE 0 END) AS InProgress,
                            SUM(CASE WHEN s.ProfileStatus = 'NeedsCorrection' THEN 1 ELSE 0 END) AS NeedsCorrection,
                            SUM(CASE WHEN s.ProfileStatus = 'Submitted' THEN 1 ELSE 0 END) AS Submitted
                        FROM `Staff` s
                        WHERE s.IsDeleted = 0
                          AND (@boardId IS NULL OR @boardId <= 0 OR s.BoardId = @boardId)
                          AND (@campusId IS NULL OR @campusId <= 0 OR s.CampusId = @campusId);";

                    var stats = await Connection.QueryFirstOrDefaultAsync<StaffDashboardStatsDto>(sql, new { boardId, campusId });
                    if (stats != null) return stats;
                }
                catch { }
            }

            return new StaffDashboardStatsDto();
        }

        public async Task<Staff> AddAsync(Staff staff)
        {
            try
            {
                var p = new DynamicParameters();
                p.Add("p_EmployeeId", staff.EmployeeId);
                p.Add("p_FirstName", staff.FirstName);
                p.Add("p_MiddleName", staff.MiddleName);
                p.Add("p_LastName", staff.LastName);
                p.Add("p_FatherOrHusbandName", staff.FatherOrHusbandName);
                p.Add("p_Gender", staff.Gender);
                p.Add("p_DateOfBirth", staff.DateOfBirth);
                p.Add("p_MaritalStatus", staff.MaritalStatus);
                p.Add("p_Nationality", staff.Nationality ?? "Indian");
                p.Add("p_Aadhaar", staff.Aadhaar);
                p.Add("p_PanNumber", staff.PanNumber);
                p.Add("p_Mobile", staff.Mobile);
                p.Add("p_AlternateMobile", staff.AlternateMobile);
                p.Add("p_Email", staff.Email);
                p.Add("p_BloodGroup", staff.BloodGroup);
                p.Add("p_CurrentAddress", staff.CurrentAddress);
                p.Add("p_PermanentAddress", staff.PermanentAddress);
                p.Add("p_City", staff.City);
                p.Add("p_District", staff.District);
                p.Add("p_State", staff.State);
                p.Add("p_Pincode", staff.Pincode);
                p.Add("p_Country", staff.Country ?? "India");
                p.Add("p_Qualification", staff.Qualification);
                p.Add("p_Designation", staff.Designation);
                p.Add("p_DesignationId", staff.DesignationId);
                p.Add("p_StaffType", staff.StaffType);
                p.Add("p_DepartmentId", staff.DepartmentId);
                p.Add("p_BoardId", staff.BoardId);
                p.Add("p_JoiningDate", staff.JoiningDate);
                p.Add("p_Experience", staff.Experience);
                p.Add("p_EmploymentType", staff.EmploymentType ?? "Full Time");
                p.Add("p_Status", staff.Status ?? "Active");
                p.Add("p_PhotoPath", staff.PhotoPath);
                p.Add("p_ProfileStatus", staff.ProfileStatus ?? "PendingLink");
                p.Add("p_ProfileCompletionPercentage", staff.ProfileCompletionPercentage);
                p.Add("p_EducationJson", staff.EducationJson);
                p.Add("p_ExperienceJson", staff.ExperienceJson);
                p.Add("p_DocumentsJson", staff.DocumentsJson);
                p.Add("p_BankDetailsJson", staff.BankDetailsJson);
                p.Add("p_EmergencyContactJson", staff.EmergencyContactJson);
                p.Add("p_Id", dbType: DbType.Int32, direction: ParameterDirection.Output);

                await Connection.ExecuteAsync("sp_CreateStaff", p, commandType: CommandType.StoredProcedure);
                int generatedId = p.Get<int>("p_Id");
                if (generatedId > 0)
                {
                    staff.Id = generatedId;
                    return staff;
                }
            }
            catch
            {
                try
                {
                    var id = await Connection.ExecuteScalarAsync<int>("sp_CreateStaff", new
                    {
                        p_EmployeeId = staff.EmployeeId,
                        p_FirstName = staff.FirstName,
                        p_LastName = staff.LastName,
                        p_Gender = staff.Gender,
                        p_DateOfBirth = staff.DateOfBirth,
                        p_Aadhaar = staff.Aadhaar,
                        p_Mobile = staff.Mobile,
                        p_Email = staff.Email,
                        p_BloodGroup = staff.BloodGroup,
                        p_Qualification = staff.Qualification,
                        p_Designation = staff.Designation,
                        p_DesignationId = staff.DesignationId,
                        p_StaffType = staff.StaffType,
                        p_DepartmentId = staff.DepartmentId,
                        p_JoiningDate = staff.JoiningDate,
                        p_Experience = staff.Experience,
                        p_Status = staff.Status,
                        p_PhotoPath = staff.PhotoPath
                    }, commandType: CommandType.StoredProcedure);

                    if (id > 0)
                    {
                        staff.Id = id;
                        return staff;
                    }
                }
                catch { }
            }

            _context.Staffs.Add(staff);
            await _context.SaveChangesAsync();
            return staff;
        }

        public async Task AddRangeAsync(IEnumerable<Staff> staffs)
        {
            _context.Staffs.AddRange(staffs);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Staff staff)
        {
            staff.UpdatedAt = DateTime.UtcNow;

            try
            {
                var p = new DynamicParameters();
                p.Add("p_Id", staff.Id);
                p.Add("p_EmployeeId", staff.EmployeeId);
                p.Add("p_FirstName", staff.FirstName);
                p.Add("p_MiddleName", staff.MiddleName);
                p.Add("p_LastName", staff.LastName);
                p.Add("p_FatherOrHusbandName", staff.FatherOrHusbandName);
                p.Add("p_Gender", staff.Gender);
                p.Add("p_DateOfBirth", staff.DateOfBirth);
                p.Add("p_MaritalStatus", staff.MaritalStatus);
                p.Add("p_Nationality", staff.Nationality ?? "Indian");
                p.Add("p_Aadhaar", staff.Aadhaar);
                p.Add("p_PanNumber", staff.PanNumber);
                p.Add("p_Mobile", staff.Mobile);
                p.Add("p_AlternateMobile", staff.AlternateMobile);
                p.Add("p_Email", staff.Email);
                p.Add("p_BloodGroup", staff.BloodGroup);
                p.Add("p_CurrentAddress", staff.CurrentAddress);
                p.Add("p_PermanentAddress", staff.PermanentAddress);
                p.Add("p_City", staff.City);
                p.Add("p_District", staff.District);
                p.Add("p_State", staff.State);
                p.Add("p_Pincode", staff.Pincode);
                p.Add("p_Country", staff.Country ?? "India");
                p.Add("p_Qualification", staff.Qualification);
                p.Add("p_Designation", staff.Designation);
                p.Add("p_DesignationId", staff.DesignationId);
                p.Add("p_StaffType", staff.StaffType);
                p.Add("p_DepartmentId", staff.DepartmentId);
                p.Add("p_BoardId", staff.BoardId);
                p.Add("p_JoiningDate", staff.JoiningDate);
                p.Add("p_Experience", staff.Experience);
                p.Add("p_EmploymentType", staff.EmploymentType ?? "Full Time");
                p.Add("p_Status", staff.Status ?? "Active");
                p.Add("p_PhotoPath", staff.PhotoPath);
                p.Add("p_ProfileStatus", staff.ProfileStatus ?? "PendingLink");
                p.Add("p_ProfileCompletionPercentage", staff.ProfileCompletionPercentage);
                p.Add("p_EducationJson", staff.EducationJson);
                p.Add("p_ExperienceJson", staff.ExperienceJson);
                p.Add("p_DocumentsJson", staff.DocumentsJson);
                p.Add("p_BankDetailsJson", staff.BankDetailsJson);
                p.Add("p_EmergencyContactJson", staff.EmergencyContactJson);

                await Connection.ExecuteAsync("sp_UpdateStaff", p, commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
                try
                {
                    await Connection.ExecuteAsync("sp_UpdateStaff", new
                    {
                        p_Id = staff.Id,
                        p_EmployeeId = staff.EmployeeId,
                        p_FirstName = staff.FirstName,
                        p_LastName = staff.LastName,
                        p_Gender = staff.Gender,
                        p_DateOfBirth = staff.DateOfBirth,
                        p_Aadhaar = staff.Aadhaar,
                        p_Mobile = staff.Mobile,
                        p_Email = staff.Email,
                        p_BloodGroup = staff.BloodGroup,
                        p_Qualification = staff.Qualification,
                        p_Designation = staff.Designation,
                        p_DesignationId = staff.DesignationId,
                        p_StaffType = staff.StaffType,
                        p_DepartmentId = staff.DepartmentId,
                        p_JoiningDate = staff.JoiningDate,
                        p_Experience = staff.Experience,
                        p_Status = staff.Status,
                        p_PhotoPath = staff.PhotoPath
                    }, commandType: CommandType.StoredProcedure);
                    return;
                }
                catch { }
            }

            _context.Staffs.Update(staff);
            await _context.SaveChangesAsync();
        }

        public async Task UpdatePhotoPathAsync(int id, string photoPath)
        {
            var cleanPath = photoPath?.Trim() ?? string.Empty;
            try
            {
                await Connection.ExecuteAsync(
                    "sp_UpdateStaffPhotoPath", 
                    new { p_Id = id, p_PhotoPath = cleanPath }, 
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
            }

            var staff = await _context.Staffs.FindAsync(id);
            if (staff != null)
            {
                staff.PhotoPath = cleanPath;
                staff.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task SoftDeleteAsync(Staff staff)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "sp_DeleteStaff", 
                    new { p_Id = staff.Id }, 
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
                try
                {
                    await Connection.ExecuteAsync(
                        "sp_SoftDeleteStaff", 
                        new { p_Id = staff.Id }, 
                        commandType: CommandType.StoredProcedure);
                    return;
                }
                catch { }
            }

            staff.IsDeleted = true;
            staff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task BulkUpdateLinkSentAsync(List<int> staffIds, DateTime sentAt, DateTime expiresAt)
        {
            if (staffIds == null || !staffIds.Any()) return;

            try
            {
                await Connection.ExecuteAsync(
                    "sp_BulkSendStaffProfileLink",
                    new
                    {
                        p_StaffIds = string.Join(",", staffIds),
                        p_SentAt = sentAt,
                        p_ExpiresAt = expiresAt
                    },
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
            }

            var staffs = await _context.Staffs.Where(s => staffIds.Contains(s.Id) && !s.IsDeleted).ToListAsync();
            foreach (var staff in staffs)
            {
                if (string.IsNullOrWhiteSpace(staff.ProfileLinkToken))
                {
                    staff.ProfileLinkToken = Guid.NewGuid().ToString("N");
                }
                staff.ProfileLinkSentAt = sentAt;
                staff.ProfileLinkExpiresAt = expiresAt;
                if (staff.ProfileStatus == "PendingLink" || string.IsNullOrWhiteSpace(staff.ProfileStatus))
                {
                    staff.ProfileStatus = "LinkSent";
                }
                staff.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        public async Task UpdateProfileStatusAsync(int staffId, string profileStatus, int completionPercentage, string? correctionNotes = null)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "sp_UpdateStaffProfileStatus",
                    new
                    {
                        p_StaffId = staffId,
                        p_ProfileStatus = profileStatus,
                        p_ProfileCompletionPercentage = completionPercentage,
                        p_CorrectionNotes = correctionNotes
                    },
                    commandType: CommandType.StoredProcedure);
                return;
            }
            catch
            {
            }

            var staff = await _context.Staffs.FindAsync(staffId);
            if (staff != null)
            {
                staff.ProfileStatus = profileStatus;
                staff.ProfileCompletionPercentage = completionPercentage;
                if (correctionNotes != null)
                {
                    staff.CorrectionNotes = correctionNotes;
                    staff.CorrectionRequestedAt = DateTime.UtcNow;
                }
                if (profileStatus == "Submitted")
                {
                    staff.SubmittedAt = DateTime.UtcNow;
                }
                else if (profileStatus == "Completed" || profileStatus == "Approved")
                {
                    staff.ApprovedAt = DateTime.UtcNow;
                }
                staff.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}
