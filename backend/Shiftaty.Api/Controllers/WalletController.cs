using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Controllers;

[Authorize]
public class WalletController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public WalletController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == CurrentUserId)
            ?? throw new AppException("المحفظة غير موجودة.", "NOT_FOUND", 404);
        return Ok(ApiResponse<WalletDto>.Ok(new WalletDto(wallet.Id, wallet.Balance)));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> Transactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.WalletTransactions.Where(t => t.UserId == CurrentUserId).OrderByDescending(t => t.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var result = new PagedResult<WalletTransactionDto>
        {
            Items = items.Select(t => new WalletTransactionDto(t.Id, t.Type, t.Amount, t.BalanceBefore,
                t.BalanceAfter, t.DescriptionAr, t.CreatedAt)).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
        return Ok(ApiResponse<PagedResult<WalletTransactionDto>>.Ok(result));
    }

    // Demo/self-service coin packages (no external payment gateway is wired up yet).
    private static readonly int[] AllowedTopupAmounts = { 50, 150, 300, 500, 1000 };

    [HttpPost("topup")]
    public async Task<IActionResult> Topup(TopupWalletDto dto)
    {
        if (!AllowedTopupAmounts.Contains(dto.Amount))
            throw new AppException("باقة غير صالحة.", "VALIDATION_ERROR");

        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == CurrentUserId)
            ?? throw new AppException("المحفظة غير موجودة.", "NOT_FOUND", 404);

        var before = wallet.Balance;
        wallet.Balance += dto.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = Guid.NewGuid(),
            WalletId = wallet.Id,
            UserId = CurrentUserId,
            Type = WalletTransactionType.Topup,
            Amount = dto.Amount,
            BalanceBefore = before,
            BalanceAfter = wallet.Balance,
            DescriptionAr = $"شراء {dto.Amount} مشرط",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<WalletDto>.Ok(new WalletDto(wallet.Id, wallet.Balance), "تم شحن رصيدك بنجاح."));
    }
}

[Authorize]
public class NotificationsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await _db.Notifications
            .Where(n => n.UserId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<NotificationDto>>.Ok(
            items.Select(n => new NotificationDto(n.Id, n.Type, n.TitleAr, n.BodyAr, n.IsRead, n.CreatedAt))));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var count = await _db.Notifications.CountAsync(n => n.UserId == CurrentUserId && !n.IsRead);
        return Ok(ApiResponse<object>.Ok(new { count }));
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId)
            ?? throw new AppException("الإشعار غير موجود.", "NOT_FOUND", 404);
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var items = await _db.Notifications.Where(n => n.UserId == CurrentUserId && !n.IsRead).ToListAsync();
        foreach (var n in items) n.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}

[Authorize]
public class DealsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public DealsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var items = await _db.Deals
            .Include(d => d.Listing).Include(d => d.Seller).Include(d => d.Buyer)
            .Where(d => d.SellerId == CurrentUserId || d.BuyerId == CurrentUserId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<DealDto>>.Ok(items.Select(d => new DealDto(
            d.Id, d.ListingId, d.Listing?.Title ?? "", d.SellerId, d.Seller?.FullName ?? "",
            d.BuyerId, d.Buyer?.FullName ?? "", d.SellerCoinCost, d.BuyerCoinCost, d.Status, d.CreatedAt,
            d.Seller?.Email, d.Seller?.PhoneNumber, d.Buyer?.Email, d.Buyer?.PhoneNumber))));
    }
}
