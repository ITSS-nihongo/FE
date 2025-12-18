'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserOutlined, DownOutlined } from '@ant-design/icons'
import { useMe } from '@/lib/hooks/use-me'
import { tokenManager } from '@/lib/utils/token'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Get current user authentication status
  const { user, isAuthenticated } = useMe()

  // Redirect if not admin
  if (isAuthenticated && user?.role !== 'ADMIN') {
    router.push('/dashboard')
    return null
  }

  const handleLogout = () => {
    tokenManager.removeToken()
    setIsDropdownOpen(false)
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header Navigation */}
      <header className="border-b border-gray-300 bg-white">
        <div className="w-full px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/admin/users" className="text-xl font-bold text-gray-900">
              Logo
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-12">
              <Link 
                href="/admin/users" 
                className={pathname === '/admin/users' ? 'text-pink-500 font-bold text-base' : 'text-gray-700 hover:text-pink-500 transition-colors text-base'}
              >
                ユーザー管理
              </Link>
              <Link 
                href="/admin/places" 
                className={pathname === '/admin/places' ? 'text-pink-500 font-bold text-base' : 'text-gray-700 hover:text-pink-500 transition-colors text-base'}
              >
                施設管理
              </Link>
            </nav>

            {/* User Profile Section */}
            <div className="relative">
              {isAuthenticated ? (
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-900 font-medium">アドミン</span>
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center">
                    <UserOutlined className="text-xl text-gray-900" />
                  </div>
                </button>
              ) : null}

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-300 bg-white py-4">
        <div className="w-full px-8">
          <p className="text-sm text-gray-600">
            © 2025 TheWeekend. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
