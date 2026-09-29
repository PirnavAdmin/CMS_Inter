using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Students;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public class StudentImportTemplateLookups
    {
        public List<(string Code, string Name)> Boards { get; set; } = new();
        public List<string> AcademicYears { get; set; } = new();
        public List<(string Code, string Name)> AcademicLevels { get; set; } = new();
        public List<(string Code, string Name, string BoardCode, string LevelCode)> Groups { get; set; } = new();
        public List<(string ProgramName, string GroupCode)> Programs { get; set; } = new();
        public List<(string SectionName, string GroupCode, string ProgramName, string YearName, string LevelCode, string BoardCode)> Sections { get; set; } = new();
    }

    public class StudentImportMasterRawData
    {
        public List<(int BoardId, string BoardCode, string BoardName)> Boards { get; set; } = new();
        public List<(int AcademicYearId, int BoardId, string AcademicYearName)> AcademicYears { get; set; } = new();
        public List<(int AcademicLevelId, string LevelCode, string LevelName)> AcademicLevels { get; set; } = new();
        public List<(int GroupId, int BoardId, int AcademicYearId, int AcademicLevelId, string GroupCode, string GroupName)> Groups { get; set; } = new();
        public List<(int GroupId, int ProgramId, string ProgramName)> GroupPrograms { get; set; } = new();
        public List<(int SectionId, int BoardId, int AcademicYearId, int AcademicLevelId, int GroupId, int? ProgramId, string SectionName)> Sections { get; set; } = new();
    }

    public interface IStudentImportRepository
    {
        Task<StudentImportTemplateLookups> GetTemplateLookupsAsync(CancellationToken ct = default);

        Task<StudentImportMasterRawData> GetMasterDataAsync(CancellationToken ct = default);

        Task<HashSet<string>> GetExistingAdmissionNumbersAsync(IEnumerable<string> admissionNos, CancellationToken ct = default);

        Task<int> InsertImportedStudentAsync(
            CollegeManagement.API.Services.Implementations.StudentImportService.ResolvedStudentInsertModel student,
            IDbConnection connection,
            IDbTransaction transaction);

        Task<List<dynamic>> GetStudentCredentialsForExportAsync(
            StudentCredentialPdfFilterDto? filter,
            CancellationToken ct = default);
    }
}
