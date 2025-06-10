'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Grid3X3, 
  List, 
  Search, 
  Download, 
  Heart, 
  Eye, 
  MessageCircle,
  Star,
  ZoomIn,
  X,
  SortAsc,
  SortDesc
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { formatDate, formatTime } from '@/lib/utils'
import { ApiClient } from '@/lib/api/client'

// 创建API客户端实例
const apiClient = new ApiClient()

interface SessionData {
  id: string
  title: string
  description?: string
  isPublic: boolean
  status: string
  creatorUsername: string
  creatorDisplayName?: string
  totalPhotos: number
  publishedPhotos: number
  createdAt: string
}

interface PhotoData {
  id: string
  filename: string
  originalName: string
  title?: string
  description?: string
  tags: string[]
  urls: {
    thumbnail: string
    small: string
    medium: string
    large: string
    original: string
  }
  metadata: {
    size: number
    width: number
    height: number
    format: string
    exif?: {
      camera?: string
      lens?: string
      focalLength?: string
      aperture?: string
      shutterSpeed?: string
      iso?: string
      dateTaken?: string
    }
  }
  stats: {
    views: number
    likes: number
    comments: number
    downloads: number
  }
  isFeatured: boolean
  status: string
  createdAt: string
}

// 获取相册数据
const fetchSessionData = async (sessionId: string): Promise<SessionData> => {
  try {
    const response = await apiClient.get(`/sessions/${sessionId}`)
    return response.data.session
  } catch (error: any) {
    console.error('Error fetching session:', error)
    throw new Error(error.response?.data?.message || '获取相册信息失败')
  }
}

// 获取照片数据
const fetchPhotos = async (sessionId: string): Promise<PhotoData[]> => {
  try {
    const response = await apiClient.get(`/sessions/${sessionId}/photos`)
    return response.data.photos || []
  } catch (error: any) {
    console.error('Error fetching photos:', error)
    if (error.response?.status === 404) {
      return []
    }
    throw new Error(error.response?.data?.message || '获取照片失败')
  }
}

export default function SessionPhotosPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 视图和筛选状态
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [sessionData, photosData] = await Promise.all([
          fetchSessionData(sessionId),
          fetchPhotos(sessionId)
        ])
        
        setSession(sessionData)
        setPhotos(photosData)
      } catch (err: any) {
        console.error('Load data failed:', err)
        setError(err.message || '加载数据失败')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadData()
    }
  }, [sessionId])

  // 照片筛选
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  // 照片操作
  const handlePhotoAction = async (photoId: string, action: 'like' | 'download') => {
    try {
      if (action === 'like') {
        await apiClient.post(`/photos/${photoId}/like`)
        // 更新本地状态
        setPhotos(prev => prev.map(photo => 
          photo.id === photoId 
            ? { ...photo, stats: { ...photo.stats, likes: photo.stats.likes + 1 } }
            : photo
        ))
      } else if (action === 'download') {
        const photo = photos.find(p => p.id === photoId)
        if (photo) {
          window.open(photo.urls.original, '_blank')
          // 更新下载计数
          setPhotos(prev => prev.map(p => 
            p.id === photoId 
              ? { ...p, stats: { ...p.stats, downloads: p.stats.downloads + 1 } }
              : p
          ))
        }
      }
    } catch (error) {
      console.error(`Photo ${action} failed:`, error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载照片中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">加载失败</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{session.title} - 所有照片</h1>
                <p className="text-sm text-gray-500">
                  {filteredPhotos.length} / {photos.length} 张照片
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜索 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索照片..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 照片网格/列表 */}
        {filteredPhotos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">
                {photos.length === 0 ? '暂无照片' : '没有找到符合条件的照片'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-4'
          }>
            {filteredPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={viewMode === 'grid' 
                  ? 'group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer'
                  : 'bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'
                }
                onClick={() => setSelectedPhoto(photo)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={photo.urls.thumbnail}
                        alt={photo.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {photo.isFeatured && (
                        <div className="absolute top-2 left-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatTime(photo.createdAt)}</span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{photo.stats.views}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{photo.stats.likes}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-4 cursor-pointer">
                    <div className="w-20 h-20 relative overflow-hidden rounded-lg flex-shrink-0">
                      <img
                        src={photo.urls.thumbnail}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {photo.isFeatured && (
                        <div className="absolute top-1 left-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{photo.filename}</h3>
                      <p className="text-sm text-gray-500">
                        {photo.metadata.exif?.camera} • {photo.metadata.exif?.lens}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatTime(photo.createdAt)}</span>
                        <span className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{photo.stats.likes}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{photo.stats.views}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{photo.stats.comments}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePhotoAction(photo.id, 'like')
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePhotoAction(photo.id, 'download')
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 照片查看器 */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedPhoto.urls.large}
                alt={selectedPhoto.filename}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhotoAction(selectedPhoto.id, 'like')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Heart className="h-4 w-4" />
                  <span className="ml-1">{selectedPhoto.stats.likes}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhotoAction(selectedPhoto.id, 'download')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-4 text-white">
                <h3 className="font-medium mb-2">{selectedPhoto.filename}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">相机：</span>
                    <span>{selectedPhoto.metadata.exif?.camera || '未知'}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">镜头：</span>
                    <span>{selectedPhoto.metadata.exif?.lens || '未知'}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">焦距：</span>
                    <span>{selectedPhoto.metadata.exif?.focalLength || '未知'}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">光圈：</span>
                    <span>{selectedPhoto.metadata.exif?.aperture || '未知'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 