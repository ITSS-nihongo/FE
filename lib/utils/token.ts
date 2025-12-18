/**
 * Token Management Utilities
 * Quản lý JWT token trong cookies (secure hơn localStorage)
 */

import { getCookie, setCookie, deleteCookie } from 'cookies-next/client'

const TOKEN_KEY = 'auth_token'
const REMEMBER_EMAIL_KEY = 'remember_email'
const REMEMBER_FLAG_KEY = 'remember_me'

export const tokenManager = {
  /**
   * Lưu token vào cookie
   */
  setToken(token: string, remember: boolean = false): void {
    const maxAge = remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30 days if remember, else 7 days
    setCookie(TOKEN_KEY, token, {
      maxAge,
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

  /**
   * Lưu email để remember
   */
  setRememberEmail(email: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      localStorage.setItem(REMEMBER_FLAG_KEY, 'true')
    }
  },

  /**
   * Lấy email đã lưu
   */
  getRememberEmail(): string | null {
    if (typeof window !== 'undefined') {
      const shouldRemember = localStorage.getItem(REMEMBER_FLAG_KEY)
      if (shouldRemember === 'true') {
        return localStorage.getItem(REMEMBER_EMAIL_KEY)
      }
    }
    return null
  },

  /**
   * Xóa thông tin remember
   */
  clearRemember(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REMEMBER_EMAIL_KEY)
      localStorage.removeItem(REMEMBER_FLAG_KEY)
    }
  },
}
