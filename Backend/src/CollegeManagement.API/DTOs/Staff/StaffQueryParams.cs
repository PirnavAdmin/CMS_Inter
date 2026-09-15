namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffQueryParams
    {
        private const int MaxPageSize = 10000;
        private int _pageSize = 10;
        private int _pageNumber = 1;

        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 10 : value);
        }

        public string? SearchTerm { get; set; }
        public string? Department { get; set; }
        public int? DepartmentId { get; set; }
        public string? Designation { get; set; }
        public int? DesignationId { get; set; }
        public int? BoardId { get; set; }
        public string? BoardName { get; set; }
        public string? Board
        {
            get => BoardName;
            set => BoardName = value;
        }
        public string? StaffType { get; set; }
        public string? FacultyType
        {
            get => StaffType;
            set => StaffType = value;
        }
        public string? Status { get; set; }
        public string? ProfileStatus { get; set; }
        public string? PendingSubTab { get; set; } // "LinkSent", "InProgress", "NeedsCorrection", "Submitted"
        public string? SortBy { get; set; } = "Id";
        public string? SortOrder { get; set; } = "DESC";
    }

    public class PagedResult<T>
    {
        public System.Collections.Generic.List<T> Items { get; set; } = new System.Collections.Generic.List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)System.Math.Ceiling((double)TotalCount / PageSize) : 0;
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;
    }
}
