using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusIdToTimetable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "certificates");

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "TransportVehicles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "TransportRoutes",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "MobileNo",
                table: "TransportDrivers",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNo",
                table: "TransportDrivers",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Timetables",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "templates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AdmittedById",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Students",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AdmittedById",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "StudentAdmissions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "StaffAttendanceSessions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Staff",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DrivingExperienceYears",
                table: "Staff",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DrivingLicenseExpiryDate",
                table: "Staff",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DrivingLicenseNumber",
                table: "Staff",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsDriver",
                table: "Staff",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Sections",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Roles",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Roles",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Roles",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemRole",
                table: "Roles",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Roles",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Results",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "PeriodStructures",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "PeriodStructureAssignments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Periods",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "NumberSeriesConfigurations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Marks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Holidays",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "FeeStructures",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Faculties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Examinations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Designations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "Departments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "certificates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "AttendanceSessions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "AcademicYears",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Campuses",
                columns: table => new
                {
                    CampusId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CampusName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CampusCode = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContactPhone = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsHQ = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Campuses", x => x.CampusId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "FineRules",
                columns: table => new
                {
                    FineRuleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FineRuleName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ApplicableFeeId = table.Column<int>(type: "int", nullable: false),
                    FineType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FineAmount = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    GracePeriod = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FineRules", x => x.FineRuleId);
                    table.ForeignKey(
                        name: "FK_FineRules_FeeTypes_ApplicableFeeId",
                        column: x => x.ApplicableFeeId,
                        principalTable: "FeeTypes",
                        principalColumn: "FeeTypeId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    PermissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Module = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SubModule = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Action = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PermissionCode = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DisplayName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CategoryLabel = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.PermissionId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CampusBoards",
                columns: table => new
                {
                    CampusBoardId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CampusId = table.Column<int>(type: "int", nullable: false),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampusBoards", x => x.CampusBoardId);
                    table.ForeignKey(
                        name: "FK_CampusBoards_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampusBoards_Campuses_CampusId",
                        column: x => x.CampusId,
                        principalTable: "Campuses",
                        principalColumn: "CampusId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    RolePermissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    PermissionId = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.RolePermissionId);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "PermissionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UserPermissions",
                columns: table => new
                {
                    UserPermissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PermissionId = table.Column<int>(type: "int", nullable: false),
                    IsGranted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    AssignedByUserId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPermissions", x => x.UserPermissionId);
                    table.ForeignKey(
                        name: "FK_UserPermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "PermissionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPermissions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Timetables_CampusId",
                table: "Timetables",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_templates_CampusId",
                table: "templates",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_CampusId",
                table: "Students",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAdmissions_CampusId",
                table: "StudentAdmissions",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffAttendanceSessions_CampusId",
                table: "StaffAttendanceSessions",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Staff_CampusId",
                table: "Staff",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Results_CampusId",
                table: "Results",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructures_CampusId",
                table: "PeriodStructures",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_PeriodStructureAssignments_CampusId",
                table: "PeriodStructureAssignments",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Periods_CampusId",
                table: "Periods",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_CampusId",
                table: "FeeStructures",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Designations_CampusId",
                table: "Designations",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_CampusId",
                table: "Departments",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_certificates_CampusId",
                table: "certificates",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_CampusBoards_BoardId",
                table: "CampusBoards",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_CampusBoards_CampusId",
                table: "CampusBoards",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_FineRules_ApplicableFeeId",
                table: "FineRules",
                column: "ApplicableFeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_PermissionCode",
                table: "Permissions",
                column: "PermissionCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_SubModule_Action",
                table: "Permissions",
                columns: new[] { "SubModule", "Action" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissions_PermissionId",
                table: "UserPermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissions_UserId_PermissionId",
                table: "UserPermissions",
                columns: new[] { "UserId", "PermissionId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_certificates_Campuses_CampusId",
                table: "certificates",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_Campuses_CampusId",
                table: "Departments",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Designations_Campuses_CampusId",
                table: "Designations",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructures_Campuses_CampusId",
                table: "FeeStructures",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Periods_Campuses_CampusId",
                table: "Periods",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_PeriodStructureAssignments_Campuses_CampusId",
                table: "PeriodStructureAssignments",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_PeriodStructures_Campuses_CampusId",
                table: "PeriodStructures",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Results_Campuses_CampusId",
                table: "Results",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Staff_Campuses_CampusId",
                table: "Staff",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_StaffAttendanceSessions_Campuses_CampusId",
                table: "StaffAttendanceSessions",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_StudentAdmissions_Campuses_CampusId",
                table: "StudentAdmissions",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Campuses_CampusId",
                table: "Students",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_templates_Campuses_CampusId",
                table: "templates",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Timetables_Campuses_CampusId",
                table: "Timetables",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "CampusId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_certificates_Campuses_CampusId",
                table: "certificates");

            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Campuses_CampusId",
                table: "Departments");

            migrationBuilder.DropForeignKey(
                name: "FK_Designations_Campuses_CampusId",
                table: "Designations");

            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructures_Campuses_CampusId",
                table: "FeeStructures");

            migrationBuilder.DropForeignKey(
                name: "FK_Periods_Campuses_CampusId",
                table: "Periods");

            migrationBuilder.DropForeignKey(
                name: "FK_PeriodStructureAssignments_Campuses_CampusId",
                table: "PeriodStructureAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_PeriodStructures_Campuses_CampusId",
                table: "PeriodStructures");

            migrationBuilder.DropForeignKey(
                name: "FK_Results_Campuses_CampusId",
                table: "Results");

            migrationBuilder.DropForeignKey(
                name: "FK_Staff_Campuses_CampusId",
                table: "Staff");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffAttendanceSessions_Campuses_CampusId",
                table: "StaffAttendanceSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentAdmissions_Campuses_CampusId",
                table: "StudentAdmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Campuses_CampusId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_templates_Campuses_CampusId",
                table: "templates");

            migrationBuilder.DropForeignKey(
                name: "FK_Timetables_Campuses_CampusId",
                table: "Timetables");

            migrationBuilder.DropTable(
                name: "CampusBoards");

            migrationBuilder.DropTable(
                name: "FineRules");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "UserPermissions");

            migrationBuilder.DropTable(
                name: "Campuses");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropIndex(
                name: "IX_Timetables_CampusId",
                table: "Timetables");

            migrationBuilder.DropIndex(
                name: "IX_templates_CampusId",
                table: "templates");

            migrationBuilder.DropIndex(
                name: "IX_Students_CampusId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_StudentAdmissions_CampusId",
                table: "StudentAdmissions");

            migrationBuilder.DropIndex(
                name: "IX_StaffAttendanceSessions_CampusId",
                table: "StaffAttendanceSessions");

            migrationBuilder.DropIndex(
                name: "IX_Staff_CampusId",
                table: "Staff");

            migrationBuilder.DropIndex(
                name: "IX_Results_CampusId",
                table: "Results");

            migrationBuilder.DropIndex(
                name: "IX_PeriodStructures_CampusId",
                table: "PeriodStructures");

            migrationBuilder.DropIndex(
                name: "IX_PeriodStructureAssignments_CampusId",
                table: "PeriodStructureAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Periods_CampusId",
                table: "Periods");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructures_CampusId",
                table: "FeeStructures");

            migrationBuilder.DropIndex(
                name: "IX_Designations_CampusId",
                table: "Designations");

            migrationBuilder.DropIndex(
                name: "IX_Departments_CampusId",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_certificates_CampusId",
                table: "certificates");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "TransportVehicles");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "TransportRoutes");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Timetables");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "templates");

            migrationBuilder.DropColumn(
                name: "AdmittedById",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AdmittedById",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "StudentAdmissions");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "StaffAttendanceSessions");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "DrivingExperienceYears",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "DrivingLicenseExpiryDate",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "DrivingLicenseNumber",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "IsDriver",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Sections");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "IsSystemRole",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "PeriodStructures");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "PeriodStructureAssignments");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Periods");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "NumberSeriesConfigurations");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Marks");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Holidays");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "FeeStructures");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Faculties");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Designations");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "certificates");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "AcademicYears");

            migrationBuilder.UpdateData(
                table: "TransportDrivers",
                keyColumn: "MobileNo",
                keyValue: null,
                column: "MobileNo",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "MobileNo",
                table: "TransportDrivers",
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
                table: "TransportDrivers",
                keyColumn: "LicenseNo",
                keyValue: null,
                column: "LicenseNo",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNo",
                table: "TransportDrivers",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "certificates",
                type: "tinyint(1)",
                nullable: true);
        }
    }
}
