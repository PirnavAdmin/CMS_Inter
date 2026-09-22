using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddIsActiveColumnToStudents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
           
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
           // migrationBuilder.Sql(@"
              //  ALTER TABLE Students
             //   DROP COLUMN IsActive;
            //");
        }
    }
}