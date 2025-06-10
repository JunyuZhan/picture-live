'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Camera, Users, Hash, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { useSession } from '@/components/providers/session-provider'

interface JoinSessionFormData {
  accessCode: string
  displayName?: string
}

export default function JoinSessionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const { joinSession } = useSession()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinSessionFormData>({
    defaultValues: {
      accessCode: '',
      displayName: user?.name || '',
    },
  })

  const onSubmit = async (data: JoinSessionFormData) => {
    try {
      setIsLoading(true)
      
      // 先验证访问码是否有效，并获取相册ID
      const response = await fetch(`http://localhost:3001/api/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessCode: data.accessCode,
          displayName: data.displayName || '访客'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '加入相册失败')
      }

      const result = await response.json()
      
      // 直接跳转到相册页面，访问码会自动在URL中传递或存储
      if (result.data?.sessionId) {
        // 存储访问码到 sessionStorage
        sessionStorage.setItem(`session_${result.data.sessionId}_access_code`, data.accessCode)
        router.push(`/session/${result.data.sessionId}`)
      } else {
        // 备用方案：使用传统的 joinSession 方法
        await joinSession(data.accessCode, data.displayName)
      }
      
      toast.success('成功加入相册')
    } catch (error: any) {
      console.error('Join session failed:', error)
      toast.error(error.message || '加入相册失败，请检查访问码')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">加入拍摄相册</CardTitle>
            <CardDescription>
              输入访问码加入正在进行的拍摄相册
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 访问码输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  访问码
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('accessCode', {
                      required: '请输入访问码',
                      minLength: {
                        value: 6,
                        message: '访问码至少需要6个字符',
                      },
                      maxLength: {
                        value: 12,
                        message: '访问码不能超过12个字符',
                      },
                      pattern: {
                        value: /^[A-Z0-9]+$/,
                        message: '访问码只能包含大写字母和数字',
                      },
                    })}
                    type="text"
                    placeholder="请输入6-12位访问码"
                    className="input pl-10 w-full uppercase"
                    disabled={isLoading}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                {errors.accessCode && (
                  <p className="text-sm text-red-600">{errors.accessCode.message}</p>
                )}
                <div className="text-xs text-gray-500">
                  访问码由摄影师提供，通常为6-12位大写字母和数字组合
                </div>
              </div>

              {/* 显示名称输入（如果未登录） */}
              {!user && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    显示名称 <span className="text-gray-400">(可选)</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('displayName', {
                        maxLength: {
                          value: 50,
                          message: '显示名称不能超过50个字符',
                        },
                      })}
                      type="text"
                      placeholder="请输入您的显示名称"
                      className="input pl-10 w-full"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-sm text-red-600">{errors.displayName.message}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    如果不填写，将使用默认的访客名称
                  </div>
                </div>
              )}

              {/* 用户状态提示 */}
              {user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {user.role === 'photographer' ? '摄影师' : '观众'}
                    </Badge>
                    <span className="text-sm text-blue-800">
                      以 {user.name} 身份加入
                    </span>
                  </div>
                </div>
              )}

              {/* 加入按钮 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>加入中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>加入相册</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* 功能说明 */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium text-gray-700">加入后您可以：</div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>实时查看拍摄的照片</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-primary" />
                  <span>与其他参与者互动</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>下载和分享照片（如果允许）</span>
                </div>
              </div>
            </div>

            {/* 分隔线 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            {/* 其他选项 */}
            <div className="space-y-3">
              {!user && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/login')}
                    className="w-full"
                  >
                    登录账户
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/register')}
                    className="w-full"
                  >
                    创建账户
                  </Button>
                </>
              )}
              {user?.role === 'photographer' && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  创建新相册
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 返回首页 */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            ← 返回首页
          </Link>
        </div>
      </motion.div>
    </div>
  )
}