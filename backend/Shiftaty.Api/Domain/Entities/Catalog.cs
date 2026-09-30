using Shiftaty.Api.Domain.Enums;

namespace Shiftaty.Api.Domain.Entities;

public class CategoryNode
{
    public Guid Id { get; set; }
    public Guid? ParentId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string Slug { get; set; } = string.Empty;
    public int Level { get; set; }
    public string NodeType { get; set; } = "category";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public CategoryNode? Parent { get; set; }
    public ICollection<CategoryNode> Children { get; set; } = new List<CategoryNode>();
    public ICollection<AttributeDefinition> Attributes { get; set; } = new List<AttributeDefinition>();
}

public class AttributeDefinition
{
    public Guid Id { get; set; }
    public Guid CategoryNodeId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string Key { get; set; } = string.Empty;
    public AttributeDataType DataType { get; set; }
    public bool IsRequired { get; set; }
    public bool IsFilterable { get; set; }
    public bool IsSearchable { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public CategoryNode? CategoryNode { get; set; }
    public ICollection<AttributeOption> Options { get; set; } = new List<AttributeOption>();
}

public class AttributeOption
{
    public Guid Id { get; set; }
    public Guid AttributeDefinitionId { get; set; }
    public string LabelAr { get; set; } = string.Empty;
    public string? LabelEn { get; set; }
    public string Value { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public AttributeDefinition? AttributeDefinition { get; set; }
}
