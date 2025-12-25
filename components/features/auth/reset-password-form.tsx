'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Form, Input, Card, Alert } from 'antd'
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { postApiAuthResetPasswordMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

type ResetPasswordFormValues = {
  password: string
  confirmPassword: string
}

export function ResetPasswordForm() {
  const [form] = Form.useForm<ResetPasswordFormValues>()
  const [resetSuccess, setResetSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      router.push('/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  const resetPasswordMutation = useMutation({
    ...postApiAuthResetPasswordMutation(),
    onSuccess: () => {
      setResetSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    },
  })

  const onFinish = (values: ResetPasswordFormValues) => {
    if (!token) return
    resetPasswordMutation.mutate({
      body: {
        token: token,
        newPassword: values.password,
      },
    })
  }

  if (resetSuccess) {
    return (
      <Card className="text-center border-0 shadow-sm">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleOutlined className="text-4xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            パスワードリセット完了！
          </h2>
          <p className="text-gray-600 mb-4">
            パスワードが正常に変更されました。
          </p>
          <p className="text-sm text-gray-500">
            3秒後にログインページにリダイレクトされます...
          </p>
        </div>
        <Button
          type="primary"
          block
          size="large"
          onClick={() => router.push('/login')}
          className="h-12 rounded-full border-0 font-medium shadow-md"
          style={{ background: '#BC41C7' }}
        >
          今すぐログイン
        </Button>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card className="text-center border-0 shadow-sm">
        <p className="text-gray-600">リセットリンクを確認中...</p>
      </Card>
    )
  }

  return (
    <div>
      {resetPasswordMutation.isError && (
        <Alert
          message="エラーが発生しました"
          description={
            (() => {
              const error = resetPasswordMutation.error as any
              if (typeof error === 'string') return error
              if (error?.error && typeof error.error === 'string') return error.error
              if (error?.message && typeof error.message === 'string') return error.message
              if (error?.data?.error) return error.data.error
              return 'リセットトークンが無効または期限切れです。もう一度お試しください。'
            })()
          }
          type="error"
          showIcon
          closable
          className="mb-6 rounded-lg"
          onClose={() => resetPasswordMutation.reset()}
        />
      )}
      <Form form={form} name="reset-password" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
        <Form.Item
          name="password"
          label={<span className="text-gray-700 font-medium">新しいパスワード</span>}
          rules={[
            { required: true, message: 'パスワードを入力してください' },
            { min: 6, message: 'パスワードは6文字以上である必要があります' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="新しいパスワード"
            autoComplete="new-password"
            className="rounded-lg h-12"
          />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={<span className="text-gray-700 font-medium">パスワード確認</span>}
          dependencies={['password']}
          rules={[
            { required: true, message: 'パスワードを再入力してください' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('パスワードが一致しません'))
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="パスワード確認"
            autoComplete="new-password"
            className="rounded-lg h-12"
          />
        </Form.Item>
        
        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={resetPasswordMutation.isPending}
            className="h-12 rounded-full border-0 font-medium shadow-md"
            style={{
              background: resetPasswordMutation.isPending ? undefined : '#BC41C7'
            }}
          >
            {resetPasswordMutation.isPending ? 'リセット中...' : 'パスワードをリセット'}
          </Button>
        </Form.Item>
        <div className="text-center">
          <Link href="/login" className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
            ログインページに戻る
          </Link>
        </div>
      </Form>
    </div>
  )
}
