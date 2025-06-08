'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { authApi } from '@/lib/api/auth'
import { tokenUtils } from '@/lib/utils/token'
import type { AuthState, LoginRequest } from '@/types/auth'
import type { User, RegisterRequest } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // 初始化认证状态
  useEffect(() => {
    initializeAuth()
  }, [])

  // 定期检查token是否过期
  useEffect(() => {
    const interval = setInterval(() => {
      checkTokenExpiration()
    }, 60000) // 每分钟检查一次

    return () => clearInterval(interval)
  }, [isAuthenticated])

  const initializeAuth = async () => {
    try {
      const accessToken = tokenUtils.getAccessToken()
      
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      // 检查token是否过期
      if (tokenUtils.isTokenExpired(accessToken)) {
        // 尝试刷新token
        const refreshToken = tokenUtils.getRefreshToken()
        if (refreshToken && !tokenUtils.isTokenExpired(refreshToken)) {
          try {
            await refreshTokens()
            return
          } catch (error) {
            console.warn('初始化时刷新令牌失败:', error)
            clearAuthState()
            return
          }
        } else {
          // Refresh token 不存在或已过期，清除认证状态
          console.debug('Refresh token expired or missing, clearing auth state')
          clearAuthState()
          return
        }
      }

      // 获取用户信息
      try {
        const userData = await authApi.getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.warn('获取用户信息失败:', error)
        // 如果获取用户信息失败，检查是否是认证错误
        if (error.response?.status === 401) {
          // 尝试刷新token
          const refreshToken = tokenUtils.getRefreshToken()
          if (refreshToken && !tokenUtils.isTokenExpired(refreshToken)) {
            try {
              await refreshTokens()
            } catch (refreshError) {
              console.warn('刷新令牌失败:', refreshError)
              clearAuthState()
            }
          } else {
            clearAuthState()
          }
        }
        // 对于非认证错误，不清除token，保持登录状态
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      clearAuthState()
    } finally {
      setIsLoading(false)
    }
  }

  const checkTokenExpiration = async () => {
    const accessToken = tokenUtils.getAccessToken()
    
    if (!accessToken || !isAuthenticated) {
      return
    }

    // 检查token是否已经过期（而不是即将过期）
    if (tokenUtils.isTokenExpired(accessToken)) {
      try {
        await refreshTokens()
      } catch (error) {
        console.error('Token refresh failed:', error)
        await logout()
      }
    }
    // 移除了"即将过期"的检查，避免刚登录就触发刷新
  }

  const refreshTokens = async () => {
    const refreshToken = tokenUtils.getRefreshToken()
    
    if (!refreshToken || tokenUtils.isTokenExpired(refreshToken)) {
      throw new Error('Refresh token is invalid or expired')
    }

    const response = await authApi.refreshToken(refreshToken)
    
    tokenUtils.setAccessToken(response.accessToken)
    if (response.refreshToken) {
      tokenUtils.setRefreshToken(response.refreshToken)
    }

    // 刷新token后获取用户信息
    try {
      const userData = await authApi.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to get user after token refresh:', error)
      // 如果获取用户信息失败，尝试从token中解析基本信息
      const userFromToken = tokenUtils.getUserFromToken()
      if (userFromToken) {
        setUser({
          id: userFromToken.id,
          email: userFromToken.email,
          role: userFromToken.role,
          username: '',
          displayName: '',
          createdAt: '',
          updatedAt: ''
        })
      }
    }
  }

  const clearAuthState = () => {
    tokenUtils.removeTokens()
    setUser(null)
    setIsLoading(false)
  }

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true)
      const response = await authApi.login(credentials)
      // 保存tokens
      tokenUtils.setAccessToken(response.accessToken)
      tokenUtils.setRefreshToken(response.refreshToken)
      // 设置用户状态
      setUser(response.user)
      toast.success('登录成功！')
      setTimeout(() => {
        window.location.href = response.user.role === 'photographer' ? '/dashboard' : '/join'
      }, 200)
    } catch (error: any) {
      const message = error.response?.data?.message || '登录失败，请检查用户名和密码'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true)
      const response = await authApi.register(data)
      tokenUtils.setAccessToken(response.accessToken)
      tokenUtils.setRefreshToken(response.refreshToken)
      setUser(response.user)
      toast.success('注册成功！')
      setTimeout(() => {
        window.location.href = response.user.role === 'photographer' ? '/dashboard' : '/join'
      }, 200)
    } catch (error: any) {
      const message = error.response?.data?.message || '注册失败，请重试'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // 调用后端登出接口
      await authApi.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // 无论API调用是否成功，都清除本地状态
      clearAuthState()
      toast.success('已退出登录')
      router.push('/')
    }
  }

  const refreshToken = async () => {
    try {
      await refreshTokens()
    } catch (error) {
      console.error('Manual token refresh failed:', error)
      await logout()
      throw error
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await authApi.updateProfile(data)
      
      setUser(updatedUser)
      
      toast.success('个人信息更新成功！')
    } catch (error: any) {
      const message = error.response?.data?.message || '更新失败，请稍后重试'
      toast.error(message)
      throw error
    }
  }

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// HOC for protecting routes that require authentication
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login')
      }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return AuthenticatedComponent
}

// HOC for protecting routes that require specific roles
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[]
) => {
  const RoleProtectedComponent = (props: P) => {
    const { user, isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login')
        } else if (user && !allowedRoles.includes(user.role)) {
          router.push('/unauthorized')
        }
      }
    }, [isAuthenticated, isLoading, user, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
      return null
    }

    return <Component {...props} />
  }

  RoleProtectedComponent.displayName = `withRole(${Component.displayName || Component.name})`
  return RoleProtectedComponent
}