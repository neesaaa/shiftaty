using Shiftaty.Api.Domain.Enums;

namespace Shiftaty.Api.Domain.Entities;

public class Listing
{
    public Guid Id { get; set; }
    public Guid SellerId { get; set; }
    public Guid CategoryNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "EGP";
    public string? Location { get; set; }
    public string? Governorate { get; set; }
    public string? City { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public bool IsPublished { get; set; }
    public ShiftTiming ShiftTiming { get; set; }
    public ShiftDuration ShiftDuration { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? Seller { get; set; }
    public CategoryNode? CategoryNode { get; set; }
    public ICollection<ListingAttributeValue> AttributeValues { get; set; } = new List<ListingAttributeValue>();
    public ICollection<ListingImage> Images { get; set; } = new List<ListingImage>();
    public ICollection<ListingRequest> Requests { get; set; } = new List<ListingRequest>();
}

public class ListingAttributeValue
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid AttributeDefinitionId { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateTime? DateValue { get; set; }
    public string? JsonValue { get; set; }

    public Listing? Listing { get; set; }
    public AttributeDefinition? AttributeDefinition { get; set; }
}

public class ListingImage
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public Listing? Listing { get; set; }
}

public class BuyerRequest
{
    public Guid Id { get; set; }
    public Guid BuyerId { get; set; }
    public Guid CategoryNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? BudgetMin { get; set; }
    public decimal? BudgetMax { get; set; }
    public string? Location { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? Buyer { get; set; }
    public CategoryNode? CategoryNode { get; set; }
    public ICollection<BuyerRequestAttributeValue> AttributeValues { get; set; } = new List<BuyerRequestAttributeValue>();
}

public class BuyerRequestAttributeValue
{
    public Guid Id { get; set; }
    public Guid BuyerRequestId { get; set; }
    public Guid AttributeDefinitionId { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateTime? DateValue { get; set; }
    public string? JsonValue { get; set; }

    public BuyerRequest? BuyerRequest { get; set; }
    public AttributeDefinition? AttributeDefinition { get; set; }
}

public class ListingRequest
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid? BuyerRequestId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public string? Message { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Listing? Listing { get; set; }
    public BuyerRequest? BuyerRequest { get; set; }
    public ApplicationUser? Buyer { get; set; }
    public ApplicationUser? Seller { get; set; }
}

public class Deal
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid? BuyerRequestId { get; set; }
    public Guid ListingRequestId { get; set; }
    public Guid SellerId { get; set; }
    public Guid BuyerId { get; set; }
    public int SellerCoinCost { get; set; }
    public int BuyerCoinCost { get; set; }
    public DealStatus Status { get; set; } = DealStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public Listing? Listing { get; set; }
    public ApplicationUser? Seller { get; set; }
    public ApplicationUser? Buyer { get; set; }
}
