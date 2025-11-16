'use client'

import { postApiAuthRegisterMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { tokenManager } from '@/lib/utils/token'
import { useMutation } from '@tanstack/react-query'
import { Form, Input, InputNumber, Button, Alert } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined, PhoneOutlined, HomeOutlined, TeamOutlined } from '@ant-design/icons'
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
        label={<span className="text-gray-700 text-sm">お名前</span>}
        rules={[
          { required: true, message: 'お名前を入力してください' },
          { min: 2, message: 'お名前は2文字以上である必要があります' },
        ]}
      >
        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="山田太郎" />
      </Form.Item>

      {/* Email */}
      <Form.Item
        name="email"
        label={<span className="text-gray-700 text-sm">メールアドレス</span>}
        rules={[
          { required: true, message: 'メールアドレスを入力してください' },
          { type: 'email', message: '有効なメールアドレスを入力してください' },
        ]}
      >
        <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="example@email.com" />
      </Form.Item>

      {/* Password */}
      <Form.Item
        name="password"
        label={<span className="text-gray-700 text-sm">パスワード</span>}
        rules={[
          { required: true, message: 'パスワードを入力してください' },
          { min: 6, message: 'パスワードは6文字以上である必要があります' },
        ]}
        hasFeedback
      >
        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="パスワード" />
      </Form.Item>

      {/* Confirm Password */}
      <Form.Item
        name="confirmPassword"
        label={<span className="text-gray-700 text-sm">パスワード確認</span>}
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
        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="パスワード確認" />
      </Form.Item>

      {/* Phone Number (Optional) */}
      <Form.Item
        name="phoneNumber"
        label={<span className="text-gray-700 text-sm">電話番号（任意）</span>}
        rules={[
          { pattern: /^[0-9]{10,11}$/, message: '有効な電話番号を入力してください' },
        ]}
      >
        <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="09012345678" />
      </Form.Item>

      {/* Address (Optional) */}
      <Form.Item name="address" label={<span className="text-gray-700 text-sm">住所（任意）</span>}>
        <Input.TextArea 
          placeholder="東京都渋谷区..." 
          rows={2}
          showCount
          maxLength={200}
        />
      </Form.Item>

      {/* Number of Kids (Optional) */}
      <Form.Item name="numberOfKids" label={<span className="text-gray-700 text-sm">お子様の人数（任意）</span>}>
        <InputNumber
          placeholder="0"
          min={0}
          max={20}
          style={{ width: '100%' }}
        />
      </Form.Item>

      {/* Error Message */}
      {registerMutation.isError && (
        <Form.Item>
          <Alert
            message="登録失敗"
            description={registerMutation.error.error || 'もう一度お試しください'}
            type="error"
            showIcon
            closable
          />
        </Form.Item>
      )}

      {/* Submit Button */}
      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={registerMutation.isPending}
          block
          className="h-12 rounded-full text-white font-medium shadow-md"
          style={{
            background: registerMutation.isPending 
              ? undefined 
              : 'linear-gradient(90deg, #ec4899 0%, #a855f7 100%)',
            border: 'none'
          }}
        >
          {registerMutation.isPending ? 'アカウント作成中...' : '新規登録'}
        </Button>
      </Form.Item>
    </Form>
  )
}
