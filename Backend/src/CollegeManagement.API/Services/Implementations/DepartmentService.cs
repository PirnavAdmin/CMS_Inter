using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Implementations
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IDesignationRepository _designationRepository;

        public DepartmentService(
            IDepartmentRepository departmentRepository,
            IDesignationRepository designationRepository)
        {
            _departmentRepository = departmentRepository;
            _designationRepository = designationRepository;
        }

        public async Task<IEnumerable<DepartmentResponseDto>> GetActiveDepartmentsAsync()
        {
            return await GetDepartmentsAsync(null, includeInactive: false);
        }

        public async Task<IEnumerable<DepartmentResponseDto>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true)
        {
            return await _departmentRepository.GetDepartmentDtosAsync(staffType, includeInactive);
        }

        public async Task<DepartmentResponseDto?> GetByIdAsync(int id)
        {
            return await _departmentRepository.GetDtoByIdAsync(id);
        }

        public async Task<DepartmentResponseDto> CreateDepartmentAsync(CreateDepartmentDto dto)
        {
            var dept = new Department
            {
                DepartmentName = dto.DepartmentName.Trim(),
                DepartmentCode = !string.IsNullOrWhiteSpace(dto.DepartmentCode) ? dto.DepartmentCode.Trim() : $"DEP_{dto.DepartmentName.Trim().ToUpper().Replace(" ", "_")}",
                StaffType = dto.StaffType ?? "Both",
                Description = dto.Description,
                IsActive = dto.IsActive
            };

            var created = await _departmentRepository.AddDepartmentAsync(dept);
            return new DepartmentResponseDto
            {
                DepartmentId = created.DepartmentId,
                DepartmentName = created.DepartmentName,
                DepartmentCode = created.DepartmentCode,
                StaffType = created.StaffType,
                Description = created.Description,
                IsActive = created.IsActive,
                DesignationCount = 0,
                StaffCount = 0,
                CreatedAt = created.CreatedAt,
                UpdatedAt = created.UpdatedAt
            };
        }

        public async Task<DepartmentResponseDto?> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto)
        {
            var existing = await _departmentRepository.GetByIdAsync(id);
            if (existing == null) return null;

            existing.DepartmentName = dto.DepartmentName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.DepartmentCode))
            {
                existing.DepartmentCode = dto.DepartmentCode.Trim();
            }
            existing.StaffType = dto.StaffType ?? "Both";
            existing.Description = dto.Description;
            existing.IsActive = dto.IsActive;

            var updated = await _departmentRepository.UpdateDepartmentAsync(existing);
            if (updated == null) return null;

            var deps = await _departmentRepository.GetDependenciesAsync(id);
            return new DepartmentResponseDto
            {
                DepartmentId = updated.DepartmentId,
                DepartmentName = updated.DepartmentName,
                DepartmentCode = updated.DepartmentCode,
                StaffType = updated.StaffType,
                Description = updated.Description,
                IsActive = updated.IsActive,
                DesignationCount = deps.DesignationCount,
                StaffCount = deps.StaffCount,
                CreatedAt = updated.CreatedAt,
                UpdatedAt = updated.UpdatedAt
            };
        }

        public async Task<(bool Success, string Message)> DeleteDepartmentAsync(int id)
        {
            var dept = await _departmentRepository.GetByIdAsync(id);
            if (dept == null)
            {
                return (false, $"Department with ID {id} not found.");
            }

            var (hasDependencies, designationCount, staffCount) = await _departmentRepository.GetDependenciesAsync(id);
            if (hasDependencies)
            {
                return (false, $"Cannot delete department '{dept.DepartmentName}' because it has {designationCount} active designation(s) and {staffCount} assigned staff member(s).");
            }

            var deleted = await _departmentRepository.DeleteDepartmentAsync(id);
            if (!deleted)
            {
                return (false, "Failed to delete department.");
            }

            return (true, "Department deleted successfully.");
        }

        public async Task<DepartmentSummaryDto> GetSummaryAsync()
        {
            return await _departmentRepository.GetSummaryAsync();
        }

        public async Task<bool> ValidateCodeAsync(string code, int? excludeId = null)
        {
            return await _departmentRepository.ValidateCodeAsync(code, excludeId);
        }

        public async Task<bool> ValidateNameAsync(string name, int? excludeId = null)
        {
            return await _departmentRepository.ValidateNameAsync(name, excludeId);
        }

        public async Task<MasterImportResultDto> ImportDepartmentsFromExcelAsync(IFormFile file, string? defaultStaffType = null)
        {
            return await ImportDepartmentsAndDesignationsFromExcelAsync(file, defaultStaffType);
        }

        public async Task<MasterImportResultDto> ImportDepartmentsAndDesignationsFromExcelAsync(IFormFile file, string? defaultStaffType = null)
        {
            if (file == null || file.Length == 0)
                throw new ValidationException("Please upload a valid Excel file (.xlsx or .xls).");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new ValidationException("Unsupported file format. Please upload an Excel workbook (.xlsx or .xls).");

            var result = new MasterImportResultDto();
            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);

            if (!workbook.Worksheets.Any())
                throw new ValidationException("Excel file contains no worksheets.");

            var existingDepts = (await _departmentRepository.GetDepartmentsAsync(includeInactive: true)).ToList();
            var existingDesigs = (await _designationRepository.GetAllAsync(includeInactive: true)).ToList();

            // In-memory lookup maps for resolving department references during designation import
            var resolvedDeptsByName = new Dictionary<string, Department>(StringComparer.OrdinalIgnoreCase);
            var resolvedDeptsByCode = new Dictionary<string, Department>(StringComparer.OrdinalIgnoreCase);

            foreach (var d in existingDepts)
            {
                if (!string.IsNullOrWhiteSpace(d.DepartmentName) && !resolvedDeptsByName.ContainsKey(d.DepartmentName.Trim()))
                    resolvedDeptsByName[d.DepartmentName.Trim()] = d;
                if (!string.IsNullOrWhiteSpace(d.DepartmentCode) && !resolvedDeptsByCode.ContainsKey(d.DepartmentCode.Trim()))
                    resolvedDeptsByCode[d.DepartmentCode.Trim()] = d;
            }

            // Identify worksheets: Departments and Designations
            var deptSheet = workbook.Worksheets.FirstOrDefault(ws =>
                ws.Name.Equals("Departments", StringComparison.OrdinalIgnoreCase) ||
                ws.Name.Equals("Department", StringComparison.OrdinalIgnoreCase) ||
                ws.Name.Equals("Dept", StringComparison.OrdinalIgnoreCase))
                ?? (workbook.Worksheets.Count == 1 ? workbook.Worksheets.First() : null);

            var desigSheet = workbook.Worksheets.FirstOrDefault(ws =>
                ws.Name.Equals("Designations", StringComparison.OrdinalIgnoreCase) ||
                ws.Name.Equals("Designation", StringComparison.OrdinalIgnoreCase) ||
                ws.Name.Equals("Desig", StringComparison.OrdinalIgnoreCase));

            // Helper to build header index map
            Dictionary<string, int> BuildHeaderMap(IXLRangeRow headerRow)
            {
                var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                int maxCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? headerRow.Cells().Count();
                for (int col = 1; col <= maxCol; col++)
                {
                    var val = headerRow.Cell(col).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(val) && !map.ContainsKey(val))
                    {
                        map[val] = col;
                    }
                }
                return map;
            }

            string GetCellValue(IXLRangeRow row, Dictionary<string, int> map, params string[] names)
            {
                foreach (var name in names)
                {
                    if (map.TryGetValue(name, out int colIdx))
                    {
                        var cellVal = row.Cell(colIdx).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(cellVal)) return cellVal;
                    }
                }
                return string.Empty;
            }

            var seenDeptNamesInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var seenDesigKeysInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // =========================================================================
            // 1. PROCESS DEPARTMENTS SHEET
            // =========================================================================
            if (deptSheet != null)
            {
                var deptRows = deptSheet.RangeUsed()?.RowsUsed()?.ToList();
                if (deptRows != null && deptRows.Count >= 2)
                {
                    var deptHeaderMap = BuildHeaderMap(deptRows[0]);
                    int deptRowCount = deptRows.Count - 1;
                    result.TotalRowsRead += deptRowCount;

                    for (int i = 1; i < deptRows.Count; i++)
                    {
                        var rowNumber = i + 1;
                        var row = deptRows[i];

                        var deptName = GetCellValue(row, deptHeaderMap, "Department Name", "DepartmentName", "Name", "Department", "Dept Name", "DeptName");
                        var deptCode = GetCellValue(row, deptHeaderMap, "Department Code", "DepartmentCode", "Code", "Dept Code", "DeptCode");
                        var shortName = GetCellValue(row, deptHeaderMap, "Short Name", "ShortName", "Short");
                        var desc = GetCellValue(row, deptHeaderMap, "Description", "Desc");
                        var sType = GetCellValue(row, deptHeaderMap, "Staff Type", "StaffType", "Staff_Type", "Type");
                        var status = GetCellValue(row, deptHeaderMap, "Status", "IsActive", "Active");

                        // Skip completely blank rows
                        if (string.IsNullOrWhiteSpace(deptName) && string.IsNullOrWhiteSpace(deptCode) && string.IsNullOrWhiteSpace(sType))
                        {
                            continue;
                        }

                        if (string.IsNullOrWhiteSpace(deptName))
                        {
                            result.Errors.Add(new MasterImportRowError
                            {
                                RowNumber = rowNumber,
                                ItemName = $"Department Row {rowNumber}",
                                ErrorMessage = "Department Name is required."
                            });
                            result.FailedRowsCount++;
                            continue;
                        }

                        // Determine StaffType
                        string staffType = "Both";
                        if (!string.IsNullOrWhiteSpace(sType))
                        {
                            var clean = sType.Replace("-", "").Replace("_", "").Trim().ToLower();
                            if (clean == "teaching" || clean == "teachingstaff") staffType = "Teaching";
                            else if (clean == "nonteaching" || clean == "nonteachingstaff") staffType = "Non-Teaching";
                            else staffType = "Both";
                        }
                        else if (!string.IsNullOrWhiteSpace(defaultStaffType))
                        {
                            var clean = defaultStaffType.Replace("-", "").Replace("_", "").Trim().ToLower();
                            if (clean == "teaching" || clean == "teachingstaff") staffType = "Teaching";
                            else if (clean == "nonteaching" || clean == "nonteachingstaff") staffType = "Non-Teaching";
                            else staffType = "Both";
                        }

                        // Determine Status
                        bool isActive = true;
                        if (!string.IsNullOrWhiteSpace(status))
                        {
                            if (status.Equals("Inactive", StringComparison.OrdinalIgnoreCase) ||
                                status.Equals("0", StringComparison.OrdinalIgnoreCase) ||
                                status.Equals("false", StringComparison.OrdinalIgnoreCase))
                            {
                                isActive = false;
                            }
                        }

                        // Generate or sanitize code
                        if (string.IsNullOrWhiteSpace(deptCode))
                        {
                            deptCode = !string.IsNullOrWhiteSpace(shortName)
                                ? $"DEP_{shortName.ToUpper().Replace(" ", "_")}"
                                : $"DEP_{deptName.ToUpper().Replace(" ", "_")}";
                        }
                        if (deptCode.Length > 20) deptCode = deptCode.Substring(0, 20);

                        // Detect in-file duplicate
                        if (seenDeptNamesInFile.Contains(deptName))
                        {
                            result.DuplicateCount++;
                        }
                        seenDeptNamesInFile.Add(deptName);

                        try
                        {
                            var existing = existingDepts.FirstOrDefault(d =>
                                d.DepartmentName.Equals(deptName, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrWhiteSpace(deptCode) && d.DepartmentCode.Equals(deptCode, StringComparison.OrdinalIgnoreCase)));

                            if (existing != null)
                            {
                                existing.DepartmentName = deptName;
                                if (!string.IsNullOrWhiteSpace(deptCode)) existing.DepartmentCode = deptCode;
                                existing.StaffType = staffType;
                                if (!string.IsNullOrWhiteSpace(desc)) existing.Description = desc;
                                existing.IsActive = isActive;
                                existing.UpdatedAt = DateTime.UtcNow;

                                await _departmentRepository.UpdateDepartmentAsync(existing);
                                resolvedDeptsByName[deptName] = existing;
                                if (!string.IsNullOrWhiteSpace(deptCode)) resolvedDeptsByCode[deptCode] = existing;

                                result.UpdatedCount++;
                                result.DepartmentsImported++;
                                result.ImportedItems.Add(new { existing.DepartmentId, existing.DepartmentName, existing.DepartmentCode, existing.StaffType, Status = "Updated", Type = "Department" });
                            }
                            else
                            {
                                var newDept = new Department
                                {
                                    DepartmentName = deptName,
                                    DepartmentCode = deptCode,
                                    StaffType = staffType,
                                    Description = desc,
                                    IsActive = isActive,
                                    CreatedAt = DateTime.UtcNow
                                };

                                var created = await _departmentRepository.AddDepartmentAsync(newDept);
                                existingDepts.Add(created);
                                resolvedDeptsByName[deptName] = created;
                                if (!string.IsNullOrWhiteSpace(deptCode)) resolvedDeptsByCode[deptCode] = created;

                                result.SuccessCount++;
                                result.DepartmentsImported++;
                                result.ImportedItems.Add(new { created.DepartmentId, created.DepartmentName, created.DepartmentCode, created.StaffType, Status = "Created", Type = "Department" });
                            }
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add(new MasterImportRowError
                            {
                                RowNumber = rowNumber,
                                ItemName = deptName,
                                ErrorMessage = ex.Message
                            });
                            result.FailedRowsCount++;
                        }
                    }
                }
            }

            // =========================================================================
            // 2. PROCESS DESIGNATIONS SHEET
            // =========================================================================
            if (desigSheet != null)
            {
                var desigRows = desigSheet.RangeUsed()?.RowsUsed()?.ToList();
                if (desigRows != null && desigRows.Count >= 2)
                {
                    var desigHeaderMap = BuildHeaderMap(desigRows[0]);
                    int desigRowCount = desigRows.Count - 1;
                    result.TotalRowsRead += desigRowCount;

                    for (int i = 1; i < desigRows.Count; i++)
                    {
                        var rowNumber = i + 1;
                        var row = desigRows[i];

                        var desigName = GetCellValue(row, desigHeaderMap, "Designation Name", "DesignationName", "Name", "Title", "Designation");
                        var deptRef = GetCellValue(row, desigHeaderMap, "Department Name", "DepartmentName", "Department", "Department Code", "DepartmentCode", "Dept");
                        var sType = GetCellValue(row, desigHeaderMap, "Staff Type", "StaffType", "Staff_Type", "Type");
                        var status = GetCellValue(row, desigHeaderMap, "Status", "IsActive", "Active");

                        // Skip completely blank rows
                        if (string.IsNullOrWhiteSpace(desigName) && string.IsNullOrWhiteSpace(deptRef) && string.IsNullOrWhiteSpace(sType))
                        {
                            continue;
                        }

                        if (string.IsNullOrWhiteSpace(desigName))
                        {
                            result.Errors.Add(new MasterImportRowError
                            {
                                RowNumber = rowNumber,
                                ItemName = $"Designation Row {rowNumber}",
                                ErrorMessage = "Designation Name is required."
                            });
                            result.FailedRowsCount++;
                            continue;
                        }

                        // Resolve Department reference
                        int? deptId = null;
                        string matchedDeptStaffType = string.Empty;

                        if (!string.IsNullOrWhiteSpace(deptRef))
                        {
                            Department? matchedDept = null;
                            if (resolvedDeptsByName.TryGetValue(deptRef, out var foundByName))
                            {
                                matchedDept = foundByName;
                            }
                            else if (resolvedDeptsByCode.TryGetValue(deptRef, out var foundByCode))
                            {
                                matchedDept = foundByCode;
                            }
                            else
                            {
                                matchedDept = existingDepts.FirstOrDefault(d =>
                                    d.DepartmentName.Equals(deptRef, StringComparison.OrdinalIgnoreCase) ||
                                    d.DepartmentCode.Equals(deptRef, StringComparison.OrdinalIgnoreCase));
                            }

                            if (matchedDept != null)
                            {
                                deptId = matchedDept.DepartmentId;
                                matchedDeptStaffType = matchedDept.StaffType;
                            }
                            else
                            {
                                result.Errors.Add(new MasterImportRowError
                                {
                                    RowNumber = rowNumber,
                                    ItemName = desigName,
                                    ErrorMessage = $"Department '{deptRef}' does not exist for Designation '{desigName}'."
                                });
                                result.FailedRowsCount++;
                                continue;
                            }
                        }

                        // Determine StaffType
                        string staffType = "Both";
                        if (!string.IsNullOrWhiteSpace(sType))
                        {
                            var clean = sType.Replace("-", "").Replace("_", "").Trim().ToLower();
                            if (clean == "teaching" || clean == "teachingstaff") staffType = "Teaching";
                            else if (clean == "nonteaching" || clean == "nonteachingstaff") staffType = "Non-Teaching";
                            else staffType = "Both";
                        }
                        else if (!string.IsNullOrWhiteSpace(matchedDeptStaffType))
                        {
                            staffType = matchedDeptStaffType;
                        }
                        else if (!string.IsNullOrWhiteSpace(defaultStaffType))
                        {
                            var clean = defaultStaffType.Replace("-", "").Replace("_", "").Trim().ToLower();
                            if (clean == "teaching" || clean == "teachingstaff") staffType = "Teaching";
                            else if (clean == "nonteaching" || clean == "nonteachingstaff") staffType = "Non-Teaching";
                            else staffType = "Both";
                        }

                        // Determine Status
                        bool isActive = true;
                        if (!string.IsNullOrWhiteSpace(status))
                        {
                            if (status.Equals("Inactive", StringComparison.OrdinalIgnoreCase) ||
                                status.Equals("0", StringComparison.OrdinalIgnoreCase) ||
                                status.Equals("false", StringComparison.OrdinalIgnoreCase))
                            {
                                isActive = false;
                            }
                        }

                        // In-file duplicate check
                        string desigKey = $"{desigName}_{deptId}";
                        if (seenDesigKeysInFile.Contains(desigKey))
                        {
                            result.DuplicateCount++;
                        }
                        seenDesigKeysInFile.Add(desigKey);

                        try
                        {
                            var existing = existingDesigs.FirstOrDefault(d =>
                                d.Name.Equals(desigName, StringComparison.OrdinalIgnoreCase) &&
                                (deptId == null || d.DepartmentId == null || d.DepartmentId == deptId));

                            if (existing != null)
                            {
                                existing.Name = desigName;
                                if (deptId.HasValue && deptId.Value > 0) existing.DepartmentId = deptId.Value;
                                existing.StaffType = staffType;
                                existing.IsActive = isActive;
                                existing.UpdatedAt = DateTime.UtcNow;

                                await _designationRepository.UpdateAsync(existing);
                                result.UpdatedCount++;
                                result.DesignationsImported++;
                                result.ImportedItems.Add(new { existing.Id, existing.Name, existing.StaffType, existing.DepartmentId, Status = "Updated", Type = "Designation" });
                            }
                            else
                            {
                                var newDesig = new Designation
                                {
                                    Name = desigName,
                                    DepartmentId = deptId,
                                    StaffType = staffType,
                                    IsActive = isActive,
                                    CreatedAt = DateTime.UtcNow
                                };

                                var created = await _designationRepository.AddAsync(newDesig);
                                existingDesigs.Add(created);
                                result.SuccessCount++;
                                result.DesignationsImported++;
                                result.ImportedItems.Add(new { created.Id, created.Name, created.StaffType, created.DepartmentId, Status = "Created", Type = "Designation" });
                            }
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add(new MasterImportRowError
                            {
                                RowNumber = rowNumber,
                                ItemName = desigName,
                                ErrorMessage = ex.Message
                            });
                            result.FailedRowsCount++;
                        }
                    }
                }
            }

            result.Success = result.Errors.Count == 0;
            result.Message = $"Bulk import completed: {result.SuccessCount} created, {result.UpdatedCount} updated, {result.DuplicateCount} duplicates, {result.FailedRowsCount} failed ({result.DepartmentsImported} departments, {result.DesignationsImported} designations).";
            return result;
        }

        public async Task<MasterImportResultDto> BulkImportDepartmentsAsync(IEnumerable<CreateDepartmentDto> dtos, string? defaultStaffType = null)
        {
            var result = new MasterImportResultDto();
            var list = dtos?.ToList() ?? new List<CreateDepartmentDto>();
            result.TotalRowsRead = list.Count;

            var existingDepts = (await _departmentRepository.GetDepartmentsAsync(includeInactive: true)).ToList();
            int idx = 0;

            foreach (var dto in list)
            {
                idx++;
                if (string.IsNullOrWhiteSpace(dto.DepartmentName))
                {
                    result.Errors.Add(new MasterImportRowError { RowNumber = idx, ItemName = "Item " + idx, ErrorMessage = "Department name is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                var deptName = dto.DepartmentName.Trim();
                var deptCode = !string.IsNullOrWhiteSpace(dto.DepartmentCode)
                    ? dto.DepartmentCode.Trim()
                    : $"DEP_{deptName.ToUpper().Replace(" ", "_")}";

                if (deptCode.Length > 20) deptCode = deptCode.Substring(0, 20);

                var staffType = !string.IsNullOrWhiteSpace(dto.StaffType)
                    ? dto.StaffType.Trim()
                    : (!string.IsNullOrWhiteSpace(defaultStaffType) ? defaultStaffType.Trim() : "Both");

                try
                {
                    var existing = existingDepts.FirstOrDefault(d =>
                        d.DepartmentName.Equals(deptName, StringComparison.OrdinalIgnoreCase) ||
                        d.DepartmentCode.Equals(deptCode, StringComparison.OrdinalIgnoreCase));

                    if (existing != null)
                    {
                        existing.DepartmentName = deptName;
                        existing.DepartmentCode = deptCode;
                        existing.StaffType = staffType;
                        if (!string.IsNullOrWhiteSpace(dto.Description)) existing.Description = dto.Description;
                        existing.IsActive = dto.IsActive;
                        existing.UpdatedAt = DateTime.UtcNow;

                        await _departmentRepository.UpdateDepartmentAsync(existing);
                        result.UpdatedCount++;
                        result.DepartmentsImported++;
                        result.ImportedItems.Add(new { existing.DepartmentId, existing.DepartmentName, existing.DepartmentCode, existing.StaffType, Status = "Updated" });
                    }
                    else
                    {
                        var created = await _departmentRepository.AddDepartmentAsync(new Department
                        {
                            DepartmentName = deptName,
                            DepartmentCode = deptCode,
                            StaffType = staffType,
                            Description = dto.Description,
                            IsActive = dto.IsActive,
                            CreatedAt = DateTime.UtcNow
                        });
                        existingDepts.Add(created);
                        result.SuccessCount++;
                        result.DepartmentsImported++;
                        result.ImportedItems.Add(new { created.DepartmentId, created.DepartmentName, created.DepartmentCode, created.StaffType, Status = "Created" });
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new MasterImportRowError { RowNumber = idx, ItemName = deptName, ErrorMessage = ex.Message });
                    result.FailedRowsCount++;
                }
            }

            result.Success = result.Errors.Count == 0;
            result.Message = $"Bulk department import completed: {result.SuccessCount} created, {result.UpdatedCount} updated, {result.FailedRowsCount} failed.";
            return result;
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDepartmentTemplateExcelAsync(string? staffType = null)
        {
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Departments");

            var headers = new[] { "Department Code", "Department Name", "Status" };

            for (int col = 0; col < headers.Length; col++)
            {
                var cell = ws.Cell(1, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontSize = 11;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 64, 175);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = XLColor.FromArgb(203, 213, 225);
            }
            ws.Row(1).Height = 26;

            // Sample guidance rows
            var sampleDepts = new[]
            {
                new { Code = "DEP_CSE", Name = "Computer Science and Engineering", Status = "Active" },
                new { Code = "DEP_ECE", Name = "Electronics and Communication Engineering", Status = "Active" },
                new { Code = "DEP_MEC", Name = "Mechanical Engineering", Status = "Active" }
            };

            for (int r = 0; r < sampleDepts.Length; r++)
            {
                var rowIdx = r + 2;
                ws.Cell(rowIdx, 1).Value = sampleDepts[r].Code;
                ws.Cell(rowIdx, 2).Value = sampleDepts[r].Name;
                ws.Cell(rowIdx, 3).Value = sampleDepts[r].Status;
                ws.Row(rowIdx).Height = 20;
            }

            ws.Column(1).Width = 24;
            ws.Column(2).Width = 42;
            ws.Column(3).Width = 16;
            ws.ShowGridLines = true;

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            var fileName = !string.IsNullOrWhiteSpace(staffType)
                ? $"Department_Import_Template_{staffType.ToLower().Replace(" ", "_")}.xlsx"
                : "Department_Import_Template.xlsx";

            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDepartmentDesignationTemplateExcelAsync(string? staffType = null)
        {
            using var workbook = new XLWorkbook();

            // Style configuration helper
            void ApplyHeaderStyle(IXLWorksheet ws, string[] headers)
            {
                for (int col = 0; col < headers.Length; col++)
                {
                    var cell = ws.Cell(1, col + 1);
                    cell.Value = headers[col];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontSize = 11;
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 64, 175); // Institutional Blue
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.FromArgb(203, 213, 225);
                }
                ws.Row(1).Height = 26;
                ws.Column(1).Width = 24;
                ws.Column(2).Width = 42;
                ws.Column(3).Width = 16;
                ws.ShowGridLines = true;
            }

            // Sheet 1: Departments (3 fields: Department Code, Department Name, Status)
            var deptWs = workbook.Worksheets.Add("Departments");
            var deptHeaders = new[] { "Department Code", "Department Name", "Status" };
            ApplyHeaderStyle(deptWs, deptHeaders);
            var sampleDepts = new[]
            {
                new { Code = "DEP_CSE", Name = "Computer Science and Engineering", Status = "Active" },
                new { Code = "DEP_ECE", Name = "Electronics and Communication Engineering", Status = "Active" }
            };
            for (int r = 0; r < sampleDepts.Length; r++)
            {
                var rowIdx = r + 2;
                deptWs.Cell(rowIdx, 1).Value = sampleDepts[r].Code;
                deptWs.Cell(rowIdx, 2).Value = sampleDepts[r].Name;
                deptWs.Cell(rowIdx, 3).Value = sampleDepts[r].Status;
                deptWs.Row(rowIdx).Height = 20;
            }

            // Sheet 2: Designations (3 fields: Designation Code, Designation Name, Status)
            var desigWs = workbook.Worksheets.Add("Designations");
            var desigHeaders = new[] { "Designation Code", "Designation Name", "Status" };
            ApplyHeaderStyle(desigWs, desigHeaders);
            var sampleDesigs = new[]
            {
                new { Code = "DES_PROF", Name = "Professor", Status = "Active" },
                new { Code = "DES_ASST_PROF", Name = "Assistant Professor", Status = "Active" }
            };
            for (int r = 0; r < sampleDesigs.Length; r++)
            {
                var rowIdx = r + 2;
                desigWs.Cell(rowIdx, 1).Value = sampleDesigs[r].Code;
                desigWs.Cell(rowIdx, 2).Value = sampleDesigs[r].Name;
                desigWs.Cell(rowIdx, 3).Value = sampleDesigs[r].Status;
                desigWs.Row(rowIdx).Height = 20;
            }

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            var fileName = !string.IsNullOrWhiteSpace(staffType)
                ? $"Department_Designation_Import_Template_{staffType.ToLower().Replace(" ", "_")}.xlsx"
                : "Department_Designation_Import_Template.xlsx";

            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> ExportDepartmentsExcelAsync(string? staffType = null)
        {
            var depts = (await _departmentRepository.GetDepartmentsAsync(staffType, includeInactive: true)).ToList();
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Departments");

            var headers = new[]
            {
                "Department ID", "Department Name", "Department Code", "Staff Type",
                "Description", "Status", "Designations Count", "Staff Count", "Created Date"
            };

            for (int col = 0; col < headers.Length; col++)
            {
                var cell = worksheet.Cell(1, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 64, 175);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            for (int r = 0; r < depts.Count; r++)
            {
                var d = depts[r];
                var deps = await _departmentRepository.GetDependenciesAsync(d.DepartmentId);

                worksheet.Cell(r + 2, 1).Value = d.DepartmentId;
                worksheet.Cell(r + 2, 2).Value = d.DepartmentName;
                worksheet.Cell(r + 2, 3).Value = d.DepartmentCode;
                worksheet.Cell(r + 2, 4).Value = d.StaffType;
                worksheet.Cell(r + 2, 5).Value = d.Description ?? string.Empty;
                worksheet.Cell(r + 2, 6).Value = d.IsActive ? "Active" : "Inactive";
                worksheet.Cell(r + 2, 7).Value = deps.DesignationCount;
                worksheet.Cell(r + 2, 8).Value = deps.StaffCount;
                worksheet.Cell(r + 2, 9).Value = d.CreatedAt.ToString("yyyy-MM-dd");
            }

            worksheet.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            var fileName = $"departments-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
    }
}

