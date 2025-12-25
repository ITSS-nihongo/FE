import { ResetPasswordForm } from "@/components/features/auth/reset-password-form"
import { Suspense } from "react"

function ResetPasswordContent() {
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
          新しいパスワードを設定
        </h2>
        <p className="text-sm text-gray-500">
          安全な新しいパスワードを入力してください
        </p>
      </div>

      {/* Reset Password Form */}
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
