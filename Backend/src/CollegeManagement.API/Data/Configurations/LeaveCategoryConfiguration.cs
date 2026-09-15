using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CollegeManagement.API.Data.Configurations
{
    public class LeaveCategoryConfiguration : IEntityTypeConfiguration<LeaveCategory>
    {
        public void Configure(EntityTypeBuilder<LeaveCategory> builder)
        {
            builder.ToTable("LeaveCategories");

            builder.HasKey(lc => lc.LeaveCategoryId);

            builder.Property(lc => lc.CategoryName)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(lc => lc.CategoryCode)
                .HasMaxLength(10)
                .IsRequired();

            builder.HasIndex(lc => lc.CategoryCode)
                .IsUnique()
                .HasDatabaseName("UX_LeaveCategories_CategoryCode");

            builder.Property(lc => lc.AnnualQuota)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            builder.Property(lc => lc.ApplicableStaffType)
                .HasMaxLength(50)
                .HasDefaultValue("All Staff");

            builder.Property(lc => lc.Description)
                .HasMaxLength(500);

            builder.Property(lc => lc.IsActive)
                .HasDefaultValue(true);

            builder.Property(lc => lc.DisplayOrder)
                .HasDefaultValue(0);
        }
    }
}
