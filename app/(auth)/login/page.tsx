import { LoginForm } from "@/components/features/auth/login-form";
import { Suspense } from "react";

function LoginContent() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          TheWeekend
        </h1>
        <p className="text-base text-gray-700 mb-8">
          子供たちの楽しい週末を見つけよう!
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          ログイン
        </h2>
      </div>

      {/* Login Form */}
      <Suspense fallback={<div>Loading form...</div>}>
        <LoginForm />
      </Suspense>


    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg shadow-md p-8">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
