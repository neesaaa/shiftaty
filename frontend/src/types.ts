export interface ApiResponse<T> {
  success: boolean
  message?: string
  code?: string
  data?: T
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface User {
  id: string
  fullName: string
  email: string
  phone?: string | null
  roles: string[]
  balance: number
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: User
  devOtp?: string | null
}

export interface CategoryNode {
  id: string
  parentId: string | null
  nameAr: string
  nameEn?: string | null
  slug: string
  level: number
  nodeType: string
  isActive: boolean
  sortOrder: number
  hasChildren: boolean
}

export type AttributeDataType =
  | 'Text' | 'LongText' | 'Number' | 'Decimal' | 'Boolean' | 'Date'
  | 'DateTime' | 'Time' | 'Select' | 'MultiSelect' | 'Range' | 'Currency'

export interface AttributeOption {
  id: string
  labelAr: string
  labelEn?: string | null
  value: string
  sortOrder: number
}

export interface AttributeDefinition {
  id: string
  categoryNodeId: string
  nameAr: string
  nameEn?: string | null
  key: string
  dataType: number | string
  isRequired: boolean
  isFilterable: boolean
  isSearchable: boolean
  sortOrder: number
  options: AttributeOption[]
}

export interface AttributeValue {
  attributeDefinitionId: string
  text?: string | null
  number?: number | null
  boolean?: boolean | null
  date?: string | null
  json?: string | null
}

export type ListingStatus =
  | 'Draft' | 'Published' | 'Paused' | 'Selected' | 'Expired' | 'Cancelled' | 'Completed'

export type ShiftTiming = 'Day' | 'Night'
export type ShiftDuration = 'Full' | 'Part'

export interface Listing {
  id: string
  sellerId: string
  sellerName: string
  categoryNodeId: string
  categoryName: string
  title: string
  description: string
  price: number
  currency: string
  location?: string | null
  governorate?: string | null
  status: number | ListingStatus
  isPublished: boolean
  shiftTiming: number | ShiftTiming
  shiftDuration: number | ShiftDuration
  publishedAt?: string | null
  availableFrom?: string | null
  availableTo?: string | null
  createdAt: string
  attributes: AttributeValue[]
  images: string[]
  requestCount: number
}

export interface BuyerRequest {
  id: string
  buyerId: string
  buyerName: string
  categoryNodeId: string
  categoryName: string
  title: string
  description: string
  budgetMin?: number | null
  budgetMax?: number | null
  location?: string | null
  status: number | string
  expiresAt?: string | null
  createdAt: string
}

export interface ListingRequest {
  id: string
  listingId: string
  listingTitle: string
  buyerId: string
  buyerName: string
  sellerId: string
  message?: string | null
  status: number | string
  createdAt: string
}

export interface WalletTransaction {
  id: string
  type: number | string
  amount: number
  balanceBefore: number
  balanceAfter: number
  descriptionAr: string
  createdAt: string
}

export interface Notification {
  id: string
  type: number | string
  titleAr: string
  bodyAr: string
  isRead: boolean
  createdAt: string
}

export interface Deal {
  id: string
  listingId: string
  listingTitle: string
  sellerId: string
  sellerName: string
  buyerId: string
  buyerName: string
  sellerCoinCost: number
  buyerCoinCost: number
  status: number | string
  createdAt: string
  sellerEmail?: string | null
  sellerPhone?: string | null
  buyerEmail?: string | null
  buyerPhone?: string | null
}

export interface AdminStats {
  totalUsers: number
  totalListings: number
  publishedListings: number
  totalRequests: number
  totalDeals: number
  totalCategories: number
  coinsInCirculation: number
}

export interface AdminUser {
  id: string
  fullName: string
  email: string
  roles: string[]
  isActive: boolean
  balance: number
  createdAt: string
}
