export interface Session {
  id: string
  title: string
  description?: string
  accessCode?: string
  status: 'active' | 'paused' | 'ended'
  isPublic: boolean
  settings?: any
  watermarkEnabled: boolean
  watermarkText?: string
  reviewMode: boolean
  autoTagEnabled: boolean
  language?: string
  totalPhotos: number
  publishedPhotos: number
  pendingPhotos?: number
  rejectedPhotos?: number
  totalViews: number
  uniqueViewers: number
  duration?: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  endedAt?: string
  creatorUsername: string
  creatorDisplayName?: string
}

export interface SessionSettings {
  isPublic: boolean
  allowDownload: boolean
  allowComments: boolean
  allowLikes: boolean
  watermark: {
    enabled: boolean
    text?: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity: number
  }
  autoApprove: boolean
  maxPhotos?: number
  expiresAt?: string
  tags: string[]
}

export interface SessionStats {
  totalPhotos: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalDownloads: number
  activeViewers: number
  peakViewers: number
}

export interface Photo {
  id: string
  sessionId: string
  filename: string
  originalName: string
  title?: string
  description?: string
  tags: string[]
  metadata: PhotoMetadata
  urls: PhotoUrls
  status: 'processing' | 'ready' | 'failed'
  isApproved: boolean
  isFeatured: boolean
  stats: PhotoStats
  uploadedBy: {
    id: string
    username: string
    displayName?: string
  }
  createdAt: string
  updatedAt: string
}

export interface PhotoMetadata {
  size: number
  width: number
  height: number
  format: string
  colorSpace?: string
  exif?: {
    camera?: string
    lens?: string
    focalLength?: string
    aperture?: string
    shutterSpeed?: string
    iso?: string
    flash?: string
    dateTaken?: string
    gps?: {
      latitude: number
      longitude: number
    }
  }
  ai?: {
    tags: string[]
    faces: number
    objects: string[]
    colors: string[]
    quality: number
  }
}

export interface PhotoUrls {
  original: string
  large: string
  medium: string
  small: string
  thumbnail: string
  watermarked?: string
}

export interface PhotoStats {
  views: number
  likes: number
  comments: number
  downloads: number
}

export interface Comment {
  id: string
  photoId: string
  content: string
  author: {
    id: string
    username: string
    displayName?: string
    avatar?: string
  }
  isApproved: boolean
  createdAt: string
  updatedAt: string
}

export interface SessionCreateRequest {
  title: string
  description?: string
  type: 'wedding' | 'event' | 'portrait' | 'commercial' | 'other'
  settings: Partial<SessionSettings>
}

export interface SessionUpdateRequest {
  title?: string
  description?: string
  settings?: Partial<SessionSettings>
}

export interface PhotoUploadRequest {
  sessionId: string
  files: File[]
  title?: string
  description?: string
  tags?: string[]
}

export interface PhotoUpdateRequest {
  title?: string
  description?: string
  tags?: string[]
  isApproved?: boolean
  isFeatured?: boolean
}

export interface SessionJoinRequest {
  accessCode: string
}

export interface SessionJoinResponse {
  session: Session
  photos: Photo[]
  hasMore: boolean
  nextCursor?: string
}

export interface PhotoListResponse {
  photos: Photo[]
  hasMore: boolean
  nextCursor?: string
  total: number
}

export interface CommentCreateRequest {
  photoId: string
  content: string
}

export interface CommentListResponse {
  comments: Comment[]
  hasMore: boolean
  nextCursor?: string
  total: number
}

export interface SessionFilter {
  status?: Session['status']
  type?: 'wedding' | 'event' | 'portrait' | 'commercial' | 'other'
  search?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'photos'
  sortOrder?: 'asc' | 'desc'
}

export interface PhotoFilter {
  status?: Photo['status']
  isApproved?: boolean
  isFeatured?: boolean
  search?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'views' | 'likes'
  sortOrder?: 'asc' | 'desc'
}