import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authApi } from '@/lib/api/auth'
import { tokenUtils } from '@/lib/utils/token'
import { wsClient } from '@/lib/websocket/client'
import type {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
  AuthResponse,
} from '@/types/api'

/**
 * 认证相关的React Query hooks
 */

/**
 * 获取当前用户信息
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!tokenUtils.getAccessToken(),
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: (failureCount, error: any) => {
      // 如果是401错误，不重试
      if (error?.response?.status === 401) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * 用户登录
 */
export function useLogin() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response: AuthResponse) => {
      // 保存token
      tokenUtils.setAccessToken(response.accessToken)
      tokenUtils.setRefreshToken(response.refreshToken)
      
      // 更新WebSocket认证
      wsClient.updateAuth(response.accessToken)
      
      // 设置用户数据到缓存
      queryClient.setQueryData(['auth', 'currentUser'], response.user)
      
      toast.success('登录成功', {
        description: `欢迎回来，${response.user.name}！`,
      })
      
      // 跳转到首页或之前的页面
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/'
      router.push(redirectTo)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '登录失败，请检查用户名和密码'
      toast.error('登录失败', {
        description: message,
      })
    },
  })
}

/**
 * 用户注册
 */
export function useRegister() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response: AuthResponse) => {
      // 保存token
      tokenUtils.setAccessToken(response.accessToken)
      tokenUtils.setRefreshToken(response.refreshToken)
      
      // 更新WebSocket认证
      wsClient.updateAuth(response.accessToken)
      
      // 设置用户数据到缓存
      queryClient.setQueryData(['auth', 'currentUser'], response.user)
      
      toast.success('注册成功', {
        description: `欢迎加入，${response.user.name}！`,
      })
      
      // 跳转到首页
      router.push('/')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '注册失败，请稍后重试'
      toast.error('注册失败', {
        description: message,
      })
    },
  })
}

/**
 * 用户登出
 */
export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // 清除token
      tokenUtils.removeAccessToken()
      tokenUtils.removeRefreshToken()
      
      // 断开WebSocket连接
      wsClient.disconnect()
      
      // 清除所有缓存
      queryClient.clear()
      
      toast.success('已安全退出')
      
      // 跳转到登录页
      router.push('/auth/login')
    },
    onError: (error: any) => {
      // 即使登出失败，也要清除本地数据
      tokenUtils.removeAccessToken()
      tokenUtils.removeRefreshToken()
      wsClient.disconnect()
      queryClient.clear()
      
      const message = error?.response?.data?.message || '退出时发生错误'
      toast.error('退出失败', {
        description: message,
      })
      
      router.push('/auth/login')
    },
  })
}

/**
 * 刷新token
 */
export function useRefreshToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const refreshToken = tokenUtils.getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }
      return authApi.refreshToken(refreshToken)
    },
    onSuccess: (response) => {
      // 更新token
      tokenUtils.setAccessToken(response.accessToken)
      if (response.refreshToken) {
        tokenUtils.setRefreshToken(response.refreshToken)
      }
      
      // 更新WebSocket认证
      wsClient.updateAuth(response.accessToken)
    },
    onError: () => {
      // token刷新失败，清除所有数据并跳转到登录页
      tokenUtils.removeAccessToken()
      tokenUtils.removeRefreshToken()
      wsClient.disconnect()
      queryClient.clear()
      
      window.location.href = '/auth/login'
    },
  })
}

/**
 * 更新用户资料
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (user: User) => {
      // 更新缓存中的用户信息
      queryClient.setQueryData(['auth', 'currentUser'], user)
      
      toast.success('资料更新成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '更新失败，请稍后重试'
      toast.error('更新失败', {
        description: message,
      })
    },
  })
}

/**
 * 修改密码
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.newPassword
      }),
    onSuccess: () => {
      toast.success('密码修改成功', {
        description: '请使用新密码重新登录',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '密码修改失败'
      toast.error('修改失败', {
        description: message,
      })
    },
  })
}

/**
 * 忘记密码
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset(email),
    onSuccess: () => {
      toast.success('重置邮件已发送', {
        description: '请检查您的邮箱并按照说明重置密码',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '发送失败，请稍后重试'
      toast.error('发送失败', {
        description: message,
      })
    },
  })
}

/**
 * 重置密码
 */
export function useResetPassword() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      authApi.resetPassword({
        token: data.token,
        password: data.password,
        confirmPassword: data.password
      }),
    onSuccess: () => {
      toast.success('密码重置成功', {
        description: '请使用新密码登录',
      })
      router.push('/auth/login')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '重置失败，请重新申请'
      toast.error('重置失败', {
        description: message,
      })
    },
  })
}

/**
 * 验证邮箱
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      toast.success('邮箱验证成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '验证失败，请重新申请'
      toast.error('验证失败', {
        description: message,
      })
    },
  })
}

/**
 * 重新发送验证邮件
 */
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: () => authApi.resendVerificationEmail(),
    onSuccess: () => {
      toast.success('验证邮件已发送', {
        description: '请检查您的邮箱',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '发送失败，请稍后重试'
      toast.error('发送失败', {
        description: message,
      })
    },
  })
}

/**
 * 检查用户名是否可用
 */
// Note: checkUsernameExists method is not implemented in AuthApi
// export function useCheckUsernameAvailability() {
//   return useMutation({
//     mutationFn: (username: string) => authApi.checkUsernameExists(username),
//     onError: (error: any) => {
//       console.error('Check username availability error:', error)
//     },
//   })
// }

/**
 * 检查邮箱是否可用
 */
export function useCheckEmailAvailability() {
  return useMutation({
    mutationFn: (email: string) => authApi.checkEmailExists(email),
    onError: (error: any) => {
      console.error('Check email availability error:', error)
    },
  })
}

/**
 * 上传头像
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (response: { avatarUrl: string }) => {
      // 获取当前用户信息并更新头像URL
      const currentUser = queryClient.getQueryData<User>(['auth', 'currentUser'])
      if (currentUser) {
        queryClient.setQueryData(['auth', 'currentUser'], {
          ...currentUser,
          avatarUrl: response.avatarUrl
        })
      }
      
      toast.success('头像上传成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '上传失败，请稍后重试'
      toast.error('上传失败', {
        description: message,
      })
    },
  })
}

/**
 * 删除头像
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.deleteAvatar(),
    onSuccess: () => {
      // 获取当前用户信息并移除头像URL
      const currentUser = queryClient.getQueryData<User>(['auth', 'currentUser'])
      if (currentUser) {
        queryClient.setQueryData(['auth', 'currentUser'], {
          ...currentUser,
          avatarUrl: null
        })
      }
      
      toast.success('头像删除成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '删除失败，请稍后重试'
      toast.error('删除失败', {
        description: message,
      })
    },
  })
}

/**
 * 获取用户统计信息
 */
export function useUserStats() {
  return useQuery({
    queryKey: ['auth', 'stats'],
    queryFn: () => authApi.getUserStats(),
    enabled: !!tokenUtils.getAccessToken(),
    staleTime: 10 * 60 * 1000, // 10分钟
  })
}