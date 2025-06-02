'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  ChevronLeft,
  Save,
  Trash2,
  AlertTriangle,
  Settings,
  Users,
  Download,
  MessageCircle,
  Heart,
  Shield,
  Image,
  Clock,
  Tag,
  Globe,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { Session, SessionSettings } from '@/types/session'
import { formatDate } from '@/lib/utils'

interface SessionSettingsForm {
  title: string
  description: string
  isPublic: boolean
  allowDownload: boolean
  allowComments: boolean
  allowLikes: boolean
  requireApproval: boolean
  watermarkEnabled: boolean
  autoApprove: boolean
  maxPhotos: number
  expiresAt: string
  tags: string
}

// 从API获取会话数据
const fetchSession = async (sessionId: string): Promise<Session> => {
  try {
    const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch session')
    }
    
    const data = await response.json()
    return data.data.session
  } catch (error) {
    console.error('Error fetching session:', error)
    throw error
  }
}

// 更新会话设置
const updateSession = async (sessionId: string, updates: any): Promise<Session> => {
  try {
    const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update session')
    }
    
    const data = await response.json()
    return data.data.session
  } catch (error) {
    console.error('Error updating session:', error)
    throw error
  }
}

export default function SessionSettingsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SessionSettingsForm>()

  const watchIsPublic = watch('isPublic')
  const watchRequireApproval = watch('requireApproval')

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true)
        // 这里应该调用API获取会话详情
        const sessionData = await fetchSession(sessionId)
        setSession(sessionData)
        
        // 设置表单默认值
        setValue('title', sessionData.title)
        setValue('description', sessionData.description)
        setValue('isPublic', sessionData.settings.isPublic)
        setValue('allowDownload', sessionData.settings.allowDownload)
        setValue('allowComments', sessionData.settings.allowComments)
        setValue('allowLikes', sessionData.settings.allowLikes)
        setValue('requireApproval', sessionData.settings.requireApproval)
        setValue('watermarkEnabled', sessionData.settings.watermarkEnabled)
        setValue('autoApprove', sessionData.settings.autoApprove)
        setValue('maxPhotos', sessionData.settings.maxPhotos)
        setValue('expiresAt', sessionData.settings.expiresAt?.split('T')[0] || '')
        setValue('tags', sessionData.settings.tags.join(', '))
      } catch (error) {
        console.error('Load session failed:', error)
        toast.error('加载会话失败')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, router, setValue])

  // 检查权限
  useEffect(() => {
    if (session && user?.id !== session.photographer?.id) {
      toast.error('您没有权限访问此页面')
      router.push(`/session/${sessionId}`)
    }
  }, [session, user, sessionId, router])

  const onSubmit = async (data: SessionSettingsForm) => {
    try {
      setIsSaving(true)
      
      const updatedSettings: SessionSettings = {
        isPublic: data.isPublic,
        allowDownload: data.allowDownload,
        allowComments: data.allowComments,
        allowLikes: data.allowLikes,
        requireApproval: data.requireApproval,
        watermarkEnabled: data.watermarkEnabled,
        autoApprove: data.autoApprove,
        maxPhotos: data.maxPhotos,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      }

      // 这里应该调用API更新会话设置
      const updatedSession = await updateSession(sessionId, {
        title: data.title,
        description: data.description,
        settings: updatedSettings
      })
      
      setSession(updatedSession)
      
      toast.success('设置已保存')
    } catch (error) {
      console.error('Save settings failed:', error)
      toast.error('保存设置失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSession = async () => {
    try {
      setIsDeleting(true)
      // 这里应该调用API删除会话
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete session')
      }
      toast.success('会话已删除')
      router.push('/dashboard')
    } catch (error) {
      console.error('Delete session failed:', error)
      toast.error('删除会话失败')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSessionAction = async (action: 'pause' | 'resume' | 'end') => {
    try {
      // 这里应该调用API执行会话操作
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'ended'
      setSession(prev => prev ? { ...prev, status: newStatus as any } : null)
      
      const actionText = action === 'pause' ? '暂停' : action === 'resume' ? '恢复' : '结束'
      toast.success(`会话已${actionText}`)
      
      if (action === 'end') {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Session action failed:', error)
      toast.error('操作失败')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载设置中...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">会话设置</h1>
          <p className="text-gray-600">管理您的照片直播会话设置和权限</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要设置 */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>基本信息</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      会话标题
                    </label>
                    <input
                      {...register('title', { required: '请输入会话标题' })}
                      className="input"
                      placeholder="输入会话标题"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      会话描述
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="input"
                      placeholder="输入会话描述（可选）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      访问码
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        value={session.accessCode}
                        readOnly
                        className="input bg-gray-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(session.accessCode)
                          toast.success('访问码已复制')
                        }}
                      >
                        复制
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 隐私设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>隐私设置</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {watchIsPublic ? <Globe className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-gray-500" />}
                      <div>
                        <div className="font-medium">公开会话</div>
                        <div className="text-sm text-gray-500">
                          允许任何人通过访问码加入
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('isPublic')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {watchRequireApproval ? <Eye className="h-5 w-5 text-orange-500" /> : <EyeOff className="h-5 w-5 text-gray-500" />}
                      <div>
                        <div className="font-medium">需要审核</div>
                        <div className="text-sm text-gray-500">
                          照片需要审核后才能显示
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('requireApproval')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Image className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">水印保护</div>
                        <div className="text-sm text-gray-500">
                          在照片上添加水印
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('watermarkEnabled')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* 功能权限 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>功能权限</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Download className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">允许下载</div>
                        <div className="text-sm text-gray-500">
                          观众可以下载照片
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('allowDownload')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">允许评论</div>
                        <div className="text-sm text-gray-500">
                          观众可以评论照片
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('allowComments')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Heart className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="font-medium">允许点赞</div>
                        <div className="text-sm text-gray-500">
                          观众可以点赞照片
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        {...register('allowLikes')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* 高级设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>高级设置</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大照片数量
                    </label>
                    <input
                      {...register('maxPhotos', { 
                        required: '请输入最大照片数量',
                        min: { value: 1, message: '最少1张照片' },
                        max: { value: 10000, message: '最多10000张照片' }
                      })}
                      type="number"
                      min="1"
                      max="10000"
                      className="input"
                      placeholder="1000"
                    />
                    {errors.maxPhotos && (
                      <p className="text-sm text-red-600 mt-1">{errors.maxPhotos.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      过期时间
                    </label>
                    <input
                      {...register('expiresAt')}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="input"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      留空表示永不过期
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标签
                    </label>
                    <input
                      {...register('tags')}
                      className="input"
                      placeholder="用逗号分隔多个标签，如：婚礼, 现场, 直播"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      用逗号分隔多个标签
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 保存按钮 */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!isDirty || isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSaving ? '保存中...' : '保存设置'}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 会话状态 */}
            <Card>
              <CardHeader>
                <CardTitle>会话状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge 
                    variant={session.status === 'active' ? 'default' : 'secondary'}
                    className="text-lg px-4 py-2"
                  >
                    {session.status === 'active' ? '进行中' : session.status === 'paused' ? '已暂停' : '已结束'}
                  </Badge>
                </div>
                
                {session.status === 'active' && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => handleSessionAction('pause')}
                      className="w-full"
                    >
                      暂停会话
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleSessionAction('end')}
                      className="w-full"
                    >
                      结束会话
                    </Button>
                  </div>
                )}
                
                {session.status === 'paused' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleSessionAction('resume')}
                      className="w-full"
                    >
                      恢复会话
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleSessionAction('end')}
                      className="w-full"
                    >
                      结束会话
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 会话统计 */}
            <Card>
              <CardHeader>
                <CardTitle>会话统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">照片数量</span>
                  <span className="font-medium">{session.stats.photoCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总观看</span>
                  <span className="font-medium">{session.stats.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总点赞</span>
                  <span className="font-medium">{session.stats.likeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总评论</span>
                  <span className="font-medium">{session.stats.commentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总下载</span>
                  <span className="font-medium">{session.stats.downloadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">在线观众</span>
                  <span className="font-medium">{session.stats.viewerCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* 会话信息 */}
            <Card>
              <CardHeader>
                <CardTitle>会话信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">创建时间</span>
                  <div className="font-medium">{formatDate(session.createdAt)}</div>
                </div>
                <div>
                  <span className="text-gray-600">最后更新</span>
                  <div className="font-medium">{formatDate(session.updatedAt)}</div>
                </div>
                <div>
                  <span className="text-gray-600">会话ID</span>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded">{session.id}</div>
                </div>
              </CardContent>
            </Card>

            {/* 危险操作 */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>危险操作</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除会话</span>
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  删除后无法恢复，请谨慎操作
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">删除会话</h3>
                <p className="text-sm text-gray-500">此操作无法撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              您确定要删除会话「{session.title}」吗？这将永久删除所有照片和相关数据。
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSession}
                className="flex-1 flex items-center justify-center space-x-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{isDeleting ? '删除中...' : '确认删除'}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}