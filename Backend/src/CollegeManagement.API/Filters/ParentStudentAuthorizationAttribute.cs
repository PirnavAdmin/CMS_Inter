using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CollegeManagement.API.Data;

namespace CollegeManagement.API.Filters
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = true)]
    public class ParentStudentAuthorizationAttribute : Attribute, IAsyncActionFilter
    {
        private readonly string _studentIdParamName;

        public ParentStudentAuthorizationAttribute(string studentIdParamName = "studentId")
        {
            _studentIdParamName = studentIdParamName;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var userRole = context.HttpContext.User.FindFirstValue(ClaimTypes.Role);
            
            // Try to extract the requested studentId from action arguments, route data, or query string
            int? requestedStudentId = null;
            if (context.ActionArguments.TryGetValue(_studentIdParamName, out var value) && value is int sid)
            {
                requestedStudentId = sid;
            }
            else if (context.RouteData.Values.TryGetValue(_studentIdParamName, out var routeVal) && int.TryParse(routeVal?.ToString(), out int rSid))
            {
                requestedStudentId = rSid;
            }
            else if (context.HttpContext.Request.Query.TryGetValue(_studentIdParamName, out var qVal) && int.TryParse(qVal.ToString(), out int qSid))
            {
                requestedStudentId = qSid;
            }

            // If the user is a Student, perform student ownership check
            if (string.Equals(userRole, "Student", StringComparison.OrdinalIgnoreCase))
            {
                var studentIdClaim = context.HttpContext.User.FindFirst("StudentId")?.Value;
                if (!int.TryParse(studentIdClaim, out int loggedInStudentId) || loggedInStudentId <= 0)
                {
                    context.Result = new ForbidResult();
                    return;
                }

                if (requestedStudentId.HasValue && requestedStudentId.Value != loggedInStudentId)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }

            // If the user is a Parent, perform the mapping check
            if (string.Equals(userRole, "Parent", StringComparison.OrdinalIgnoreCase))
            {
                if (requestedStudentId.HasValue && requestedStudentId.Value > 0)
                {
                    var userIdStr = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (int.TryParse(userIdStr, out int parentUserId))
                    {
                        var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                        var connection = dbContext.Database.GetDbConnection();
                        
                        if (connection.State != System.Data.ConnectionState.Open)
                        {
                            await connection.OpenAsync();
                        }

                        // Using CALL syntax to prevent MySqlConnector SP parameter issues
                        var count = await Dapper.SqlMapper.ExecuteScalarAsync<int>(
                            connection,
                            "CALL sp_CheckParentStudentMapping(@ParentUserId, @StudentId);",
                            new { ParentUserId = parentUserId, StudentId = requestedStudentId.Value },
                            commandType: System.Data.CommandType.Text);

                        if (count == 0)
                        {
                            context.Result = new ForbidResult();
                            return; // Stop execution
                        }
                    }
                    else
                    {
                        context.Result = new UnauthorizedResult();
                        return;
                    }
                }
                else
                {
                    // For safety, if a parent hits an endpoint that requires student context but it's missing, forbid
                    context.Result = new ForbidResult();
                    return;
                }
            }

            // Proceed for other roles, or if authorized
            await next();
        }
    }
}
