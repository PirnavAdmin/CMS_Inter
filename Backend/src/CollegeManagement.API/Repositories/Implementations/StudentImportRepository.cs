using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StudentImportRepository : IStudentImportRepository
    {
        private readonly AppDbContext _context;

        public StudentImportRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<StudentImportTemplateLookups> GetTemplateLookupsAsync(CancellationToken ct = default)
        {
            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)conn).OpenAsync(ct);
            }

            using var grid = await conn.QueryMultipleAsync(
                "sp_GetStudentImportTemplateLookups",
                commandType: CommandType.StoredProcedure);

            var lookups = new StudentImportTemplateLookups
            {
                Boards = (await grid.ReadAsync<(string Code, string Name)>()).ToList(),
                AcademicYears = (await grid.ReadAsync<string>()).ToList(),
                AcademicLevels = (await grid.ReadAsync<(string Code, string Name)>()).ToList(),
                Groups = (await grid.ReadAsync<(string Code, string Name, string BoardCode, string LevelCode)>()).ToList(),
                Programs = (await grid.ReadAsync<(string ProgramName, string GroupCode)>()).ToList(),
                Sections = (await grid.ReadAsync<(string SectionName, string GroupCode, string ProgramName, string YearName, string LevelCode, string BoardCode)>()).ToList()
            };

            return lookups;
        }

        public async Task<StudentImportMasterRawData> GetMasterDataAsync(CancellationToken ct = default)
        {
            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)conn).OpenAsync(ct);
            }

            using var grid = await conn.QueryMultipleAsync(
                "sp_GetStudentImportMasterDataCache",
                commandType: CommandType.StoredProcedure);

            var rawData = new StudentImportMasterRawData
            {
                Boards = (await grid.ReadAsync<(int BoardId, string BoardCode, string BoardName)>()).ToList(),
                AcademicYears = (await grid.ReadAsync<(int AcademicYearId, int BoardId, string AcademicYearName)>()).ToList(),
                AcademicLevels = (await grid.ReadAsync<(int AcademicLevelId, string LevelCode, string LevelName)>()).ToList(),
                Groups = (await grid.ReadAsync<(int GroupId, int BoardId, int AcademicYearId, int AcademicLevelId, string GroupCode, string GroupName)>()).ToList(),
                GroupPrograms = (await grid.ReadAsync<(int GroupId, int ProgramId, string ProgramName)>()).ToList(),
                Sections = (await grid.ReadAsync<(int SectionId, int BoardId, int AcademicYearId, int AcademicLevelId, int GroupId, int? ProgramId, string SectionName)>()).ToList()
            };

            return rawData;
        }

        public async Task<HashSet<string>> GetExistingAdmissionNumbersAsync(IEnumerable<string> admissionNos, CancellationToken ct = default)
        {
            var list = admissionNos?.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct().ToList() ?? new List<string>();
            if (list.Count == 0)
            {
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            }

            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)conn).OpenAsync(ct);
            }

            var json = JsonSerializer.Serialize(list);
            var results = await conn.QueryAsync<string>(
                "sp_CheckExistingAdmissionNumbers",
                new { p_AdmissionNosJson = json },
                commandType: CommandType.StoredProcedure);

            return new HashSet<string>(results, StringComparer.OrdinalIgnoreCase);
        }

        public async Task<int> InsertImportedStudentAsync(
            StudentImportService.ResolvedStudentInsertModel s,
            IDbConnection connection,
            IDbTransaction transaction)
        {
            var studentId = await connection.ExecuteScalarAsync<int>(
                "sp_ImportSingleStudent",
                new
                {
                    p_AdmissionNo = s.AdmissionNo,
                    p_RollNo = s.RollNo,
                    p_AdmissionDate = s.AdmissionDate,
                    p_AdmissionType = s.AdmissionType,
                    p_AdmissionQuota = s.AdmissionQuota,
                    p_Medium = s.Medium,
                    p_SecondLanguage = s.SecondLanguage,
                    p_StudentName = s.StudentName,
                    p_Photo = (string?)null,
                    p_Gender = s.Gender,
                    p_DateOfBirth = s.DateOfBirth,
                    p_BloodGroup = s.BloodGroup,
                    p_Email = s.Email,
                    p_MobileNumber = s.MobileNumber,
                    p_AadhaarNumber = s.AadhaarNumber,
                    p_Nationality = s.Nationality,
                    p_Religion = s.Religion,
                    p_Category = s.Category,
                    p_Address = s.Address,
                    p_City = s.City,
                    p_District = s.District,
                    p_State = s.State,
                    p_Pincode = s.Pincode,
                    p_BoardId = s.BoardId,
                    p_AcademicYearId = s.AcademicYearId,
                    p_AcademicLevelId = s.AcademicLevelId,
                    p_GroupId = s.GroupId,
                    p_ProgramId = s.ProgramId,
                    p_SectionId = s.SectionId,
                    p_PreviousSchool = s.PreviousSchool,
                    p_PreviousHallTicketNumber = s.PreviousHallTicketNumber,
                    p_PreviousBoard = s.PreviousBoard,
                    p_PreviousYearOfPassing = s.PreviousYearOfPassing,
                    p_PreviousPercentage = s.PreviousPercentage,
                    p_StudentCategory = s.StudentCategory,
                    p_ScholarshipStatus = s.ScholarshipStatus,
                    p_ScholarshipAmount = s.ScholarshipAmount,
                    p_FatherName = s.FatherName,
                    p_FatherOccupation = s.FatherOccupation,
                    p_FatherMobile = s.FatherMobile,
                    p_FatherEmail = s.FatherEmail,
                    p_MotherName = s.MotherName,
                    p_MotherOccupation = s.MotherOccupation,
                    p_MotherMobile = s.MotherMobile,
                    p_MotherEmail = s.MotherEmail,
                    p_GuardianName = s.GuardianName,
                    p_GuardianMobile = s.GuardianMobile,
                    p_GuardianEmail = s.GuardianEmail,
                    p_AnnualIncome = s.AnnualIncome,
                    p_FeeAmount = s.FeeAmount,
                    p_FeePaid = s.FeePaid,
                    p_FeeStatus = s.FeeStatus,
                    p_AttendancePercentage = s.AttendancePercentage,
                    p_PerformanceGrade = s.PerformanceGrade,
                    p_CGPA = s.CGPA,
                    p_Rank = s.Rank,
                    p_Remarks = s.Remarks,
                    p_PasswordHash = s.PasswordHash,
                    p_IsFirstLogin = 1
                },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            return studentId;
        }

        public async Task<List<dynamic>> GetStudentCredentialsForExportAsync(
            StudentCredentialPdfFilterDto? filter,
            CancellationToken ct = default)
        {
            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)conn).OpenAsync(ct);
            }

            var records = (await conn.QueryAsync(
                "sp_GetStudentCredentialsForExport",
                new
                {
                    p_BoardId = filter?.BoardId,
                    p_AcademicYearId = filter?.AcademicYearId,
                    p_AcademicLevelId = filter?.AcademicLevelId,
                    p_GroupId = filter?.GroupId,
                    p_SectionId = filter?.SectionId,
                    p_AdmissionNo = filter?.AdmissionNo
                },
                commandType: CommandType.StoredProcedure)).ToList();

            return records;
        }
    }
}
