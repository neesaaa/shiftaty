using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Infrastructure.Services;

public class OtpService
{
    private readonly AppDbContext _db;
    private readonly OtpSettings _settings;
    private readonly IEmailService _email;
    private readonly ILogger<OtpService> _logger;

    public OtpService(AppDbContext db, IOptions<OtpSettings> settings, IEmailService email, ILogger<OtpService> logger)
    {
        _db = db;
        _settings = settings.Value;
        _email = email;
        _logger = logger;
    }

    public bool DevMode => _settings.DevMode;

    private static string Hash(string code)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(code)));
    }

    /// <summary>Generates and sends an OTP. Returns the plain code only when DevMode is on (for convenience).</summary>
    public async Task<string?> GenerateAndSendAsync(ApplicationUser user, OtpPurpose purpose)
    {
        var recent = await _db.OtpCodes
            .Where(o => o.UserId == user.Id && o.Purpose == purpose)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (recent != null && !recent.IsUsed &&
            recent.CreatedAt.AddSeconds(_settings.OtpResendCooldownSeconds) > DateTime.UtcNow)
        {
            var wait = (int)(recent.CreatedAt.AddSeconds(_settings.OtpResendCooldownSeconds) - DateTime.UtcNow).TotalSeconds;
            throw new AppException($"يرجى الانتظار {wait} ثانية قبل إعادة إرسال الرمز.", "OTP_COOLDOWN", 429);
        }

        var code = RandomNumberGenerator.GetInt32((int)Math.Pow(10, _settings.OtpLength - 1), (int)Math.Pow(10, _settings.OtpLength))
            .ToString();

        var otp = new OtpCode
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CodeHash = Hash(code),
            Purpose = purpose,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_settings.OtpExpirationMinutes),
            CreatedAt = DateTime.UtcNow
        };
        _db.OtpCodes.Add(otp);
        await _db.SaveChangesAsync();

        var subject = "رمز التحقق - شيفتاتي";
        var body = $"<div style='font-family:Tahoma,Arial;direction:rtl'>رمز التحقق الخاص بك هو: <b style='font-size:22px'>{code}</b><br/>صالح لمدة {_settings.OtpExpirationMinutes} دقائق.</div>";
        await _email.SendAsync(user.Email!, subject, body);

        if (_settings.DevMode)
        {
            _logger.LogWarning("[OTP DEV] User {Email} Purpose {Purpose} Code={Code}", user.Email, purpose, code);
            return code;
        }
        return null;
    }

    public async Task VerifyAsync(ApplicationUser user, OtpPurpose purpose, string code)
    {
        var otp = await _db.OtpCodes
            .Where(o => o.UserId == user.Id && o.Purpose == purpose && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp == null)
            throw new AppException("رمز التحقق غير صالح.", "OTP_INVALID");

        if (otp.ExpiresAt < DateTime.UtcNow)
            throw new AppException("انتهت صلاحية رمز التحقق.", "OTP_EXPIRED");

        if (otp.Attempts >= _settings.OtpMaxAttempts)
            throw new AppException("تم تجاوز عدد المحاولات المسموح بها.", "OTP_TOO_MANY_ATTEMPTS", 429);

        if (otp.CodeHash != Hash(code))
        {
            otp.Attempts++;
            await _db.SaveChangesAsync();
            throw new AppException("رمز التحقق غير صحيح.", "OTP_INVALID");
        }

        otp.IsUsed = true;
        await _db.SaveChangesAsync();
    }
}
