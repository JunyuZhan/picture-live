import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import { tokenUtils } from '@/lib/utils/token'
import type { ApiResponse, ApiError } from '@/types/api'

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
console.log('API_BASE_URL:', process.env.NEXT_PUBLIC_API_URL);
const API_TIMEOUT = 30000 // 30 seconds

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  async (config) => {
    // 调试：输出最终请求URL
    console.log('Final request URL:', (config.baseURL || '') + (config.url || ''));
    // 如果是登录或注册请求，不需要添加token
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      config.metadata = { startTime: new Date() }
      return config
    }

    // 获取访问令牌
    let token = tokenUtils.getAccessToken()
    console.debug('Request interceptor - Initial token:', token ? 'exists' : 'null')
    
    // 检查令牌是否过期
    if (token && tokenUtils.isTokenExpired(token)) {
      console.debug('Token expired, attempting refresh')
      try {
        token = await tokenUtils.refreshToken()
        console.debug('Token refresh successful')
      } catch (e) {
        console.warn('Token refresh failed:', e)
        tokenUtils.removeTokens()
        token = null
        // 不在这里重定向，让响应拦截器处理 401 错误
      }
    }

    // 如果没有token，再次尝试获取（可能在登录过程中刚刚保存）
    if (!token) {
      token = tokenUtils.getAccessToken()
      console.debug('Retry getting token from storage:', token ? 'found' : 'not found')
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.debug('Authorization header set for:', config.url)
      console.debug('Token preview:', token.substring(0, 20) + '...')
    } else {
      // 只有在需要认证的请求中才警告
      if (!config.url?.includes('/auth/')) {
        console.warn('No valid access token available for:', config.url)
        console.warn('Proceeding without token, backend will return 401 if auth required')
      }
    }

    config.metadata = { startTime: new Date() }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理通用响应和错误
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const endTime = new Date()
    const startTime = response.config.metadata?.startTime
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime()
      console.debug(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    if (!error.response) {
      console.error('Network error:', error.message)
      toast.error('网络连接失败，请检查您的网络连接')
      return Promise.reject(error)
    }
    
    const { status, data } = error.response
    
    if (status === 401 && !originalRequest._retry) {
      // 如果是登录或注册请求失败，不进行token刷新
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error)
      }

      originalRequest._retry = true
      
      try {
        const newToken = await tokenUtils.refreshToken()
        tokenUtils.setAccessToken(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        console.warn('令牌刷新失败，跳转登录页面')
        tokenUtils.removeTokens()
        // 只有在非登录页面时才重定向
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?session_expired=true'
        }
        // 返回一个明确的认证失败错误，而不是原始的 401 错误
        return Promise.reject(new Error('Authentication failed and token refresh failed'))
      }
    }
    
    const apiError: ApiError = {
      code: data?.code || `HTTP_${status}`,
      message: data?.message || getDefaultErrorMessage(status),
      details: data?.details,
    }
    
    if (status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else if (status === 403) {
      toast.error('您没有权限执行此操作')
    } else if (status === 404) {
      toast.error('请求的资源不存在')
    } else if (status === 429) {
      toast.error('请求过于频繁，请稍后重试')
    } else if (data?.message && status < 500) {
      toast.error(data.message)
    }
    
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method,
      status,
      data,
    })
    
    return Promise.reject(apiError)
  }
)

// 获取默认错误消息的辅助函数
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '请求参数错误'
    case 401:
      return '未授权访问'
    case 403:
      return '禁止访问'
    case 404:
      return '资源不存在'
    case 409:
      return '资源冲突'
    case 422:
      return '请求数据验证失败'
    case 429:
      return '请求过于频繁'
    case 500:
      return '服务器内部错误'
    case 502:
      return '网关错误'
    case 503:
      return '服务不可用'
    case 504:
      return '网关超时'
    default:
      return '未知错误'
  }
}

// API包装器类
export class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = apiClient
  }
  
  // GET请求
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config)
    return response.data
  }
  
  // POST请求
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config)
    return response.data
  }
  
  // PUT请求
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config)
    return response.data
  }
  
  // PATCH请求
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data, config)
    return response.data
  }
  
  // DELETE请求
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config)
    return response.data
  }
  
  // 上传文件（带进度）
  async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
    })
    return response.data
  }
  
  // 下载文件
  async download(
    url: string,
    filename?: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const response = await this.client.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
    })
    
    // 如果提供了文件名，创建下载链接
    if (filename) {
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    }
    
    return response.data
  }
  
  // 获取原始axios实例用于自定义请求
  getRawClient(): AxiosInstance {
    return this.client
  }
}

// 导出单例实例
export const api = new ApiClient()

// 导出axios实例用于直接使用
export { apiClient }

// 导出类型
export type { AxiosRequestConfig, AxiosResponse }

// 扩展AxiosRequestConfig类型以支持metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: Date
    }
  }
}