'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Form, Input, message, Card } from 'antd'
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { client } from '@/lib/api/client'

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      message.error('無効なリセットリンクです')
      router.push('/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      message.error('トークンが見つかりません')
      return
    }

    if (values.password !== values.confirmPassword) {
      message.error('パスワードが一致しません')
      return
    }

    setLoading(true)
    try {
      const response = await client.POST('/api/auth/reset-password', {
        body: {
          token: token,
          newPassword: values.password,
        },
      })

      if (response.error) {
        message.error('リセットトークンが無効または期限切れです')
        return
      }

      setResetSuccess(true)
      message.success('パスワードが正常にリセットされました')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      console.error('Reset password error:', error)
      message.error('エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  if (resetSuccess) {
    return (
      <Card className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleOutlined className="text-3xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            パスワードリセット完了
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
          className="bg-pink-500 hover:!bg-pink-600"
        >
          今すぐログイン
        </Button>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card className="text-center">
        <p className="text-gray-600">リセットリンクを確認中...</p>
      </Card>
    )
  }

  return (
    <Form
      name="reset-password"
      onFinish={onFinish}
      layout="vertical"
      size="large"
      requiredMark={false}
    >
      <Form.Item
        name="password"
        label="新しいパスワード"
        rules={[
          { required: true, message: 'パスワードを入力してください' },
          { min: 6, message: 'パスワードは6文字以上である必要があります' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="新しいパスワード"
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="パスワード確認"
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
        />
      </Form.Item>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700 font-medium mb-2">
          パスワード要件：
        </p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>6文字以上</li>
          <li>両方のフィールドが一致する必要があります</li>
        </ul>
      </div>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          className="bg-pink-500 hover:!bg-pink-600 h-12 text-base font-medium"
        >
          パスワードをリセット
        </Button>
      </Form.Item>

      <div className="text-center">
        <Link
          href="/login"
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          ログインページに戻る
        </Link>
      </div>
    </Form>
  )
}
