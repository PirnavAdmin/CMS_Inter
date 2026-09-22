using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTimetableBackupSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TimetableBackups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    AcademicLevelId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ArchivedBy = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ArchiveReason = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimetableBackups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimetableBackups_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackups_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackups_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackups_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackups_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TimetableBackupSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TimetableBackupId = table.Column<int>(type: "int", nullable: false),
                    OriginalTimetableId = table.Column<int>(type: "int", nullable: true),
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
                    table.PrimaryKey("PK_TimetableBackupSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_AcademicLevels_AcademicLevelId",
                        column: x => x.AcademicLevelId,
                        principalTable: "AcademicLevels",
                        principalColumn: "AcademicLevelId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_AcademicYears_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYears",
                        principalColumn: "AcademicYearId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "BoardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Faculties_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "Faculties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "PeriodId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "RoomId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "SectionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimetableBackupSlots_TimetableBackups_TimetableBackupId",
                        column: x => x.TimetableBackupId,
                        principalTable: "TimetableBackups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackups_AcademicLevelId",
                table: "TimetableBackups",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackups_AcademicYearId",
                table: "TimetableBackups",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackups_BoardId_AcademicLevelId_AcademicYearId_Grou~",
                table: "TimetableBackups",
                columns: new[] { "BoardId", "AcademicLevelId", "AcademicYearId", "GroupId", "SectionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackups_GroupId",
                table: "TimetableBackups",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackups_SectionId",
                table: "TimetableBackups",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_AcademicLevelId",
                table: "TimetableBackupSlots",
                column: "AcademicLevelId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_AcademicYearId",
                table: "TimetableBackupSlots",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_BoardId",
                table: "TimetableBackupSlots",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_FacultyId",
                table: "TimetableBackupSlots",
                column: "FacultyId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_GroupId",
                table: "TimetableBackupSlots",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_PeriodId",
                table: "TimetableBackupSlots",
                column: "PeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_RoomId",
                table: "TimetableBackupSlots",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_SectionId",
                table: "TimetableBackupSlots",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_SubjectId",
                table: "TimetableBackupSlots",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableBackupSlots_TimetableBackupId",
                table: "TimetableBackupSlots",
                column: "TimetableBackupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TimetableBackupSlots");

            migrationBuilder.DropTable(
                name: "TimetableBackups");
        }
    }
}
