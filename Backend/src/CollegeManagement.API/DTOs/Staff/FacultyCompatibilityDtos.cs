using System;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.DTOs.Faculty
{
    // Backward compatibility shim for un-migrated modules (e.g. Assignments)
    public class FacultyDropdownDto : StaffDropdownDto
    {
    }
}
