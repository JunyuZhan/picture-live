import { api } from './client'
import type {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  AuthResponse,
  RefreshTokenResponse,
  User,
  ApiResponse,
} from '@/types/api'

/**
 * 认证相关API服务
 */
export class AuthApi {
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data!
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', userData)
    return response.data!
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    })
    return response.data!
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data!
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await api.patch<User>('/auth/profile', data)
    return response.data!
  }

  /**
   * 修改密码
   */
  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<void> {
    await api.patch('/auth/password', data)
  }

  /**
   * 请求密码重置
   */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  }

  /**
   * 重置密码
   */
  async resetPassword(data: {
    token: string
    password: string
    confirmPassword: string
  }): Promise<void> {
    await api.post('/auth/reset-password', data)
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token })
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(): Promise<void> {
    await api.post('/auth/resend-verification')
  }

  /**
   * 检查邮箱是否已存在
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await api.get<{ exists: boolean }>(
        `/auth/check-email?email=${encodeURIComponent(email)}`
      )
      return response.data!.exists
    } catch (error) {
      return false
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    totalSessions: number
    totalPhotos: number
    totalViews: number
    totalLikes: number
  }> {
    const response = await api.get<{
      totalSessions: number
      totalPhotos: number
      totalViews: number
      totalLikes: number
    }>('/auth/stats')
    return response.data!
  }

  /**
   * 上传头像
   */
  async uploadAvatar(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await api.upload<{ avatarUrl: string }>(
      '/auth/avatar',
      formData,
      onProgress
    )
    return response.data!
  }

  /**
   * 删除头像
   */
  async deleteAvatar(): Promise<void> {
    await api.delete('/auth/avatar')
  }
}

// 导出单例实例
export const authApi = new AuthApi()