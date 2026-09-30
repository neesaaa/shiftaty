using Microsoft.AspNetCore.Authorization;
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

public class ListingsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly WalletService _wallets;
    private readonly NotificationService _notify;
    private readonly AuditService _audit;
    private readonly CoinSettings _coins;

    public ListingsController(AppDbContext db, WalletService wallets, NotificationService notify,
        AuditService audit, IOptions<CoinSettings> coins)
    {
        _db = db;
        _wallets = wallets;
        _notify = notify;
        _audit = audit;
        _coins = coins.Value;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] Guid? categoryId, [FromQuery] string? search, [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice, [FromQuery] string? location, [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection, [FromQuery] ShiftTiming? shiftTiming, [FromQuery] ShiftDuration? shiftDuration,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Listings
            .Include(l => l.Seller)
            .Include(l => l.CategoryNode)
            .Include(l => l.Images)
            .Include(l => l.AttributeValues)
            .Where(l => l.Status == ListingStatus.Published);

        if (categoryId.HasValue)
        {
            var ids = await DescendantIdsAsync(categoryId.Value);
            q = q.Where(l => ids.Contains(l.CategoryNodeId));
        }
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(l => l.Title.Contains(search) || l.Description.Contains(search));
        if (minPrice.HasValue) q = q.Where(l => l.Price >= minPrice);
        if (maxPrice.HasValue) q = q.Where(l => l.Price <= maxPrice);
        if (!string.IsNullOrWhiteSpace(location))
            q = q.Where(l => l.Location != null && l.Location.Contains(location));
        if (shiftTiming.HasValue) q = q.Where(l => l.ShiftTiming == shiftTiming);
        if (shiftDuration.HasValue) q = q.Where(l => l.ShiftDuration == shiftDuration);

        q = (sortBy, sortDirection?.ToLower()) switch
        {
            ("price", "asc") => q.OrderBy(l => l.Price),
            ("price", "desc") => q.OrderByDescending(l => l.Price),
            ("oldest", _) => q.OrderBy(l => l.PublishedAt),
            _ => q.OrderByDescending(l => l.PublishedAt)
        };

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var result = new PagedResult<ListingDto>
        {
            Items = items.Select(Map).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
        return Ok(ApiResponse<PagedResult<ListingDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var listing = await LoadFull(id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        return Ok(ApiResponse<ListingDto>.Ok(Map(listing)));
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var items = await _db.Listings
            .Include(l => l.Seller).Include(l => l.CategoryNode).Include(l => l.Images)
            .Include(l => l.AttributeValues).Include(l => l.Requests)
            .Where(l => l.SellerId == CurrentUserId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<ListingDto>>.Ok(items.Select(Map)));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateListingDto dto)
    {
        var node = await _db.CategoryNodes.FindAsync(dto.CategoryNodeId)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);

        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            SellerId = CurrentUserId,
            CategoryNodeId = dto.CategoryNodeId,
            Title = dto.Title,
            Description = dto.Description,
            Price = dto.Price,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "EGP" : dto.Currency,
            Location = dto.Location,
            Governorate = dto.Governorate,
            City = dto.City,
            ShiftTiming = dto.ShiftTiming,
            ShiftDuration = dto.ShiftDuration,
            AvailableFrom = ToUtc(dto.AvailableFrom),
            AvailableTo = ToUtc(dto.AvailableTo),
            Status = ListingStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ApplyAttributes(listing, dto.Attributes);
        if (dto.ImageUrls != null)
        {
            int i = 0;
            foreach (var url in dto.ImageUrls)
                listing.Images.Add(new ListingImage { Id = Guid.NewGuid(), ListingId = listing.Id, Url = url, SortOrder = i++ });
        }
        _db.Listings.Add(listing);
        _audit.Log(CurrentUserId, "ListingCreated", "Listing", listing.Id, ip: Ip);
        await _db.SaveChangesAsync();

        var full = await LoadFull(listing.Id);
        return Ok(ApiResponse<ListingDto>.Ok(Map(full!), "تم إنشاء العرض كمسودة."));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CreateListingDto dto)
    {
        var listing = await LoadFull(id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        EnsureOwner(listing);
        if (listing.Status is ListingStatus.Selected or ListingStatus.Completed)
            throw new AppException("لا يمكن تعديل عرض تم اختياره.", "LISTING_NOT_AVAILABLE");

        listing.Title = dto.Title;
        listing.Description = dto.Description;
        listing.Price = dto.Price;
        listing.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? listing.Currency : dto.Currency;
        listing.Location = dto.Location;
        listing.Governorate = dto.Governorate;
        listing.City = dto.City;
        listing.ShiftTiming = dto.ShiftTiming;
        listing.ShiftDuration = dto.ShiftDuration;
        listing.AvailableFrom = ToUtc(dto.AvailableFrom);
        listing.AvailableTo = ToUtc(dto.AvailableTo);
        listing.UpdatedAt = DateTime.UtcNow;

        _db.ListingAttributeValues.RemoveRange(listing.AttributeValues);
        listing.AttributeValues.Clear();
        ApplyAttributes(listing, dto.Attributes);
        await _db.SaveChangesAsync();

        var full = await LoadFull(id);
        return Ok(ApiResponse<ListingDto>.Ok(Map(full!), "تم تحديث العرض."));
    }

    [Authorize]
    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id)
    {
        await using var trx = await _db.Database.BeginTransactionAsync();
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        EnsureOwner(listing);
        if (listing.Status == ListingStatus.Published)
            throw new AppException("العرض منشور بالفعل.", "VALIDATION_ERROR");

        var wallet = await _wallets.GetByUserAsync(CurrentUserId)
            ?? throw new AppException("المحفظة غير موجودة.", "NOT_FOUND", 404);
        if (wallet.Balance < _coins.ListingPublishCost)
            throw new AppException("رصيد المشرط غير كافٍ لنشر العرض.", "INSUFFICIENT_COINS");

        _wallets.Apply(wallet, WalletTransactionType.ListingPublish, -_coins.ListingPublishCost,
            "نشر عرض", "Listing", listing.Id);

        listing.Status = ListingStatus.Published;
        listing.IsPublished = true;
        listing.PublishedAt = DateTime.UtcNow;
        listing.UpdatedAt = DateTime.UtcNow;

        _notify.Add(CurrentUserId, NotificationType.ListingPublished, "تم نشر العرض",
            $"تم نشر عرضك \"{listing.Title}\" بنجاح.", "Listing", listing.Id);
        _audit.Log(CurrentUserId, "ListingPublished", "Listing", listing.Id, ip: Ip);

        await _db.SaveChangesAsync();
        await trx.CommitAsync();

        var full = await LoadFull(id);
        return Ok(ApiResponse<ListingDto>.Ok(Map(full!), "تم نشر العرض وخصم 1 مشرط."));
    }

    [Authorize]
    [HttpPost("{id:guid}/pause")]
    public async Task<IActionResult> Pause(Guid id)
    {
        var listing = await _db.Listings.FindAsync(id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        EnsureOwner(listing);
        if (listing.Status == ListingStatus.Selected)
            throw new AppException("لا يمكن إيقاف عرض تم اختياره.", "LISTING_NOT_AVAILABLE");
        listing.Status = ListingStatus.Paused;
        listing.IsPublished = false;
        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم إيقاف العرض."));
    }

    [Authorize]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var listing = await _db.Listings.FindAsync(id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        EnsureOwner(listing);
        listing.Status = ListingStatus.Cancelled;
        listing.IsPublished = false;
        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم إلغاء العرض."));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var listing = await _db.Listings.FindAsync(id)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        EnsureOwner(listing);
        if (listing.Status is ListingStatus.Selected or ListingStatus.Completed)
            throw new AppException("لا يمكن حذف عرض مرتبط بصفقة.", "LISTING_NOT_AVAILABLE");
        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم حذف العرض."));
    }

    // ---- helpers ----
    private void EnsureOwner(Listing listing)
    {
        if (listing.SellerId != CurrentUserId)
            throw new AppException("غير مصرح بالوصول لهذا العرض.", "FORBIDDEN", 403);
    }

    private static DateTime? ToUtc(DateTime? dt) =>
        dt == null ? null : DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc);

    private void ApplyAttributes(Listing listing, IEnumerable<AttributeValueDto> attributes)
    {
        foreach (var a in attributes ?? Enumerable.Empty<AttributeValueDto>())
        {
            listing.AttributeValues.Add(new ListingAttributeValue
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                AttributeDefinitionId = a.AttributeDefinitionId,
                TextValue = a.Text,
                NumberValue = a.Number,
                BooleanValue = a.Boolean,
                DateValue = ToUtc(a.Date),
                JsonValue = a.Json
            });
        }
    }

    private Task<Listing?> LoadFull(Guid id) =>
        _db.Listings
            .Include(l => l.Seller).Include(l => l.CategoryNode).Include(l => l.Images)
            .Include(l => l.AttributeValues).Include(l => l.Requests)
            .FirstOrDefaultAsync(l => l.Id == id);

    private async Task<List<Guid>> DescendantIdsAsync(Guid rootId)
    {
        var all = await _db.CategoryNodes.Select(c => new { c.Id, c.ParentId }).ToListAsync();
        var result = new List<Guid> { rootId };
        var queue = new Queue<Guid>();
        queue.Enqueue(rootId);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var child in all.Where(c => c.ParentId == current))
            {
                result.Add(child.Id);
                queue.Enqueue(child.Id);
            }
        }
        return result;
    }

    private static ListingDto Map(Listing l) => new(
        l.Id, l.SellerId, l.Seller?.FullName ?? "", l.CategoryNodeId, l.CategoryNode?.NameAr ?? "",
        l.Title, l.Description, l.Price, l.Currency, l.Location, l.Governorate, l.Status, l.IsPublished,
        l.ShiftTiming, l.ShiftDuration,
        l.PublishedAt, l.AvailableFrom, l.AvailableTo, l.CreatedAt,
        l.AttributeValues.Select(a => new AttributeValueDto(a.AttributeDefinitionId, a.TextValue, a.NumberValue, a.BooleanValue, a.DateValue, a.JsonValue)),
        l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url),
        l.Requests?.Count ?? 0);
}
