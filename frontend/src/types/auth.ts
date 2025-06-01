export interface User {
  id: string
  username: string
  email: string
  role: 'photographer' | 'viewer' | 'admin'
  avatar?: string
  displayName?: string
  bio?: string
  phone?: string
  isEmailVerified: boolean
  isActive: boolean
  preferences: UserPreferences
  stats: UserStats
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en-US'
  notifications: {
    email: boolean
    push: boolean
    newPhoto: boolean
    sessionUpdate: boolean
    comment: boolean
  }
  privacy: {
    showEmail: boolean
    showPhone: boolean
    allowSearch: boolean
  }
}

export interface UserStats {
  totalSessions: number
  totalPhotos: number
  totalViews: number
  totalLikes: number
  storageUsed: number
  storageLimit: number
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  role?: 'photographer' | 'viewer'
  displayName?: string
  inviteCode?: string
}

export interface RegisterResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface EmailVerificationRequest {
  token: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  token: string
  expiresIn: number
}