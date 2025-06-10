import { io, Socket } from 'socket.io-client'
import { tokenUtils } from '@/lib/utils/token'
import { toast } from 'sonner'
import type {
  WebSocketEvent,
  SessionParticipant,
  Photo,
  Session,
} from '@/types/api'

/**
 * WebSocket事件类型定义
 */
export interface WebSocketEvents {
  // 连接事件
  connect: () => void
  disconnect: (reason: string) => void
  connect_error: (error: Error) => void
  
  // 相册事件
  'session:joined': (data: { session: Session; participant: SessionParticipant }) => void
  'session:left': (data: { sessionId: string; participantId: string }) => void
  'session:updated': (data: { session: Session }) => void
  'session:started': (data: { sessionId: string; startedAt: string }) => void
  'session:paused': (data: { sessionId: string; pausedAt: string }) => void
  'session:resumed': (data: { sessionId: string; resumedAt: string }) => void
  'session:ended': (data: { sessionId: string; endedAt: string }) => void
  
  // 参与者事件
  'participant:joined': (data: { participant: SessionParticipant }) => void
  'participant:left': (data: { participantId: string; sessionId: string }) => void
  'participant:updated': (data: { participant: SessionParticipant }) => void
  
  // 照片事件
  'photo:uploaded': (data: { photo: Photo; sessionId: string }) => void
  'photo:updated': (data: { photo: Photo; sessionId: string }) => void
  'photo:deleted': (data: { photoId: string; sessionId: string }) => void
  'photo:featured': (data: { photoId: string; featured: boolean; sessionId: string }) => void
  'photo:liked': (data: { photoId: string; liked: boolean; likes: number; sessionId: string }) => void
  
  // 聊天事件
  'chat:message': (data: {
    id: string
    content: string
    author: {
      id: string
      name: string
      avatar?: string
    }
    sessionId: string
    timestamp: string
  }) => void
  
  // 通知事件
  'notification': (data: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    duration?: number
  }) => void
  
  // 错误事件
  error: (data: { message: string; code?: string }) => void
}

/**
 * WebSocket客户端类
 */
export class WebSocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>()
  private currentSessionId: string | null = null

  constructor(private baseUrl: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001') {}

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'))
        return
      }

      this.isConnecting = true
      const token = tokenUtils.getAccessToken()

      if (!token) {
        this.isConnecting = false
        reject(new Error('No authentication token available'))
        return
      }

      this.socket = io(this.baseUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      })

      this.socket.on('connect', () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.setupEventListeners()
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        this.isConnecting = false
        
        if (error.message.includes('Authentication')) {
          toast.error('认证失败，请重新登录')
          // 可以在这里触发重新登录逻辑
        }
        
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        this.isConnecting = false
        
        if (reason === 'io server disconnect') {
          // 服务器主动断开连接，需要手动重连
          this.reconnect()
        }
      })

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error)
        toast.error(`连接错误: ${error.message || '未知错误'}`)
      })
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.currentSessionId = null
    this.isConnecting = false
  }

  /**
   * 重连
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('连接失败，请刷新页面重试')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // 通知事件
    this.socket.on('notification', (data) => {
      const { type, title, message, duration = 4000 } = data
      
      switch (type) {
        case 'success':
          toast.success(title, { description: message, duration })
          break
        case 'error':
          toast.error(title, { description: message, duration })
          break
        case 'warning':
          toast.warning(title, { description: message, duration })
          break
        default:
          toast(title, { description: message, duration })
      }
    })

    // 重新注册所有事件监听器
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach((listener) => {
        this.socket?.on(event, listener as any)
      })
    })
  }

  /**
   * 加入相册
   */
  async joinSession(sessionId: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect()
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit('session:join', { sessionId }, (response: any) => {
        if (response.success) {
          this.currentSessionId = sessionId
          console.log(`Joined session: ${sessionId}`)
          resolve()
        } else {
          reject(new Error(response.error || 'Failed to join session'))
        }
      })
    })
  }

  /**
   * 离开相册
   */
  async leaveSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId
    
    if (!targetSessionId || !this.socket?.connected) {
      return
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit('session:leave', { sessionId: targetSessionId }, (response: any) => {
        if (response.success) {
          if (targetSessionId === this.currentSessionId) {
            this.currentSessionId = null
          }
          console.log(`Left session: ${targetSessionId}`)
          resolve()
        } else {
          reject(new Error(response.error || 'Failed to leave session'))
        }
      })
    })
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(sessionId: string, content: string): void {
    if (!this.socket?.connected) {
      toast.error('连接已断开，无法发送消息')
      return
    }

    this.socket.emit('chat:send', {
      sessionId,
      content,
    })
  }

  /**
   * 添加事件监听器
   */
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    
    this.eventListeners.get(event)!.add(listener)
    
    if (this.socket?.connected) {
      this.socket.on(event, listener as any)
    }
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof WebSocketEvents>(event: K, listener?: WebSocketEvents[K]): void {
    if (listener) {
      this.eventListeners.get(event)?.delete(listener)
      this.socket?.off(event, listener as any)
    } else {
      this.eventListeners.delete(event)
      this.socket?.off(event)
    }
  }

  /**
   * 发送自定义事件
   */
  emit(event: string, data?: any, callback?: (response: any) => void): void {
    if (!this.socket?.connected) {
      toast.error('连接已断开，无法发送数据')
      return
    }

    if (callback) {
      this.socket.emit(event, data, callback)
    } else {
      this.socket.emit(event, data)
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * 获取当前相册ID
   */
  get sessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * 更新认证token
   */
  updateAuth(token: string): void {
    if (this.socket?.connected) {
      this.socket.auth = { token }
      this.socket.disconnect().connect()
    }
  }

  /**
   * 获取连接延迟
   */
  getPing(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      const start = Date.now()
      this.socket.emit('ping', (response: any) => {
        const ping = Date.now() - start
        resolve(ping)
      })
    })
  }
}

// 导出单例实例
export const wsClient = new WebSocketClient()

// 自动连接（如果有token）
if (typeof window !== 'undefined') {
  const token = tokenUtils.getAccessToken()
  if (token) {
    wsClient.connect().catch((error) => {
      console.error('Auto-connect failed:', error)
    })
  }
}