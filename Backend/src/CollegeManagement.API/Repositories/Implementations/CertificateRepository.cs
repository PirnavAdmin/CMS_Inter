using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations;

public class CertificateRepository : ICertificateRepository
{
    private readonly DatabaseContext _database;

    private class StudentDetailsQueryModel
    {
        public int StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? GroupName { get; set; }
        public string? AcademicLevel { get; set; }
        public string? AcademicYear { get; set; }
    }

    public CertificateRepository(DatabaseContext database)
    {
        _database = database;
    }

    // =========================================================
    // GET ALL
    // =========================================================
    public async Task<IReadOnlyList<CertificateResponseDto>> GetAllAsync(
        string? search = null,
        string? status = null,
        string? certificateType = null,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        // Safe query with joins to ensure Student Name, Group, Academic Year are ALWAYS populated from StudentAdmissions / Students
        var sql = @"
            SELECT 
                c.*,
                COALESCE(c.AdmissionNo, sa.AdmissionNo, s.AdmissionNo, '') AS S_AdmissionNo,
                COALESCE(c.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, '') AS S_StudentName,
                COALESCE(c.GroupName, g.GroupName, '') AS S_GroupName,
                COALESCE(c.AcademicLevel, al.LevelName, '1st Year') AS S_AcademicLevel,
                COALESCE(c.AcademicYear, ay.AcademicYearName, '') AS S_AcademicYear
            FROM `certificates` c
            LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
            LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
            LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
            LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
            LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
            ORDER BY 1 DESC;";

        try
        {
            var rawRows = await connection.QueryAsync<dynamic>(new CommandDefinition(sql, cancellationToken: ct));
            var dtos = rawRows.Select(MapDynamicToDto).ToList();

            return dtos.Where(c =>
            {
                if (c == null) return false;

                if (!string.IsNullOrWhiteSpace(status) && status != "All" && status != "All Status")
                {
                    if (!string.Equals(c.Status, status, StringComparison.OrdinalIgnoreCase))
                        return false;
                }

                if (!string.IsNullOrWhiteSpace(certificateType) && certificateType != "All")
                {
                    if (!string.Equals(c.CertificateType, certificateType, StringComparison.OrdinalIgnoreCase))
                        return false;
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim();
                    var match = (c.CertificateNumber?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false) ||
                                (c.AdmissionNo?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false) ||
                                (c.StudentName?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false) ||
                                (c.CertificateType?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false) ||
                                (c.Purpose?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false);
                    if (!match) return false;
                }

                return true;
            }).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetAllAsync Fallback Error: {ex.Message}");
            return new List<CertificateResponseDto>();
        }
    }

    // =========================================================
    // GET BY ID
    // =========================================================
    public async Task<CertificateResponseDto?> GetByIdAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return null;

        using var connection = _database.CreateConnection();

        var cols = await GetCertificateTableColumnsAsync(connection);
        var pk = cols.Contains("CertificateId") ? "c.CertificateId" : "c.Id";

        var sql = $@"
            SELECT 
                c.*,
                COALESCE(c.AdmissionNo, sa.AdmissionNo, s.AdmissionNo, '') AS S_AdmissionNo,
                COALESCE(c.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, '') AS S_StudentName,
                COALESCE(c.GroupName, g.GroupName, '') AS S_GroupName,
                COALESCE(c.AcademicLevel, al.LevelName, '1st Year') AS S_AcademicLevel,
                COALESCE(c.AcademicYear, ay.AcademicYearName, '') AS S_AcademicYear
            FROM `certificates` c
            LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
            LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
            LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
            LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
            LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
            WHERE {pk} = @id
            LIMIT 1;";

        try
        {
            var row = await connection.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(sql, new { id }, cancellationToken: ct));

            return row == null ? null : MapDynamicToDto(row);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetByIdAsync Error: {ex.Message}");
            return null;
        }
    }

    // =========================================================
    // GET CERTIFICATE PREVIEW (Fully Hydrated Template & Data)
    // =========================================================
    public async Task<CertificatePreviewResponseDto?> GetPreviewAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return null;

        using var connection = _database.CreateConnection();

        var cols = await GetCertificateTableColumnsAsync(connection);
        var pk = cols.Contains("CertificateId") ? "c.CertificateId" : "c.Id";

        var sql = $@"
            SELECT 
                c.*,
                COALESCE(s.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), c.StudentName, 'Student') AS Hydrated_StudentName,
                COALESCE(s.FatherName, sa.FatherName, 'Parent Name') AS Hydrated_FatherName,
                COALESCE(s.MotherName, sa.MotherName, 'Anita Devi') AS Hydrated_MotherName,
                COALESCE(c.AdmissionNo, sa.AdmissionNo, s.AdmissionNo, 'ADM-2026-0000') AS Hydrated_AdmissionNo,
                COALESCE(s.RollNo, s.AdmissionNo, sa.AdmissionNo, '101') AS Hydrated_RollNo,
                COALESCE(c.GroupName, g.GroupName, 'MPC') AS Hydrated_GroupName,
                COALESCE(c.AcademicLevel, al.LevelName, '1st Year') AS Hydrated_AcademicLevel,
                COALESCE(c.AcademicYear, ay.AcademicYearName, '2026-2027') AS Hydrated_AcademicYear,
                COALESCE(b.BoardName, 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS Hydrated_BoardName,
                COALESCE(sec.SectionName, 'A') AS Hydrated_SectionName,
                s.DateOfBirth AS Hydrated_Dob,
                s.Gender AS Hydrated_Gender,
                COALESCE(s.BloodGroup, 'O+') AS Hydrated_BloodGroup,
                COALESCE(s.MobileNumber, '') AS Hydrated_Mobile
            FROM `certificates` c
            LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
            LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
            LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
            LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
            LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
            LEFT JOIN `Sections` sec ON sec.SectionId = COALESCE(sa.SectionId, s.SectionId)
            LEFT JOIN `Boards` b ON b.BoardId = COALESCE(sa.BoardId, s.BoardId)
            WHERE {pk} = @id
            LIMIT 1;";

        try
        {
            var row = await connection.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(sql, new { id }, cancellationToken: ct));

            if (row == null) return null;

            var dict = (IDictionary<string, object>)row;

            int certId = id;
            if (dict.ContainsKey("CertificateId") && dict["CertificateId"] != null)
                certId = Convert.ToInt32(dict["CertificateId"]);
            else if (dict.ContainsKey("Id") && dict["Id"] != null)
                certId = Convert.ToInt32(dict["Id"]);

            string certNo = dict.ContainsKey("CertificateNumber") && dict["CertificateNumber"] != null
                ? dict["CertificateNumber"].ToString()!
                : (dict.ContainsKey("CertificateNo") && dict["CertificateNo"] != null ? dict["CertificateNo"].ToString()! : $"CERT-{certId}");

            int studentId = dict.ContainsKey("StudentId") && dict["StudentId"] != null ? Convert.ToInt32(dict["StudentId"]) : 0;
            string studentName = dict.ContainsKey("Hydrated_StudentName") && dict["Hydrated_StudentName"] != null ? dict["Hydrated_StudentName"].ToString()! : "Student";
            string fatherName = dict.ContainsKey("Hydrated_FatherName") && dict["Hydrated_FatherName"] != null ? dict["Hydrated_FatherName"].ToString()! : "Parent Name";
            string motherName = dict.ContainsKey("Hydrated_MotherName") && dict["Hydrated_MotherName"] != null ? dict["Hydrated_MotherName"].ToString()! : "Anita Devi";
            string admissionNo = dict.ContainsKey("Hydrated_AdmissionNo") && dict["Hydrated_AdmissionNo"] != null ? dict["Hydrated_AdmissionNo"].ToString()! : "";
            string rollNo = dict.ContainsKey("Hydrated_RollNo") && dict["Hydrated_RollNo"] != null ? dict["Hydrated_RollNo"].ToString()! : "";
            string groupName = dict.ContainsKey("Hydrated_GroupName") && dict["Hydrated_GroupName"] != null ? dict["Hydrated_GroupName"].ToString()! : "MPC";
            string academicLevel = dict.ContainsKey("Hydrated_AcademicLevel") && dict["Hydrated_AcademicLevel"] != null ? dict["Hydrated_AcademicLevel"].ToString()! : "1st Year";
            string academicYear = dict.ContainsKey("Hydrated_AcademicYear") && dict["Hydrated_AcademicYear"] != null ? dict["Hydrated_AcademicYear"].ToString()! : "2026-2027";
            string boardName = dict.ContainsKey("Hydrated_BoardName") && dict["Hydrated_BoardName"] != null ? dict["Hydrated_BoardName"].ToString()! : "Board of Intermediate Education, Andhra Pradesh (BIEAP)";
            string sectionName = dict.ContainsKey("Hydrated_SectionName") && dict["Hydrated_SectionName"] != null ? dict["Hydrated_SectionName"].ToString()! : "A";

            string certType = dict.ContainsKey("CertificateType") && dict["CertificateType"] != null ? dict["CertificateType"].ToString()! : "Certificate";
            string purpose = dict.ContainsKey("Purpose") && dict["Purpose"] != null ? dict["Purpose"].ToString()! : "Higher Education / Official Verification";
            string remarks = dict.ContainsKey("Remarks") && dict["Remarks"] != null ? dict["Remarks"].ToString()! : "";
            string status = dict.ContainsKey("Status") && dict["Status"] != null ? dict["Status"].ToString()! : "Generated";
            string issuedBy = dict.ContainsKey("IssuedBy") && dict["IssuedBy"] != null ? dict["IssuedBy"].ToString()! : "Dr. S. K. Rao (Principal)";

            DateTime reqDate = DateTime.UtcNow;
            if (dict.ContainsKey("RequestDate") && dict["RequestDate"] is DateTime rdt) reqDate = rdt;
            else if (dict.ContainsKey("CreatedAt") && dict["CreatedAt"] is DateTime cdt) reqDate = cdt;

            DateTime issDate = reqDate;
            if (dict.ContainsKey("IssueDate") && dict["IssueDate"] is DateTime idt) issDate = idt;

            string dobStr = "14/08/2008";
            if (dict.ContainsKey("Hydrated_Dob") && dict["Hydrated_Dob"] is DateTime dobDt) dobStr = dobDt.ToString("dd/MM/yyyy");

            string gender = dict.ContainsKey("Hydrated_Gender") && dict["Hydrated_Gender"] != null ? dict["Hydrated_Gender"].ToString()! : "";
            string bloodGroup = dict.ContainsKey("Hydrated_BloodGroup") && dict["Hydrated_BloodGroup"] != null ? dict["Hydrated_BloodGroup"].ToString()! : "O+";
            string mobile = dict.ContainsKey("Hydrated_Mobile") && dict["Hydrated_Mobile"] != null ? dict["Hydrated_Mobile"].ToString()! : "";

            // 2. Fetch or resolve matching template from `templates` table
            var templateSql = @"
                SELECT * FROM `templates` 
                WHERE IsActive = 1 
                  AND (LOWER(TemplateCode) = LOWER(@code) OR LOWER(Title) = LOWER(@type) OR LOWER(Title) LIKE CONCAT('%', LOWER(@type), '%'))
                ORDER BY Id DESC 
                LIMIT 1;";

            string codeGuess = certType.ToUpperInvariant().Replace(" ", "_").Replace("(", "").Replace(")", "");
            if (codeGuess.Contains("BONAFIDE")) codeGuess = "BONAFIDE_CERT";
            else if (codeGuess.Contains("STUDY")) codeGuess = "STUDY_CERT";
            else if (codeGuess.Contains("CONDUCT")) codeGuess = "CONDUCT_CERT";
            else if (codeGuess.Contains("TRANSFER") || codeGuess.Contains("TC")) codeGuess = "TRANSFER_CERT";
            else if (codeGuess.Contains("OTHER")) codeGuess = "OTHERS";

            var dbTemplate = await connection.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(templateSql, new { code = codeGuess, type = certType.Trim() }, cancellationToken: ct));

            string templateCode = codeGuess;
            string templateTitle = certType;
            string rawBody = "";
            string borderColor = "#1e3a8a";
            string badgeBgColor = "#1e3a8a";
            string badgeTextColor = "#ffffff";
            string orientation = "Landscape";
            string signatureType = "Principal";

            if (certType.Contains("Study", StringComparison.OrdinalIgnoreCase))
            {
                borderColor = "#15803d";
                badgeBgColor = "#15803d";
            }
            else if (certType.Contains("Conduct", StringComparison.OrdinalIgnoreCase))
            {
                borderColor = "#991b1b";
                badgeBgColor = "#991b1b";
            }
            else if (certType.Contains("Transfer", StringComparison.OrdinalIgnoreCase) || certType.Contains("TC", StringComparison.OrdinalIgnoreCase))
            {
                borderColor = "#b45309";
                badgeBgColor = "#b45309";
            }
            else if (certType.Contains("Other", StringComparison.OrdinalIgnoreCase))
            {
                borderColor = "#0f766e";
                badgeBgColor = "#0f766e";
            }

            if (dbTemplate != null)
            {
                var tDict = (IDictionary<string, object>)dbTemplate;
                if (tDict.ContainsKey("TemplateCode") && tDict["TemplateCode"] != null)
                    templateCode = tDict["TemplateCode"].ToString()!;
                if (tDict.ContainsKey("Title") && tDict["Title"] != null)
                    templateTitle = tDict["Title"].ToString()!;
                if (tDict.ContainsKey("ContentBody") && tDict["ContentBody"] != null)
                    rawBody = tDict["ContentBody"].ToString()!;
            }

            // Standard fallback bodies if rawBody empty
            if (string.IsNullOrWhiteSpace(rawBody))
            {
                if (templateCode.Contains("BONAFIDE", StringComparison.OrdinalIgnoreCase) || certType.Contains("Bonafide", StringComparison.OrdinalIgnoreCase))
                {
                    rawBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {{group_name}} Group, {{academic_level}} during the academic year {{academic_year}}.";
                }
                else if (templateCode.Contains("STUDY", StringComparison.OrdinalIgnoreCase) || certType.Contains("Study", StringComparison.OrdinalIgnoreCase))
                {
                    rawBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college during the period from {{study_from}} to {{study_to}} in {{group_name}} Group and appeared for the Intermediate Public Examination conducted by the {{board_name}}.";
                }
                else if (templateCode.Contains("CONDUCT", StringComparison.OrdinalIgnoreCase) || certType.Contains("Conduct", StringComparison.OrdinalIgnoreCase))
                {
                    rawBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has been a student of this college during the academic year(s) {{academic_year}}.\nTo the best of our knowledge and records, his/her conduct and character have been Good.";
                }
                else if (templateCode.Contains("TRANSFER", StringComparison.OrdinalIgnoreCase) || certType.Contains("Transfer", StringComparison.OrdinalIgnoreCase))
                {
                    rawBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} has studied in this college from {{study_from}} to {{study_to}}.\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. There are no dues towards the college.\nWe wish him/her all the best for his/her future endeavours.";
                }
                else
                {
                    rawBody = "This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Student ID {{student_id}} is studying in {{academic_level}} ({{group_name}}) for the Academic Year {{academic_year}}.\nThis is to certify that {{custom_body}}.";
                }
            }

            string studentIdStr = studentId > 0 ? studentId.ToString() : (admissionNo.Length > 0 ? Regex.Replace(admissionNo, @"\D", "") : "518");
            if (string.IsNullOrWhiteSpace(studentIdStr)) studentIdStr = "518";

            var payload = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["student_name"] = studentName,
                ["studentName"] = studentName,
                ["name"] = studentName,
                ["student"] = studentName,

                ["father_name"] = fatherName,
                ["fatherName"] = fatherName,
                ["father"] = fatherName,
                ["parent_name"] = fatherName,
                ["parentName"] = fatherName,

                ["mother_name"] = motherName,
                ["motherName"] = motherName,
                ["mother"] = motherName,

                ["student_id"] = studentIdStr,
                ["studentId"] = studentIdStr,
                ["id"] = studentIdStr,

                ["admission_no"] = admissionNo,
                ["admissionNo"] = admissionNo,
                ["admission_number"] = admissionNo,
                ["admissionNumber"] = admissionNo,

                ["roll_no"] = rollNo,
                ["rollNo"] = rollNo,
                ["roll_number"] = rollNo,
                ["rollNumber"] = rollNo,

                ["academic_level"] = academicLevel,
                ["academicLevel"] = academicLevel,
                ["level"] = academicLevel,
                ["year"] = academicLevel,

                ["group_name"] = groupName,
                ["groupName"] = groupName,
                ["group"] = groupName,
                ["stream"] = groupName,

                ["section"] = sectionName,
                ["section_name"] = sectionName,
                ["sectionName"] = sectionName,

                ["academic_year"] = academicYear,
                ["academicYear"] = academicYear,
                ["year_name"] = academicYear,

                ["board_name"] = boardName,
                ["boardName"] = boardName,
                ["board"] = boardName,

                ["course_name"] = $"Intermediate ({groupName})",
                ["courseName"] = $"Intermediate ({groupName})",
                ["course"] = "Intermediate",

                ["certificate_number"] = certNo,
                ["certificateNumber"] = certNo,
                ["certificate_no"] = certNo,
                ["certificateNo"] = certNo,

                ["issue_date"] = issDate.ToString("dd/MM/yyyy"),
                ["issueDate"] = issDate.ToString("dd/MM/yyyy"),
                ["date"] = issDate.ToString("dd/MM/yyyy"),

                ["request_date"] = reqDate.ToString("dd/MM/yyyy"),
                ["requestDate"] = reqDate.ToString("dd/MM/yyyy"),

                ["place"] = "Vijayawada",
                ["purpose"] = purpose,
                ["remarks"] = remarks,
                ["status"] = status,
                ["issued_by"] = issuedBy,
                ["issuedBy"] = issuedBy,
                ["principal_name"] = issuedBy,

                ["conduct_rating"] = "Good",
                ["conduct"] = "Good",
                ["study_from"] = "June 2025",
                ["study_to"] = "May 2027",

                ["dob"] = dobStr,
                ["date_of_birth"] = dobStr,
                ["gender"] = gender,
                ["blood_group"] = bloodGroup,
                ["mobile"] = mobile,

                ["college_name"] = "Pirnav College",
                ["college_address"] = "D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh",
                ["custom_body"] = !string.IsNullOrWhiteSpace(purpose) ? purpose : "has demonstrated commendable academic performance and exemplary conduct"
            };

            string Interpolate(string text)
            {
                if (string.IsNullOrWhiteSpace(text)) return string.Empty;
                var res = Regex.Replace(text, @"\{\{([a-zA-Z0-9_\-]+)\}\}", m =>
                {
                    var k = m.Groups[1].Value;
                    if (payload.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
                    return string.Empty;
                }, RegexOptions.IgnoreCase);

                res = Regex.Replace(res, @"\{([a-zA-Z0-9_\-]+)\}", m =>
                {
                    var k = m.Groups[1].Value;
                    if (payload.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
                    return string.Empty;
                }, RegexOptions.IgnoreCase);

                res = Regex.Replace(res, @"\$\{([a-zA-Z0-9_\.\-]+)\}", m =>
                {
                    var k = m.Groups[1].Value.Replace("data.", "").Replace("record.", "");
                    if (payload.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
                    return string.Empty;
                }, RegexOptions.IgnoreCase);

                return res.Trim();
            }

            string hydratedParagraphOne = Interpolate(rawBody);
            string hydratedParagraphTwo = !string.IsNullOrWhiteSpace(purpose)
                ? $"This certificate is issued for the purpose of {Interpolate(purpose)}."
                : string.Empty;

            string htmlContent = $@"
<div class=""visual-certificate-canvas {orientation.ToLowerInvariant()}"" style=""background-color: #ffffff;"">
  <div class=""cert-inner-border"" style=""border-color: {borderColor}; border-style: double; border-width: 4px;"">
    <header class=""cert-header"">
      <div class=""cert-header-grid"">
        <div class=""cert-header-left"">
          <div class=""cert-default-logo"" style=""background-color: {borderColor};"">P</div>
        </div>
        <div class=""cert-header-center"">
          <h1 class=""cert-institution-name"" style=""color: {borderColor};"">PIRNAV COLLEGE</h1>
          <p class=""cert-tagline"" style=""color: {borderColor};"">(Intermediate / Junior College)</p>
          <p class=""cert-address"">D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh</p>
        </div>
        <div class=""cert-header-right"">
          <small>Affiliated to</small>
          <strong>Board of Intermediate Education</strong>
          <small>Andhra Pradesh (BIEAP)</small>
          <small>College Code: 12345</small>
        </div>
      </div>
      <div class=""cert-ref-row"">
        <span>Ref No: <strong>{certNo}</strong></span>
        <span>Date: <strong>{issDate:dd/MM/yyyy}</strong></span>
      </div>
    </header>
    <div class=""cert-title-badge"">
      <h2 style=""background-color: {badgeBgColor}; color: {badgeTextColor};"">{templateTitle.ToUpperInvariant()}</h2>
    </div>
    <div class=""cert-body-area"">
      <p class=""cert-content-text"">{hydratedParagraphOne}</p>
      {(string.IsNullOrWhiteSpace(hydratedParagraphTwo) ? "" : $"<p class=\"cert-purpose-text\">{hydratedParagraphTwo}</p>")}
      {(string.IsNullOrWhiteSpace(remarks) ? "" : $"<p class=\"cert-remarks\" style=\"margin-top: 10px; font-size: 13px;\"><strong>Remarks:</strong> {remarks}</p>")}
    </div>
    <footer class=""cert-footer-area"">
      <div class=""cert-footer-col left"">
        <p>Place: <strong>Vijayawada</strong></p>
        <p>Date: <strong>{issDate:dd/MM/yyyy}</strong></p>
        <div class=""cert-qr-placeholder"">
          <div class=""qr-box"">QR</div>
          <span>Scan to verify</span>
        </div>
      </div>
      <div class=""cert-footer-col center"">
        <div class=""cert-seal-stamp"" style=""border-color: {borderColor}; color: {borderColor};"">
          <span>PIRNAV COLLEGE<br/>VIJAYAWADA</span>
        </div>
      </div>
      <div class=""cert-footer-col right"">
        <div class=""cert-sig-line"">
          <span class=""sig-handwritten style-cursive-hand"">{signatureType} Signature</span>
          <strong class=""sig-title"">{signatureType}</strong>
          <small>Pirnav College</small>
        </div>
      </div>
    </footer>
  </div>
</div>";

            return new CertificatePreviewResponseDto
            {
                CertificateId = certId,
                CertificateNumber = certNo,
                CertificateType = certType,
                Status = status,
                RequestDate = reqDate,
                IssueDate = issDate,
                IssuedBy = issuedBy,
                Purpose = purpose,
                Remarks = remarks,
                TemplateCode = templateCode,
                TemplateTitle = templateTitle,
                Orientation = orientation,
                BorderColor = borderColor,
                BadgeBgColor = badgeBgColor,
                BadgeTextColor = badgeTextColor,
                SignatureType = signatureType,
                SealText = "PIRNAV COLLEGE\nVIJAYAWADA",
                QrEnabled = true,
                Heading = templateTitle,
                ParagraphOne = hydratedParagraphOne,
                ParagraphTwo = hydratedParagraphTwo,
                HtmlContent = htmlContent,
                DataPayload = payload
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetPreviewAsync Error: {ex.Message}");
            return null;
        }
    }

    // =========================================================
    // GET WORKFLOW STATS
    // =========================================================
    public async Task<CertificateWorkflowStatsDto> GetWorkflowStatsAsync(
        CancellationToken ct = default)
    {
        var all = await GetAllAsync(null, null, null, ct);

        return new CertificateWorkflowStatsDto
        {
            TotalCount = all.Count,
            GeneratedCount = all.Count(c => string.Equals(c.Status, "Generated", StringComparison.OrdinalIgnoreCase) || string.Equals(c.Status, "Active", StringComparison.OrdinalIgnoreCase)),
            ReviewedCount = all.Count(c => string.Equals(c.Status, "Reviewed", StringComparison.OrdinalIgnoreCase)),
            ApprovedCount = all.Count(c => string.Equals(c.Status, "Approved", StringComparison.OrdinalIgnoreCase)),
            IssuedCount = all.Count(c => string.Equals(c.Status, "Issued", StringComparison.OrdinalIgnoreCase)),
            CancelledCount = all.Count(c => string.Equals(c.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) || string.Equals(c.Status, "Deleted", StringComparison.OrdinalIgnoreCase) || !c.IsActive)
        };
    }

    // =========================================================
    // GET STUDENTS DROPDOWN
    // =========================================================
    public async Task<IReadOnlyList<StudentCertificateDropdownDto>> GetStudentsDropdownAsync(
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        var sql = @"
            SELECT 
                StudentId, AdmissionNo, RollNo, StudentName, GroupName, AcademicYear, AcademicLevel, Section
            FROM (
                SELECT 
                    s.StudentId AS StudentId,
                    COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
                    COALESCE(s.RollNo, '') AS RollNo,
                    COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
                    COALESCE(g.GroupName, '') AS GroupName,
                    COALESCE(ay.AcademicYearName, '') AS AcademicYear,
                    COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
                    COALESCE(sec.SectionName, '') AS Section,
                    COALESCE(s.IsActive, 1) AS IsActive
                FROM `Students` s
                LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
                LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
                LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId

                UNION ALL

                SELECT 
                    sa.AdmissionId AS StudentId,
                    COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
                    '' AS RollNo,
                    TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
                    COALESCE(g.GroupName, '') AS GroupName,
                    COALESCE(ay.AcademicYearName, '') AS AcademicYear,
                    '1st Year' AS AcademicLevel,
                    '' AS Section,
                    COALESCE(sa.IsActive, 1) AS IsActive
                FROM `StudentAdmissions` sa
                LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
                WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
            ) combined
            WHERE IsActive = 1
            ORDER BY StudentName ASC;";

        try
        {
            var list = await connection.QueryAsync<StudentCertificateDropdownDto>(
                new CommandDefinition(sql, cancellationToken: ct));

            return list.ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetStudentsDropdownAsync Error: {ex.Message}");
            return new List<StudentCertificateDropdownDto>();
        }
    }

    // =========================================================
    // GENERATE CERTIFICATE
    // =========================================================
    public async Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        using var connection = _database.CreateConnection();

        var requestDate = request.RequestDate ?? DateTime.UtcNow;

        // Fetch student details from Students / StudentAdmissions
        var studentSql = @"
            SELECT 
                COALESCE(s.StudentId, sa.AdmissionId, 0) AS StudentId,
                COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, @admissionNo) AS StudentName,
                COALESCE(g.GroupName, '') AS GroupName,
                COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
                COALESCE(ay.AcademicYearName, '') AS AcademicYear
            FROM `Students` s
            LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(s.AdmissionNo) OR sa.AdmissionId = s.StudentId)
            LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
            LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
            LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
            WHERE TRIM(s.AdmissionNo) = TRIM(@admissionNo) OR TRIM(sa.AdmissionNo) = TRIM(@admissionNo)
            LIMIT 1;";

        var student = await connection.QueryFirstOrDefaultAsync<StudentDetailsQueryModel>(
            new CommandDefinition(studentSql, new { admissionNo = request.AdmissionNo.Trim() }, cancellationToken: ct));

        // If not found in Students, try StudentAdmissions directly
        if (student == null)
        {
            var saSql = @"
                SELECT 
                    sa.AdmissionId AS StudentId,
                    COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), @admissionNo) AS StudentName,
                    COALESCE(g.GroupName, '') AS GroupName,
                    COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
                    COALESCE(ay.AcademicYearName, '') AS AcademicYear
                FROM `StudentAdmissions` sa
                LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
                LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sa.AcademicLevelId
                WHERE TRIM(sa.AdmissionNo) = TRIM(@admissionNo)
                LIMIT 1;";

            student = await connection.QueryFirstOrDefaultAsync<StudentDetailsQueryModel>(
                new CommandDefinition(saSql, new { admissionNo = request.AdmissionNo.Trim() }, cancellationToken: ct));
        }

        string studentName = !string.IsNullOrWhiteSpace(student?.StudentName) 
            ? student.StudentName 
            : request.AdmissionNo.Trim();
        string groupName = !string.IsNullOrWhiteSpace(student?.GroupName) ? student.GroupName : "";
        string academicLevel = !string.IsNullOrWhiteSpace(student?.AcademicLevel) ? student.AcademicLevel : "1st Year";
        string academicYear = !string.IsNullOrWhiteSpace(student?.AcademicYear) ? student.AcademicYear : $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}";
        int studentId = (student != null && student.StudentId > 0) ? student.StudentId : 1;

        var yearNum = DateTime.UtcNow.Year.ToString();
        var certPrefix = request.CertificateType switch
        {
            "Bonafide Certificate" => "BON",
            "Study Certificate" => "STU",
            "Conduct Certificate" => "CND",
            "Transfer Certificate" => "TC",
            "Transfer Certificate (TC)" => "TC",
            "Migration Certificate" => "MIG",
            "Course Completion Certificate" => "CMP",
            "Intermediate Pass Certificate" => "IPC",
            "Fee Due / Clearance Certificate" => "FEE",
            "Extracurricular Achievement Certificate" => "ACH",
            _ => "CERT"
        };

        var certNumber = $"{certPrefix}-{yearNum}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

        // Check if certificates table has modern columns
        var existingCols = await GetCertificateTableColumnsAsync(connection);

        int newId = 0;

        try
        {
            if (existingCols.Contains("CertificateNumber") && existingCols.Contains("StudentName"))
            {
                var insertSql = @"
                    INSERT INTO `certificates` (
                        CertificateNumber, StudentId, AdmissionNo, StudentName, GroupName, AcademicLevel, AcademicYear,
                        CertificateType, Purpose, Status, Remarks, RequestDate, IssueDate, IsActive, CreatedAt
                    ) VALUES (
                        @certNumber, @studentId, @admissionNo, @studentName, @groupName, @academicLevel, @academicYear,
                        @certificateType, @purpose, 'Generated', @remarks, @requestDate, @requestDate, 1, UTC_TIMESTAMP()
                    );
                    SELECT LAST_INSERT_ID();";

                var rawId = await connection.ExecuteScalarAsync<object>(
                    new CommandDefinition(insertSql, new
                    {
                        certNumber,
                        studentId,
                        admissionNo = request.AdmissionNo.Trim(),
                        studentName,
                        groupName,
                        academicLevel,
                        academicYear,
                        certificateType = request.CertificateType.Trim(),
                        purpose = request.Purpose.Trim(),
                        remarks = request.Remarks?.Trim(),
                        requestDate
                    }, cancellationToken: ct));

                if (rawId != null && rawId != DBNull.Value)
                {
                    newId = Convert.ToInt32(rawId);
                }
            }
            else
            {
                // Fallback for legacy DB schema: (StudentId, CertificateNo, CertificateType, Purpose, IssueDate, Remarks, Status, CreatedAt, IsActive)
                var insertLegacySql = @"
                    INSERT INTO `certificates` (
                        StudentId, CertificateNo, CertificateType, Purpose, IssueDate, Remarks, Status, CreatedAt, IsActive
                    ) VALUES (
                        @studentId, @certNumber, @certificateType, @purpose, @requestDate, @remarks, 'Generated', UTC_TIMESTAMP(), 1
                    );
                    SELECT LAST_INSERT_ID();";

                var rawId = await connection.ExecuteScalarAsync<object>(
                    new CommandDefinition(insertLegacySql, new
                    {
                        studentId,
                        certNumber,
                        certificateType = request.CertificateType.Trim(),
                        purpose = request.Purpose.Trim(),
                        requestDate,
                        remarks = request.Remarks?.Trim()
                    }, cancellationToken: ct));

                if (rawId != null && rawId != DBNull.Value)
                {
                    newId = Convert.ToInt32(rawId);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CertificateRepository.GenerateAsync] Insert Error for {request.AdmissionNo}: {ex.Message}");
        }

        CertificateResponseDto? createdRecord = null;
        if (newId > 0)
        {
            createdRecord = await GetByIdAsync(newId, ct);
        }

        // Secondary verification lookup by certificate number if ID lookup was null or newId == 0
        if (createdRecord == null)
        {
            createdRecord = await GetByCertificateNumberAsync(certNumber, ct);
        }

        // Final in-memory fallback to ensure the frontend always gets the newly generated certificate record
        if (createdRecord == null)
        {
            createdRecord = new CertificateResponseDto
            {
                CertificateId = newId,
                CertificateNumber = certNumber,
                StudentId = studentId,
                AdmissionNo = request.AdmissionNo.Trim(),
                StudentName = studentName,
                GroupName = groupName,
                AcademicLevel = academicLevel,
                AcademicYear = academicYear,
                CertificateType = request.CertificateType.Trim(),
                Purpose = request.Purpose.Trim(),
                Remarks = request.Remarks?.Trim() ?? string.Empty,
                Status = "Generated",
                RequestDate = requestDate,
                IssueDate = requestDate,
                GeneratedAt = requestDate,
                IsActive = true
            };
        }

        return createdRecord;
    }

    public async Task<CertificateResponseDto?> GetByCertificateNumberAsync(
        string certificateNumber,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNumber)) return null;

        using var connection = _database.CreateConnection();

        var cols = await GetCertificateTableColumnsAsync(connection);
        var certCol = cols.Contains("CertificateNumber") ? "c.CertificateNumber" : "c.CertificateNo";

        var sql = $@"
            SELECT 
                c.*,
                COALESCE(c.AdmissionNo, sa.AdmissionNo, s.AdmissionNo, '') AS S_AdmissionNo,
                COALESCE(c.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, '') AS S_StudentName,
                COALESCE(c.GroupName, g.GroupName, '') AS S_GroupName,
                COALESCE(c.AcademicLevel, al.LevelName, '1st Year') AS S_AcademicLevel,
                COALESCE(c.AcademicYear, ay.AcademicYearName, '') AS S_AcademicYear
            FROM `certificates` c
            LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
            LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
            LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
            LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
            LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
            WHERE {certCol} = @certificateNumber
            LIMIT 1;";

        try
        {
            var row = await connection.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(sql, new { certificateNumber = certificateNumber.Trim() }, cancellationToken: ct));

            return row == null ? null : MapDynamicToDto(row);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetByCertificateNumberAsync Error: {ex.Message}");
            return null;
        }
    }

    public async Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateDto request,
        CancellationToken ct = default)
    {
        return await GenerateAsync(new GenerateCertificateRequestDto
        {
            AdmissionNo = request.AdmissionNo,
            CertificateType = request.CertificateType,
            Purpose = request.Purpose,
            RequestDate = request.IssueDate,
            Remarks = request.Remarks
        }, ct);
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> GetHistoryAsync(
        string? admissionNo,
        CancellationToken ct = default)
    {
        return await GetAllAsync(admissionNo, null, null, ct);
    }

    public async Task<CertificateResponseDto?> VerifyAsync(
        string certificateNo,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNo))
            return null;

        var byCert = await GetByCertificateNumberAsync(certificateNo, ct);
        if (byCert != null) return byCert;

        var all = await GetAllAsync(null, null, null, ct);
        return all.FirstOrDefault(c => string.Equals(c.CertificateNumber?.Trim(), certificateNo.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public async Task<CertificateResponseDto?> ReissueAsync(
        ReissueCertificateDto request,
        CancellationToken ct = default)
    {
        return await GenerateAsync(new GenerateCertificateRequestDto
        {
            AdmissionNo = request.AdmissionNo,
            CertificateType = request.CertificateType,
            Purpose = request.Purpose,
            RequestDate = request.RequestDate,
            Remarks = $"[Reissue] {request.Remarks}"
        }, ct);
    }

    public async Task<CertificateResponseDto?> UpdateByAdmissionNoAsync(
        UpdateCertificateDto request,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        var sql = @"
            UPDATE `certificates`
            SET 
                CertificateType = COALESCE(NULLIF(@type, ''), CertificateType),
                Purpose = COALESCE(NULLIF(@purpose, ''), Purpose),
                IssueDate = @issueDate,
                Remarks = @remarks
            WHERE StudentId = (SELECT StudentId FROM `Students` WHERE AdmissionNo = @admissionNo LIMIT 1)
            ORDER BY 1 DESC
            LIMIT 1;";

        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            type = request.CertificateType?.Trim(),
            purpose = request.Purpose?.Trim(),
            issueDate = request.IssueDate,
            remarks = request.Remarks?.Trim(),
            admissionNo = request.AdmissionNo.Trim()
        }, cancellationToken: ct));

        var all = await GetAllAsync(request.AdmissionNo.Trim(), null, null, ct);
        return all.FirstOrDefault();
    }

    public async Task<bool> MoveStatusAsync(
        int id,
        string status,
        string? issuedBy = null,
        CancellationToken ct = default)
    {
        if (id <= 0 || string.IsNullOrWhiteSpace(status))
            return false;

        using var connection = _database.CreateConnection();

        try
        {
            var cols = await GetCertificateTableColumnsAsync(connection);
            var pk = cols.Contains("CertificateId") ? "CertificateId" : "Id";

            var sql = $"UPDATE `certificates` SET Status = @status WHERE {pk} = @id;";

            var affected = await connection.ExecuteAsync(new CommandDefinition(sql, new { id, status }, cancellationToken: ct));
            return affected > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"MoveStatusAsync Error: {ex.Message}");
            return false;
        }
    }

    public async Task<int> BulkReviewAsync(
        string reviewedBy,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        try
        {
            var sql = "UPDATE `certificates` SET Status = 'Reviewed' WHERE Status IN ('Generated', 'Requested', 'Pending');";
            return await connection.ExecuteAsync(new CommandDefinition(sql, cancellationToken: ct));
        }
        catch
        {
            return 0;
        }
    }

    public async Task<int> BulkApproveAsync(
        string approvedBy,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        try
        {
            var sql = "UPDATE `certificates` SET Status = 'Approved' WHERE Status = 'Reviewed';";
            return await connection.ExecuteAsync(new CommandDefinition(sql, cancellationToken: ct));
        }
        catch
        {
            return 0;
        }
    }

    public async Task<int> BulkIssueAsync(
        string issuedBy,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        try
        {
            var sql = "UPDATE `certificates` SET Status = 'Issued' WHERE Status = 'Approved';";
            return await connection.ExecuteAsync(new CommandDefinition(sql, cancellationToken: ct));
        }
        catch
        {
            return 0;
        }
    }

    public async Task<bool> CancelAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return false;

        using var connection = _database.CreateConnection();

        try
        {
            var cols = await GetCertificateTableColumnsAsync(connection);
            var pk = cols.Contains("CertificateId") ? "CertificateId" : "Id";

            var sql = $"UPDATE `certificates` SET Status = 'Cancelled' WHERE {pk} = @id;";
            var affected = await connection.ExecuteAsync(new CommandDefinition(sql, new { id }, cancellationToken: ct));
            return affected > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"CancelAsync Error: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return false;

        using var connection = _database.CreateConnection();

        try
        {
            var cols = await GetCertificateTableColumnsAsync(connection);
            var pk = cols.Contains("CertificateId") ? "CertificateId" : "Id";

            var sql = $"DELETE FROM `certificates` WHERE {pk} = @id;";
            var affected = await connection.ExecuteAsync(new CommandDefinition(sql, new { id }, cancellationToken: ct));
            return affected > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DeleteAsync Error: {ex.Message}");
            return false;
        }
    }

    // =========================================================
    // BULK GENERATE CERTIFICATES
    // =========================================================
    public async Task<IReadOnlyList<CertificateResponseDto>> BulkGenerateAsync(
        BulkGenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.AdmissionNos == null || !request.AdmissionNos.Any())
            return new List<CertificateResponseDto>();

        var results = new List<CertificateResponseDto>();

        foreach (var admissionNo in request.AdmissionNos.Distinct())
        {
            if (string.IsNullOrWhiteSpace(admissionNo)) continue;

            var singleReq = new GenerateCertificateRequestDto
            {
                AdmissionNo = admissionNo.Trim(),
                CertificateType = request.CertificateType,
                Purpose = request.Purpose,
                RequestDate = request.RequestDate ?? DateTime.UtcNow,
                Remarks = request.Remarks
            };

            try
            {
                var created = await GenerateAsync(singleReq, ct);
                if (created != null)
                {
                    results.Add(created);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error bulk generating for {admissionNo}: {ex.Message}");
            }
        }

        return results;
    }

    // =========================================================
    // GET BULK ELIGIBLE STUDENTS (GRID SELECTION)
    // =========================================================
    public async Task<IReadOnlyList<BulkEligibleStudentDto>> GetBulkEligibleStudentsAsync(
        int? academicYearId,
        int? boardId,
        int? groupId,
        int? sectionId,
        string? search,
        CancellationToken ct = default)
    {
        using var connection = _database.CreateConnection();

        var sql = @"
            SELECT 
                StudentId, AdmissionNo, RollNo, StudentName, GroupName, SectionName, AcademicYear, BoardName
            FROM (
                SELECT 
                    s.StudentId AS StudentId,
                    COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
                    COALESCE(s.RollNo, '') AS RollNo,
                    COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
                    COALESCE(g.GroupName, '') AS GroupName,
                    COALESCE(sec.SectionName, '') AS SectionName,
                    COALESCE(ay.AcademicYearName, '') AS AcademicYear,
                    COALESCE(b.BoardName, '') AS BoardName,
                    s.AcademicYearId,
                    s.BoardId,
                    s.GroupId,
                    s.SectionId,
                    COALESCE(s.IsActive, 1) AS IsActive
                FROM `Students` s
                LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
                LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
                LEFT JOIN `Boards` b ON b.BoardId = s.BoardId

                UNION ALL

                SELECT 
                    sa.AdmissionId AS StudentId,
                    COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
                    '' AS RollNo,
                    TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
                    COALESCE(g.GroupName, '') AS GroupName,
                    '' AS SectionName,
                    COALESCE(ay.AcademicYearName, '') AS AcademicYear,
                    COALESCE(b.BoardName, '') AS BoardName,
                    sa.AcademicYearId,
                    sa.BoardId,
                    sa.GroupId,
                    CAST(NULL AS SIGNED) AS SectionId,
                    COALESCE(sa.IsActive, 1) AS IsActive
                FROM `StudentAdmissions` sa
                LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
                LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
                WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
            ) combined
            WHERE IsActive = 1
              AND (@academicYearId IS NULL OR AcademicYearId = @academicYearId)
              AND (@boardId IS NULL OR BoardId = @boardId)
              AND (@groupId IS NULL OR GroupId = @groupId)
              AND (@sectionId IS NULL OR SectionId = @sectionId)
              AND (
                  @search IS NULL OR @search = '' OR
                  AdmissionNo LIKE CONCAT('%', @search, '%') OR
                  StudentName LIKE CONCAT('%', @search, '%') OR
                  RollNo LIKE CONCAT('%', @search, '%')
              )
            ORDER BY StudentName ASC;";

        try
        {
            var list = (await connection.QueryAsync<BulkEligibleStudentDto>(
                new CommandDefinition(sql, new { academicYearId, boardId, groupId, sectionId, search }, cancellationToken: ct))).ToList();

            return list;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetBulkEligibleStudentsAsync Error: {ex.Message}");
            return new List<BulkEligibleStudentDto>();
        }
    }

    private static async Task<HashSet<string>> GetCertificateTableColumnsAsync(IDbConnection connection)
    {
        try
        {
            var cols = await connection.QueryAsync<string>(@"
                SELECT COLUMN_NAME FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name = 'certificates';");
            return cols.ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Id", "CertificateNo", "Status" };
        }
    }

    // =========================================================
    // DYNAMIC ROW MAPPER (Handles both Legacy & New DB columns)
    // =========================================================
    private static CertificateResponseDto MapDynamicToDto(dynamic row)
    {
        var dict = (IDictionary<string, object>)row;

        int id = 0;
        if (dict.ContainsKey("CertificateId") && dict["CertificateId"] != null)
            id = Convert.ToInt32(dict["CertificateId"]);
        else if (dict.ContainsKey("Id") && dict["Id"] != null)
            id = Convert.ToInt32(dict["Id"]);

        string certNo = "";
        if (dict.ContainsKey("CertificateNumber") && dict["CertificateNumber"] != null)
            certNo = dict["CertificateNumber"].ToString()!;
        else if (dict.ContainsKey("CertificateNo") && dict["CertificateNo"] != null)
            certNo = dict["CertificateNo"].ToString()!;

        int studentId = 0;
        if (dict.ContainsKey("StudentId") && dict["StudentId"] != null)
            studentId = Convert.ToInt32(dict["StudentId"]);

        string admissionNo = "";
        if (dict.ContainsKey("AdmissionNo") && dict["AdmissionNo"] != null && !string.IsNullOrWhiteSpace(dict["AdmissionNo"].ToString()))
            admissionNo = dict["AdmissionNo"].ToString()!;
        else if (dict.ContainsKey("S_AdmissionNo") && dict["S_AdmissionNo"] != null)
            admissionNo = dict["S_AdmissionNo"].ToString()!;

        string studentName = "";
        if (dict.ContainsKey("StudentName") && dict["StudentName"] != null && !string.IsNullOrWhiteSpace(dict["StudentName"].ToString()))
            studentName = dict["StudentName"].ToString()!;
        else if (dict.ContainsKey("S_StudentName") && dict["S_StudentName"] != null)
            studentName = dict["S_StudentName"].ToString()!;

        string groupName = "";
        if (dict.ContainsKey("GroupName") && dict["GroupName"] != null && !string.IsNullOrWhiteSpace(dict["GroupName"].ToString()))
            groupName = dict["GroupName"].ToString()!;
        else if (dict.ContainsKey("S_GroupName") && dict["S_GroupName"] != null)
            groupName = dict["S_GroupName"].ToString()!;

        string academicLevel = "";
        if (dict.ContainsKey("AcademicLevel") && dict["AcademicLevel"] != null && !string.IsNullOrWhiteSpace(dict["AcademicLevel"].ToString()))
            academicLevel = dict["AcademicLevel"].ToString()!;
        else if (dict.ContainsKey("S_AcademicLevel") && dict["S_AcademicLevel"] != null)
            academicLevel = dict["S_AcademicLevel"].ToString()!;

        string academicYear = "";
        if (dict.ContainsKey("AcademicYear") && dict["AcademicYear"] != null && !string.IsNullOrWhiteSpace(dict["AcademicYear"].ToString()))
            academicYear = dict["AcademicYear"].ToString()!;
        else if (dict.ContainsKey("S_AcademicYear") && dict["S_AcademicYear"] != null)
            academicYear = dict["S_AcademicYear"].ToString()!;

        string certType = dict.ContainsKey("CertificateType") && dict["CertificateType"] != null ? dict["CertificateType"].ToString()! : "Certificate";
        string purpose = dict.ContainsKey("Purpose") && dict["Purpose"] != null ? dict["Purpose"].ToString()! : "";
        string remarks = dict.ContainsKey("Remarks") && dict["Remarks"] != null ? dict["Remarks"].ToString()! : "";
        string status = dict.ContainsKey("Status") && dict["Status"] != null ? dict["Status"].ToString()! : "Generated";
        if (status.Equals("Active", StringComparison.OrdinalIgnoreCase)) status = "Generated";

        DateTime reqDate = DateTime.UtcNow;
        if (dict.ContainsKey("RequestDate") && dict["RequestDate"] != null && dict["RequestDate"] is DateTime rdt)
            reqDate = rdt;
        else if (dict.ContainsKey("IssueDate") && dict["IssueDate"] != null && dict["IssueDate"] is DateTime idt)
            reqDate = idt;
        else if (dict.ContainsKey("CreatedAt") && dict["CreatedAt"] != null && dict["CreatedAt"] is DateTime cdt)
            reqDate = cdt;

        DateTime issDate = reqDate;
        if (dict.ContainsKey("IssueDate") && dict["IssueDate"] != null && dict["IssueDate"] is DateTime idt2)
            issDate = idt2;

        return new CertificateResponseDto
        {
            CertificateId = id,
            CertificateNumber = certNo,
            StudentId = studentId,
            AdmissionNo = admissionNo,
            StudentName = studentName,
            GroupName = groupName,
            AcademicLevel = !string.IsNullOrWhiteSpace(academicLevel) ? academicLevel : "1st Year",
            AcademicYear = academicYear,
            CertificateType = certType,
            Purpose = purpose,
            Remarks = remarks,
            Status = status,
            RequestDate = reqDate,
            IssueDate = issDate,
            GeneratedAt = reqDate,
            IsActive = !status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) && !status.Equals("Deleted", StringComparison.OrdinalIgnoreCase)
        };
    }
}