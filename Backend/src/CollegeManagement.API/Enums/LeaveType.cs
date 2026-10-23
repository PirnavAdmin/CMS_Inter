namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the type of leave being requested.
    /// </summary>
    public enum LeaveType : byte
    {
        /// <summary>
        /// Casual leave for personal reasons.
        /// </summary>
        Casual = 1,

        /// <summary>
        /// Sick leave due to health reasons.
        /// </summary>
        Sick = 2,

        /// <summary>
        /// Earned leave (accumulated privilege leave).
        /// </summary>
        Earned = 3,

        /// <summary>
        /// Maternity leave.
        /// </summary>
        Maternity = 4,

        /// <summary>
        /// Other types of leave not covered above.
        /// </summary>
        Other = 5
    }
}
