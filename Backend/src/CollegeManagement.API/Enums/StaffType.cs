namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the staff classification type (Teaching vs Non-Teaching).
    /// </summary>
    public enum StaffType : byte
    {
        /// <summary>
        /// Academic teaching staff (Lecturers, Professors, HODs).
        /// </summary>
        Teaching = 1,

        /// <summary>
        /// Administrative, accounts, library, and support non-teaching staff.
        /// </summary>
        NonTeaching = 2
    }
}
