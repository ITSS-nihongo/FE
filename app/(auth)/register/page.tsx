import { RegisterForm } from "@/components/features/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
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
          新規登録
        </h2>
      </div>

      {/* Register Form */}
      <RegisterForm />

      {/* Footer Links */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          すでにアカウントをお持ちですか？{' '}
          <Link 
            href="/login" 
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            ログインはこちら
          </Link>
        </p>
      </div>
    </div>
  );
}
