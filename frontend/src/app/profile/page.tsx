'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { 
  User, 
  Edit2, 
  Save, 
  Camera,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/api/useAuth'

interface UserProfile {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  bio?: string
  location?: string
  website?: string
  createdAt: string
  role: string
  isActive: boolean
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  const { data: currentUser } = useCurrentUser()
  const router = useRouter()

  const form = useForm<UserProfile>()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('http://localhost:3001/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.data.user)
        form.reset(data.data.user)
      } else {
        throw new Error('加载失败')
      }
      
    } catch (error) {
      console.error('加载个人资料失败:', error)
      toast.error('加载个人资料失败')
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async (data: UserProfile) => {
    try {
      setIsSaving(true)
      
      // 模拟API调用，因为后端可能还没完全实现
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProfile({...profile!, ...data})
      setIsEditing(false)
      toast.success('个人资料已更新')
      
    } catch (error) {
      console.error('保存个人资料失败:', error)
      toast.error('保存个人资料失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    form.reset(profile)
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载个人资料中...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">个人资料加载失败</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            返回首页
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">个人资料</h1>
              <p className="text-gray-600">管理您的个人信息和公开资料</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/settings')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>系统设置</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 头像和基本信息 */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.displayName || profile.username}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-primary" />
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {profile.displayName || profile.username}
                </h2>
                <p className="text-gray-500 text-sm mb-2">@{profile.username}</p>
                
                <div className="flex items-center justify-center space-x-1 text-gray-500 text-sm mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>加入于 {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                  
                  {profile.location && (
                    <div className="flex items-center justify-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  
                  {profile.website && (
                    <div className="flex items-center justify-center space-x-2 text-gray-600">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        个人网站
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细信息编辑 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>个人信息</span>
                    </CardTitle>
                    <CardDescription>
                      编辑您的公开个人信息
                    </CardDescription>
                  </div>
                  <div className="space-x-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancel}>
                          取消
                        </Button>
                        <Button 
                          onClick={form.handleSubmit(saveProfile)}
                          disabled={isSaving}
                          className="flex items-center space-x-2"
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          <span>{isSaving ? '保存中...' : '保存'}</span>
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>编辑</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        用户名
                      </label>
                      <input
                        value={profile.username}
                        disabled
                        className="input bg-gray-50"
                        placeholder="用户名不可修改"
                      />
                      <p className="text-xs text-gray-500 mt-1">用户名创建后不可修改</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        显示名称
                      </label>
                      <input
                        {...form.register('displayName')}
                        disabled={!isEditing}
                        className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                        placeholder="输入显示名称"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      邮箱地址
                    </label>
                    <input
                      value={profile.email}
                      disabled
                      className="input bg-gray-50"
                      placeholder="邮箱地址不可修改"
                    />
                    <p className="text-xs text-gray-500 mt-1">邮箱地址创建后不可修改</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      个人简介
                    </label>
                    <textarea
                      {...form.register('bio')}
                      disabled={!isEditing}
                      rows={3}
                      className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                      placeholder="介绍一下自己..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        所在地
                      </label>
                      <input
                        {...form.register('location')}
                        disabled={!isEditing}
                        className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                        placeholder="输入所在地"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        个人网站
                      </label>
                      <input
                        {...form.register('website')}
                        disabled={!isEditing}
                        type="url"
                        className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 账户信息 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>账户信息</CardTitle>
                <CardDescription>
                  您的账户状态和角色信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      账户角色
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        profile.role === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {profile.role === 'admin' ? '管理员' : '摄影师'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      账户状态
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        profile.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {profile.isActive ? '活跃' : '已停用'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 