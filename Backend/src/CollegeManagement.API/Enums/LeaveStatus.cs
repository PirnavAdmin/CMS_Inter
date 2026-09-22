namespace CollegeManagement.API.Enums
{
    /// <summary>
    /// Specifies the approval status of a leave request.
    /// </summary>
    public enum LeaveStatus : byte
    {
        /// <summary>
        /// Leave request is pending review.
        /// </summary>
        Pending = 1,

        /// <summary>
        /// Leave request has been approved.
        /// </summary>
        Approved = 2,

        /// <summary>
        /// Leave request has been rejected.
        /// </summary>
        Rejected = 3
    }
}
