'use client'

import { useFindFirstUser } from '@/lib/api/generated/user'
import { tokenManager } from '@/lib/utils/token'
import { jwtDecode } from 'jwt-decode'
import { useMemo } from 'react'

interface TokenPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Custom hook to get current logged-in user information
 * Decodes JWT token to get user ID, then fetches full user data using ZenStack
 */
export function useMe() {
  // Get and decode token to extract user ID
  const userId = useMemo(() => {
    const token = tokenManager.getToken()
    if (!token) return null

    try {
      const decoded = jwtDecode<TokenPayload>(token)
      return decoded.userId
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }, [])

  // Fetch user data using ZenStack hook
  const { data: user, isLoading, error, refetch } = useFindFirstUser(
    {
      where: {
        id: userId || undefined,
      },
    },
    {
      enabled: !!userId, // Only run query if we have a user ID
    }
  )

  return {
    user,
    isLoading,
    error,
    refetch,
    isAuthenticated: !!user,
    userId,
  }
}
