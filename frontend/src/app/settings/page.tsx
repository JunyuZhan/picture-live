'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Camera, 
  Download,
  Eye,
  Palette,
  Save,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/api/useAuth'

interface UserSettings {
  notifications: {
    email: {
      newPhotos: boolean
      sessionUpdates: boolean
      systemUpdates: boolean
    }
    push: {
      newPhotos: boolean
      sessionUpdates: boolean
      systemUpdates: boolean
    }
  }
  privacy: {
    showEmail: boolean
    showLocation: boolean
    allowSearch: boolean
  }
  preferences: {
    defaultLanguage: string
    defaultTimezone: string
    autoUpload: boolean
    imageQuality: 'low' | 'medium' | 'high' | 'original'
    watermarkEnabled: boolean
    reviewMode: boolean
    theme: 'light' | 'dark' | 'system'
  }
}

interface UserProfile {
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  bio?: string
  location?: string
  website?: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'preferences'>('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  const { data: currentUser } = useCurrentUser()
  const router = useRouter()

  const profileForm = useForm<UserProfile>()
  const settingsForm = useForm<UserSettings>()

  // 检查管理员权限
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      toast.error('您没有权限访问系统设置')
      router.push('/profile') // 重定向到个人设置页面
      return
    }
  }, [currentUser, router])

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUserData()
    }
  }, [currentUser])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      
      // 加载用户资料
      const profileResponse = await fetch('http://localhost:3001/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile({
          username: profileData.data.user.username,
          email: profileData.data.user.email,
          displayName: profileData.data.user.displayName || profileData.data.user.username,
          avatarUrl: profileData.data.user.avatarUrl,
          bio: profileData.data.user.bio || '',
          location: profileData.data.user.location || '',
          website: profileData.data.user.website || ''
        })
        profileForm.reset({
          username: profileData.data.user.username,
          email: profileData.data.user.email,
          displayName: profileData.data.user.displayName || profileData.data.user.username,
          avatarUrl: profileData.data.user.avatarUrl,
          bio: profileData.data.user.bio || '',
          location: profileData.data.user.location || '',
          website: profileData.data.user.website || ''
        })
      }

      // 加载用户设置
      const settingsResponse = await fetch('http://localhost:3001/api/users/me/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData.data.settings)
        settingsForm.reset(settingsData.data.settings)
      } else {
        // 如果设置加载失败，使用默认设置
        const defaultSettings: UserSettings = {
          notifications: {
            email: {
              newPhotos: true,
              sessionUpdates: true,
              systemUpdates: false
            },
            push: {
              newPhotos: true,
              sessionUpdates: true,
              systemUpdates: false
            }
          },
          privacy: {
            showEmail: false,
            showLocation: false,
            allowSearch: true
          },
          preferences: {
            defaultLanguage: 'zh-CN',
            defaultTimezone: 'Asia/Shanghai',
            autoUpload: true,
            imageQuality: 'high',
            watermarkEnabled: false,
            reviewMode: false,
            theme: 'system'
          }
        }
        
        setSettings(defaultSettings)
        settingsForm.reset(defaultSettings)
      }
      
    } catch (error) {
      console.error('加载用户数据失败:', error)
      toast.error('加载设置失败')
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async (data: UserProfile) => {
    try {
      setIsSaving(true)
      
      // 临时模拟保存成功
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProfile(data)
      toast.success('个人资料已更新')
      
    } catch (error) {
      console.error('保存个人资料失败:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const saveSettings = async (data: UserSettings) => {
    try {
      setIsSaving(true)
      
      // 临时模拟保存
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSettings(data)
      toast.success('设置已保存')
      
    } catch (error) {
      console.error('保存设置失败:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 权限检查
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              只有管理员才能访问系统设置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/profile')} className="w-full">
              前往个人设置
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
              返回仪表板
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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

  const tabs = [
    { id: 'profile', name: '个人资料', icon: User },
    { id: 'notifications', name: '通知设置', icon: Bell },
    { id: 'privacy', name: '隐私设置', icon: Shield },
    { id: 'preferences', name: '偏好设置', icon: Settings },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">系统设置</h1>
              <p className="text-gray-600">管理系统全局设置和配置（仅限管理员）</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏导航 */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>个人资料</span>
                  </CardTitle>
                  <CardDescription>
                    管理您的公开资料信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-6">
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
                          {...profileForm.register('displayName')}
                          className="input"
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
                        {...profileForm.register('bio')}
                        rows={3}
                        className="input"
                        placeholder="介绍一下自己..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          所在地
                        </label>
                        <input
                          {...profileForm.register('location')}
                          className="input"
                          placeholder="输入所在地"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          个人网站
                        </label>
                        <input
                          {...profileForm.register('website')}
                          type="url"
                          className="input"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center space-x-2"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>{isSaving ? '保存中...' : '保存资料'}</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>通知设置</span>
                  </CardTitle>
                  <CardDescription>
                    管理您接收通知的方式
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">邮件通知</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.email.newPhotos')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">新照片上传通知</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.email.sessionUpdates')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">相册更新通知</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.email.systemUpdates')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">系统更新通知</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">推送通知</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.push.newPhotos')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">新照片上传通知</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.push.sessionUpdates')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">相册更新通知</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...settingsForm.register('notifications.push.systemUpdates')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-3 text-sm text-gray-700">系统更新通知</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving}
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
                </CardContent>
              </Card>
            )}

            {activeTab === 'privacy' && settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>隐私设置</span>
                  </CardTitle>
                  <CardDescription>
                    控制您的信息可见性和搜索设置
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">显示邮箱地址</div>
                          <div className="text-sm text-gray-500">其他用户可以看到您的邮箱地址</div>
                        </div>
                        <input
                          {...settingsForm.register('privacy.showEmail')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">显示位置信息</div>
                          <div className="text-sm text-gray-500">在个人资料中显示您的位置</div>
                        </div>
                        <input
                          {...settingsForm.register('privacy.showLocation')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">允许被搜索</div>
                          <div className="text-sm text-gray-500">其他用户可以通过用户名找到您</div>
                        </div>
                        <input
                          {...settingsForm.register('privacy.allowSearch')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving}
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
                </CardContent>
              </Card>
            )}

            {activeTab === 'preferences' && settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>偏好设置</span>
                  </CardTitle>
                  <CardDescription>
                    个性化您的应用体验
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          默认语言
                        </label>
                        <select
                          {...settingsForm.register('preferences.defaultLanguage')}
                          className="input"
                        >
                          <option value="zh-CN">中文</option>
                          <option value="en-US">English</option>
                          <option value="ja-JP">日本語</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          图片质量
                        </label>
                        <select
                          {...settingsForm.register('preferences.imageQuality')}
                          className="input"
                        >
                          <option value="low">低质量（省流量）</option>
                          <option value="medium">中等质量</option>
                          <option value="high">高质量（推荐）</option>
                          <option value="original">原始质量</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">自动上传</div>
                          <div className="text-sm text-gray-500">拍照后自动上传到当前相册</div>
                        </div>
                        <input
                          {...settingsForm.register('preferences.autoUpload')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">默认启用水印</div>
                          <div className="text-sm text-gray-500">新建相册时默认启用水印保护</div>
                        </div>
                        <input
                          {...settingsForm.register('preferences.watermarkEnabled')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">默认审核模式</div>
                          <div className="text-sm text-gray-500">新建相册时默认启用照片审核</div>
                        </div>
                        <input
                          {...settingsForm.register('preferences.reviewMode')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving}
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 