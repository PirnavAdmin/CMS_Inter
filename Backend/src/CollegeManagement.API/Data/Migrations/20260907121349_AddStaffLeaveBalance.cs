using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Data.Migrations
{
    public partial class AddStaffLeaveBalance : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffLeaveBalances",
                columns: table => new
                {
                    LeaveBalanceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StaffId = table.Column<int>(type: "int", nullable: false),
                    LeaveType = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    TotalDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    UsedDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    RemainingDays = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffLeaveBalances", x => x.LeaveBalanceId);
                    table.ForeignKey(
                        name: "FK_StaffLeaveBalances_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffLeaveBalances_Staffs_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveBalances_AcademicYearId",
                table: "StaffLeaveBalances",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "UX_StaffLeaveBalances_Staff_LeaveType_AcademicYear",
                table: "StaffLeaveBalances",
                columns: new[] { "StaffId", "LeaveType", "AcademicYearId" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffLeaveBalances");
        }
    }
}
