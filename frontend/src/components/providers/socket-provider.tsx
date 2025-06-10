'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { useAuth } from './auth-provider'
import { getToken } from '@/lib/utils/token'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinSession: (sessionId: string) => void
  leaveSession: (sessionId: string) => void
  sendMessage: (event: string, data: any) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = getToken()
      if (!token) return

      // 创建Socket连接
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      // 连接事件监听
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        setIsConnected(true)
        toast.success('实时连接已建立')
      })

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        setIsConnected(false)
        if (reason === 'io server disconnect') {
          // 服务器主动断开连接，需要重新连接
          newSocket.connect()
        }
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
        toast.error('实时连接失败')
      })

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        setIsConnected(true)
        toast.success('实时连接已恢复')
      })

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed')
        toast.error('无法重新建立实时连接')
      })

      // 业务事件监听
      newSocket.on('photo:new', (data) => {
        console.log('New photo received:', data)
        // 这里可以触发全局状态更新或通知
      })

      newSocket.on('session:updated', (data) => {
        console.log('Session updated:', data)
      })

      newSocket.on('session:ended', (data) => {
        console.log('Session ended:', data)
        toast.success('拍摄相册已结束')
      })

      newSocket.on('user:joined', (data) => {
        console.log('User joined session:', data)
      })

      newSocket.on('user:left', (data) => {
        console.log('User left session:', data)
      })

      newSocket.on('error', (error) => {
        console.error('Socket error:', error)
        toast.error(error.message || '实时连接出现错误')
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setIsConnected(false)
      }
    } else {
      // 用户未登录，断开连接
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, user])

  const joinSession = (sessionId: string) => {
    if (socket && isConnected) {
      socket.emit('session:join', { sessionId })
      console.log('Joining session:', sessionId)
    }
  }

  const leaveSession = (sessionId: string) => {
    if (socket && isConnected) {
      socket.emit('session:leave', { sessionId })
      console.log('Leaving session:', sessionId)
    }
  }

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot send message:', event, data)
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinSession,
    leaveSession,
    sendMessage,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}