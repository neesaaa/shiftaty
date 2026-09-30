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

[Authorize]
[ApiController]
[Route("api")]
public class ListingRequestsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly WalletService _wallets;
    private readonly NotificationService _notify;
    private readonly AuditService _audit;
    private readonly CoinSettings _coins;

    public ListingRequestsController(AppDbContext db, WalletService wallets, NotificationService notify,
        AuditService audit, IOptions<CoinSettings> coins)
    {
        _db = db;
        _wallets = wallets;
        _notify = notify;
        _audit = audit;
        _coins = coins.Value;
    }

    // Buyer sends a request to a listing
    [HttpPost("listings/{listingId:guid}/requests")]
    public async Task<IActionResult> Send(Guid listingId, CreateListingRequestDto dto)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        if (listing.Status != ListingStatus.Published)
            throw new AppException("العرض غير متاح للطلبات.", "LISTING_NOT_AVAILABLE");
        if (listing.SellerId == CurrentUserId)
            throw new AppException("لا يمكنك إرسال طلب على عرضك.", "VALIDATION_ERROR");

        var exists = await _db.ListingRequests.AnyAsync(r =>
            r.ListingId == listingId && r.BuyerId == CurrentUserId && r.Status == RequestStatus.Pending);
        if (exists)
            throw new AppException("لديك طلب معلّق بالفعل على هذا العرض.", "VALIDATION_ERROR");

        var lr = new ListingRequest
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            BuyerRequestId = dto.BuyerRequestId,
            BuyerId = CurrentUserId,
            SellerId = listing.SellerId,
            Message = dto.Message,
            Status = RequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.ListingRequests.Add(lr);
        _notify.Add(listing.SellerId, NotificationType.NewRequest, "طلب جديد",
            $"وصل طلب جديد على عرضك \"{listing.Title}\".", "ListingRequest", lr.Id);
        _audit.Log(CurrentUserId, "ListingRequestSent", "ListingRequest", lr.Id, ip: Ip);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { lr.Id }, "تم إرسال الطلب إلى البائع."));
    }

    // Seller views incoming requests for a listing
    [HttpGet("seller/listings/{listingId:guid}/requests")]
    public async Task<IActionResult> Incoming(Guid listingId)
    {
        var listing = await _db.Listings.FindAsync(listingId)
            ?? throw new AppException("العرض غير موجود.", "NOT_FOUND", 404);
        if (listing.SellerId != CurrentUserId)
            throw new AppException("غير مصرح.", "FORBIDDEN", 403);

        var items = await _db.ListingRequests
            .Include(r => r.Buyer).Include(r => r.Listing)
            .Where(r => r.ListingId == listingId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<ListingRequestDto>>.Ok(items.Select(Map)));
    }

    // Seller views all incoming requests across their listings
    [HttpGet("seller/requests")]
    public async Task<IActionResult> AllIncoming()
    {
        var items = await _db.ListingRequests
            .Include(r => r.Buyer).Include(r => r.Listing)
            .Where(r => r.SellerId == CurrentUserId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(ApiResponse<IEnumerable<ListingRequestDto>>.Ok(items.Select(Map)));
    }

    // ---- CRITICAL: atomic acceptance, single buyer per listing ----
    [HttpPost("listing-requests/{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id)
    {
        await using var trx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var request = await _db.ListingRequests
                .Include(r => r.Listing)
                .FirstOrDefaultAsync(r => r.Id == id)
                ?? throw new AppException("الطلب غير موجود.", "NOT_FOUND", 404);

            var listing = request.Listing!;
            if (listing.SellerId != CurrentUserId)
                throw new AppException("غير مصرح.", "FORBIDDEN", 403);
            if (listing.Status != ListingStatus.Published)
                throw new AppException("العرض غير متاح.", "LISTING_NOT_AVAILABLE");
            if (request.Status != RequestStatus.Pending)
                throw new AppException("الطلب لم يعد معلّقاً.", "REQUEST_ALREADY_ACCEPTED");

            var alreadyAccepted = await _db.ListingRequests
                .AnyAsync(r => r.ListingId == listing.Id && r.Status == RequestStatus.Accepted);
            if (alreadyAccepted)
                throw new AppException("تم قبول طلب آخر على هذا العرض بالفعل.", "REQUEST_ALREADY_ACCEPTED");

            var sellerWallet = await _wallets.GetByUserAsync(request.SellerId)
                ?? throw new AppException("محفظة البائع غير موجودة.", "NOT_FOUND", 404);
            var buyerWallet = await _wallets.GetByUserAsync(request.BuyerId)
                ?? throw new AppException("محفظة المشتري غير موجودة.", "NOT_FOUND", 404);

            if (sellerWallet.Balance < _coins.DealSellerCost)
                throw new AppException("رصيد المشرط لديك غير كافٍ لإتمام الصفقة.", "INSUFFICIENT_COINS");
            if (buyerWallet.Balance < _coins.DealBuyerCost)
                throw new AppException("رصيد المشتري غير كافٍ لإتمام الصفقة.", "INSUFFICIENT_COINS");

            // Deduct both
            _wallets.Apply(sellerWallet, WalletTransactionType.DealAcceptedSeller, -_coins.DealSellerCost,
                "قبول صفقة (بائع)", "Deal", listing.Id);
            _wallets.Apply(buyerWallet, WalletTransactionType.DealAcceptedBuyer, -_coins.DealBuyerCost,
                "قبول صفقة (مشتري)", "Deal", listing.Id);

            request.Status = RequestStatus.Accepted;
            request.UpdatedAt = DateTime.UtcNow;
            listing.Status = ListingStatus.Selected;
            listing.IsPublished = false;
            listing.UpdatedAt = DateTime.UtcNow;

            // Reject all other pending requests
            var others = await _db.ListingRequests
                .Where(r => r.ListingId == listing.Id && r.Id != request.Id && r.Status == RequestStatus.Pending)
                .ToListAsync();
            foreach (var o in others)
            {
                o.Status = RequestStatus.Rejected;
                o.UpdatedAt = DateTime.UtcNow;
                _notify.Add(o.BuyerId, NotificationType.RequestRejected, "تم رفض طلبك",
                    $"تم اختيار مشترٍ آخر للعرض \"{listing.Title}\".", "Listing", listing.Id);
            }

            var deal = new Deal
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                BuyerRequestId = request.BuyerRequestId,
                ListingRequestId = request.Id,
                SellerId = request.SellerId,
                BuyerId = request.BuyerId,
                SellerCoinCost = _coins.DealSellerCost,
                BuyerCoinCost = _coins.DealBuyerCost,
                Status = DealStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            _db.Deals.Add(deal);

            _notify.Add(request.BuyerId, NotificationType.RequestAccepted, "تم قبول طلبك",
                $"تم قبول طلبك على العرض \"{listing.Title}\".", "Deal", deal.Id);
            _notify.Add(request.SellerId, NotificationType.General, "تمت الصفقة",
                $"قمت بقبول مشترٍ للعرض \"{listing.Title}\".", "Deal", deal.Id);
            _audit.Log(CurrentUserId, "DealAccepted", "Deal", deal.Id, ip: Ip);

            await _db.SaveChangesAsync();
            await trx.CommitAsync();

            return Ok(ApiResponse<DealDto>.Ok(await DealDtoAsync(deal.Id), "تم قبول الطلب وإتمام الصفقة."));
        }
        catch (DbUpdateException)
        {
            await trx.RollbackAsync();
            throw new AppException("تم قبول طلب آخر على هذا العرض بالفعل.", "REQUEST_ALREADY_ACCEPTED", 409);
        }
    }

    [HttpPost("listing-requests/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var request = await _db.ListingRequests.Include(r => r.Listing)
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new AppException("الطلب غير موجود.", "NOT_FOUND", 404);
        if (request.SellerId != CurrentUserId)
            throw new AppException("غير مصرح.", "FORBIDDEN", 403);
        if (request.Status != RequestStatus.Pending)
            throw new AppException("لا يمكن رفض هذا الطلب.", "VALIDATION_ERROR");

        request.Status = RequestStatus.Rejected;
        request.UpdatedAt = DateTime.UtcNow;
        _notify.Add(request.BuyerId, NotificationType.RequestRejected, "تم رفض طلبك",
            $"تم رفض طلبك على العرض \"{request.Listing?.Title}\".", "Listing", request.ListingId);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "تم رفض الطلب."));
    }

    private async Task<DealDto> DealDtoAsync(Guid dealId)
    {
        var d = await _db.Deals.Include(x => x.Listing).Include(x => x.Seller).Include(x => x.Buyer)
            .FirstAsync(x => x.Id == dealId);
        return new DealDto(d.Id, d.ListingId, d.Listing?.Title ?? "", d.SellerId, d.Seller?.FullName ?? "",
            d.BuyerId, d.Buyer?.FullName ?? "", d.SellerCoinCost, d.BuyerCoinCost, d.Status, d.CreatedAt,
            d.Seller?.Email, d.Seller?.PhoneNumber, d.Buyer?.Email, d.Buyer?.PhoneNumber);
    }

    private static ListingRequestDto Map(ListingRequest r) => new(
        r.Id, r.ListingId, r.Listing?.Title ?? "", r.BuyerId, r.Buyer?.FullName ?? "",
        r.SellerId, r.Message, r.Status, r.CreatedAt);
}
