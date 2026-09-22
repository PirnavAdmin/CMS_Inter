using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class Phase2AttendanceCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "Session",
                table: "Attendances",
                type: "tinyint unsigned",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModifiedByUserId",
                table: "Attendances",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedAt",
                table: "Attendances",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StaffLeaveRequests",
                columns: table => new
                {
                    StaffLeaveRequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", Microsoft.EntityFrameworkCore.Metadata.MySqlValueGenerationStrategy.IdentityColumn),
                    FacultyId = table.Column<int>(type: "int", nullable: false),
                    LeaveType = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    StartDate = table.Column<DateTime>(type: "date", nullable: false),
                    EndDate = table.Column<DateTime>(type: "date", nullable: false),
                    Reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    AcademicYearId = table.Column<int>(type: "int", nullable: true),
                    ApprovedByUserId = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RejectionReason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffLeaveRequests", x => x.StaffLeaveRequestId);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_Staff_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AttendanceAuditHistory",
                columns: table => new
                {
                    AuditId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", Microsoft.EntityFrameworkCore.Metadata.MySqlValueGenerationStrategy.IdentityColumn),
                    EntityType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: true),
                    FacultyId = table.Column<int>(type: "int", nullable: true),
                    AttendanceDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    OldStatus = table.Column<byte>(type: "tinyint unsigned", nullable: true),
                    NewStatus = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    Action = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ModifiedByUserId = table.Column<int>(type: "int", nullable: true),
                    ModifiedByUserName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IpAddress = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceAuditHistory", x => x.AuditId);
                    table.ForeignKey(
                        name: "FK_AttendanceAuditHistory_Users_ModifiedByUserId",
                        column: x => x.ModifiedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceAuditHistory_AttendanceDate",
                table: "AttendanceAuditHistory",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceAuditHistory_EntityType_EntityId",
                table: "AttendanceAuditHistory",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceAuditHistory_FacultyId",
                table: "AttendanceAuditHistory",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceAuditHistory_ModifiedByUserId",
                table: "AttendanceAuditHistory",
                column: "ModifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceAuditHistory_StudentId",
                table: "AttendanceAuditHistory",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_AcademicYearId",
                table: "StaffLeaveRequests",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_DepartmentId",
                table: "StaffLeaveRequests",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_Faculty_DateRange",
                table: "StaffLeaveRequests",
                columns: new[] { "FacultyId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_FacultyId",
                table: "StaffLeaveRequests",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_Status",
                table: "StaffLeaveRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttendanceAuditHistory");

            migrationBuilder.DropTable(
                name: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "ModifiedAt",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "ModifiedByUserId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "Session",
                table: "Attendances");
        }
    }
}
