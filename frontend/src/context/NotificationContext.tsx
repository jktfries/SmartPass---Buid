import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { notificationApi } from '@/api/notifications'
import { useAuth } from './AuthContext'

interface NotificationContextValue {
  unreadCount: number
  messageUnreadCount: number
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  messageUnreadCount: 0,
  refresh: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function poll() {
    if (!user) return
    notificationApi.unreadCount()
      .then(r => {
        setUnreadCount(r.data.count)
        setMessageUnreadCount(r.data.message_unread_count)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      setMessageUnreadCount(0)
      return
    }
    poll()
    intervalRef.current = setInterval(poll, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <NotificationContext.Provider value={{ unreadCount, messageUnreadCount, refresh: poll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
