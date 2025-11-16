'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { Provider as ZenStackHooksProvider } from "@/lib/api/generated"
import { getCookie } from 'cookies-next/client'
import { ReactHookModalProvider } from 'react-hook-disclosure-modal'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ZenStackHooksProvider
        value={{
          endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/model`,
          // Custom fetch function để tự động thêm token từ cookies
          fetch: async (url: string, options?: RequestInit) => {
            const token = getCookie('auth_token')
            
            const headers = new Headers(options?.headers)
            if (token) {
              headers.set('Authorization', `Bearer ${token}`)
            }
            headers.set('Content-Type', 'application/json')

            return fetch(url, {
              ...options,
              headers,
              credentials: 'include', // Gửi cookies
            })
          },
        }}
      >
        <ReactHookModalProvider modals={{}}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </ReactHookModalProvider>
      </ZenStackHooksProvider>
    </QueryClientProvider>
  )
}
