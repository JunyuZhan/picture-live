'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  useEffect(() => {
    // 验证token是否有效
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false)
        return
      }

      try {
        // 这里应该调用API验证token，暂时假设token存在就有效
        setIsValidToken(true)
      } catch (error) {
        setIsValidToken(false)
      }
    }

    validateToken()
  }, [token])

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('重置令牌无效')
      return
    }

    try {
      setIsLoading(true)
      await authApi.resetPassword({ token, password: data.password, confirmPassword: data.confirmPassword })
      setIsSuccess(true)
      toast.success('密码重置成功')
    } catch (error: any) {
      console.error('Reset password failed:', error)
      toast.error(error.response?.data?.message || '重置失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // Token验证中
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-lg">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">验证重置链接...</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Token无效
  if (!isValidToken) {
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
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">链接无效</CardTitle>
              <CardDescription>
                重置密码链接无效或已过期
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  可能的原因：
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• 链接已过期（通常24小时内有效）</li>
                  <li>• 链接已被使用过</li>
                  <li>• 链接格式不正确</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/forgot-password')}
                  className="w-full"
                >
                  重新申请重置密码
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  返回登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // 重置成功
  if (isSuccess) {
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
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">密码重置成功</CardTitle>
              <CardDescription>
                您的密码已成功重置，现在可以使用新密码登录
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                立即登录
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // 重置密码表单
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
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">重置密码</CardTitle>
            <CardDescription>
              请输入您的新密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 新密码输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('password', {
                      required: '请输入新密码',
                      minLength: {
                        value: 8,
                        message: '密码至少需要8个字符',
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                        message: '密码必须包含大小写字母和数字',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入新密码"
                    className="input pl-10 pr-10 w-full"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
                <div className="text-xs text-gray-500">
                  密码要求：至少8个字符，包含大小写字母和数字
                </div>
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('confirmPassword', {
                      required: '请确认新密码',
                      validate: (value) => value === password || '两次输入的密码不一致',
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    className="input pl-10 pr-10 w-full"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* 重置按钮 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>重置中...</span>
                  </div>
                ) : (
                  '重置密码'
                )}
              </Button>
            </form>

            {/* 返回登录 */}
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
              >
                返回登录
              </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}