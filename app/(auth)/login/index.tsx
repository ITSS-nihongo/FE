import { LoginForm } from "@/components/features/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          TheWeekend
        </h1>
        <p className="text-sm text-gray-600">
          子供たちの楽しい週末を作りましょう!
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-6">
          ログイン
        </h2>
      </div>

      {/* Login Form */}
      <LoginForm />

      {/* Footer Links */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex items-center justify-between text-sm">
          <Link 
            href="/forgot-password" 
            className="text-gray-500 hover:text-gray-700"
          >
            パスワードを忘れた場合
          </Link>
          <Link 
            href="/register" 
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            新規登録はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
