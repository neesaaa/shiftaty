namespace Shiftaty.Api.Application.Common;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Shiftaty";
    public string Audience { get; set; } = "ShiftatyUsers";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}

public class OtpSettings
{
    public int OtpLength { get; set; } = 6;
    public int OtpExpirationMinutes { get; set; } = 5;
    public int OtpMaxAttempts { get; set; } = 5;
    public int OtpResendCooldownSeconds { get; set; } = 60;
    public bool DevMode { get; set; } = true; // when true, OTP is logged and returned in dev responses
}

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Shiftaty";
    public bool Enabled { get; set; }
}

public class CoinSettings
{
    public int TrialInitialCoins { get; set; } = 100;
    public int ListingPublishCost { get; set; } = 1;
    public int DealSellerCost { get; set; } = 1;
    public int DealBuyerCost { get; set; } = 1;
    public int LowBalanceThreshold { get; set; } = 10;
}

public class AdminSeedSettings
{
    public string Email { get; set; } = "nassar@gmail.com";
    public string Password { get; set; } = "Admin@123456";
    public string FullName { get; set; } = "مدير النظام";
}
