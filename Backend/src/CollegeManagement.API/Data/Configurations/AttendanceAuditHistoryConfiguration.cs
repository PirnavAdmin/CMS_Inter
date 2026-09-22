using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Data.Configurations
{
    /// <summary>
    /// Configuration for the AttendanceAuditHistory entity.
    /// </summary>
    public class AttendanceAuditHistoryConfiguration : IEntityTypeConfiguration<AttendanceAuditHistory>
    {
        /// <summary>
        /// Configures the database schema settings for the AttendanceAuditHistory entity.
        /// </summary>
        /// <param name="builder">The builder to be used to configure the entity type.</param>
        public void Configure(EntityTypeBuilder<AttendanceAuditHistory> builder)
        {
            #region Table & Keys

            builder.ToTable("AttendanceAuditHistory");

            builder.HasKey(a => a.AuditId);

            #endregion

            #region Properties

            builder.Property(a => a.EntityType)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(a => a.EntityId)
                .IsRequired();

            builder.Property(a => a.StudentId)
                .IsRequired(false);

            builder.Property(a => a.FacultyId)
                .IsRequired(false);

            builder.Property(a => a.AttendanceDate)
                .IsRequired();

            builder.Property(a => a.OldStatus)
                .IsRequired(false);

            builder.Property(a => a.NewStatus)
                .IsRequired(false);

            builder.Property(a => a.Action)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(a => a.Description)
                .HasMaxLength(1000)
                .IsRequired(false);

            builder.Property(a => a.ModifiedByUserId)
                .IsRequired(false);

            builder.Property(a => a.ModifiedByUserName)
                .HasMaxLength(150)
                .IsRequired(false);

            builder.Property(a => a.IpAddress)
                .HasMaxLength(45)
                .IsRequired(false);

            builder.Property(a => a.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .IsRequired();

            #endregion

            #region Indexes

            builder.HasIndex(a => new { a.EntityType, a.EntityId })
                .HasDatabaseName("IX_AttendanceAuditHistory_EntityType_EntityId");

            builder.HasIndex(a => a.StudentId)
                .HasDatabaseName("IX_AttendanceAuditHistory_StudentId");

            builder.HasIndex(a => a.FacultyId)
                .HasDatabaseName("IX_AttendanceAuditHistory_FacultyId");

            builder.HasIndex(a => a.AttendanceDate)
                .HasDatabaseName("IX_AttendanceAuditHistory_AttendanceDate");

            builder.HasIndex(a => a.ModifiedByUserId)
                .HasDatabaseName("IX_AttendanceAuditHistory_ModifiedByUserId");

            #endregion

            #region Relationships

            builder.HasOne(a => a.ModifiedByUser)
                .WithMany()
                .HasForeignKey(a => a.ModifiedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            #endregion
        }
    }
}
