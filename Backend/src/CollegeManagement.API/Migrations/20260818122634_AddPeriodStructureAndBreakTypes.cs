using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPeriodStructureAndBreakTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_AcademicLevels_AcademicLevelId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_AcademicYears_AcademicYearId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Boards_BoardId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Faculty_FacultyId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Groups_GroupId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Sections_SectionId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Students_StudentId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendances_Subjects_SubjectId",
                table: "Attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_FacultySubjectAllocation_Faculty_FacultyId",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropIndex(
                name: "IX_Students_AdmissionId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Groups_Board",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_Board_AcademicYearId_IsActive",
                table: "Groups");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Attendances",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_AcademicLevelId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_AcademicYearId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_AttendanceDate",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_BoardId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_FacultyId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_GroupId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_SectionId",
                table: "Attendances");

            migrationBuilder.DropIndex(
                name: "IX_Attendances_StudentId_SubjectId_AttendanceDate",
                table: "Attendances");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FacultySubjectAllocation",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Faculty",
                table: "Faculty");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Board",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "Board",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "AcademicLevelId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "AttendanceDate",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "FacultyId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "AcademicYear",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "Board",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "Group",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "Subject",
                table: "FacultySubjectAllocation");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Faculty");

            migrationBuilder.DropColumn(
                name: "Password",
                table: "Faculty");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "Faculty");

            migrationBuilder.RenameTable(
                name: "Attendances",
                newName: "attendances");

            migrationBuilder.RenameTable(
                name: "FacultySubjectAllocation",
                newName: "FacultySubjectAllocations");

            migrationBuilder.RenameTable(
                name: "Faculty",
                newName: "Faculties");

            migrationBuilder.RenameColumn(
                name: "AdmissionId",
                table: "Students",
                newName: "PreviousYearOfPassing");

            migrationBuilder.RenameColumn(
                name: "SubjectId",
                table: "attendances",
                newName: "AttendanceSessionId");

            migrationBuilder.RenameIndex(
                name: "IX_Attendances_SubjectId",
                table: "attendances",
                newName: "IX_attendances_AttendanceSessionId");

            migrationBuilder.RenameIndex(
                name: "IX_FacultySubjectAllocation_FacultyId",
                table: "FacultySubjectAllocations",
                newName: "IX_FacultySubjectAllocations_FacultyId");

            migrationBuilder.AlterColumn<int>(
                name: "SectionId",
                table: "Students",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "ScholarshipAmount",
                table: "Students",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,2)");

            migrationBuilder.AlterColumn<string>(
                name: "RollNo",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(30)",
                oldMaxLength: 30)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "Students",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(500)",
                oldMaxLength: 500,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "MobileNumber",
                table: "Students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(150)",
                oldMaxLength: 150)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DateOfBirth",
                table: "Students",
                type: "datetime(6)",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<int>(
                name: "BoardId",
                table: "Students",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AdmissionNo",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(30)",
                oldMaxLength: 30)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateTime>(
                name: "AdmissionDate",
                table: "Students",
                type: "datetime(6)",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<string>(
                name: "AadhaarDocument",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelId",
                table: "Students",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AdmissionQuota",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "AnnualIncome",
                table: "Students",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BirthCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CasteCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CommunityCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "FatherEmail",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "FatherOccupation",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "GuardianEmail",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "IncomeCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Students",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MarksMemo",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MotherEmail",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MotherOccupation",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "Students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PreviousBoard",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PreviousHallTicketNumber",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "PreviousPercentage",
                table: "Students",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Religion",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SecondLanguage",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Students",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "StudyCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "TenthCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "TransferCertificate",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "Sections",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelId",
                table: "Groups",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "Groups",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<bool>(
                name: "RankCalculation",
                table: "Boards",
                type: "tinyint(1)",
                nullable: false,
                oldClrType: typeof(sbyte),
                oldType: "tinyint(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<uint>(
                name: "RowVersion",
                table: "Boards",
                type: "int unsigned",
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<int>(
                name: "SubjectId",
                table: "FacultySubjectAllocations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "Faculties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacultyType",
                table: "Faculties",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddPrimaryKey(
                name: "PK_attendances",
                table: "attendances",
                column: "AttendanceId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FacultySubjectAllocations",
                table: "FacultySubjectAllocations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Faculties",
                table: "Faculties",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "admins",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Email = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Password = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admins", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Assignments",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevel = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    FacultyId = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Attachment = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MaximumMarks = table.Column<int>(type: "int", nullable: false),
                    CreatedByType = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assignments", x => x.AssignmentId);
                    table.ForeignKey(
                        name: "FK_Assignments_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Assignments_Faculties_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "Faculties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Assignments_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Assignments_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_sessions",
                columns: table => new
                {
                    AttendanceSessionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TimetableId = table.Column<int>(type: "int", nullable: true),
                    AttendanceDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    PeriodId = table.Column<int>(type: "int", nullable: true),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    FacultyId = table.Column<int>(type: "int", nullable: false),
                    RoomId = table.Column<int>(type: "int", nullable: true),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    IsLocked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    LockedBy = table.Column<int>(type: "int", nullable: true),
                    LockedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    SubstituteFacultyId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_sessions", x => x.AttendanceSessionId);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_sessions_Users_LockedBy",
                        column: x => x.LockedBy,
                        principalTable: "Users",
                        principalColumn: "UserId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    AuditLogId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Action = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EntityName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.AuditLogId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "BreakTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BreakTypes", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Certificates",
                columns: table => new
                {
                    CertificateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CertificateNumber = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    AdmissionNo = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AcademicLevel = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AcademicYear = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CertificateType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Purpose = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Remarks = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GeneratedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ReviewedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IssuedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IssuedBy = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certificates", x => x.CertificateId);
                    table.ForeignKey(
                        name: "FK_Certificates_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    DepartmentName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DepartmentCode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.DepartmentId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Examinations",
                columns: table => new
                {
                    ExamId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ExamName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    AssessmentTypeId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Examinations", x => x.ExamId);
                    table.ForeignKey(
                        name: "FK_Examinations_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Examinations_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Examinations_AssessmentTypes_AssessmentTypeId",
                        column: x => x.AssessmentTypeId,
                        principalTable: "AssessmentTypes",
                        principalColumn: "AssessmentTypeId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Examinations_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Examinations_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "FeeStructures",
                columns: table => new
                {
                    FeeStructureId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeStructures", x => x.FeeStructureId);
                    table.ForeignKey(
                        name: "FK_FeeStructures_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FeeStructures_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FeeStructures_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FeeStructures_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "FeeTypes",
                columns: table => new
                {
                    FeeTypeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FeeTypeCode = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FeeTypeName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsMandatory = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeTypes", x => x.FeeTypeId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PeriodStructures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DayStartTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    PeriodDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    TotalTeachingPeriods = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PeriodStructures", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Rooms",
                columns: table => new
                {
                    RoomId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RoomNumber = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BuildingName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Floor = table.Column<int>(type: "int", nullable: true),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    RoomType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.RoomId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StudentAdmissions",
                columns: table => new
                {
                    AdmissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AdmissionNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AdmissionDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    AdmissionQuota = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FirstName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Gender = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DateOfBirth = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    BloodGroup = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentPhoto = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentEmail = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentMobileNumber = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AadhaarNumber = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Nationality = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Religion = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Category = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FatherName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FatherOccupation = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FatherMobile = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FatherEmail = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MotherName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MotherOccupation = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MotherMobile = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MotherEmail = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GuardianName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GuardianMobile = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GuardianEmail = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AnnualIncome = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    Address = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    City = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    District = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    State = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Pincode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    PreviousSchool = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PreviousBoard = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PreviousPercentage = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    PreviousYearOfPassing = table.Column<int>(type: "int", nullable: true),
                    MarksMemo = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SecondLanguage = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AdmissionType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Medium = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ScholarshipStatus = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RollNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BirthCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TransferCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudyCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AadhaarDocument = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CommunityCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IncomeCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CasteCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TenthCertificate = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsVerified = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsApproved = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsRejected = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentAdmissions", x => x.AdmissionId);
                    table.ForeignKey(
                        name: "FK_StudentAdmissions_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAdmissions_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAdmissions_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAdmissions_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAdmissions_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StudentFees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    DueAmount = table.Column<decimal>(type: "decimal(65,30)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentFees", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StudyMaterials",
                columns: table => new
                {
                    StudyMaterialId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Subject = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Faculty = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FilePath = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UploadedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyMaterials", x => x.StudyMaterialId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AssignmentSubmissions",
                columns: table => new
                {
                    SubmissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AssignmentId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    StudentName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RollNo = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GroupId = table.Column<int>(type: "int", nullable: true),
                    SectionId = table.Column<int>(type: "int", nullable: true),
                    SubjectId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FileUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SubmissionStatus = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MarksObtained = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    Feedback = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SubmissionDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignmentSubmissions", x => x.SubmissionId);
                    table.ForeignKey(
                        name: "FK_AssignmentSubmissions_Assignments_AssignmentId",
                        column: x => x.AssignmentId,
                        principalTable: "Assignments",
                        principalColumn: "AssignmentId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ExamSchedules",
                columns: table => new
                {
                    ExamScheduleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ExaminationId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    ExamDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ExamTime = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    Hall = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Invigilator = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamSchedules", x => x.ExamScheduleId);
                    table.ForeignKey(
                        name: "FK_ExamSchedules_Examinations_ExaminationId",
                        column: x => x.ExaminationId,
                        principalTable: "Examinations",
                        principalColumn: "ExamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamSchedules_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "HallTickets",
                columns: table => new
                {
                    HallTicketId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ExaminationId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HallTickets", x => x.HallTicketId);
                    table.ForeignKey(
                        name: "FK_HallTickets_Examinations_ExaminationId",
                        column: x => x.ExaminationId,
                        principalTable: "Examinations",
                        principalColumn: "ExamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HallTickets_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Marks",
                columns: table => new
                {
                    MarkId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Board = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BoardId = table.Column<int>(type: "int", nullable: true),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevel = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: true),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    ExaminationId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    RollNo = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StudentName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FacultyId = table.Column<int>(type: "int", nullable: true),
                    InternalMarks = table.Column<int>(type: "int", nullable: false),
                    PracticalMarks = table.Column<int>(type: "int", nullable: false),
                    TheoryMarks = table.Column<int>(type: "int", nullable: false),
                    TotalMarks = table.Column<int>(type: "int", nullable: false),
                    PassingMarks = table.Column<int>(type: "int", nullable: false),
                    IsAbsent = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsVerified = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsPublished = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsLocked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    VerifiedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VerifiedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Marks", x => x.MarkId);
                    table.ForeignKey(
                        name: "FK_Marks_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId");
                    table.ForeignKey(
                        name: "FK_Marks_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Marks_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId");
                    table.ForeignKey(
                        name: "FK_Marks_Examinations_ExaminationId",
                        column: x => x.ExaminationId,
                        principalTable: "Examinations",
                        principalColumn: "ExamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Marks_Faculties_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "Faculties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Marks_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Marks_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Marks_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Marks_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Results",
                columns: table => new
                {
                    ResultId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    ExamId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    InternalMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    PracticalMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    ExternalMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    TotalMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Grade = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ResultStatus = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Rank = table.Column<int>(type: "int", nullable: true),
                    PublishedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsPublished = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Results", x => x.ResultId);
                    table.ForeignKey(
                        name: "FK_Results_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Examinations_ExamId",
                        column: x => x.ExamId,
                        principalTable: "Examinations",
                        principalColumn: "ExamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Results_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "FeeStructureItems",
                columns: table => new
                {
                    FeeStructureItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FeeStructureId = table.Column<int>(type: "int", nullable: false),
                    FeeTypeId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsMandatory = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeStructureItems", x => x.FeeStructureItemId);
                    table.ForeignKey(
                        name: "FK_FeeStructureItems_FeeStructures_FeeStructureId",
                        column: x => x.FeeStructureId,
                        principalTable: "FeeStructures",
                        principalColumn: "FeeStructureId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FeeStructureItems_FeeTypes_FeeTypeId",
                        column: x => x.FeeTypeId,
                        principalTable: "FeeTypes",
                        principalColumn: "FeeTypeId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Periods",
                columns: table => new
                {
                    PeriodId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PeriodStructureId = table.Column<int>(type: "int", nullable: true),
                    PeriodName = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time(6)", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsBreak = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Periods", x => x.PeriodId);
                    table.ForeignKey(
                        name: "FK_Periods_PeriodStructures_PeriodStructureId",
                        column: x => x.PeriodStructureId,
                        principalTable: "PeriodStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PeriodStructureAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PeriodStructureId = table.Column<int>(type: "int", nullable: false),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PeriodStructureAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PeriodStructureAssignments_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PeriodStructureAssignments_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PeriodStructureAssignments_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PeriodStructureAssignments_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PeriodStructureAssignments_PeriodStructures_PeriodStructureId",
                        column: x => x.PeriodStructureId,
                        principalTable: "PeriodStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PeriodStructureItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PeriodStructureId = table.Column<int>(type: "int", nullable: false),
                    SequenceOrder = table.Column<int>(type: "int", nullable: false),
                    ItemType = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PeriodNumber = table.Column<int>(type: "int", nullable: true),
                    BreakTypeId = table.Column<int>(type: "int", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PeriodStructureItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PeriodStructureItems_BreakTypes_BreakTypeId",
                        column: x => x.BreakTypeId,
                        principalTable: "BreakTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PeriodStructureItems_PeriodStructures_PeriodStructureId",
                        column: x => x.PeriodStructureId,
                        principalTable: "PeriodStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "InvigilatorAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ExamScheduleId = table.Column<int>(type: "int", nullable: false),
                    InvigilatorId = table.Column<int>(type: "int", nullable: false),
                    HallNumber = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssignedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvigilatorAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvigilatorAssignments_ExamSchedules_ExamScheduleId",
                        column: x => x.ExamScheduleId,
                        principalTable: "ExamSchedules",
                        principalColumn: "ExamScheduleId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InvigilatorAssignments_Users_InvigilatorId",
                        column: x => x.InvigilatorId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Revaluations",
                columns: table => new
                {
                    RevaluationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ResultId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    OldMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    NewMarks = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    FeePaid = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    RequestedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ReviewedBy = table.Column<int>(type: "int", nullable: true),
                    ReviewedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Revaluations", x => x.RevaluationId);
                    table.ForeignKey(
                        name: "FK_Revaluations_Results_ResultId",
                        column: x => x.ResultId,
                        principalTable: "Results",
                        principalColumn: "ResultId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Revaluations_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "StudentId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Timetables",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    PeriodId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    FacultyId = table.Column<int>(type: "int", nullable: false),
                    RoomId = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ApprovalStatus = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Timetables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Timetables_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Faculties_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "Faculties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "PeriodId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "RoomId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Timetables_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Students_AcademicLevelId",
                table: "Students",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_AcademicYearId",
                table: "Students",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_GroupId",
                table: "Students",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Sections_AcademicYearId",
                table: "Sections",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Sections_RoomId",
                table: "Sections",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_AcademicLevelId",
                table: "Groups",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_BoardId",
                table: "Groups",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_BoardId_AcademicYearId_AcademicLevelId_IsActive",
                table: "Groups",
                columns: new[] { "BoardId", "AcademicYearId", "AcademicLevelId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "UX_Attendances_Student_Session",
                table: "attendances",
                columns: new[] { "StudentId", "AttendanceSessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FacultySubjectAllocations_SubjectId",
                table: "FacultySubjectAllocations",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_AcademicYearId",
                table: "Assignments",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_FacultyId",
                table: "Assignments",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_GroupId",
                table: "Assignments",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_SubjectId",
                table: "Assignments",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentSubmissions_AssignmentId",
                table: "AssignmentSubmissions",
                column: "AssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_AcademicLevelId",
                table: "attendance_sessions",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_AcademicYearId",
                table: "attendance_sessions",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_BoardId",
                table: "attendance_sessions",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_GroupId",
                table: "attendance_sessions",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_LockedBy",
                table: "attendance_sessions",
                column: "LockedBy");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_SectionId",
                table: "attendance_sessions",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_sessions_SubjectId",
                table: "attendance_sessions",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityName_EntityId",
                table: "AuditLogs",
                columns: new[] { "EntityName", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_BreakTypes_Name",
                table: "BreakTypes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_CertificateNumber",
                table: "Certificates",
                column: "CertificateNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_Status",
                table: "Certificates",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_StudentId",
                table: "Certificates",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_AcademicLevelId",
                table: "Examinations",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_AcademicYearId",
                table: "Examinations",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_AssessmentTypeId",
                table: "Examinations",
                column: "AssessmentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_BoardId",
                table: "Examinations",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_GroupId",
                table: "Examinations",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSchedules_ExaminationId",
                table: "ExamSchedules",
                column: "ExaminationId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSchedules_SubjectId",
                table: "ExamSchedules",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructureItems_FeeStructureId_FeeTypeId",
                table: "FeeStructureItems",
                columns: new[] { "FeeStructureId", "FeeTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructureItems_FeeTypeId",
                table: "FeeStructureItems",
                column: "FeeTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_AcademicLevelId",
                table: "FeeStructures",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_AcademicYearId",
                table: "FeeStructures",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_BoardId_AcademicYearId_AcademicLevelId_GroupId",
                table: "FeeStructures",
                columns: new[] { "BoardId", "AcademicYearId", "AcademicLevelId", "GroupId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_GroupId",
                table: "FeeStructures",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeTypes_FeeTypeCode",
                table: "FeeTypes",
                column: "FeeTypeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeeTypes_FeeTypeName",
                table: "FeeTypes",
                column: "FeeTypeName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HallTickets_ExaminationId",
                table: "HallTickets",
                column: "ExaminationId");

            migrationBuilder.CreateIndex(
                name: "IX_HallTickets_StudentId",
                table: "HallTickets",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_InvigilatorAssignments_ExamScheduleId",
                table: "InvigilatorAssignments",
                column: "ExamScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_InvigilatorAssignments_InvigilatorId",
                table: "InvigilatorAssignments",
                column: "InvigilatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_AcademicLevelId",
                table: "Marks",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_AcademicYearId",
                table: "Marks",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_BoardId",
                table: "Marks",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_ExaminationId",
                table: "Marks",
                column: "ExaminationId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_FacultyId",
                table: "Marks",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_GroupId",
                table: "Marks",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_SectionId",
                table: "Marks",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_StudentId",
                table: "Marks",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_Marks_SubjectId",
                table: "Marks",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Periods_PeriodStructureId",
                table: "Periods",
                column: "PeriodStructureId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_AcademicLevelId",
                table: "PeriodStructureAssignments",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_AcademicYearId",
                table: "PeriodStructureAssignments",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_BoardId",
                table: "PeriodStructureAssignments",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_GroupId",
                table: "PeriodStructureAssignments",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_PeriodStructureId",
                table: "PeriodStructureAssignments",
                column: "PeriodStructureId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureItems_BreakTypeId",
                table: "PeriodStructureItems",
                column: "BreakTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureItems_PeriodStructureId",
                table: "PeriodStructureItems",
                column: "PeriodStructureId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_AcademicLevelId",
                table: "Results",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_AcademicYearId",
                table: "Results",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_BoardId",
                table: "Results",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_ExamId",
                table: "Results",
                column: "ExamId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_GroupId",
                table: "Results",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_StudentId",
                table: "Results",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_SubjectId",
                table: "Results",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Revaluations_ResultId",
                table: "Revaluations",
                column: "ResultId");

            migrationBuilder.CreateIndex(
                name: "IX_Revaluations_StudentId",
                table: "Revaluations",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_AcademicLevelId",
                table: "StudentAdmissions",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_AcademicYearId",
                table: "StudentAdmissions",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_BoardId",
                table: "StudentAdmissions",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_GroupId",
                table: "StudentAdmissions",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_SectionId",
                table: "StudentAdmissions",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_AcademicLevelId",
                table: "Timetables",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_AcademicYearId",
                table: "Timetables",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_BoardId",
                table: "Timetables",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_FacultyId",
                table: "Timetables",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_GroupId",
                table: "Timetables",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_PeriodId",
                table: "Timetables",
                column: "PeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_RoomId",
                table: "Timetables",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_SectionId",
                table: "Timetables",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_SubjectId",
                table: "Timetables",
                column: "SubjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_Students_StudentId",
                table: "attendances",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "StudentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_attendance_sessions_AttendanceSessionId",
                table: "attendances",
                column: "AttendanceSessionId",
                principalTable: "attendance_sessions",
                principalColumn: "AttendanceSessionId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FacultySubjectAllocations_Faculties_FacultyId",
                table: "FacultySubjectAllocations",
                column: "FacultyId",
                principalTable: "Faculties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FacultySubjectAllocations_Subjects_SubjectId",
                table: "FacultySubjectAllocations",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "SubjectId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Groups_AcademicLevels_AcademicLevelId",
                table: "Groups",
                column: "AcademicLevelId",
                principalTable: "AcademicLevels",
                principalColumn: "AcademicLevelId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Groups_AcademicYears_AcademicYearId",
                table: "Groups",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "AcademicYearId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Groups_Boards_BoardId",
                table: "Groups",
                column: "BoardId",
                principalTable: "Boards",
                principalColumn: "BoardId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sections_Rooms_RoomId",
                table: "Sections",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "RoomId");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_AcademicLevels_AcademicLevelId",
                table: "Students",
                column: "AcademicLevelId",
                principalTable: "AcademicLevels",
                principalColumn: "AcademicLevelId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_attendances_Students_StudentId",
                table: "attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_attendances_attendance_sessions_AttendanceSessionId",
                table: "attendances");

            migrationBuilder.DropForeignKey(
                name: "FK_FacultySubjectAllocations_Faculties_FacultyId",
                table: "FacultySubjectAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_FacultySubjectAllocations_Subjects_SubjectId",
                table: "FacultySubjectAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_Groups_AcademicLevels_AcademicLevelId",
                table: "Groups");

            migrationBuilder.DropForeignKey(
                name: "FK_Groups_AcademicYears_AcademicYearId",
                table: "Groups");

            migrationBuilder.DropForeignKey(
                name: "FK_Groups_Boards_BoardId",
                table: "Groups");

            migrationBuilder.DropForeignKey(
                name: "FK_Sections_Rooms_RoomId",
                table: "Sections");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_AcademicLevels_AcademicLevelId",
                table: "Students");

            migrationBuilder.DropTable(
                name: "admins");

            migrationBuilder.DropTable(
                name: "AssignmentSubmissions");

            migrationBuilder.DropTable(
                name: "attendance_sessions");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "Certificates");

            migrationBuilder.DropTable(
                name: "Departments");

            migrationBuilder.DropTable(
                name: "FeeStructureItems");

            migrationBuilder.DropTable(
                name: "HallTickets");

            migrationBuilder.DropTable(
                name: "InvigilatorAssignments");

            migrationBuilder.DropTable(
                name: "Marks");

            migrationBuilder.DropTable(
                name: "PeriodStructureAssignments");

            migrationBuilder.DropTable(
                name: "PeriodStructureItems");

            migrationBuilder.DropTable(
                name: "Revaluations");

            migrationBuilder.DropTable(
                name: "StudentAdmissions");

            migrationBuilder.DropTable(
                name: "StudentFees");

            migrationBuilder.DropTable(
                name: "StudyMaterials");

            migrationBuilder.DropTable(
                name: "Timetables");

            migrationBuilder.DropTable(
                name: "Assignments");

            migrationBuilder.DropTable(
                name: "FeeStructures");

            migrationBuilder.DropTable(
                name: "FeeTypes");

            migrationBuilder.DropTable(
                name: "ExamSchedules");

            migrationBuilder.DropTable(
                name: "BreakTypes");

            migrationBuilder.DropTable(
                name: "Results");

            migrationBuilder.DropTable(
                name: "Periods");

            migrationBuilder.DropTable(
                name: "Rooms");

            migrationBuilder.DropTable(
                name: "Examinations");

            migrationBuilder.DropTable(
                name: "PeriodStructures");

            migrationBuilder.DropIndex(
                name: "IX_Students_AcademicLevelId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Students_AcademicYearId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Students_GroupId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Sections_AcademicYearId",
                table: "Sections");

            migrationBuilder.DropIndex(
                name: "IX_Sections_RoomId",
                table: "Sections");

            migrationBuilder.DropIndex(
                name: "IX_Groups_AcademicLevelId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_BoardId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_BoardId_AcademicYearId_AcademicLevelId_IsActive",
                table: "Groups");

            migrationBuilder.DropPrimaryKey(
                name: "PK_attendances",
                table: "attendances");

            migrationBuilder.DropIndex(
                name: "UX_Attendances_Student_Session",
                table: "attendances");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FacultySubjectAllocations",
                table: "FacultySubjectAllocations");

            migrationBuilder.DropIndex(
                name: "IX_FacultySubjectAllocations_SubjectId",
                table: "FacultySubjectAllocations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Faculties",
                table: "Faculties");

            migrationBuilder.DropColumn(
                name: "AadhaarDocument",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AcademicLevelId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AdmissionQuota",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AnnualIncome",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BirthCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CasteCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CommunityCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "District",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherOccupation",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "GuardianEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IncomeCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MarksMemo",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherOccupation",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Pincode",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PreviousBoard",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PreviousHallTicketNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PreviousPercentage",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Religion",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "SecondLanguage",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "StudyCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TenthCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TransferCertificate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "Sections");

            migrationBuilder.DropColumn(
                name: "AcademicLevelId",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "FacultySubjectAllocations");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Faculties");

            migrationBuilder.DropColumn(
                name: "FacultyType",
                table: "Faculties");

            migrationBuilder.RenameTable(
                name: "attendances",
                newName: "Attendances");

            migrationBuilder.RenameTable(
                name: "FacultySubjectAllocations",
                newName: "FacultySubjectAllocation");

            migrationBuilder.RenameTable(
                name: "Faculties",
                newName: "Faculty");

            migrationBuilder.RenameColumn(
                name: "PreviousYearOfPassing",
                table: "Students",
                newName: "AdmissionId");

            migrationBuilder.RenameColumn(
                name: "AttendanceSessionId",
                table: "Attendances",
                newName: "SubjectId");

            migrationBuilder.RenameIndex(
                name: "IX_attendances_AttendanceSessionId",
                table: "Attendances",
                newName: "IX_Attendances_SubjectId");

            migrationBuilder.RenameIndex(
                name: "IX_FacultySubjectAllocations_FacultyId",
                table: "FacultySubjectAllocation",
                newName: "IX_FacultySubjectAllocation_FacultyId");

            migrationBuilder.AlterColumn<int>(
                name: "SectionId",
                table: "Students",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "ScholarshipAmount",
                table: "Students",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "RollNo",
                table: "Students",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "Students",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(1000)",
                oldMaxLength: 1000,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "Students",
                keyColumn: "MobileNumber",
                keyValue: null,
                column: "MobileNumber",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "MobileNumber",
                table: "Students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "Students",
                keyColumn: "Email",
                keyValue: null,
                column: "Email",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Students",
                type: "varchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(150)",
                oldMaxLength: 150,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "DateOfBirth",
                table: "Students",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)");

            migrationBuilder.AlterColumn<int>(
                name: "BoardId",
                table: "Students",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "AdmissionNo",
                table: "Students",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "AdmissionDate",
                table: "Students",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)");

            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "Students",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Board",
                table: "Students",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Students",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "Groups",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Board",
                table: "Groups",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<sbyte>(
                name: "RankCalculation",
                table: "Boards",
                type: "tinyint(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)");

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "AttendanceDate",
                table: "Attendances",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FacultyId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "GroupId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SectionId",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "FacultySubjectAllocation",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AcademicYear",
                table: "FacultySubjectAllocation",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Board",
                table: "FacultySubjectAllocation",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Group",
                table: "FacultySubjectAllocation",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "FacultySubjectAllocation",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Subject",
                table: "FacultySubjectAllocation",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Faculty",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Password",
                table: "Faculty",
                type: "varchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "Faculty",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Attendances",
                table: "Attendances",
                column: "AttendanceId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FacultySubjectAllocation",
                table: "FacultySubjectAllocation",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Faculty",
                table: "Faculty",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Students_AdmissionId",
                table: "Students",
                column: "AdmissionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Groups_Board",
                table: "Groups",
                column: "Board");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_Board_AcademicYearId_IsActive",
                table: "Groups",
                columns: new[] { "Board", "AcademicYearId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_AcademicLevelId",
                table: "Attendances",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_AcademicYearId",
                table: "Attendances",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_AttendanceDate",
                table: "Attendances",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_BoardId",
                table: "Attendances",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_FacultyId",
                table: "Attendances",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_GroupId",
                table: "Attendances",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_SectionId",
                table: "Attendances",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_StudentId_SubjectId_AttendanceDate",
                table: "Attendances",
                columns: new[] { "StudentId", "SubjectId", "AttendanceDate" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_AcademicLevels_AcademicLevelId",
                table: "Attendances",
                column: "AcademicLevelId",
                principalTable: "AcademicLevels",
                principalColumn: "AcademicLevelId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_AcademicYears_AcademicYearId",
                table: "Attendances",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "AcademicYearId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Boards_BoardId",
                table: "Attendances",
                column: "BoardId",
                principalTable: "Boards",
                principalColumn: "BoardId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Faculty_FacultyId",
                table: "Attendances",
                column: "FacultyId",
                principalTable: "Faculty",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Groups_GroupId",
                table: "Attendances",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "GroupId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Sections_SectionId",
                table: "Attendances",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "SectionId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Students_StudentId",
                table: "Attendances",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "StudentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendances_Subjects_SubjectId",
                table: "Attendances",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "SubjectId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FacultySubjectAllocation_Faculty_FacultyId",
                table: "FacultySubjectAllocation",
                column: "FacultyId",
                principalTable: "Faculty",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
