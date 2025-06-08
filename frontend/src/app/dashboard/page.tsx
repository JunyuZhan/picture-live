'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Camera,
  Users,
  Eye,
  Download,
  Heart,
  MessageCircle,
  MoreVertical,
  Play,
  Pause,
  Square,
  Settings,
  Share2,
  Calendar,
  Clock,
  Hash,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { Session, SessionStatus } from '@/types/api'
import { formatDate, formatTime } from '@/lib/utils'
import { sessionApi } from '@/lib/api/session'

// 从API获取会话数据
const fetchSessions = async (): Promise<Session[]> => {
  try {
    console.debug('Starting to fetch sessions...')
    const response = await sessionApi.getMySessions()
    console.debug('Sessions API response:', response)
    return response.sessions || []
  } catch (error: any) {
    console.error('Error fetching sessions:', error)
    console.error('Error details:', {
      status: error?.response?.status,
      message: error?.message,
      response: error?.response?.data,
      config: error?.config
    })
    
    // 检查是否是认证错误
    if (error.response?.status === 401 || error.message?.includes('Authentication failed')) {
      console.warn('Authentication failed, user will be redirected to login')
      // 不显示错误提示，让 auth provider 处理重定向
      return []
    }
    
    toast.error('获取会话列表失败')
    return []
  }
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  console.log('DASHBOARD user:', user);

  useEffect(() => {
    // 等待认证状态加载完成
    if (authLoading) {
      return
    }

    // 如果未认证，延迟一下再跳转，避免状态同步问题
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/login?session_expired=true')
      }, 500) // 增加延迟时间，给认证状态更多时间初始化
      return () => clearTimeout(timer)
    }

    // 加载会话数据
    const loadSessions = async () => {
      try {
        setIsLoading(true)
        console.debug('Fetching sessions...')
        const sessions = await fetchSessions()
        console.debug('Sessions fetched successfully:', sessions.length)
        setSessions(sessions)
      } catch (error: any) {
        console.error('Error loading sessions:', error)
        console.error('Error details:', {
          status: error?.response?.status,
          message: error?.message,
          response: error?.response?.data
        })
        // 只有在非 401 错误时才显示错误提示
        if (error?.response?.status !== 401) {
          toast.error('加载会话列表失败')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [authLoading, isAuthenticated, router])

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-100 text-green-800">进行中</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">已暂停</Badge>
      case 'ended':
        return <Badge className="bg-gray-100 text-gray-800">已结束</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">已安排</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">已取消</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">未知</Badge>
    }
  }

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'live':
        return <Play className="h-4 w-4 text-green-600" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'ended':
        return <Square className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  const handleSessionAction = async (sessionId: string, action: 'resume' | 'pause' | 'end') => {
    try {
      // 这里应该调用API执行操作
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return

      let newStatus: SessionStatus
      let message: string

      switch (action) {
        case 'resume':
          newStatus = 'live'
          message = '会话已恢复'
          break
        case 'pause':
          newStatus = 'paused'
          message = '会话已暂停'
          break
        case 'end':
          newStatus = 'ended'
          message = '会话已结束'
          break
      }

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: newStatus } : s
      ))
      toast.success(message)
    } catch (error) {
      console.error('Session action failed:', error)
      toast.error('操作失败，请稍后重试')
    }
  }

  const copyAccessCode = (accessCode: string) => {
    navigator.clipboard.writeText(accessCode)
    toast.success('访问码已复制到剪贴板')
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-gray-500">加载中...</div>;
  }

  if (!user || user.role !== 'photographer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              只有摄影师账户才能访问仪表板
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/login')} className="w-full">
              重新登录
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              返回首页
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Picture Live</span>
              </Link>
              <Badge variant="outline">摄影师仪表板</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">欢迎，{user.name}</span>
              <Button
                onClick={() => router.push('/session/create')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>创建会话</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总会话数</p>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                </div>
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">活跃会话</p>
                  <p className="text-2xl font-bold text-green-600">
                    {sessions.filter(s => s.status === 'live').length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总照片数</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {sessions.reduce((sum, s) => sum + s.stats.totalPhotos, 0)}
                  </p>
                </div>
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总观看数</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {sessions.reduce((sum, s) => sum + s.stats.totalViews, 0)}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 会话列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>我的会话</CardTitle>
                <CardDescription>
                  管理您创建的所有拍摄会话
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push('/session/create')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>创建新会话</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有会话</h3>
                <p className="text-gray-600 mb-4">创建您的第一个拍摄会话开始使用</p>
                <Button onClick={() => router.push('/session/create')}>
                  创建会话
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.title}
                          </h3>
                          {getStatusBadge(session.status)}
                          <Badge variant={!session.isPrivate ? 'default' : 'secondary'}>
                            {!session.isPrivate ? '公开' : '私密'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4">{session.description}</p>
                        
                        {/* 访问码 */}
                        <div className="flex items-center space-x-2 mb-4">
                          <Hash className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">访问码：</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {session.accessCode}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyAccessCode(session.accessCode)}
                          >
                            复制
                          </Button>
                        </div>

                        {/* 统计信息 */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Camera className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.totalPhotos} 张照片
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.totalViews} 次观看
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.totalLikes} 个赞
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Download className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.totalDownloads} 次下载
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.peakViewers} 峰值观看
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {session.stats.totalViews} 次观看
                            </span>
                          </div>
                        </div>

                        {/* 时间信息 */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>创建于 {formatDate(session.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>更新于 {formatTime(session.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/session/${session.id}`)}
                        >
                          查看
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/session/${session.id}/settings`)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/join?code=${session.accessCode}`
                            navigator.clipboard.writeText(url)
                            toast.success('分享链接已复制')
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        
                        {/* 状态控制按钮 */}
                        {session.status === 'live' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSessionAction(session.id, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSessionAction(session.id, 'end')}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {session.status === 'paused' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSessionAction(session.id, 'resume')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSessionAction(session.id, 'end')}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}