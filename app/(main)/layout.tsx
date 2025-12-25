'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HomeOutlined, HeartOutlined, UserOutlined, DownOutlined } from '@ant-design/icons'
import { useMe } from '@/lib/hooks/use-me'
import { tokenManager } from '@/lib/utils/token'

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Get current user authentication status
  const { user, isAuthenticated } = useMe()
  console.log(user?.role)
  const handleLogout = () => {
    tokenManager.removeToken()
    setIsDropdownOpen(false)
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="text-lg font-semibold hover:text-pink-500 transition-colors">
              Logo
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                href="/dashboard" 
                className={pathname === '/dashboard' ? 'text-pink-500 font-semibold' : 'text-gray-700 hover:text-pink-500 transition-colors'}
              >
                ホーム
              </Link>
              {isAuthenticated && (
                <>
                  <Link 
                    href="/recommendations" 
                    className={pathname === '/recommendations' ? 'text-pink-500 font-semibold' : 'text-gray-700 hover:text-pink-500 transition-colors'}
                  >
                    おすすめ
                  </Link>
                  <Link 
                    href="/favorites" 
                    className={pathname === '/favorites' ? 'text-pink-500 font-semibold' : 'text-gray-700 hover:text-pink-500 transition-colors'}
                  >
                    お気に入り
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link 
                      href="/admin/users" 
                      className={pathname?.startsWith('/admin') ? 'text-pink-500 font-semibold' : 'text-gray-700 hover:text-pink-500 transition-colors'}
                    >
                      管理
                    </Link>
                  )}
                </>
              )}
            </nav>

            {/* Profile Dropdown or Login Button */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors"
                >
                  <span>プロフィール</span>
                  <div className="w-8 h-8 rounded-full border-2 border-pink-500 flex items-center justify-center">
                    <UserOutlined className="text-pink-500" />
                  </div>
                  <DownOutlined className="text-xs" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    {/* Overlay to close dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-pink-500 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        プロフィール
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-pink-500 transition-colors"
                      >
                        ログアウト
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center gap-2 px-4 py-2 text-pink-500 border border-pink-500 rounded-full hover:bg-pink-50 transition-colors"
              >
                <span>ログイン</span>
                <UserOutlined />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="w-[95%] mx-auto px-0 py-0">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4">
        <div className="w-full px-4 text-left text-sm text-gray-500">
          © 2025 TheWeekend. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
