import { RegisterForm } from "@/components/features/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          TheWeekendへようこそ！
        </h1>
        <p className="text-base text-gray-700 mb-8">
          お子様の遊び場を探すためのアカウントを作成しましょう。
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          新規登録
        </h2>
      </div>

      {/* Register Form */}
      <RegisterForm />

      {/* Footer Links */}
      <div className="mt-6 text-center text-sm text-gray-900">
        すでにアカウントをお持ちの方は、<Link href="/login" className="font-medium hover:underline" style={{ color: '#BC41C7' }}>👉ログイン</Link>
      </div>
    </div>
  );
}
