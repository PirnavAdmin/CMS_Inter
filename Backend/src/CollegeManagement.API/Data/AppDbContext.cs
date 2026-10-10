using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Data.Configurations;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Models.Holiday;
using CollegeManagement.API.Models.Transport;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace CollegeManagement.API.Data
{
    public class AuditEntry
    {
        public EntityEntry Entry { get; }
        public EntityState OriginalState { get; set; }
        public string? UserName { get; set; }
        public int? UserId { get; set; }
        public string? ActorRole { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string Module { get; set; } = "System";

        public Dictionary<string, object?> OldValues { get; } = new();
        public Dictionary<string, object?> NewValues { get; } = new();
        public List<string> ChangedColumns { get; } = new();
        public Dictionary<string, object?> UserInput { get; } = new();

        public AuditEntry(EntityEntry entry)
        {
            Entry = entry;
            OriginalState = entry.State;
        }

        public AuditLog ToAuditLog()
        {
            var changesList = new List<object>();
            foreach (var col in ChangedColumns)
            {
                OldValues.TryGetValue(col, out var oldVal);
                NewValues.TryGetValue(col, out var newVal);
                changesList.Add(new
                {
                    field = col,
                    old = FormatValue(oldVal),
                    @new = FormatValue(newVal)
                });
            }

            var humanSummary = GenerateHumanReadableSummary();

            var payloadObj = new
            {
                summary = humanSummary,
                changes = changesList,
                userInput = UserInput.Count > 0 ? UserInput : (OriginalState == EntityState.Added ? NewValues : null)
            };

            var jsonOptions = new JsonSerializerOptions
            {
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                WriteIndented = false
            };

            string descriptionJson = JsonSerializer.Serialize(payloadObj, jsonOptions);

            return new AuditLog
            {
                UserName = UserName ?? "System",
                UserId = UserId,
                ActorRole = ActorRole ?? "System",
                IpAddress = IpAddress ?? "0.0.0.0",
                UserAgent = UserAgent,
                Action = Action,
                EntityName = EntityName,
                EntityId = EntityId,
                Module = Module,
                Severity = Action == "Delete" ? "Warning" : "Info",
                Status = "Success",
                Description = descriptionJson,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static string? FormatValue(object? val)
        {
            if (val == null) return null;
            if (val is DateTime dt) return dt.ToString("yyyy-MM-dd HH:mm:ss");
            if (val is DateOnly d) return d.ToString("yyyy-MM-dd");
            return val.ToString();
        }

        private string GenerateHumanReadableSummary()
        {
            try
            {
                var idStr = (EntityId.HasValue && EntityId > 0) ? $" #{EntityId}" : "";

                switch (EntityName)
                {
                    case "Attendance":
                    {
                        NewValues.TryGetValue("Status", out var statusVal);
                        NewValues.TryGetValue("StudentId", out var sIdVal);
                        NewValues.TryGetValue("AttendanceDate", out var dtVal);
                        NewValues.TryGetValue("Session", out var sessVal);

                        var status = statusVal?.ToString() ?? "Recorded";
                        var studentId = sIdVal?.ToString() ?? (EntityEntryHasProp("StudentId") ? Entry.Property("StudentId").CurrentValue?.ToString() : "");
                        var dateStr = dtVal is DateTime adt ? adt.ToString("yyyy-MM-dd") : dtVal?.ToString();
                        var sessStr = sessVal != null ? $" ({sessVal} Session)" : "";

                        if (OriginalState == EntityState.Added)
                        {
                            return $"Marked attendance as '{status}' for Student #{studentId}{sessStr}{(dateStr != null ? $" on {dateStr}" : "")}";
                        }
                        if (OriginalState == EntityState.Modified)
                        {
                            OldValues.TryGetValue("Status", out var oldStatus);
                            if (oldStatus != null && statusVal != null && oldStatus.ToString() != statusVal.ToString())
                            {
                                return $"Changed attendance for Student #{studentId} from '{oldStatus}' to '{statusVal}'{(dateStr != null ? $" on {dateStr}" : "")}";
                            }
                            return $"Updated attendance record for Student #{studentId}{(dateStr != null ? $" on {dateStr}" : "")}";
                        }
                        return $"Deleted attendance record for Student #{studentId}";
                    }

                    case "StaffAttendance":
                    {
                        NewValues.TryGetValue("Status", out var statusVal);
                        NewValues.TryGetValue("StaffId", out var sIdVal);
                        NewValues.TryGetValue("AttendanceDate", out var dtVal);
                        var status = statusVal?.ToString() ?? "Recorded";
                        var staffId = sIdVal?.ToString() ?? "";
                        var dateStr = dtVal is DateTime adt ? adt.ToString("yyyy-MM-dd") : dtVal?.ToString();

                        if (OriginalState == EntityState.Added)
                            return $"Marked staff attendance as '{status}' for Staff #{staffId}{(dateStr != null ? $" on {dateStr}" : "")}";
                        if (OriginalState == EntityState.Modified)
                            return $"Updated staff attendance for Staff #{staffId}{(dateStr != null ? $" on {dateStr}" : "")}";
                        return $"Deleted staff attendance record for Staff #{staffId}";
                    }

                    case "Student":
                    case "StudentAdmission":
                    {
                        NewValues.TryGetValue("FirstName", out var fn);
                        NewValues.TryGetValue("LastName", out var ln);
                        var name = $"{fn} {ln}".Trim();
                        if (string.IsNullOrWhiteSpace(name))
                        {
                            NewValues.TryGetValue("StudentName", out var sn);
                            name = sn?.ToString() ?? $"Student{idStr}";
                        }

                        if (OriginalState == EntityState.Added)
                            return $"Enrolled new student: {name}";
                        if (OriginalState == EntityState.Modified)
                            return $"Updated profile details for student: {name}";
                        return $"Removed student record: {name}";
                    }

                    case "Staff":
                    {
                        NewValues.TryGetValue("FirstName", out var fn);
                        NewValues.TryGetValue("LastName", out var ln);
                        var name = $"{fn} {ln}".Trim();
                        if (string.IsNullOrWhiteSpace(name)) name = $"Staff{idStr}";
                        NewValues.TryGetValue("Designation", out var desig);
                        var desigStr = desig != null ? $" ({desig})" : "";

                        if (OriginalState == EntityState.Added)
                            return $"Registered new staff member: {name}{desigStr}";
                        if (OriginalState == EntityState.Modified)
                            return $"Updated staff record for: {name}{desigStr}";
                        return $"Removed staff member: {name}";
                    }

                    case "FeePayment":
                    case "StudentFee":
                    {
                        NewValues.TryGetValue("Amount", out var amt);
                        if (amt == null) NewValues.TryGetValue("PaidAmount", out amt);
                        NewValues.TryGetValue("StudentId", out var sId);
                        NewValues.TryGetValue("PaymentMode", out var mode);
                        var amtStr = amt != null ? $" of ₹{amt}" : "";
                        var modeStr = mode != null ? $" via {mode}" : "";

                        if (OriginalState == EntityState.Added)
                            return $"Recorded fee payment{amtStr} for Student #{sId}{modeStr}";
                        if (OriginalState == EntityState.Modified)
                            return $"Updated fee record{amtStr} for Student #{sId}";
                        return $"Deleted fee record for Student #{sId}";
                    }

                    case "User":
                    {
                        NewValues.TryGetValue("UserName", out var un);
                        if (un == null) NewValues.TryGetValue("Email", out un);
                        var uStr = un?.ToString() ?? $"User{idStr}";

                        if (OriginalState == EntityState.Added)
                            return $"Created user account: {uStr}";
                        if (OriginalState == EntityState.Modified)
                            return $"Updated user account: {uStr}";
                        return $"Deleted user account: {uStr}";
                    }

                    case "TransportTrip":
                    {
                        NewValues.TryGetValue("RouteName", out var rn);
                        NewValues.TryGetValue("Status", out var st);
                        return $"{Action} transport trip{idStr}{(rn != null ? $" (Route: {rn})" : "")}{(st != null ? $" - Status: {st}" : "")}";
                    }

                    default:
                    {
                        if (OriginalState == EntityState.Added)
                            return $"Created new {EntityName}{idStr}";
                        if (OriginalState == EntityState.Modified)
                        {
                            var cols = ChangedColumns.Count > 0 ? $" (modified: {string.Join(", ", ChangedColumns.Take(3))}{(ChangedColumns.Count > 3 ? "..." : "")})" : "";
                            return $"Updated {EntityName}{idStr}{cols}";
                        }
                        return $"Deleted {EntityName}{idStr}";
                    }
                }
            }
            catch
            {
                return $"{Action} operation performed on {EntityName}{(EntityId != null && EntityId > 0 ? $" (ID: {EntityId})" : "")}";
            }
        }

        private bool EntityEntryHasProp(string propName)
        {
            try { return Entry.Metadata.FindProperty(propName) != null; } catch { return false; }
        }
    }

    public class AppDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public DbSet<User> Users { get; set; }
        public DbSet<ParentStudentMapping> ParentStudentMappings { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }
        public DbSet<OTP> OTPs { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<AcademicProgram> Programs { get; set; }

        public DbSet<GroupProgram> GroupPrograms { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<State> States { get; set; }
        public DbSet<AcademicPattern> AcademicPatterns { get; set; }
        public DbSet<AcademicLevel> AcademicLevels { get; set; }
        // Attendance
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<AttendanceSession> AttendanceSessions { get; set; }
        public DbSet<StaffAttendanceSession> StaffAttendanceSessions { get; set; }
        public DbSet<StaffAttendance> StaffAttendances { get; set; }
        public DbSet<StaffAttendanceRegularization> StaffAttendanceRegularizations { get; set; }
        public DbSet<StaffLeaveRequest> StaffLeaveRequests { get; set; }
        public DbSet<StaffLeaveBalance> StaffLeaveBalances { get; set; }
        public DbSet<LeaveCategory> LeaveCategories { get; set; }
        public DbSet<AttendanceAuditHistory> AttendanceAuditHistories { get; set; }
        public DbSet<GradingSystem> GradingSystems { get; set; }
        public DbSet<AssessmentType> AssessmentTypes { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<BoardAcademicLevel> BoardAcademicLevels { get; set; }
        public DbSet<BoardAssessment> BoardAssessments { get; set; }
        
        public DbSet<Campus> Campuses { get; set; }
        public DbSet<CampusBoard> CampusBoards { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<StudentAdmission> StudentAdmissions { get; set; }
        public DbSet<Designation> Designations { get; set; }
        
        // Multi-Campus / Multi-Board Staff Assignments
        public DbSet<StaffCampusAssignment> StaffCampusAssignments { get; set; }
        public DbSet<StaffBoardAssignment> StaffBoardAssignments { get; set; }

        // Transport
        public DbSet<TransportAttendant> TransportAttendants { get; set; } = null!;
        public DbSet<TransportRoute> TransportRoutes => Set<TransportRoute>();
        public DbSet<PickupPoint> PickupPoints => Set<PickupPoint>();
        public DbSet<TransportVehicle> TransportVehicles => Set<TransportVehicle>();
        public DbSet<TransportDriver> TransportDrivers { get; set; } = null!;
        public DbSet<TransportVehicleAssignment> TransportVehicleAssignments { get; set; } = null!;
        public DbSet<DriverPreference> DriverPreferences { get; set; } = null!;

        public DbSet<DriverNotification> DriverNotifications { get; set; } = null!;
        public DbSet<StudentTransportAssignment> StudentTransportAssignments { get; set; } = null!;
        public DbSet<VehicleMaintenance> VehicleMaintenances { get; set; } = null!;
        public DbSet<TransportTrip> TransportTrips => Set<TransportTrip>();
        public DbSet<TransportStudentAttendance> TransportStudentAttendances { get; set; } = null!;
        public DbSet<TransportGpsTelemetry> TransportGpsTelemetries { get; set; } = null!;
        public DbSet<Staff> Staffs { get; set; }
        public DbSet<StaffSubjectAllocation> StaffSubjectAllocations { get; set; }
        public DbSet<Faculty> Faculties { get; set; }
        public DbSet<FacultySubjectAllocation> FacultySubjectAllocations { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }

        public DbSet<Examination> Examinations { get; set; }
        public DbSet<ExamCodeSequence> ExamCodeSequences { get; set; }
        public DbSet<ExamSchedule> ExamSchedules { get; set; }
        public DbSet<Holiday> Holidays { get; set; }
        public DbSet<AttendanceTimingConfig> AttendanceTimingConfigs { get; set; }
        public DbSet<HallTicket> HallTickets { get; set; }
        public DbSet<InvigilatorAssignment> InvigilatorAssignments { get; set; }
        public DbSet<Mark> Marks { get; set; }
        public DbSet<Result> Results { get; set; }
        public DbSet<Revaluation> Revaluations { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<StudyMaterial> StudyMaterials { get; set; }
        public DbSet<Section> Sections { get; set; }

        public DbSet<FeeType> FeeTypes { get; set; }
        public DbSet<FineRule> FineRules { get; set; }

        public DbSet<FeeStructure> FeeStructures { get; set; }

        public DbSet<FeeStructureComponent>
            FeeStructureComponents
        { get; set; }

        public DbSet<StudentFee> StudentFees { get; set; }

        public DbSet<StudentFeeComponent>
            StudentFeeComponents
        { get; set; }

        public DbSet<FeeConcession> FeeConcessions { get; set; }

        public DbSet<Scholarship> Scholarships { get; set; }

        public DbSet<FeePaymentPlan> FeePaymentPlans { get; set; }

        public DbSet<FeeInstallment> FeeInstallments { get; set; }

        public DbSet<FeePayment> FeePayments { get; set; }

        public DbSet<FeeReceipt> FeeReceipts { get; set; }

     


        public DbSet<BreakType> BreakTypes { get; set; }
        public DbSet<PeriodStructure> PeriodStructures { get; set; }
        public DbSet<PeriodStructureItem> PeriodStructureItems { get; set; }
        public DbSet<PeriodStructureAssignment> PeriodStructureAssignments { get; set; }
        public DbSet<Period> Periods { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Timetable> Timetables { get; set; }
        public DbSet<TimetableBackup> TimetableBackups { get; set; }
        public DbSet<TimetableBackupSlot> TimetableBackupSlots { get; set; }
        public DbSet<TimetableSubstitution> TimetableSubstitutions { get; set; }
        public DbSet<Certificate> Certificates { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Template> Templates { get; set; }
        public DbSet<NumberSeriesConfiguration> NumberSeriesConfigurations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Transport Configuration
            ConfigureTransportRoute(modelBuilder);
            ConfigurePickupPoint(modelBuilder);
            ConfigureTransportVehicle(modelBuilder);
            ConfigureTransportDriver(modelBuilder);
            ConfigureTransportVehicleAssignment(modelBuilder);
            ConfigureStudentTransportAssignment(modelBuilder);
            ConfigureVehicleMaintenance(modelBuilder);
            modelBuilder.Entity<TransportAttendant>().ToTable("TransportAttendants");
            modelBuilder.Entity<TransportTrip>().ToTable("TransportTrips");


            #region Attendance
            modelBuilder.Entity<Attendance>().ToTable("Attendances");
            modelBuilder.Entity<AttendanceSession>().ToTable("AttendanceSessions");
            modelBuilder.ApplyConfiguration(new AttendanceConfiguration());
            modelBuilder.ApplyConfiguration(new AttendanceSessionConfiguration());
            modelBuilder.ApplyConfiguration(new StaffLeaveRequestConfiguration());
            modelBuilder.ApplyConfiguration(new StaffLeaveBalanceConfiguration());
            modelBuilder.ApplyConfiguration(new LeaveCategoryConfiguration());
            modelBuilder.ApplyConfiguration(new TimetableSubstitutionConfiguration());
            modelBuilder.ApplyConfiguration(new AttendanceAuditHistoryConfiguration());
            #endregion

            #region User
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(u => u.UserId);

                entity.HasIndex(u => u.Email)
                    .IsUnique();

                entity.Property(u => u.IsFirstLogin)
                    .HasDefaultValue(true);

                entity.Property(u => u.IsActive)
                    .HasDefaultValue(true);

                entity.Property(u => u.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(u => u.UpdatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                    .ValueGeneratedOnAddOrUpdate();

                entity.HasOne(u => u.Role)
                    .WithMany(r => r.Users)
                    .HasForeignKey(u => u.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(u => u.Student)
                    .WithOne()
                    .HasForeignKey<User>(u => u.StudentId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(u => u.StudentId)
                    .IsUnique();

                entity.HasOne(u => u.Staff)
                    .WithOne()
                    .HasForeignKey<User>(u => u.StaffId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(u => u.StaffId)
                    .IsUnique();

                entity.HasOne(u => u.Admin)
                    .WithOne()
                    .HasForeignKey<User>(u => u.AdminId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(u => u.AdminId)
                    .IsUnique();
            });
            #endregion

            #region Role
            modelBuilder.Entity<Role>()
                .HasIndex(r => r.RoleName)
                .IsUnique();
            #endregion
            #region Subject

            modelBuilder.Entity<Subject>()
                .HasIndex(s => s.SubjectCode);

            modelBuilder.Entity<Subject>()
                .HasIndex(s => s.BoardId);

            modelBuilder.Entity<Subject>()
                .HasIndex(s => s.GroupId);

            modelBuilder.Entity<Subject>()
                .HasIndex(s => s.AcademicLevelId);

            modelBuilder.Entity<Subject>()
                .HasOne(s => s.AcademicLevelNavigation)
                .WithMany()
                .HasForeignKey(s => s.AcademicLevelId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subject>()
                .HasOne(s => s.BoardNavigation)
                .WithMany()
                .HasForeignKey(s => s.BoardId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subject>()
                .HasOne(s => s.GroupNavigation)
                .WithMany()
                .HasForeignKey(s => s.GroupId)
                .OnDelete(DeleteBehavior.Restrict);

            #endregion

            #region Group
            modelBuilder.Entity<Group>()
                .HasKey(g => g.GroupId);


            modelBuilder.Entity<Group>()
                .Property(g => g.GroupName)
                .HasMaxLength(100)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.GroupCode)
                .HasMaxLength(30)
                .IsRequired();

            modelBuilder.Entity<Group>()
                .Property(g => g.Description)
                .HasMaxLength(500);

            modelBuilder.Entity<Group>()
                .Property(g => g.IsActive)
                .HasDefaultValue(true);

            modelBuilder.Entity<Group>()
                .Property(g => g.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Group>()
                .Property(g => g.UpdatedAt)
                .IsRequired(false);

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.GroupCode)
                .IsUnique();

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.BoardId);

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.AcademicYearId);

            modelBuilder.Entity<Group>()
                .HasIndex(g => g.AcademicLevelId);

            modelBuilder.Entity<Group>()
                .HasIndex(g => new { g.BoardId, g.AcademicYearId, g.AcademicLevelId, g.IsActive });

            modelBuilder.Entity<Group>()
                .HasOne(g => g.BoardNavigation)
                .WithMany()
                .HasForeignKey(g => g.BoardId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Group>()
                .HasOne(g => g.AcademicYear)
                .WithMany()
                .HasForeignKey(g => g.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Group>()
                .HasOne(g => g.AcademicLevelNavigation)
                .WithMany()
                .HasForeignKey(g => g.AcademicLevelId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<GroupProgram>()
    .HasOne(gp => gp.Group)
    .WithMany(g => g.GroupPrograms)
    .HasForeignKey(gp => gp.GroupId)
    .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GroupProgram>()
                .HasOne(gp => gp.AcademicProgram)
                .WithMany(p => p.GroupPrograms)
                .HasForeignKey(gp => gp.ProgramId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GroupProgram>()
                .HasIndex(gp => new { gp.GroupId, gp.ProgramId })
                .IsUnique();

            modelBuilder.Entity<AcademicProgram>(entity =>
            {
                entity.ToTable("Programs");

                entity.HasKey(p => p.ProgramId);

                entity.Property(p => p.ProgramName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(p => p.IsActive)
                    .HasDefaultValue(true);

                entity.Property(p => p.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(p => p.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(p => p.ProgramName)
                    .IsUnique();
            });
            #endregion

            #region
            //StudentAdmission / Student relations

            // StudentAdmission stores relationship IDs.
            // Names are resolved through SQL JOINs in stored procedures.

            modelBuilder.Entity<StudentAdmission>()
                .Property(sa => sa.BoardId)
                .HasColumnName("BoardId");

            modelBuilder.Entity<StudentAdmission>()
                .Property(sa => sa.AcademicYearId)
                .HasColumnName("AcademicYearId");

            modelBuilder.Entity<StudentAdmission>()
                .Property(sa => sa.AcademicLevelId)
                .HasColumnName("AcademicLevelId");

            modelBuilder.Entity<StudentAdmission>()
                .Property(sa => sa.GroupId)
                .HasColumnName("GroupId");

            modelBuilder.Entity<StudentAdmission>()
                .Property(sa => sa.ProgramId)
                .HasColumnName("ProgramId");

            modelBuilder.Entity<StudentAdmission>()
                .Ignore(sa => sa.SectionId);

            modelBuilder.Entity<StudentAdmission>()
                .Ignore(sa => sa.RollNo);
             #endregion
            modelBuilder.Entity<Student>()
                .HasIndex(s => s.BoardId);

            modelBuilder.Entity<Student>()
                .HasIndex(s => s.SectionId);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.BoardNavigation)
                .WithMany()
                .HasForeignKey(s => s.BoardId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.AcademicYear)
                .WithMany()
                .HasForeignKey(s => s.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<Student>()
                .HasOne(s => s.GroupNavigation)
                .WithMany()
                .HasForeignKey(s => s.GroupId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.SectionNavigation)
                .WithMany()
                .HasForeignKey(s => s.SectionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Examination>(entity =>
            {
                entity.HasKey(e => e.ExaminationId);
                entity.HasOne(e => e.Board).WithMany().HasForeignKey(e => e.BoardId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.AcademicYear).WithMany().HasForeignKey(e => e.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.AcademicLevel).WithMany().HasForeignKey(e => e.AcademicLevelId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Program).WithMany().HasForeignKey(e => e.ProgramId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.AssessmentType).WithMany().HasForeignKey(e => e.AssessmentTypeId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ExamSchedule>(entity =>
            {
                entity.HasKey(es => es.ExamScheduleId);
                entity.HasOne(es => es.Examination)
                      .WithMany(e => e.ExamSchedules)
                      .HasForeignKey(es => es.ExaminationId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(es => es.Subject)
                      .WithMany()
                      .HasForeignKey(es => es.SubjectId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<InvigilatorAssignment>(entity =>
            {
                entity.ToTable("InvigilatorAssignments");
                entity.HasKey(ia => ia.InvigilatorAssignmentId);
                entity.Property(ia => ia.InvigilatorAssignmentId).HasColumnName("InvigilatorAssignmentId");
                entity.Property(ia => ia.ExamScheduleId).HasColumnName("ExamScheduleId");
                entity.Property(ia => ia.InvigilatorId).HasColumnName("InvigilatorId");
                entity.Property(ia => ia.HallNumber).HasColumnName("HallNumber").HasMaxLength(100);
                entity.Property(ia => ia.AssignedAt).HasColumnName("AssignedAt");
                entity.HasOne(ia => ia.ExamSchedule)
                      .WithMany(es => es.InvigilatorAssignments)
                      .HasForeignKey(ia => ia.ExamScheduleId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(ia => ia.InvigilatorStaff)
                      .WithMany()
                      .HasForeignKey(ia => ia.InvigilatorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
          



            // ============================================================
            // FEE MANAGEMENT RELATIONSHIPS
            // ============================================================

            modelBuilder.Entity<FeeType>(entity =>
            {
                entity.HasKey(x => x.FeeTypeId);
                entity.Property(x => x.FeeTypeCode).IsRequired().HasMaxLength(30);
                entity.Property(x => x.FeeTypeName).IsRequired().HasMaxLength(100);
                entity.Property(x => x.Category).IsRequired().HasMaxLength(50);
                entity.Property(x => x.IsActive).HasDefaultValue(true);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => x.FeeTypeCode).IsUnique();
                entity.HasIndex(x => x.FeeTypeName).IsUnique();
                entity.HasIndex(x => x.Category);
            });

            modelBuilder.Entity<FeeStructure>(entity =>
            {
                entity.HasKey(x => x.FeeStructureId);
                entity.Property(x => x.StructureName).IsRequired().HasMaxLength(150);
                entity.Property(x => x.Description).HasMaxLength(500);
                entity.Property(x => x.IsActive).HasDefaultValue(true);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => new { x.BoardId, x.AcademicYearId, x.GroupId, x.ProgramId }).IsUnique();
                entity.HasOne(x => x.Board).WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicYear).WithMany().HasForeignKey(x => x.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicLevel).WithMany().HasForeignKey(x => x.AcademicLevelId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Group).WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Program).WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FeeStructureComponent>(entity =>
            {
                entity.HasKey(x => x.FeeStructureComponentId);
                entity.Ignore(x => x.Rule);
                entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.IsActive).HasDefaultValue(true);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => new { x.FeeStructureId, x.FeeTypeId }).IsUnique();
                entity.HasOne(x => x.FeeStructure).WithMany(x => x.Components).HasForeignKey(x => x.FeeStructureId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(x => x.FeeType).WithMany(x => x.StructureComponents).HasForeignKey(x => x.FeeTypeId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Scholarship>(entity =>
            {
                entity.HasKey(x => x.ScholarshipId);
                entity.Property(x => x.ScholarshipName).IsRequired().HasMaxLength(100);
                entity.Property(x => x.DiscountType).IsRequired().HasMaxLength(20);
                entity.Property(x => x.DiscountValue).HasColumnType("decimal(18,2)");
                entity.Property(x => x.IsActive).HasDefaultValue(true);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => x.ScholarshipName).IsUnique();
            });
            // ============================================================
            // STUDENT FEE
            // ============================================================
            modelBuilder.Entity<StudentFee>(entity =>
            {
                entity.HasKey(x => x.StudentFeeId);

                entity.Property(x => x.TotalAmount)
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.ConcessionAmount)
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.PayableAmount)
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.PaidAmount)
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.BalanceAmount)
                    .HasColumnType("decimal(18,2)");

                entity.Property(x => x.Status)
                    .IsRequired()
                    .HasMaxLength(30);

                entity.Property(x => x.AssignedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

                entity.HasIndex(x => new { x.StudentId, x.FeeStructureId })
                    .IsUnique();

                // Student -> StudentFee
                entity.HasOne(x => x.Student)
                    .WithMany()
                    .HasForeignKey(x => x.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                // FeeStructure -> StudentFee
                entity.HasOne(x => x.FeeStructure)
                    .WithMany(x => x.StudentFees)
                    .HasForeignKey(x => x.FeeStructureId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<StudentFeeComponent>(entity =>
            {
                entity.HasKey(x => x.StudentFeeComponentId);
                entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.ConcessionAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.PayableAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.PaidAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.BalanceAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Status).IsRequired().HasMaxLength(30);
                entity.HasIndex(x => new { x.StudentFeeId, x.FeeStructureComponentId }).IsUnique();
                entity.HasOne(x => x.StudentFee).WithMany(x => x.Components).HasForeignKey(x => x.StudentFeeId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(x => x.FeeStructureComponent).WithMany(x => x.StudentFeeComponents).HasForeignKey(x => x.FeeStructureComponentId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FeeConcession>(entity =>
            {
                entity.HasKey(x => x.FeeConcessionId);
                entity.Property(x => x.DiscountType).IsRequired().HasMaxLength(20);
                entity.Property(x => x.DiscountValue).HasColumnType("decimal(18,2)");
                entity.Property(x => x.DiscountAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Reason).HasMaxLength(500);
                entity.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.StudentFee).WithMany(x => x.Concessions).HasForeignKey(x => x.StudentFeeId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(x => x.Scholarship).WithMany(x => x.Concessions).HasForeignKey(x => x.ScholarshipId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FeePaymentPlan>(entity =>
            {
                entity.HasKey(x => x.FeePaymentPlanId);
                entity.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.PlanName).IsRequired().HasMaxLength(100);
                entity.HasOne(x => x.StudentFee).WithMany(x => x.PaymentPlans).HasForeignKey(x => x.StudentFeeId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FeeInstallment>(entity =>
            {
                entity.HasKey(x => x.FeeInstallmentId);
                entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.PaidAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.BalanceAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Status).IsRequired().HasMaxLength(30);
                entity.HasIndex(x => new { x.FeePaymentPlanId, x.InstallmentNumber }).IsUnique();
                entity.HasOne(x => x.FeePaymentPlan).WithMany(x => x.Installments).HasForeignKey(x => x.FeePaymentPlanId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FeePayment>(entity =>
            {
                entity.HasKey(x => x.FeePaymentId);
                entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
                entity.Ignore(x => x.DiscountAmount);
                entity.Ignore(x => x.FineAmount);
                entity.Property(x => x.PaymentMode).IsRequired().HasMaxLength(30);
                entity.Property(x => x.Status).IsRequired().HasMaxLength(30);
                entity.Property(x => x.PaymentDate).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => x.TransactionReference);
                entity.HasIndex(x => x.PaymentDate);
                entity.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.StudentFee).WithMany(x => x.Payments).HasForeignKey(x => x.StudentFeeId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.FeeInstallment).WithMany(x => x.Payments).HasForeignKey(x => x.FeeInstallmentId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FeeReceipt>(entity =>
            {
                entity.HasKey(x => x.FeeReceiptId);
                entity.Property(x => x.ReceiptNumber).IsRequired().HasMaxLength(50);
                entity.Property(x => x.ReceiptDate).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => x.ReceiptNumber).IsUnique();
                entity.HasOne(x => x.FeePayment).WithOne(x => x.Receipt).HasForeignKey<FeeReceipt>(x => x.FeePaymentId).OnDelete(DeleteBehavior.Cascade);
            });


            #region Section relational keys
            modelBuilder.Entity<Section>(entity =>
            {
                entity.ToTable("Sections");
                entity.HasKey(s => s.SectionId);

                entity.HasIndex(s => s.BoardId);
                entity.HasIndex(s => s.AcademicYearId);
                entity.HasIndex(s => s.AcademicLevelId);
                entity.HasIndex(s => s.GroupId);
                entity.HasIndex(s => s.GroupProgramId);
                entity.HasIndex(s => s.ProgramId);
                entity.HasIndex(s => s.RoomId);
                entity.HasIndex(s => s.InchargeId);

                entity.HasOne(s => s.BoardNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.BoardId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.AcademicYear)
                    .WithMany()
                    .HasForeignKey(s => s.AcademicYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.AcademicLevelNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.AcademicLevelId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.GroupNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.GroupId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.GroupProgramNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.GroupProgramId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.ProgramNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.ProgramId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.RoomNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.RoomId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(s => s.InchargeNavigation)
                    .WithMany()
                    .HasForeignKey(s => s.InchargeId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.Ignore(s => s.Board);
                entity.Ignore(s => s.Group);
                entity.Ignore(s => s.Programme);
                entity.Ignore(s => s.Program);
                entity.Ignore(s => s.AcademicLevel);
                entity.Ignore(s => s.YearOfStudy);
                entity.Ignore(s => s.RoomNumber);
                entity.Ignore(s => s.ClassTeacherId);
                entity.Ignore(s => s.FacultyId);
                entity.Ignore(s => s.TeacherId);
                entity.Ignore(s => s.Capacity);
                entity.Ignore(s => s.Strength);
            });
            #endregion

            #region Country
            modelBuilder.Entity<Country>(entity =>
            {
                entity.HasKey(c => c.CountryId);

                entity.Property(c => c.CountryCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(c => c.CountryName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(c => c.Description)
                    .HasMaxLength(500);

                entity.Property(c => c.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(c => c.IsActive)
                    .HasDefaultValue(true);

                entity.Property(c => c.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(c => c.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(c => c.CountryCode)
                    .IsUnique();

                entity.HasIndex(c => c.CountryName)
                    .IsUnique();

                entity.HasIndex(c => c.IsActive);
            });
            #endregion

            #region State
            modelBuilder.Entity<State>(entity =>
            {
                entity.HasKey(s => s.StateId);

                entity.Property(s => s.StateCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(s => s.StateName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(s => s.Description)
                    .HasMaxLength(500);

                entity.Property(s => s.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(s => s.IsActive)
                    .HasDefaultValue(true);

                entity.Property(s => s.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(s => s.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(s => s.CountryId);
                entity.HasIndex(s => s.IsActive);

                entity.HasIndex(s => new { s.CountryId, s.StateCode })
                    .IsUnique();

                entity.HasIndex(s => new { s.CountryId, s.StateName })
                    .IsUnique();

                entity.HasOne(s => s.Country)
                    .WithMany(c => c.States)
                    .HasForeignKey(s => s.CountryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region AcademicPattern
            modelBuilder.Entity<AcademicPattern>(entity =>
            {
                entity.HasKey(ap => ap.AcademicPatternId);

                entity.Property(ap => ap.PatternCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(ap => ap.PatternName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(ap => ap.Description)
                    .HasMaxLength(500);

                entity.Property(ap => ap.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(ap => ap.IsActive)
                    .HasDefaultValue(true);

                entity.Property(ap => ap.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(ap => ap.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(ap => ap.PatternCode)
                    .IsUnique();

                entity.HasIndex(ap => ap.PatternName)
                    .IsUnique();
            });
            #endregion

            #region AcademicLevel
            modelBuilder.Entity<AcademicLevel>(entity =>
            {
                entity.HasKey(al => al.AcademicLevelId);

                entity.Property(al => al.LevelCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(al => al.LevelName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(al => al.Description)
                    .HasMaxLength(500);

                entity.Property(al => al.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(al => al.IsActive)
                    .HasDefaultValue(true);

                entity.Property(al => al.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(al => al.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(al => al.LevelCode)
                    .IsUnique();

                entity.HasIndex(al => al.LevelName)
                    .IsUnique();
            });
            #endregion

            #region GradingSystem
            modelBuilder.Entity<GradingSystem>(entity =>
            {
                entity.HasKey(gs => gs.GradingSystemId);

                entity.Property(gs => gs.GradingSystemCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(gs => gs.GradingSystemName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(gs => gs.Description)
                    .HasMaxLength(500);

                entity.Property(gs => gs.DisplayOrder)
                    .HasDefaultValue(1);

                entity.Property(gs => gs.IsActive)
                    .HasDefaultValue(true);

                entity.Property(gs => gs.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(gs => gs.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(gs => gs.GradingSystemCode)
                    .IsUnique();

                entity.HasIndex(gs => gs.GradingSystemName)
                    .IsUnique();
            });
            #endregion

            #region AssessmentType
            modelBuilder.Entity<AssessmentType>(entity =>
            {
                entity.HasKey(at => at.AssessmentTypeId);

                entity.Property(at => at.AssessmentTypeName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(at => at.IsActive)
                    .HasDefaultValue(true);

                entity.Property(at => at.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(at => at.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(at => at.AssessmentTypeName)
                    .IsUnique();
            });
            #endregion

            #region Board
            modelBuilder.Entity<Board>(entity =>
            {
                entity.HasKey(b => b.BoardId);

                entity.Property(b => b.BoardCode)
                    .IsRequired()
                    .HasMaxLength(30);

                entity.Property(b => b.BoardType)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(b => b.BoardName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(b => b.Description)
                    .HasMaxLength(500);

                entity.Property(b => b.IsActive)
                    .HasDefaultValue(true);

                entity.Property(b => b.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(b => b.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(b => b.BoardCode)
                    .IsUnique();

                entity.HasIndex(b => b.BoardName);
                entity.HasIndex(b => b.BoardType);
                entity.HasIndex(b => b.CountryId);
                entity.HasIndex(b => b.StateId);
                entity.HasIndex(b => b.GradingSystemId);
                entity.HasIndex(b => b.IsActive);

                entity.HasOne(b => b.Country)
                    .WithMany(c => c.Boards)
                    .HasForeignKey(b => b.CountryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.State)
                    .WithMany(s => s.Boards)
                    .HasForeignKey(b => b.StateId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.GradingSystem)
                    .WithMany(gs => gs.Boards)
                    .HasForeignKey(b => b.GradingSystemId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region BoardAcademicLevel
            modelBuilder.Entity<BoardAcademicLevel>(entity =>
            {
                entity.HasKey(bal => bal.BoardAcademicLevelId);

                entity.Property(bal => bal.IsActive)
                    .HasDefaultValue(true);

                entity.Property(bal => bal.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(bal => bal.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(bal => bal.BoardId);
                entity.HasIndex(bal => bal.AcademicLevelId);

                entity.HasIndex(bal => new { bal.BoardId, bal.AcademicLevelId })
                    .IsUnique();

                entity.HasOne(bal => bal.Board)
                    .WithMany(b => b.BoardAcademicLevels)
                    .HasForeignKey(bal => bal.BoardId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(bal => bal.AcademicLevel)
                    .WithMany(al => al.BoardAcademicLevels)
                    .HasForeignKey(bal => bal.AcademicLevelId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            #endregion

            #region BoardAssessment
            modelBuilder.Entity<BoardAssessment>(entity =>
            {
                entity.HasKey(ba => ba.BoardAssessmentId);

                entity.Property(ba => ba.Weightage)
                    .HasColumnType("decimal(5,2)")
                    .IsRequired();

                entity.Property(ba => ba.IsMandatory)
                    .HasDefaultValue(false);

                entity.Property(ba => ba.IsActive)
                    .HasDefaultValue(true);

                entity.Property(ba => ba.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(ba => ba.UpdatedAt)
                    .IsRequired(false);

                entity.HasIndex(ba => ba.BoardId);
                entity.HasIndex(ba => ba.AssessmentTypeId);
                entity.HasIndex(ba => ba.IsActive);

                entity.HasIndex(ba => new { ba.BoardId, ba.AssessmentTypeId })
                    .IsUnique();

                entity.HasOne(ba => ba.Board)
                    .WithMany()
                    .HasForeignKey(ba => ba.BoardId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(ba => ba.AssessmentType)
                    .WithMany(at => at.BoardAssessments)
                    .HasForeignKey(ba => ba.AssessmentTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            #endregion

            #region Attendance
            modelBuilder.ApplyConfiguration(new Configurations.AttendanceConfiguration());
            #endregion
            #region Certificate
            modelBuilder.Entity<Certificate>(entity =>
            {
                entity.ToTable("certificates");
                entity.HasKey(x => x.CertificateId);
                entity.Property(x => x.CertificateId).HasColumnName("Id");
                entity.Property(x => x.CertificateNumber).HasColumnName("CertificateNo").IsRequired().HasMaxLength(40);
                entity.Property(x => x.CertificateType).IsRequired().HasMaxLength(100);
                entity.Property(x => x.Purpose).IsRequired().HasMaxLength(250);
                entity.Property(x => x.Status).IsRequired().HasMaxLength(30);
                entity.Property(x => x.IsActive).HasDefaultValue(true);
                entity.HasIndex(x => x.CertificateNumber).IsUnique();
                entity.HasIndex(x => x.StudentId);
                entity.HasIndex(x => x.Status);
                entity.HasOne(x => x.Student)
                    .WithMany()
                    .HasForeignKey(x => x.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region AuditLog
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(x => x.AuditLogId);
                entity.Property(x => x.UserName).HasMaxLength(150);
                entity.Property(x => x.Action).IsRequired().HasMaxLength(100);
                entity.Property(x => x.EntityName).IsRequired().HasMaxLength(100);
                entity.Property(x => x.Description).HasMaxLength(1000);
                entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
                entity.HasIndex(x => x.CreatedAt);
                entity.HasIndex(x => new { x.EntityName, x.EntityId });
            });
            #endregion

            #region TimetableBackup
            modelBuilder.Entity<TimetableBackup>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.ArchiveReason).HasMaxLength(250);
                entity.Property(x => x.ArchivedBy).HasMaxLength(100);
                entity.HasIndex(x => new
                {
                    x.BoardId,
                    x.AcademicLevelId,
                    x.AcademicYearId,
                    x.GroupId,
                    x.SectionId
                }).IsUnique();
                entity.HasOne(x => x.Board).WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicLevel).WithMany().HasForeignKey(x => x.AcademicLevelId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicYear).WithMany().HasForeignKey(x => x.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Group).WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Restrict);
                entity.Property(x => x.ProgramId).IsRequired(false);
            });

            modelBuilder.Entity<TimetableBackupSlot>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Remarks).HasMaxLength(250);
                entity.HasIndex(x => x.TimetableBackupId);
                entity.HasOne(x => x.Board).WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicLevel).WithMany().HasForeignKey(x => x.AcademicLevelId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicYear).WithMany().HasForeignKey(x => x.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Group).WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Restrict);
                entity.Property(x => x.ProgramId).IsRequired(false);
                entity.Property(x => x.StaffId).HasColumnName("StaffId");
                entity.HasOne(x => x.Period).WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.SubjectId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Staff).WithMany().HasForeignKey(x => x.StaffId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Room).WithMany().HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region PeriodStructure
            modelBuilder.Entity<BreakType>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Name).IsRequired().HasMaxLength(50);
                entity.HasIndex(x => x.Name).IsUnique();
            });

            modelBuilder.Entity<PeriodStructure>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Name).IsRequired().HasMaxLength(100);
                entity.Ignore(x => x.Periods);
            });

            modelBuilder.Entity<PeriodStructureItem>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasOne(x => x.PeriodStructure)
                    .WithMany(s => s.Items)
                    .HasForeignKey(x => x.PeriodStructureId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(x => x.BreakType)
                    .WithMany()
                    .HasForeignKey(x => x.BreakTypeId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<PeriodStructureAssignment>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.HasOne(x => x.PeriodStructure)
                    .WithMany(s => s.Assignments)
                    .HasForeignKey(x => x.PeriodStructureId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(x => x.Board)
                    .WithMany()
                    .HasForeignKey(x => x.BoardId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicLevel)
                    .WithMany()
                    .HasForeignKey(x => x.AcademicLevelId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.AcademicYear)
                    .WithMany()
                    .HasForeignKey(x => x.AcademicYearId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(x => x.Group)
                    .WithMany()
                    .HasForeignKey(x => x.GroupId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Period>(entity =>
            {
                entity.HasKey(x => x.PeriodId);
                entity.Ignore(x => x.PeriodStructureId);
                entity.Ignore(x => x.PeriodStructure);
            });
            #endregion

            #region Designation & Faculty / Staff
            modelBuilder.Entity<Designation>(entity =>
            {
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Name).IsRequired().HasMaxLength(100);
                entity.HasIndex(x => x.Name).IsUnique();
            });

            modelBuilder.Entity<Staff>(entity =>
            {
                entity.ToTable("Staff");

                entity.HasOne(s => s.DesignationRef)
                    .WithMany(d => d.Staffs)
                    .HasForeignKey(s => s.DesignationId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(s => s.StaffSubjectAllocations)
                    .WithOne(ssa => ssa.Staff)
                    .HasForeignKey(ssa => ssa.StaffId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Faculty>(entity =>
            {
                entity.Ignore(f => f.Aadhaar);
                entity.Ignore(f => f.BloodGroup);
                entity.HasOne(f => f.DesignationRef)
                    .WithMany(d => d.Faculties)
                    .HasForeignKey(f => f.DesignationId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            #endregion

            #region Examination Configuration
            modelBuilder.Entity<Examination>(entity =>
            {
                entity.HasKey(e => e.ExaminationId);
                entity.Property(e => e.ExamCode).HasMaxLength(50);
                entity.HasIndex(e => e.ExamCode).IsUnique();
            });

            modelBuilder.Entity<ExamCodeSequence>(entity =>
            {
                entity.HasKey(e => e.AcademicYear);
                entity.Property(e => e.AcademicYear).HasMaxLength(20);
            });
            #endregion

            #region Settings Templates & Number Series
            modelBuilder.Entity<Template>(entity =>
            {
                entity.ToTable("templates");
                entity.HasKey(t => t.Id);
                entity.HasIndex(t => t.TemplateCode).IsUnique();
                entity.HasIndex(t => t.Category);
                entity.HasIndex(t => t.IsActive);
            });

            modelBuilder.Entity<NumberSeriesConfiguration>(entity =>
            {
                entity.ToTable("NumberSeriesConfigurations");
                entity.HasKey(n => n.Id);
                entity.HasIndex(n => n.SeriesCode).IsUnique();
            });
            #endregion
        }
    
private static void ConfigureTransportRoute(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TransportRoute>(entity =>
            {
                entity.ToTable("TransportRoutes");

                entity.HasKey(x => x.RouteId);
                entity.Ignore(x => x.CreatedBy);
                entity.Ignore(x => x.UpdatedBy);
                entity.Property(x => x.DistanceKm).HasColumnName("Distance");
                entity.Property(x => x.MonthlyFee).HasColumnName("DefaultMonthlyFee");
                entity.Ignore(x => x.PickupPoint);
                entity.Ignore(x => x.DropPoint);
                entity.Ignore(x => x.VehicleId);
                entity.Ignore(x => x.Vehicle);

                entity.Property(x => x.RouteCode)
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(x => x.RouteName)
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.StartLocation)
                    .HasMaxLength(150);

                entity.Property(x => x.EndLocation)
                    .HasMaxLength(150);

                entity.Property(x => x.DistanceKm)
                    .HasPrecision(10, 2);

                entity.Property(x => x.Description)
                    .HasMaxLength(500);

                entity.Property(x => x.Status)
                    .HasDefaultValue(true);

                entity.Property(x => x.IsDeleted)
                    .HasDefaultValue(false);

                entity.HasIndex(x => x.RouteCode)
                    .IsUnique()
                    .HasDatabaseName("ux_transport_routes_route_code");
            });
        }

private static void ConfigurePickupPoint(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PickupPoint>(entity =>
            {
                entity.ToTable("PickupPoints");

                entity.HasKey(x => x.PickupPointId);
                entity.Property(x => x.PickupPointName).HasColumnName("StopName");
                entity.Property(x => x.Landmark).HasColumnName("StopAddress");
                entity.Property(x => x.SequenceNo).HasColumnName("StopOrder");
                entity.Property(x => x.DistanceFromStart).HasColumnName("DistanceFromSchool");
                entity.Ignore(x => x.CreatedBy);
                entity.Ignore(x => x.UpdatedBy);

                entity.Property(x => x.PickupPointName)
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.Landmark)
                    .HasMaxLength(250);

                entity.Property(x => x.DistanceFromStart)
                    .HasPrecision(10, 2);

                entity.HasOne(x => x.TransportRoute)
                    .WithMany()
                    .HasForeignKey(x => x.RouteId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(x => new
                {
                    x.RouteId,
                    x.SequenceNo
                });

                entity.HasIndex(x => new
                {
                    x.RouteId,
                    x.PickupPointName
                });
            });
        }

private static void ConfigureTransportVehicle(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TransportVehicle>(entity =>
            {
                entity.ToTable("TransportVehicles");

                entity.HasKey(x => x.VehicleId);
                entity.Ignore(x => x.CreatedBy);
                entity.Ignore(x => x.UpdatedBy);
                entity.Ignore(x => x.Routes);
                entity.Ignore(x => x.Drivers);
                entity.Property(x => x.RegistrationNumber).HasColumnName("VehicleRegistrationNo");
                entity.Property(x => x.Manufacturer).HasColumnName("Make");

                entity.HasIndex(x => x.VehicleNumber)
                    .IsUnique();

                entity.HasIndex(x => x.RegistrationNumber)
                    .IsUnique();

                entity.Property(x => x.VehicleNumber)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(x => x.RegistrationNumber)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(x => x.VehicleName)
                    .HasMaxLength(100);

                entity.Property(x => x.VehicleType)
                    .HasMaxLength(50);

                entity.Property(x => x.Manufacturer)
                    .HasMaxLength(100);

                entity.Property(x => x.Model)
                    .HasMaxLength(100);

                entity.Property(x => x.InsuranceNumber)
                    .HasMaxLength(100);

                entity.Property(x => x.Status)
                    .HasDefaultValue(true);

                entity.Property(x => x.IsDeleted)
                    .HasDefaultValue(false);
            });
        }

private static void ConfigureTransportDriver(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TransportDriver>(entity =>
            {
                entity.ToTable("TransportDrivers");

                entity.HasKey(x => x.DriverId);
                entity.Ignore(x => x.CreatedBy);
                entity.Ignore(x => x.UpdatedBy);
                entity.Ignore(x => x.AssignedVehicle);
                entity.Property(x => x.AlternateMobileNumber).HasColumnName("AlternateMobileNo");
                entity.Property(x => x.LicenceExpiry).HasColumnName("LicenseExpiry");

                entity.HasIndex(x => x.LicenceNumber)
                    .IsUnique();

                entity.HasIndex(x => x.MobileNumber);

                entity.Property(x => x.DriverName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(x => x.MobileNumber).HasColumnName("MobileNo")
                    .HasMaxLength(20);

                entity.Property(x => x.LicenceNumber).HasColumnName("LicenseNo")
                    .HasMaxLength(50);

                entity.Property(x => x.Status)
                    .HasDefaultValue(true);

                entity.Property(x => x.IsDeleted)
                    .HasDefaultValue(false);
            });
        }

private static void ConfigureTransportVehicleAssignment(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TransportVehicleAssignment>(
                entity =>
                {
                    entity.ToTable("TransportVehicleAssignments");

                    entity.HasKey(x => x.AssignmentId);
                entity.Ignore(x => x.CreatedBy);
                entity.Ignore(x => x.UpdatedBy);

                    entity.HasOne(x => x.Route)
                        .WithMany()
                        .HasForeignKey(x => x.RouteId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.HasOne(x => x.Vehicle)
                        .WithMany()
                        .HasForeignKey(x => x.VehicleId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.HasOne(x => x.Driver)
                        .WithMany()
                        .HasForeignKey(x => x.DriverId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.HasIndex(x => new
                    {
                        x.RouteId,
                        x.VehicleId,
                        x.DriverId,
                        x.EffectiveFrom
                    });

                    entity.HasIndex(x => x.VehicleId);

                    entity.HasIndex(x => x.DriverId);

                    entity.HasIndex(x => x.RouteId);

                    entity.HasIndex(x => new
                    {
                        x.VehicleId,
                        x.DriverId,
                        x.RouteId,
                        x.Status,
                        x.IsDeleted
                    })
                        .HasDatabaseName("IX_TVA_Vehicle_Driver_Route");

                    entity.Property(x => x.Status)
                        .HasDefaultValue(true);

                    entity.Property(x => x.IsDeleted)
                        .HasDefaultValue(false);
                });
        }

private static void ConfigureStudentTransportAssignment(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<StudentTransportAssignment>(
                entity =>
                {
                    entity.ToTable("StudentTransportAssignments");

                    entity.HasKey(
                        x => x.StudentTransportAssignmentId);

                    entity.HasOne(x => x.Route)
                        .WithMany()
                        .HasForeignKey(x => x.RouteId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.HasOne(x => x.PickupPoint)
                        .WithMany()
                        .HasForeignKey(x => x.PickupPointId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.HasOne(x => x.VehicleAssignment)
                        .WithMany()
                        .HasForeignKey(
                            x => x.VehicleAssignmentId)
                        .OnDelete(DeleteBehavior.Restrict);

                    entity.Property(x => x.AdmissionNo)
                        .HasMaxLength(50)
                        .IsRequired();

                    entity.HasIndex(x => x.AdmissionNo);

                    entity.HasIndex(x => x.RouteId);

                    entity.HasIndex(x => x.PickupPointId);

                    entity.HasIndex(x => x.VehicleAssignmentId);

                    entity.HasIndex(x => new
                    {
                        x.AdmissionNo,
                        x.EffectiveFrom,
                        x.EffectiveTo
                    });

                    entity.HasIndex(x => new
                    {
                        x.RouteId,
                        x.PickupPointId,
                        x.VehicleAssignmentId,
                        x.Status,
                        x.IsDeleted
                    })
                        .HasDatabaseName("IX_STA_Route_Pickup_Vehicle");

                    entity.Property(x => x.TransportType)
                        .IsRequired()
                        .HasMaxLength(20);

                    entity.Property(x => x.Status)
                        .HasDefaultValue(true);

                    entity.Property(x => x.IsDeleted)
                        .HasDefaultValue(false);
                });
        }

private static void ConfigureVehicleMaintenance(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<VehicleMaintenance>(entity =>
            {
                entity.ToTable(
                    "VehicleMaintenances");

                entity.HasKey(x => x.MaintenanceId);

                entity.Property(x => x.MaintenanceId)

                    .ValueGeneratedOnAdd();

                entity.Property(x => x.VehicleId)

                    .IsRequired();

                entity.Property(x => x.ServiceType)

                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(x => x.ServiceDate)

                    .HasColumnType("date")
                    .IsRequired();

                entity.Property(x => x.Cost)

                    .HasPrecision(12, 2)
                    .HasDefaultValue(0m);

                entity.Property(x => x.VendorCenter)

                    .HasMaxLength(150);

                entity.Property(x => x.NextServiceDue)

                    .HasColumnType("date");

                entity.Property(x => x.Remarks)

                    .HasMaxLength(500);

                entity.Property(x => x.Status)

                    .HasDefaultValue(true);

                entity.Property(x => x.IsDeleted)

                    .HasDefaultValue(false);

                entity.Property(x => x.CreatedBy)
;

                entity.Property(x => x.UpdatedBy)
;

                entity.Property(x => x.CreatedAt)

                    .HasColumnType("datetime")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(x => x.UpdatedAt)

                    .HasColumnType("datetime");

                entity.HasOne(x => x.Vehicle)
                    .WithMany()
                    .HasForeignKey(x => x.VehicleId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Existing foreign-key index
                entity.HasIndex(x => x.VehicleId)
                    .HasDatabaseName("IX_transport_vehicle_maintenance_vehicle_id");

                // Transport report performance index
                entity.HasIndex(x => new
                {
                    x.VehicleId,
                    x.ServiceDate,
                    x.IsDeleted
                })
                    .HasDatabaseName("IX_VehMaint_Vehicle_ServiceDate_Deleted");
            });

            // Staff Campus Assignments Configuration
            modelBuilder.Entity<CollegeManagement.API.Models.Staff.StaffCampusAssignment>(entity =>
            {
                entity.ToTable("StaffCampusAssignments");
                entity.HasIndex(e => new { e.StaffId, e.CampusId }).IsUnique();
                entity.HasOne(e => e.Staff)
                    .WithMany(s => s.StaffCampusAssignments)
                    .HasForeignKey(e => e.StaffId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Campus)
                    .WithMany()
                    .HasForeignKey(e => e.CampusId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Staff Board Assignments Configuration
            modelBuilder.Entity<CollegeManagement.API.Models.Staff.StaffBoardAssignment>(entity =>
            {
                entity.ToTable("StaffBoardAssignments");
                entity.HasIndex(e => new { e.StaffId, e.BoardId }).IsUnique();
                entity.HasOne(e => e.Staff)
                    .WithMany(s => s.StaffBoardAssignments)
                    .HasForeignKey(e => e.StaffId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Board)
                    .WithMany()
                    .HasForeignKey(e => e.BoardId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Permissions Configuration
            modelBuilder.Entity<Permission>(entity =>
            {
                entity.HasIndex(e => e.PermissionCode).IsUnique();
                entity.HasIndex(e => new { e.SubModule, e.Action }).IsUnique();
            });

            // RolePermissions Configuration
            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
                entity.HasOne(e => e.Role)
                    .WithMany(r => r.RolePermissions)
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Permission)
                    .WithMany(p => p.RolePermissions)
                    .HasForeignKey(e => e.PermissionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // UserPermissions Configuration
            modelBuilder.Entity<UserPermission>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.PermissionId }).IsUnique();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserPermissions)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Permission)
                    .WithMany(p => p.UserPermissions)
                    .HasForeignKey(e => e.PermissionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var auditEntries = OnBeforeSaveChanges();
            var result = await base.SaveChangesAsync(cancellationToken);
            await OnAfterSaveChanges(auditEntries, cancellationToken);
            return result;
        }

        private List<AuditEntry> OnBeforeSaveChanges()
        {
            var auditEntries = new List<AuditEntry>();
            var httpContext = _httpContextAccessor?.HttpContext;
            var userId = httpContext?.User?.FindFirstValue("UserId");
            var role = httpContext?.User?.FindFirstValue(ClaimTypes.Role) ?? httpContext?.User?.FindFirstValue("role");
            var ip = httpContext?.Connection?.RemoteIpAddress?.ToString();
            var agent = httpContext?.Request?.Headers["User-Agent"].ToString();
            var userName = httpContext?.User?.Identity?.Name ?? httpContext?.User?.FindFirstValue(ClaimTypes.Email);

            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.Entity is AuditLog || entry.Entity is AttendanceAuditHistory || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                    continue;

                var entityName = entry.Entity.GetType().Name;
                var action = entry.State == EntityState.Added ? "Create" :
                             entry.State == EntityState.Modified ? "Update" : "Delete";

                var auditEntry = new AuditEntry(entry)
                {
                    UserName = userName ?? "Unknown",
                    UserId = int.TryParse(userId, out var uid) ? uid : null,
                    ActorRole = role ?? "Unknown",
                    IpAddress = ip,
                    UserAgent = agent,
                    Action = action,
                    EntityName = entityName,
                    Module = GetModuleFromEntity(entityName)
                };

                // Capture Primary Key if available (for Modified/Deleted)
                var primaryKey = entry.Metadata.FindPrimaryKey();
                if (primaryKey != null)
                {
                    foreach (var property in primaryKey.Properties)
                    {
                        var value = entry.Property(property.Name).CurrentValue;
                        if (value != null && int.TryParse(value.ToString(), out var pKey) && pKey > 0)
                        {
                            auditEntry.EntityId = pKey;
                        }
                    }
                }

                // Capture Property values & diffs
                foreach (var prop in entry.Properties)
                {
                    var propName = prop.Metadata.Name;
                    if (prop.Metadata.IsPrimaryKey())
                        continue;

                    // Exclude internal security and sensitive hash fields
                    if (propName.Contains("PasswordHash") || propName.Contains("PasswordSalt") || propName.Contains("SecurityStamp"))
                        continue;

                    switch (entry.State)
                    {
                        case EntityState.Added:
                            auditEntry.NewValues[propName] = prop.CurrentValue;
                            auditEntry.UserInput[propName] = prop.CurrentValue;
                            break;

                        case EntityState.Deleted:
                            auditEntry.OldValues[propName] = prop.OriginalValue;
                            break;

                        case EntityState.Modified:
                            if (prop.IsModified)
                            {
                                auditEntry.OldValues[propName] = prop.OriginalValue;
                                auditEntry.NewValues[propName] = prop.CurrentValue;
                                auditEntry.ChangedColumns.Add(propName);
                                auditEntry.UserInput[propName] = prop.CurrentValue;
                            }
                            else
                            {
                                // Preserve key contextual fields in NewValues even if unmodified
                                if (propName == "StudentId" || propName == "StaffId" || propName == "AttendanceDate" || propName == "Session" || propName == "Status")
                                {
                                    auditEntry.NewValues[propName] = prop.CurrentValue;
                                }
                            }
                            break;
                    }
                }

                auditEntries.Add(auditEntry);
            }

            return auditEntries;
        }
        
        private async Task OnAfterSaveChanges(List<AuditEntry> auditEntries, CancellationToken cancellationToken)
        {
            if (auditEntries == null || auditEntries.Count == 0)
                return;

            foreach (var auditEntry in auditEntries)
            {
                // Retrieve the positive auto-increment ID generated by the database for new entities
                if (auditEntry.OriginalState == EntityState.Added || auditEntry.EntityId == null || auditEntry.EntityId <= 0)
                {
                    var primaryKey = auditEntry.Entry.Metadata.FindPrimaryKey();
                    if (primaryKey != null)
                    {
                        foreach (var property in primaryKey.Properties)
                        {
                            var value = auditEntry.Entry.Property(property.Name).CurrentValue;
                            if (value != null && int.TryParse(value.ToString(), out var pKey) && pKey > 0)
                            {
                                auditEntry.EntityId = pKey;
                            }
                        }
                    }
                }
                AuditLogs.Add(auditEntry.ToAuditLog());
            }

            await base.SaveChangesAsync(cancellationToken);
        }

        private string GetModuleFromEntity(string entityName)
        {
            return entityName switch
            {
                "User" or "Role" or "Permission" => "Authentication",
                "Attendance" or "StaffAttendance" => "Attendance",
                "Examination" or "Result" => "Examinations",
                "FeePayment" or "StudentFee" => "Finance",
                "Staff" or "Student" => "Administration",
                "Holiday" => "Holiday Management",
                "TransportRoute" or "TransportVehicle" => "Transport",
                _ => "System"
            };
        }
    }
}
