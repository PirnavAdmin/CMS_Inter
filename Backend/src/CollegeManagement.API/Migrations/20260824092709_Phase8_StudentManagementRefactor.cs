using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class Phase8_StudentManagementRefactor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.RenameColumn(
                name: "ClassTeacherId",
                table: "Sections",
                newName: "InchargeId");

            migrationBuilder.RenameColumn(
                name: "BuildingName",
                table: "Rooms",
                newName: "RoomName");

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelNavigationAcademicLevelId",
                table: "Subjects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Programme",
                table: "Sections",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Floor",
                table: "Rooms",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BlockName",
                table: "Rooms",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "RoomCode",
                table: "Rooms",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "AdmissionStartDate",
                table: "AcademicYears",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "AdmissionEndDate",
                table: "AcademicYears",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "AcademicYears",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Programs",
                columns: table => new
                {
                    ProgramId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ProgramName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Programs", x => x.ProgramId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "GroupPrograms",
                columns: table => new
                {
                    GroupProgramId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupPrograms", x => x.GroupProgramId);
                    table.ForeignKey(
                        name: "FK_GroupPrograms_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GroupPrograms_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "Programs",
                        principalColumn: "ProgramId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_AcademicLevelNavigationAcademicLevelId",
                table: "Subjects",
                column: "AcademicLevelNavigationAcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_SubjectCode",
                table: "Subjects",
                column: "SubjectCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroupPrograms_GroupId_ProgramId",
                table: "GroupPrograms",
                columns: new[] { "GroupId", "ProgramId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroupPrograms_ProgramId",
                table: "GroupPrograms",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Programs_ProgramName",
                table: "Programs",
                column: "ProgramName",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AcademicLevels_AcademicLevelNavigationAcademicLevel~",
                table: "Subjects",
                column: "AcademicLevelNavigationAcademicLevelId",
                principalTable: "AcademicLevels",
                principalColumn: "AcademicLevelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AcademicLevels_AcademicLevelNavigationAcademicLevel~",
                table: "Subjects");

            migrationBuilder.DropTable(
                name: "GroupPrograms");

            migrationBuilder.DropTable(
                name: "Programs");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_AcademicLevelNavigationAcademicLevelId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_SubjectCode",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "AcademicLevelNavigationAcademicLevelId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Programme",
                table: "Sections");

            migrationBuilder.DropColumn(
                name: "BlockName",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "RoomCode",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "AcademicYears");

            migrationBuilder.RenameColumn(
                name: "InchargeId",
                table: "Sections",
                newName: "ClassTeacherId");

            migrationBuilder.RenameColumn(
                name: "RoomName",
                table: "Rooms",
                newName: "BuildingName");

            migrationBuilder.AddColumn<int>(
                name: "AcademicLevelId",
                table: "Subjects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "Floor",
                table: "Rooms",
                type: "int",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "AdmissionStartDate",
                table: "AcademicYears",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "AdmissionEndDate",
                table: "AcademicYears",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

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
    }
}
