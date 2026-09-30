namespace Shiftaty.Api.Domain.Enums;

public enum ListingStatus
{
    Draft = 0,
    Published = 1,
    Paused = 2,
    Selected = 3,
    Expired = 4,
    Cancelled = 5,
    Completed = 6
}

public enum RequestStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
    Cancelled = 3,
    Expired = 4
}

public enum DealStatus
{
    Active = 0,
    Completed = 1,
    Cancelled = 2,
    Expired = 3
}

public enum WalletTransactionType
{
    TrialCredit = 0,
    ListingPublish = 1,
    DealAcceptedSeller = 2,
    DealAcceptedBuyer = 3,
    Refund = 4,
    AdminAdjustment = 5,
    Topup = 6
}

public enum ShiftTiming
{
    Day = 0,
    Night = 1
}

public enum ShiftDuration
{
    Full = 0,
    Part = 1
}

public enum AttributeDataType
{
    Text = 0,
    LongText = 1,
    Number = 2,
    Decimal = 3,
    Boolean = 4,
    Date = 5,
    DateTime = 6,
    Time = 7,
    Select = 8,
    MultiSelect = 9,
    Range = 10,
    Currency = 11
}

public enum OtpPurpose
{
    Registration = 0,
    Login = 1,
    ForgotPassword = 2
}

public enum NotificationType
{
    General = 0,
    ListingPublished = 1,
    NewRequest = 2,
    RequestAccepted = 3,
    RequestRejected = 4,
    LowBalance = 5,
    InsufficientBalance = 6,
    ListingPaused = 7
}
