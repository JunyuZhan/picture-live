import { api } from './client'
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  JoinSessionRequest,
  SessionResponse,
  SessionsResponse,
  Session,
  SessionParticipant,
  PaginationParams,
  FilterParams,
  ApiResponse,
} from '@/types/api'

/**
 * 相册相关API服务
 */
export class SessionApi {
  /**
   * 创建新相册
   */
  async createSession(data: CreateSessionRequest): Promise<Session> {
    const response = await api.post<Session>('/sessions', data)
    return response.data!
  }

  /**
   * 获取相册详情
   */
  async getSession(sessionId: string): Promise<SessionResponse> {
    const response = await api.get<SessionResponse>(`/sessions/${sessionId}`)
    return response.data!
  }

  /**
   * 更新相册信息
   */
  async updateSession(
    sessionId: string,
    data: UpdateSessionRequest
  ): Promise<Session> {
    const response = await api.patch<Session>(`/sessions/${sessionId}`, data)
    return response.data!
  }

  /**
   * 删除相册
   */
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`)
  }

  /**
   * 获取相册列表
   */
  async getSessions(params?: {
    pagination?: PaginationParams
    filters?: FilterParams
  }): Promise<SessionsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.pagination) {
      const { page, limit, sortBy, sortOrder, search } = params.pagination
      if (page) queryParams.append('page', page.toString())
      if (limit) queryParams.append('limit', limit.toString())
      if (sortBy) queryParams.append('sortBy', sortBy)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
      if (search) queryParams.append('search', search)
    }
    
    if (params?.filters) {
      const { status, isPrivate, photographerId, startDate, endDate } = params.filters
      if (status) queryParams.append('status', status)
      if (isPrivate !== undefined) queryParams.append('isPrivate', isPrivate.toString())
      if (photographerId) queryParams.append('photographerId', photographerId)
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
    }

    const response = await api.get<SessionsResponse>(
      `/sessions?${queryParams.toString()}`
    )
    return response.data!
  }

  /**
   * 获取我的相册列表
   */
  async getMySessions(params?: {
    pagination?: PaginationParams
    filters?: Omit<FilterParams, 'photographerId'>
  }): Promise<SessionsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.pagination) {
      const { page, limit, sortBy, sortOrder, search } = params.pagination
      if (page) queryParams.append('page', page.toString())
      if (limit) queryParams.append('limit', limit.toString())
      if (sortBy) queryParams.append('sortBy', sortBy)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
      if (search) queryParams.append('search', search)
    }
    
    if (params?.filters) {
      const { status, isPrivate, startDate, endDate } = params.filters
      if (status) queryParams.append('status', status)
      if (isPrivate !== undefined) queryParams.append('isPrivate', isPrivate.toString())
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
    }

    const response = await api.get<SessionsResponse>(
      `/sessions/my?${queryParams.toString()}`
    )
    return response.data!
  }

  /**
   * 加入相册
   */
  async joinSession(data: JoinSessionRequest): Promise<SessionResponse> {
    const response = await api.post<SessionResponse>('/sessions/join', data)
    return response.data!
  }

  /**
   * 离开相册
   */
  async leaveSession(sessionId: string): Promise<void> {
    await api.post(`/sessions/${sessionId}/leave`)
  }

  /**
   * 开始相册
   */
  async startSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/start`)
    return response.data!
  }

  /**
   * 暂停相册
   */
  async pauseSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/pause`)
    return response.data!
  }

  /**
   * 恢复相册
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/resume`)
    return response.data!
  }

  /**
   * 结束相册
   */
  async endSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/end`)
    return response.data!
  }

  /**
   * 获取相册参与者列表
   */
  async getSessionParticipants(
    sessionId: string,
    params?: PaginationParams
  ): Promise<{
    participants: SessionParticipant[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get<{
      participants: SessionParticipant[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/sessions/${sessionId}/participants?${queryParams.toString()}`)
    return response.data!
  }

  /**
   * 移除参与者
   */
  async removeParticipant(
    sessionId: string,
    participantId: string
  ): Promise<void> {
    await api.delete(`/sessions/${sessionId}/participants/${participantId}`)
  }

  /**
   * 生成相册邀请链接
   */
  async generateInviteLink(sessionId: string): Promise<{
    inviteUrl: string
    accessCode?: string
    expiresAt?: string
  }> {
    const response = await api.post<{
      inviteUrl: string
      accessCode?: string
      expiresAt?: string
    }>(`/sessions/${sessionId}/invite`)
    return response.data!
  }

  /**
   * 获取相册统计信息
   */
  async getSessionStats(sessionId: string): Promise<{
    totalPhotos: number
    totalLikes: number
    totalDownloads: number
    totalViews: number
    peakViewers: number
    duration: number
    viewerStats: {
      current: number
      peak: number
      total: number
    }
    photoStats: {
      uploaded: number
      featured: number
      liked: number
      downloaded: number
    }
  }> {
    const response = await api.get<{
      totalPhotos: number
      totalLikes: number
      totalDownloads: number
      totalViews: number
      peakViewers: number
      duration: number
      viewerStats: {
        current: number
        peak: number
        total: number
      }
      photoStats: {
        uploaded: number
        featured: number
        liked: number
        downloaded: number
      }
    }>(`/sessions/${sessionId}/stats`)
    return response.data!
  }

  /**
   * 搜索相册
   */
  async searchSessions(query: string, params?: {
    filters?: FilterParams
    pagination?: PaginationParams
  }): Promise<SessionsResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', query)
    
    if (params?.pagination) {
      const { page, limit, sortBy, sortOrder } = params.pagination
      if (page) queryParams.append('page', page.toString())
      if (limit) queryParams.append('limit', limit.toString())
      if (sortBy) queryParams.append('sortBy', sortBy)
      if (sortOrder) queryParams.append('sortOrder', sortOrder)
    }
    
    if (params?.filters) {
      const { status, isPrivate, photographerId, startDate, endDate } = params.filters
      if (status) queryParams.append('status', status)
      if (isPrivate !== undefined) queryParams.append('isPrivate', isPrivate.toString())
      if (photographerId) queryParams.append('photographerId', photographerId)
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
    }

    const response = await api.get<SessionsResponse>(
      `/sessions/search?${queryParams.toString()}`
    )
    return response.data!
  }

  /**
   * 复制相册
   */
  async duplicateSession(
    sessionId: string,
    data?: Partial<CreateSessionRequest>
  ): Promise<Session> {
    const response = await api.post<Session>(
      `/sessions/${sessionId}/duplicate`,
      data
    )
    return response.data!
  }

  /**
   * 导出相册数据
   */
  async exportSession(
    sessionId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<Blob> {
    return await api.download(
      `/sessions/${sessionId}/export?format=${format}`,
      `session-${sessionId}.${format}`
    )
  }

  /**
   * 获取相册二维码
   */
  async getSessionQRCode(
    sessionId: string,
    size: number = 256
  ): Promise<{ qrCodeUrl: string }> {
    const response = await api.get<{ qrCodeUrl: string }>(
      `/sessions/${sessionId}/qrcode?size=${size}`
    )
    return response.data!
  }
}

// 导出单例实例
export const sessionApi = new SessionApi()