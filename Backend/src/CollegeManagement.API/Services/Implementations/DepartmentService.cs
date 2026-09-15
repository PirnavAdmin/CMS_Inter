using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _departmentRepository;

        public DepartmentService(IDepartmentRepository departmentRepository)
        {
            _departmentRepository = departmentRepository;
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

        public async Task<MasterImportResultDto> ImportDepartmentsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null)
        {
            if (file == null || file.Length == 0)
                throw new CollegeManagement.API.Exceptions.ValidationException("Please upload a valid Excel file (.xlsx or .xls).");

            var ext = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new CollegeManagement.API.Exceptions.ValidationException("Unsupported file format. Please upload an Excel workbook (.xlsx or .xls).");

            var result = new MasterImportResultDto();
            using var stream = file.OpenReadStream();
            using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
                throw new CollegeManagement.API.Exceptions.ValidationException("Excel file contains no worksheets.");

            var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();
            if (rows == null || rows.Count < 2)
                throw new CollegeManagement.API.Exceptions.ValidationException("Excel worksheet is empty or missing data rows.");

            // Read headers
            var headerRow = rows[0];
            var headerMap = new System.Collections.Generic.Dictionary<string, int>(System.StringComparer.OrdinalIgnoreCase);
            for (int col = 1; col <= headerRow.Cells().Count(); col++)
            {
                var val = headerRow.Cell(col).GetString().Trim();
                if (!string.IsNullOrWhiteSpace(val) && !headerMap.ContainsKey(val))
                {
                    headerMap[val] = col;
                }
            }

            string GetVal(ClosedXML.Excel.IXLRangeRow row, params string[] names)
            {
                foreach (var name in names)
                {
                    if (headerMap.TryGetValue(name, out int colIdx))
                    {
                        var cellVal = row.Cell(colIdx).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(cellVal)) return cellVal;
                    }
                }
                return string.Empty;
            }

            result.TotalRowsRead = rows.Count - 1;
            var existingDepts = (await _departmentRepository.GetDepartmentsAsync(includeInactive: true)).ToList();

            for (int i = 1; i < rows.Count; i++)
            {
                var rowNumber = i + 1;
                var row = rows[i];

                var deptName = GetVal(row, "Department Name", "DepartmentName", "Name", "Department", "Dept Name", "DeptName");
                var deptCode = GetVal(row, "Department Code", "DepartmentCode", "Code", "Dept Code", "DeptCode");
                var shortName = GetVal(row, "Short Name", "ShortName", "Short");
                var desc = GetVal(row, "Description", "Desc");
                var category = GetVal(row, "Category");
                var hodId = GetVal(row, "HOD Employee ID", "HODEmployeeId", "HOD", "HOD Id");
                var sType = GetVal(row, "Staff Type", "StaffType", "Staff_Type", "Type");
                var status = GetVal(row, "Status", "IsActive", "Active");

                if (string.IsNullOrWhiteSpace(deptName))
                {
                    result.Errors.Add(new MasterImportRowError
                    {
                        RowNumber = rowNumber,
                        ItemName = "Row " + rowNumber,
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

                // Determine Active status
                bool isActive = true;
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (status.Equals("Inactive", System.StringComparison.OrdinalIgnoreCase) ||
                        status.Equals("0", System.StringComparison.OrdinalIgnoreCase) ||
                        status.Equals("false", System.StringComparison.OrdinalIgnoreCase))
                    {
                        isActive = false;
                    }
                }

                // Clean or generate DepartmentCode
                if (string.IsNullOrWhiteSpace(deptCode))
                {
                    deptCode = !string.IsNullOrWhiteSpace(shortName)
                        ? $"DEP_{shortName.ToUpper().Replace(" ", "_")}"
                        : $"DEP_{deptName.ToUpper().Replace(" ", "_")}";
                }

                if (deptCode.Length > 20) deptCode = deptCode.Substring(0, 20);

                try
                {
                    // Check if department exists by Name or Code
                    var existing = existingDepts.FirstOrDefault(d =>
                        d.DepartmentName.Equals(deptName, System.StringComparison.OrdinalIgnoreCase) ||
                        (!string.IsNullOrWhiteSpace(deptCode) && d.DepartmentCode.Equals(deptCode, System.StringComparison.OrdinalIgnoreCase)));

                    if (existing != null)
                    {
                        existing.DepartmentName = deptName;
                        if (!string.IsNullOrWhiteSpace(deptCode)) existing.DepartmentCode = deptCode;
                        existing.StaffType = staffType;
                        if (!string.IsNullOrWhiteSpace(desc)) existing.Description = desc;
                        existing.IsActive = isActive;
                        existing.UpdatedAt = System.DateTime.UtcNow;

                        await _departmentRepository.UpdateDepartmentAsync(existing);
                        result.UpdatedCount++;
                        result.ImportedItems.Add(new { existing.DepartmentId, existing.DepartmentName, existing.DepartmentCode, existing.StaffType, Status = "Updated" });
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
                            CreatedAt = System.DateTime.UtcNow
                        };

                        var created = await _departmentRepository.AddDepartmentAsync(newDept);
                        existingDepts.Add(created);
                        result.SuccessCount++;
                        result.ImportedItems.Add(new { created.DepartmentId, created.DepartmentName, created.DepartmentCode, created.StaffType, Status = "Created" });
                    }
                }
                catch (System.Exception ex)
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

            result.Success = result.Errors.Count == 0;
            result.Message = $"Department import completed: {result.SuccessCount} created, {result.UpdatedCount} updated, {result.FailedRowsCount} failed.";
            return result;
        }

        public async Task<MasterImportResultDto> BulkImportDepartmentsAsync(System.Collections.Generic.IEnumerable<CreateDepartmentDto> dtos, string? defaultStaffType = null)
        {
            var result = new MasterImportResultDto();
            var list = dtos?.ToList() ?? new System.Collections.Generic.List<CreateDepartmentDto>();
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
                        d.DepartmentName.Equals(deptName, System.StringComparison.OrdinalIgnoreCase) ||
                        d.DepartmentCode.Equals(deptCode, System.StringComparison.OrdinalIgnoreCase));

                    if (existing != null)
                    {
                        existing.DepartmentName = deptName;
                        existing.DepartmentCode = deptCode;
                        existing.StaffType = staffType;
                        if (!string.IsNullOrWhiteSpace(dto.Description)) existing.Description = dto.Description;
                        existing.IsActive = dto.IsActive;
                        existing.UpdatedAt = System.DateTime.UtcNow;

                        await _departmentRepository.UpdateDepartmentAsync(existing);
                        result.UpdatedCount++;
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
                            CreatedAt = System.DateTime.UtcNow
                        });
                        existingDepts.Add(created);
                        result.SuccessCount++;
                        result.ImportedItems.Add(new { created.DepartmentId, created.DepartmentName, created.DepartmentCode, created.StaffType, Status = "Created" });
                    }
                }
                catch (System.Exception ex)
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
            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Departments");

            var headers = new[]
            {
                "Department Name", "Department Code", "Short Name", "Description",
                "Category", "HOD Employee ID", "Staff Type", "Status", "Display Order"
            };

            for (int col = 0; col < headers.Length; col++)
            {
                var cell = worksheet.Cell(1, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = ClosedXML.Excel.XLColor.White;
                cell.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.FromArgb(46, 125, 50);
                cell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;
            }

            var cleanType = staffType?.Replace("-", "").Replace("_", "").Trim().ToLower();
            bool isTeaching = cleanType == "teaching";
            bool isNonTeaching = cleanType == "nonteaching";

            var sampleRows = isTeaching
                ? new[]
                {
                    new[] { "Mathematics", "MATH", "MATH", "Department of Mathematics", "Science", "", "Teaching", "Active", "1" },
                    new[] { "Physics", "PHYS", "PHYS", "Department of Physics", "Science", "", "Teaching", "Active", "2" },
                    new[] { "Chemistry", "CHEM", "CHEM", "Department of Chemistry", "Science", "", "Teaching", "Active", "3" },
                    new[] { "Computer Science", "CS", "CS", "Department of Computer Science", "Engineering", "", "Teaching", "Active", "4" },
                    new[] { "English", "ENG", "ENG", "Department of English", "Languages", "", "Teaching", "Active", "5" }
                }
                : isNonTeaching
                ? new[]
                {
                    new[] { "Administration", "ADMIN", "ADM", "Administrative Department", "Operations", "", "Non-Teaching", "Active", "1" },
                    new[] { "Accounts & Finance", "ACC_FIN", "ACC", "Finance & Accounts Office", "Finance", "", "Non-Teaching", "Active", "2" },
                    new[] { "Admissions", "ADMISS", "ADM", "Student Admissions Office", "Student Services", "", "Non-Teaching", "Active", "3" },
                    new[] { "Library", "LIB", "LIB", "Central Library", "Academic Resources", "", "Non-Teaching", "Active", "4" },
                    new[] { "Transport", "TRANS", "TRN", "Campus Transport Services", "Logistics", "", "Non-Teaching", "Active", "5" }
                }
                : new[]
                {
                    new[] { "Mathematics", "MATH", "MATH", "Department of Mathematics", "Science", "", "Teaching", "Active", "1" },
                    new[] { "Computer Science", "CS", "CS", "Department of Computer Science", "Engineering", "", "Teaching", "Active", "2" },
                    new[] { "Administration", "ADMIN", "ADM", "Administrative Department", "Operations", "", "Non-Teaching", "Active", "3" },
                    new[] { "Accounts & Finance", "ACC_FIN", "ACC", "Finance & Accounts Office", "Finance", "", "Non-Teaching", "Active", "4" },
                    new[] { "Library", "LIB", "LIB", "Central Library", "Academic Resources", "", "Non-Teaching", "Active", "5" }
                };

            for (int r = 0; r < sampleRows.Length; r++)
            {
                for (int c = 0; c < sampleRows[r].Length; c++)
                {
                    worksheet.Cell(r + 2, c + 1).Value = sampleRows[r][c];
                }
            }

            worksheet.Columns().AdjustToContents();

            using var ms = new System.IO.MemoryStream();
            workbook.SaveAs(ms);
            var fileName = !string.IsNullOrWhiteSpace(staffType)
                ? $"department-import-template-{staffType.ToLower().Replace(" ", "-")}.xlsx"
                : "department-import-template.xlsx";

            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> ExportDepartmentsExcelAsync(string? staffType = null)
        {
            var depts = (await _departmentRepository.GetDepartmentsAsync(staffType, includeInactive: true)).ToList();
            using var workbook = new ClosedXML.Excel.XLWorkbook();
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
                cell.Style.Font.FontColor = ClosedXML.Excel.XLColor.White;
                cell.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.FromArgb(46, 125, 50);
                cell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;
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

            using var ms = new System.IO.MemoryStream();
            workbook.SaveAs(ms);
            var fileName = $"departments-export-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
    }
}
