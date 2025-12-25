'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, message, Card } from 'antd'
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { client } from '@/lib/api/client'

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      const response = await client.POST('/api/auth/forgot-password', {
        body: {
          email: values.email,
        },
      })

      if (response.error) {
        message.error('メールアドレスが見つかりません')
        return
      }

      setEmailSent(true)
      message.success('パスワードリセットのメールを送信しました')
    } catch (error) {
      console.error('Forgot password error:', error)
      message.error('エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <MailOutlined className="text-3xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            メール送信完了
          </h2>
          <p className="text-gray-600">
            パスワードリセットのリンクをメールで送信しました。
          </p>
        </div>

        <div className="space-y-4 text-left bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-700">
            <strong>次のステップ：</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>メールボックスを確認してください</li>
            <li>「パスワードをリセット」ボタンをクリックしてください</li>
            <li>新しいパスワードを設定してください</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            ⚠️ リンクは1時間で無効になります
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="primary"
            block
            size="large"
            onClick={() => router.push('/login')}
            className="bg-pink-500 hover:!bg-pink-600"
          >
            ログインページに戻る
          </Button>
          <Button
            block
            onClick={() => setEmailSent(false)}
          >
            メールが届かない場合、再送信
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Form
      name="forgot-password"
      onFinish={onFinish}
      layout="vertical"
      size="large"
      requiredMark={false}
    >
      <Form.Item
        name="email"
        label="メールアドレス"
        rules={[
          { required: true, message: 'メールアドレスを入力してください' },
          { type: 'email', message: '有効なメールアドレスを入力してください' },
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder="example@email.com"
          autoComplete="email"
        />
      </Form.Item>

      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-gray-700">
          登録されたメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
        </p>
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
          リセットリンクを送信
        </Button>
      </Form.Item>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftOutlined />
          <span>ログインページに戻る</span>
        </Link>
      </div>
    </Form>
  )
}
