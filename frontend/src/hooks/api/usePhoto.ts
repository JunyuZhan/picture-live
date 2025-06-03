import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { photoApi } from '@/lib/api/photo'
import type {
  Photo,
  PhotosResponse,
  PhotoMetadata,
  PaginationParams,
  UploadProgress,
} from '@/types/api'

/**
 * 照片相关的React Query hooks
 */

/**
 * 获取照片详情
 */
export function usePhoto(photoId: string) {
  return useQuery({
    queryKey: ['photos', photoId],
    queryFn: () => photoApi.getPhoto(photoId),
    enabled: !!photoId,
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: (failureCount, error: any) => {
      // 如果是404错误，不重试
      if (error?.response?.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * 获取会话照片列表
 */
export function useSessionPhotos(
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
) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'photos', params],
    queryFn: () => photoApi.getSessionPhotos(sessionId, params),
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000, // 1分钟
    placeholderData: (previousData) => previousData,
  })
}

/**
 * 上传照片
 */
export function useUploadPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sessionId,
      file,
      options,
    }: {
      sessionId: string
      file: File
      options?: {
        caption?: string
        metadata?: Partial<PhotoMetadata>
        onProgress?: (progress: UploadProgress) => void
      }
    }) => photoApi.uploadPhoto(sessionId, file, options),
    onSuccess: (photo: Photo, variables) => {
      // 更新会话照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'photos'],
      })
      
      // 设置照片详情缓存
      queryClient.setQueryData(['photos', photo.id], photo)
      
      toast.success('照片上传成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '上传失败'
      toast.error('上传失败', {
        description: message,
      })
    },
  })
}

/**
 * 批量上传照片
 */
export function useUploadPhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sessionId,
      files,
      options,
    }: {
      sessionId: string
      files: File[]
      options?: {
        onProgress?: (progress: UploadProgress) => void
        onFileProgress?: (fileIndex: number, progress: UploadProgress) => void
      }
    }) => photoApi.uploadPhotos(sessionId, files, options),
    onSuccess: (photos: Photo[], variables) => {
      // 更新会话照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.sessionId, 'photos'],
      })
      
      // 设置照片详情缓存
      photos.forEach((photo) => {
        queryClient.setQueryData(['photos', photo.id], photo)
      })
      
      toast.success('照片批量上传成功', {
        description: `成功上传 ${photos.length} 张照片`,
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '批量上传失败'
      toast.error('上传失败', {
        description: message,
      })
    },
  })
}

/**
 * 更新照片信息
 */
export function useUpdatePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      photoId,
      data,
    }: {
      photoId: string
      data: {
        caption?: string
        tags?: string[]
        metadata?: Partial<PhotoMetadata>
      }
    }) => photoApi.updatePhoto(photoId, data),
    onSuccess: (photo: Photo) => {
      // 更新照片详情缓存
      queryClient.setQueryData(['photos', photo.id], photo)
      
      // 更新相关的照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', photo.sessionId, 'photos'],
      })
      
      toast.success('照片信息更新成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '更新失败'
      toast.error('更新失败', {
        description: message,
      })
    },
  })
}

/**
 * 删除照片
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => photoApi.deletePhoto(photoId),
    onSuccess: (_, photoId) => {
      // 移除照片详情缓存
      queryClient.removeQueries({ queryKey: ['photos', photoId] })
      
      // 更新照片列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      toast.success('照片删除成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '删除失败'
      toast.error('删除失败', {
        description: message,
      })
    },
  })
}

/**
 * 批量删除照片
 */
export function useDeletePhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoIds: string[]) => photoApi.deletePhotos(photoIds),
    onSuccess: (_, photoIds) => {
      // 移除照片详情缓存
      photoIds.forEach((photoId) => {
        queryClient.removeQueries({ queryKey: ['photos', photoId] })
      })
      
      // 更新照片列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      toast.success('照片批量删除成功', {
        description: `成功删除 ${photoIds.length} 张照片`,
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '批量删除失败'
      toast.error('删除失败', {
        description: message,
      })
    },
  })
}

/**
 * 设置/取消精选照片
 */
export function useToggleFeatured() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, featured }: { photoId: string; featured: boolean }) =>
      photoApi.toggleFeatured(photoId, featured),
    onSuccess: (photo: Photo) => {
      // 更新照片详情缓存
      queryClient.setQueryData(['photos', photo.id], photo)
      
      // 更新相关的照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', photo.sessionId, 'photos'],
      })
      
      toast.success(photo.isFeatured ? '已设为精选' : '已取消精选')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '操作失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 点赞/取消点赞照片
 */
export function useToggleLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => photoApi.toggleLike(photoId),
    onSuccess: (result, photoId) => {
      // 更新照片详情缓存中的点赞状态
      queryClient.setQueryData(['photos', photoId], (oldData: Photo | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            isLiked: result.liked,
            likes: result.likes,
          }
        }
        return oldData
      })
      
      // 更新照片列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      toast.success(result.liked ? '点赞成功' : '取消点赞')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '操作失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 下载照片
 */
export function useDownloadPhoto() {
  return useMutation({
    mutationFn: ({
      photoId,
      quality = 'original',
      onProgress,
    }: {
      photoId: string
      quality?: 'original' | 'high' | 'medium' | 'low'
      onProgress?: (progress: number) => void
    }) => photoApi.downloadPhoto(photoId, quality, onProgress),
    onSuccess: () => {
      toast.success('照片下载成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '下载失败'
      toast.error('下载失败', {
        description: message,
      })
    },
  })
}

/**
 * 批量下载照片
 */
export function useDownloadPhotos() {
  return useMutation({
    mutationFn: ({
      photoIds,
      quality = 'original',
      onProgress,
    }: {
      photoIds: string[]
      quality?: 'original' | 'high' | 'medium' | 'low'
      onProgress?: (progress: number) => void
    }) => photoApi.downloadPhotos(photoIds, quality, onProgress),
    onSuccess: (_, variables) => {
      toast.success('照片批量下载成功', {
        description: `正在下载 ${variables.photoIds.length} 张照片`,
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '批量下载失败'
      toast.error('下载失败', {
        description: message,
      })
    },
  })
}

/**
 * 获取照片统计信息
 */
export function usePhotoStats(photoId: string) {
  return useQuery({
    queryKey: ['photos', photoId, 'stats'],
    queryFn: () => photoApi.getPhotoStats(photoId),
    enabled: !!photoId,
    staleTime: 1 * 60 * 1000, // 1分钟
  })
}

/**
 * 搜索照片
 */
export function useSearchPhotos() {
  return useMutation({
    mutationFn: ({
      query,
      params,
    }: {
      query: string
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
    }) => photoApi.searchPhotos(query, params),
    onError: (error: any) => {
      console.error('Search photos error:', error)
    },
  })
}

/**
 * 获取照片EXIF信息
 */
export function usePhotoExif(photoId: string) {
  return useQuery({
    queryKey: ['photos', photoId, 'exif'],
    queryFn: () => photoApi.getPhotoExif(photoId),
    enabled: !!photoId,
    staleTime: 10 * 60 * 1000, // 10分钟
  })
}

/**
 * 生成照片分享链接
 */
export function useGenerateShareLink() {
  return useMutation({
    mutationFn: ({
      photoId,
      options,
    }: {
      photoId: string
      options?: {
        expiresIn?: number
        password?: string
        allowDownload?: boolean
      }
    }) => photoApi.generateShareLink(photoId, options),
    onSuccess: (result) => {
      // 复制到剪贴板
      navigator.clipboard.writeText(result.shareUrl)
      
      toast.success('分享链接已生成', {
        description: '链接已复制到剪贴板',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '生成分享链接失败'
      toast.error('生成失败', {
        description: message,
      })
    },
  })
}

/**
 * 举报照片
 */
export function useReportPhoto() {
  return useMutation({
    mutationFn: ({
      photoId,
      reason,
      description,
    }: {
      photoId: string
      reason: string
      description?: string
    }) => photoApi.reportPhoto(photoId, reason, description),
    onSuccess: () => {
      toast.success('举报提交成功', {
        description: '我们会尽快处理您的举报',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '举报提交失败'
      toast.error('提交失败', {
        description: message,
      })
    },
  })
}

/**
 * 添加照片标签
 */
export function useAddTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, tags }: { photoId: string; tags: string[] }) =>
      photoApi.addTags(photoId, tags),
    onSuccess: (photo: Photo) => {
      // 更新照片详情缓存
      queryClient.setQueryData(['photos', photo.id], photo)
      
      // 更新相关的照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', photo.sessionId, 'photos'],
      })
      
      toast.success('标签添加成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '添加标签失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 移除照片标签
 */
export function useRemoveTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, tags }: { photoId: string; tags: string[] }) =>
      photoApi.removeTags(photoId, tags),
    onSuccess: (photo: Photo) => {
      // 更新照片详情缓存
      queryClient.setQueryData(['photos', photo.id], photo)
      
      // 更新相关的照片列表缓存
      queryClient.invalidateQueries({
        queryKey: ['sessions', photo.sessionId, 'photos'],
      })
      
      toast.success('标签移除成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '移除标签失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 获取热门标签
 */
export function usePopularTags(limit: number = 20) {
  return useQuery({
    queryKey: ['photos', 'tags', 'popular', limit],
    queryFn: () => photoApi.getPopularTags(limit),
    staleTime: 5 * 60 * 1000, // 5分钟
  })
}

/**
 * 获取照片评论
 */
export function usePhotoComments(
  photoId: string,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: ['photos', photoId, 'comments', params],
    queryFn: () => photoApi.getPhotoComments(photoId, params),
    enabled: !!photoId,
    staleTime: 30 * 1000, // 30秒
    placeholderData: (previousData) => previousData,
  })
}

/**
 * 添加照片评论
 */
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, content }: { photoId: string; content: string }) =>
      photoApi.addComment(photoId, content),
    onSuccess: (comment, variables) => {
      // 更新评论列表缓存
      queryClient.invalidateQueries({
        queryKey: ['photos', variables.photoId, 'comments'],
      })
      
      toast.success('评论发表成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '发表评论失败'
      toast.error('发表失败', {
        description: message,
      })
    },
  })
}

/**
 * 删除照片评论
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, commentId }: { photoId: string; commentId: string }) =>
      photoApi.deleteComment(photoId, commentId),
    onSuccess: (_, variables) => {
      // 更新评论列表缓存
      queryClient.invalidateQueries({
        queryKey: ['photos', variables.photoId, 'comments'],
      })
      
      toast.success('评论删除成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '删除评论失败'
      toast.error('删除失败', {
        description: message,
      })
    },
  })
}