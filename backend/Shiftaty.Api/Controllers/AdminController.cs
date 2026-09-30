using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;
using Shiftaty.Api.Infrastructure.Services;

namespace Shiftaty.Api.Controllers;

[Authorize(Roles = "Admin")]
public class AdminController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly WalletService _wallets;
    private readonly AuditService _audit;

    public AdminController(AppDbContext db, UserManager<ApplicationUser> userManager, WalletService wallets, AuditService audit)
    {
        _db = db;
        _userManager = userManager;
        _wallets = wallets;
        _audit = audit;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var stats = new AdminStatsDto(
            TotalUsers: await _db.Users.CountAsync(),
            TotalListings: await _db.Listings.CountAsync(),
            PublishedListings: await _db.Listings.CountAsync(l => l.Status == ListingStatus.Published),
            TotalRequests: await _db.ListingRequests.CountAsync(),
            TotalDeals: await _db.Deals.CountAsync(),
            TotalCategories: await _db.CategoryNodes.CountAsync(),
            CoinsInCirculation: await _db.Wallets.SumAsync(w => (long)w.Balance));
        return Ok(ApiResponse<AdminStatsDto>.Ok(stats));
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.FullName.Contains(search) || u.Email!.Contains(search));
        q = q.OrderByDescending(u => u.CreatedAt);
        var total = await q.CountAsync();
        var users = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var list = new List<AdminUserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == u.Id);
            list.Add(new AdminUserDto(u.Id, u.FullName, u.Email!, roles, u.IsActive, wallet?.Balance ?? 0, u.CreatedAt));
        }
        var result = new PagedResult<AdminUserDto> { Items = list, Page = page, PageSize = pageSize, TotalCount = total };
        return Ok(ApiResponse<PagedResult<AdminUserDto>>.Ok(result));
    }

    [HttpPost("users/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString())
            ?? throw new AppException("المستخدم غير موجود.", "NOT_FOUND", 404);
        user.IsActive = !user.IsActive;
        await _userManager.UpdateAsync(user);
        _audit.Log(CurrentUserId, "AdminToggleUserActive", "User", id, $"IsActive={user.IsActive}", Ip);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { user.IsActive }, "تم تحديث حالة المستخدم."));
    }

    [HttpPost("users/{id:guid}/adjust-coins")]
    public async Task<IActionResult> AdjustCoins(Guid id, AdjustCoinsDto dto)
    {
        var wallet = await _wallets.GetByUserAsync(id)
            ?? throw new AppException("المحفظة غير موجودة.", "NOT_FOUND", 404);
        _wallets.Apply(wallet, WalletTransactionType.AdminAdjustment, dto.Amount,
            $"تعديل إداري: {dto.Reason}", "Admin", CurrentUserId);
        _audit.Log(CurrentUserId, "AdminAdjustCoins", "Wallet", wallet.Id, $"Amount={dto.Amount}; {dto.Reason}", Ip);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { wallet.Balance }, "تم تعديل الرصيد."));
    }

    [HttpGet("listings")]
    public async Task<IActionResult> Listings([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Listings.Include(l => l.Seller).Include(l => l.CategoryNode).OrderByDescending(l => l.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var result = new PagedResult<object>
        {
            Items = items.Select(l => (object)new
            {
                l.Id, l.Title, Seller = l.Seller?.FullName, Category = l.CategoryNode?.NameAr,
                l.Price, l.Currency, Status = l.Status.ToString(), l.PublishedAt, l.CreatedAt
            }).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
        return Ok(ApiResponse<PagedResult<object>>.Ok(result));
    }

    [HttpGet("requests")]
    public async Task<IActionResult> Requests()
    {
        var items = await _db.ListingRequests.Include(r => r.Buyer).Include(r => r.Listing)
            .OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync();
        return Ok(ApiResponse<object>.Ok(items.Select(r => new
        {
            r.Id, Listing = r.Listing?.Title, Buyer = r.Buyer?.FullName,
            Status = r.Status.ToString(), r.CreatedAt
        })));
    }

    [HttpGet("deals")]
    public async Task<IActionResult> Deals()
    {
        var items = await _db.Deals.Include(d => d.Listing).Include(d => d.Seller).Include(d => d.Buyer)
            .OrderByDescending(d => d.CreatedAt).Take(200).ToListAsync();
        return Ok(ApiResponse<object>.Ok(items.Select(d => new
        {
            d.Id, Listing = d.Listing?.Title, Seller = d.Seller?.FullName, Buyer = d.Buyer?.FullName,
            d.SellerCoinCost, d.BuyerCoinCost, Status = d.Status.ToString(), d.CreatedAt
        })));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> Transactions([FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.WalletTransactions.OrderByDescending(t => t.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var result = new PagedResult<object>
        {
            Items = items.Select(t => (object)new
            {
                t.Id, UserId = t.UserId, Type = t.Type.ToString(), t.Amount, t.BalanceBefore,
                t.BalanceAfter, t.DescriptionAr, t.CreatedAt
            }).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
        return Ok(ApiResponse<PagedResult<object>>.Ok(result));
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> AuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 200);
        var q = _db.AuditLogs.OrderByDescending(a => a.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var result = new PagedResult<object>
        {
            Items = items.Select(a => (object)new
            {
                a.Id, a.UserId, a.Action, a.EntityType, a.EntityId, a.Details, a.IpAddress, a.CreatedAt
            }).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total
        };
        return Ok(ApiResponse<PagedResult<object>>.Ok(result));
    }
}
