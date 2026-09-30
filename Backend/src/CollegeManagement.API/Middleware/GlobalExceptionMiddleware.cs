using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                if (ex is NotFoundException || ex is ConflictException || ex is ValidationException || ex is UnauthorizedException || ex is ForbiddenException)
                {
                    _logger.LogWarning("A client error occurred during HTTP request processing at {Path}: {Message}", context.Request.Path, ex.Message);
                }
                else
                {
                    _logger.LogError(ex, "An unhandled exception occurred during HTTP request processing at {Path}.", context.Request.Path);
                }
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

         var (statusCode, message) = exception switch
        {
            ValidationException => (HttpStatusCode.BadRequest, exception.Message),

            InvalidOperationException => (HttpStatusCode.BadRequest, exception.Message),

            ArgumentException => (HttpStatusCode.BadRequest, exception.Message),

            NotFoundException => (HttpStatusCode.NotFound, exception.Message),

            ConflictException => (HttpStatusCode.Conflict, exception.Message),

            UnauthorizedException => (HttpStatusCode.Unauthorized, exception.Message),

            ForbiddenException => (HttpStatusCode.Forbidden, exception.Message),

            _ => (HttpStatusCode.InternalServerError, "An unexpected server error occurred.")   
        };

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = (int)statusCode;
            }

            var response = new
            {
                statusCode = context.Response.StatusCode,
                message = message,
                details = exception.InnerException != null ? $"{exception.Message} --> {exception.InnerException.Message}" : exception.Message,
                stackTrace = exception.StackTrace,
                path = context.Request.Path.Value,
                timestamp = DateTime.UtcNow
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
        }
    }
}
