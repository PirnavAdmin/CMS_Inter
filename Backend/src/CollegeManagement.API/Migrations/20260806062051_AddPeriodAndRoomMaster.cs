using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <summary>
    /// Legacy migration retained for migration-history compatibility.
    /// Periods, Rooms and Timetables are created safely by
    /// 20260807100000_SyncAllMissingTables / 20260807110000_AddTimetableTables
    /// using CREATE TABLE IF NOT EXISTS logic.
    ///
    /// The original version attempted to CREATE TABLE Periods directly and
    /// failed on databases where the table already existed but the migration
    /// history did not contain this migration.
    /// </summary>
    public partial class AddPeriodAndRoomMaster : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty.
            // The later SyncAllMissingTables migration creates these objects
            // with idempotent SQL, so this legacy migration must not recreate them.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty.
            // Do not drop Periods/Rooms/Timetables from a database that may
            // have been created by the idempotent sync migration.
        }
    }
}
