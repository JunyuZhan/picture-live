const ACCESS_TOKEN_KEY = 'picture_live_access_token'
const REFRESH_TOKEN_KEY = 'picture_live_refresh_token'

interface JWTPayload {
  sub: string
  email: string
  role: string
  exp: number
  iat: number
}

class TokenUtils {
  // Access Token methods
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  }

  removeAccessToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  // Refresh Token methods
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  }

  removeRefreshToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  // Combined methods
  removeTokens(): void {
    this.removeAccessToken()
    this.removeRefreshToken()
  }

  // Token validation
  isTokenExpired(token: string | null, bufferSeconds: number = 0): boolean {
    try {
      if (!token) return true
      
      const payload = this.parseJWT(token)
      if (!payload || !payload.exp) return true
      
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp <= (currentTime + bufferSeconds)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return true
    }
  }

  // Parse JWT token
  parseJWT(token: string | null): JWTPayload | null {
    try {
      if (!token || typeof token !== 'string') {
        return null
      }
      
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }
      
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to parse JWT:', error)
      return null
    }
  }

  // Get user info from access token
  getUserFromToken(): { id: string; email: string; role: string } | null {
    const token = this.getAccessToken()
    if (!token) return null

    const payload = this.parseJWT(token)
    if (!payload) return null

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    const user = this.getUserFromToken()
    return user?.role === role
  }

  // Check if user is authenticated (has valid access token)
  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    if (!token) return false
    return !this.isTokenExpired(token)
  }

  // Get time until token expires (in seconds)
  getTimeUntilExpiry(token: string): number {
    try {
      const payload = this.parseJWT(token)
      if (!payload || !payload.exp) return 0
      
      const currentTime = Math.floor(Date.now() / 1000)
      return Math.max(0, payload.exp - currentTime)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return 0
    }
  }

  // Format token for Authorization header
  getAuthHeader(): string | null {
    const token = this.getAccessToken()
    return token ? `Bearer ${token}` : null
  }

  // Refresh access token using refresh token
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    if (this.isTokenExpired(refreshToken)) {
      throw new Error('Refresh token is expired')
    }

    try {
      // Import auth API dynamically to avoid circular dependency
      const { authApi } = await import('../api/auth')
      const response = await authApi.refreshToken(refreshToken)
      
      // Update stored tokens
      this.setAccessToken(response.accessToken)
      if (response.refreshToken) {
        this.setRefreshToken(response.refreshToken)
      }
      
      return response.accessToken
    } catch (error) {
      // Clear invalid tokens
      this.removeTokens()
      throw error
    }
  }
}

// Export singleton instance
export const tokenUtils = new TokenUtils()

// Legacy exports for backward compatibility
export function getToken(): string | null {
  return tokenUtils.getAccessToken()
}

export function setToken(token: string): void {
  tokenUtils.setAccessToken(token)
}

export function removeToken(): void {
  tokenUtils.removeTokens()
}

export function getRefreshToken(): string | null {
  return tokenUtils.getRefreshToken()
}

export function setRefreshToken(token: string): void {
  tokenUtils.setRefreshToken(token)
}

export function hasToken(): boolean {
  return !!tokenUtils.getAccessToken()
}

/**
 * 解析JWT令牌
 */
export function parseJWT(token: string | null): any {
  return tokenUtils.parseJWT(token)
}

/**
 * 检查令牌是否过期
 */
export function isTokenExpired(token: string | null): boolean {
  return tokenUtils.isTokenExpired(token)
}

/**
 * 检查令牌是否即将过期（5分钟内）
 */
export function isTokenExpiringSoon(token: string | null): boolean {
  return tokenUtils.isTokenExpired(token, 5 * 60)
}