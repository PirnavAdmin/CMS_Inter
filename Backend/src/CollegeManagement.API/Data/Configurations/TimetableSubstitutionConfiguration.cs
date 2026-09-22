using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CollegeManagement.API.Models.Timetable;

namespace CollegeManagement.API.Data.Configurations
{
    /// <summary>
    /// Configuration for the TimetableSubstitution entity.
    /// </summary>
    public class TimetableSubstitutionConfiguration : IEntityTypeConfiguration<TimetableSubstitution>
    {
        public void Configure(EntityTypeBuilder<TimetableSubstitution> builder)
        {
            builder.ToTable("TimetableSubstitutions");

            builder.HasKey(ts => ts.Id);

            builder.Property(ts => ts.TimetableId)
                .IsRequired();

            builder.Property(ts => ts.StaffLeaveRequestId)
                .IsRequired();

            builder.Property(ts => ts.SubstitutionDate)
                .HasColumnType("date")
                .IsRequired();

            builder.Property(ts => ts.OriginalStaffId)
                .IsRequired();

            builder.Property(ts => ts.SubstituteStaffId)
                .IsRequired();

            builder.Property(ts => ts.SectionId)
                .IsRequired();

            builder.Property(ts => ts.PeriodId)
                .IsRequired();

            builder.Property(ts => ts.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Active")
                .IsRequired();

            builder.Property(ts => ts.Remarks)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(ts => ts.CreatedByUserId)
                .IsRequired(false);

            builder.Property(ts => ts.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP(6)")
                .IsRequired();

            builder.Property(ts => ts.UpdatedByUserId)
                .IsRequired(false);

            builder.Property(ts => ts.UpdatedAt)
                .IsRequired(false);

            #region Indexes

            builder.HasIndex(ts => ts.TimetableId)
                .HasDatabaseName("IX_TimetableSubstitutions_TimetableId");

            builder.HasIndex(ts => ts.StaffLeaveRequestId)
                .HasDatabaseName("IX_TimetableSubstitutions_LeaveRequestId");

            builder.HasIndex(ts => ts.OriginalStaffId)
                .HasDatabaseName("IX_TimetableSubstitutions_OrigStaff");

            builder.HasIndex(ts => ts.SubstituteStaffId)
                .HasDatabaseName("IX_TimetableSubstitutions_SubStaff");

            builder.HasIndex(ts => new { ts.SubstitutionDate, ts.Status })
                .HasDatabaseName("IX_TimetableSubstitutions_Date_Status");

            builder.HasIndex(ts => new { ts.SubstituteStaffId, ts.SubstitutionDate, ts.PeriodId, ts.Status })
                .HasDatabaseName("IX_TimetableSubstitutions_SubConflict");

            builder.HasIndex(ts => new { ts.TimetableId, ts.SubstitutionDate, ts.Status })
                .HasDatabaseName("IX_TimetableSubstitutions_SlotDate");

            #endregion

            #region Relationships

            builder.HasOne(ts => ts.Timetable)
                .WithMany()
                .HasForeignKey(ts => ts.TimetableId)
                .HasConstraintName("FK_TimetableSubstitutions_Timetable")
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(ts => ts.StaffLeaveRequest)
                .WithMany()
                .HasForeignKey(ts => ts.StaffLeaveRequestId)
                .HasConstraintName("FK_TimetableSubstitutions_LeaveRequest")
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(ts => ts.OriginalStaff)
                .WithMany()
                .HasForeignKey(ts => ts.OriginalStaffId)
                .HasConstraintName("FK_TimetableSubstitutions_OrigStaff")
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(ts => ts.SubstituteStaff)
                .WithMany()
                .HasForeignKey(ts => ts.SubstituteStaffId)
                .HasConstraintName("FK_TimetableSubstitutions_SubStaff")
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(ts => ts.Section)
                .WithMany()
                .HasForeignKey(ts => ts.SectionId)
                .HasConstraintName("FK_TimetableSubstitutions_Section")
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(ts => ts.Period)
                .WithMany()
                .HasForeignKey(ts => ts.PeriodId)
                .HasConstraintName("FK_TimetableSubstitutions_Period")
                .OnDelete(DeleteBehavior.Restrict);

            #endregion
        }
    }
}