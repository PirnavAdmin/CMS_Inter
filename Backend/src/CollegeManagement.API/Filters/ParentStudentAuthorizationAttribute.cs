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
                int? targetStudentId = null;
                if (context.ActionArguments.TryGetValue(_studentIdParamName, out var value) && value != null)
                {
                    if (value is int directId) targetStudentId = directId;
                    else if (value is string strVal && int.TryParse(strVal, out int parsedId)) targetStudentId = parsedId;
                }

                // Try to get the studentId from route data or query string
                if (!targetStudentId.HasValue && context.RouteData.Values.TryGetValue(_studentIdParamName, out var rVal) && rVal != null)
                {
                    if (int.TryParse(rVal.ToString(), out int parsedId)) targetStudentId = parsedId;
                }

                if (!targetStudentId.HasValue && context.HttpContext.Request.Query.TryGetValue(_studentIdParamName, out var qVal) && !string.IsNullOrEmpty(qVal))
                {
                    if (int.TryParse(qVal.ToString(), out int parsedId)) targetStudentId = parsedId;
                }

                if (targetStudentId.HasValue)
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

                        var count = await Dapper.SqlMapper.ExecuteScalarAsync<int>(
                            connection,
                            "sp_CheckParentStudentMapping",
                            new { p_ParentUserId = parentUserId, p_StudentId = targetStudentId.Value },
                            commandType: System.Data.CommandType.StoredProcedure);

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

            // If the user is a Student, ensure they can only access their own student record
            if (userRole == "Student")
            {
                var studentIdClaim = context.HttpContext.User.FindFirst("StudentId")?.Value;
                if (!int.TryParse(studentIdClaim, out int ownStudentId))
                {
                    context.Result = new ForbidResult();
                    return;
                }

                int? targetStudentId = null;
                if (context.ActionArguments.TryGetValue(_studentIdParamName, out var sVal) && sVal != null)
                {
                    if (sVal is int directId) targetStudentId = directId;
                    else if (sVal is string strVal && int.TryParse(strVal, out int parsedId)) targetStudentId = parsedId;
                }

                if (targetStudentId.HasValue)
                {
                    if (targetStudentId.Value != ownStudentId)
                    {
                        context.Result = new ForbidResult();
                        return;
                    }
                }
                else
                {
                    // Parameter was omitted (e.g. on /me endpoints or optional parameter), automatically inject the authenticated student's ID
                    context.ActionArguments[_studentIdParamName] = ownStudentId;
                }
            }

            // Proceed for non-parents and non-students, or if the parent/student is authorized
            await next();
        }
    }
}
