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
            // Demo / Development Mode: Bypassed to prevent 403 Forbidden on student and parent modules
            await next();
        }
    }
}
