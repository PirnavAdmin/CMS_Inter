using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class DesignationService : IDesignationService
    {
        private readonly IDesignationRepository _designationRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IMapper _mapper;

        public DesignationService(
            IDesignationRepository designationRepository,
            IDepartmentRepository departmentRepository,
            IMapper mapper)
        {
            _designationRepository = designationRepository;
            _departmentRepository = departmentRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DesignationResponseDto>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null)
        {
            return await _designationRepository.GetAllDtosAsync(includeInactive, staffType, departmentId);
        }

        public async Task<DesignationResponseDto?> GetByIdAsync(int id)
        {
            return await _designationRepository.GetDtoByIdAsync(id);
        }

        public async Task<DesignationResponseDto> CreateAsync(CreateDesignationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ValidationException("Designation name is required.");

            string trimmedName = dto.Name.Trim();

            if (!await _designationRepository.IsNameUniqueAsync(trimmedName))
                throw new ConflictException($"Designation with name '{trimmedName}' already exists.");

            string deptName = string.Empty;
            string deptCode = string.Empty;

            if (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0)
            {
                var dept = await _departmentRepository.GetByIdAsync(dto.DepartmentId.Value);
                if (dept == null)
                {
                    throw new ValidationException($"Department with ID {dto.DepartmentId.Value} does not exist.");
                }
                deptName = dept.DepartmentName;
                deptCode = dept.DepartmentCode;
            }

            var entity = new Designation
            {
                Name = trimmedName,
                DepartmentId = (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0) ? dto.DepartmentId : null,
                StaffType = !string.IsNullOrWhiteSpace(dto.StaffType) ? dto.StaffType.Trim() : "Both",
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _designationRepository.AddAsync(entity);
            return new DesignationResponseDto
            {
                Id = created.Id,
                Name = created.Name,
                DepartmentId = created.DepartmentId,
                DepartmentName = deptName,
                DepartmentCode = deptCode,
                StaffType = created.StaffType,
                IsActive = created.IsActive,
                AssignedStaffCount = 0,
                CreatedAt = created.CreatedAt,
                UpdatedAt = created.UpdatedAt
            };
        }

        public async Task<DesignationResponseDto?> UpdateAsync(int id, UpdateDesignationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ValidationException("Designation name is required.");

            var existing = await _designationRepository.GetByIdAsync(id);
            if (existing == null) return null;

            string trimmedName = dto.Name.Trim();

            if (!await _designationRepository.IsNameUniqueAsync(trimmedName, id))
                throw new ConflictException($"Designation with name '{trimmedName}' already exists.");

            string deptName = string.Empty;
            string deptCode = string.Empty;

            if (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0)
            {
                var dept = await _departmentRepository.GetByIdAsync(dto.DepartmentId.Value);
                if (dept == null)
                {
                    throw new ValidationException($"Department with ID {dto.DepartmentId.Value} does not exist.");
                }
                deptName = dept.DepartmentName;
                deptCode = dept.DepartmentCode;
            }

            existing.Name = trimmedName;
            existing.DepartmentId = (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0) ? dto.DepartmentId : null;
            existing.StaffType = !string.IsNullOrWhiteSpace(dto.StaffType) ? dto.StaffType.Trim() : "Both";
            existing.IsActive = dto.IsActive;

            await _designationRepository.UpdateAsync(existing);
            int staffCount = await _designationRepository.GetAssignedStaffCountAsync(id);

            return new DesignationResponseDto
            {
                Id = existing.Id,
                Name = existing.Name,
                DepartmentId = existing.DepartmentId,
                DepartmentName = deptName,
                DepartmentCode = deptCode,
                StaffType = existing.StaffType,
                IsActive = existing.IsActive,
                AssignedStaffCount = staffCount,
                CreatedAt = existing.CreatedAt,
                UpdatedAt = existing.UpdatedAt
            };
        }

        public async Task<(bool Success, string Message)> DeleteAsync(int id)
        {
            var existing = await _designationRepository.GetByIdAsync(id);
            if (existing == null)
                return (false, $"Designation with ID {id} not found.");

            if (await _designationRepository.IsAssignedToStaffAsync(id))
            {
                return (false, $"Cannot delete designation '{existing.Name}' as it is currently assigned to one or more staff members.");
            }

            await _designationRepository.DeleteAsync(id);
            return (true, "Designation deleted successfully.");
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var res = await DeleteAsync(id);
            return res.Success;
        }

        public async Task<DesignationSummaryDto> GetSummaryAsync()
        {
            return await _designationRepository.GetSummaryAsync();
        }

        public async Task<bool> ValidateNameAsync(string name, int? excludeId = null)
        {
            return await _designationRepository.IsNameUniqueAsync(name, excludeId);
        }

        public async Task<MasterImportResultDto> ImportDesignationsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null, int? defaultDepartmentId = null)
        {
            if (file == null || file.Length == 0)
                throw new ValidationException("Please upload a valid Excel file (.xlsx or .xls).");

            var ext = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new ValidationException("Unsupported file format. Please upload an Excel workbook (.xlsx or .xls).");

            var result = new MasterImportResultDto();
            using var stream = file.OpenReadStream();
            using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
                throw new ValidationException("Excel file contains no worksheets.");

            var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();
            if (rows == null || rows.Count < 2)
                throw new ValidationException("Excel worksheet is empty or missing data rows.");

            // Read headers
            var headerRow = rows[0];
            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
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
            var departments = (await _departmentRepository.GetDepartmentsAsync(includeInactive: true)).ToList();
            var existingDesigs = (await _designationRepository.GetAllAsync(includeInactive: true)).ToList();

            for (int i = 1; i < rows.Count; i++)
            {
                var rowNumber = i + 1;
                var row = rows[i];

                var desigName = GetVal(row, "Designation Name", "DesignationName", "Name", "Title", "Designation");
                var desigCode = GetVal(row, "Designation Code", "DesignationCode", "Code");
                var deptRef = GetVal(row, "Department Code", "DepartmentCode", "Department Name", "DepartmentName", "Department", "Dept");
                var sType = GetVal(row, "Staff Type", "StaffType", "Staff_Type", "Type");
                var level = GetVal(row, "Designation Level", "DesignationLevel", "Level");
                var reportsTo = GetVal(row, "Reports To Designation Code", "ReportsTo", "ReportsToDesignationCode");
                var maxHours = GetVal(row, "Maximum Weekly Hours", "MaxWeeklyHours", "Hours");
                var desc = GetVal(row, "Description", "Desc");
                var status = GetVal(row, "Status", "IsActive", "Active");

                if (string.IsNullOrWhiteSpace(desigName))
                {
                    result.Errors.Add(new MasterImportRowError
                    {
                        RowNumber = rowNumber,
                        ItemName = "Row " + rowNumber,
                        ErrorMessage = "Designation Name is required."
                    });
                    result.FailedRowsCount++;
                    continue;
                }

                // Resolve Department
                int? deptId = defaultDepartmentId;
                string matchedDeptStaffType = string.Empty;
                if (!string.IsNullOrWhiteSpace(deptRef))
                {
                    var matchedDept = departments.FirstOrDefault(d =>
                        d.DepartmentCode.Equals(deptRef, StringComparison.OrdinalIgnoreCase) ||
                        d.DepartmentName.Equals(deptRef, StringComparison.OrdinalIgnoreCase));

                    if (matchedDept != null)
                    {
                        deptId = matchedDept.DepartmentId;
                        matchedDeptStaffType = matchedDept.StaffType;
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

                // Determine Active status
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

                try
                {
                    // Check if designation exists
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
                        result.ImportedItems.Add(new { existing.Id, existing.Name, existing.StaffType, existing.DepartmentId, Status = "Updated" });
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
                        result.ImportedItems.Add(new { created.Id, created.Name, created.StaffType, created.DepartmentId, Status = "Created" });
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

            result.Success = result.Errors.Count == 0;
            result.Message = $"Designation import completed: {result.SuccessCount} created, {result.UpdatedCount} updated, {result.FailedRowsCount} failed.";
            return result;
        }

        public async Task<MasterImportResultDto> BulkImportDesignationsAsync(IEnumerable<CreateDesignationDto> dtos, string? defaultStaffType = null)
        {
            var result = new MasterImportResultDto();
            var list = dtos?.ToList() ?? new List<CreateDesignationDto>();
            result.TotalRowsRead = list.Count;

            var existingDesigs = (await _designationRepository.GetAllAsync(includeInactive: true)).ToList();
            int idx = 0;

            foreach (var dto in list)
            {
                idx++;
                if (string.IsNullOrWhiteSpace(dto.Name))
                {
                    result.Errors.Add(new MasterImportRowError { RowNumber = idx, ItemName = "Item " + idx, ErrorMessage = "Designation name is required." });
                    result.FailedRowsCount++;
                    continue;
                }

                var desigName = dto.Name.Trim();
                var staffType = !string.IsNullOrWhiteSpace(dto.StaffType)
                    ? dto.StaffType.Trim()
                    : (!string.IsNullOrWhiteSpace(defaultStaffType) ? defaultStaffType.Trim() : "Both");

                try
                {
                    var existing = existingDesigs.FirstOrDefault(d =>
                        d.Name.Equals(desigName, StringComparison.OrdinalIgnoreCase) &&
                        (dto.DepartmentId == null || d.DepartmentId == null || d.DepartmentId == dto.DepartmentId));

                    if (existing != null)
                    {
                        existing.Name = desigName;
                        if (dto.DepartmentId.HasValue && dto.DepartmentId.Value > 0) existing.DepartmentId = dto.DepartmentId.Value;
                        existing.StaffType = staffType;
                        existing.IsActive = dto.IsActive;
                        existing.UpdatedAt = DateTime.UtcNow;

                        await _designationRepository.UpdateAsync(existing);
                        result.UpdatedCount++;
                        result.ImportedItems.Add(new { existing.Id, existing.Name, existing.StaffType, existing.DepartmentId, Status = "Updated" });
                    }
                    else
                    {
                        var created = await _designationRepository.AddAsync(new Designation
                        {
                            Name = desigName,
                            DepartmentId = dto.DepartmentId,
                            StaffType = staffType,
                            IsActive = dto.IsActive,
                            CreatedAt = DateTime.UtcNow
                        });
                        existingDesigs.Add(created);
                        result.SuccessCount++;
                        result.ImportedItems.Add(new { created.Id, created.Name, created.StaffType, created.DepartmentId, Status = "Created" });
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new MasterImportRowError { RowNumber = idx, ItemName = desigName, ErrorMessage = ex.Message });
                    result.FailedRowsCount++;
                }
            }

            result.Success = result.Errors.Count == 0;
            result.Message = $"Bulk designation import completed: {result.SuccessCount} created, {result.UpdatedCount} updated, {result.FailedRowsCount} failed.";
            return result;
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDesignationTemplateExcelAsync(string? staffType = null)
        {
            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Designations");

            var headers = new[]
            {
                "Designation Name", "Designation Code", "Department Code", "Staff Type",
                "Designation Level", "Reports To Designation Code", "Maximum Weekly Hours",
                "Description", "Status", "Display Order"
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
                    new[] { "Professor", "DES_PROF", "MATH", "Teaching", "Level 1", "", "16", "Senior Academic Professor", "Active", "1" },
                    new[] { "Associate Professor", "DES_ASSOC_PROF", "MATH", "Teaching", "Level 2", "DES_PROF", "16", "Associate Professor", "Active", "2" },
                    new[] { "Assistant Professor", "DES_ASST_PROF", "CS", "Teaching", "Level 3", "DES_ASSOC_PROF", "18", "Assistant Professor", "Active", "3" },
                    new[] { "Senior Lecturer", "DES_SR_LECT", "PHYS", "Teaching", "Level 3", "", "18", "Senior Lecturer", "Active", "4" },
                    new[] { "Junior Lecturer", "DES_JR_LECT", "CHEM", "Teaching", "Level 4", "DES_SR_LECT", "20", "Junior Lecturer", "Active", "5" }
                }
                : isNonTeaching
                ? new[]
                {
                    new[] { "Administrative Officer", "DES_ADMIN_OFF", "ADMIN", "Non-Teaching", "Level 1", "", "40", "Head of Administration", "Active", "1" },
                    new[] { "Accountant", "DES_ACCT", "ACC_FIN", "Non-Teaching", "Level 2", "DES_ADMIN_OFF", "40", "Senior Accountant", "Active", "2" },
                    new[] { "Librarian", "DES_LIB", "LIB", "Non-Teaching", "Level 2", "", "40", "Head Librarian", "Active", "3" },
                    new[] { "Office Assistant", "DES_OFF_ASST", "ADMIN", "Non-Teaching", "Level 3", "DES_ADMIN_OFF", "40", "Office Assistant", "Active", "4" },
                    new[] { "Attender / Peon", "DES_PEON", "MAINT", "Non-Teaching", "Level 5", "", "44", "Campus Attendant", "Active", "5" }
                }
                : new[]
                {
                    new[] { "Professor", "DES_PROF", "MATH", "Teaching", "Level 1", "", "16", "Senior Academic Professor", "Active", "1" },
                    new[] { "Assistant Professor", "DES_ASST_PROF", "CS", "Teaching", "Level 3", "", "18", "Assistant Professor", "Active", "2" },
                    new[] { "Administrative Officer", "DES_ADMIN_OFF", "ADMIN", "Non-Teaching", "Level 1", "", "40", "Head of Administration", "Active", "3" },
                    new[] { "Accountant", "DES_ACCT", "ACC_FIN", "Non-Teaching", "Level 2", "", "40", "Senior Accountant", "Active", "4" },
                    new[] { "Librarian", "DES_LIB", "LIB", "Non-Teaching", "Level 2", "", "40", "Head Librarian", "Active", "5" }
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
                ? $"designation-import-template-{staffType.ToLower().Replace(" ", "-")}.xlsx"
                : "designation-import-template.xlsx";

            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)> ExportDesignationsExcelAsync(string? staffType = null, int? departmentId = null)
        {
            var desigs = (await _designationRepository.GetAllDtosAsync(includeInactive: true, staffType: staffType, departmentId: departmentId)).ToList();
            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Designations");

            var headers = new[]
            {
                "Designation ID", "Designation Name", "Designation Code", "Department Name",
                "Department Code", "Staff Type", "Status", "Assigned Staff Count", "Created Date"
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

            for (int r = 0; r < desigs.Count; r++)
            {
                var d = desigs[r];

                worksheet.Cell(r + 2, 1).Value = d.Id;
                worksheet.Cell(r + 2, 2).Value = d.Name;
                worksheet.Cell(r + 2, 3).Value = d.DesignationCode;
                worksheet.Cell(r + 2, 4).Value = d.DepartmentName;
                worksheet.Cell(r + 2, 5).Value = d.DepartmentCode;
                worksheet.Cell(r + 2, 6).Value = d.StaffType;
                worksheet.Cell(r + 2, 7).Value = d.IsActive ? "Active" : "Inactive";
                worksheet.Cell(r + 2, 8).Value = d.AssignedStaffCount;
                worksheet.Cell(r + 2, 9).Value = d.CreatedAt.ToString("yyyy-MM-dd");
            }

            worksheet.Columns().AdjustToContents();

            using var ms = new System.IO.MemoryStream();
            workbook.SaveAs(ms);
            var fileName = $"designations-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
    }
}
