import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import { getToken, setToken, removeToken, isTokenExpired } from '@/lib/utils/token'

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求时间戳
    config.metadata = { startTime: new Date() }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 计算请求耗时
    const endTime = new Date()
    const startTime = response.config.metadata?.startTime
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime()
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`)
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // 处理401未授权错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // 清除过期的token
      removeToken()
      
      // 如果不是登录页面，跳转到登录页面
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        toast.error('登录已过期，请重新登录')
        window.location.href = '/login'
      }
      
      return Promise.reject(error)
    }
    
    // 处理403禁止访问错误
    if (error.response?.status === 403) {
      toast.error('没有权限访问该资源')
    }
    
    // 处理404未找到错误
    if (error.response?.status === 404) {
      toast.error('请求的资源不存在')
    }
    
    // 处理429请求过多错误
    if (error.response?.status === 429) {
      toast.error('请求过于频繁，请稍后再试')
    }
    
    // 处理500服务器错误
    if (error.response?.status >= 500) {
      toast.error('服务器错误，请稍后再试')
    }
    
    // 处理网络错误
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      toast.error('网络连接失败，请检查网络设置')
    }
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      toast.error('请求超时，请稍后再试')
    }
    
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
    
    return Promise.reject(error)
  }
)

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  code?: string
}

// API错误类型
export interface ApiError {
  message: string
  code?: string
  details?: any
}

// 通用API请求方法
export class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = apiClient
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config)
    return response.data.data
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config)
    return response.data.data
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config)
    return response.data.data
  }
  
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config)
    return response.data.data
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config)
    return response.data.data
  }
  
  // 上传文件
  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    
    return response.data.data
  }
  
  // 批量上传文件
  async uploadMultiple<T>(
    url: string,
    files: File[],
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files`, file)
    })
    
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    
    return response.data.data
  }
  
  // 下载文件
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    })
    
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

// 导出默认实例
export const api = new ApiClient()
export default apiClient

// 扩展AxiosRequestConfig类型以支持metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: Date
    }
  }
}