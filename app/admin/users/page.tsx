'use client'

import { useState, useMemo } from 'react'
import { Button, Modal, Form, Input, Select, message, Table } from 'antd'
import { SearchOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Edit, Trash2 } from 'lucide-react'
import { useFindManyUser, useUpdateUser } from '@/lib/api/generated'
import { useQueryClient } from '@tanstack/react-query'

const { Option } = Select

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [currentEditIndex, setCurrentEditIndex] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  // Fetch all users
  const { data: users, isLoading } = useFindManyUser({
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!searchText) return users
    
    const lowerSearch = searchText.toLowerCase()
    return users.filter(user => 
      user.name?.toLowerCase().includes(lowerSearch) ||
      user.email?.toLowerCase().includes(lowerSearch)
    )
  }, [users, searchText])

  // Update user mutation
  const updateUserMutation = useUpdateUser({
    onSuccess: () => {
      message.success('変更を保存しました')
      setIsModalOpen(false)
      setEditingUser(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['User', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`更新に失敗しました: ${error.message}`)
    }
  })

  // Delete user mutation (soft delete) - separate instance
  const deleteUserMutation = useUpdateUser({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['User', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`削除に失敗しました: ${error.message}`)
    }
  })

  const handleEdit = () => {
    if (selectedUserIds.length === 0) {
      message.warning('編集するユーザーを選択してください')
      return
    }
    
    setCurrentEditIndex(0)
    const user = users?.find(u => u.id === selectedUserIds[0])
    if (user) {
      setEditingUser(user)
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        numberOfKids: user.numberOfKids,
      })
      setIsModalOpen(true)
    }
  }

  const handleNavigateUser = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentEditIndex - 1 : currentEditIndex + 1
    if (newIndex < 0 || newIndex >= selectedUserIds.length) return
    
    setCurrentEditIndex(newIndex)
    const user = users?.find(u => u.id === selectedUserIds[newIndex])
    if (user) {
      setEditingUser(user)
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        numberOfKids: user.numberOfKids,
      })
    }
  }

  const handleDelete = () => {
    if (selectedUserIds.length === 0) {
      message.warning('削除するユーザーを選択してください')
      return
    }
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      // Delete all selected users (soft delete)
      await Promise.all(
        selectedUserIds.map(userId =>
          deleteUserMutation.mutateAsync({
            where: { id: userId },
            data: {
              isActive: false,
              updatedAt: new Date()
            }
          })
        )
      )
      message.success(`${selectedUserIds.length}人のユーザーを削除しました`)
      setSelectedUserIds([])
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Delete error:', error)
      message.error('削除に失敗しました')
    }
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingUser) {
        updateUserMutation.mutate({
          where: { id: editingUser.id },
          data: {
            name: values.name,
            email: values.email,
            phoneNumber: values.phoneNumber || undefined,
            address: values.address || undefined,
            numberOfKids: values.numberOfKids,
            updatedAt: new Date()
          }
        })
      }
    })
  }

  const columns = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'メールアドレス',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '電話番号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (text: string) => text || '-',
    },
    {
      title: '子供の数',
      dataIndex: 'numberOfKids',
      key: 'numberOfKids',
      align: 'center' as const,
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => text || '-',
    },
  ]

  const rowSelection = {
    selectedRowKeys: selectedUserIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedUserIds(selectedRowKeys as string[])
    },
  }

  return (
    <div className="min-h-screen bg-white px-8 py-6">
      <div className="w-full mx-auto">
        {/* Title */}
        <h1 className="text-2xl font-bold text-pink-500 mb-8">ユーザー管理</h1>

        {/* Search and Action Buttons */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <Input
              size="large"
              placeholder=""
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-gray-400" />}
              className="rounded-full border-2 border-pink-500 hover:border-pink-600 focus:border-pink-600"
            />
          </div>

          {/* Action Buttons */}
          <Button
            onClick={handleEdit}
            size="large"
            type='primary'
            icon={<Edit size={18} />}
            className="px-8 h-12 text-white border-none rounded-full font-medium"
          >
            編集
          </Button>
          <Button
            onClick={handleDelete}
            size="large"
            type="primary"
            danger
            icon={<Trash2 size={18} />}
            className="px-8 h-12 rounded-full font-medium"
          >
            削除
          </Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
          }}
          locale={{
            emptyText: 'ユーザーが見つかりません'
          }}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false)
          setEditingUser(null)
          setCurrentEditIndex(0)
          form.resetFields()
        }}
        footer={null}
        width={900}
        centered
        closable={false}
      >
        <div className="p-8">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">ユーザー情報</h2>
            {selectedUserIds.length > 1 && (
              <div className="flex items-center gap-3">
                <Button
                  
                  onClick={() => handleNavigateUser('prev')}
                  disabled={currentEditIndex === 0}
                  className="px-4 py-2 h-10 bg-purple-600 text-white border-none rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <LeftOutlined />
                </Button>
                <span className="text-sm text-gray-600">
                  {currentEditIndex + 1} / {selectedUserIds.length}
                </span>
                <Button
                  onClick={() => handleNavigateUser('next')}
                  disabled={currentEditIndex === selectedUserIds.length - 1}
                  className="px-4 py-2 h-10 bg-purple-600 text-white border-none rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <RightOutlined />
                </Button>
              </div>
            )}
          </div>
          
          <Form
            form={form}
            layout="vertical"
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <Form.Item
                label="名前"
                name="name"
                rules={[{ required: true, message: '名前を入力してください' }]}
              >
                <Input 
                  className="border-2 border-purple-500 rounded-lg px-4 py-2 focus:border-purple-600 focus:outline-none"
                  placeholder=""
                />
              </Form.Item>

              <Form.Item
                label="メールアドレス"
                name="email"
                rules={[
                  { required: true, message: 'メールを入力してください' },
                  { type: 'email', message: '有効なメールアドレスを入力してください' }
                ]}
              >
                <Input 
                  className="border-2 border-purple-500 rounded-lg px-4 py-2 focus:border-purple-600 focus:outline-none"
                  placeholder=""
                />
              </Form.Item>

              <Form.Item
                label="子供の数"
                name="numberOfKids"
              >
                <Select 
                  className="custom-select-purple"
                  suffixIcon={<span className="text-purple-500">▼</span>}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <Option key={num} value={num}>{num}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              label="電話番号"
              name="phoneNumber"
            >
              <Input 
                className="border-2 border-purple-500 rounded-lg px-4 py-2 focus:border-purple-600 focus:outline-none"
                placeholder=""
              />
            </Form.Item>

            <Form.Item
              label="住所"
              name="address"
            >
              <Input 
                className="border-2 border-purple-500 rounded-lg px-4 py-2 focus:border-purple-600 focus:outline-none w-full"
                placeholder=""
              />
            </Form.Item>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={handleSubmit}
                loading={updateUserMutation.isPending}
                type="primary"
                className="flex-1 h-12 font-medium text-base"
              >
                変更を保存
              </Button>
              <Button
                type='default'
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingUser(null)
                  setCurrentEditIndex(0)
                  form.resetFields()
                }}
                className="flex-1 h-12 bg-purple-600 text-white border-none rounded-full hover:bg-purple-700 font-medium text-base"
              >
                キャンセル
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="削除確認"
        open={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onOk={confirmDelete}
        okText="削除"
        cancelText="キャンセル"
        okButtonProps={{ danger: true, loading: deleteUserMutation.isPending }}
      >
        <p>選択した{selectedUserIds.length}人のユーザーを削除してもよろしいですか？</p>
        <p className="text-gray-500 text-sm mt-2">※この操作は元に戻せません</p>
      </Modal>

      <style jsx global>{`
        .custom-select-purple .ant-select-selector {
          border: 2px solid rgb(147 51 234) !important;
          border-radius: 0.5rem !important;
          padding: 0.375rem 0.75rem !important;
          height: auto !important;
        }
        .custom-select-purple .ant-select-selector:focus,
        .custom-select-purple .ant-select-selector:hover {
          border-color: rgb(126 34 206) !important;
        }
        .custom-select-purple .ant-select-arrow {
          color: rgb(147 51 234) !important;
        }
        
        .custom-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background-color: rgb(236 72 153) !important;
          border-color: rgb(236 72 153) !important;
        }
        .custom-checkbox .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .custom-checkbox .ant-checkbox:hover .ant-checkbox-inner {
          border-color: rgb(236 72 153) !important;
        }
        
        .ant-btn-dangerous {
          background-color: rgb(239 68 68) !important;
          color: white !important;
        }
        .ant-btn-dangerous:hover {
          background-color: rgb(220 38 38) !important;
          color: white !important;
        }
      `}</style>
    </div>
  )
}
