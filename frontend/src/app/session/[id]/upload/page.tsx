'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  ChevronLeft,
  Upload,
  X,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Camera,
  Trash2,
  Eye,
  Star,
  RotateCcw,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { Session } from '@/types/session'
import { formatFileSize } from '@/lib/utils'

interface UploadFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  isFeatured?: boolean
}

// 模拟数据
const mockSession: Session = {
  id: '1',
  title: '婚礼现场拍摄',
  description: '张先生和李女士的婚礼现场照片直播',
  accessCode: 'WEDDING2024',
  status: 'active',
  type: 'event',
    photographer: {
    id: 'user1',
    username: 'photographer1',
    displayName: '专业摄影师',
    avatar: null,
  },
  settings: {
    isPublic: true,
    allowDownload: true,
    allowComments: true,
    allowLikes: true,
    watermark: {
        enabled: true,
        position: 'bottom-right' as const,
        opacity: 0.7,
      },
    autoApprove: true,
    maxPhotos: 1000,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['婚礼', '现场', '直播'],
  },
  stats: {
    photoCount: 45,
    viewCount: 128,
    likeCount: 89,
    commentCount: 23,
    downloadCount: 67,
    viewerCount: 12,
  },
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function UploadPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null)
  
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true)
        // 这里应该调用API获取会话详情
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSession(mockSession)
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

  // 检查权限
  useEffect(() => {
    if (session && user?.id !== session.photographer?.id) {
      toast.error('您没有权限访问此页面')
      router.push(`/session/${sessionId}`)
    }
  }, [session, user, sessionId, router])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))
    
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const toggleFeatured = (fileId: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isFeatured: !f.isFeatured } : f
    ))
  }

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 模拟上传过程
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ))

      const interval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => {
          if (f.id === uploadFile.id) {
            const newProgress = Math.min(f.progress + Math.random() * 20, 100)
            if (newProgress >= 100) {
              clearInterval(interval)
              // 随机决定成功或失败
              const success = Math.random() > 0.1 // 90% 成功率
              if (success) {
                setTimeout(() => resolve(), 100)
                return { ...f, status: 'success', progress: 100 }
              } else {
                setTimeout(() => reject(new Error('上传失败')), 100)
                return { ...f, status: 'error', progress: 0, error: '上传失败，请重试' }
              }
            }
            return { ...f, progress: newProgress }
          }
          return f
        }))
      }, 200)
    })
  }

  const uploadAllFiles = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) {
      toast.error('没有待上传的文件')
      return
    }

    setIsUploading(true)
    
    try {
      // 并发上传，但限制并发数
      const concurrency = 3
      const chunks = []
      for (let i = 0; i < pendingFiles.length; i += concurrency) {
        chunks.push(pendingFiles.slice(i, i + concurrency))
      }

      for (const chunk of chunks) {
        await Promise.allSettled(chunk.map(uploadFile))
      }

      const successCount = uploadFiles.filter(f => f.status === 'success').length
      const errorCount = uploadFiles.filter(f => f.status === 'error').length
      
      if (errorCount === 0) {
        toast.success(`成功上传 ${successCount} 张照片`)
      } else {
        toast.error(`上传完成：${successCount} 成功，${errorCount} 失败`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('上传过程中出现错误')
    } finally {
      setIsUploading(false)
    }
  }

  const retryUpload = async (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId)
    if (!file) return

    try {
      await uploadFile(file)
      toast.success('重试上传成功')
    } catch (error) {
      toast.error('重试上传失败')
    }
  }

  const clearCompleted = () => {
    setUploadFiles(prev => {
      const toRemove = prev.filter(f => f.status === 'success')
      toRemove.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
      return prev.filter(f => f.status !== 'success')
    })
  }

  const clearAll = () => {
    uploadFiles.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview)
      }
    })
    setUploadFiles([])
  }

  // 清理预览URL
  useEffect(() => {
    return () => {
      uploadFiles.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
    }
  }, [])

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
              请检查会话ID是否正确
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              返回仪表板
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length
  const uploadingCount = uploadFiles.filter(f => f.status === 'uploading').length
  const successCount = uploadFiles.filter(f => f.status === 'success').length
  const errorCount = uploadFiles.filter(f => f.status === 'error').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={`/session/${sessionId}`} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-5 w-5" />
                <span>返回会话</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                {session.status === 'active' ? '进行中' : session.status === 'paused' ? '已暂停' : '已结束'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">上传照片</h1>
          <p className="text-gray-600">为会话「{session.title}」上传新照片</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 上传区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 拖拽上传区 */}
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {isDragActive ? '释放文件以上传' : '拖拽照片到这里'}
                      </h3>
                      <p className="text-gray-600">
                        或者 <span className="text-primary font-medium">点击选择文件</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        支持 JPEG、PNG、GIF、BMP、WebP 格式，单个文件最大 50MB
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 文件列表 */}
            {uploadFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>待上传文件 ({uploadFiles.length})</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {successCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCompleted}
                        >
                          清除已完成
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        disabled={isUploading}
                      >
                        清除全部
                      </Button>
                      <Button
                        onClick={uploadAllFiles}
                        disabled={pendingCount === 0 || isUploading}
                        className="flex items-center space-x-2"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>
                          {isUploading ? '上传中...' : `上传全部 (${pendingCount})`}
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uploadFiles.map((uploadFile) => (
                      <motion.div
                        key={uploadFile.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex items-center space-x-4 p-4 border rounded-lg"
                      >
                        {/* 预览图 */}
                        <div 
                          className="w-16 h-16 relative overflow-hidden rounded-lg flex-shrink-0 cursor-pointer"
                          onClick={() => setSelectedFile(uploadFile)}
                        >
                          <img
                            src={uploadFile.preview}
                            alt={uploadFile.file.name}
                            className="w-full h-full object-cover"
                          />
                          {uploadFile.isFeatured && (
                            <div className="absolute top-1 left-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            </div>
                          )}
                        </div>

                        {/* 文件信息 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {uploadFile.file.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                          
                          {/* 进度条 */}
                          {uploadFile.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>上传中...</span>
                                <span>{Math.round(uploadFile.progress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadFile.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* 错误信息 */}
                          {uploadFile.status === 'error' && uploadFile.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {uploadFile.error}
                            </p>
                          )}
                        </div>

                        {/* 状态图标 */}
                        <div className="flex items-center space-x-2">
                          {uploadFile.status === 'pending' && (
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <Clock className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          {uploadFile.status === 'uploading' && (
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            </div>
                          )}
                          {uploadFile.status === 'success' && (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                          {uploadFile.status === 'error' && (
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleFeatured(uploadFile.id)}
                            className={uploadFile.isFeatured ? 'text-yellow-600 border-yellow-200' : ''}
                          >
                            <Star className={`h-4 w-4 ${uploadFile.isFeatured ? 'fill-current' : ''}`} />
                          </Button>
                          
                          {uploadFile.status === 'error' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryUpload(uploadFile.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            disabled={uploadFile.status === 'uploading'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 上传统计 */}
            <Card>
              <CardHeader>
                <CardTitle>上传统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">待上传</span>
                  <Badge variant="outline">{pendingCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">上传中</span>
                  <Badge variant="default">{uploadingCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已完成</span>
                  <Badge variant="success">{successCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">失败</span>
                  <Badge variant="destructive">{errorCount}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 会话信息 */}
            <Card>
              <CardHeader>
                <CardTitle>会话信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-gray-600 text-sm">当前照片数</span>
                  <div className="font-medium">{session.stats.photoCount}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">最大照片数</span>
                  <div className="font-medium">{session.settings.maxPhotos}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">剩余空间</span>
                  <div className="font-medium">
                    {session.settings.maxPhotos - session.stats.photoCount}
                  </div>
                </div>
                {session.settings.requireApproval && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        照片需要审核后才会显示
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 上传提示 */}
            <Card>
              <CardHeader>
                <CardTitle>上传提示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span>支持批量上传，可同时选择多个文件</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span>点击星标按钮可将照片设为精选</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span>上传失败的文件可以点击重试</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span>建议照片分辨率不低于 1920x1080</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 照片预览模态框 */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFile(null)}
          >
            <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedFile.preview}
                alt={selectedFile.file.name}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-4 text-white">
                <h3 className="font-medium mb-2">{selectedFile.file.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">文件大小：</span>
                    <span>{formatFileSize(selectedFile.file.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">文件类型：</span>
                    <span>{selectedFile.file.type}</span>
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