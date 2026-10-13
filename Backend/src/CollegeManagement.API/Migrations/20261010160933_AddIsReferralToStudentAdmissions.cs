using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsReferralToStudentAdmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rule",
                table: "FeeStructureComponents");

            migrationBuilder.DropColumn(
                name: "BloodGroup",
                table: "Faculties");

            migrationBuilder.AddColumn<bool>(
                name: "IsReferral",
                table: "StudentAdmissions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "GroupId",
                table: "ExamSchedules",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncludedSubjectIds",
                table: "ExamSchedules",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PatternName",
                table: "ExamSchedules",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "admins",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "admins",
                type: "varchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "admins",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PhotoPath",
                table: "admins",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "admins",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropColumn(
                name: "IsReferral",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "ExamSchedules");

            migrationBuilder.DropColumn(
                name: "IncludedSubjectIds",
                table: "ExamSchedules");

            migrationBuilder.DropColumn(
                name: "PatternName",
                table: "ExamSchedules");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "admins");

            migrationBuilder.DropColumn(
                name: "FullName",
                table: "admins");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "admins");

            migrationBuilder.DropColumn(
                name: "PhotoPath",
                table: "admins");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "admins");

            migrationBuilder.AddColumn<string>(
                name: "Rule",
                table: "FeeStructureComponents",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BloodGroup",
                table: "Faculties",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
