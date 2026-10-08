using System.Linq;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CollegeManagement.API.Filters
{
    public class GlobalIsolationFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            // 1. CampusId Integration
            if (context.ActionArguments.ContainsKey("campusId") && context.ActionArguments["campusId"] == null)
            {
                if (context.HttpContext.Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && int.TryParse(headerVal, out int id))
                {
                    context.ActionArguments["campusId"] = id;
                }
            }

            // 2. BoardId Integration
            if (context.ActionArguments.ContainsKey("boardId") && context.ActionArguments["boardId"] == null)
            {
                if (context.HttpContext.Request.Headers.TryGetValue("X-Board-Id", out var headerVal) && int.TryParse(headerVal, out int id))
                {
                    context.ActionArguments["boardId"] = id;
                }
            }

            // 3. AcademicYearId Integration
            if (context.ActionArguments.ContainsKey("academicYearId") && context.ActionArguments["academicYearId"] == null)
            {
                if (context.HttpContext.Request.Headers.TryGetValue("X-AcademicYear-Id", out var headerVal) && int.TryParse(headerVal, out int id))
                {
                    context.ActionArguments["academicYearId"] = id;
                }
                else if (context.HttpContext.Request.Headers.TryGetValue("X-Academic-Year-Id", out var headerVal2) && int.TryParse(headerVal2, out int id2))
                {
                    context.ActionArguments["academicYearId"] = id2;
                }
            }
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            // No action needed after execution
        }
    }
}
