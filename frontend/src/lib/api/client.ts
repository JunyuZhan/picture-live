import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import { tokenUtils } from '@/lib/utils/token'
import type { ApiResponse, ApiError } from '@/types/api'

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
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
  (config) => {
    const token = tokenUtils.getAccessToken()
    if (token && !tokenUtils.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求时间戳用于调试
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
    // 记录响应时间用于调试
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
    
    // 处理网络错误
    if (!error.response) {
      console.error('Network error:', error.message)
      toast.error('网络连接失败，请检查您的网络连接')
      return Promise.reject(error)
    }
    
    const { status, data } = error.response
    
    // 处理401未授权 - Token过期或无效
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = tokenUtils.getRefreshToken()
        if (refreshToken && !tokenUtils.isTokenExpired(refreshToken)) {
          // 尝试刷新token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data
          
          // 更新tokens
          tokenUtils.setAccessToken(accessToken)
          if (newRefreshToken) {
            tokenUtils.setRefreshToken(newRefreshToken)
          }
          
          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }
      
      // 刷新失败，清除tokens并跳转登录
      tokenUtils.removeTokens()
      
      // 只在非登录页面显示提示
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        toast.error('登录已过期，请重新登录')
        window.location.href = '/login'
      }
      
      return Promise.reject(error)
    }
    
    // 处理其他HTTP错误
    const apiError: ApiError = {
      code: data?.code || `HTTP_${status}`,
      message: data?.message || getDefaultErrorMessage(status),
      details: data?.details,
    }
    
    // 显示用户友好的错误消息
    if (status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else if (status === 403) {
      toast.error('您没有权限执行此操作')
    } else if (status === 404) {
      toast.error('请求的资源不存在')
    } else if (status === 429) {
      toast.error('请求过于频繁，请稍后重试')
    } else if (data?.message && status < 500) {
      // 显示客户端错误的具体消息
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