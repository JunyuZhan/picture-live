import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { wsClient, type WebSocketEvents } from '@/lib/websocket/client'
import { useAuth } from '@/components/providers/auth-provider'

/**
 * WebSocket连接状态
 */
export interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  ping: number | null
}

/**
 * WebSocket连接管理hook
 */
export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    ping: null,
  })
  
  const { isAuthenticated } = useAuth()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const pingIntervalRef = useRef<NodeJS.Timeout>()

  // 连接WebSocket
  const connect = useCallback(async () => {
    if (!isAuthenticated || state.isConnecting || state.isConnected) {
      return
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      await wsClient.connect()
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }))

      // 开始定期检测延迟
      startPingInterval()
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message || '连接失败',
      }))

      // 自动重连
      scheduleReconnect()
    }
  }, [isAuthenticated, state.isConnecting, state.isConnected])

  // 断开连接
  const disconnect = useCallback(() => {
    wsClient.disconnect()
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      ping: null,
    })
    
    // 清除定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
  }, [])

  // 安排重连
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && !state.isConnected) {
        connect()
      }
    }, 3000) // 3秒后重连
  }, [isAuthenticated, state.isConnected, connect])

  // 开始ping检测
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    pingIntervalRef.current = setInterval(async () => {
      try {
        const ping = await wsClient.getPing()
        setState(prev => ({ ...prev, ping }))
      } catch (error) {
        setState(prev => ({ ...prev, ping: null }))
      }
    }, 30000) // 每30秒检测一次
  }, [])

  // 监听认证状态变化
  useEffect(() => {
    if (isAuthenticated && !state.isConnected && !state.isConnecting) {
      connect()
    } else if (!isAuthenticated && (state.isConnected || state.isConnecting)) {
      disconnect()
    }
  }, [isAuthenticated, state.isConnected, state.isConnecting, connect, disconnect])

  // 监听WebSocket事件
  useEffect(() => {
    const handleConnect = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }))
      startPingInterval()
    }

    const handleDisconnect = (reason: string) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: reason,
        ping: null,
      }))
      
      // 清除ping检测
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      
      // 如果不是主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        scheduleReconnect()
      }
    }

    const handleConnectError = (error: Error) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
      }))
      scheduleReconnect()
    }

    const handleError = (data: { message: string; code?: string }) => {
      toast.error('WebSocket错误', {
        description: data.message,
      })
    }

    wsClient.on('connect', handleConnect)
    wsClient.on('disconnect', handleDisconnect)
    wsClient.on('connect_error', handleConnectError)
    wsClient.on('error', handleError)

    return () => {
      wsClient.off('connect', handleConnect)
      wsClient.off('disconnect', handleDisconnect)
      wsClient.off('connect_error', handleConnectError)
      wsClient.off('error', handleError)
    }
  }, [scheduleReconnect, startPingInterval])

  // 清理
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    client: wsClient,
  }
}

/**
 * 相册WebSocket管理hook
 */
export function useSessionWebSocket(sessionId?: string) {
  const [isJoined, setIsJoined] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const { isConnected, client } = useWebSocket()
  const currentSessionRef = useRef<string | null>(null)

  // 加入相册
  const joinSession = useCallback(async (id: string) => {
    if (!isConnected || !id) return

    try {
      await client.joinSession(id)
      setIsJoined(true)
      currentSessionRef.current = id
    } catch (error: any) {
      toast.error('加入相册失败', {
        description: error.message,
      })
    }
  }, [isConnected, client])

  // 离开相册
  const leaveSession = useCallback(async () => {
    if (!currentSessionRef.current) return

    try {
      await client.leaveSession(currentSessionRef.current)
      setIsJoined(false)
      currentSessionRef.current = null
    } catch (error: any) {
      console.error('Leave session error:', error)
    }
  }, [client])

  // 发送聊天消息
  const sendMessage = useCallback((content: string) => {
    if (!currentSessionRef.current || !isConnected) return
    
    client.sendChatMessage(currentSessionRef.current, content)
  }, [isConnected, client])

  // 监听相册相关事件
  useEffect(() => {
    const handleSessionJoined = (data: any) => {
      setIsJoined(true)
      toast.success('已加入相册', {
        description: data.session.title,
      })
    }

    const handleSessionLeft = () => {
      setIsJoined(false)
    }

    const handleParticipantJoined = (data: any) => {
      setOnlineCount(prev => prev + 1)
    }

    const handleParticipantLeft = () => {
      setOnlineCount(prev => Math.max(0, prev - 1))
    }

    client.on('session:joined', handleSessionJoined)
    client.on('session:left', handleSessionLeft)
    client.on('participant:joined', handleParticipantJoined)
    client.on('participant:left', handleParticipantLeft)

    return () => {
      client.off('session:joined', handleSessionJoined)
      client.off('session:left', handleSessionLeft)
      client.off('participant:joined', handleParticipantJoined)
      client.off('participant:left', handleParticipantLeft)
    }
  }, [client])

  // 自动加入/离开相册
  useEffect(() => {
    if (sessionId && isConnected && !isJoined) {
      joinSession(sessionId)
    } else if (!sessionId && isJoined) {
      leaveSession()
    }
  }, [sessionId, isConnected, isJoined, joinSession, leaveSession])

  // 组件卸载时离开相册
  useEffect(() => {
    return () => {
      if (isJoined) {
        leaveSession()
      }
    }
  }, [isJoined, leaveSession])

  return {
    isJoined,
    onlineCount,
    joinSession,
    leaveSession,
    sendMessage,
  }
}

/**
 * WebSocket事件监听hook
 */
export function useWebSocketEvent<K extends keyof WebSocketEvents>(
  event: K,
  handler: WebSocketEvents[K],
  deps: any[] = []
) {
  const { client } = useWebSocket()

  useEffect(() => {
    if (!client) return

    client.on(event, handler)

    return () => {
      client.off(event, handler)
    }
  }, [client, event, ...deps])
}

/**
 * 照片实时更新hook
 */
export function usePhotoUpdates(sessionId?: string) {
  const [newPhotos, setNewPhotos] = useState<any[]>([])
  const [updatedPhotos, setUpdatedPhotos] = useState<any[]>([])
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([])

  // 监听照片事件
  useWebSocketEvent('photo:uploaded', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setNewPhotos(prev => [data.photo, ...prev])
    
    toast.success('新照片上传', {
      description: '有新的照片上传了！',
    })
  }, [sessionId])

  useWebSocketEvent('photo:updated', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setUpdatedPhotos(prev => {
      const existing = prev.find(p => p.id === data.photo.id)
      if (existing) {
        return prev.map(p => p.id === data.photo.id ? data.photo : p)
      }
      return [data.photo, ...prev]
    })
  }, [sessionId])

  useWebSocketEvent('photo:deleted', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setDeletedPhotoIds(prev => [...prev, data.photoId])
    setNewPhotos(prev => prev.filter(p => p.id !== data.photoId))
    setUpdatedPhotos(prev => prev.filter(p => p.id !== data.photoId))
  }, [sessionId])

  useWebSocketEvent('photo:featured', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setUpdatedPhotos(prev => {
      return prev.map(p => 
        p.id === data.photoId 
          ? { ...p, isFeatured: data.featured }
          : p
      )
    })
  }, [sessionId])

  useWebSocketEvent('photo:liked', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setUpdatedPhotos(prev => {
      return prev.map(p => 
        p.id === data.photoId 
          ? { 
              ...p, 
              isLiked: data.liked,
              stats: { ...p.stats, likes: data.likes }
            }
          : p
      )
    })
  }, [sessionId])

  // 清除通知
  const clearNewPhotos = useCallback(() => {
    setNewPhotos([])
  }, [])

  const clearUpdatedPhotos = useCallback(() => {
    setUpdatedPhotos([])
  }, [])

  const clearDeletedPhotos = useCallback(() => {
    setDeletedPhotoIds([])
  }, [])

  return {
    newPhotos,
    updatedPhotos,
    deletedPhotoIds,
    clearNewPhotos,
    clearUpdatedPhotos,
    clearDeletedPhotos,
  }
}

/**
 * 聊天消息hook
 */
export function useChatMessages(sessionId?: string) {
  const [messages, setMessages] = useState<any[]>([])
  const { sendMessage } = useSessionWebSocket(sessionId)

  // 监听聊天消息
  useWebSocketEvent('chat:message', (data) => {
    if (!sessionId || data.sessionId !== sessionId) return
    
    setMessages(prev => [...prev, data])
  }, [sessionId])

  // 发送消息
  const send = useCallback((content: string) => {
    if (!content.trim()) return
    
    sendMessage(content)
  }, [sendMessage])

  // 清除消息
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    send,
    clearMessages,
  }
}