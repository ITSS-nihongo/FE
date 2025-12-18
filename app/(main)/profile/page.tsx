'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EditOutlined } from '@ant-design/icons'
import { Form, Input, Select, Button, message, Spin } from 'antd'
import { useUpdateUser } from '@/lib/api/generated/user'
import { tokenManager } from '@/lib/utils/token'
import { useMe } from '@/lib/hooks/use-me'

type PersonalInfoFormValues = {
  name: string
  email: string
  numberOfKids: number
  phoneNumber: string
  address: string
}

type AccountInfoFormValues = {
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  
  const [personalForm] = Form.useForm<PersonalInfoFormValues>()
  const [accountForm] = Form.useForm<AccountInfoFormValues>()

  // Fetch current user data using custom hook
  const { user: currentUser, isLoading, isAuthenticated } = useMe()

  // Redirect to dashboard if not authenticated (they can login from there)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  // Update user mutation
  const { mutate: updateUser, isPending } = useUpdateUser({
    onSuccess: () => {
      message.success('更新が成功しました')
      setIsEditingPersonal(false)
    },
    onError: (error) => {
      message.error('更新に失敗しました')
      console.error(error)
    }
  })

  // Load user data into form when fetched
  useEffect(() => {
    if (currentUser) {
      personalForm.setFieldsValue({
        name: currentUser.name || '',
        email: currentUser.email || '',
        numberOfKids: currentUser.numberOfKids || 0,
        phoneNumber: currentUser.phoneNumber || '',
        address: currentUser.address || ''
      })
      
      // Account form doesn't need initial values for password fields
    }
  }, [currentUser, personalForm, accountForm])

  const handlePersonalSave = async () => {
    try {
      const values = await personalForm.validateFields()
      if (currentUser?.id) {
        updateUser({
          where: { id: currentUser.id },
          data: {
            name: values.name,
            email: values.email,
            numberOfKids: values.numberOfKids,
            phoneNumber: values.phoneNumber,
            address: values.address
          }
        })
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handlePersonalCancel = () => {
    // Reset form to original values
    if (currentUser) {
      personalForm.setFieldsValue({
        name: currentUser.name || '',
        email: currentUser.email || '',
        numberOfKids: currentUser.numberOfKids || 0,
        phoneNumber: currentUser.phoneNumber || '',
        address: currentUser.address || ''
      })
    }
    setIsEditingPersonal(false)
  }

  const handleAccountSave = async () => {
    try {
      const values = await accountForm.validateFields()
      if (currentUser?.id && values.newPassword) {
        updateUser({
          where: { id: currentUser.id },
          data: {
            password: values.newPassword
          }
        })
      }
      accountForm.resetFields(['newPassword', 'confirmPassword'])
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleAccountCancel = () => {
    accountForm.resetFields(['newPassword', 'confirmPassword'])
  }

  const handleLogout = () => {
    tokenManager.removeToken()
    router.push('/dashboard')
  }

  // Show loading spinner while fetching user data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  // Don't render if no user (will redirect)
  if (!currentUser) {
    return null
  }

  return (
    <div className="w-full py-8 px-6">
      {/* Personal Information Section */}
      <div className="bg-white rounded-lg border-2 border-pink-300 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">個人情報</h2>
          {!isEditingPersonal && (
            <button
              onClick={() => setIsEditingPersonal(true)}
              className="text-gray-600 hover:text-pink-500"
            >
              <EditOutlined className="text-xl" />
            </button>
          )}
        </div>

        <Form form={personalForm} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Name */}
            <Form.Item
              name="name"
              label="名前"
              rules={[{ required: true, message: '名前を入力してください' }]}
            >
              <Input
                disabled={!isEditingPersonal}
                className="disabled:bg-gray-100"
              />
            </Form.Item>

            {/* Email */}
            <Form.Item
              name="email"
              label="メールアドレス"
              rules={[
                { required: true, message: 'メールアドレスを入力してください' },
                { type: 'email', message: '有効なメールアドレスを入力してください' }
              ]}
            >
              <Input
                type="email"
                disabled={!isEditingPersonal}
                className="disabled:bg-gray-100"
              />
            </Form.Item>

            {/* Children */}
            <Form.Item
              name="numberOfKids"
              label="子供の数"
            >
              <Select
                disabled={!isEditingPersonal}
                className="w-full"
              >
                <Select.Option value={0}>0</Select.Option>
                <Select.Option value={1}>1</Select.Option>
                <Select.Option value={2}>2</Select.Option>
                <Select.Option value={3}>3</Select.Option>
                <Select.Option value={4}>4</Select.Option>
                <Select.Option value={5}>5+</Select.Option>
              </Select>
            </Form.Item>
          </div>

          {/* Phone */}
          <Form.Item
            name="phoneNumber"
            label="電話番号"
            className="mb-6"
          >
            <Input
              type="tel"
              disabled={!isEditingPersonal}
              className="disabled:bg-gray-100"
            />
          </Form.Item>

          {/* Address */}
          <Form.Item
            name="address"
            label="住所"
            className="mb-6"
          >
            <Input
              disabled={!isEditingPersonal}
              className="disabled:bg-gray-100"
            />
          </Form.Item>

          {/* Buttons for Personal Info */}
          {isEditingPersonal && (
            <div className="flex gap-4">
              <Button
                type="primary"
                onClick={handlePersonalSave}
                loading={isPending}
                className="flex-1 h-10 bg-pink-500 hover:bg-pink-600 border-0 rounded-lg"
              >
                変更を保存
              </Button>
              <Button
                onClick={handlePersonalCancel}
                disabled={isPending}
                className="flex-1 h-10 bg-pink-500 hover:bg-pink-600 text-white border-0 rounded-lg"
              >
                キャンセル
              </Button>
            </div>
          )}
        </Form>
      </div>

      {/* Account Information Section */}
      <div className="bg-white rounded-lg border-2 border-pink-300 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">アカウント情報</h2>

        <Form form={accountForm} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* New Password */}
            <Form.Item
              name="newPassword"
              label="新しいパスワード"
              rules={[
                { min: 6, message: 'パスワードは6文字以上である必要があります' }
              ]}
            >
              <Input.Password />
            </Form.Item>

            {/* Confirm Password */}
            <Form.Item
              name="confirmPassword"
              label="パスワード再確認"
              dependencies={['newPassword']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('パスワードが一致しません'))
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
          </div>

          {/* Buttons for Account Info */}
          <div className="flex gap-4">
            <Button
              type="primary"
              onClick={handleAccountSave}
              loading={isPending}
              className="flex-1 h-10 bg-pink-500 hover:bg-pink-600 border-0 rounded-lg"
            >
              確認
            </Button>
            <Button
              onClick={handleAccountCancel}
              disabled={isPending}
              className="flex-1 h-10 bg-pink-500 hover:bg-pink-600 text-white border-0 rounded-lg"
            >
              キャンセル
            </Button>
          </div>
        </Form>
      </div>

      {/* Logout Button - Bottom Right */}
      <div className="flex justify-end">
        <Button
          danger
          onClick={handleLogout}
          className="h-10 px-8 rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white border-0"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}