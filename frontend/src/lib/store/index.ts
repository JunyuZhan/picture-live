import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User } from '@/types/auth'
import type { Session, Photo } from '@/types/session'

/**
 * 应用全局状态接口
 */
interface AppState {
  // 用户状态
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // 当前相册状态
  currentSession: Session | null
  sessionPhotos: Photo[]
  sessionParticipants: any[]
  onlineCount: number
  
  // WebSocket状态
  isConnected: boolean
  connectionError: string | null
  
  // UI状态
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  notifications: Notification[]
  
  // 上传状态
  uploadQueue: UploadItem[]
  uploadProgress: Record<string, number>
}

/**
 * 应用状态操作接口
 */
interface AppActions {
  // 用户操作
  setUser: (user: User | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  
  // 相册操作
  setCurrentSession: (session: Session | null) => void
  addPhoto: (photo: Photo) => void
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void
  removePhoto: (photoId: string) => void
  setPhotos: (photos: Photo[]) => void
  clearPhotos: () => void
  
  // 参与者操作
  setParticipants: (participants: any[]) => void
  addParticipant: (participant: any) => void
  removeParticipant: (participantId: string) => void
  setOnlineCount: (count: number) => void
  
  // WebSocket操作
  setConnected: (connected: boolean) => void
  setConnectionError: (error: string | null) => void
  
  // UI操作
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // 上传操作
  addUploadItem: (item: UploadItem) => void
  updateUploadProgress: (id: string, progress: number) => void
  removeUploadItem: (id: string) => void
  clearUploadQueue: () => void
  
  // 重置操作
  reset: () => void
}

/**
 * 通知类型
 */
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: number
}

/**
 * 上传项目类型
 */
interface UploadItem {
  id: string
  file: File
  sessionId: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

/**
 * 初始状态
 */
const initialState: AppState = {
  // 用户状态
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  // 相册状态
  currentSession: null,
  sessionPhotos: [],
  sessionParticipants: [],
  onlineCount: 0,
  
  // WebSocket状态
  isConnected: false,
  connectionError: null,
  
  // UI状态
  theme: 'system',
  sidebarCollapsed: false,
  notifications: [],
  
  // 上传状态
  uploadQueue: [],
  uploadProgress: {},
}

/**
 * 创建应用状态store
 */
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 用户操作
        setUser: (user) => set((state) => {
          state.user = user
          state.isAuthenticated = !!user
        }),
        
        setAuthenticated: (authenticated) => set((state) => {
          state.isAuthenticated = authenticated
        }),
        
        setLoading: (loading) => set((state) => {
          state.isLoading = loading
        }),
        
        // 相册操作
        setCurrentSession: (session) => set((state) => {
          state.currentSession = session
          if (!session) {
            state.sessionPhotos = []
            state.sessionParticipants = []
            state.onlineCount = 0
          }
        }),
        
        addPhoto: (photo) => set((state) => {
          const existingIndex = state.sessionPhotos.findIndex(p => p.id === photo.id)
          if (existingIndex >= 0) {
            state.sessionPhotos[existingIndex] = photo
          } else {
            state.sessionPhotos.unshift(photo)
          }
        }),
        
        updatePhoto: (photoId, updates) => set((state) => {
          const index = state.sessionPhotos.findIndex(p => p.id === photoId)
          if (index >= 0) {
            Object.assign(state.sessionPhotos[index], updates)
          }
        }),
        
        removePhoto: (photoId) => set((state) => {
          state.sessionPhotos = state.sessionPhotos.filter(p => p.id !== photoId)
        }),
        
        setPhotos: (photos) => set((state) => {
          state.sessionPhotos = photos
        }),
        
        clearPhotos: () => set((state) => {
          state.sessionPhotos = []
        }),
        
        // 参与者操作
        setParticipants: (participants) => set((state) => {
          state.sessionParticipants = participants
        }),
        
        addParticipant: (participant) => set((state) => {
          const existingIndex = state.sessionParticipants.findIndex(p => p.id === participant.id)
          if (existingIndex === -1) {
            state.sessionParticipants.push(participant)
          }
        }),
        
        removeParticipant: (participantId) => set((state) => {
          state.sessionParticipants = state.sessionParticipants.filter(p => p.id !== participantId)
        }),
        
        setOnlineCount: (count) => set((state) => {
          state.onlineCount = count
        }),
        
        // WebSocket操作
        setConnected: (connected) => set((state) => {
          state.isConnected = connected
          if (connected) {
            state.connectionError = null
          }
        }),
        
        setConnectionError: (error) => set((state) => {
          state.connectionError = error
        }),
        
        // UI操作
        setTheme: (theme) => set((state) => {
          state.theme = theme
        }),
        
        toggleSidebar: () => set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed
        }),
        
        setSidebarCollapsed: (collapsed) => set((state) => {
          state.sidebarCollapsed = collapsed
        }),
        
        addNotification: (notification) => set((state) => {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
          state.notifications.push({
            ...notification,
            id,
            timestamp: Date.now(),
          })
        }),
        
        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id)
        }),
        
        clearNotifications: () => set((state) => {
          state.notifications = []
        }),
        
        // 上传操作
        addUploadItem: (item) => set((state) => {
          state.uploadQueue.push(item)
          state.uploadProgress[item.id] = 0
        }),
        
        updateUploadProgress: (id, progress) => set((state) => {
          state.uploadProgress[id] = progress
          const item = state.uploadQueue.find(i => i.id === id)
          if (item) {
            item.progress = progress
            if (progress >= 100) {
              item.status = 'completed'
            }
          }
        }),
        
        removeUploadItem: (id) => set((state) => {
          state.uploadQueue = state.uploadQueue.filter(i => i.id !== id)
          delete state.uploadProgress[id]
        }),
        
        clearUploadQueue: () => set((state) => {
          state.uploadQueue = []
          state.uploadProgress = {}
        }),
        
        // 重置操作
        reset: () => set(() => ({ ...initialState })),
      })),
      {
        name: 'picture-live-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'picture-live-store',
    }
  )
)

/**
 * 选择器hooks
 */
export const useUser = () => useAppStore((state) => state.user)
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
}))

export const useCurrentSession = () => useAppStore((state) => state.currentSession)
export const useSessionPhotos = () => useAppStore((state) => state.sessionPhotos)
export const useSessionParticipants = () => useAppStore((state) => state.sessionParticipants)
export const useOnlineCount = () => useAppStore((state) => state.onlineCount)

export const useWebSocketState = () => useAppStore((state) => ({
  isConnected: state.isConnected,
  connectionError: state.connectionError,
}))

export const useTheme = () => useAppStore((state) => state.theme)
export const useSidebar = () => useAppStore((state) => ({
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  setCollapsed: state.setSidebarCollapsed,
}))

export const useNotifications = () => useAppStore((state) => state.notifications)
export const useUploadQueue = () => useAppStore((state) => state.uploadQueue)
export const useUploadProgress = () => useAppStore((state) => state.uploadProgress)

/**
 * 操作hooks
 */
export const useAppActions = () => useAppStore((state) => ({
  // 用户操作
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  setLoading: state.setLoading,
  
  // 相册操作
  setCurrentSession: state.setCurrentSession,
  addPhoto: state.addPhoto,
  updatePhoto: state.updatePhoto,
  removePhoto: state.removePhoto,
  setPhotos: state.setPhotos,
  clearPhotos: state.clearPhotos,
  
  // 参与者操作
  setParticipants: state.setParticipants,
  addParticipant: state.addParticipant,
  removeParticipant: state.removeParticipant,
  setOnlineCount: state.setOnlineCount,
  
  // WebSocket操作
  setConnected: state.setConnected,
  setConnectionError: state.setConnectionError,
  
  // UI操作
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  
  // 上传操作
  addUploadItem: state.addUploadItem,
  updateUploadProgress: state.updateUploadProgress,
  removeUploadItem: state.removeUploadItem,
  clearUploadQueue: state.clearUploadQueue,
  
  // 重置操作
  reset: state.reset,
}))

/**
 * 导出类型
 */
export type { AppState, AppActions, Notification, UploadItem }