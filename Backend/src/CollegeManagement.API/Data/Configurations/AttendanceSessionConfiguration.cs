using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Data.Configurations
{
    /// <summary>
    /// Configuration for the AttendanceSession entity.
    /// </summary>
    public class AttendanceSessionConfiguration : IEntityTypeConfiguration<AttendanceSession>
    {
        private const int RemarksMaxLength = 500;

        /// <summary>
        /// Configures the database schema settings for the AttendanceSession entity.
        /// </summary>
        /// <param name="builder">The builder to be used to configure the entity type.</param>
        public void Configure(EntityTypeBuilder<AttendanceSession> builder)
        {
            #region Table & Keys

            // Table name
            builder.ToTable("AttendanceSessions");

            // Primary Key
            builder.HasKey(s => s.AttendanceSessionId);

            #endregion

            #region Properties

            builder.Property(s => s.TimetableId)
                .IsRequired(false);

            builder.Property(s => s.AttendanceDate)
                .IsRequired();

            builder.Property(s => s.PeriodId)
                .IsRequired(false);

            builder.Property(s => s.SubjectId)
                .IsRequired();

            builder.Property(s => s.SectionId)
                .IsRequired();

            builder.Property(s => s.FacultyId)
                .IsRequired();

            builder.Property(s => s.RoomId)
                .IsRequired(false);

            builder.Property(s => s.AcademicYearId)
                .IsRequired();

            builder.Property(s => s.AcademicLevelId)
                .IsRequired();

            builder.Property(s => s.GroupId)
                .IsRequired();

            builder.Property(s => s.BoardId)
                .IsRequired();

            builder.Property(s => s.IsLocked)
                .HasDefaultValue(false)
                .IsRequired();

            builder.Property(s => s.LockedBy)
                .IsRequired(false);

            builder.Property(s => s.LockedAt)
                .IsRequired(false);

            builder.Property(s => s.SubstituteFacultyId)
                .IsRequired(false);

            builder.Property(s => s.Remarks)
                .HasMaxLength(RemarksMaxLength)
                .IsRequired(false);

            // Default values
            builder.Property(s => s.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            builder.Property(s => s.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .IsRequired();

            builder.Property(s => s.UpdatedAt)
                .IsRequired(false);

            #endregion

            #region Indexes

            // Unique Index
            builder.HasIndex(s => new { s.SectionId, s.PeriodId, s.AttendanceDate })
                .IsUnique()
                .HasDatabaseName("UX_AttendanceSessions_Section_Period_Date");

            // Query Indexes
            builder.HasIndex(s => s.AttendanceDate).HasDatabaseName("IX_AttendanceSessions_AttendanceDate");
            builder.HasIndex(s => s.FacultyId).HasDatabaseName("IX_AttendanceSessions_FacultyId");
            builder.HasIndex(s => s.TimetableId).HasDatabaseName("IX_AttendanceSessions_TimetableId");

            #endregion

            #region Relationships

            builder.HasOne(s => s.Subject)
                .WithMany()
                .HasForeignKey(s => s.SubjectId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.Section)
                .WithMany()
                .HasForeignKey(s => s.SectionId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.AcademicYear)
                .WithMany()
                .HasForeignKey(s => s.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.AcademicLevel)
                .WithMany()
                .HasForeignKey(s => s.AcademicLevelId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.Group)
                .WithMany()
                .HasForeignKey(s => s.GroupId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.Board)
                .WithMany()
                .HasForeignKey(s => s.BoardId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.LockedByUser)
                .WithMany()
                .HasForeignKey(s => s.LockedBy)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<CollegeManagement.API.Models.Faculty.Faculty>()
                .WithMany()
                .HasForeignKey(s => s.FacultyId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<CollegeManagement.API.Models.Faculty.Faculty>()
                .WithMany()
                .HasForeignKey(s => s.SubstituteFacultyId)
                .OnDelete(DeleteBehavior.Restrict);

            #endregion
        }
    }
}
