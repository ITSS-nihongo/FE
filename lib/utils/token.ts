/**
 * Token Management Utilities
 * Quản lý JWT token trong cookies (secure hơn localStorage)
 */

import { getCookie, setCookie, deleteCookie } from 'cookies-next/client'

const TOKEN_KEY = 'auth_token'

export const tokenManager = {
  /**
   * Lưu token vào cookie
   */
  setToken(token: string): void {
    setCookie(TOKEN_KEY, token, {
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    })
  },

  /**
   * Lấy token từ cookie
   */
  getToken(): string | null {
    const token = getCookie(TOKEN_KEY)
    return token || null
  },

  /**
   * Xóa token khỏi cookie
   */
  removeToken(): void {
    deleteCookie(TOKEN_KEY, {
      path: '/',
    })
  },

  /**
   * Check xem có token không
   */
  hasToken(): boolean {
    return !!this.getToken()
  },
}
