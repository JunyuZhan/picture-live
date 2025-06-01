import { api } from './client'
import { User, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types/auth'

export const authApi = {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    return api.post('/api/auth/login', data)
  },

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return api.post('/api/auth/register', data)
  },

  /**
   * 获取用户信息
   */
  async getProfile(): Promise<User> {
    return api.get('/api/auth/profile')
  },

  /**
   * 更新用户信息
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    return api.put('/api/auth/profile', data)
  },

  /**
   * 修改密码
   */
  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    return api.post('/api/auth/change-password', data)
  },

  /**
   * 忘记密码
   */
  async forgotPassword(email: string): Promise<void> {
    return api.post('/api/auth/forgot-password', { email })
  },

  /**
   * 重置密码
   */
  async resetPassword(data: {
    token: string
    password: string
  }): Promise<void> {
    return api.post('/api/auth/reset-password', data)
  },

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    return api.post('/api/auth/refresh', { refreshToken })
  },

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    return api.post('/api/auth/logout')
  },

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<void> {
    return api.post('/api/auth/verify-email', { token })
  },

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(): Promise<void> {
    return api.post('/api/auth/resend-verification')
  },

  /**
   * 检查用户名是否可用
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    return api.get(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
  },

  /**
   * 检查邮箱是否可用
   */
  async checkEmail(email: string): Promise<{ available: boolean }> {
    return api.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
  },
}