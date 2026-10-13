using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Helpers
{
    public static class NumberSeriesPatternEvaluator
    {
        public static string Evaluate(
            string pattern,
            int sequenceNumber,
            int numberLength,
            string prefix = "",
            GenerateNumberSeriesRequestDto? context = null,
            DateTime? referenceDate = null,
            bool isPreview = false)
        {
            if (string.IsNullOrWhiteSpace(pattern))
            {
                var fallbackPadded = sequenceNumber.ToString().PadLeft(Math.Max(1, numberLength), '0');
                return string.IsNullOrWhiteSpace(prefix) ? fallbackPadded : $"{prefix}{fallbackPadded}";
            }

            var now = referenceDate ?? DateTime.Now;
            var result = pattern;

            // 1. Sequence formatting
            var paddedSeq = sequenceNumber.ToString().PadLeft(Math.Max(1, numberLength), '0');
            result = Regex.Replace(result, @"\{SEQ\}", paddedSeq, RegexOptions.IgnoreCase);

            // 2. Date & Year tokens
            string ayStr = !string.IsNullOrWhiteSpace(context?.AcademicYear) ? context.AcademicYear : $"{now.Year}-{(now.Year + 1)}";
            string yyyy = ayStr.Length >= 4 ? ayStr.Substring(0, 4) : now.ToString("yyyy");
            string yy = ayStr.Length >= 4 ? ayStr.Substring(2, 2) : now.ToString("yy");
            
            result = Regex.Replace(result, @"\{YYYY\}", yyyy, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YEAR\}", yyyy, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YY\}", yy, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{YYYYMMDD\}", now.ToString("yyyyMMdd"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{MM\}", now.ToString("MM"), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{DD\}", now.ToString("dd"), RegexOptions.IgnoreCase);

            // 3. Prefix token
            result = Regex.Replace(result, @"\{PREFIX\}", prefix ?? string.Empty, RegexOptions.IgnoreCase);

            // 4. Academic Year token
            result = Regex.Replace(result, @"\{AY\}", ayStr, RegexOptions.IgnoreCase);

            // 5. Random Alphanumeric Token (e.g. 82FC40)
            if (Regex.IsMatch(result, @"\{RANDOM\}", RegexOptions.IgnoreCase))
            {
                string randomStr;
                if (isPreview)
                {
                    // Fixed readable mock preview matching UI screenshot state
                    randomStr = "82FC40";
                }
                else
                {
                    randomStr = GenerateRandomAlphanumeric(6);
                }
                result = Regex.Replace(result, @"\{RANDOM\}", randomStr, RegexOptions.IgnoreCase);
            }

            // 6. Contextual dynamic tokens
            var board = !string.IsNullOrWhiteSpace(context?.BoardCode) ? context.BoardCode : (!string.IsNullOrWhiteSpace(context?.Board) ? context.Board : "BIEAP");
            result = System.Text.RegularExpressions.Regex.Replace(result, @"\{BOARD\}", board, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            result = System.Text.RegularExpressions.Regex.Replace(result, @"\{BOARD:1\}", board.StartsWith("[") ? board : board.Substring(0, 1), System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            var dept = !string.IsNullOrWhiteSpace(context?.Dept) ? context.Dept : "MATH";
            result = Regex.Replace(result, @"\{DEPT\}", dept, RegexOptions.IgnoreCase);

            var desig = !string.IsNullOrWhiteSpace(context?.Desig) ? context.Desig : "LEC";
            result = Regex.Replace(result, @"\{DESIG\}", desig, RegexOptions.IgnoreCase);

            var staff = !string.IsNullOrWhiteSpace(context?.Staff) ? context.Staff : "TCH";
            result = Regex.Replace(result, @"\{STAFF\}", staff, RegexOptions.IgnoreCase);

            var cert = !string.IsNullOrWhiteSpace(context?.Cert) ? context.Cert : "CND";
            result = Regex.Replace(result, @"\{CERT\}", cert, RegexOptions.IgnoreCase);

            var campusStr = !string.IsNullOrWhiteSpace(context?.CampusCode) ? context.CampusCode : "M";
            var campus = campusStr.ToUpperInvariant();
            result = System.Text.RegularExpressions.Regex.Replace(result, @"\{CAMPUS\}", campus, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            result = System.Text.RegularExpressions.Regex.Replace(result, @"\{CAMPUS:2\}", campus.Length >= 2 ? campus.Substring(0, 2) : campus, System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            var type = !string.IsNullOrWhiteSpace(context?.Type) ? context.Type : "GEN";
            result = Regex.Replace(result, @"\{TYPE\}", type, RegexOptions.IgnoreCase);

            var group = !string.IsNullOrWhiteSpace(context?.GroupCode) ? context.GroupCode : (!string.IsNullOrWhiteSpace(context?.Group) ? context.Group : "GROUP");
            result = Regex.Replace(result, @"\{GROUP\}", group, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{GROUP:1\}", group.Length >= 1 ? group.Substring(0, 1) : group, RegexOptions.IgnoreCase);

            var program = !string.IsNullOrWhiteSpace(context?.Program) ? context.Program : "PROGRAM";
            result = Regex.Replace(result, @"\{PROGRAM\}", program, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{PROGRAM:1\}", program.Length >= 1 ? program.Substring(0, 1) : program, RegexOptions.IgnoreCase);

            var section = !string.IsNullOrWhiteSpace(context?.Section) ? context.Section : "A";
            result = Regex.Replace(result, @"\{SECTION\}", section, RegexOptions.IgnoreCase);

            var level = !string.IsNullOrWhiteSpace(context?.LevelCode) ? context.LevelCode : (!string.IsNullOrWhiteSpace(context?.Level) ? context.Level : "1st Year");
            result = Regex.Replace(result, @"\{LEVEL\}", level, RegexOptions.IgnoreCase);

            var exam = !string.IsNullOrWhiteSpace(context?.Exam) ? context.Exam : "FINAL";
            result = Regex.Replace(result, @"\{EXAM\}", exam, RegexOptions.IgnoreCase);

            return result;
        }

        public static string GenerateRandomAlphanumeric(int length = 6)
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var bytes = new byte[length];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            var result = new char[length];
            for (int i = 0; i < length; i++)
            {
                result[i] = chars[bytes[i] % chars.Length];
            }
            return new string(result);
        }

        public static List<string> GetAvailablePlaceholders(string seriesCode)
        {
            return seriesCode.ToUpperInvariant() switch
            {
                "TEACHING_STAFF_ID" or "EMPLOYEE_ID" => new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}" },
                "NON_TEACHING_STAFF_ID" => new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}" },
                "ADMISSION_NO" => new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{AY}", "{BOARD}" },
                "ROLL_NO" => new List<string> { "{SEQ}", "{GROUP}", "{GROUP:1}", "{SECTION}", "{YYYY}", "{YY}", "{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{BOARD}", "{BOARD:1}", "{AY}", "{PROGRAM}", "{PROGRAM:1}", "{LEVEL}" },
                "STUDENT_ID" => new List<string> { "{SEQ}", "{YYYY}", "{YY}" },
                "SECTION_NAME" => new List<string> { "{GROUP}", "{SECTION}", "{LEVEL}", "{BOARD}" },
                "EXAM_CODE" => new List<string> { "{GROUP}", "{TYPE}", "{YEAR}", "{SEQ}", "{EXAM}" },
                "CERTIFICATE_NO" => new List<string> { "{CERT}", "{TYPE}", "{YEAR}", "{SEQ}", "{RANDOM}" },
                "RECEIPT_NO" => new List<string> { "{PREFIX}", "{YYYYMMDD}", "{YYYY}", "{MM}", "{DD}", "{SEQ}" },
                _ => new List<string> { "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{RANDOM}" }
            };
        }

        public static List<SampleFormatDto> GetSampleFormats(string seriesCode)
        {
            var year = DateTime.Now.Year;
            return seriesCode.ToUpperInvariant() switch
            {
                "TEACHING_STAFF_ID" or "EMPLOYEE_ID" => new List<SampleFormatDto>
                {
                    new() { Pattern = "PCTCH{SEQ}", Example = "PCTCH0001" },
                    new() { Pattern = "TCH-{YYYY}-{SEQ}", Example = $"TCH-{year}-0001" },
                    new() { Pattern = "FAC-{DEPT}-{SEQ}", Example = "FAC-MATH-0001" }
                },
                "NON_TEACHING_STAFF_ID" => new List<SampleFormatDto>
                {
                    new() { Pattern = "PCNT{SEQ}", Example = "PCNT0001" },
                    new() { Pattern = "NT-{YYYY}-{SEQ}", Example = $"NT-{year}-0001" },
                    new() { Pattern = "ADM-{DEPT}-{SEQ}", Example = "ADM-OFFICE-0001" }
                },
                "ADMISSION_NO" => new List<SampleFormatDto>
                {
                    new() { Pattern = "ADM-{SEQ}", Example = "ADM-01" },
                    new() { Pattern = "ADM-{AY}-{SEQ}", Example = $"ADM-{year}-0001" },
                    new() { Pattern = "ADM-{BOARD}-{SEQ}", Example = "ADM-BIEAP-0001" }
                },
                "ROLL_NO" => new List<SampleFormatDto>
                {
                    new() { Pattern = "{SEQ}", Example = "1" },
                    new() { Pattern = "{PREFIX}{SEQ}", Example = "MPC-1" },
                    new() { Pattern = "{GROUP}-{SEQ}", Example = "MPC-01" },
                    new() { Pattern = "{YYYY}-{GROUP}-{SEQ}", Example = $"2026-MPC-001" },
                    new() { Pattern = "{YY}{CAMPUS:2}{BOARD}{PROGRAM:1}{GROUP:1}{SEQ}", Example = $"211FA04217" }
                },
                "STUDENT_ID" => new List<SampleFormatDto>
                {
                    new() { Pattern = "{SEQ}", Example = "518" },
                    new() { Pattern = "STU-{SEQ}", Example = "STU-001" }
                },
                "SECTION_NAME" => new List<SampleFormatDto>
                {
                    new() { Pattern = "{GROUP}-Section {SECTION}", Example = "MPC-Section A" },
                    new() { Pattern = "{GROUP}-{LEVEL}-{SECTION}", Example = "MPC-SR-A" }
                },
                "EXAM_CODE" => new List<SampleFormatDto>
                {
                    new() { Pattern = "{GROUP}-{TYPE}-{YEAR}", Example = $"MPC-FINAL-{year}" },
                    new() { Pattern = "EXAM-{YEAR}-{SEQ}", Example = $"EXAM-{year}-0001" }
                },
                "CERTIFICATE_NO" => new List<SampleFormatDto>
                {
                    new() { Pattern = "CND-{YEAR}-{RANDOM}", Example = $"CND-{year}-82FC40" },
                    new() { Pattern = "CERT-{YEAR}-{SEQ}", Example = $"CERT-{year}-000001" },
                    new() { Pattern = "TC-{YEAR}-{RANDOM}", Example = $"TC-{year}-A94F12" }
                },
                "RECEIPT_NO" => new List<SampleFormatDto>
                {
                    new() { Pattern = "FEE-{YYYYMMDD}-{SEQ}", Example = $"FEE-{DateTime.Now:yyyyMMdd}-000011" },
                    new() { Pattern = "RCP-{YYYY}-{SEQ}", Example = $"RCP-{year}-000001" },
                    new() { Pattern = "FEE-{SEQ}", Example = "FEE-000001" }
                },
                _ => new List<SampleFormatDto>()
            };
        }
    }
}
