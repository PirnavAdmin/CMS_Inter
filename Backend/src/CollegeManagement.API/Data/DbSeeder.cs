using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // =====================================================
            // SEED ROLES
            // =====================================================

            if (!await context.Roles.AnyAsync())
            {
                await context.Roles.AddRangeAsync(
                    new Role
                    {
                        RoleId = 1,
                        RoleName = "Admin"
                    },
                    new Role
                    {
                        RoleId = 2,
                        RoleName = "Faculty"
                    },
                    new Role
                    {
                        RoleId = 3,
                        RoleName = "Student"
                    }
                );

                await context.SaveChangesAsync();
            }


            // =====================================================
            // SEED ADMINS
            // =====================================================

            if (!await context.Admins.AnyAsync())
            {
                await context.Admins.AddRangeAsync(
                    new Admin
                    {
                        Email = "admin@college.com",
                        Password = "$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6",
                        IsActive = true
                    }
                );

                await context.SaveChangesAsync();
            }


            // =====================================================
            // SEED ACADEMIC YEARS
            // =====================================================

            if (!await context.AcademicYears.AnyAsync())
            {
                await context.AcademicYears.AddRangeAsync(
                    new AcademicYear
                    {
                        AcademicYearName = "2025-2026",
                        StartDate = new DateOnly(2025, 6, 1),
                        EndDate = new DateOnly(2026, 4, 30),
                        AdmissionStartDate = new DateOnly(2025, 4, 1),
                        AdmissionEndDate = new DateOnly(2025, 5, 31),
                        IsActive = true
                    }
                );

                await context.SaveChangesAsync();
            }


            // =====================================================
            // GET ACTIVE BOARD
            // =====================================================

            var activeBoard = await context.Boards
                .Where(x => x.IsActive)
                .OrderBy(x => x.BoardId)
                .FirstOrDefaultAsync();

            if (activeBoard == null)
            {
                throw new Exception(
                    "Cannot seed Groups because no active Board exists.");
            }


            // =====================================================
            // GET ACTIVE ACADEMIC YEAR
            // =====================================================

            var activeAcademicYear = await context.AcademicYears
                .Where(x => x.IsActive)
                .OrderBy(x => x.AcademicYearId)
                .FirstOrDefaultAsync();

            if (activeAcademicYear == null)
            {
                throw new Exception(
                    "Cannot seed Groups because no active Academic Year exists.");
            }


            // =====================================================
            // GET ACTIVE ACADEMIC LEVEL
            // =====================================================

            var activeAcademicLevel = await context.AcademicLevels
                .Where(x => x.IsActive)
                .OrderBy(x => x.AcademicLevelId)
                .FirstOrDefaultAsync();

            if (activeAcademicLevel == null)
            {
                throw new Exception(
                    "Cannot seed Groups because no active Academic Level exists.");
            }


            // =====================================================
            // SEED GROUPS
            // =====================================================

            if (!await context.Groups.AnyAsync())
            {
                await context.Groups.AddRangeAsync(
                    new Group
                    {
                        BoardId = activeBoard.BoardId,
                        AcademicYearId = activeAcademicYear.AcademicYearId,
                        AcademicLevelId = activeAcademicLevel.AcademicLevelId,

                        GroupName =
                            "MPC (Maths, Physics, Chemistry)",

                        GroupCode = "MPC",

                        Description =
                            "Mathematics, Physics, Chemistry Group",

                        IsActive = true,

                        CreatedAt = DateTime.UtcNow
                    },

                    new Group
                    {
                        BoardId = activeBoard.BoardId,
                        AcademicYearId = activeAcademicYear.AcademicYearId,
                        AcademicLevelId = activeAcademicLevel.AcademicLevelId,

                        GroupName =
                            "BiPC (Biology, Physics, Chemistry)",

                        GroupCode = "BiPC",

                        Description =
                            "Biology, Physics, Chemistry Group",

                        IsActive = true,

                        CreatedAt = DateTime.UtcNow
                    }
                );

                await context.SaveChangesAsync();
            }
        }
    }
}