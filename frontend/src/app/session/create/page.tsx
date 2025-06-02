'use client'

import { useState } from 'react'
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
  MessageCircle,
  Heart,
  Shield,
  Droplets,
  Hash,
  Calendar,
  Tag,
  ArrowLeft,
  Plus,
  X,
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { CreateSessionRequest } from '@/types/session'

interface CreateSessionFormData {
  title: string
  description: string
  type: 'wedding' | 'event' | 'portrait' | 'commercial' | 'other'
  settings: {
    isPublic: boolean
    allowDownload: boolean
    allowComments: boolean
    allowLikes: boolean
    requireApproval: boolean
    watermarkEnabled: boolean
    autoApprove: boolean
    maxPhotos: number
    expirationDays: number
    tags: { value: string }[]
  }
}

export default function CreateSessionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const { user } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateSessionFormData>({
    defaultValues: {
      title: '',
      description: '',
      type: 'event',
      settings: {
        isPublic: true,
        allowDownload: true,
        allowComments: true,
        allowLikes: true,
        requireApproval: false,
        watermarkEnabled: true,
        autoApprove: true,
        maxPhotos: 500,
        expirationDays: 7,
        tags: [],
      },
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'settings.tags',
  })

  const watchedType = watch('type')
  const watchedSettings = watch('settings')

  const onSubmit = async (data: CreateSessionFormData) => {
    try {
      setIsLoading(true)
      
      const createData: CreateSessionRequest = {
        title: data.title,
        description: data.description,
        type: data.type,
        settings: {
          ...data.settings,
          isPublic: data.type === 'public',
          expiresAt: new Date(
            Date.now() + data.settings.expirationDays * 24 * 60 * 60 * 1000
          ).toISOString(),
          tags: data.settings.tags.map(tag => tag.value).filter(Boolean),
        },
      }

      // 这里应该调用API创建会话
      console.log('Creating session:', createData)
      await new Promise(resolve => setTimeout(resolve, 2000)) // 模拟API调用
      
      toast.success('会话创建成功！')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Create session failed:', error)
      toast.error(error.response?.data?.message || '创建会话失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    append({ value: '' })
  }

  const removeTag = (index: number) => {
    remove(index)
  }

  if (!user || user.role !== 'photographer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              只有摄影师账户才能创建会话
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
              <span className="text-lg font-semibold">创建新会话</span>
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
                <span className="text-sm font-medium">会话设置</span>
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
                      设置会话的基本信息和访问权限
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 会话标题 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        会话标题 *
                      </label>
                      <input
                        {...register('title', {
                          required: '请输入会话标题',
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

                    {/* 会话描述 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        会话描述
                      </label>
                      <textarea
                        {...register('description', {
                          maxLength: {
                            value: 500,
                            message: '描述不能超过500个字符',
                          },
                        })}
                        placeholder="简要描述这次拍摄会话的内容和目的"
                        rows={3}
                        className="input w-full resize-none"
                        disabled={isLoading}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    {/* 会话类型 */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        会话类型 *
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="cursor-pointer">
                          <input
                            {...register('type')}
                            type="radio"
                            value="public"
                            className="sr-only"
                            disabled={isLoading}
                          />
                          <div className={`p-4 border-2 rounded-lg transition-all ${
                            watchedType === 'public'
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <Globe className="h-6 w-6 text-primary" />
                              <div>
                                <div className="font-medium">公开会话</div>
                                <div className="text-sm text-gray-500">
                                  任何人都可以通过访问码加入
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                        <label className="cursor-pointer">
                          <input
                            {...register('type')}
                            type="radio"
                            value="private"
                            className="sr-only"
                            disabled={isLoading}
                          />
                          <div className={`p-4 border-2 rounded-lg transition-all ${
                            watchedType === 'private'
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <Lock className="h-6 w-6 text-primary" />
                              <div>
                                <div className="font-medium">私密会话</div>
                                <div className="text-sm text-gray-500">
                                  仅邀请的用户可以加入
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center space-x-2"
                  >
                    <span>下一步</span>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 第二步：会话设置 */}
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
                      控制观众在会话中的操作权限
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          {...register('settings.allowComments')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          disabled={isLoading}
                        />
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">允许评论</span>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          {...register('settings.allowLikes')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          disabled={isLoading}
                        />
                        <div className="flex items-center space-x-2">
                          <Heart className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">允许点赞</span>
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
                          {...register('settings.watermarkEnabled')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          disabled={isLoading}
                        />
                        <div className="flex items-center space-x-2">
                          <Droplets className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">添加水印</span>
                        </div>
                      </label>
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
                          会话有效期（天）
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
                      添加标签帮助分类和搜索会话
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
                        disabled={isLoading || fields.length >= 10}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>添加标签</span>
                      </Button>
                      <div className="text-xs text-gray-500">
                        最多可添加10个标签，每个标签不超过20个字符
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>上一步</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>创建中...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>创建会话</span>
                      </>
                    )}
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