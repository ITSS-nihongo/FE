// Base types for the application

export interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  phoneNumber?: string
  address?: string
  numberOfKids: number
  createdAt: string
  updatedAt: string
}

export interface Place {
  id: string
  name: string
  description?: string
  address: string
  latitude: number
  longitude: number
  placeType: 'INDOOR' | 'OUTDOOR'
  minAge: number
  maxAge: number
  area?: number
  openingTime?: string
  closingTime?: string
  phoneNumber?: string
  website?: string
  imageUrl?: string
  averageRating: number
  totalReviews: number
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface Review {
  id: string
  rating: number
  comment?: string
  userId: string
  placeId: string
  createdAt: string
  updatedAt: string
  user?: User
}

export interface Favorite {
  id: string
  userId: string
  placeId: string
  createdAt: string
  place?: Place
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  phoneNumber?: string
  address?: string
  numberOfKids?: number
}

export interface PlaceFilters {
  search?: string
  placeType?: 'INDOOR' | 'OUTDOOR'
  minAge?: number
  maxAge?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  places: T[]
  total: number
}

export interface ApiError {
  error: string
}
