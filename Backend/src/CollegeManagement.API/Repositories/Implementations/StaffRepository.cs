using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

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
        private IDbTransaction? CurrentTransaction => _context.Database.CurrentTransaction?.GetDbTransaction();

        public async Task<Staff?> GetByIdAsync(int id)
        {
            try
            {
                var staff = await _context.Staffs
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

                if (staff != null)
                {
                    if (staff.BoardRef != null && string.IsNullOrWhiteSpace(staff.BoardName))
                    {
                        staff.BoardName = staff.BoardRef.BoardName;
                    }
                    return staff;
                }
            }
            catch
            {
                // Fallback to Dapper SP if EF Core experiences issues
            }

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
            }

            return null;
        }

        public async Task<Staff?> GetByEmployeeIdAsync(string employeeId)
        {
            if (string.IsNullOrWhiteSpace(employeeId)) return null;
            var cleanEmpId = employeeId.Trim();

            try
            {
                var staff = await _context.Staffs
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

                if (staff != null)
                {
                    if (staff.BoardRef != null && string.IsNullOrWhiteSpace(staff.BoardName))
                    {
                        staff.BoardName = staff.BoardRef.BoardName;
                    }
                    return staff;
                }
            }
            catch
            {
            }

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

            return null;
        }

        public async Task<Staff?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var cleanEmail = email.Trim();

            try
            {
                var staff = await _context.Staffs
                    .Include(s => s.DepartmentRef)
                    .Include(s => s.DesignationRef)
                    .Include(s => s.BoardRef)
                    .Include(s => s.StaffSubjectAllocations)
                        .ThenInclude(ssa => ssa.Subject)
                    .Include(s => s.StaffCampusAssignments)
                        .ThenInclude(sca => sca.Campus)
                    .Include(s => s.StaffBoardAssignments)
                        .ThenInclude(sba => sba.Board)
                    .FirstOrDefaultAsync(s => s.Email == cleanEmail && !s.IsDeleted);

                if (staff != null)
                {
                    if (staff.BoardRef != null && string.IsNullOrWhiteSpace(staff.BoardName))
                    {
                        staff.BoardName = staff.BoardRef.BoardName;
                    }
                    return staff;
                }
            }
            catch
            {
            }

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

            return null;
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
                .Include(s => s.StaffCampusAssignments)
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
            if (string.IsNullOrWhiteSpace(employeeId)) return true;
            var cleanEmpId = employeeId.Trim();
            var query = _context.Staffs.AsNoTracking().Where(s => s.EmployeeId == cleanEmpId && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsEmailUniqueAsync(string email, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(email)) return true;
            var cleanEmail = email.Trim();
            var query = _context.Staffs.AsNoTracking().Where(s => s.Email == cleanEmail && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsMobileUniqueAsync(string mobile, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(mobile)) return true;
            var cleanMobile = mobile.Trim();
            var query = _context.Staffs.AsNoTracking().Where(s => s.Mobile == cleanMobile && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return true;
            var cleanAadhaar = aadhaar.Trim();
            var query = _context.Staffs.AsNoTracking().Where(s => s.Aadhaar == cleanAadhaar && !s.IsDeleted);
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            return !await query.AnyAsync();
        }

        public async Task<Staff?> GetByDrivingLicenseAsync(string drivingLicense, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(drivingLicense)) return null;
            var cleanDl = Regex.Replace(drivingLicense.Trim().ToUpperInvariant(), @"[-/\s]", "");
            var query = _context.Staffs.AsNoTracking()
                .Where(s => !s.IsDeleted && s.DrivingLicenseNumber != null && s.DrivingLicenseNumber != "");
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }
            var list = await query.ToListAsync();
            return list.FirstOrDefault(s => Regex.Replace(s.DrivingLicenseNumber!.Trim().ToUpperInvariant(), @"[-/\s]", "") == cleanDl);
        }

        public async Task<bool> IsDrivingLicenseUniqueAsync(string drivingLicense, int? excludeId = null)
        {
            if (string.IsNullOrWhiteSpace(drivingLicense)) return true;
            var existing = await GetByDrivingLicenseAsync(drivingLicense, excludeId);
            return existing == null;
        }


        public async Task<(List<Staff> Items, int TotalCount)> GetPagedStaffAsync(StaffQueryParams queryParams)
        {
            int pageNumber = queryParams.PageNumber < 1 ? 1 : queryParams.PageNumber;
            int pageSize = queryParams.PageSize < 1 ? 5 : queryParams.PageSize;

            var query = _context.Staffs
                .AsNoTracking()
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .Include(s => s.BoardRef)
                .Include(s => s.Campus)
                .Include(s => s.TransferredFromCampus)
                .Include(s => s.TransferredToCampus)
                .Include(s => s.StaffCampusAssignments)
                    .ThenInclude(a => a.Campus)
                .Include(s => s.StaffBoardAssignments)
                    .ThenInclude(b => b.Board)
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

            // 4.1 Campus filter - Include currently assigned staff as well as transferred / past assigned staff
            if (queryParams.CampusId.HasValue && queryParams.CampusId.Value > 0)
            {
                var cid = queryParams.CampusId.Value;
                query = query.Where(s => 
                    s.CampusId == cid ||
                    s.TransferredFromCampusId == cid ||
                    s.StaffCampusAssignments.Any(a => a.CampusId == cid));
            }

            // 4.2 IsDriver filter
            if (queryParams.IsDriver.HasValue)
            {
                query = query.Where(s => s.IsDriver == queryParams.IsDriver.Value);
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
                    query = query.Where(s => s.StaffType != null && s.StaffType != "" &&
                        (s.StaffType.ToLower().Contains("non") || !s.StaffType.ToLower().Contains("teach")));
                }
                else if (st.Equals("Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.StaffType == "Teaching" || 
                        (s.StaffType != null && s.StaffType.ToLower().Contains("teach") && !s.StaffType.ToLower().Contains("non")) || 
                        s.StaffType == null || s.StaffType == "");
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
                var conn = Connection;
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();
                var parameters = new DynamicParameters();
                parameters.Add("p_SeriesCode", seriesCode, DbType.String);
                parameters.Add("p_CampusId", campusId, DbType.Int32);
                parameters.Add("p_BaseSeriesCode", seriesCode, DbType.String);

                var config = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "sp_GenerateNextNumberSeries",
                    parameters,
                    transaction: CurrentTransaction,
                    commandType: CommandType.StoredProcedure);

                if (config != null && !string.IsNullOrWhiteSpace(config.FormatPattern))
                {
                    nextId = NumberSeriesPatternEvaluator.Evaluate(
                        pattern: config.FormatPattern,
                        sequenceNumber: config.CurrentSequence,
                        numberLength: config.NumberLength,
                        prefix: config.Prefix,
                        isPreview: false);
                }
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(nextId))
            {
                var prefix = isTeaching ? "PCTCH" : "PCNT";
                try
                {
                    var conn = Connection;
                    if (conn.State != System.Data.ConnectionState.Open) await _context.Database.OpenConnectionAsync();

                    // Ensure sequence row exists atomically
                    await conn.ExecuteAsync(
                        @"INSERT INTO `NumberSeriesConfigurations` 
                          (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
                          SELECT @sCode, @sName, @pfx, '{PREFIX}{SEQ}', 4, 1, 0, @cId, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
                          FROM DUAL
                          WHERE NOT EXISTS (SELECT 1 FROM `NumberSeriesConfigurations` WHERE `SeriesCode` = @sCode AND (`CampusId` = @cId OR `CampusId` IS NULL));",
                        new { sCode = seriesCode, sName = isTeaching ? "Teaching Staff ID" : "Non-Teaching Staff ID", pfx = prefix, cId = campusId }, transaction: CurrentTransaction);

                    // Atomic increment with LAST_INSERT_ID
                    var seq = await conn.QuerySingleOrDefaultAsync<int>(
                        @"UPDATE `NumberSeriesConfigurations` 
                          SET `CurrentSequence` = LAST_INSERT_ID(CASE WHEN `CurrentSequence` < `StartNumber` THEN `StartNumber` ELSE `CurrentSequence` + 1 END),
                              `UpdatedAt` = UTC_TIMESTAMP()
                          WHERE `SeriesCode` = @sCode AND (`CampusId` = @cId OR `CampusId` IS NULL)
                          ORDER BY `CampusId` DESC LIMIT 1;
                          SELECT LAST_INSERT_ID();",
                        new { sCode = seriesCode, cId = campusId }, transaction: CurrentTransaction);

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
                var query = _context.Staffs
                    .AsNoTracking()
                    .Include(s => s.StaffCampusAssignments)
                    .Where(s => !s.IsDeleted);

                if (boardId.HasValue && boardId.Value > 0)
                {
                    query = query.Where(s => s.BoardId == boardId.Value || s.BoardId == null);
                }

                if (campusId.HasValue && campusId.Value > 0)
                {
                    var cid = campusId.Value;
                    query = query.Where(s => 
                        (s.CampusId == cid && !s.StaffCampusAssignments.Any(a => a.CampusId == cid && a.Status == "TransferredOut")) ||
                        s.StaffCampusAssignments.Any(a => a.CampusId == cid && a.IsActive && a.Status == "Active"));
                }

                var allStaff = await query.ToListAsync();
                // Filter strictly by Active status (matching Staff Management module)
                var activeStaff = allStaff.Where(s => string.IsNullOrEmpty(s.Status) || string.Equals(s.Status, "Active", StringComparison.OrdinalIgnoreCase)).ToList();

                var teachingStaff = activeStaff.Count(s =>
                    string.Equals(s.StaffType?.Trim(), "Teaching", StringComparison.OrdinalIgnoreCase) ||
                    (s.StaffType != null && s.StaffType.ToLowerInvariant().Contains("teach") && !s.StaffType.ToLowerInvariant().Contains("non"))
                );
                var nonTeachingStaff = activeStaff.Count(s =>
                    string.Equals(s.StaffType?.Trim(), "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.StaffType?.Trim(), "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                    (s.StaffType != null && s.StaffType.ToLowerInvariant().Contains("non"))
                );
                var totalStaff = teachingStaff + nonTeachingStaff;
                
                var completedCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "Completed", StringComparison.OrdinalIgnoreCase) || string.Equals(s.ProfileStatus, "Approved", StringComparison.OrdinalIgnoreCase));
                var pendingCount = totalStaff - completedCount;

                var inProgressCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "InProgress", StringComparison.OrdinalIgnoreCase));
                var needsCorrectionCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "NeedsCorrection", StringComparison.OrdinalIgnoreCase));
                var submittedCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "Submitted", StringComparison.OrdinalIgnoreCase));
                var linkSentCount = activeStaff.Count(s => string.Equals(s.ProfileStatus, "LinkSent", StringComparison.OrdinalIgnoreCase) || string.Equals(s.ProfileStatus, "PendingLink", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(s.ProfileStatus));

                return new StaffDashboardStatsDto
                {
                    TotalStaff = totalStaff,
                    TotalCount = totalStaff,
                    TeachingStaff = teachingStaff,
                    NonTeachingStaff = nonTeachingStaff,
                    PendingProfileCompletion = pendingCount,
                    CompletedProfiles = completedCount,
                    
                    Completed = completedCount,
                    Pending = linkSentCount,
                    InProgress = inProgressCount,
                    NeedsCorrection = needsCorrectionCount,
                    Submitted = submittedCount
                };
            }
            catch
            {
                return new StaffDashboardStatsDto();
            }
        }

        public async Task<Staff> AddAsync(Staff staff)
        {
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
            if (string.IsNullOrWhiteSpace(staff.ProfileStatus)) staff.ProfileStatus = "PendingLink";
            if (string.IsNullOrWhiteSpace(staff.Qualification)) staff.Qualification = "Not Specified";
            if (string.IsNullOrWhiteSpace(staff.Designation)) staff.Designation = "Lecturer";
            if (string.IsNullOrWhiteSpace(staff.Status)) staff.Status = "Active";
            if (string.IsNullOrWhiteSpace(staff.StaffType)) staff.StaffType = "Teaching";
            if (string.IsNullOrWhiteSpace(staff.Nationality)) staff.Nationality = "Indian";

            _context.Staffs.Update(staff);
            await _context.SaveChangesAsync();
        }

                public async Task<string?> GetOfferLetterPathAsync(int id)
        {
            var staff = await _context.Staffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
            return staff?.OfferLetterPath;
        }

        public async Task UpdateOfferLetterPathAsync(int id, string offerLetterPath)
        {
            await UpdateOfferLetterInfoAsync(id, offerLetterPath, string.Empty);
        }

        public async Task UpdateOfferLetterInfoAsync(int id, string offerLetterPath, string offerLetterNumber)
        {
            var cleanPath = offerLetterPath?.Trim() ?? string.Empty;
            var cleanNo = offerLetterNumber?.Trim() ?? string.Empty;
            var staff = await _context.Staffs.FindAsync(id);
            if (staff != null)
            {
                staff.OfferLetterPath = cleanPath;
                if (!string.IsNullOrWhiteSpace(cleanNo))
                {
                    staff.OfferLetterNumber = cleanNo;
                }
                staff.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdatePhotoPathAsync(int id, string photoPath)
        {
            var cleanPath = photoPath?.Trim() ?? string.Empty;
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
            staff.IsDeleted = true;
            staff.UpdatedAt = DateTime.UtcNow;
            _context.Staffs.Update(staff);
            await _context.SaveChangesAsync();
        }

        public async Task BulkUpdateLinkSentAsync(List<int> staffIds, DateTime sentAt, DateTime expiresAt)
        {
            if (staffIds == null || !staffIds.Any()) return;

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
