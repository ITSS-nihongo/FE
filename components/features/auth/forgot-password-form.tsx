'use client'

import { useRouter } from 'next/navigation'
import { Button, Form, Input, Alert } from 'antd'
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { postApiAuthForgotPasswordMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { toast } from '@/lib/hooks/use-toast'

type ForgotPasswordFormValues = {
  email: string
}

export function ForgotPasswordForm() {
  const [form] = Form.useForm<ForgotPasswordFormValues>()
  const router = useRouter()

  const forgotPasswordMutation = useMutation({
    ...postApiAuthForgotPasswordMutation(),
    onSuccess: (data) => {
      toast.success('送信成功', 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。')
      form.resetFields()
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    },
  })

  const onFinish = (values: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate({
      body: {
        email: values.email,
      },
    })
  }

  return (
    <div>
      {/* Error Alert */}
      {forgotPasswordMutation.isError && (
        <Alert
          message="エラーが発生しました"
          description={
            (() => {
              const error = forgotPasswordMutation.error as any
              if (error?.error && typeof error.error === 'string') return error.error
              if (error?.message && typeof error.message === 'string') return error.message
              if (error?.data?.error) return error.data.error
              return 'メールアドレスが見つかりません。もう一度お試しください。'
            })()
          }
          type="error"
          showIcon
          closable
          className="mb-6 rounded-lg"
          onClose={() => forgotPasswordMutation.reset()}
        />
      )}

      <Form
        form={form}
        name="forgot-password"
        onFinish={onFinish}
        layout="vertical"
        size="large"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label={<span className="text-gray-700 font-medium">メールアドレス</span>}
          rules={[
            { required: true, message: 'メールアドレスを入力してください' },
            { type: 'email', message: '有効なメールアドレスを入力してください' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="example@email.com"
            autoComplete="email"
            className="rounded-lg h-12"
          />
        </Form.Item>

    

        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={forgotPasswordMutation.isPending}
            className="h-12 rounded-full border-0 font-medium shadow-md"
            style={{
              background: forgotPasswordMutation.isPending
                ? undefined
                : '#BC41C7'
            }}
          >
            {forgotPasswordMutation.isPending ? '送信中...' : 'リセットリンクを送信'}
          </Button>
        </Form.Item>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftOutlined className="text-sm" />
            <span className="font-medium">ログインページに戻る</span>
          </Link>
        </div>
      </Form>
    </div>
  )
}
