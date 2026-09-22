using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class RefactorSubjectManagementContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AcademicYears_AcademicYearId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_AcademicYearId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_SubjectCode",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Board",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Group",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "StudentName",
                table: "AssignmentSubmissions");

            migrationBuilder.AlterColumn<int>(
                name: "GroupId",
                table: "Subjects",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "BoardId",
                table: "Subjects",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelId",
                table: "Subjects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Assignments",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "Assignments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_AcademicLevelId",
                table: "Subjects",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "UX_Subjects_Context_Code",
                table: "Subjects",
                columns: new[] { "BoardId", "GroupId", "AcademicLevelId", "SubjectCode" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AcademicLevels_AcademicLevelId",
                table: "Subjects",
                column: "AcademicLevelId",
                principalTable: "AcademicLevels",
                principalColumn: "AcademicLevelId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AcademicLevels_AcademicLevelId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_AcademicLevelId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "UX_Subjects_Context_Code",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "AcademicLevelId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "Assignments");

            migrationBuilder.AlterColumn<int>(
                name: "GroupId",
                table: "Subjects",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "BoardId",
                table: "Subjects",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "Subjects",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "Subjects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Board",
                table: "Subjects",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Group",
                table: "Subjects",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "StudentName",
                table: "AssignmentSubmissions",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_AcademicYearId",
                table: "Subjects",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_SubjectCode",
                table: "Subjects",
                column: "SubjectCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AcademicYears_AcademicYearId",
                table: "Subjects",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "AcademicYearId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
