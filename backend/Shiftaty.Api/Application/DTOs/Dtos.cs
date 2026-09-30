using Shiftaty.Api.Domain.Enums;

namespace Shiftaty.Api.Application.DTOs;

// ---- Auth ----
public record RegisterDto(string FullName, string Email, string Phone, string Password, string ConfirmPassword);
public record VerifyOtpDto(string Email, string Code);
public record ResendOtpDto(string Email);
public record LoginDto(string Email, string Password);
public record RefreshDto(string RefreshToken);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string Email, string Code, string NewPassword);
public record ChangePasswordDto(string CurrentPassword, string NewPassword);

public record AuthResultDto(string AccessToken, string RefreshToken, UserDto User, string? DevOtp = null);
public record UserDto(Guid Id, string FullName, string Email, string? Phone, IEnumerable<string> Roles, int Balance);

// ---- Category ----
public record CategoryNodeDto(Guid Id, Guid? ParentId, string NameAr, string? NameEn, string Slug,
    int Level, string NodeType, bool IsActive, int SortOrder, bool HasChildren);
public record CreateCategoryDto(Guid? ParentId, string NameAr, string? NameEn, string NodeType, int SortOrder);
public record UpdateCategoryDto(string NameAr, string? NameEn, bool IsActive, int SortOrder);
public record MoveCategoryDto(Guid? NewParentId);

// ---- Attributes ----
public record AttributeOptionDto(Guid Id, string LabelAr, string? LabelEn, string Value, int SortOrder);
public record AttributeDefinitionDto(Guid Id, Guid CategoryNodeId, string NameAr, string? NameEn, string Key,
    AttributeDataType DataType, bool IsRequired, bool IsFilterable, bool IsSearchable, int SortOrder,
    IEnumerable<AttributeOptionDto> Options);
public record CreateAttributeDto(Guid CategoryNodeId, string NameAr, string? NameEn, string Key,
    AttributeDataType DataType, bool IsRequired, bool IsFilterable, bool IsSearchable, int SortOrder);
public record CreateAttributeOptionDto(string LabelAr, string? LabelEn, string Value, int SortOrder);

// ---- Listings ----
public record AttributeValueDto(Guid AttributeDefinitionId, string? Text, decimal? Number, bool? Boolean, DateTime? Date, string? Json);
public record CreateListingDto(Guid CategoryNodeId, string Title, string Description, decimal Price, string Currency,
    string? Location, string? Governorate, string? City, ShiftTiming ShiftTiming, ShiftDuration ShiftDuration,
    DateTime? AvailableFrom, DateTime? AvailableTo,
    IEnumerable<AttributeValueDto> Attributes, IEnumerable<string>? ImageUrls);
public record ListingDto(Guid Id, Guid SellerId, string SellerName, Guid CategoryNodeId, string CategoryName,
    string Title, string Description, decimal Price, string Currency, string? Location, string? Governorate,
    ListingStatus Status, bool IsPublished, ShiftTiming ShiftTiming, ShiftDuration ShiftDuration,
    DateTime? PublishedAt, DateTime? AvailableFrom, DateTime? AvailableTo,
    DateTime CreatedAt, IEnumerable<AttributeValueDto> Attributes, IEnumerable<string> Images, int RequestCount);

// ---- Buyer request ----
public record CreateBuyerRequestDto(Guid CategoryNodeId, string Title, string Description, decimal? BudgetMin,
    decimal? BudgetMax, string? Location, DateTime? ExpiresAt, IEnumerable<AttributeValueDto> Attributes);
public record BuyerRequestDto(Guid Id, Guid BuyerId, string BuyerName, Guid CategoryNodeId, string CategoryName,
    string Title, string Description, decimal? BudgetMin, decimal? BudgetMax, string? Location, RequestStatus Status,
    DateTime? ExpiresAt, DateTime CreatedAt);

// ---- Listing request (offer interaction) ----
public record CreateListingRequestDto(Guid? BuyerRequestId, string? Message);
public record ListingRequestDto(Guid Id, Guid ListingId, string ListingTitle, Guid BuyerId, string BuyerName,
    Guid SellerId, string? Message, RequestStatus Status, DateTime CreatedAt);

// ---- Wallet ----
public record WalletDto(Guid Id, int Balance);
public record WalletTransactionDto(Guid Id, WalletTransactionType Type, int Amount, int BalanceBefore,
    int BalanceAfter, string DescriptionAr, DateTime CreatedAt);
public record TopupWalletDto(int Amount);

// ---- Notifications ----
public record NotificationDto(Guid Id, NotificationType Type, string TitleAr, string BodyAr, bool IsRead, DateTime CreatedAt);

// ---- Deals ----
public record DealDto(Guid Id, Guid ListingId, string ListingTitle, Guid SellerId, string SellerName,
    Guid BuyerId, string BuyerName, int SellerCoinCost, int BuyerCoinCost, DealStatus Status, DateTime CreatedAt,
    string? SellerEmail, string? SellerPhone, string? BuyerEmail, string? BuyerPhone);

// ---- Admin ----
public record AdminUserDto(Guid Id, string FullName, string Email, IEnumerable<string> Roles, bool IsActive,
    int Balance, DateTime CreatedAt);
public record AdminStatsDto(int TotalUsers, int TotalListings, int PublishedListings, int TotalRequests,
    int TotalDeals, int TotalCategories, long CoinsInCirculation);
public record AdjustCoinsDto(int Amount, string Reason);
