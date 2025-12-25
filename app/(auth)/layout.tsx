import type { ReactNode } from 'react'
import Link from 'next/link'
import { HomeOutlined, HeartOutlined, UserOutlined } from '@ant-design/icons'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="text-lg font-semibold">
              Logo
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 flex items-center gap-2">
                <span>ホーム</span>
              </Link>
            </nav>

            {/* Login Button */}
            <Link 
              href="/login" 
              className="flex items-center gap-2 px-4 py-2 text-pink-500 border border-pink-500 rounded-full hover:bg-pink-50 transition-colors"
            >
              <span>ログイン</span>
              <UserOutlined />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center bg-gray-50 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4">
        <div className="container mx-auto px-4 text-left text-sm text-gray-500">
          © 2025 TheWeekend. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
