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
public class RequestsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public RequestsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var items = await _db.BuyerRequests
            .Include(r => r.Buyer).Include(r => r.CategoryNode)
            .Where(r => r.BuyerId == CurrentUserId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<BuyerRequestDto>>.Ok(items.Select(Map)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _db.BuyerRequests.Include(x => x.Buyer).Include(x => x.CategoryNode)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new AppException("الطلب غير موجود.", "NOT_FOUND", 404);
        return Ok(ApiResponse<BuyerRequestDto>.Ok(Map(r)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBuyerRequestDto dto)
    {
        if (dto.BudgetMin.HasValue && dto.BudgetMax.HasValue && dto.BudgetMin > dto.BudgetMax)
            throw new AppException("الحد الأدنى للميزانية يجب أن يكون أقل من الحد الأقصى.", "VALIDATION_ERROR");

        var node = await _db.CategoryNodes.FindAsync(dto.CategoryNodeId)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);

        var req = new BuyerRequest
        {
            Id = Guid.NewGuid(),
            BuyerId = CurrentUserId,
            CategoryNodeId = dto.CategoryNodeId,
            Title = dto.Title,
            Description = dto.Description,
            BudgetMin = dto.BudgetMin,
            BudgetMax = dto.BudgetMax,
            Location = dto.Location,
            Status = RequestStatus.Pending,
            ExpiresAt = dto.ExpiresAt == null ? null : DateTime.SpecifyKind(dto.ExpiresAt.Value, DateTimeKind.Utc),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        foreach (var a in dto.Attributes ?? Enumerable.Empty<AttributeValueDto>())
            req.AttributeValues.Add(new BuyerRequestAttributeValue
            {
                Id = Guid.NewGuid(),
                BuyerRequestId = req.Id,
                AttributeDefinitionId = a.AttributeDefinitionId,
                TextValue = a.Text, NumberValue = a.Number, BooleanValue = a.Boolean,
                DateValue = a.Date == null ? null : DateTime.SpecifyKind(a.Date.Value, DateTimeKind.Utc),
                JsonValue = a.Json
            });
        _db.BuyerRequests.Add(req);
        await _db.SaveChangesAsync();

        var full = await _db.BuyerRequests.Include(x => x.Buyer).Include(x => x.CategoryNode).FirstAsync(x => x.Id == req.Id);
        return Ok(ApiResponse<BuyerRequestDto>.Ok(Map(full), "تم إنشاء الطلب."));
    }

    [HttpGet("{id:guid}/matches")]
    public async Task<IActionResult> Matches(Guid id)
    {
        var req = await _db.BuyerRequests.FindAsync(id)
            ?? throw new AppException("الطلب غير موجود.", "NOT_FOUND", 404);
        if (req.BuyerId != CurrentUserId)
            throw new AppException("غير مصرح.", "FORBIDDEN", 403);

        var ids = await DescendantOrAncestorIdsAsync(req.CategoryNodeId);
        var listings = await _db.Listings
            .Include(l => l.Seller).Include(l => l.CategoryNode).Include(l => l.Images).Include(l => l.AttributeValues)
            .Where(l => l.Status == ListingStatus.Published && ids.Contains(l.CategoryNodeId))
            .Where(l => (!req.BudgetMax.HasValue || l.Price <= req.BudgetMax)
                     && (!req.BudgetMin.HasValue || l.Price >= req.BudgetMin))
            .OrderByDescending(l => l.PublishedAt)
            .Take(50)
            .ToListAsync();

        var dtos = listings.Select(l => new ListingDto(
            l.Id, l.SellerId, l.Seller?.FullName ?? "", l.CategoryNodeId, l.CategoryNode?.NameAr ?? "",
            l.Title, l.Description, l.Price, l.Currency, l.Location, l.Governorate, l.Status, l.IsPublished,
            l.ShiftTiming, l.ShiftDuration,
            l.PublishedAt, l.AvailableFrom, l.AvailableTo, l.CreatedAt,
            l.AttributeValues.Select(a => new AttributeValueDto(a.AttributeDefinitionId, a.TextValue, a.NumberValue, a.BooleanValue, a.DateValue, a.JsonValue)),
            l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url), 0));
        return Ok(ApiResponse<IEnumerable<ListingDto>>.Ok(dtos));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelRequest(Guid id)
    {
        var req = await _db.BuyerRequests.FindAsync(id)
            ?? throw new AppException("الطلب غير موجود.", "NOT_FOUND", 404);
        if (req.BuyerId != CurrentUserId)
            throw new AppException("غير مصرح.", "FORBIDDEN", 403);
        req.Status = RequestStatus.Cancelled;
        req.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم إلغاء الطلب."));
    }

    private async Task<List<Guid>> DescendantOrAncestorIdsAsync(Guid nodeId)
    {
        var all = await _db.CategoryNodes.Select(c => new { c.Id, c.ParentId }).ToListAsync();
        var result = new HashSet<Guid> { nodeId };
        // descendants
        var queue = new Queue<Guid>();
        queue.Enqueue(nodeId);
        while (queue.Count > 0)
        {
            var cur = queue.Dequeue();
            foreach (var c in all.Where(x => x.ParentId == cur))
                if (result.Add(c.Id)) queue.Enqueue(c.Id);
        }
        return result.ToList();
    }

    private static BuyerRequestDto Map(BuyerRequest r) => new(
        r.Id, r.BuyerId, r.Buyer?.FullName ?? "", r.CategoryNodeId, r.CategoryNode?.NameAr ?? "",
        r.Title, r.Description, r.BudgetMin, r.BudgetMax, r.Location, r.Status, r.ExpiresAt, r.CreatedAt);
}
