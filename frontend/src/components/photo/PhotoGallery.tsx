'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Heart, 
  Download, 
  Share2, 
  Trash2, 
  Star, 
  StarOff, 
  MoreVertical, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight,
  X,
  Grid3X3,
  List,
  Filter,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/providers/session-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from '@/hooks/use-toast'

interface Photo {
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
  metadata?: {
    width: number
    height: number
    size: number
    camera?: string
    settings?: string
  }
}

interface PhotoGalleryProps {
  photos: Photo[]
  viewMode?: 'grid' | 'list'
  allowSelection?: boolean
  allowActions?: boolean
  showUploader?: boolean
  className?: string
  onPhotoClick?: (photo: Photo) => void
  onPhotosSelect?: (photos: Photo[]) => void
}

export function PhotoGallery({
  photos,
  viewMode: initialViewMode = 'grid',
  allowSelection = false,
  allowActions = true,
  showUploader = true,
  className,
  onPhotoClick,
  onPhotosSelect
}: PhotoGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterFeatured, setFilterFeatured] = useState(false)
  
  const { 
    currentSession,
    likePhoto, 
    downloadPhoto, 
    deletePhoto, 
    togglePhotoFeatured 
  } = useSession()
  
  const { user } = useAuth()
  
  // 判断当前用户是否为会话所有者
  const isOwner = user && currentSession && user.id === currentSession.photographer.id

  // 过滤和排序照片
  const filteredAndSortedPhotos = React.useMemo(() => {
    let filtered = photos

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(photo => 
        photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.uploadedBy.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 精选过滤
    if (filterFeatured) {
      filtered = filtered.filter(photo => photo.isFeatured)
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
          break
        case 'likes':
          comparison = a.likes - b.likes
          break
        case 'name':
          comparison = a.filename.localeCompare(b.filename)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [photos, searchQuery, filterFeatured, sortBy, sortOrder])

  // 处理照片选择
  const handlePhotoSelect = (photoId: string, selected: boolean) => {
    const newSelected = new Set(selectedPhotos)
    if (selected) {
      newSelected.add(photoId)
    } else {
      newSelected.delete(photoId)
    }
    setSelectedPhotos(newSelected)
    
    if (onPhotosSelect) {
      const selectedPhotoObjects = photos.filter(p => newSelected.has(p.id))
      onPhotosSelect(selectedPhotoObjects)
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedPhotos.size === filteredAndSortedPhotos.length) {
      setSelectedPhotos(new Set())
      onPhotosSelect?.([])
    } else {
      const allIds = new Set(filteredAndSortedPhotos.map(p => p.id))
      setSelectedPhotos(allIds)
      onPhotosSelect?.(filteredAndSortedPhotos)
    }
  }

  // 打开灯箱
  const openLightbox = (photo: Photo) => {
    const index = filteredAndSortedPhotos.findIndex(p => p.id === photo.id)
    setLightboxPhoto(photo)
    setLightboxIndex(index)
  }

  // 灯箱导航
  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (lightboxIndex - 1 + filteredAndSortedPhotos.length) % filteredAndSortedPhotos.length
      : (lightboxIndex + 1) % filteredAndSortedPhotos.length
    
    setLightboxIndex(newIndex)
    setLightboxPhoto(filteredAndSortedPhotos[newIndex])
  }

  // 处理照片操作
  const handleLike = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await likePhoto(photoId)
    } catch (error) {
      toast({
        title: "操作失败",
        description: "点赞失败，请重试",
        variant: "destructive"
      })
    }
  }

  const handleDownload = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await downloadPhoto(photoId)
    } catch (error) {
      toast({
        title: "下载失败",
        description: "照片下载失败，请重试",
        variant: "destructive"
      })
    }
  }

  const handleShare = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (navigator.share) {
        await navigator.share({
          title: photo.filename,
          url: photo.url
        })
      } else {
        await navigator.clipboard.writeText(photo.url)
        toast({
          title: "链接已复制",
          description: "照片链接已复制到剪贴板"
        })
      }
    } catch (error) {
      toast({
        title: "分享失败",
        description: "分享失败，请重试",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这张照片吗？')) {
      try {
        await deletePhoto(photoId)
        toast({
          title: "删除成功",
          description: "照片已删除"
        })
      } catch (error) {
        toast({
          title: "删除失败",
          description: "照片删除失败，请重试",
          variant: "destructive"
        })
      }
    }
  }

  const handleToggleFeatured = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await togglePhotoFeatured(photoId)
    } catch (error) {
      toast({
        title: "操作失败",
        description: "设置精选失败，请重试",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (photos.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Grid3X3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无照片</h3>
        <p className="text-gray-500 mb-4">还没有上传任何照片</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索照片..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <Button
            variant={filterFeatured ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterFeatured(!filterFeatured)}
          >
            <Star className="w-4 h-4 mr-1" />
            精选
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {allowSelection && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedPhotos.size === filteredAndSortedPhotos.length ? '取消全选' : '全选'}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                排序
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('date')}>
                按时间排序
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('likes')}>
                按点赞数排序
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                按文件名排序
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? '降序' : '升序'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 选择状态 */}
      {allowSelection && selectedPhotos.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              已选择 {selectedPhotos.size} 张照片
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPhotos(new Set())
                onPhotosSelect?.([])
              }}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* 照片网格 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAndSortedPhotos.map((photo) => (
            <Card 
              key={photo.id} 
              className={cn(
                'group cursor-pointer transition-all hover:shadow-lg',
                selectedPhotos.has(photo.id) && 'ring-2 ring-blue-500'
              )}
              onClick={() => {
                if (allowSelection) {
                  handlePhotoSelect(photo.id, !selectedPhotos.has(photo.id))
                } else if (onPhotoClick) {
                  onPhotoClick(photo)
                } else {
                  openLightbox(photo)
                }
              }}
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* 覆盖层 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  {/* 精选标识 */}
                  {photo.isFeatured && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        精选
                      </Badge>
                    </div>
                  )}
                  
                  {/* 选择框 */}
                  {allowSelection && (
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.has(photo.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handlePhotoSelect(photo.id, e.target.checked)
                        }}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  {allowActions && (
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => handleLike(photo.id, e)}>
                            <Heart className={cn('w-4 h-4 mr-2', photo.isLiked && 'fill-red-500 text-red-500')} />
                            {photo.isLiked ? '取消点赞' : '点赞'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDownload(photo.id, e)}>
                            <Download className="w-4 h-4 mr-2" />
                            下载
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleShare(photo, e)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            分享
                          </DropdownMenuItem>
                          {isOwner && (
                            <>
                              <DropdownMenuItem onClick={(e) => handleToggleFeatured(photo.id, e)}>
                                {photo.isFeatured ? (
                                  <StarOff className="w-4 h-4 mr-2" />
                                ) : (
                                  <Star className="w-4 h-4 mr-2" />
                                )}
                                {photo.isFeatured ? '取消精选' : '设为精选'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(photo.id, e)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                
                {/* 照片信息 */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium truncate flex-1">
                      {photo.filename}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Heart className={cn('w-3 h-3', photo.isLiked && 'fill-red-500 text-red-500')} />
                      {photo.likes}
                    </div>
                  </div>
                  
                  {showUploader && (
                    <div className="flex items-center gap-2">
                      {photo.uploadedBy.avatar && (
                        <img
                          src={photo.uploadedBy.avatar}
                          alt={photo.uploadedBy.name}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className="text-xs text-gray-500 truncate">
                        {photo.uploadedBy.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <div className="space-y-2">
          {filteredAndSortedPhotos.map((photo) => (
            <Card 
              key={photo.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedPhotos.has(photo.id) && 'ring-2 ring-blue-500'
              )}
              onClick={() => {
                if (allowSelection) {
                  handlePhotoSelect(photo.id, !selectedPhotos.has(photo.id))
                } else if (onPhotoClick) {
                  onPhotoClick(photo)
                } else {
                  openLightbox(photo)
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* 选择框 */}
                  {allowSelection && (
                    <input
                      type="checkbox"
                      checked={selectedPhotos.has(photo.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handlePhotoSelect(photo.id, e.target.checked)
                      }}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                    />
                  )}
                  
                  {/* 缩略图 */}
                  <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* 照片信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{photo.filename}</h3>
                      {photo.isFeatured && (
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="w-3 h-3 mr-1" />
                          精选
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {showUploader && (
                        <div className="flex items-center gap-1">
                          {photo.uploadedBy.avatar && (
                            <img
                              src={photo.uploadedBy.avatar}
                              alt={photo.uploadedBy.name}
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          <span>{photo.uploadedBy.name}</span>
                        </div>
                      )}
                      
                      <span>{formatDate(photo.uploadedAt)}</span>
                      
                      {photo.metadata && (
                        <span>{formatFileSize(photo.metadata.size)}</span>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Heart className={cn('w-4 h-4', photo.isLiked && 'fill-red-500 text-red-500')} />
                        {photo.likes}
                      </div>
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  {allowActions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => handleLike(photo.id, e)}>
                          <Heart className={cn('w-4 h-4 mr-2', photo.isLiked && 'fill-red-500 text-red-500')} />
                          {photo.isLiked ? '取消点赞' : '点赞'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDownload(photo.id, e)}>
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleShare(photo, e)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          分享
                        </DropdownMenuItem>
                        {isOwner && (
                          <>
                            <DropdownMenuItem onClick={(e) => handleToggleFeatured(photo.id, e)}>
                              {photo.isFeatured ? (
                                <StarOff className="w-4 h-4 mr-2" />
                              ) : (
                                <Star className="w-4 h-4 mr-2" />
                              )}
                              {photo.isFeatured ? '取消精选' : '设为精选'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(photo.id, e)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 灯箱 */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          {lightboxPhoto && (
            <div className="relative w-full h-full flex flex-col">
              {/* 头部 */}
              <DialogHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="truncate">{lightboxPhoto.filename}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {lightboxIndex + 1} / {filteredAndSortedPhotos.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLightboxPhoto(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              {/* 图片区域 */}
              <div className="flex-1 relative bg-black">
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.filename}
                  className="w-full h-full object-contain"
                />
                
                {/* 导航按钮 */}
                {filteredAndSortedPhotos.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2"
                      onClick={() => navigateLightbox('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                      onClick={() => navigateLightbox('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* 底部信息和操作 */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {showUploader && (
                      <div className="flex items-center gap-2">
                        {lightboxPhoto.uploadedBy.avatar && (
                          <img
                            src={lightboxPhoto.uploadedBy.avatar}
                            alt={lightboxPhoto.uploadedBy.name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium">
                          {lightboxPhoto.uploadedBy.name}
                        </span>
                      </div>
                    )}
                    
                    <span className="text-sm text-gray-500">
                      {formatDate(lightboxPhoto.uploadedAt)}
                    </span>
                    
                    {lightboxPhoto.metadata && (
                      <span className="text-sm text-gray-500">
                        {lightboxPhoto.metadata.width} × {lightboxPhoto.metadata.height} • {formatFileSize(lightboxPhoto.metadata.size)}
                      </span>
                    )}
                  </div>
                  
                  {allowActions && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleLike(lightboxPhoto.id, e)}
                      >
                        <Heart className={cn('w-4 h-4 mr-1', lightboxPhoto.isLiked && 'fill-red-500 text-red-500')} />
                        {lightboxPhoto.likes}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDownload(lightboxPhoto.id, e)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleShare(lightboxPhoto, e)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleToggleFeatured(lightboxPhoto.id, e)}
                          >
                            {lightboxPhoto.isFeatured ? (
                              <StarOff className="w-4 h-4" />
                            ) : (
                              <Star className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(lightboxPhoto.id, e)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}