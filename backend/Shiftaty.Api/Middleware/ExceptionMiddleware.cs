using System.Text.Json;
using Shiftaty.Api.Application.Common;

namespace Shiftaty.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
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
        catch (AppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Code);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteAsync(context, 500, "حدث خطأ غير متوقع.", "INTERNAL_ERROR");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message, string code)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = status;
        var payload = new { success = false, message, code };
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
