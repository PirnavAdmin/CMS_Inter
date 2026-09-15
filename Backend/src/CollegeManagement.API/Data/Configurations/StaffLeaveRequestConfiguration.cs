using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Data.Configurations
{
    /// <summary>
    /// Configuration for the StaffLeaveRequest entity.
    /// </summary>
    public class StaffLeaveRequestConfiguration : IEntityTypeConfiguration<StaffLeaveRequest>
    {
        /// <summary>
        /// Configures the database schema settings for the StaffLeaveRequest entity.
        /// </summary>
        /// <param name="builder">The builder to be used to configure the entity type.</param>
        public void Configure(EntityTypeBuilder<StaffLeaveRequest> builder)
        {
            #region Table & Keys

            builder.ToTable("StaffLeaveRequests");

            builder.HasKey(lr => lr.StaffLeaveRequestId);

            #endregion

            #region Properties

            builder.Property(lr => lr.StaffId)
                .HasColumnName("StaffId")
                .IsRequired();

            builder.Property(lr => lr.LeaveType)
                .IsRequired();

            builder.Property(lr => lr.StartDate)
                .HasColumnType("date")
                .IsRequired();

            builder.Property(lr => lr.EndDate)
                .HasColumnType("date")
                .IsRequired();

            builder.Property(lr => lr.Reason)
                .HasMaxLength(1000)
                .IsRequired(false);

            builder.Property(lr => lr.Status)
                .IsRequired();

            builder.Property(lr => lr.DepartmentId)
                .IsRequired(false);

            builder.Property(lr => lr.AcademicYearId)
                .IsRequired(false);

            builder.Property(lr => lr.ApprovedByUserId)
                .IsRequired(false);

            builder.Property(lr => lr.ApprovedAt)
                .IsRequired(false);

            builder.Property(lr => lr.RejectionReason)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(lr => lr.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            builder.Property(lr => lr.CreatedByUserId)
                .IsRequired(false);

            builder.Property(lr => lr.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .IsRequired();

            builder.Property(lr => lr.UpdatedAt)
                .IsRequired(false);

            #endregion

            #region Indexes

            builder.HasIndex(lr => lr.StaffId)
                .HasDatabaseName("IX_StaffLeaveRequests_FacultyId");

            builder.HasIndex(lr => lr.Status)
                .HasDatabaseName("IX_StaffLeaveRequests_Status");

            builder.HasIndex(lr => new { lr.StaffId, lr.StartDate, lr.EndDate })
                .HasDatabaseName("IX_StaffLeaveRequests_Faculty_DateRange");

            builder.HasIndex(lr => lr.DepartmentId)
                .HasDatabaseName("IX_StaffLeaveRequests_DepartmentId");

            builder.HasIndex(lr => lr.AcademicYearId)
                .HasDatabaseName("IX_StaffLeaveRequests_AcademicYearId");

            #endregion

            #region Relationships

            builder.HasOne(lr => lr.Staff)
                .WithMany()
                .HasForeignKey(lr => lr.StaffId)
                .HasConstraintName("FK_StaffLeaveRequests_Staff_FacultyId")
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lr => lr.Department)
                .WithMany()
                .HasForeignKey(lr => lr.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lr => lr.AcademicYear)
                .WithMany()
                .HasForeignKey(lr => lr.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lr => lr.ApprovedByUser)
                .WithMany()
                .HasForeignKey(lr => lr.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lr => lr.LeaveCategory)
                .WithMany()
                .HasForeignKey(lr => lr.LeaveCategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            #endregion
        }
    }
}
