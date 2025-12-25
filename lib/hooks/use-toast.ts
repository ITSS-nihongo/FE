'use client'

import { notification } from 'antd'
import { useEffect } from 'react'

type NotificationType = 'success' | 'info' | 'warning' | 'error'

let notificationInstance: any = null

export const useToast = () => {
  const [api, contextHolder] = notification.useNotification()

  useEffect(() => {
    notificationInstance = api
  }, [api])

  return contextHolder
}

// Global toast functions that don't trigger React 19 warning
export const toast = {
  success: (message: string, description?: string) => {
    if (notificationInstance) {
      notificationInstance.success({
        message,
        description,
        placement: 'top',
        duration: 2,
      })
    }
  },
  error: (message: string, description?: string) => {
    if (notificationInstance) {
      notificationInstance.error({
        message,
        description,
        placement: 'top',
        duration: 3,
      })
    }
  },
  warning: (message: string, description?: string) => {
    if (notificationInstance) {
      notificationInstance.warning({
        message,
        description,
        placement: 'top',
        duration: 2.5,
      })
    }
  },
  info: (message: string, description?: string) => {
    if (notificationInstance) {
      notificationInstance.info({
        message,
        description,
        placement: 'top',
        duration: 2,
      })
    }
  },
}
