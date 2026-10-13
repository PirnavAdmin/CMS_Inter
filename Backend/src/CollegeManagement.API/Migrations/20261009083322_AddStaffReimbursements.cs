using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffReimbursements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_DriverNotifications",
                table: "DriverNotifications");

            migrationBuilder.RenameTable(
                name: "DriverNotifications",
                newName: "TransportDriverNotifications");

            migrationBuilder.AddColumn<int>(
                name: "CampusId",
                table: "TransportDriverNotifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventKey",
                table: "TransportDriverNotifications",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsDelivered",
                table: "TransportDriverNotifications",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PayrollMonth",
                table: "TransportDriverNotifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PayrollYear",
                table: "TransportDriverNotifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PayslipId",
                table: "TransportDriverNotifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_TransportDriverNotifications",
                table: "TransportDriverNotifications",
                column: "NotificationId");

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

            migrationBuilder.CreateTable(
                name: "StaffReimbursements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ClaimNumber = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StaffId = table.Column<int>(type: "int", nullable: false),
                    ClaimCategory = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ClaimedAmount = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ApprovedAmount = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ProofDocumentPath = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SubmittedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AdminReviewedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AdminReviewedBy = table.Column<int>(type: "int", nullable: true),
                    AdminNotes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AccountantProcessedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AccountantProcessedBy = table.Column<int>(type: "int", nullable: true),
                    AccountantNotes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    PaymentReference = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CampusId = table.Column<int>(type: "int", nullable: true),
                    AcademicYear = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffReimbursements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffReimbursements_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_StaffReimbursements_StaffId",
                table: "StaffReimbursements",
                column: "StaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverPreferences");

            migrationBuilder.DropTable(
                name: "StaffReimbursements");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TransportDriverNotifications",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "EventKey",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "IsDelivered",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "PayrollMonth",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "PayrollYear",
                table: "TransportDriverNotifications");

            migrationBuilder.DropColumn(
                name: "PayslipId",
                table: "TransportDriverNotifications");

            migrationBuilder.RenameTable(
                name: "TransportDriverNotifications",
                newName: "DriverNotifications");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DriverNotifications",
                table: "DriverNotifications",
                column: "NotificationId");
        }
    }
}
