// API Request Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role: 'photographer' | 'client'
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  bio?: string
  avatar?: string
}

export interface CreateSessionRequest {
  title: string
  description?: string
  location?: string
  scheduledAt?: string
  isPrivate?: boolean
  maxViewers?: number
  settings?: SessionSettings
}

export interface UpdateSessionRequest {
  title?: string
  description?: string
  location?: string
  scheduledAt?: string
  isPrivate?: boolean
  maxViewers?: number
  settings?: SessionSettings
}

export interface JoinSessionRequest {
  sessionId: string
  accessCode?: string
}

export interface UploadPhotoRequest {
  sessionId: string
  file: File
  caption?: string
  metadata?: PhotoMetadata
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface SessionResponse {
  session: Session
  photos: Photo[]
  participants: SessionParticipant[]
}

export interface PhotoResponse {
  photo: Photo
}

export interface PhotosResponse {
  photos: Photo[]
  pagination: PaginationMeta
}

export interface SessionsResponse {
  sessions: Session[]
  pagination: PaginationMeta
}

export interface UploadResponse {
  photo: Photo
  uploadUrl?: string
}

// Core Entity Types
export interface User {
  id: string
  email: string
  name: string
  role: 'photographer' | 'client' | 'admin'
  avatar?: string
  bio?: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
  profile?: UserProfile
}

export interface UserProfile {
  website?: string
  instagram?: string
  twitter?: string
  portfolio?: string
  location?: string
  phone?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    showEmail: boolean
    showPhone: boolean
    allowDirectMessages: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  language: string
}

export interface Session {
  id: string
  title: string
  description?: string
  location?: string
  photographerId: string
  photographer: User
  status: SessionStatus
  isPrivate: boolean
  accessCode?: string
  maxViewers?: number
  currentViewers: number
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  pausedAt?: string
  createdAt: string
  updatedAt: string
  settings: SessionSettings
  stats: SessionStats
}

export type SessionStatus = 
  | 'scheduled'
  | 'live'
  | 'paused'
  | 'ended'
  | 'cancelled'

export interface SessionSettings {
  allowDownloads: boolean
  allowLikes: boolean
  allowComments: boolean
  autoApprovePhotos: boolean
  watermarkEnabled: boolean
  qualitySettings: {
    preview: 'low' | 'medium' | 'high'
    download: 'original' | 'compressed'
  }
  notifications: {
    newPhoto: boolean
    newViewer: boolean
    sessionEnd: boolean
  }
}

export interface SessionStats {
  totalPhotos: number
  totalLikes: number
  totalDownloads: number
  totalViews: number
  peakViewers: number
  duration: number // in seconds
}

export interface SessionParticipant {
  id: string
  sessionId: string
  userId?: string
  name: string
  role: 'photographer' | 'viewer'
  joinedAt: string
  leftAt?: string
  isOnline: boolean
}

export interface Photo {
  id: string
  sessionId: string
  photographerId: string
  filename: string
  originalName: string
  caption?: string
  url: string
  thumbnailUrl: string
  downloadUrl?: string
  size: number
  width: number
  height: number
  format: string
  isFeatured: boolean
  isApproved: boolean
  likes: number
  downloads: number
  views: number
  uploadedAt: string
  metadata: PhotoMetadata
  tags: string[]
}

export interface PhotoMetadata {
  camera?: string
  lens?: string
  settings?: {
    iso?: number
    aperture?: string
    shutterSpeed?: string
    focalLength?: string
  }
  location?: {
    latitude?: number
    longitude?: number
    address?: string
  }
  exif?: Record<string, any>
}

// Utility Types
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface FilterParams {
  status?: SessionStatus
  isPrivate?: boolean
  photographerId?: string
  startDate?: string
  endDate?: string
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string
  data: any
  timestamp: string
}

export interface PhotoUploadEvent extends WebSocketEvent {
  type: 'photo:uploaded'
  data: {
    photo: Photo
    sessionId: string
  }
}

export interface PhotoLikeEvent extends WebSocketEvent {
  type: 'photo:liked' | 'photo:unliked'
  data: {
    photoId: string
    sessionId: string
    likes: number
    userId?: string
  }
}

export interface PhotoDeleteEvent extends WebSocketEvent {
  type: 'photo:deleted'
  data: {
    photoId: string
    sessionId: string
  }
}

export interface SessionUpdateEvent extends WebSocketEvent {
  type: 'session:updated'
  data: {
    session: Partial<Session>
    sessionId: string
  }
}

export interface SessionEndEvent extends WebSocketEvent {
  type: 'session:ended'
  data: {
    sessionId: string
    endedAt: string
  }
}

export interface ViewerJoinEvent extends WebSocketEvent {
  type: 'viewer:joined'
  data: {
    sessionId: string
    participant: SessionParticipant
    currentViewers: number
  }
}

export interface ViewerLeaveEvent extends WebSocketEvent {
  type: 'viewer:left'
  data: {
    sessionId: string
    participantId: string
    currentViewers: number
  }
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: any
  field?: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// Upload Types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadConfig {
  maxFileSize: number // in bytes
  allowedFormats: string[]
  maxFiles: number
  chunkSize?: number
}

// Search Types
export interface SearchParams {
  query: string
  filters?: {
    type?: 'sessions' | 'photos' | 'users'
    dateRange?: {
      start: string
      end: string
    }
    tags?: string[]
    location?: string
  }
  pagination?: PaginationParams
}

export interface SearchResult<T> {
  items: T[]
  total: number
  query: string
  suggestions?: string[]
  facets?: Record<string, any>
}