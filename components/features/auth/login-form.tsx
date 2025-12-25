'use client'

import { postApiAuthLoginMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { tokenManager } from '@/lib/utils/token'
import { useMutation } from '@tanstack/react-query'
import { Form, Input, Button, Alert, Checkbox } from 'antd'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

type LoginFormValues = {
  email: string
  password: string
  remember?: boolean
}

export function LoginForm() {
  const [form] = Form.useForm<LoginFormValues>()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if user already has token on mount
  useEffect(() => {
    if (tokenManager.hasToken()) {
      // Already logged in, redirect to dashboard
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      router.push(redirectTo)
      return
    }

    // Load saved email if remember me was checked
    const savedEmail = tokenManager.getRememberEmail()
    if (savedEmail) {
      form.setFieldsValue({
        email: savedEmail,
        remember: true,
      })
    }
  }, [form, router, searchParams])

  const loginMutation = useMutation({
    ...postApiAuthLoginMutation(),
    onSuccess: (data) => {
      const remember = form.getFieldValue('remember')
      const email = form.getFieldValue('email')
      
      // Save token with remember flag
      tokenManager.setToken(data.token, remember)
      
      // Save email if remember is checked
      if (remember) {
        tokenManager.setRememberEmail(email)
      } else {
        tokenManager.clearRemember()
      }
      
      // Redirect to original page or dashboard
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      router.push(redirectTo)
    },
  })

  const onFinish = (values: LoginFormValues) => {
    loginMutation.mutate({
      body: {
        email: values.email,
        password: values.password,
      },
    })
  }

  return (
    <Form
      form={form}
      name="login"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      size="large"
      initialValues={{ remember: false }}
    >
      {/* Email Field */}
      <Form.Item
        name="email"
        label={<span className="text-gray-900 font-medium">メールアドレス</span>}
        rules={[
          { required: true, message: 'メールアドレスを入力してください' },
          { type: 'email', message: '有効なメールアドレスを入力してください' },
        ]}
      >
        <Input 
          placeholder=""
          className="rounded-lg border-2 h-12"
          style={{ borderColor: '#BC41C7' }}
        />
      </Form.Item>

      {/* Password Field */}
      <Form.Item
        name="password"
        label={<span className="text-gray-900 font-medium">パスワード</span>}
        rules={[
          { required: true, message: 'パスワードを入力してください' },
          { min: 1, message: 'パスワードは6文字以上である必要があります' },
        ]}
        className="mb-2"
      >
        <Input.Password 
          placeholder="パスワード"
          className="rounded-lg border-2 h-12"
          style={{ borderColor: '#BC41C7' }}
        />
      </Form.Item>

      {/* Remember Me Checkbox and Forgot Password */}
      <Form.Item className="mb-4">
        <div className="flex items-center justify-between">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-sm text-gray-900">
              ログイン状態を保持
            </Checkbox>
          </Form.Item>
          <a href="/forgot-password" className="text-sm hover:underline" style={{ color: '#BC41C7' }}>
            パスワードを忘れた？
          </a>
        </div>
      </Form.Item>

      {/* Error Message */}
      {loginMutation.isError && (
        <Form.Item>
          <Alert
            message="ログイン失敗"
            description={
              (() => {
                const error = loginMutation.error as any
                if (typeof error === 'string') return error
                if (error?.error && typeof error.error === 'string') return error.error
                if (error?.message && typeof error.message === 'string') return error.message
                if (error?.data?.error) return error.data.error
                return 'メールアドレスまたはパスワードが間違っています。再度お試しください。'
              })()
            }
            type="error"
            showIcon
            closable
            className="mb-4"
          />
        </Form.Item>
      )}

      {/* Submit Button */}
      <Form.Item className="mb-4">
        <Button
          type="primary"
          htmlType="submit"
          loading={loginMutation.isPending}
          block
          className="h-14 rounded-full border-0 text-white font-semibold text-lg shadow-md"
          style={{
            backgroundColor: '#BC41C7'
          }}
        >
          {loginMutation.isPending ? 'ログイン中...' : 'ログイン'}
        </Button>
      </Form.Item>

      {/* Register Link */}
      <div className="text-center text-sm text-gray-900">
        アカウントをお持ちでない方は、<a href="/register" className="font-medium hover:underline" style={{ color: '#BC41C7' }}>👉 新規登録</a>
      </div>
    </Form>
  )
}
