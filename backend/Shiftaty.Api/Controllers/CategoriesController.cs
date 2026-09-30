using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Controllers;

public class CategoriesController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public CategoriesController(AppDbContext db) => _db = db;

    [HttpGet("root")]
    public async Task<IActionResult> Root()
    {
        var nodes = await _db.CategoryNodes
            .Where(c => c.ParentId == null && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<CategoryNodeDto>>.Ok(await MapAsync(nodes)));
    }

    [HttpGet("{id:guid}/children")]
    public async Task<IActionResult> Children(Guid id)
    {
        var nodes = await _db.CategoryNodes
            .Where(c => c.ParentId == id && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<CategoryNodeDto>>.Ok(await MapAsync(nodes)));
    }

    [HttpGet("tree")]
    public async Task<IActionResult> Tree()
    {
        var all = await _db.CategoryNodes.OrderBy(c => c.Level).ThenBy(c => c.SortOrder).ToListAsync();
        return Ok(ApiResponse<IEnumerable<CategoryNodeDto>>.Ok(await MapAsync(all)));
    }

    [HttpGet("{id:guid}/path")]
    public async Task<IActionResult> Path(Guid id)
    {
        var path = new List<CategoryNodeDto>();
        var current = await _db.CategoryNodes.FindAsync(id);
        while (current != null)
        {
            path.Insert(0, Map(current, false));
            current = current.ParentId == null ? null : await _db.CategoryNodes.FindAsync(current.ParentId);
        }
        return Ok(ApiResponse<IEnumerable<CategoryNodeDto>>.Ok(path));
    }

    [HttpGet("{id:guid}/attributes")]
    public async Task<IActionResult> Attributes(Guid id)
    {
        var attrs = await _db.AttributeDefinitions
            .Include(a => a.Options.OrderBy(o => o.SortOrder))
            .Where(a => a.CategoryNodeId == id && a.IsActive)
            .OrderBy(a => a.SortOrder)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<AttributeDefinitionDto>>.Ok(attrs.Select(MapAttr)));
    }

    [HttpGet("{id:guid}/filter-schema")]
    public async Task<IActionResult> FilterSchema(Guid id)
    {
        var attrs = await _db.AttributeDefinitions
            .Include(a => a.Options.OrderBy(o => o.SortOrder))
            .Where(a => a.CategoryNodeId == id && a.IsActive && a.IsFilterable)
            .OrderBy(a => a.SortOrder)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<AttributeDefinitionDto>>.Ok(attrs.Select(MapAttr)));
    }

    // ---- Admin management ----
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryDto dto)
    {
        int level = 0;
        if (dto.ParentId != null)
        {
            var parent = await _db.CategoryNodes.FindAsync(dto.ParentId)
                ?? throw new AppException("القسم الأصل غير موجود.", "NOT_FOUND", 404);
            level = parent.Level + 1;
        }
        var node = new CategoryNode
        {
            Id = Guid.NewGuid(),
            ParentId = dto.ParentId,
            NameAr = dto.NameAr,
            NameEn = dto.NameEn,
            Slug = $"{dto.NameAr.Replace(' ', '-')}-{Guid.NewGuid().ToString()[..8]}",
            Level = level,
            NodeType = dto.NodeType,
            IsActive = true,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.CategoryNodes.Add(node);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<CategoryNodeDto>.Ok(Map(node, false), "تم إنشاء القسم."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryDto dto)
    {
        var node = await _db.CategoryNodes.FindAsync(id)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);
        node.NameAr = dto.NameAr;
        node.NameEn = dto.NameEn;
        node.IsActive = dto.IsActive;
        node.SortOrder = dto.SortOrder;
        node.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<CategoryNodeDto>.Ok(Map(node, false), "تم تحديث القسم."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/move")]
    public async Task<IActionResult> Move(Guid id, MoveCategoryDto dto)
    {
        var node = await _db.CategoryNodes.FindAsync(id)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);
        int level = 0;
        if (dto.NewParentId != null)
        {
            if (dto.NewParentId == id)
                throw new AppException("لا يمكن نقل القسم إلى نفسه.", "VALIDATION_ERROR");
            var parent = await _db.CategoryNodes.FindAsync(dto.NewParentId)
                ?? throw new AppException("القسم الأصل غير موجود.", "NOT_FOUND", 404);
            level = parent.Level + 1;
        }
        node.ParentId = dto.NewParentId;
        node.Level = level;
        node.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<CategoryNodeDto>.Ok(Map(node, false), "تم نقل القسم."));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var node = await _db.CategoryNodes.FindAsync(id)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);
        node.IsActive = false;
        node.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم تعطيل القسم."));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> DeletePermanently(Guid id)
    {
        var node = await _db.CategoryNodes.FindAsync(id)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);

        var ids = await DescendantIdsAsync(id);

        var inUseByListing = await _db.Listings.AnyAsync(l => ids.Contains(l.CategoryNodeId));
        var inUseByRequest = await _db.BuyerRequests.AnyAsync(r => ids.Contains(r.CategoryNodeId));
        if (inUseByListing || inUseByRequest)
            throw new AppException("لا يمكن حذف هذا القسم أو أحد أقسامه الفرعية لأنه مستخدم في عروض أو طلبات حالية.", "LISTING_NOT_AVAILABLE");

        // Delete deepest descendants first to satisfy the self-referencing FK (Restrict).
        var nodes = await _db.CategoryNodes.Where(c => ids.Contains(c.Id)).ToListAsync();
        foreach (var level in nodes.Select(n => n.Level).Distinct().OrderByDescending(l => l))
            _db.CategoryNodes.RemoveRange(nodes.Where(n => n.Level == level));
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { }, "تم حذف القسم نهائيًا."));
    }

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

    private async Task<List<CategoryNodeDto>> MapAsync(List<CategoryNode> nodes)
    {
        var ids = nodes.Select(n => n.Id).ToList();
        var parentsWithChildren = await _db.CategoryNodes
            .Where(c => c.ParentId != null && ids.Contains(c.ParentId!.Value) && c.IsActive)
            .Select(c => c.ParentId!.Value)
            .Distinct()
            .ToListAsync();
        return nodes.Select(n => Map(n, parentsWithChildren.Contains(n.Id))).ToList();
    }

    private static CategoryNodeDto Map(CategoryNode n, bool hasChildren) =>
        new(n.Id, n.ParentId, n.NameAr, n.NameEn, n.Slug, n.Level, n.NodeType, n.IsActive, n.SortOrder, hasChildren);

    private static AttributeDefinitionDto MapAttr(AttributeDefinition a) =>
        new(a.Id, a.CategoryNodeId, a.NameAr, a.NameEn, a.Key, a.DataType, a.IsRequired, a.IsFilterable,
            a.IsSearchable, a.SortOrder,
            a.Options.Select(o => new AttributeOptionDto(o.Id, o.LabelAr, o.LabelEn, o.Value, o.SortOrder)));
}
