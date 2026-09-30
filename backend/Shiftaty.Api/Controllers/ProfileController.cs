using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Controllers;

[Authorize]
public class ProfileController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public record UpdateProfileDto(string FullName, string? City, string? Area, string? Bio, string? Company, string? ProfileImage);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await _userManager.FindByIdAsync(CurrentUserId.ToString())
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        var roles = await _userManager.GetRolesAsync(user);
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == user.Id);
        return Ok(ApiResponse<object>.Ok(new
        {
            user.Id, user.FullName, user.Email, user.PhoneNumber, user.City, user.Area,
            user.Bio, user.Company, user.ProfileImage, user.IsActive, user.EmailConfirmed,
            roles, balance = wallet?.Balance ?? 0, user.CreatedAt
        }));
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(CurrentUserId.ToString())
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        user.FullName = dto.FullName;
        user.City = dto.City;
        user.Area = dto.Area;
        user.Bio = dto.Bio;
        user.Company = dto.Company;
        user.ProfileImage = dto.ProfileImage;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        return Ok(ApiResponse<object>.Ok(new { }, "تم تحديث الملف الشخصي."));
    }
}

[AllowAnonymous]
[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public SettingsController(AppDbContext db) => _db = db;

    [HttpGet("public")]
    public async Task<IActionResult> Public()
    {
        var settings = await _db.SystemSettings.Where(s => s.IsPublic).ToListAsync();
        return Ok(ApiResponse<object>.Ok(settings.ToDictionary(s => s.Key, s => s.Value)));
    }
}
