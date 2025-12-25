'use client'

import { useToast } from '@/lib/hooks/use-toast'

export function ToastProvider() {
  const contextHolder = useToast()
  return <>{contextHolder}</>
}
