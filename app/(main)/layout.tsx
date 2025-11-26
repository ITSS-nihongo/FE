'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeOutlined, HeartOutlined, UserOutlined } from '@ant-design/icons'

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

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
            </nav>

            {/* Profile Button */}
            <Link 
              href="/profile" 
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors"
            >
              <span>プロフィール</span>
              <div className="w-8 h-8 rounded-full border-2 border-pink-500 flex items-center justify-center">
                <UserOutlined className="text-pink-500" />
              </div>
            </Link>
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
        <div className="w-full px-4 text-center text-sm text-gray-500">
          © 2025 TheWeekend. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
