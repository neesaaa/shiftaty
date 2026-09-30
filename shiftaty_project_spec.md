# Shiftaty Marketplace — Project Specification

## 1. Project Overview

Build a full-stack Arabic-first marketplace/platform where:

- **Sellers** publish offers/items/services with complete details.
- **Buyers** browse and filter offers using the hierarchy and detailed filters.
- A buyer can create a **request** describing exactly what they need.
- Sellers receive matching requests and can choose **only one buyer/request** for an offer.
- The platform uses a virtual coin/currency called **"مشرط"**.
- Every new account starts with **100 مشرط** during the free-trial phase.
- Posting an offer costs **1 مشرط**.
- When a seller accepts a buyer/request:
  - Seller pays **1 مشرط**.
  - Buyer pays **1 مشرط**.
  - The accepted transaction is recorded permanently.
- Authentication requires **OTP verification**.
- The site should be primarily **Arabic + RTL**, with English available as a secondary language if needed later.

The system must be designed so the hierarchy shown in the reference diagram can be extended without changing the database schema or source code.

---

# 2. Technology Stack

## Backend

- **.NET 10 / ASP.NET Core Web API**
- Clean Architecture
- Entity Framework Core
- ASP.NET Core Identity or custom Identity-based authentication
- JWT access tokens + refresh tokens
- OTP verification
- FluentValidation
- PostgreSQL
- Redis for caching, OTP throttling, temporary state, and rate limiting where useful
- Swagger / OpenAPI
- Serilog
- Global exception handling
- Health checks
- Docker

## Frontend

- **React**
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- RTL support
- Arabic-first UI
- Form validation using React Hook Form + Zod
- Responsive/mobile-first design

## Database

- **PostgreSQL**

## Infrastructure

- Docker / Docker Compose
- `.env` / environment variables for secrets
- SMTP email provider for OTP and notifications

---

# 3. Core Business Concept

The platform is not a simple flat marketplace.

It has a **recursive hierarchy**.

Example:

```text
Main Category
   └── Option
       └── Option
           └── Option
               └── Final Option / Leaf
```

The reference image uses colors to visually represent levels:

- **Yellow** = top-level categories
- **Blue / Purple** = nested options / lower hierarchy levels
- Every option can open another set of options.
- The exact depth must **not** be fixed.

Example based on the reference:

```text
نساء
├── استقبال
├── Triage
├── Inner
├── Room
│   ├── Room 1
│   ├── Room 2
│   ├── Room 3
│   ├── Room 4
│   ├── Room 5
│   └── Room 6
├── Ward
└── عناية

جراحة
├── استقبال
├── Triage
├── Admission
├── PT
├── General
├── Clinic
├── OR
├── ER
├── Ward
└── ...

باطنة
├── استقبال
├── Triage
├── Inner
├── Ward
└── ...

أطفال
├── استقبال
├── ER
├── Pre
├── Labs
├── Post
├── Ward
└── NICU
```

These examples are seed data only. The system must allow an administrator to add, rename, deactivate, reorder, and nest categories/options.

---

# 4. Hierarchy Requirements

## 4.1 Category Tree

Create a generic table/entity such as:

`CategoryNode`

Suggested properties:

```text
Id
ParentId nullable
NameAr
NameEn nullable
Slug
Level
NodeType
IsActive
SortOrder
CreatedAt
UpdatedAt
```

Important:

- `ParentId` creates the recursive tree.
- `Level` is calculated/stored for fast querying.
- `NodeType` can distinguish category, option, leaf, etc., but business logic should not depend on a fixed number of levels.
- A node may have zero or many children.

## 4.2 Dynamic Selection UI

The seller/buyer should select hierarchy progressively.

Example:

```text
اختر القسم
    ↓
نساء
    ↓
اختر القسم الفرعي
    ↓
استقبال
    ↓
اختر المستوى التالي
    ↓
...
```

When a node is selected:

- Load its children.
- Show the next level.
- If the selected node has no children, it is a leaf.
- Once a leaf is selected, show the corresponding listing fields/filters.

The frontend must not contain hard-coded assumptions such as:

```text
if level === 3
```

Instead, it should ask the API for children.

---

# 5. Dynamic Attributes

The platform must support additional attributes that depend on the selected hierarchy.

For example:

```text
Day / Night
Unit
Price
Shift
نوع
كامل / جزئي
...
```

These fields in the reference image should be treated as **dynamic attributes**, not fixed database columns.

Create entities similar to:

### AttributeDefinition

```text
Id
CategoryNodeId
NameAr
NameEn
Key
DataType
IsRequired
IsFilterable
IsSearchable
SortOrder
IsActive
```

Possible `DataType` values:

```text
Text
LongText
Number
Decimal
Boolean
Date
DateTime
Time
Select
MultiSelect
Range
Currency
```

### AttributeOption

```text
Id
AttributeDefinitionId
LabelAr
LabelEn
Value
SortOrder
IsActive
```

This allows different categories to have different fields.

Example:

```text
Category: Ward
Fields:
- Ward Type
- Day/Night
- Unit
- Price
- Shift
- Capacity
```

Another category can have completely different fields.

---

# 6. Seller Workflow

## 6.1 Create Listing

Seller clicks:

```text
إضافة عرض
```

Steps:

### Step 1 — Select hierarchy

Seller selects:

```text
Category
→ Child
→ Child
→ ...
→ Leaf
```

### Step 2 — Fill dynamic details

Display attributes associated with the selected category.

### Step 3 — Add listing information

Common fields:

```text
Title
Description
Price
Currency
Location
Contact preferences
Availability
Start date
End date
Day/Night
Shift
Quantity
Images
Attachments
Additional notes
```

Only relevant fields should appear.

### Step 4 — Preview

Show a complete Arabic listing preview.

### Step 5 — Publish

Publishing consumes:

```text
1 مشرط
```

The publish operation must be transactional:

```text
Check balance >= 1
→ Create listing
→ Deduct 1 مشرط
→ Create wallet transaction
```

If any step fails, all changes roll back.

---

# 7. Seller Listing / Post

A seller listing should contain:

```text
Id
SellerId
CategoryNodeId
Title
Description
Price
Currency
Location
Status
IsPublished
PublishedAt
ExpiresAt nullable
CreatedAt
UpdatedAt
```

Dynamic attributes should be stored separately, for example:

```text
ListingAttributeValue
```

Suggested fields:

```text
Id
ListingId
AttributeDefinitionId
TextValue nullable
NumberValue nullable
DecimalValue nullable
BooleanValue nullable
DateValue nullable
DateTimeValue nullable
JsonValue nullable
```

This avoids creating hundreds of nullable columns.

---

# 8. Listing Status

Suggested lifecycle:

```text
Draft
Published
Paused
Selected
Expired
Cancelled
Completed
```

Rules:

- Only `Published` listings appear in normal marketplace search.
- A seller can pause/unpublish an offer.
- A selected listing can no longer accept another buyer.
- Expired listings cannot accept new requests.
- Completed/cancelled listings remain in history.

---

# 9. Buyer Experience

## 9.1 Marketplace

Buyer enters:

```text
السوق
```

The marketplace displays available listings.

Each card should show:

```text
العنوان
الفئة
الموقع
السعر
التوفر
أهم الخصائص
وقت النشر
حالة العرض
```

---

# 10. Buyer Filters

The filtering system should be **dynamic** and generated from the selected category.

Common filters:

### Category filters

```text
Main Category
Sub Category
Leaf Category
```

### Price filters

```text
Min Price
Max Price
Exact Price
Currency
```

### Date filters

```text
Available From
Available To
Published From
Published To
```

### Time filters

```text
Day
Night
Morning
Evening
```

### Location filters

```text
Governorate
City
Area
Distance
```

### Availability

```text
Available now
Available later
Full-time
Part-time
```

### Seller filters

```text
Seller
Seller verification status
Seller rating (future-ready)
```

### Dynamic attribute filters

Any attribute marked:

```text
IsFilterable = true
```

must automatically become a filter.

Examples:

```text
Unit
Shift
Room
Ward
ER
NICU
نوع
دوام
```

For numeric attributes:

```text
Min / Max
```

For boolean:

```text
نعم / لا
```

For select:

```text
Dropdown
```

For multi-select:

```text
Checkboxes
```

For dates:

```text
Date range
```

---

# 11. Search

Implement a unified search API.

Example:

```http
GET /api/listings
```

Query parameters can include:

```text
categoryId
search
minPrice
maxPrice
location
availableFrom
availableTo
sortBy
sortDirection
page
pageSize
attribute filters
```

The API must support pagination.

Recommended response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0,
  "totalPages": 0
}
```

Sorting options:

```text
الأحدث
الأقدم
السعر من الأقل للأعلى
السعر من الأعلى للأقل
```

---

# 12. Buyer Request

A buyer can create a request:

```text
طلب جديد
```

A request describes what the buyer needs.

Example:

```text
الفئة: ...
القسم: ...
الوحدة: ...
النوع: ...
الوردية: ...
السعر المطلوب: ...
التاريخ: ...
التفاصيل: ...
```

The request may use exactly the same hierarchy + dynamic attribute system as listings.

Suggested entity:

```text
BuyerRequest
```

Properties:

```text
Id
BuyerId
CategoryNodeId
Title
Description
BudgetMin
BudgetMax
Location
Status
ExpiresAt
CreatedAt
UpdatedAt
```

And:

```text
BuyerRequestAttributeValue
```

for dynamic fields.

---

# 13. Matching Requests to Sellers

When a buyer creates a request, the system finds compatible seller listings.

Matching can be based on:

```text
Category hierarchy
Dynamic attributes
Location
Availability
Price range
Date
Day/Night
Shift
Other selected filters
```

Initially, matching can be rule-based.

Example:

```text
Buyer wants:
Category = أطفال
Unit = NICU
Shift = Night
Budget <= 1000
Date = 2026-10-05
```

Return seller listings satisfying these constraints.

---

# 14. Request / Offer Interaction

A buyer should be able to:

```text
مشاهدة العرض
→ إرسال طلب
```

A seller can see incoming requests for their listing.

Suggested entity:

```text
ListingRequest
```

Properties:

```text
Id
ListingId
BuyerRequestId
BuyerId
SellerId
Status
CreatedAt
UpdatedAt
```

Status:

```text
Pending
Accepted
Rejected
Cancelled
Expired
```

---

# 15. Seller Can Select Only One Buyer

This is a critical business rule.

For each listing:

```text
Only ONE request can become Accepted.
```

When the seller accepts one request:

```text
Accepted
```

all other pending requests for that listing should automatically become:

```text
Rejected
```

The database/service layer must enforce this rule.

Do not rely only on the frontend.

The acceptance operation must be concurrency-safe.

Use a database transaction and/or appropriate PostgreSQL constraints/locking.

---

# 16. Coins — "مشرط"

The virtual currency is called:

```text
مشرط
```

Use integers initially.

Every account starts with:

```text
100 مشرط
```

during the free-trial phase.

---

# 17. Wallet

Create:

```text
Wallet
```

Suggested fields:

```text
Id
UserId
Balance
CreatedAt
UpdatedAt
```

Never modify balance without creating a wallet transaction.

Create:

```text
WalletTransaction
```

Suggested fields:

```text
Id
WalletId
UserId
Type
Amount
BalanceBefore
BalanceAfter
ReferenceType
ReferenceId
DescriptionAr
CreatedAt
```

Transaction types:

```text
TrialCredit
ListingPublish
DealAcceptedSeller
DealAcceptedBuyer
Refund
AdminAdjustment
```

---

# 18. Coin Rules

## Account creation

```text
+100 مشرط
```

Transaction:

```text
TrialCredit +100
```

## Seller publishes listing

```text
-1 مشرط
```

## Seller accepts buyer

```text
Seller -1 مشرط
Buyer  -1 مشرط
```

Therefore:

```text
Seller balance: -1
Buyer balance: -1
```

This operation must happen atomically.

---

# 19. Insufficient Balance

If a seller has:

```text
0 مشرط
```

and tries to publish:

```text
رفض العملية
```

with Arabic message:

```text
رصيد المشرط غير كافٍ لنشر العرض.
```

Similarly, accepting a request requires both sides to have enough balance.

The system should verify both balances before final acceptance.

If either party does not have enough balance:

```text
Do not accept the deal
Do not deduct anything
Do not partially complete the transaction
```

---

# 20. Free Trial

Initial MVP:

```text
Free Trial
```

Every verified account receives:

```text
100 مشرط
```

This should be configurable:

```text
InitialTrialCoins = 100
```

Do not hard-code 100 throughout the application.

Future configuration may include:

```text
Trial duration
Trial coins
Post cost
Acceptance cost
Referral bonus
Paid coin packages
```

---

# 21. Authentication

Authentication must support:

```text
Register
Login
OTP verification
Logout
Refresh token
Forgot password
Reset password
Change password
```

Suggested registration:

```text
الاسم
البريد الإلكتروني
رقم الهاتف (optional/future)
كلمة المرور
تأكيد كلمة المرور
```

After registration:

```text
Send OTP
→ User enters OTP
→ Verify account
→ Create wallet with 100 مشرط
```

---

# 22. OTP

OTP should be configurable for:

```text
Registration
Login (optional configurable)
Forgot Password
Sensitive actions
```

Initial implementation:

```text
Email OTP
```

The user will provide an email account and SMTP credentials via environment variables.

Example environment variables:

```text
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=
```

Never store the email password/SMTP password in source control.

---

# 23. OTP Security

OTP requirements:

```text
6 digits
Expires after configurable period
One-time use
Hashed before storage when possible
Maximum verification attempts
Resend cooldown
Rate limiting
Lockout after repeated failures
```

Suggested settings:

```text
OtpLength = 6
OtpExpirationMinutes = 5
OtpMaxAttempts = 5
OtpResendCooldownSeconds = 60
```

---

# 24. User Roles

Minimum roles:

```text
Buyer
Seller
Admin
```

A single account may eventually act as both:

```text
Buyer + Seller
```

Recommended design:

```text
ApplicationUser
```

with capabilities rather than completely separate identity tables.

Admin can manage:

```text
Users
Categories
Attributes
Attribute options
Listings
Requests
Wallets
Transactions
Trial settings
Platform settings
```

---

# 25. User Profile

Profile should contain:

```text
Id
Name
Email
Phone nullable
ProfileImage nullable
IsEmailVerified
IsPhoneVerified
IsActive
CreatedAt
UpdatedAt
```

Future-ready fields:

```text
City
Area
Bio
Company
Verification status
Rating
```

---

# 26. Notifications

Create a notification system from the beginning.

Notification examples:

```text
تم نشر عرضك بنجاح.
وصل طلب جديد على عرضك.
تم قبول طلبك.
تم رفض طلبك.
رصيد المشرط غير كافٍ.
لديك 10 مشرط متبقية.
تم إيقاف العرض.
```

Channels:

```text
In-app
Email
```

Push/SMS can be added later.

Suggested entity:

```text
Notification
```

---

# 27. Arabic UI / RTL

Most of the site must be Arabic.

Default:

```text
ar
RTL
```

Examples:

```text
الرئيسية
السوق
طلباتي
عروضي
المشرط
الإشعارات
الحساب
تسجيل الدخول
إنشاء حساب
```

All forms and validation messages should be Arabic.

Backend validation messages should support localization.

Do not bake Arabic text into business rules.

---

# 28. Main Frontend Pages

## Public

```text
الرئيسية
السوق
تسجيل الدخول
إنشاء حساب
التحقق من OTP
نسيت كلمة المرور
```

## Authenticated buyer

```text
لوحة التحكم
تصفح العروض
تفاصيل العرض
إنشاء طلب
طلباتي
العروض المطابقة
العروض المقبولة
المفضلة (optional)
المحفظة / المشرط
الإشعارات
الملف الشخصي
```

## Authenticated seller

```text
لوحة التحكم
عروضي
إضافة عرض
تعديل عرض
طلبات العملاء
تفاصيل الطلب
العروض المقبولة
المشرط
الإشعارات
الملف الشخصي
```

## Admin

```text
Dashboard
Users
Categories
Category Tree
Attributes
Attribute Options
Listings
Buyer Requests
Deals
Wallets
Transactions
Notifications
System Settings
```

---

# 29. Category Management UI

Admin must be able to manage the hierarchy visually.

Example:

```text
نساء
├── استقبال
├── Triage
├── Ward
│   ├── Room 1
│   ├── Room 2
│   └── Room 3
└── عناية
```

Admin actions:

```text
إضافة
تعديل
حذف / تعطيل
إعادة ترتيب
نقل node تحت parent آخر
إضافة child
```

Deleting a category with active listings should use soft deletion/deactivation or require migration of the listings.

---

# 30. API Structure

Suggested endpoints:

## Auth

```text
POST /api/auth/register
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Categories

```text
GET /api/categories/root
GET /api/categories/{id}/children
GET /api/categories/tree
POST /api/categories
PUT /api/categories/{id}
DELETE /api/categories/{id}
```

## Attributes

```text
GET /api/categories/{id}/attributes
POST /api/attributes
PUT /api/attributes/{id}
DELETE /api/attributes/{id}

POST /api/attributes/{id}/options
PUT /api/attributes/options/{optionId}
DELETE /api/attributes/options/{optionId}
```

## Listings

```text
GET /api/listings
GET /api/listings/{id}
POST /api/listings
PUT /api/listings/{id}
DELETE /api/listings/{id}
POST /api/listings/{id}/publish
POST /api/listings/{id}/pause
POST /api/listings/{id}/cancel
```

## Buyer requests

```text
GET /api/requests
GET /api/requests/{id}
POST /api/requests
PUT /api/requests/{id}
DELETE /api/requests/{id}
POST /api/requests/{id}/cancel
```

## Listing requests

```text
POST /api/listings/{listingId}/requests
GET /api/seller/listings/{listingId}/requests
POST /api/listing-requests/{id}/accept
POST /api/listing-requests/{id}/reject
```

## Wallet

```text
GET /api/wallet
GET /api/wallet/transactions
```

---

# 31. Deal Acceptance Transaction

The critical acceptance flow:

```text
POST /api/listing-requests/{id}/accept
```

Server algorithm:

```text
BEGIN TRANSACTION

1. Load listing with lock / concurrency protection.
2. Verify listing is Published and not already selected.
3. Load selected buyer request.
4. Verify request is still Pending.
5. Verify seller wallet balance >= 1.
6. Verify buyer wallet balance >= 1.
7. Deduct 1 from seller wallet.
8. Deduct 1 from buyer wallet.
9. Create seller wallet transaction.
10. Create buyer wallet transaction.
11. Mark request = Accepted.
12. Mark listing = Selected.
13. Reject all other pending requests for this listing.
14. Create Deal record.
15. Create notifications.
16. COMMIT.

If anything fails:

ROLLBACK EVERYTHING.
```

---

# 32. Deal Entity

Create:

```text
Deal
```

Suggested fields:

```text
Id
ListingId
BuyerRequestId
SellerId
BuyerId
SellerCoinCost
BuyerCoinCost
Status
CreatedAt
CompletedAt nullable
CancelledAt nullable
```

Statuses:

```text
Active
Completed
Cancelled
Expired
```

The exact historical coin costs must be stored on the deal so future pricing changes do not alter historical records.

---

# 33. Database Entities

Minimum entities:

```text
ApplicationUser
Role
RefreshToken

OtpCode

CategoryNode
AttributeDefinition
AttributeOption

Listing
ListingAttributeValue
ListingImage
ListingAttachment

BuyerRequest
BuyerRequestAttributeValue

ListingRequest
Deal

Wallet
WalletTransaction

Notification
```

Optional:

```text
Favorite
Review
Report
AuditLog
UserSession
SystemSetting
```

---

# 34. PostgreSQL Considerations

Use PostgreSQL indexes for:

```text
Listing.Status
Listing.CategoryNodeId
Listing.SellerId
Listing.PublishedAt
BuyerRequest.CategoryNodeId
ListingRequest.ListingId
ListingRequest.BuyerId
Wallet.UserId
WalletTransaction.UserId
OtpCode.UserId
```

For dynamic attributes, optimize depending on query patterns.

Possible implementation:

```text
Normalized ListingAttributeValue
+
PostgreSQL indexes
```

For flexible/advanced searching, a PostgreSQL `jsonb` representation can also be considered.

Do not blindly use JSON for everything. Keep important searchable relationships normalized.

---

# 35. Security

Implement:

```text
JWT authentication
Refresh-token rotation
Password hashing
OTP protection
Rate limiting
CORS
Input validation
Authorization policies
Role-based access
Object-level authorization
SQL injection protection through EF Core
Secure file upload validation
Maximum request/body size
Audit logging for sensitive operations
```

Never trust:

```text
sellerId
buyerId
wallet balance
coin cost
listing owner
```

from the frontend.

These must always be derived/validated on the server.

---

# 36. Concurrency / Double Acceptance

This requirement is mandatory.

Two sellers/users or two requests must never cause multiple accepted buyers for the same listing.

Example:

```text
Request A → Accept
Request B → Accept
```

at the same time.

The backend must guarantee:

```text
Exactly one Accepted request per Listing.
```

Use PostgreSQL transaction isolation, row-level locking, and/or a unique partial index such as the equivalent of:

```sql
UNIQUE (listing_id)
WHERE status = 'Accepted'
```

where appropriate.

---

# 37. Coin Integrity

Coins are virtual platform credits.

Never allow:

```text
Balance = Balance - 1
```

without an auditable transaction record.

Prefer:

```text
WalletTransaction
```

as the source of historical truth.

Every balance-changing operation must include:

```text
ReferenceType
ReferenceId
Amount
BalanceBefore
BalanceAfter
Timestamp
```

This makes disputes and debugging possible.

---

# 38. File Uploads

Listings may contain:

```text
Images
PDFs
Documents
Other attachments
```

Store metadata in PostgreSQL and actual files in a configurable storage provider.

MVP can support local storage.

Architecture should allow migration to:

```text
Azure Blob Storage
AWS S3
Cloudflare R2
```

later without changing business logic.

---

# 39. Validation Rules

Examples:

### Listing

```text
Title required
Description required
Category leaf required
Price >= 0
At least required dynamic attributes must be filled
Seller must be authenticated
Seller must have >= 1 مشرط when publishing
```

### Buyer request

```text
Category required
Required dynamic attributes required
BudgetMin <= BudgetMax
Expiration must be in the future
```

### Acceptance

```text
Listing must be Published
Request must be Pending
Seller owns listing
Seller balance >= 1
Buyer balance >= 1
No accepted request already exists
```

---

# 40. Search / Filter Architecture

Frontend should build filters dynamically from API metadata.

Example API:

```http
GET /api/categories/{leafId}/filter-schema
```

Response:

```json
{
  "category": {
    "id": 10,
    "nameAr": "NICU"
  },
  "filters": [
    {
      "key": "shift",
      "labelAr": "الوردية",
      "type": "multiSelect",
      "options": [
        { "value": "day", "labelAr": "نهاري" },
        { "value": "night", "labelAr": "ليلي" }
      ]
    },
    {
      "key": "price",
      "labelAr": "السعر",
      "type": "range",
      "min": 0,
      "max": 100000
    }
  ]
}
```

The frontend renders the correct control based on `type`.

---

# 41. UX Principle

The user should never be forced to understand the database structure.

The UI should feel like:

```text
اختيار رئيسي
↓
اختيار فرعي
↓
اختيار أكثر تحديدًا
↓
التفاصيل
↓
البحث / النشر
```

Use expandable/tree navigation and breadcrumb navigation.

Example:

```text
الرئيسية
> أطفال
> NICU
> وردية ليلية
```

---

# 42. Dashboard

Dashboard should show:

```text
رصيد المشرط
العروض المنشورة
العروض النشطة
الطلبات الجديدة
الطلبات المقبولة
العروض المنتهية
```

Seller example:

```text
100 مشرط
↓
بعد نشر 3 عروض
97 مشرط
↓
بعد قبول صفقة
96 مشرط
```

Buyer example:

```text
100 مشرط
↓
بعد قبول صفقة
99 مشرط
```

---

# 43. Audit Log

Important actions should be logged:

```text
User registration
OTP verification
Login failures
Listing creation
Listing publication
Listing modification
Listing deletion
Request creation
Request acceptance
Request rejection
Wallet changes
Admin balance adjustments
Category changes
```

---

# 44. Admin Configuration

Use `SystemSetting` so business constants can be configured.

Examples:

```text
TrialInitialCoins = 100
ListingPublishCost = 1
DealSellerCost = 1
DealBuyerCost = 1
OtpExpirationMinutes = 5
OtpResendCooldownSeconds = 60
```

The frontend should retrieve public-safe settings where necessary.

---

# 45. MVP Scope

The first version should include:

```text
Authentication
OTP email verification
Arabic RTL UI
User profile
100 مشرط trial wallet
Recursive category hierarchy
Dynamic category attributes
Seller listing creation
Listing publishing with 1 مشرط
Marketplace search
Dynamic filters
Buyer requests
Seller incoming requests
Accept one request only
1 مشرط deduction from seller
1 مشرط deduction from buyer
Deal history
Notifications
Admin category management
Admin attribute management
Admin user management
Wallet history
Docker
PostgreSQL
Swagger
```

---

# 46. Future Features

Architecture should remain ready for:

```text
Paid مشرط packages
Subscriptions
Online payments
Reviews
Ratings
Seller verification
Buyer verification
Chat
Real-time notifications
Push notifications
SMS OTP
Favorites
Reports
Dispute system
Refunds
Advanced matching
Recommendation engine
Analytics
Prometheus / Grafana
```

These should not be required for MVP.

---

# 47. Suggested Backend Architecture

```text
src/
├── Domain/
│   ├── Entities/
│   ├── Enums/
│   ├── ValueObjects/
│   └── Interfaces/
│
├── Application/
│   ├── Auth/
│   ├── Categories/
│   ├── Attributes/
│   ├── Listings/
│   ├── Requests/
│   ├── Deals/
│   ├── Wallet/
│   ├── Notifications/
│   └── Common/
│
├── Infrastructure/
│   ├── Persistence/
│   ├── Identity/
│   ├── Email/
│   ├── Storage/
│   ├── Redis/
│   └── Services/
│
└── API/
    ├── Controllers/
    ├── Middleware/
    ├── Filters/
    └── Program.cs
```

---

# 48. Suggested React Architecture

```text
src/
├── app/
├── pages/
├── components/
├── features/
│   ├── auth/
│   ├── categories/
│   ├── listings/
│   ├── requests/
│   ├── deals/
│   ├── wallet/
│   ├── notifications/
│   └── profile/
├── hooks/
├── services/
├── api/
├── schemas/
├── types/
├── utils/
└── i18n/
```

Each feature should be isolated as much as practical.

---

# 49. Docker Compose

MVP local environment:

```text
frontend
backend
postgres
redis
```

Example:

```text
docker-compose.yml
```

Environment variables:

```text
DATABASE_CONNECTION_STRING
JWT_SECRET
JWT_ISSUER
JWT_AUDIENCE
REDIS_CONNECTION_STRING

SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_EMAIL

STORAGE_PATH
```

Never commit `.env`.

Provide:

```text
.env.example
```

---

# 50. Seed Data

Create initial seed data from the reference diagram.

Important: seed data must remain editable through Admin.

Suggested initial top-level categories:

```text
نساء
باطنة
جراحة
أطفال
```

Then add the visible example child categories from the diagram where the labels are clear.

Because the original handwritten diagram contains abbreviated/unclear labels, the seed data should be easy to edit from the Admin panel rather than treating every handwritten label as permanent business logic.

---

# 51. Error Handling

Arabic-friendly API errors.

Example:

```json
{
  "success": false,
  "message": "رصيد المشرط غير كافٍ.",
  "code": "INSUFFICIENT_COINS"
}
```

Suggested error codes:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
NOT_FOUND
INSUFFICIENT_COINS
LISTING_NOT_AVAILABLE
REQUEST_ALREADY_ACCEPTED
OTP_INVALID
OTP_EXPIRED
OTP_TOO_MANY_ATTEMPTS
```

---

# 52. Transactional Rules Summary

## Publish listing

```text
Seller balance >= 1
        ↓
Create/publish listing
        ↓
Deduct 1 مشرط
        ↓
Create wallet transaction
```

## Accept request

```text
Listing available?
    ↓ yes
Request pending?
    ↓ yes
Seller balance >= 1?
    ↓ yes
Buyer balance >= 1?
    ↓ yes
Transaction
    ├── Seller -1
    ├── Buyer -1
    ├── Request = Accepted
    ├── Listing = Selected
    ├── Other requests = Rejected
    └── Create Deal
```

Everything must be atomic.

---

# 53. Definition of Done

The MVP is complete when:

- A user can register.
- User receives OTP and verifies email.
- Verified user receives 100 مشرط exactly once.
- User can log in securely.
- Admin can build an unlimited-depth category tree.
- Admin can attach dynamic fields to any category.
- Seller can select category levels dynamically.
- Seller can fill all required details.
- Seller can publish only with sufficient مشرط.
- Publishing consumes exactly 1 مشرط.
- Buyers can browse listings.
- Buyers can filter by hierarchy and dynamic fields.
- Buyers can create requests.
- Sellers can see matching/incoming requests.
- Seller can accept only one request per listing.
- Acceptance deducts exactly 1 مشرط from seller and 1 from buyer.
- No partial coin deduction is possible on failure.
- All wallet operations are auditable.
- Arabic RTL is the default UI.
- Backend APIs are documented in Swagger.
- PostgreSQL migrations work from a clean database.
- Docker Compose starts the complete MVP stack.
- Authorization prevents users from editing/accepting resources they do not own.
- Concurrent acceptance attempts cannot produce more than one accepted buyer.

---

# 54. Important Implementation Principle

Do **not** model the image literally as four fixed categories and a fixed number of levels.

Model it as:

```text
Category Tree
+
Dynamic Attributes
+
Listings
+
Buyer Requests
+
Matching
+
Wallet / مشرط
+
Deal Transactions
```

This makes the platform extensible.

The same backend can support:

```text
نساء
→ استقبال
→ Triage
→ Room
→ Room 1
```

or:

```text
Any New Category
→ Option A
→ Option B
→ Option C
→ ...
→ Unlimited nested levels
```

without changing the database schema.

---

# 55. Recommended Development Order

```text
1. Solution setup + Clean Architecture
2. PostgreSQL + EF Core
3. Identity + JWT + refresh token
4. OTP email service
5. User/profile
6. Wallet + 100 مشرط trial credit
7. Recursive categories
8. Dynamic attributes
9. Seller listing CRUD
10. Publish + 1 مشرط
11. Marketplace search/filter
12. Buyer requests
13. Seller request management
14. Atomic single-buyer acceptance
15. Deal history
16. Notifications
17. Admin panel
18. Audit logs
19. Docker Compose
20. Tests
```

---

# 56. Testing Requirements

Create tests for the most important business rules.

### Wallet

```text
New verified user gets exactly 100
Publishing costs exactly 1
Cannot publish with 0
Accepted deal costs 1 seller + 1 buyer
No duplicate deductions
Rollback works
```

### Listing

```text
Only owner can edit
Only valid hierarchy can be selected
Required dynamic attributes validated
```

### Acceptance

```text
One accepted request maximum
Concurrent acceptance is safe
Other pending requests are rejected
Insufficient buyer coins prevents acceptance
Insufficient seller coins prevents acceptance
No partial transaction
```

### Authentication

```text
Invalid OTP
Expired OTP
Too many attempts
Resend cooldown
Password reset
Refresh token rotation
```

---

# 57. Final Product Goal

The final product should behave as an Arabic-first marketplace where users can navigate a flexible hierarchy, publish highly detailed offers, describe what they need, filter/match precisely, and complete a single accepted buyer-seller deal using the platform's **مشرط** credit system.

The architecture must prioritize:

```text
Correctness
Security
Atomic transactions
Dynamic hierarchy
Dynamic filters
Arabic RTL UX
Scalability
Auditability
Future extensibility
```
