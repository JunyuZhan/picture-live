'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { sessionApi } from '@/lib/api/session'
import { useAuth } from './auth-provider'
import type { Session, Photo, SessionSettings, CreateSessionRequest } from '@/types/session'

interface SessionContextType {
  currentSession: Session | null
  photos: Photo[]
  isLoading: boolean
  isConnected: boolean
  onlineViewers: number
  
  // Session management
  createSession: (data: CreateSessionRequest) => Promise<Session>
  joinSession: (accessCode: string, displayName?: string) => Promise<void>
  leaveSession: () => void
  updateSession: (sessionId: string, data: Partial<SessionSettings>) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  
  // Session control
  pauseSession: (sessionId: string) => Promise<void>
  resumeSession: (sessionId: string) => Promise<void>
  endSession: (sessionId: string) => Promise<void>
  
  // Photo management
  uploadPhotos: (sessionId: string, files: File[]) => Promise<void>
  deletePhoto: (photoId: string) => Promise<void>
  togglePhotoFeatured: (photoId: string) => Promise<void>
  likePhoto: (photoId: string) => Promise<void>
  downloadPhoto: (photoId: string) => Promise<void>
  
  // Legacy methods for compatibility
  setCurrentSession: (session: Session | null) => void
  addPhoto: (photo: Photo) => void
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void
  removePhoto: (photoId: string) => void
  clearPhotos: () => void
  refreshPhotos: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineViewers, setOnlineViewers] = useState(0)
  const [ws, setWs] = useState<WebSocket | null>(null)
  
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // WebSocket连接管理
  useEffect(() => {
    if (currentSession && isAuthenticated) {
      connectWebSocket()
    }
    
    return () => {
      disconnectWebSocket()
    }
  }, [currentSession, isAuthenticated])
  
  const connectWebSocket = () => {
    if (!currentSession) return
    
    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/sessions/${currentSession.id}`
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // 发送认证信息
        websocket.send(JSON.stringify({
          type: 'auth',
          token: localStorage.getItem('accessToken'),
          sessionId: currentSession.id
        }))
      }
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // 尝试重连
        setTimeout(() => {
          if (currentSession) {
            connectWebSocket()
          }
        }, 3000)
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
      
      setWs(websocket)
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }
  
  const disconnectWebSocket = () => {
    if (ws) {
      ws.close()
      setWs(null)
    }
    setIsConnected(false)
  }
  
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'photo_uploaded':
        addPhoto(data.photo)
        toast.success('新照片已上传')
        break
        
      case 'photo_liked':
        updatePhoto(data.photoId, { likes: data.likes, isLiked: data.isLiked })
        break
        
      case 'photo_deleted':
        removePhoto(data.photoId)
        toast.info('照片已删除')
        break
        
      case 'viewer_count_updated':
        setOnlineViewers(data.count)
        break
        
      case 'session_updated':
        setCurrentSession(prev => prev ? { ...prev, ...data.session } : null)
        break
        
      case 'session_ended':
        toast.info('会话已结束')
        leaveSession()
        break
        
      case 'user_joined':
        if (data.user) {
          toast.success(`${data.user.displayName || data.user.username} 加入了会话`)
        }
        break
        
      case 'user_left':
        if (data.user) {
          toast.info(`${data.user.displayName || data.user.username} 离开了会话`)
        }
        break
        
      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  const addPhoto = (photo: Photo) => {
    setPhotos(prev => {
      // 检查是否已存在相同ID的照片
      const exists = prev.some(p => p.id === photo.id)
      if (exists) {
        return prev.map(p => p.id === photo.id ? photo : p)
      }
      // 按时间倒序插入新照片
      return [photo, ...prev]
    })
  }

  const updatePhoto = (photoId: string, updates: Partial<Photo>) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, ...updates }
          : photo
      )
    )
  }

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId))
  }

  const clearPhotos = () => {
    setPhotos([])
  }

  // Session management functions
  const createSession = async (data: CreateSessionRequest): Promise<Session> => {
    try {
      setIsLoading(true)
      const session = await sessionApi.createSession(data)
      
      setCurrentSession(session)
      toast.success('会话创建成功！')
      
      return session
    } catch (error: any) {
      const message = error.response?.data?.message || '创建会话失败'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  const joinSession = async (accessCode: string, displayName?: string) => {
    try {
      setIsLoading(true)
      const session = await sessionApi.joinSession(accessCode, displayName)
      
      setCurrentSession(session)
      
      // 获取会话照片
      const sessionPhotos = await sessionApi.getSessionPhotos(session.id)
      setPhotos(sessionPhotos)
      
      toast.success(`已加入会话: ${session.title}`)
      router.push(`/session/${session.id}`)
    } catch (error: any) {
      const message = error.response?.data?.message || '加入会话失败'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  const leaveSession = () => {
    disconnectWebSocket()
    setCurrentSession(null)
    setPhotos([])
    setOnlineViewers(0)
    router.push('/')
  }
  
  const updateSession = async (sessionId: string, data: Partial<SessionSettings>) => {
    try {
      const updatedSession = await sessionApi.updateSession(sessionId, data)
      setCurrentSession(updatedSession)
      toast.success('会话设置已更新')
    } catch (error: any) {
      const message = error.response?.data?.message || '更新会话失败'
      toast.error(message)
      throw error
    }
  }
  
  const deleteSession = async (sessionId: string) => {
    try {
      await sessionApi.deleteSession(sessionId)
      
      if (currentSession?.id === sessionId) {
        leaveSession()
      }
      
      toast.success('会话已删除')
    } catch (error: any) {
      const message = error.response?.data?.message || '删除会话失败'
      toast.error(message)
      throw error
    }
  }
  
  // Session control functions
  const pauseSession = async (sessionId: string) => {
    try {
      await sessionApi.pauseSession(sessionId)
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, status: 'paused' } : null)
      }
      
      toast.success('会话已暂停')
    } catch (error: any) {
      const message = error.response?.data?.message || '暂停会话失败'
      toast.error(message)
      throw error
    }
  }
  
  const resumeSession = async (sessionId: string) => {
    try {
      await sessionApi.resumeSession(sessionId)
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, status: 'active' } : null)
      }
      
      toast.success('会话已恢复')
    } catch (error: any) {
      const message = error.response?.data?.message || '恢复会话失败'
      toast.error(message)
      throw error
    }
  }
  
  const endSession = async (sessionId: string) => {
    try {
      await sessionApi.endSession(sessionId)
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, status: 'ended' } : null)
      }
      
      toast.success('会话已结束')
    } catch (error: any) {
      const message = error.response?.data?.message || '结束会话失败'
      toast.error(message)
      throw error
    }
  }
  
  // Photo management functions
  const uploadPhotos = async (sessionId: string, files: File[]) => {
    try {
      const uploadPromises = files.map(file => sessionApi.uploadPhoto(sessionId, file))
      const uploadedPhotos = await Promise.all(uploadPromises)
      
      // WebSocket会处理实时更新，这里不需要手动更新状态
      toast.success(`成功上传 ${uploadedPhotos.length} 张照片`)
    } catch (error: any) {
      const message = error.response?.data?.message || '上传照片失败'
      toast.error(message)
      throw error
    }
  }
  
  const deletePhoto = async (photoId: string) => {
    try {
      await sessionApi.deletePhoto(photoId)
      // WebSocket会处理实时更新
    } catch (error: any) {
      const message = error.response?.data?.message || '删除照片失败'
      toast.error(message)
      throw error
    }
  }
  
  const togglePhotoFeatured = async (photoId: string) => {
    try {
      const updatedPhoto = await sessionApi.togglePhotoFeatured(photoId)
      
      updatePhoto(photoId, { isFeatured: updatedPhoto.isFeatured })
      
      toast.success(updatedPhoto.isFeatured ? '已设为精选照片' : '已取消精选')
    } catch (error: any) {
      const message = error.response?.data?.message || '操作失败'
      toast.error(message)
      throw error
    }
  }
  
  const likePhoto = async (photoId: string) => {
    try {
      await sessionApi.likePhoto(photoId)
      // WebSocket会处理实时更新
    } catch (error: any) {
      const message = error.response?.data?.message || '点赞失败'
      toast.error(message)
      throw error
    }
  }
  
  const downloadPhoto = async (photoId: string) => {
    try {
      const blob = await sessionApi.downloadPhoto(photoId)
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `photo-${photoId}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('照片下载成功')
    } catch (error: any) {
      const message = error.response?.data?.message || '下载失败'
      toast.error(message)
      throw error
    }
  }
  
  const refreshPhotos = async () => {
    if (!currentSession) return
    
    try {
      setIsLoading(true)
      const sessionPhotos = await sessionApi.getSessionPhotos(currentSession.id)
      setPhotos(sessionPhotos)
    } catch (error) {
      console.error('Failed to refresh photos:', error)
      toast.error('刷新照片失败')
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue: SessionContextType = {
    currentSession,
    photos,
    isLoading,
    isConnected,
    onlineViewers,
    
    createSession,
    joinSession,
    leaveSession,
    updateSession,
    deleteSession,
    
    pauseSession,
    resumeSession,
    endSession,
    
    uploadPhotos,
    deletePhoto,
    togglePhotoFeatured,
    likePhoto,
    downloadPhoto,
    
    // Legacy methods for compatibility
    setCurrentSession,
    addPhoto,
    updatePhoto,
    removePhoto,
    clearPhotos,
    refreshPhotos,
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// HOC for protecting routes that require an active session
export const withSession = <P extends object>(Component: React.ComponentType<P>) => {
  const SessionProtectedComponent = (props: P) => {
    const { currentSession, isLoading } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !currentSession) {
        router.push('/join')
      }
    }, [currentSession, isLoading, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!currentSession) {
      return null
    }

    return <Component {...props} />
  }

  SessionProtectedComponent.displayName = `withSession(${Component.displayName || Component.name})`
  return SessionProtectedComponent
}