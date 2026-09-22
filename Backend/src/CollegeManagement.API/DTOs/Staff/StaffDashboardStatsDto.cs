using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffDashboardStatsDto
    {
        public int TotalStaff { get; set; }
        public int TotalCount
        {
            get => TotalStaff;
            set => TotalStaff = value;
        }
        public int TeachingStaff { get; set; }
        public int NonTeachingStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int InactiveStaff { get; set; }
        public int PendingProfileCompletion { get; set; }
        public int CompletedProfiles { get; set; }
        public int ProfileCompletedCount
        {
            get => CompletedProfiles > 0 ? CompletedProfiles : Completed;
            set => CompletedProfiles = value;
        }
        public int ProfilePendingCount
        {
            get => PendingProfileCompletion > 0 ? PendingProfileCompletion : Pending;
            set => PendingProfileCompletion = value;
        }
        public int LinkSentCount { get; set; }

        // Breakdown for Profile Completion Overview chart
        public int Completed { get; set; }
        public int Pending { get; set; }
        public int InProgress { get; set; }
        public int NeedsCorrection { get; set; }
        public int Submitted { get; set; }
    }
}
