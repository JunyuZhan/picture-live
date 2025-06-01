import { api } from './client'
import type {
  UploadPhotoRequest,
  PhotoResponse,
  PhotosResponse,
  Photo,
  PhotoMetadata,
  PaginationParams,
  UploadProgress,
  ApiResponse,
} from '@/types/api'

/**
 * 照片相关API服务
 */
export class PhotoApi {
  /**
   * 上传照片
   */
  async uploadPhoto(
    sessionId: string,
    file: File,
    options?: {
      caption?: string
      metadata?: Partial<PhotoMetadata>
      onProgress?: (progress: UploadProgress) => void
    }
  ): Promise<Photo> {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('sessionId', sessionId)
    
    if (options?.caption) {
      formData.append('caption', options.caption)
    }
    
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata))
    }

    const response = await api.upload<Photo>(
      '/photos/upload',
      formData,
      (progress) => {
        if (options?.onProgress) {
          options.onProgress({
            loaded: (progress / 100) * file.size,
            total: file.size,
            percentage: progress,
          })
        }
      }
    )
    return response.data!
  }

  /**
   * 批量上传照片
   */
  async uploadPhotos(
    sessionId: string,
    files: File[],
    options?: {
      onProgress?: (progress: UploadProgress) => void
      onFileProgress?: (fileIndex: number, progress: UploadProgress) => void
    }
  ): Promise<Photo[]> {
    const formData = new FormData()
    formData.append('sessionId', sessionId)
    
    files.forEach((file, index) => {
      formData.append('photos', file)
    })

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    const response = await api.upload<Photo[]>(
      '/photos/upload-batch',
      formData,
      (progress) => {
        if (options?.onProgress) {
          options.onProgress({
            loaded: (progress / 100) * totalSize,
            total: totalSize,
            percentage: progress,
          })
        }
      }
    )
    return response.data!
  }

  /**
   * 获取照片详情
   */
  async getPhoto(photoId: string): Promise<Photo> {
    const response = await api.get<Photo>(`/photos/${photoId}`)
    return response.data!
  }

  /**
   * 获取会话照片列表
   */
  async getSessionPhotos(
    sessionId: string,
    params?: {
      pagination?: PaginationParams
      filters?: {
        isFeatured?: boolean
        isApproved?: boolean
        tags?: string[]
        dateRange?: {
          start: string
          end: string
        }
      }
    }
  ): Promise<PhotosResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.pagination) {
      const { page, limit, sortBy, sortOrder, search } = params.pagination
      if (page) queryParams.append('page', page.toString())
      if (limit) queryParams.append('limit', limit.toString())
      if (sortBy) queryParams.append('sortBy', sortBy)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
      if (search) queryParams.append('search', search)
    }
    
    if (params?.filters) {
      const { isFeatured, isApproved, tags, dateRange } = params.filters
      if (isFeatured !== undefined) queryParams.append('isFeatured', isFeatured.toString())
      if (isApproved !== undefined) queryParams.append('isApproved', isApproved.toString())
      if (tags?.length) queryParams.append('tags', tags.join(','))
      if (dateRange?.start) queryParams.append('startDate', dateRange.start)
      if (dateRange?.end) queryParams.append('endDate', dateRange.end)
    }

    const response = await api.get<PhotosResponse>(
      `/sessions/${sessionId}/photos?${queryParams.toString()}`
    )
    return response.data!
  }

  /**
   * 更新照片信息
   */
  async updatePhoto(
    photoId: string,
    data: {
      caption?: string
      tags?: string[]
      metadata?: Partial<PhotoMetadata>
    }
  ): Promise<Photo> {
    const response = await api.patch<Photo>(`/photos/${photoId}`, data)
    return response.data!
  }

  /**
   * 删除照片
   */
  async deletePhoto(photoId: string): Promise<void> {
    await api.delete(`/photos/${photoId}`)
  }

  /**
   * 批量删除照片
   */
  async deletePhotos(photoIds: string[]): Promise<void> {
    await api.delete('/photos/batch', {
      data: { photoIds },
    })
  }

  /**
   * 设置/取消精选照片
   */
  async toggleFeatured(photoId: string, featured: boolean): Promise<Photo> {
    const response = await api.patch<Photo>(`/photos/${photoId}/featured`, {
      featured,
    })
    return response.data!
  }

  /**
   * 点赞/取消点赞照片
   */
  async toggleLike(photoId: string): Promise<{
    liked: boolean
    likes: number
  }> {
    const response = await api.post<{
      liked: boolean
      likes: number
    }>(`/photos/${photoId}/like`)
    return response.data!
  }

  /**
   * 下载照片
   */
  async downloadPhoto(
    photoId: string,
    quality: 'original' | 'high' | 'medium' | 'low' = 'original',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const photo = await this.getPhoto(photoId)
    await api.download(
      `/photos/${photoId}/download?quality=${quality}`,
      `${photo.originalName}`,
      onProgress
    )
  }

  /**
   * 批量下载照片
   */
  async downloadPhotos(
    photoIds: string[],
    quality: 'original' | 'high' | 'medium' | 'low' = 'original',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    await api.download(
      `/photos/download-batch?ids=${photoIds.join(',')}&quality=${quality}`,
      `photos-${Date.now()}.zip`,
      onProgress
    )
  }

  /**
   * 获取照片统计信息
   */
  async getPhotoStats(photoId: string): Promise<{
    views: number
    likes: number
    downloads: number
    shares: number
    comments: number
  }> {
    const response = await api.get<{
      views: number
      likes: number
      downloads: number
      shares: number
      comments: number
    }>(`/photos/${photoId}/stats`)
    return response.data!
  }

  /**
   * 搜索照片
   */
  async searchPhotos(
    query: string,
    params?: {
      sessionId?: string
      pagination?: PaginationParams
      filters?: {
        isFeatured?: boolean
        isApproved?: boolean
        tags?: string[]
        dateRange?: {
          start: string
          end: string
        }
      }
    }
  ): Promise<PhotosResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    
    if (params?.sessionId) {
      queryParams.append('sessionId', params.sessionId)
    }
    
    if (params?.pagination) {
      const { page, limit, sortBy, sortOrder } = params.pagination
      if (page) queryParams.append('page', page.toString())
      if (limit) queryParams.append('limit', limit.toString())
      if (sortBy) queryParams.append('sortBy', sortBy)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
    }
    
    if (params?.filters) {
      const { isFeatured, isApproved, tags, dateRange } = params.filters
      if (isFeatured !== undefined) queryParams.append('isFeatured', isFeatured.toString())
      if (isApproved !== undefined) queryParams.append('isApproved', isApproved.toString())
      if (tags?.length) queryParams.append('tags', tags.join(','))
      if (dateRange?.start) queryParams.append('startDate', dateRange.start)
      if (dateRange?.end) queryParams.append('endDate', dateRange.end)
    }

    const response = await api.get<PhotosResponse>(
      `/photos/search?${queryParams.toString()}`
    )
    return response.data!
  }

  /**
   * 获取照片EXIF信息
   */
  async getPhotoExif(photoId: string): Promise<Record<string, any>> {
    const response = await api.get<Record<string, any>>(`/photos/${photoId}/exif`)
    return response.data!
  }

  /**
   * 生成照片分享链接
   */
  async generateShareLink(
    photoId: string,
    options?: {
      expiresIn?: number // seconds
      password?: string
      allowDownload?: boolean
    }
  ): Promise<{
    shareUrl: string
    expiresAt?: string
    accessCode?: string
  }> {
    const response = await api.post<{
      shareUrl: string
      expiresAt?: string
      accessCode?: string
    }>(`/photos/${photoId}/share`, options)
    return response.data!
  }

  /**
   * 举报照片
   */
  async reportPhoto(
    photoId: string,
    reason: string,
    description?: string
  ): Promise<void> {
    await api.post(`/photos/${photoId}/report`, {
      reason,
      description,
    })
  }

  /**
   * 添加照片标签
   */
  async addTags(photoId: string, tags: string[]): Promise<Photo> {
    const response = await api.post<Photo>(`/photos/${photoId}/tags`, {
      tags,
    })
    return response.data!
  }

  /**
   * 移除照片标签
   */
  async removeTags(photoId: string, tags: string[]): Promise<Photo> {
    const response = await api.delete<Photo>(`/photos/${photoId}/tags`, {
      data: { tags },
    })
    return response.data!
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit: number = 20): Promise<{
    tags: Array<{
      name: string
      count: number
    }>
  }> {
    const response = await api.get<{
      tags: Array<{
        name: string
        count: number
      }>
    }>(`/photos/tags/popular?limit=${limit}`)
    return response.data!
  }

  /**
   * 获取照片评论
   */
  async getPhotoComments(
    photoId: string,
    params?: PaginationParams
  ): Promise<{
    comments: Array<{
      id: string
      content: string
      author: {
        id: string
        name: string
        avatar?: string
      }
      createdAt: string
      updatedAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const response = await api.get<{
      comments: Array<{
        id: string
        content: string
        author: {
          id: string
          name: string
          avatar?: string
        }
        createdAt: string
        updatedAt: string
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/photos/${photoId}/comments?${queryParams.toString()}`)
    return response.data!
  }

  /**
   * 添加照片评论
   */
  async addComment(
    photoId: string,
    content: string
  ): Promise<{
    id: string
    content: string
    author: {
      id: string
      name: string
      avatar?: string
    }
    createdAt: string
  }> {
    const response = await api.post<{
      id: string
      content: string
      author: {
        id: string
        name: string
        avatar?: string
      }
      createdAt: string
    }>(`/photos/${photoId}/comments`, { content })
    return response.data!
  }

  /**
   * 删除照片评论
   */
  async deleteComment(photoId: string, commentId: string): Promise<void> {
    await api.delete(`/photos/${photoId}/comments/${commentId}`)
  }
}

// 导出单例实例
export const photoApi = new PhotoApi()