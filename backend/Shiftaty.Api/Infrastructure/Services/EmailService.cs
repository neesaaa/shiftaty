using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Shiftaty.Api.Application.Common;

namespace Shiftaty.Api.Infrastructure.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _smtp;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> smtp, ILogger<EmailService> logger)
    {
        _smtp = smtp.Value;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        if (!_smtp.Enabled || string.IsNullOrWhiteSpace(_smtp.Host))
        {
            _logger.LogInformation("[EMAIL DEV MODE] To: {To} | Subject: {Subject}\n{Body}", toEmail, subject, htmlBody);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_smtp.FromEmail, _smtp.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_smtp.Host, _smtp.Port)
        {
            Credentials = new NetworkCredential(_smtp.Username, _smtp.Password),
            EnableSsl = true
        };
        await client.SendMailAsync(message);
    }
}
