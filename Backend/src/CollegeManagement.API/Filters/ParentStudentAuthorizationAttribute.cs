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
            
            // If the user is a Parent, perform the mapping check
            if (userRole == "Parent")
            {
                // Try to get the studentId from route data or query string
                if (context.ActionArguments.TryGetValue(_studentIdParamName, out var value) && value is int studentId)
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
                            new { ParentUserId = parentUserId, StudentId = studentId },
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

            // Proceed for non-parents, or if the parent is authorized
            await next();
        }
    }
}
