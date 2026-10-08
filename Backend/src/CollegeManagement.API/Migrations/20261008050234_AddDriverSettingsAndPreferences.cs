using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverSettingsAndPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DriverPreferences",
                columns: table => new
                {
                    StaffId = table.Column<int>(type: "int", nullable: false),
                    EmailAttendanceAlerts = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    SmsUrgentAlerts = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TripReminders = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    AutoLogoutMinutes = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverPreferences", x => x.StaffId);
                    table.ForeignKey(
                        name: "FK_DriverPreferences_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverPreferences");
        }
    }
}
