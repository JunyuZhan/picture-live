'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Users,
  Eye,
  Download,
  Heart,
  MessageCircle,
  Share2,
  Settings,
  Upload,
  Grid3X3,
  List,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  MoreVertical,
  Flag,
  Trash2,
  Edit,
  Star,
  Clock,
  User,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { useSession } from '@/components/providers/session-provider'
import { Session, Photo } from '@/types/session'
import { SessionStatus } from '@/types/api'
import { formatDate, formatTime } from '@/lib/utils'

// 从API获取会话和照片数据
  const fetchSessionData = async (sessionId: string) => {
    try {
      const [sessionResponse, photosResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/sessions/${sessionId}`),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/photos`)
      ])
      
      if (!sessionResponse.ok || !photosResponse.ok) {
        throw new Error('Failed to fetch session data')
      }
      
      const sessionData = await sessionResponse.json()
      const photosData = await photosResponse.json()
      
      return {
        session: sessionData.data.session,
        photos: photosData.data.photos || []
      }
    } catch (error) {
      console.error('Error fetching session data:', error)
      throw error
    }
  }

export default function SessionPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'featured' | 'recent'>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const { user } = useAuth()
  const { currentSession, photos: sessionPhotos } = useSession()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true)
        const { session, photos } = await fetchSessionData(sessionId)
        setSession(session)
        setPhotos(photos)
      } catch (error) {
        console.error('Load session failed:', error)
        toast.error('加载会话失败')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, router])

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.metadata.aiAnalysis?.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'featured' && photo.isFeatured) ||
      (filterStatus === 'recent' && new Date(photo.uploadedAt) > new Date(Date.now() - 60 * 60 * 1000))
    
    return matchesSearch && matchesFilter
  })

  const handlePhotoAction = async (photoId: string, action: 'like' | 'download' | 'delete' | 'feature') => {
    try {
      // 这里应该调用API执行操作
      switch (action) {
        case 'like':
          setPhotos(prev => prev.map(p => 
            p.id === photoId 
              ? { ...p, stats: { ...p.stats, likes: p.stats.likes + 1 } }
              : p
          ))
          toast.success('已点赞')
          break
        case 'download':
          const photo = photos.find(p => p.id === photoId)
          if (photo) {
            // 模拟下载
            const link = document.createElement('a')
            link.href = photo.urls.original
            link.download = photo.filename
            link.click()
            toast.success('开始下载')
          }
          break
        case 'delete':
          if (user?.id === session?.photographer?.id) {
            setPhotos(prev => prev.filter(p => p.id !== photoId))
            toast.success('照片已删除')
          }
          break
        case 'feature':
          if (user?.id === session?.photographer?.id) {
            setPhotos(prev => prev.map(p => 
              p.id === photoId 
                ? { ...p, isFeatured: !p.isFeatured }
                : p
            ))
            toast.success('已更新精选状态')
          }
          break
      }
    } catch (error) {
      console.error('Photo action failed:', error)
      toast.error('操作失败')
    }
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/join?code=${session?.accessCode}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('分享链接已复制到剪贴板')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载会话中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>会话不存在</CardTitle>
            <CardDescription>
              请检查访问码是否正确
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/join')} className="w-full">
              重新加入
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPhotographer = user?.id === session.photographer?.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={isPhotographer ? '/dashboard' : '/'} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-5 w-5" />
                <span>{isPhotographer ? '返回仪表板' : '返回首页'}</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                {session.status === 'active' ? '进行中' : session.status === 'paused' ? '已暂停' : '已结束'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={copyShareLink}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>分享</span>
              </Button>
              {isPhotographer && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>上传照片</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/session/${sessionId}/settings`)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 会话信息 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{session.title}</h1>
              <p className="text-gray-600 mb-4">{session.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{session.photographer.displayName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>创建于 {formatDate(session.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Camera className="h-4 w-4" />
                  <span>{session.stats.photoCount} 张照片</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{session.stats.viewerCount} 在线观众</span>
                </div>
              </div>

              {session.settings.tags.length > 0 && (
                <div className="flex items-center space-x-2 mt-3">
                  {session.settings.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4 ml-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{session.stats.viewCount}</div>
                <div className="text-xs text-gray-500">总观看</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{session.stats.likeCount}</div>
                <div className="text-xs text-gray-500">总点赞</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{session.stats.commentCount}</div>
                <div className="text-xs text-gray-500">总评论</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{session.stats.downloadCount}</div>
                <div className="text-xs text-gray-500">总下载</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 照片区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索照片..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input w-32"
            >
              <option value="all">全部</option>
              <option value="featured">精选</option>
              <option value="recent">最新</option>
            </select>
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

        {/* 照片列表 */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filterStatus !== 'all' ? '没有找到匹配的照片' : '还没有照片'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== 'all' 
                ? '尝试调整搜索条件或筛选器' 
                : isPhotographer 
                  ? '上传第一张照片开始直播' 
                  : '摄影师还没有上传照片'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
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
                        <span>{formatTime(photo.uploadedAt)}</span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{photo.stats.likes}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{photo.stats.views}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-4">
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
                        <span>{formatTime(photo.uploadedAt)}</span>
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
                      {session.settings.allowDownload && (
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
                      )}
                      {isPhotographer && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            // 显示更多操作菜单
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
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
                {session.settings.allowDownload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhotoAction(selectedPhoto.id, 'download')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
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
                    <span>{selectedPhoto.metadata.exif?.camera}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">镜头：</span>
                    <span>{selectedPhoto.metadata.exif?.lens}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">焦距：</span>
                    <span>{selectedPhoto.metadata.exif?.focalLength}mm</span>
                  </div>
                  <div>
                    <span className="text-gray-300">光圈：</span>
                    <span>{selectedPhoto.metadata.exif?.aperture}</span>
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