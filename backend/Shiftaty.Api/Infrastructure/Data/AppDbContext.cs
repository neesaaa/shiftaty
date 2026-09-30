using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;

namespace Shiftaty.Api.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<CategoryNode> CategoryNodes => Set<CategoryNode>();
    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();
    public DbSet<AttributeOption> AttributeOptions => Set<AttributeOption>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingAttributeValue> ListingAttributeValues => Set<ListingAttributeValue>();
    public DbSet<ListingImage> ListingImages => Set<ListingImage>();
    public DbSet<BuyerRequest> BuyerRequests => Set<BuyerRequest>();
    public DbSet<BuyerRequestAttributeValue> BuyerRequestAttributeValues => Set<BuyerRequestAttributeValue>();
    public DbSet<ListingRequest> ListingRequests => Set<ListingRequest>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<ApplicationUser>().ToTable("Users");
        b.Entity<ApplicationRole>().ToTable("Roles");
        b.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<Guid>>().ToTable("UserRoles");
        b.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<Guid>>().ToTable("UserClaims");
        b.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<Guid>>().ToTable("UserLogins");
        b.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        b.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<Guid>>().ToTable("UserTokens");

        b.Entity<CategoryNode>(e =>
        {
            e.HasOne(x => x.Parent).WithMany(x => x.Children)
                .HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.ParentId);
            e.HasIndex(x => x.Slug);
            e.Property(x => x.NameAr).HasMaxLength(200);
        });

        b.Entity<AttributeDefinition>(e =>
        {
            e.HasOne(x => x.CategoryNode).WithMany(x => x.Attributes)
                .HasForeignKey(x => x.CategoryNodeId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.CategoryNodeId);
        });

        b.Entity<AttributeOption>(e =>
        {
            e.HasOne(x => x.AttributeDefinition).WithMany(x => x.Options)
                .HasForeignKey(x => x.AttributeDefinitionId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Listing>(e =>
        {
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.HasOne(x => x.Seller).WithMany().HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CategoryNode).WithMany().HasForeignKey(x => x.CategoryNodeId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CategoryNodeId);
            e.HasIndex(x => x.SellerId);
            e.HasIndex(x => x.PublishedAt);
        });

        b.Entity<ListingAttributeValue>(e =>
        {
            e.Property(x => x.NumberValue).HasPrecision(18, 4);
            e.HasOne(x => x.Listing).WithMany(x => x.AttributeValues).HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AttributeDefinition).WithMany().HasForeignKey(x => x.AttributeDefinitionId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ListingImage>(e =>
            e.HasOne(x => x.Listing).WithMany(x => x.Images).HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Cascade));

        b.Entity<BuyerRequest>(e =>
        {
            e.Property(x => x.BudgetMin).HasPrecision(18, 2);
            e.Property(x => x.BudgetMax).HasPrecision(18, 2);
            e.HasOne(x => x.Buyer).WithMany().HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CategoryNode).WithMany().HasForeignKey(x => x.CategoryNodeId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.CategoryNodeId);
        });

        b.Entity<BuyerRequestAttributeValue>(e =>
        {
            e.Property(x => x.NumberValue).HasPrecision(18, 4);
            e.HasOne(x => x.BuyerRequest).WithMany(x => x.AttributeValues).HasForeignKey(x => x.BuyerRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AttributeDefinition).WithMany().HasForeignKey(x => x.AttributeDefinitionId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ListingRequest>(e =>
        {
            e.HasOne(x => x.Listing).WithMany(x => x.Requests).HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Buyer).WithMany().HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Seller).WithMany().HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.ListingId);
            e.HasIndex(x => x.BuyerId);
            // CRITICAL: at most one Accepted request per listing (concurrency-safe single-buyer rule)
            e.HasIndex(x => x.ListingId)
                .IsUnique()
                .HasFilter("\"Status\" = 1")
                .HasDatabaseName("IX_ListingRequests_OneAccepted_PerListing");
        });

        b.Entity<Deal>(e =>
        {
            e.HasOne(x => x.Listing).WithMany().HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Seller).WithMany().HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Buyer).WithMany().HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.ListingId).IsUnique();
        });

        b.Entity<Wallet>(e =>
        {
            e.HasOne(x => x.User).WithOne(x => x.Wallet).HasForeignKey<Wallet>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId).IsUnique();
        });

        b.Entity<WalletTransaction>(e =>
        {
            e.HasOne(x => x.Wallet).WithMany(x => x.Transactions).HasForeignKey(x => x.WalletId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId);
        });

        b.Entity<Notification>(e => e.HasIndex(x => x.UserId));
        b.Entity<OtpCode>(e => e.HasIndex(x => x.UserId));
        b.Entity<SystemSetting>(e => e.HasIndex(x => x.Key).IsUnique());
        b.Entity<RefreshToken>(e =>
        {
            e.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.Token);
        });
    }
}
