'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Users,
  Eye,
  Download,
  Heart,
  Settings,
  Share2,
  Play,
  Pause,
  Square,
  Upload,
  Image,
  BarChart3,
  Clock,
  Calendar,
  Hash,
  Globe,
  Lock,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/providers/auth-provider'
import { formatDate, formatTime } from '@/lib/utils'
import { ApiClient } from '@/lib/api/client'

interface SessionStats {
  totalPhotos: number
  publishedPhotos: number
  pendingPhotos: number
  rejectedPhotos: number
  totalViews: number
  uniqueViewers: number
  avgViewDuration: number
}

interface SessionData {
  id: string
  title: string
  description: string
  detailedDescription?: string
  coverImage?: string
  location?: string
  eventStartDate?: string
  eventEndDate?: string
  type: string
  isPublic: boolean
  accessCode?: string
  status: string
  settings: any
  watermarkEnabled: boolean
  watermarkText?: string
  reviewMode: boolean
  autoTagEnabled: boolean
  language: string
  totalPhotos: number
  publishedPhotos: number
  pendingPhotos: number
  rejectedPhotos: number
  totalViews: number
  uniqueViewers: number
  duration?: number
  startedAt?: string
  endedAt?: string
  createdAt: string
  updatedAt: string
  creatorUsername: string
  creatorRole: string
}

// 创建API客户端实例
const apiClient = new ApiClient()

// 从API获取相册管理数据
const fetchSessionManageData = async (sessionId: string): Promise<{ session: SessionData; stats: SessionStats }> => {
  try {
    const response = await apiClient.get(`/sessions/${sessionId}/manage`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching session manage data:', error)
    
    if (error.code === 'HTTP_403') {
      throw new Error('您没有权限管理此相册')
    } else if (error.code === 'HTTP_404') {
      throw new Error('相册不存在')
    } else {
      throw new Error(error.message || '获取相册信息失败')
    }
  }
}

export default function SessionManagePage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await fetchSessionManageData(sessionId)
        setSessionData(data.session)
        setStats(data.stats)
      } catch (error: any) {
        console.error('Error loading session data:', error)
        toast.error(error.message || '加载相册信息失败')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sessionId, authLoading, isAuthenticated, router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">进行中</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">已暂停</Badge>
      case 'ended':
        return <Badge className="bg-gray-100 text-gray-800">已结束</Badge>
      case 'archived':
        return <Badge className="bg-blue-100 text-blue-800">已归档</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>
    }
  }

  const copyAccessCode = () => {
    if (sessionData?.accessCode) {
      navigator.clipboard.writeText(sessionData.accessCode)
      toast.success('访问码已复制到剪贴板')
    }
  }

  const copyShareLink = () => {
    if (sessionData?.accessCode) {
      const url = `${window.location.origin}/join?code=${sessionData.accessCode}`
      navigator.clipboard.writeText(url)
      toast.success('分享链接已复制到剪贴板')
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载相册管理信息中...</p>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">相册信息加载失败</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>返回仪表板</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{sessionData.title}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusBadge(sessionData.status)}
                  <Badge variant={sessionData.isPublic ? 'default' : 'secondary'}>
                    {sessionData.isPublic ? '公开' : '私密'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/session/${sessionId}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                预览相册
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/session/${sessionId}/settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                相册设置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="photos">照片</TabsTrigger>
            <TabsTrigger value="analytics">统计</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 快速统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">总照片数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalPhotos || 0}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalViews || 0}</p>
                    </div>
                    <Eye className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">独立观众</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.uniqueViewers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">平均观看时长</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.avgViewDuration ? `${Math.round(stats.avgViewDuration)}s` : '0s'}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 相册信息和访问控制 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>相册信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">相册标题</label>
                    <p className="text-gray-900">{sessionData.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">相册描述</label>
                    <p className="text-gray-900">{sessionData.description || '暂无描述'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">相册类型</label>
                    <p className="text-gray-900">
                      {sessionData.type === 'wedding' ? '婚礼' :
                       sessionData.type === 'travel' ? '旅拍' :
                       sessionData.type === 'portrait' ? '人像' :
                       sessionData.type === 'event' ? '活动' :
                       sessionData.type === 'commercial' ? '商业' : '其他'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">创建时间</label>
                    <p className="text-gray-900">{formatDate(sessionData.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>访问控制</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-600">访问类型</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {sessionData.isPublic ? (
                          <>
                            <Globe className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">公开访问</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600">需要访问码</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!sessionData.isPublic && sessionData.accessCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">访问码</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="bg-gray-100 px-3 py-2 rounded font-mono text-lg">
                          {sessionData.accessCode}
                        </code>
                        <Button size="sm" variant="outline" onClick={copyAccessCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">分享链接</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Button size="sm" variant="outline" onClick={copyShareLink} className="flex-1">
                        <Share2 className="h-4 w-4 mr-2" />
                        复制分享链接
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 照片管理标签页 */}
          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>照片管理</CardTitle>
                    <CardDescription>管理相册中的所有照片</CardDescription>
                  </div>
                  <Button onClick={() => router.push(`/session/${sessionId}/upload`)}>
                    <Upload className="h-4 w-4 mr-2" />
                    上传照片
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 border rounded-lg">
                    <Image className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats?.publishedPhotos || 0}</p>
                    <p className="text-sm text-gray-600">已发布照片</p>
                  </div>
                  
                  <div className="text-center p-6 border rounded-lg">
                    <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats?.pendingPhotos || 0}</p>
                    <p className="text-sm text-gray-600">待审核照片</p>
                  </div>
                  
                  <div className="text-center p-6 border rounded-lg">
                    <Trash2 className="h-12 w-12 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats?.rejectedPhotos || 0}</p>
                    <p className="text-sm text-gray-600">已拒绝照片</p>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/session/${sessionId}/photos`)}
                  >
                    查看所有照片
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 统计分析标签页 */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>详细统计</CardTitle>
                <CardDescription>相册的详细访问和使用统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600 mb-2">统计功能开发中</p>
                  <p className="text-sm text-gray-500">即将为您提供详细的访问统计和分析报告</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 设置标签页 */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>相册设置</CardTitle>
                <CardDescription>管理相册的各项设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">审核模式</h4>
                      <p className="text-sm text-gray-600">
                        {sessionData.reviewMode ? '开启 - 照片需要审核后才能发布' : '关闭 - 照片自动发布'}
                      </p>
                    </div>
                    <Badge variant={sessionData.reviewMode ? 'default' : 'secondary'}>
                      {sessionData.reviewMode ? '已开启' : '已关闭'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">水印</h4>
                      <p className="text-sm text-gray-600">
                        {sessionData.watermarkEnabled ? '已启用水印保护' : '未启用水印'}
                      </p>
                    </div>
                    <Badge variant={sessionData.watermarkEnabled ? 'default' : 'secondary'}>
                      {sessionData.watermarkEnabled ? '已启用' : '未启用'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">自动标签</h4>
                      <p className="text-sm text-gray-600">
                        {sessionData.autoTagEnabled ? '自动为照片添加标签' : '手动管理照片标签'}
                      </p>
                    </div>
                    <Badge variant={sessionData.autoTagEnabled ? 'default' : 'secondary'}>
                      {sessionData.autoTagEnabled ? '已启用' : '未启用'}
                    </Badge>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => router.push(`/session/${sessionId}/settings`)}
                      className="w-full"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      编辑相册设置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 