using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceCampusIdToStudentAdmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructureComponents_FeeTypes_FeeTypeId",
                table: "FeeStructureComponents");

            migrationBuilder.DropForeignKey(
                name: "FK_InvigilatorAssignments_Users_InvigilatorId",
                table: "InvigilatorAssignments");

            migrationBuilder.DropColumn(
                name: "FatherEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "Aadhaar",
                table: "Faculties");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "InvigilatorAssignments",
                newName: "InvigilatorAssignmentId");

            migrationBuilder.RenameColumn(
                name: "FeeTypeId",
                table: "FeeStructureComponents",
                newName: "FeeComponentId");

            migrationBuilder.RenameIndex(
                name: "IX_FeeStructureComponents_FeeTypeId",
                table: "FeeStructureComponents",
                newName: "IX_FeeStructureComponents_FeeComponentId");

            migrationBuilder.RenameIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeTypeId",
                table: "FeeStructureComponents",
                newName: "IX_FeeStructureComponents_FeeStructureId_FeeComponentId");

            migrationBuilder.AddColumn<int>(
                name: "Experience",
                table: "TransportDrivers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StaffId",
                table: "TransportDrivers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StaffId",
                table: "TransportAttendants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BedId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusRoute",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BusType",
                table: "Students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HallTicketNumber",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HostelBed",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HostelBlock",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "HostelId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HostelRoom",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PickupPoint",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "PickupPointId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RouteId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentType",
                table: "Students",
                type: "varchar(30)",
                maxLength: 30,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "TransportRequired",
                table: "Students",
                type: "tinyint(1)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "StudentFeeComponents",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceCampusId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "Scholarships",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "Scholarships",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Scholarships",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "HallNumber",
                table: "InvigilatorAssignments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "FineRules",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "FineRules",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "FineRules",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "FeeTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "FeeTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "FeeTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultAmount",
                table: "FeeStructureComponents",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "FeeStructureComponents",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsMandatory",
                table: "FeeStructureComponents",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ActorRole",
                table: "AuditLogs",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "AuditLogs",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Module",
                table: "AuditLogs",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Severity",
                table: "AuditLogs",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "StaffId",
                table: "AuditLogs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "AuditLogs",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "AuditLogs",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "AuditLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ParentStudentMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ParentUserId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    RelationshipType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsPrimaryContact = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParentStudentMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParentStudentMappings_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParentStudentMappings_Users_ParentUserId",
                        column: x => x.ParentUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ParentStudentMappings_ParentUserId",
                table: "ParentStudentMappings",
                column: "ParentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ParentStudentMappings_StudentId",
                table: "ParentStudentMappings",
                column: "StudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructureComponents_FeeTypes_FeeComponentId",
                table: "FeeStructureComponents",
                column: "FeeComponentId",
                principalTable: "FeeTypes",
                principalColumn: "FeeTypeId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InvigilatorAssignments_Staff_InvigilatorId",
                table: "InvigilatorAssignments",
                column: "InvigilatorId",
                principalTable: "Staff",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructureComponents_FeeTypes_FeeComponentId",
                table: "FeeStructureComponents");

            migrationBuilder.DropForeignKey(
                name: "FK_InvigilatorAssignments_Staff_InvigilatorId",
                table: "InvigilatorAssignments");

            migrationBuilder.DropTable(
                name: "ParentStudentMappings");

            migrationBuilder.DropColumn(
                name: "Experience",
                table: "TransportDrivers");

            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "TransportDrivers");

            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "TransportAttendants");

            migrationBuilder.DropColumn(
                name: "BedId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BusRoute",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BusType",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HallTicketNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HostelBed",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HostelBlock",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HostelId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HostelRoom",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PickupPoint",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PickupPointId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "RouteId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "StudentType",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TransportRequired",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "StudentFeeComponents");

            migrationBuilder.DropColumn(
                name: "SourceCampusId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "Scholarships");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "Scholarships");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Scholarships");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "FineRules");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "FineRules");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "FineRules");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "FeeTypes");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "FeeTypes");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "FeeTypes");

            migrationBuilder.DropColumn(
                name: "DefaultAmount",
                table: "FeeStructureComponents");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "FeeStructureComponents");

            migrationBuilder.DropColumn(
                name: "IsMandatory",
                table: "FeeStructureComponents");

            migrationBuilder.DropColumn(
                name: "ActorRole",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Module",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "AuditLogs");

            migrationBuilder.RenameColumn(
                name: "InvigilatorAssignmentId",
                table: "InvigilatorAssignments",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "FeeComponentId",
                table: "FeeStructureComponents",
                newName: "FeeTypeId");

            migrationBuilder.RenameIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeComponentId",
                table: "FeeStructureComponents",
                newName: "IX_FeeStructureComponents_FeeStructureId_FeeTypeId");

            migrationBuilder.RenameIndex(
                name: "IX_FeeStructureComponents_FeeComponentId",
                table: "FeeStructureComponents",
                newName: "IX_FeeStructureComponents_FeeTypeId");

            migrationBuilder.AddColumn<string>(
                name: "FatherEmail",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MotherEmail",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Marks",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "HallNumber",
                table: "InvigilatorAssignments",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(100)",
                oldMaxLength: 100)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Aadhaar",
                table: "Faculties",
                type: "varchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructureComponents_FeeTypes_FeeTypeId",
                table: "FeeStructureComponents",
                column: "FeeTypeId",
                principalTable: "FeeTypes",
                principalColumn: "FeeTypeId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InvigilatorAssignments_Users_InvigilatorId",
                table: "InvigilatorAssignments",
                column: "InvigilatorId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
