using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Shiftaty.Api.Application.Common;
using Shiftaty.Api.Domain.Entities;
using Shiftaty.Api.Domain.Enums;
using Shiftaty.Api.Infrastructure.Data;

namespace Shiftaty.Api.Infrastructure.Services;

public static class DbSeeder
{
    public static readonly string[] Roles = { "Admin", "Seller", "Buyer" };

    public static async Task SeedAsync(IServiceProvider sp)
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var roleManager = sp.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var wallets = sp.GetRequiredService<WalletService>();
        var coins = sp.GetRequiredService<IOptions<CoinSettings>>().Value;
        var adminCfg = sp.GetRequiredService<IOptions<AdminSeedSettings>>().Value;

        await db.Database.MigrateAsync();

        foreach (var role in Roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new ApplicationRole(role));

        // Admin user
        var admin = await userManager.FindByEmailAsync(adminCfg.Email);
        if (admin == null)
        {
            admin = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = adminCfg.Email,
                Email = adminCfg.Email,
                EmailConfirmed = true,
                FullName = adminCfg.FullName,
                IsActive = true
            };
            var res = await userManager.CreateAsync(admin, adminCfg.Password);
            if (res.Succeeded)
            {
                await userManager.AddToRolesAsync(admin, new[] { "Admin", "Seller", "Buyer" });
                await wallets.CreateWalletAsync(admin.Id, coins.TrialInitialCoins);
            }
        }

        await SeedSettingsAsync(db, coins);
        await SeedCategoriesAsync(db);
    }

    private static async Task SeedSettingsAsync(AppDbContext db, CoinSettings coins)
    {
        if (await db.SystemSettings.AnyAsync()) return;
        db.SystemSettings.AddRange(
            Setting("TrialInitialCoins", coins.TrialInitialCoins.ToString(), "رصيد البداية التجريبي", true),
            Setting("ListingPublishCost", coins.ListingPublishCost.ToString(), "تكلفة نشر العرض", true),
            Setting("DealSellerCost", coins.DealSellerCost.ToString(), "تكلفة قبول الصفقة للبائع", true),
            Setting("DealBuyerCost", coins.DealBuyerCost.ToString(), "تكلفة قبول الصفقة للمشتري", true),
            Setting("CoinName", "مشرط", "اسم العملة الافتراضية", true)
        );
        await db.SaveChangesAsync();
    }

    private static SystemSetting Setting(string k, string v, string d, bool pub) => new()
    {
        Id = Guid.NewGuid(), Key = k, Value = v, DescriptionAr = d, IsPublic = pub, UpdatedAt = DateTime.UtcNow
    };

    private static async Task SeedCategoriesAsync(AppDbContext db)
    {
        // Detect the old Arabic tree from an earlier version and replace it with the
        // English hierarchy (categories -> units/rooms -> sub-rooms) below.
        var hasOldTree = await db.CategoryNodes.AnyAsync(c =>
            c.NameAr == "نساء" || c.NameAr == "أطفال" || c.NameAr == "باطنة");

        if (await db.CategoryNodes.AnyAsync())
        {
            if (!hasOldTree) return; // already seeded with the current tree

            db.AttributeOptions.RemoveRange(await db.AttributeOptions.ToListAsync());
            await db.SaveChangesAsync();
            db.AttributeDefinitions.RemoveRange(await db.AttributeDefinitions.ToListAsync());
            await db.SaveChangesAsync();
            // Delete deepest level first to satisfy the self-referencing FK (Restrict).
            foreach (var level in new[] { 2, 1, 0 })
            {
                db.CategoryNodes.RemoveRange(await db.CategoryNodes.Where(c => c.Level == level).ToListAsync());
                await db.SaveChangesAsync();
            }
        }

        NodeSpec Leaf(string name) => new(name, null);
        NodeSpec Option(string name, params NodeSpec[] children) => new(name, children);

        // Each category (yellow level) has its own distinct set of units/rooms (blue level).
        // OB-GYN additionally branches a third level under "Reception" and "Clinic".
        var tree = new (string Name, NodeSpec[] Children)[]
        {
            ("Pediatrics", new[]
            {
                Leaf("Reception"), Leaf("Triage"), Leaf("Inner"),
                Leaf("Room 1"), Leaf("Room 2"), Leaf("Room 3"), Leaf("Room 4"), Leaf("Room 5"), Leaf("Room 6"),
                Leaf("Ward"), Leaf("Clinic"), Leaf("Duty"), Leaf("Post"), Leaf("Shift"),
            }),
            ("Surgery", new[]
            {
                Leaf("Reception"), Leaf("Triage"), Leaf("Admission"), Leaf("PT"), Leaf("General"),
                Leaf("Clinic"), Leaf("OR"), Leaf("Operation"), Leaf("ER"), Leaf("Ward"),
                Leaf("Duty"), Leaf("Post"), Leaf("Shift"),
            }),
            ("Internal Medicine", new[]
            {
                Leaf("Reception"), Leaf("Triage"), Leaf("Inner"), Leaf("Ward"),
                Leaf("Clinic"), Leaf("Duty"), Leaf("Post"), Leaf("Shift"),
            }),
            ("OB-GYN", new[]
            {
                Option("Reception", Leaf("ER"), Leaf("Pre"), Leaf("Labs"), Leaf("Post"), Leaf("Ward"), Leaf("NICU")),
                Option("Clinic", Leaf("Urogyne"), Leaf("Gyne"), Leaf("Obs")),
                Leaf("Duty"), Leaf("Shift"),
            }),
        };

        void AddChildren(CategoryNode parent, NodeSpec[] specs, int level)
        {
            int order = 0;
            foreach (var spec in specs)
            {
                var node = new CategoryNode
                {
                    Id = Guid.NewGuid(),
                    ParentId = parent.Id,
                    NameAr = spec.Name,
                    NameEn = spec.Name,
                    Slug = Slugify($"{parent.NameAr}-{spec.Name}"),
                    Level = level,
                    NodeType = spec.Children != null ? "option" : "leaf",
                    IsActive = true,
                    SortOrder = order++,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.CategoryNodes.Add(node);
                if (spec.Children != null)
                    AddChildren(node, spec.Children, level + 1);
            }
        }

        int rootOrder = 0;
        foreach (var (name, children) in tree)
        {
            var root = new CategoryNode
            {
                Id = Guid.NewGuid(),
                NameAr = name,
                NameEn = name,
                Slug = Slugify(name),
                Level = 0,
                NodeType = "category",
                IsActive = true,
                SortOrder = rootOrder++,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.CategoryNodes.Add(root);
            AddChildren(root, children, 1);
        }
        await db.SaveChangesAsync();
    }

    private record NodeSpec(string Name, NodeSpec[]? Children);

    private static string Slugify(string input)
    {
        var slug = input.Trim().Replace(" ", "-");
        return $"{slug}-{Guid.NewGuid().ToString()[..8]}";
    }
}
