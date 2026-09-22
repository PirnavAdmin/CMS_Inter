namespace CollegeManagement.API.DTOs.Board.Requests
   {
       public class BoardSearchRequest
       {
           public string? BoardName { get; set; }

           public string? BoardCode { get; set; }

           public int? CountryId { get; set; }

           public int? StateId { get; set; }

           public bool? Status { get; set; }

           public string? Search { get; set; }

           public int PageNumber { get; set; } = 1;

           public int PageSize { get; set; } = 10;

           public string? SortBy { get; set; } = "BoardName";

           public string? SortOrder { get; set; } = "ASC";
       }
   }
