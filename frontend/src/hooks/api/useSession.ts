import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { sessionApi } from '@/lib/api/session'
import { wsClient } from '@/lib/websocket/client'
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  Session,
  SessionResponse,
  SessionsResponse,
  PaginationParams,
  FilterParams,
} from '@/types/api'

/**
 * 相册相关的React Query hooks
 */

/**
 * 获取相册列表
 */
export function useSessions(params?: {
  pagination?: PaginationParams
  filters?: FilterParams
}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionApi.getSessions(params),
    staleTime: 2 * 60 * 1000, // 2分钟
    placeholderData: (previousData) => previousData,
  })
}

/**
 * 获取用户的相册列表
 */
export function useUserSessions(params?: {
  pagination?: PaginationParams
  filters?: FilterParams
}) {
  return useQuery({
    queryKey: ['sessions', 'user', params],
    queryFn: () => sessionApi.getSessions(params),
    staleTime: 2 * 60 * 1000, // 2分钟
    placeholderData: (previousData) => previousData,
  })
}

/**
 * 获取相册详情
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => sessionApi.getSession(sessionId),
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000, // 1分钟
    retry: (failureCount, error: any) => {
      // 如果是404错误，不重试
      if (error?.response?.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * 创建相册
 */
export function useCreateSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSessionRequest) => sessionApi.createSession(data),
    onSuccess: (session: Session) => {
      // 更新相册列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      // 设置相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      toast.success('相册创建成功', {
        description: `相册 "${session.title}" 已创建`,
      })
      
      // 跳转到相册页面
      router.push(`/session/${session.id}`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '创建相册失败'
      toast.error('创建失败', {
        description: message,
      })
    },
  })
}

/**
 * 更新相册
 */
export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpdateSessionRequest }) =>
      sessionApi.updateSession(sessionId, data),
    onSuccess: (session: Session) => {
      // 更新相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      // 更新相册列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      toast.success('相册更新成功')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '更新相册失败'
      toast.error('更新失败', {
        description: message,
      })
    },
  })
}

/**
 * 删除相册
 */
export function useDeleteSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      // 移除相册详情缓存
      queryClient.removeQueries({ queryKey: ['sessions', sessionId] })
      
      // 更新相册列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      // 断开WebSocket连接
      if (wsClient.sessionId === sessionId) {
        wsClient.leaveSession(sessionId)
      }
      
      toast.success('相册删除成功')
      
      // 跳转到仪表板
      router.push('/dashboard')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '删除相册失败'
      toast.error('删除失败', {
        description: message,
      })
    },
  })
}

/**
 * 加入相册
 */
export function useJoinSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accessCode, displayName }: { accessCode: string; displayName?: string }) =>
      sessionApi.joinSession({ accessCode }),
    onSuccess: async (response: SessionResponse) => {
      const session = response.session
      // 设置相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      // 连接WebSocket
      try {
        await wsClient.joinSession(session.id)
      } catch (error) {
        console.error('Failed to join WebSocket session:', error)
      }
      
      toast.success('加入相册成功', {
        description: `已加入相册 "${session.title}"`,
      })
      
      // 跳转到相册页面
      router.push(`/session/${session.id}`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '加入相册失败'
      toast.error('加入失败', {
        description: message,
      })
    },
  })
}

/**
 * 离开相册
 */
export function useLeaveSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.leaveSession(sessionId),
    onSuccess: (_, sessionId) => {
      // 断开WebSocket连接
      wsClient.leaveSession(sessionId)
      
      toast.success('已离开相册')
      
      // 跳转到首页
      router.push('/')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '离开相册失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 开始相册
 */
export function useStartSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.startSession(sessionId),
    onSuccess: (session: Session) => {
      // 更新相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      toast.success('相册已开始')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '开始相册失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 暂停相册
 */
export function usePauseSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.pauseSession(sessionId),
    onSuccess: (session: Session) => {
      // 更新相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      toast.success('相册已暂停')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '暂停相册失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 恢复相册
 */
export function useResumeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.resumeSession(sessionId),
    onSuccess: (session: Session) => {
      // 更新相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      toast.success('相册已恢复')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '恢复相册失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 结束相册
 */
export function useEndSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionApi.endSession(sessionId),
    onSuccess: (session: Session) => {
      // 更新相册详情缓存
      queryClient.setQueryData(['sessions', session.id], session)
      
      // 断开WebSocket连接
      wsClient.leaveSession(session.id)
      
      toast.success('相册已结束')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '结束相册失败'
      toast.error('操作失败', {
        description: message,
      })
    },
  })
}

/**
 * 获取相册参与者
 */
export function useSessionParticipants(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'participants'],
    queryFn: () => sessionApi.getSessionParticipants(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30秒
  })
}

/**
 * 获取相册统计
 */
export function useSessionStats(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'stats'],
    queryFn: () => sessionApi.getSessionStats(sessionId),
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000, // 1分钟
  })
}

/**
 * 生成邀请链接
 */
export function useGenerateInviteLink() {
  return useMutation({
    mutationFn: ({ sessionId, options }: {
      sessionId: string
      options?: {
        expiresIn?: number
        maxUses?: number
        requireApproval?: boolean
      }
    }) => sessionApi.generateInviteLink(sessionId),
    onSuccess: (result) => {
      // 复制到剪贴板
      navigator.clipboard.writeText(result.inviteUrl)
      
      toast.success('邀请链接已生成', {
        description: '链接已复制到剪贴板',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '生成邀请链接失败'
      toast.error('生成失败', {
        description: message,
      })
    },
  })
}

/**
 * 搜索相册
 */
export function useSearchSessions() {
  return useMutation({
    mutationFn: ({ query, params }: {
      query: string
      params?: {
        filters?: FilterParams
        pagination?: PaginationParams
      }
    }) => sessionApi.searchSessions(query, params),
    onError: (error: any) => {
      console.error('Search sessions error:', error)
    },
  })
}

/**
 * 复制相册
 */
export function useDuplicateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sessionId,
      options,
    }: {
      sessionId: string
      options?: Partial<CreateSessionRequest>
    }) => sessionApi.duplicateSession(sessionId, options),
    onSuccess: (session: Session) => {
      // 更新相册列表缓存
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      
      toast.success('相册复制成功', {
        description: `新相册 "${session.title}" 已创建`,
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '复制相册失败'
      toast.error('复制失败', {
        description: message,
      })
    },
  })
}

/**
 * 导出相册数据
 */
export function useExportSession() {
  return useMutation({
    mutationFn: ({ sessionId, format, options }: {
      sessionId: string
      format: 'json' | 'csv' | 'pdf'
      options?: {
        includePhotos?: boolean
        includeMetadata?: boolean
        quality?: 'original' | 'high' | 'medium'
      }
    }) => sessionApi.exportSession(sessionId, format),
    onSuccess: () => {
      toast.success('导出成功', {
        description: '文件下载已开始',
      })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '导出失败'
      toast.error('导出失败', {
        description: message,
      })
    },
  })
}

/**
 * 获取相册二维码
 */
export function useSessionQRCode(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'qrcode'],
    queryFn: () => sessionApi.getSessionQRCode(sessionId),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // 10分钟
  })
}