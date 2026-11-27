using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class TenantSecurityService : ITenantSecurityService
    {
        private readonly AppDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly ILogger<TenantSecurityService> _logger;

        public TenantSecurityService(
            AppDbContext db,
            IMemoryCache cache,
            ILogger<TenantSecurityService> logger)
        {
            _db = db;
            _cache = cache;
            _logger = logger;
        }

        public async Task<List<int>> GetCampusesForCollegeAsync(int collegeId)
        {
            if (collegeId <= 0) return new List<int>();

            string cacheKey = $"tenant_campuses_{collegeId}";
            if (_cache.TryGetValue(cacheKey, out List<int>? campuses) && campuses != null)
            {
                return campuses;
            }

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            campuses = (await conn.QueryAsync<int>(
                "SELECT CampusId FROM Campuses WHERE CollegeId = @CollegeId AND IsActive = 1 ORDER BY IsHQ DESC, CampusId ASC;",
                new { CollegeId = collegeId })).ToList();

            _cache.Set(cacheKey, campuses, TimeSpan.FromMinutes(5));
            return campuses;
        }

        public async Task<bool> ValidateCampusOwnershipAsync(int campusId, int collegeId)
        {
            if (campusId <= 0 || collegeId <= 0) return false;
            var campuses = await GetCampusesForCollegeAsync(collegeId);
            return campuses.Contains(campusId);
        }

        public async Task ValidateStudentOwnershipAsync(int studentId, int collegeId)
        {
            if (studentId <= 0) throw new NotFoundException("Student not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var studentCampusId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT CampusId FROM Students WHERE StudentId = @StudentId;",
                new { StudentId = studentId });

            if (!studentCampusId.HasValue)
            {
                throw new NotFoundException($"Student with ID {studentId} not found.");
            }

            var campuses = await GetCampusesForCollegeAsync(collegeId);
            if (!campuses.Contains(studentCampusId.Value))
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access StudentId {StudentId} belonging to CampusId {CampusId}",
                    collegeId, studentId, studentCampusId.Value);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage students of another college.");
            }
        }

        public async Task ValidateStaffOwnershipAsync(int staffId, int collegeId)
        {
            if (staffId <= 0) throw new NotFoundException("Staff member not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var staffCampusId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT CampusId FROM Staff WHERE Id = @StaffId AND (IsDeleted = 0 OR IsDeleted IS NULL);",
                new { StaffId = staffId });

            if (!staffCampusId.HasValue)
            {
                throw new NotFoundException($"Staff member with ID {staffId} not found.");
            }

            var campuses = await GetCampusesForCollegeAsync(collegeId);
            if (!campuses.Contains(staffCampusId.Value))
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access StaffId {StaffId} belonging to CampusId {CampusId}",
                    collegeId, staffId, staffCampusId.Value);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage staff of another college.");
            }
        }

        public async Task ValidateDepartmentOwnershipAsync(int departmentId, int collegeId)
        {
            if (departmentId <= 0) throw new NotFoundException("Department not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var dept = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT DepartmentId, CampusId, CollegeId FROM Departments WHERE DepartmentId = @DepartmentId AND (IsDeleted = 0 OR IsDeleted IS NULL);",
                new { DepartmentId = departmentId });

            if (dept == null)
            {
                throw new NotFoundException($"Department with ID {departmentId} not found.");
            }

            int? deptCollegeId = (int?)dept.CollegeId;
            int? deptCampusId = (int?)dept.CampusId;

            if (deptCollegeId.HasValue && deptCollegeId.Value == collegeId)
            {
                return;
            }

            if (deptCampusId.HasValue)
            {
                var campuses = await GetCampusesForCollegeAsync(collegeId);
                if (campuses.Contains(deptCampusId.Value))
                {
                    return;
                }
            }

            _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access DepartmentId {DepartmentId}",
                collegeId, departmentId);
            throw new ForbiddenException("Access denied: You do not have permission to view or manage departments of another college.");
        }

        public async Task ValidateDesignationOwnershipAsync(int designationId, int collegeId)
        {
            if (designationId <= 0) throw new NotFoundException("Designation not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var desig = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT Id, CampusId, CollegeId FROM Designations WHERE Id = @Id AND (IsDeleted = 0 OR IsDeleted IS NULL);",
                new { Id = designationId });

            if (desig == null)
            {
                throw new NotFoundException($"Designation with ID {designationId} not found.");
            }

            int? desigCollegeId = (int?)desig.CollegeId;
            int? desigCampusId = (int?)desig.CampusId;

            if (desigCollegeId.HasValue && desigCollegeId.Value == collegeId)
            {
                return;
            }

            if (desigCampusId.HasValue)
            {
                var campuses = await GetCampusesForCollegeAsync(collegeId);
                if (campuses.Contains(desigCampusId.Value))
                {
                    return;
                }
            }

            _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access DesignationId {DesignationId}",
                collegeId, designationId);
            throw new ForbiddenException("Access denied: You do not have permission to view or manage designations of another college.");
        }

        public async Task ValidateExamOwnershipAsync(int examId, int collegeId)
        {
            if (examId <= 0) throw new NotFoundException("Examination not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var examCampusId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT CampusId FROM Examinations WHERE ExamId = @ExamId;",
                new { ExamId = examId });

            if (!examCampusId.HasValue)
            {
                throw new NotFoundException($"Examination with ID {examId} not found.");
            }

            var campuses = await GetCampusesForCollegeAsync(collegeId);
            if (!campuses.Contains(examCampusId.Value))
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access ExaminationId {ExamId}",
                    collegeId, examId);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage examinations of another college.");
            }
        }

        public async Task ValidateFeeStructureOwnershipAsync(int feeStructureId, int collegeId)
        {
            if (feeStructureId <= 0) throw new NotFoundException("Fee structure not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var campusId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT CampusId FROM FeeStructures WHERE FeeStructureId = @FeeStructureId;",
                new { FeeStructureId = feeStructureId });

            if (!campusId.HasValue)
            {
                throw new NotFoundException($"Fee structure with ID {feeStructureId} not found.");
            }

            var campuses = await GetCampusesForCollegeAsync(collegeId);
            if (!campuses.Contains(campusId.Value))
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access FeeStructureId {FeeStructureId}",
                    collegeId, feeStructureId);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage fee structures of another college.");
            }
        }

        public async Task ValidateHostelResourceOwnershipAsync(string resourceType, int entityId, int collegeId, bool throwIfMissing = true)
        {
            if (entityId <= 0)
            {
                if (throwIfMissing) throw new NotFoundException("Hostel resource not found.");
                return;
            }
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            string? sql = resourceType.ToLowerInvariant() switch
            {
                "blocks" => "SELECT CollegeId FROM hostel_blocks WHERE HostelId = @Id LIMIT 1;",
                "room-types" => "SELECT CollegeId FROM room_type_configs WHERE RoomTypeId = @Id LIMIT 1;",
                "rooms" => "SELECT hb.CollegeId FROM room_masters rm INNER JOIN hostel_blocks hb ON rm.HostelId = hb.HostelId WHERE rm.RoomId = @Id LIMIT 1;",
                "beds" => "SELECT hb.CollegeId FROM hostel_beds b INNER JOIN room_masters rm ON b.RoomId = rm.RoomId INNER JOIN hostel_blocks hb ON rm.HostelId = hb.HostelId WHERE b.BedId = @Id LIMIT 1;",
                "wardens" => "SELECT hb.CollegeId FROM hostel_warden_assignments hwa INNER JOIN hostel_blocks hb ON hwa.HostelId = hb.HostelId WHERE hwa.WardenAssignmentId = @Id LIMIT 1;",
                "allocations" => "SELECT hb.CollegeId FROM hostel_student_allocations hsa INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId WHERE hsa.AllocationId = @Id LIMIT 1;",
                "attendance" => "SELECT hb.CollegeId FROM hostel_attendance ha INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId WHERE ha.AttendanceId = @Id LIMIT 1;",
                "outpass-leave" => "SELECT hb.CollegeId FROM hostel_outpass_leave hol INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId WHERE hol.RequestId = @Id LIMIT 1;",
                "transfer-vacate" => "SELECT hb.CollegeId FROM hostel_transfer_vacate htv INNER JOIN hostel_blocks hb ON htv.FromHostelId = hb.HostelId WHERE htv.RequestId = @Id LIMIT 1;",
                "fees" => "SELECT hb.CollegeId FROM hostel_fee_configs fc INNER JOIN hostel_blocks hb ON fc.HostelId = hb.HostelId WHERE fc.FeeConfigId = @Id LIMIT 1;",
                _ => null
            };

            if (sql == null) return;

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var ownerCollegeId = await conn.QueryFirstOrDefaultAsync<int?>(sql, new { Id = entityId });
            if (!ownerCollegeId.HasValue)
            {
                if (throwIfMissing) throw new NotFoundException("Hostel resource not found.");
                return;
            }

            if (ownerCollegeId.Value != collegeId)
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access Hostel {Resource} ID {EntityId} belonging to CollegeId {OwnerCollegeId}",
                    collegeId, resourceType, entityId, ownerCollegeId.Value);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage hostel resources of another college.");
            }
        }

        public async Task ValidateTransportResourceOwnershipAsync(string resourceType, long entityId, int collegeId, bool throwIfMissing = true)
        {
            if (entityId <= 0)
            {
                if (throwIfMissing) throw new NotFoundException("Transport resource not found.");
                return;
            }
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            string key = (resourceType ?? string.Empty).Trim().ToLowerInvariant();
            string? sql = key switch
            {
                "routes" => "SELECT CollegeId FROM TransportRoutes WHERE RouteId = @Id AND IsDeleted = 0 LIMIT 1;",
                "pickup-points" => "SELECT CollegeId FROM PickupPoints WHERE PickupPointId = @Id AND IsDeleted = 0 LIMIT 1;",
                "vehicles" => "SELECT CollegeId FROM TransportVehicles WHERE VehicleId = @Id AND IsDeleted = 0 LIMIT 1;",
                "drivers" => @"SELECT COALESCE(
                                    (SELECT CollegeId FROM TransportDrivers WHERE DriverId = @Id AND IsDeleted = 0 LIMIT 1),
                                    (SELECT c.CollegeId FROM Staff s INNER JOIN Campuses c ON c.CampusId = s.CampusId WHERE s.Id = @Id AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL) LIMIT 1)
                               ) LIMIT 1;",
                "attendants" => @"SELECT COALESCE(
                                    (SELECT CollegeId FROM TransportAttendants WHERE AttendantId = @Id AND IsDeleted = 0 LIMIT 1),
                                    (SELECT c.CollegeId FROM Staff s INNER JOIN Campuses c ON c.CampusId = s.CampusId WHERE s.Id = @Id AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL) LIMIT 1)
                               ) LIMIT 1;",
                "vehicle-assignments" => "SELECT CollegeId FROM TransportVehicleAssignments WHERE AssignmentId = @Id AND IsDeleted = 0 LIMIT 1;",
                "student-assignments" => "SELECT CollegeId FROM StudentTransportAssignments WHERE StudentTransportAssignmentId = @Id AND IsDeleted = 0 LIMIT 1;",
                "trips" => "SELECT CollegeId FROM TransportTrips WHERE TripId = @Id AND IsDeleted = 0 LIMIT 1;",
                "maintenance" => "SELECT CollegeId FROM VehicleMaintenances WHERE MaintenanceId = @Id AND IsDeleted = 0 LIMIT 1;",
                "documents" => "SELECT CollegeId FROM TransportDriverDocuments WHERE DocumentId = @Id AND IsDeleted = 0 LIMIT 1;",
                _ => null
            };

            if (sql == null) return;

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            var ownerCollegeId = await conn.QueryFirstOrDefaultAsync<int?>(sql, new { Id = entityId });
            if (!ownerCollegeId.HasValue)
            {
                if (throwIfMissing) throw new NotFoundException("Transport resource not found.");
                return;
            }

            if (ownerCollegeId.Value != collegeId)
            {
                _logger.LogWarning("IDOR Block: CollegeId {CollegeId} attempted to access Transport {Resource} ID {EntityId} belonging to CollegeId {OwnerCollegeId}",
                    collegeId, resourceType, entityId, ownerCollegeId.Value);
                throw new ForbiddenException("Access denied: You do not have permission to view or manage transport resources of another college.");
            }
        }

        public async Task ValidateEntityOwnershipAsync<T>(int entityId, int collegeId) where T : class
        {
            if (entityId <= 0) throw new NotFoundException("Resource not found.");
            if (collegeId <= 0) throw new ForbiddenException("Tenant context required.");

            var typeName = typeof(T).Name;
            var campuses = await GetCampusesForCollegeAsync(collegeId);

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            // Check if table has CollegeId or CampusId
            string tableName = typeName.EndsWith("s") ? typeName : typeName + "s";
            var cols = (await conn.QueryAsync<string>(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @Table;",
                new { Table = tableName })).ToList();

            if (cols.Contains("CollegeId"))
            {
                string pkCol = cols.FirstOrDefault(c => c.EndsWith("Id") && c.StartsWith(typeName, StringComparison.OrdinalIgnoreCase)) ?? "Id";
                var ownerCollege = await conn.QueryFirstOrDefaultAsync<int?>(
                    $"SELECT CollegeId FROM `{tableName}` WHERE `{pkCol}` = @Id;",
                    new { Id = entityId });

                if (!ownerCollege.HasValue) throw new NotFoundException("Resource not found.");
                if (ownerCollege.Value != collegeId)
                {
                    throw new ForbiddenException("Access denied: Resource belongs to another college.");
                }
            }
            else if (cols.Contains("CampusId"))
            {
                string pkCol = cols.FirstOrDefault(c => c.EndsWith("Id") && c.StartsWith(typeName, StringComparison.OrdinalIgnoreCase)) ?? "Id";
                var campusId = await conn.QueryFirstOrDefaultAsync<int?>(
                    $"SELECT CampusId FROM `{tableName}` WHERE `{pkCol}` = @Id;",
                    new { Id = entityId });

                if (!campusId.HasValue) throw new NotFoundException("Resource not found.");
                if (!campuses.Contains(campusId.Value))
                {
                    throw new ForbiddenException("Access denied: Resource belongs to another college.");
                }
            }
        }
    }
}
