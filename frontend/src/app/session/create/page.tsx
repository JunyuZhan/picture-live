'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Camera,
  Settings,
  Users,
  Lock,
  Globe,
  Download,
  Shield,
  Droplets,
  Tag,
  ArrowLeft,
  Plus,
  X,
  Type,
  Image,
  Palette,
  Move,
  Maximize2,
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import LocationSelector from '@/components/LocationSelector'
import { CoverImageSelector } from '@/components/session/CoverImageSelector'
import { SessionCreateRequest } from '@/types/session'
import { sessionApi } from '@/lib/api/session'
import type { CreateSessionRequest } from '@/types/api'

interface CreateSessionFormData {
  title: string
  description: string
  detailedDescription: string
  coverImage: string
  location: string
  eventStartDate: string
  eventEndDate: string
  type: 'wedding' | 'event' | 'portrait' | 'commercial' | 'travel' | 'other'
  settings: {
    isPublic: boolean
    allowDownload: boolean
    allowOriginalDownload: boolean
    requireApproval: boolean
    watermark: {
      enabled: boolean
      type: 'text' | 'image'
      text: {
        content: string
        fontSize: number
        fontFamily: string
        color: string
        opacity: number
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
        offsetX: number
        offsetY: number
      }
      image: {
        url: string
        opacity: number
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
        size: 'small' | 'medium' | 'large'
        offsetX: number
        offsetY: number
      }
    }
    autoApprove: boolean
    maxPhotos: number
    expirationDays: number
    defaultSortOrder: 'upload_time' | 'capture_time' | 'file_name'
    tags: { value: string }[]
  }
}

export default function CreateSessionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateSessionFormData>({
    defaultValues: {
      title: '',
      description: '',
      detailedDescription: '',
      coverImage: '',
      location: '',
      eventStartDate: '',
      eventEndDate: '',
      type: 'other',
      settings: {
        isPublic: false,
        allowDownload: true,
        allowOriginalDownload: false,
        requireApproval: false,
        watermark: {
          enabled: false,
          type: 'text' as const,
          text: {
            content: authUser?.username || authUser?.name || '© 摄影师作品',
            fontSize: 16,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#ffffff',
            opacity: 80,
            position: 'bottom-right' as const,
            offsetX: 20,
            offsetY: 20
          },
          image: {
            url: '',
            opacity: 80,
            position: 'bottom-right' as const,
            size: 'medium' as const,
            offsetX: 20,
            offsetY: 20
          }
        },
        autoApprove: true,
        maxPhotos: 1000,
        expirationDays: 7,
        defaultSortOrder: 'upload_time' as const,
        tags: [],
      },
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'settings.tags'
  })

  const watchedType = watch('type')
  const watchedTags = watch('settings.tags')
  const watchedIsPublic = watch('settings.isPublic')
  const watchedWatermarkEnabled = watch('settings.watermark.enabled')
  const watchedWatermarkType = watch('settings.watermark.type')
  const watchedWatermarkText = watch('settings.watermark.text')
  const watchedWatermarkImage = watch('settings.watermark.image')
  const watchedLocation = watch('location')

  // 当用户信息加载时，更新水印默认文字
  useEffect(() => {
    if (authUser && (authUser.username || authUser.name)) {
      setValue('settings.watermark.text.content', `© ${authUser.username || authUser.name}`)
    }
  }, [authUser, setValue])

  // 确保type字段有默认值
  useEffect(() => {
    if (!watchedType) {
      setValue('type', 'other')
    }
  }, [watchedType, setValue])

  // 调试日志
  useEffect(() => {
    console.log('当前选中的相册类型:', watchedType)
  }, [watchedType])

  // 添加示例图片选择功能的状态
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  
  const previewImages = [
    {
      url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=375&fit=crop&crop=center",
      name: "风景照片"
    },
    {
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=375&fit=crop&crop=center", 
      name: "婚礼照片"
    },
    {
      url: "https://images.unsplash.com/photo-1556125574-d7f27ec36a06?w=600&h=375&fit=crop&crop=center",
      name: "人像照片" 
    },
    {
      url: "https://images.unsplash.com/photo-1515378791036-0648a814c963?w=600&h=375&fit=crop&crop=center",
      name: "活动照片"
    }
  ]

  const sessionTypes = [
    { value: 'wedding', label: '婚礼拍摄', icon: '💒', description: '婚礼现场记录' },
    { value: 'event', label: '活动拍摄', icon: '🎉', description: '聚会、庆典等活动' },
    { value: 'portrait', label: '人像拍摄', icon: '📸', description: '个人写真、证件照等' },
    { value: 'commercial', label: '商业拍摄', icon: '🏢', description: '产品、广告等商业用途' },
    { value: 'travel', label: '旅拍摄影', icon: '🌍', description: '旅行拍摄、风景人像等' },
    { value: 'other', label: '其他拍摄', icon: '📷', description: '其他类型的拍摄项目' },
  ]

  const fontFamilies = [
    // 系统无衬线字体
    { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', label: '系统默认字体' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica Neue' },
    { value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', label: 'Segoe UI' },
    { value: 'Roboto, Arial, sans-serif', label: 'Roboto' },
    { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
    { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
    
    // 系统衬线字体
    { value: 'Georgia, "Times New Roman", Times, serif', label: 'Georgia' },
    { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
    { value: 'serif', label: '系统衬线字体' },
    
    // 等宽字体
    { value: '"Courier New", Courier, monospace', label: 'Courier New' },
    { value: 'Monaco, "Lucida Console", monospace', label: 'Monaco' },
    { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
    
    // 中文字体
    { value: '"Microsoft YaHei", "微软雅黑", SimSun, sans-serif', label: '微软雅黑' },
    { value: 'SimSun, "宋体", serif', label: '宋体' },
    { value: 'SimHei, "黑体", sans-serif', label: '黑体' },
    { value: '"PingFang SC", "苹方", "Hiragino Sans GB", "Microsoft YaHei", sans-serif', label: '苹方/苹果系统字体' },
    { value: '"Source Han Sans CN", "思源黑体", "Noto Sans CJK SC", sans-serif', label: '思源黑体' },
    
    // 艺术字体
    { value: 'Impact, "Arial Black", sans-serif', label: 'Impact' },
    { value: '"Comic Sans MS", cursive', label: 'Comic Sans MS' },
    { value: '"Brush Script MT", cursive', label: 'Brush Script MT' },
  ]

  const positions = [
    { value: 'top-left', label: '左上角' },
    { value: 'top-right', label: '右上角' },
    { value: 'center', label: '中间' },
    { value: 'bottom-left', label: '左下角' },
    { value: 'bottom-right', label: '右下角' },
  ]

  const imageSizes = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ]

  const onSubmit = async (data: CreateSessionFormData) => {
    try {
      setIsLoading(true)
      
      const sessionData: CreateSessionRequest = {
        title: data.title,
        description: data.description,
        detailedDescription: data.detailedDescription,
        coverImage: data.coverImage,
        location: data.location,
        eventStartDate: data.eventStartDate,
        eventEndDate: data.eventEndDate,
        type: data.type,
        isPublic: data.settings.isPublic,
        settings: {
          allowDownloads: data.settings.allowDownload,
          allowOriginalDownload: data.settings.allowOriginalDownload,
          autoApprovePhotos: data.settings.autoApprove,
          watermark: data.settings.watermark,
          defaultSortOrder: data.settings.defaultSortOrder,
          qualitySettings: {
            preview: 'medium',
            download: data.settings.allowOriginalDownload ? 'original' : 'compressed'
          },
          notifications: {
            newPhoto: true,
            newViewer: true,
            sessionEnd: true
          }
        }
      }

      const session = await sessionApi.createSession(sessionData)
      
      toast.success('相册创建成功！')
      router.push(`/session/${session.id}`)
      
    } catch (error: any) {
      console.error('Create session failed:', error)
      toast.error(error.response?.data?.message || '创建相册失败')
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const addTag = () => {
    const newTag = prompt('输入标签名称:')
    if (newTag && newTag.trim()) {
      append({ value: newTag.trim() })
    }
  }

  const removeTag = (index: number) => {
    remove(index)
  }

  // 权限检查：只有摄影师可以创建相册
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">验证权限中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              需要登录才能创建相册
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

  if (authUser?.role !== 'photographer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              只有摄影师账户才能创建相册
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                <span>返回仪表板</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">创建新相册</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 步骤指示器 */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className={`flex items-center space-x-2 ${
                currentStep >= 1 ? 'text-primary' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">基本信息</span>
              </div>
              <div className="w-8 h-px bg-gray-300" />
              <div className={`flex items-center space-x-2 ${
                currentStep >= 2 ? 'text-primary' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">相册设置</span>
              </div>
            </div>

            {/* 第一步：基本信息 */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="h-5 w-5" />
                      <span>基本信息</span>
                    </CardTitle>
                    <CardDescription>
                      设置相册的基本信息和访问权限
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 相册标题 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        相册标题 *
                      </label>
                      <input
                        {...register('title', {
                          required: '请输入相册标题',
                          minLength: {
                            value: 2,
                            message: '标题至少需要2个字符',
                          },
                          maxLength: {
                            value: 100,
                            message: '标题不能超过100个字符',
                          },
                        })}
                        type="text"
                        placeholder="例如：婚礼现场拍摄、生日派对记录"
                        className="input w-full"
                        disabled={isLoading}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* 相册描述 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        相册描述
                      </label>
                      <textarea
                        {...register('description', {
                          maxLength: {
                            value: 500,
                            message: '描述不能超过500个字符',
                          },
                        })}
                        placeholder="简要描述这次拍摄相册的内容和目的"
                        rows={3}
                        className="input w-full resize-none"
                        disabled={isLoading}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    {/* 详细描述 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        详细描述
                      </label>
                      <textarea
                        {...register('detailedDescription', {
                          maxLength: {
                            value: 2000,
                            message: '详细描述不能超过2000个字符',
                          },
                        })}
                        placeholder="详细介绍活动背景、拍摄要求、注意事项等..."
                        rows={5}
                        className="input w-full resize-none"
                        disabled={isLoading}
                      />
                      {errors.detailedDescription && (
                        <p className="text-sm text-red-600">{errors.detailedDescription.message}</p>
                      )}
                    </div>

                    {/* 相册封面 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        相册封面图片URL
                      </label>
                      <input
                        {...register('coverImage')}
                        type="url"
                        placeholder="输入封面图片的URL地址"
                        className="input w-full"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500">
                        建议使用16:9比例的高质量图片作为相册封面。
                        <br/>
                        支持多种封面选择方式：从相册选择照片、预设模板、自定义上传或网络图片
                      </p>
                    </div>

                    {/* 活动地点 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        活动地点
                      </label>
                      <LocationSelector
                        value={watchedLocation}
                        onChange={(location) => {
                          setValue('location', location)
                          if (location && location.length > 200) {
                            setValue('location', location.substring(0, 200))
                          }
                        }}
                        placeholder="请选择活动地点"
                      />
                      <input
                        {...register('location', {
                          maxLength: {
                            value: 200,
                            message: '地点不能超过200个字符',
                          },
                        })}
                        type="hidden"
                        value={watchedLocation || ''}
                      />
                      {errors.location && (
                        <p className="text-sm text-red-600">{errors.location.message}</p>
                      )}
                    </div>

                    {/* 活动时间 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          开始日期
                        </label>
                        <input
                          {...register('eventStartDate')}
                          type="date"
                          className="input w-full"
                          disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                          活动开始的日期
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          结束日期
                        </label>
                        <input
                          {...register('eventEndDate')}
                          type="date"
                          className="input w-full"
                          disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                          活动结束的日期（可与开始日期相同）
                        </p>
                      </div>
                    </div>

                    {/* 相册类型 */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        相册类型 *
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessionTypes.map((type) => (
                          <label key={type.value} className="cursor-pointer">
                            <input
                              type="radio"
                              name="sessionType"
                              value={type.value}
                              checked={watchedType === type.value}
                              className="sr-only"
                              disabled={isLoading}
                              onChange={(e) => setValue('type', e.target.value as any)}
                            />
                            <div className={`p-4 border-2 rounded-lg transition-all relative ${
                              watchedType === type.value
                                ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}>
                              {watchedType === type.value && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex items-center space-x-3">
                                <div className={`text-2xl transition-transform ${
                                  watchedType === type.value ? 'scale-110' : ''
                                }`}>{type.icon}</div>
                                <div>
                                  <div className={`font-medium ${
                                    watchedType === type.value
                                      ? 'text-blue-700'
                                      : 'text-gray-900'
                                  }`}>{type.label}</div>
                                  <div className={`text-sm ${
                                    watchedType === type.value
                                      ? 'text-blue-600'
                                      : 'text-gray-500'
                                  }`}>
                                    {type.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2"
                  >
                    <span>下一步</span>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 第二步：相册设置 */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* 权限设置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>权限设置</span>
                    </CardTitle>
                    <CardDescription>
                      控制相册的隐私设置和观众权限
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 隐私设置 */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        相册隐私设置 *
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="isPublic"
                            checked={watchedIsPublic === true}
                            className="mt-1 text-primary focus:ring-primary"
                            disabled={isLoading}
                            onChange={() => setValue('settings.isPublic', true)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-700">公开相册</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              任何人都可以通过链接访问相册，无需访问码
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="isPublic"
                            checked={watchedIsPublic === false}
                            className="mt-1 text-primary focus:ring-primary"
                            disabled={isLoading}
                            onChange={() => setValue('settings.isPublic', false)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Lock className="h-4 w-4 text-orange-600" />
                              <span className="font-medium text-orange-700">私密相册</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              需要访问码才能查看相册，更安全私密
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 观众权限 */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        观众权限
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center space-x-3">
                          <input
                            {...register('settings.allowDownload')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={isLoading}
                          />
                          <div className="flex items-center space-x-2">
                            <Download className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">允许下载照片</span>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            {...register('settings.allowOriginalDownload')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={isLoading}
                          />
                          <div className="flex items-center space-x-2">
                            <Download className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">允许下载原图</span>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            {...register('settings.requireApproval')}
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={isLoading}
                          />
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">需要审核照片</span>
                          </div>
                        </label>
                      </div>
                      
                      {/* 默认排序设置 */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                          默认排序方式
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              {...register('settings.defaultSortOrder')}
                              type="radio"
                              value="upload_time"
                              className="text-primary focus:ring-primary"
                              disabled={isLoading}
                            />
                            <span className="text-sm">按上传时间（最新优先）</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              {...register('settings.defaultSortOrder')}
                              type="radio"
                              value="capture_time"
                              className="text-primary focus:ring-primary"
                              disabled={isLoading}
                            />
                            <span className="text-sm">按拍摄时间（最新优先）</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              {...register('settings.defaultSortOrder')}
                              type="radio"
                              value="file_name"
                              className="text-primary focus:ring-primary"
                              disabled={isLoading}
                            />
                            <span className="text-sm">按文件名排序</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 水印设置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Droplets className="h-5 w-5" />
                      <span>水印设置</span>
                    </CardTitle>
                    <CardDescription>
                      为您的照片添加个性化水印保护版权
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 启用水印 */}
                    <label className="flex items-center space-x-3">
                      <input
                        {...register('settings.watermark.enabled')}
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        disabled={isLoading}
                      />
                      <div className="flex items-center space-x-2">
                        <Droplets className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">启用水印</span>
                      </div>
                    </label>

                    {/* 水印详细设置 */}
                    {watchedWatermarkEnabled && (
                      <div className="space-y-6 pl-6 border-l-2 border-gray-200">
                        {/* 水印预览 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              水印预览
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">示例图片:</span>
                              <select 
                                value={previewImageIndex}
                                onChange={(e) => setPreviewImageIndex(Number(e.target.value))}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                {previewImages.map((img, index) => (
                                  <option key={index} value={index}>{img.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm" style={{ aspectRatio: '16/10' }}>
                            {/* 示例背景图片 */}
                            <div className="absolute inset-0">
                              <img 
                                src={previewImages[previewImageIndex].url}
                                alt={previewImages[previewImageIndex].name}
                                className="w-full h-full object-cover transition-opacity duration-300"
                                onError={(e) => {
                                  // 如果图片加载失败，显示渐变背景
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                    parent.innerHTML = `
                                      <div class="absolute inset-0 flex items-center justify-center">
                                        <div class="text-center text-white">
                                          <svg class="h-12 w-12 mx-auto mb-2 opacity-75" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                          </svg>
                                          <p class="text-sm">示例照片</p>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            
                            {/* 水印叠加层 */}
                            {watchedWatermarkType === 'text' && watchedWatermarkText?.content && (
                              <div 
                                className="absolute pointer-events-none font-semibold select-none"
                                style={{
                                  fontSize: `${watchedWatermarkText.fontSize}px`,
                                  fontFamily: watchedWatermarkText.fontFamily,
                                  color: watchedWatermarkText.color,
                                  opacity: watchedWatermarkText.opacity / 100,
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.7), -1px -1px 2px rgba(255,255,255,0.3)',
                                  userSelect: 'none',
                                  ...(watchedWatermarkText.position === 'top-left' && {
                                    top: `${watchedWatermarkText.offsetY}px`,
                                    left: `${watchedWatermarkText.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkText.position === 'top-right' && {
                                    top: `${watchedWatermarkText.offsetY}px`,
                                    right: `${watchedWatermarkText.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkText.position === 'bottom-left' && {
                                    bottom: `${watchedWatermarkText.offsetY}px`,
                                    left: `${watchedWatermarkText.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkText.position === 'bottom-right' && {
                                    bottom: `${watchedWatermarkText.offsetY}px`,
                                    right: `${watchedWatermarkText.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkText.position === 'center' && {
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(calc(-50% + ${watchedWatermarkText.offsetX}px), calc(-50% + ${watchedWatermarkText.offsetY}px))`,
                                  }),
                                }}
                              >
                                {watchedWatermarkText.content}
                              </div>
                            )}
                            
                            {/* 图片水印预览 */}
                            {watchedWatermarkType === 'image' && watchedWatermarkImage?.url && (
                              <div 
                                className="absolute pointer-events-none"
                                style={{
                                  opacity: watchedWatermarkImage.opacity / 100,
                                  ...(watchedWatermarkImage.position === 'top-left' && {
                                    top: `${watchedWatermarkImage.offsetY}px`,
                                    left: `${watchedWatermarkImage.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkImage.position === 'top-right' && {
                                    top: `${watchedWatermarkImage.offsetY}px`,
                                    right: `${watchedWatermarkImage.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkImage.position === 'bottom-left' && {
                                    bottom: `${watchedWatermarkImage.offsetY}px`,
                                    left: `${watchedWatermarkImage.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkImage.position === 'bottom-right' && {
                                    bottom: `${watchedWatermarkImage.offsetY}px`,
                                    right: `${watchedWatermarkImage.offsetX}px`,
                                  }),
                                  ...(watchedWatermarkImage.position === 'center' && {
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(calc(-50% + ${watchedWatermarkImage.offsetX}px), calc(-50% + ${watchedWatermarkImage.offsetY}px))`,
                                  }),
                                }}
                              >
                                <img 
                                  src={watchedWatermarkImage.url} 
                                  alt="水印预览"
                                  className={`
                                    rounded-sm shadow-lg
                                    ${watchedWatermarkImage.size === 'small' ? 'h-8' : ''}
                                    ${watchedWatermarkImage.size === 'medium' ? 'h-12' : ''}
                                    ${watchedWatermarkImage.size === 'large' ? 'h-16' : ''}
                                  `}
                                  style={{
                                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))'
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            * 这是水印效果的模拟预览，实际效果可能因照片内容而有所不同
                          </p>
                        </div>
                        
                        {/* 水印类型选择 */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-gray-700">
                            水印类型
                          </label>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                {...register('settings.watermark.type')}
                                type="radio"
                                value="text"
                                className="text-primary focus:ring-primary"
                                disabled={isLoading}
                              />
                              <Type className="h-4 w-4 text-gray-600" />
                              <span className="text-sm">文字水印</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                {...register('settings.watermark.type')}
                                type="radio"
                                value="image"
                                className="text-primary focus:ring-primary"
                                disabled={isLoading}
                              />
                              <Image className="h-4 w-4 text-gray-600" />
                              <span className="text-sm">图片水印</span>
                            </label>
                          </div>
                        </div>

                        {/* 文字水印设置 */}
                        {watchedWatermarkType === 'text' && (
                          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900">文字水印设置</h4>
                            
                            {/* 水印文字 */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                水印文字
                              </label>
                              <input
                                {...register('settings.watermark.text.content')}
                                type="text"
                                placeholder="输入水印文字"
                                className="input w-full"
                                disabled={isLoading}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* 字体大小 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  字体大小 ({watch('settings.watermark.text.fontSize')}px)
                                </label>
                                <input
                                  {...register('settings.watermark.text.fontSize')}
                                  type="range"
                                  min="10"
                                  max="48"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>

                              {/* 字体 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  字体
                                </label>
                                <select
                                  {...register('settings.watermark.text.fontFamily')}
                                  className="input w-full"
                                  disabled={isLoading}
                                >
                                  {fontFamilies.map(font => (
                                    <option key={font.value} value={font.value}>
                                      {font.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 颜色 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  颜色
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    {...register('settings.watermark.text.color')}
                                    type="color"
                                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                                    disabled={isLoading}
                                  />
                                  <input
                                    {...register('settings.watermark.text.color')}
                                    type="text"
                                    className="input flex-1"
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              {/* 透明度 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  透明度 ({watch('settings.watermark.text.opacity')}%)
                                </label>
                                <input
                                  {...register('settings.watermark.text.opacity')}
                                  type="range"
                                  min="10"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>
                            </div>

                            {/* 位置和偏移 */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  位置
                                </label>
                                <select
                                  {...register('settings.watermark.text.position')}
                                  className="input w-full"
                                  disabled={isLoading}
                                >
                                  {positions.map(pos => (
                                    <option key={pos.value} value={pos.value}>
                                      {pos.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  水平偏移 ({watch('settings.watermark.text.offsetX')}px)
                                </label>
                                <input
                                  {...register('settings.watermark.text.offsetX')}
                                  type="range"
                                  min="0"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  垂直偏移 ({watch('settings.watermark.text.offsetY')}px)
                                </label>
                                <input
                                  {...register('settings.watermark.text.offsetY')}
                                  type="range"
                                  min="0"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 图片水印设置 */}
                        {watchedWatermarkType === 'image' && (
                          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900">图片水印设置</h4>
                            
                            {/* 水印图片URL */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                水印图片URL
                              </label>
                              <input
                                {...register('settings.watermark.image.url')}
                                type="url"
                                placeholder="输入水印图片的URL地址"
                                className="input w-full"
                                disabled={isLoading}
                              />
                              <p className="text-xs text-gray-500">
                                建议使用PNG格式的透明背景图片
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* 大小 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  大小
                                </label>
                                <select
                                  {...register('settings.watermark.image.size')}
                                  className="input w-full"
                                  disabled={isLoading}
                                >
                                  {imageSizes.map(size => (
                                    <option key={size.value} value={size.value}>
                                      {size.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 透明度 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  透明度 ({watch('settings.watermark.image.opacity')}%)
                                </label>
                                <input
                                  {...register('settings.watermark.image.opacity')}
                                  type="range"
                                  min="10"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>
                            </div>

                            {/* 位置和偏移 */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  位置
                                </label>
                                <select
                                  {...register('settings.watermark.image.position')}
                                  className="input w-full"
                                  disabled={isLoading}
                                >
                                  {positions.map(pos => (
                                    <option key={pos.value} value={pos.value}>
                                      {pos.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  水平偏移 ({watch('settings.watermark.image.offsetX')}px)
                                </label>
                                <input
                                  {...register('settings.watermark.image.offsetX')}
                                  type="range"
                                  min="0"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                  垂直偏移 ({watch('settings.watermark.image.offsetY')}px)
                                </label>
                                <input
                                  {...register('settings.watermark.image.offsetY')}
                                  type="range"
                                  min="0"
                                  max="100"
                                  className="w-full"
                                  disabled={isLoading}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 照片设置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="h-5 w-5" />
                      <span>照片设置</span>
                    </CardTitle>
                    <CardDescription>
                      配置照片的处理和显示选项
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center space-x-3">
                        <input
                          {...register('settings.autoApprove')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          disabled={isLoading}
                        />
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">自动审核通过</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          最大照片数量
                        </label>
                        <input
                          {...register('settings.maxPhotos', {
                            min: {
                              value: 1,
                              message: '至少允许1张照片',
                            },
                            max: {
                              value: 10000,
                              message: '最多允许10000张照片',
                            },
                          })}
                          type="number"
                          min="1"
                          max="10000"
                          className="input w-full"
                          disabled={isLoading}
                        />
                        {errors.settings?.maxPhotos && (
                          <p className="text-sm text-red-600">
                            {errors.settings.maxPhotos.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          相册有效期（天）
                        </label>
                        <input
                          {...register('settings.expirationDays', {
                            min: {
                              value: 1,
                              message: '至少1天',
                            },
                            max: {
                              value: 365,
                              message: '最多365天',
                            },
                          })}
                          type="number"
                          min="1"
                          max="365"
                          className="input w-full"
                          disabled={isLoading}
                        />
                        {errors.settings?.expirationDays && (
                          <p className="text-sm text-red-600">
                            {errors.settings.expirationDays.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 标签设置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Tag className="h-5 w-5" />
                      <span>标签设置</span>
                    </CardTitle>
                    <CardDescription>
                      添加标签帮助分类和搜索相册
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <input
                            {...register(`settings.tags.${index}.value`, {
                              maxLength: {
                                value: 20,
                                message: '标签不能超过20个字符',
                              },
                            })}
                            type="text"
                            placeholder="输入标签"
                            className="input flex-1"
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTag(index)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                        disabled={isLoading}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>添加标签</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isLoading}
                  >
                    上一步
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{isLoading ? '创建中...' : '创建相册'}</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}