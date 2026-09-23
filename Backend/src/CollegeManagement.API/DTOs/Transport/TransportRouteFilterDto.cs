namespace CollegeManagement.API.Dtos.Transport
{
    public class TransportRouteFilterDto
    {
        private int _pageNumber = 1;
        private int _pageSize = 10;

        public string? Search { get; set; }

        public bool? Status { get; set; }

        public string? BusType { get; set; }

        public bool? IsAc { get; set; }

        public string SortBy { get; set; } = "createdAt";

        public string SortOrder { get; set; } = "desc";

        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        public int PageSize
        {
            get => _pageSize;
            set
            {
                if (value < 1)
                    _pageSize = 10;
                else if (value > 100)
                    _pageSize = 100;
                else
                    _pageSize = value;
            }
        }
    }
}
