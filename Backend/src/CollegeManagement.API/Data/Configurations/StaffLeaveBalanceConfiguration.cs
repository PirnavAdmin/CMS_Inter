using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CollegeManagement.API.Data.Configurations
{
    public class StaffLeaveBalanceConfiguration : IEntityTypeConfiguration<StaffLeaveBalance>
    {
        public void Configure(EntityTypeBuilder<StaffLeaveBalance> builder)
        {
            builder.ToTable("StaffLeaveBalances");

            builder.HasKey(lb => lb.LeaveBalanceId);

            builder.Property(lb => lb.TotalDays)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            builder.Property(lb => lb.UsedDays)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            builder.Property(lb => lb.RemainingDays)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            // Unique constraint on Staff + LeaveType + AcademicYear
            builder.HasIndex(lb => new { lb.StaffId, lb.LeaveType, lb.AcademicYearId })
                .IsUnique()
                .HasDatabaseName("UX_StaffLeaveBalances_Staff_LeaveType_AcademicYear");

            // Relationships
            builder.HasOne(lb => lb.Staff)
                .WithMany()
                .HasForeignKey(lb => lb.StaffId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StaffLeaveBalances_Staffs_StaffId");

            builder.HasOne(lb => lb.AcademicYear)
                .WithMany()
                .HasForeignKey(lb => lb.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_StaffLeaveBalances_AcademicYears_AcademicYearId");

            builder.HasOne(lb => lb.LeaveCategory)
                .WithMany()
                .HasForeignKey(lb => lb.LeaveCategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_StaffLeaveBalances_LeaveCategories_LeaveCategoryId");
        }
    }
}
