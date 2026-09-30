using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Application.DTOs;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Controllers;

[Authorize(Roles = "Admin")]
public class AttributesController : ApiControllerBase
{
    private readonly AppDbContext _db;
    public AttributesController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create(CreateAttributeDto dto)
    {
        var node = await _db.CategoryNodes.FindAsync(dto.CategoryNodeId)
            ?? throw new AppException("القسم غير موجود.", "NOT_FOUND", 404);
        var attr = new AttributeDefinition
        {
            Id = Guid.NewGuid(),
            CategoryNodeId = dto.CategoryNodeId,
            NameAr = dto.NameAr,
            NameEn = dto.NameEn,
            Key = dto.Key,
            DataType = dto.DataType,
            IsRequired = dto.IsRequired,
            IsFilterable = dto.IsFilterable,
            IsSearchable = dto.IsSearchable,
            SortOrder = dto.SortOrder,
            IsActive = true
        };
        _db.AttributeDefinitions.Add(attr);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { attr.Id }, "تم إنشاء الخاصية."));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CreateAttributeDto dto)
    {
        var attr = await _db.AttributeDefinitions.FindAsync(id)
            ?? throw new AppException("الخاصية غير موجودة.", "NOT_FOUND", 404);
        attr.NameAr = dto.NameAr;
        attr.NameEn = dto.NameEn;
        attr.Key = dto.Key;
        attr.DataType = dto.DataType;
        attr.IsRequired = dto.IsRequired;
        attr.IsFilterable = dto.IsFilterable;
        attr.IsSearchable = dto.IsSearchable;
        attr.SortOrder = dto.SortOrder;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم تحديث الخاصية."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var attr = await _db.AttributeDefinitions.FindAsync(id)
            ?? throw new AppException("الخاصية غير موجودة.", "NOT_FOUND", 404);
        attr.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم تعطيل الخاصية."));
    }

    [HttpPost("{id:guid}/options")]
    public async Task<IActionResult> AddOption(Guid id, CreateAttributeOptionDto dto)
    {
        var attr = await _db.AttributeDefinitions.FindAsync(id)
            ?? throw new AppException("الخاصية غير موجودة.", "NOT_FOUND", 404);
        var opt = new AttributeOption
        {
            Id = Guid.NewGuid(),
            AttributeDefinitionId = id,
            LabelAr = dto.LabelAr,
            LabelEn = dto.LabelEn,
            Value = dto.Value,
            SortOrder = dto.SortOrder,
            IsActive = true
        };
        _db.AttributeOptions.Add(opt);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { opt.Id }, "تم إضافة الخيار."));
    }

    [HttpDelete("options/{optionId:guid}")]
    public async Task<IActionResult> DeleteOption(Guid optionId)
    {
        var opt = await _db.AttributeOptions.FindAsync(optionId)
            ?? throw new AppException("الخيار غير موجود.", "NOT_FOUND", 404);
        _db.AttributeOptions.Remove(opt);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم حذف الخيار."));
    }
}
