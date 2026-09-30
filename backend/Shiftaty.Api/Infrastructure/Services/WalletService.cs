using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Infrastructure.Services;

public class WalletService
{
    private readonly AppDbContext _db;

    public WalletService(AppDbContext db) => _db = db;

    public async Task<Wallet> CreateWalletAsync(Guid userId, int initialCoins)
    {
        var wallet = new Wallet
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Balance = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Wallets.Add(wallet);
        await _db.SaveChangesAsync();

        if (initialCoins > 0)
            await ApplyAsync(wallet, WalletTransactionType.TrialCredit, initialCoins,
                "رصيد الفترة التجريبية المجاني", null, null);

        return wallet;
    }

    /// <summary>Applies a balance change and records an auditable transaction. Amount is signed (+/-).
    /// Does NOT call SaveChanges — caller controls the transaction scope.</summary>
    public WalletTransaction Apply(Wallet wallet, WalletTransactionType type, int amount,
        string descriptionAr, string? referenceType, Guid? referenceId)
    {
        var before = wallet.Balance;
        var after = before + amount;
        if (after < 0)
            throw new AppException("رصيد المشرط غير كافٍ.", "INSUFFICIENT_COINS");

        wallet.Balance = after;
        wallet.UpdatedAt = DateTime.UtcNow;

        var tx = new WalletTransaction
        {
            Id = Guid.NewGuid(),
            WalletId = wallet.Id,
            UserId = wallet.UserId,
            Type = type,
            Amount = amount,
            BalanceBefore = before,
            BalanceAfter = after,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            DescriptionAr = descriptionAr,
            CreatedAt = DateTime.UtcNow
        };
        _db.WalletTransactions.Add(tx);
        return tx;
    }

    private async Task<WalletTransaction> ApplyAsync(Wallet wallet, WalletTransactionType type, int amount,
        string descriptionAr, string? referenceType, Guid? referenceId)
    {
        var tx = Apply(wallet, type, amount, descriptionAr, referenceType, referenceId);
        await _db.SaveChangesAsync();
        return tx;
    }

    public Task<Wallet?> GetByUserAsync(Guid userId) =>
        _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
}
