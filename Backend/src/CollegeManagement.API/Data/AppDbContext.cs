using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Data.Configurations;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Models.Reports;

namespace CollegeManagement.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
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
        public DbSet<StaffLeaveRequest> StaffLeaveRequests { get; set; }
        public DbSet<StaffLeaveBalance> StaffLeaveBalances { get; set; }
        public DbSet<LeaveCategory> LeaveCategories { get; set; }
        public DbSet<AttendanceAuditHistory> AttendanceAuditHistories { get; set; }
        public DbSet<GradingSystem> GradingSystems { get; set; }
        public DbSet<AssessmentType> AssessmentTypes { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<BoardAcademicLevel> BoardAcademicLevels { get; set; }
        public DbSet<BoardAssessment> BoardAssessments { get; set; }
        
        public DbSet<Student> Students { get; set; }
        public DbSet<StudentAdmission> StudentAdmissions { get; set; }
        public DbSet<Designation> Designations { get; set; }
        public DbSet<Staff> Staffs { get; set; }
        public DbSet<StaffSubjectAllocation> StaffSubjectAllocations { get; set; }
        public DbSet<Faculty> Faculties { get; set; }
        public DbSet<FacultySubjectAllocation> FacultySubjectAllocations { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }

        public DbSet<Examination> Examinations { get; set; }
        public DbSet<ExamCodeSequence> ExamCodeSequences { get; set; }
        public DbSet<ExamSchedule> ExamSchedules { get; set; }
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
                .Property(sa => sa.SectionId)
                .HasColumnName("SectionId");

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
                entity.Property(x => x.Rule).IsRequired().HasMaxLength(20);
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
                entity.HasKey("StudentFeeId");

                entity.Property("TotalAmount")
                    .HasColumnType("decimal(18,2)");

                entity.Property("ConcessionAmount")
                    .HasColumnType("decimal(18,2)");

                entity.Property("PayableAmount")
                    .HasColumnType("decimal(18,2)");

                entity.Property("PaidAmount")
                    .HasColumnType("decimal(18,2)");

                entity.Property("BalanceAmount")
                    .HasColumnType("decimal(18,2)");

                entity.Property("Status")
                    .IsRequired()
                    .HasMaxLength(30);

                entity.Property("AssignedAt")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

                entity.HasIndex("StudentId", "FeeStructureId")
                    .IsUnique();

                // Student -> StudentFee
                entity.HasOne<Student>()
                    .WithMany()
                    .HasForeignKey("StudentId")
                    .OnDelete(DeleteBehavior.Restrict);

                // FeeStructure -> StudentFee
                entity.HasOne<FeeStructure>()
                    .WithMany()
                    .HasForeignKey("FeeStructureId")
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
                entity.Property(x => x.DiscountAmount).HasColumnType("decimal(18,2)");
                entity.Property(x => x.FineAmount).HasColumnType("decimal(18,2)");
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
    }
}
