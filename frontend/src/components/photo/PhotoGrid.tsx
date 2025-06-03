'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Heart, Download, Share2, MoreHorizontal, Star, Trash2, Tag, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Photo } from '@/types/photo'

interface PhotoGridProps {
  photos: Photo[]
  loading?: boolean
  onPhotoClick?: (photo: Photo, index: number) => void
  onLike?: (photoId: string) => void
  onDownload?: (photoId: string) => void
  onShare?: (photo: Photo) => void
  onDelete?: (photoId: string) => void
  onToggleFeatured?: (photoId: string) => void
  onAddTags?: (photoId: string, tags: string[]) => void
  showActions?: boolean
  selectable?: boolean
  selectedPhotos?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  columns?: number
}

export function PhotoGrid({
  photos,
  loading = false,
  onPhotoClick,
  onLike,
  onDownload,
  onShare,
  onDelete,
  onToggleFeatured,
  onAddTags,
  showActions = true,
  selectable = false,
  selectedPhotos = [],
  onSelectionChange,
  columns = 3
}: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set())

  // 懒加载观察器
  const imageRef = useCallback((node: HTMLDivElement | null, photoId: string) => {
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisibleImages(prev => new Set([...Array.from(prev), photoId]))
        }
      })
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    })
    
    if (node) observerRef.current.observe(node)
  }, [])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const handleImageError = (photoId: string) => {
    setImageLoadErrors(prev => new Set([...Array.from(prev), photoId]))
  }

  const handlePhotoSelect = (photoId: string) => {
    if (!selectable) return
    
    const newSelection = selectedPhotos.includes(photoId)
      ? selectedPhotos.filter(id => id !== photoId)
      : [...selectedPhotos, photoId]
    
    onSelectionChange?.(newSelection)
  }

  const openLightbox = (photo: Photo, index: number) => {
    setSelectedPhoto(photo)
    setSelectedIndex(index)
    onPhotoClick?.(photo, index)
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
  }

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedIndex - 1)
      : Math.min(photos.length - 1, selectedIndex + 1)
    
    setSelectedIndex(newIndex)
    setSelectedPhoto(photos[newIndex])
  }

  const handleAction = (action: string, photo: Photo, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    switch (action) {
      case 'like':
        onLike?.(photo.id)
        break
      case 'download':
        onDownload?.(photo.id)
        break
      case 'share':
        onShare?.(photo)
        break
      case 'delete':
        onDelete?.(photo.id)
        break
      case 'featured':
        onToggleFeatured?.(photo.id)
        break
    }
  }

  if (loading) {
    return (
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-2">还没有照片</p>
          <p>上传您的第一张照片开始分享</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            ref={(node) => imageRef(node, photo.id)}
            className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => openLightbox(photo, index)}
          >
            {/* 选择框 */}
            {selectable && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedPhotos.includes(photo.id)}
                  onChange={() => handlePhotoSelect(photo.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            )}

            {/* 照片 */}
            {visibleImages.has(photo.id) && !imageLoadErrors.has(photo.id) ? (
              <Image
                src={photo.thumbnailUrl || photo.url}
                alt={photo.filename}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => handleImageError(photo.id)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-gray-400 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 opacity-50">
                    📷
                  </div>
                  <p className="text-xs">加载中...</p>
                </div>
              </div>
            )}

            {/* 悬浮信息 */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
              <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {photo.isFeatured && (
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    )}
                    {photo.likes > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-xs">{photo.likes}</span>
                      </div>
                    )}
                  </div>
                  
                  {showActions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-white hover:bg-white hover:bg-opacity-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => handleAction('like', photo, e)}>
                          <Heart className="w-4 h-4 mr-2" />
                          {photo.isLiked ? '取消点赞' : '点赞'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('download', photo, e)}>
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('share', photo, e)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          分享
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('featured', photo, e)}>
                          <Star className="w-4 h-4 mr-2" />
                          {photo.isFeatured ? '取消精选' : '设为精选'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('delete', photo, e)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            {/* 标签 */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {photo.tags.length}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 灯箱模态框 */}
      <Dialog open={!!selectedPhoto} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          {selectedPhoto && (
            <div className="relative w-full h-full flex flex-col">
              {/* 头部 */}
              <DialogHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold">
                    {selectedPhoto.filename}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {selectedIndex + 1} / {photos.length}
                    </span>
                    <Button variant="ghost" size="sm" onClick={closeLightbox}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* 图片区域 */}
              <div className="flex-1 relative bg-black">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.filename}
                  fill
                  className="object-contain"
                  sizes="90vw"
                />
                
                {/* 导航按钮 */}
                {selectedIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
                    onClick={() => navigatePhoto('prev')}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                )}
                
                {selectedIndex < photos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
                    onClick={() => navigatePhoto('next')}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                )}
              </div>

              {/* 底部信息 */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <div className="flex gap-1">
                          {selectedPhoto.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(selectedPhoto.uploadedAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAction('like', selectedPhoto, e)}
                      className={selectedPhoto.isLiked ? 'text-red-600' : ''}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${selectedPhoto.isLiked ? 'fill-current' : ''}`} />
                      {selectedPhoto.likes || 0}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAction('download', selectedPhoto, e)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAction('share', selectedPhoto, e)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      分享
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}