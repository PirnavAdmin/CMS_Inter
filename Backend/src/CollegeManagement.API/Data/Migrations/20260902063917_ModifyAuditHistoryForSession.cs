using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class ModifyAuditHistoryForSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte>(
                name: "NewStatus",
                table: "AttendanceAuditHistory",
                type: "tinyint unsigned",
                nullable: true,
                oldClrType: typeof(byte),
                oldType: "tinyint unsigned");

            migrationBuilder.AddColumn<byte>(
                name: "Session",
                table: "AttendanceAuditHistory",
                type: "tinyint unsigned",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Session",
                table: "AttendanceAuditHistory");

            migrationBuilder.AlterColumn<byte>(
                name: "NewStatus",
                table: "AttendanceAuditHistory",
                type: "tinyint unsigned",
                nullable: false,
                defaultValue: (byte)0,
                oldClrType: typeof(byte),
                oldType: "tinyint unsigned",
                oldNullable: true);
        }
    }
}
