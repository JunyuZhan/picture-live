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
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  const isAuthenticated = !!user

  // 初始化认证状态 - 只执行一次
  useEffect(() => {
    if (initialized) return

    const initAuth = async () => {
      try {
        const token = tokenUtils.getAccessToken()
        
        if (!token) {
          setIsLoading(false)
          setInitialized(true)
          return
        }

        const userData = await authApi.getCurrentUser()
        const mappedUser = {
          ...userData,
          name: userData.displayName || userData.username || userData.email,
          role: userData.role as 'photographer' | 'client' | 'admin'
        }
        
        setUser(mappedUser)
        
      } catch (error) {
        console.error('Auth initialization failed:', error)
        clearAuthState()
      } finally {
        setIsLoading(false)
        setInitialized(true)
      }
    }

    initAuth()
  }, [initialized])

  const clearAuthState = () => {
    setUser(null)
    tokenUtils.removeTokens()
  }

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true)
      
      const response = await authApi.login(credentials)
      
      // 保存token
      tokenUtils.setAccessToken(response.accessToken)
      tokenUtils.setRefreshToken(response.refreshToken)
      
      // 映射用户数据
      const user = {
        ...response.user,
        name: response.user.displayName || response.user.username || response.user.email,
        role: response.user.role as 'photographer' | 'client' | 'admin'
      }
      setUser(user)
      
      toast.success('登录成功')
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Login failed:', error)
      toast.error(error?.response?.data?.message || '登录失败')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true)
      await authApi.register(data)
      toast.success('注册成功，请登录')
      router.push('/login')
    } catch (error: any) {
      console.error('Registration failed:', error)
      toast.error(error?.response?.data?.message || '注册失败')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      clearAuthState()
      toast.success('已退出登录')
      router.push('/')
    }
  }

  const refreshToken = async () => {
    const refreshTokenValue = tokenUtils.getRefreshToken()
    if (!refreshTokenValue) {
      throw new Error('No refresh token available')
    }

    const response = await authApi.refreshToken(refreshTokenValue)
    tokenUtils.setAccessToken(response.accessToken)
    tokenUtils.setRefreshToken(response.refreshToken)

    // 重新获取用户信息
    const userData = await authApi.getCurrentUser()
    const user = {
      ...userData,
      name: userData.displayName || userData.username || userData.email,
      role: userData.role as 'photographer' | 'client' | 'admin'
    }
    setUser(user)
  }

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updatedUser = await authApi.updateProfile(data)
    const mappedUser = {
      ...updatedUser,
      name: updatedUser.displayName || updatedUser.username || updatedUser.email,
      role: updatedUser.role as 'photographer' | 'client' | 'admin'
    }
    setUser(mappedUser)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 高阶组件用于需要认证的页面
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login')
      }
    }, [user, isLoading, router])

    if (isLoading) {
      return <div>Loading...</div>
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return AuthenticatedComponent
}

// 高阶组件用于需要特定角色的页面
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[]
) => {
  const RoleProtectedComponent = (props: P) => {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading) {
        if (!user) {
          router.push('/login')
        } else if (!allowedRoles.includes(user.role)) {
          router.push('/unauthorized')
        }
      }
    }, [user, isLoading, router])

    if (isLoading) {
      return <div>Loading...</div>
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return null
    }

    return <Component {...props} />
  }

  RoleProtectedComponent.displayName = `withRole(${Component.displayName || Component.name})`
  return RoleProtectedComponent
}