using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;
using Shiftaty.Api.Infrastructure.Services;

namespace Shiftaty.Api.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;
    private readonly OtpService _otp;
    private readonly WalletService _wallets;
    private readonly AuditService _audit;
    private readonly CoinSettings _coins;

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager,
        AppDbContext db, TokenService tokens, OtpService otp, WalletService wallets, AuditService audit,
        IOptions<CoinSettings> coins)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _db = db;
        _tokens = tokens;
        _otp = otp;
        _wallets = wallets;
        _audit = audit;
        _coins = coins.Value;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (dto.Password != dto.ConfirmPassword)
            throw new AppException("كلمتا المرور غير متطابقتين.", "VALIDATION_ERROR");
        if (string.IsNullOrWhiteSpace(dto.Phone))
            throw new AppException("رقم الهاتف مطلوب.", "VALIDATION_ERROR");
        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            throw new AppException("البريد الإلكتروني مستخدم بالفعل.", "VALIDATION_ERROR");

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = dto.Email,
            Email = dto.Email,
            PhoneNumber = dto.Phone.Trim(),
            FullName = dto.FullName,
            EmailConfirmed = false,
            IsActive = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            throw new AppException(string.Join(" ", result.Errors.Select(e => e.Description)), "VALIDATION_ERROR");

        await _userManager.AddToRolesAsync(user, new[] { "Buyer", "Seller" });
        _audit.Log(user.Id, "UserRegistered", "User", user.Id, ip: Ip);
        await _db.SaveChangesAsync();

        var devOtp = await _otp.GenerateAndSendAsync(user, OtpPurpose.Registration);
        return Ok(ApiResponse<object>.Ok(new { email = user.Email, devOtp },
            "تم إرسال رمز التحقق إلى بريدك الإلكتروني."));
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);

        await _otp.VerifyAsync(user, OtpPurpose.Registration, dto.Code);

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            // Grant trial wallet exactly once
            if (await _wallets.GetByUserAsync(user.Id) == null)
                await _wallets.CreateWalletAsync(user.Id, _coins.TrialInitialCoins);

            _audit.Log(user.Id, "EmailVerified", "User", user.Id, ip: Ip);
            await _db.SaveChangesAsync();
        }

        var auth = await BuildAuthResultAsync(user);
        return Ok(ApiResponse<AuthResultDto>.Ok(auth, "تم التحقق من الحساب بنجاح."));
    }

    [HttpPost("resend-otp")]
    public async Task<IActionResult> ResendOtp(ResendOtpDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        var devOtp = await _otp.GenerateAndSendAsync(user, OtpPurpose.Registration);
        return Ok(ApiResponse<object>.Ok(new { devOtp }, "تم إعادة إرسال رمز التحقق."));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new AppException("بيانات الدخول غير صحيحة.", "UNAUTHORIZED", 401);

        if (!user.IsActive)
            throw new AppException("تم تعطيل هذا الحساب.", "FORBIDDEN", 403);

        if (!await _userManager.CheckPasswordAsync(user, dto.Password))
        {
            _audit.Log(user.Id, "LoginFailed", "User", user.Id, ip: Ip);
            await _db.SaveChangesAsync();
            throw new AppException("بيانات الدخول غير صحيحة.", "UNAUTHORIZED", 401);
        }

        if (!user.EmailConfirmed)
        {
            var devOtp = await _otp.GenerateAndSendAsync(user, OtpPurpose.Registration);
            return Ok(ApiResponse<object>.Ok(new { requiresOtp = true, email = user.Email, devOtp },
                "يرجى تأكيد بريدك الإلكتروني أولاً."));
        }

        var auth = await BuildAuthResultAsync(user);
        _audit.Log(user.Id, "LoginSuccess", "User", user.Id, ip: Ip);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<AuthResultDto>.Ok(auth, "تم تسجيل الدخول بنجاح."));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshDto dto)
    {
        var stored = await _db.RefreshTokens.Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == dto.RefreshToken)
            ?? throw new AppException("رمز التحديث غير صالح.", "UNAUTHORIZED", 401);

        if (!stored.IsActive)
            throw new AppException("انتهت صلاحية رمز التحديث.", "UNAUTHORIZED", 401);

        stored.RevokedAt = DateTime.UtcNow;
        var newRefresh = _tokens.CreateRefreshToken(stored.UserId);
        stored.ReplacedByToken = newRefresh.Token;
        _db.RefreshTokens.Add(newRefresh);
        await _db.SaveChangesAsync();

        var accessToken = await _tokens.CreateAccessTokenAsync(stored.User!);
        var user = await UserDtoAsync(stored.User!);
        return Ok(ApiResponse<AuthResultDto>.Ok(new AuthResultDto(accessToken, newRefresh.Token, user)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshDto dto)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == dto.RefreshToken && r.UserId == CurrentUserId);
        if (stored != null && stored.IsActive)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        return Ok(ApiResponse<object>.Ok(new { }, "تم تسجيل الخروج."));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        string? devOtp = null;
        if (user != null)
            devOtp = await _otp.GenerateAndSendAsync(user, OtpPurpose.ForgotPassword);
        // Always return success to avoid user enumeration
        return Ok(ApiResponse<object>.Ok(new { devOtp }, "إذا كان البريد مسجلاً، سيصلك رمز لإعادة التعيين."));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        await _otp.VerifyAsync(user, OtpPurpose.ForgotPassword, dto.Code);

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var res = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
        if (!res.Succeeded)
            throw new AppException(string.Join(" ", res.Errors.Select(e => e.Description)), "VALIDATION_ERROR");

        _audit.Log(user.Id, "PasswordReset", "User", user.Id, ip: Ip);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم تغيير كلمة المرور بنجاح."));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(CurrentUserId.ToString())
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        var res = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!res.Succeeded)
            throw new AppException(string.Join(" ", res.Errors.Select(e => e.Description)), "VALIDATION_ERROR");
        return Ok(ApiResponse<object>.Ok(new { }, "تم تغيير كلمة المرور."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.FindByIdAsync(CurrentUserId.ToString())
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        return Ok(ApiResponse<UserDto>.Ok(await UserDtoAsync(user)));
    }

    private async Task<AuthResultDto> BuildAuthResultAsync(ApplicationUser user)
    {
        var accessToken = await _tokens.CreateAccessTokenAsync(user);
        var refresh = _tokens.CreateRefreshToken(user.Id);
        _db.RefreshTokens.Add(refresh);
        await _db.SaveChangesAsync();
        return new AuthResultDto(accessToken, refresh.Token, await UserDtoAsync(user));
    }

    private async Task<UserDto> UserDtoAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var wallet = await _wallets.GetByUserAsync(user.Id);
        return new UserDto(user.Id, user.FullName, user.Email!, user.PhoneNumber, roles, wallet?.Balance ?? 0);
    }
}
