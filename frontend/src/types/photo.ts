export interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  filename: string
  uploadedAt: string
  uploadedBy: {
    id: string
    name: string
    avatar?: string
  }
  likes: number
  isLiked: boolean
  isFeatured: boolean
  tags?: string[]
  metadata?: {
    width: number
    height: number
    size: number
    camera?: string
    settings?: string
  }
}