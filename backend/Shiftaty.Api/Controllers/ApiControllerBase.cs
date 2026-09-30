using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Shiftaty.Api.Application.Common;

namespace Shiftaty.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId
    {
        get
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (id == null) throw new AppException("غير مصرح.", "UNAUTHORIZED", 401);
            return Guid.Parse(id);
        }
    }

    protected string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();
}
