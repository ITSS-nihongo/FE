import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          TheWeekend
        </h1>
        <p className="text-sm text-gray-600">
          子供たちの楽しい週末を作りましょう!
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">
          パスワードをお忘れですか？
        </h2>
        <p className="text-sm text-gray-500">
          登録されたメールアドレスに確認リンクを送信します
        </p>
      </div>

      {/* Forgot Password Form */}
      <ForgotPasswordForm />
    </div>
  )
}
