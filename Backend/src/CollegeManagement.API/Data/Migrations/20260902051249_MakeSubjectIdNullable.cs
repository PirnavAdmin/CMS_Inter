using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class MakeSubjectIdNullable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The EF Core model already had SubjectId as nullable, but the database was incorrectly NOT NULL.
            // We force the schema change here. Note: In MySQL 8, MODIFY COLUMN requires redeclaring the data type.
            // We must be careful not to drop the foreign key unless required. ALTER TABLE MODIFY usually keeps the FK.
            migrationBuilder.Sql("ALTER TABLE `attendances` MODIFY COLUMN `SubjectId` int NULL;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE `attendances` MODIFY COLUMN `SubjectId` int NOT NULL;");
        }
    }
}
