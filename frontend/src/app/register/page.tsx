'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Camera, Mail, Lock, User, UserCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { RegisterRequest } from '@/types/api'

interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: 'photographer' | 'viewer'
  displayName?: string
  agreeToTerms: boolean
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'photographer',
      displayName: '',
      agreeToTerms: false,
    },
  })

  const password = watch('password')
  const selectedRole = watch('role')

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true)
      const registerData: RegisterRequest = {
        name: data.displayName || data.username,
        email: data.email,
        password: data.password,
        role: data.role === 'viewer' ? 'client' : data.role,
      }
      await registerUser(registerData)
    } catch (error: any) {
      console.error('Registration failed:', error)
      // 错误处理已在AuthProvider中完成
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
                <Camera className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">加入 Picture Live</CardTitle>
            <CardDescription>
              创建账户，开始你的照片直播之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 角色选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  选择角色
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="cursor-pointer">
                    <input
                      {...register('role')}
                      type="radio"
                      value="photographer"
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div className={`p-3 border-2 rounded-lg text-center transition-all ${
                      selectedRole === 'photographer'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <Camera className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-sm font-medium">摄影师</div>
                      <div className="text-xs text-gray-500">上传和管理照片</div>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      {...register('role')}
                      type="radio"
                      value="viewer"
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div className={`p-3 border-2 rounded-lg text-center transition-all ${
                      selectedRole === 'viewer'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <UserCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-sm font-medium">观众</div>
                      <div className="text-xs text-gray-500">查看和下载照片</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 用户名输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('username', {
                      required: '请输入用户名',
                      minLength: {
                        value: 3,
                        message: '用户名至少需要3个字符',
                      },
                      maxLength: {
                        value: 20,
                        message: '用户名不能超过20个字符',
                      },
                      pattern: {
                        value: /^[a-zA-Z0-9_-]+$/,
                        message: '用户名只能包含字母、数字、下划线和连字符',
                      },
                    })}
                    type="text"
                    placeholder="请输入用户名"
                    className="input pl-10 w-full"
                    disabled={isLoading}
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              {/* 显示名称输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  显示名称 <span className="text-gray-400">(可选)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('displayName', {
                      maxLength: {
                        value: 50,
                        message: '显示名称不能超过50个字符',
                      },
                    })}
                    type="text"
                    placeholder="请输入显示名称"
                    className="input pl-10 w-full"
                    disabled={isLoading}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName.message}</p>
                )}
              </div>

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('email', {
                      required: '请输入邮箱地址',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: '请输入有效的邮箱地址',
                      },
                    })}
                    type="email"
                    placeholder="请输入邮箱地址"
                    className="input pl-10 w-full"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('password', {
                      required: '请输入密码',
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
                    placeholder="请输入密码"
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
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('confirmPassword', {
                      required: '请确认密码',
                      validate: (value) => value === password || '两次输入的密码不一致',
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
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

              {/* 同意条款 */}
              <div className="space-y-2">
                <label className="flex items-start space-x-2">
                  <input
                    {...register('agreeToTerms', {
                      required: '请同意服务条款和隐私政策',
                    })}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">
                    我已阅读并同意{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      服务条款
                    </Link>{' '}
                    和{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      隐私政策
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
                )}
              </div>

              {/* 注册按钮 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>注册中...</span>
                  </div>
                ) : (
                  '创建账户'
                )}
              </Button>
            </form>

            {/* 分隔线 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            {/* 登录链接 */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                已有账户？{' '}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium"
                >
                  立即登录
                </Link>
              </p>
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