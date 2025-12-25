'use client'

import { postApiAuthRegisterMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { tokenManager } from '@/lib/utils/token'
import { useMutation } from '@tanstack/react-query'
import { Form, Input, InputNumber, Button, Alert } from 'antd'
import { useRouter } from 'next/navigation'

type RegisterFormValues = {
  email: string
  password: string
  confirmPassword: string
  name: string
  phoneNumber?: string
  address?: string
  numberOfKids?: number
}

export function RegisterForm() {
  const [form] = Form.useForm<RegisterFormValues>()
  const router = useRouter()

  const registerMutation = useMutation({
    ...postApiAuthRegisterMutation(),
    onSuccess: (data) => {
      // Save token
      tokenManager.setToken(data.token)
      // Show success message
      console.log('Registration successful!', data.user)
      // Redirect to dashboard
      router.push('/dashboard')
    },
  })

  const onFinish = (values: RegisterFormValues) => {
    // Remove confirmPassword trước khi gửi API
    const { confirmPassword, ...registerData } = values
    
    registerMutation.mutate({
      body: registerData,
    })
  }

  return (
    <Form
      form={form}
      name="register"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      size="large"
      scrollToFirstError
    >
      {/* Name */}
      <Form.Item
        name="name"
        label={<span className="text-gray-900 font-medium">お名前</span>}
        rules={[
          { required: true, message: 'お名前を入力してください' },
          { min: 2, message: 'お名前は2文字以上である必要があります' },
        ]}
      >
        <Input placeholder="" className="rounded-lg border-2 h-12" style={{ borderColor: '#BC41C7' }} />
      </Form.Item>

      {/* Email */}
      <Form.Item
        name="email"
        label={<span className="text-gray-900 font-medium">メールアドレス</span>}
        rules={[
          { required: true, message: 'メールアドレスを入力してください' },
          { type: 'email', message: '有効なメールアドレスを入力してください' },
        ]}
      >
        <Input placeholder="" className="rounded-lg border-2 h-12" style={{ borderColor: '#BC41C7' }} />
      </Form.Item>

      {/* Phone Number (Optional) */}
      <Form.Item
        name="phoneNumber"
        label={<span className="text-gray-900 font-medium">電話番号</span>}
        rules={[
          { pattern: /^[0-9]{10,11}$/, message: '有効な電話番号を入力してください' },
        ]}
      >
        <Input placeholder="" className="rounded-lg border-2 h-12" style={{ borderColor: '#BC41C7' }} />
      </Form.Item>

      {/* Password */}
      <Form.Item
        name="password"
        label={<span className="text-gray-900 font-medium">パスワード</span>}
        rules={[
          { required: true, message: 'パスワードを入力してください' },
          { min: 1, message: 'パスワードは6文字以上である必要があります' },
        ]}
        hasFeedback
      >
        <Input.Password placeholder="パスワード" className="rounded-lg border-2 h-12" style={{ borderColor: '#BC41C7' }} />
      </Form.Item>

      {/* Confirm Password */}
      <Form.Item
        name="confirmPassword"
        label={<span className="text-gray-900 font-medium">パスワード確認</span>}
        dependencies={['password']}
        hasFeedback
        rules={[
          { required: true, message: 'パスワードを確認してください' },
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
        <Input.Password placeholder="パスワード確認" className="rounded-lg border-2 h-12" style={{ borderColor: '#BC41C7' }} />
      </Form.Item>

      {/* Number of Kids */}
      <Form.Item name="numberOfKids" label={<span className="text-gray-900 font-medium">お子様の人数</span>}>
        <InputNumber
          placeholder="0"
          min={0}
          max={20}
          className="rounded-lg border-2 h-12"
          style={{ width: '100%', borderColor: '#BC41C7' }}
        />
      </Form.Item>

      {/* Address */}
      <Form.Item name="address" label={<span className="text-gray-900 font-medium">住所</span>}>
        <Input 
          placeholder="" 
          className="rounded-lg border-2 h-12" 
          style={{ borderColor: '#BC41C7' }}
        />
      </Form.Item>

      {/* Error Message */}
      {registerMutation.isError && (
        <Form.Item>
          <Alert
            message="登録失敗"
            description={
              (() => {
                const error = registerMutation.error as any
                if (typeof error === 'string') return error
                if (error?.error && typeof error.error === 'string') return error.error
                if (error?.message && typeof error.message === 'string') return error.message
                if (error?.data?.error) return error.data.error
                return 'もう一度お試しください'
              })()
            }
            type="error"
            showIcon
            closable
            onClose={() => registerMutation.reset()}
          />
        </Form.Item>
      )}

      {/* Submit Button */}
      <Form.Item className="mb-4">
        <Button
          type="primary"
          htmlType="submit"
          loading={registerMutation.isPending}
          block
          className="h-14 rounded-full text-white font-semibold text-lg shadow-md"
          style={{
            backgroundColor: '#BC41C7'
          }}
        >
          {registerMutation.isPending ? 'アカウント作成中...' : '登録'}
        </Button>
      </Form.Item>
    </Form>
  )
}
