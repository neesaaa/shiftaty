using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Infrastructure.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db) => _db = db;

    /// <summary>Adds a notification to the change tracker (no SaveChanges).</summary>
    public Notification Add(Guid userId, NotificationType type, string titleAr, string bodyAr,
        string? referenceType = null, Guid? referenceId = null)
    {
        var n = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            TitleAr = titleAr,
            BodyAr = bodyAr,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(n);
        return n;
    }
}

public class AuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db) => _db = db;

    public void Log(Guid? userId, string action, string? entityType = null, Guid? entityId = null,
        string? details = null, string? ip = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow
        });
    }
}
