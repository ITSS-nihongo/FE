'use client'

import { useState, useEffect } from 'react'
import { Button, Modal, Table, message, Tag, Card, Descriptions, Input, Checkbox, Image, Pagination } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface RequestDetailModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPlace: any
  selectedRequests: any[]
  pendingMedia: any[]
  onApproveRequest: (request: any, selectedFields: string[]) => Promise<void>
  onRejectRequest: (request: any, reason: string) => Promise<void>
  onApproveMedia: (media: any) => Promise<void>
  onRejectMedia: (media: any) => Promise<void>
}

export default function RequestDetailModal({
  isOpen,
  onClose,
  selectedPlace,
  selectedRequests,
  pendingMedia,
  onApproveRequest,
  onRejectRequest,
  onApproveMedia,
  onRejectMedia
}: RequestDetailModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({})
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3 // Số request hiển thị mỗi trang

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
    }
  }, [isOpen])

  // Initialize selected fields when modal opens or requests change
  useEffect(() => {
    if (isOpen && selectedRequests.length > 0) {
      const initialSelected: Record<string, string[]> = {}
      selectedRequests.forEach((req: any) => {
        const fields: string[] = []
        if (req.description !== null) fields.push('description')
        if (req.area !== null) fields.push('area')
        if (req.openingTime !== null) fields.push('openingTime')
        if (req.closingTime !== null) fields.push('closingTime')
        if (req.minAge !== null) fields.push('minAge')
        if (req.maxAge !== null) fields.push('maxAge')
        if (req.price !== null) fields.push('price')
        initialSelected[req.id] = fields
      })
      setSelectedFields(initialSelected)
    }
  }, [isOpen, selectedRequests])

  const toggleFieldSelection = (requestId: string, fieldName: string) => {
    setSelectedFields(prev => {
      const current = prev[requestId] || []
      const newFields = current.includes(fieldName)
        ? current.filter(f => f !== fieldName)
        : [...current, fieldName]
      return { ...prev, [requestId]: newFields }
    })
  }

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      description: '説明',
      area: '面積',
      openingTime: '開店時間',
      closingTime: '閉店時間',
      minAge: '最小年齢',
      maxAge: '最大年齢',
      price: '価格'
    }
    return labels[fieldName] || fieldName
  }

  const getFieldValue = (fieldName: string, value: any) => {
    if (value === null || value === undefined) return '変更なし'
    
    switch (fieldName) {
      case 'area':
        return `${value}m²`
      case 'price':
        return value === 0 ? '無料' : `¥${value.toLocaleString()}`
      case 'minAge':
      case 'maxAge':
        return `${value}歳`
      default:
        return value
    }
  }

  const handleApprove = async (request: any) => {
    const selected = selectedFields[request.id] || []
    
    if (selected.length === 0) {
      message.warning('承認するフィールドを選択してください')
      return
    }

    await onApproveRequest(request, selected)
  }

  const handleReject = (request: any) => {
    setRejectingRequest(request)
    setRejectReason('')
    setRejectModalVisible(true)
  }

  const confirmReject = async () => {
    if (rejectingRequest) {
      await onRejectRequest(rejectingRequest, rejectReason)
      setRejectModalVisible(false)
      setRejectingRequest(null)
      setRejectReason('')
    }
  }

  return (
    <>
    <Modal
      title={<div className="text-lg font-bold">更新リクエスト - {selectedPlace?.name}</div>}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
    >
      <div className="space-y-6">
        {/* Field Update Requests */}
        {selectedRequests.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-600">
                フィールド更新リクエスト ({selectedRequests.length}件)
              </h3>
            </div>
            
            {selectedRequests
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((request: any) => (
              <Card key={request.id} className="border-2 mb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{request.user.name}</div>
                      <div className="text-xs text-gray-500">{dayjs(request.createdAt).format('YYYY/MM/DD HH:mm')}</div>
                    </div>
                    <Tag color={request.status === 'PENDING' ? 'orange' : request.status === 'APPROVED' ? 'green' : 'red'}>
                      {request.status === 'PENDING' ? '承認待ち' : request.status === 'APPROVED' ? '承認済み' : '拒否'}
                    </Tag>
                  </div>

                  {/* Comparison Table */}
                  {request.status === 'PENDING' && (
                    <Table
                      dataSource={['description', 'area', 'openingTime', 'closingTime', 'minAge', 'maxAge', 'price']
                        .filter(field => request[field] !== null)
                        .map(field => ({
                          key: field,
                          field,
                          currentValue: selectedPlace?.[field],
                          newValue: request[field],
                          isSelected: selectedFields[request.id]?.includes(field)
                        }))}
                      columns={[
                        {
                          title: '選択',
                          key: 'checkbox',
                          width: 60,
                          align: 'center' as const,
                          render: (_: any, record: any) => (
                            <Checkbox
                              checked={record.isSelected}
                              onChange={() => toggleFieldSelection(request.id, record.field)}
                            />
                          )
                        },
                        {
                          title: 'フィールド',
                          key: 'field',
                          width: 120,
                          render: (_: any, record: any) => (
                            <span className="font-medium">{getFieldLabel(record.field)}</span>
                          )
                        },
                        {
                          title: '現在の値',
                          key: 'currentValue',
                          render: (_: any, record: any) => (
                            <span className="text-gray-600">
                              {getFieldValue(record.field, record.currentValue)}
                            </span>
                          )
                        },
                        {
                          title: '新しい値',
                          key: 'newValue',
                          render: (_: any, record: any) => (
                            <span className="font-medium text-green-600">
                              {getFieldValue(record.field, record.newValue)}
                            </span>
                          )
                        }
                      ]}
                      rowClassName={(record) => record.isSelected ? 'bg-green-50' : ''}
                      pagination={false}
                      size="small"
                      bordered
                    />
                  )}

                  {/* Already processed requests - show with Descriptions */}
                  {request.status !== 'PENDING' && (
                    <Descriptions bordered column={2} size="small">
                      {request.description !== null && (
                        <Descriptions.Item label="説明" span={2}>{request.description}</Descriptions.Item>
                      )}
                      {request.area !== null && (
                        <Descriptions.Item label="面積">{request.area}m²</Descriptions.Item>
                      )}
                      {request.price !== null && (
                        <Descriptions.Item label="価格">
                          {request.price === 0 ? '無料' : `¥${request.price.toLocaleString()}`}
                        </Descriptions.Item>
                      )}
                      {request.openingTime !== null && (
                        <Descriptions.Item label="開店時間">{request.openingTime}</Descriptions.Item>
                      )}
                      {request.closingTime !== null && (
                        <Descriptions.Item label="閉店時間">{request.closingTime}</Descriptions.Item>
                      )}
                      {request.minAge !== null && (
                        <Descriptions.Item label="最小年齢">{request.minAge}歳</Descriptions.Item>
                      )}
                      {request.maxAge !== null && (
                        <Descriptions.Item label="最大年齢">{request.maxAge}歳</Descriptions.Item>
                      )}
                      {request.rejectionReason && (
                        <Descriptions.Item label="拒否理由" span={2}>
                          <span className="text-red-500">{request.rejectionReason}</span>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  )}

                  {request.status === 'PENDING' && (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <div className="mr-auto text-sm text-gray-500">
                        {selectedFields[request.id]?.length || 0}件のフィールドを選択中
                      </div>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleApprove(request)}
                        className="bg-green-500 hover:!bg-green-600"
                        disabled={!selectedFields[request.id]?.length}
                      >
                        選択したフィールドを承認
                      </Button>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleReject(request)}
                      >
                        拒否
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
            {/* Pagination */}
            {selectedRequests.length > pageSize && (
              <div className="flex justify-center mt-4">
                <Pagination
                  current={currentPage}
                  total={selectedRequests.length}
                  pageSize={pageSize}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}件`}
                />
              </div>
            )}
          </div>
        )}

        {/* Pending Media Approval */}
        {pendingMedia.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-purple-600">メディア承認待ち</h3>
            <div className="grid grid-cols-2 gap-4">
              {pendingMedia.map((media: any) => (
                <Card key={media.id} className="border-2">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">
                      アップロード日: {dayjs(media.createdAt).format('YYYY/MM/DD HH:mm')}
                    </div>
                    
                    {media.mediaType === 'IMAGE' ? (
                      <Image
                        src={media.fileUrl}
                        alt={media.altText || '画像'}
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : (
                      <video
                        src={media.fileUrl}
                        controls
                        className="w-full h-48 object-cover rounded"
                      />
                    )}
                    
                    {media.title && (
                      <div className="font-medium">{media.title}</div>
                    )}
                    {media.altText && (
                      <div className="text-sm text-gray-600">{media.altText}</div>
                    )}
                    
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => onApproveMedia(media)}
                        className="bg-green-500 hover:!bg-green-600"
                      >
                        承認
                      </Button>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => onRejectMedia(media)}
                      >
                        拒否
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selectedRequests.length === 0 && pendingMedia.length === 0 && (
          <div className="text-center py-8 text-gray-500">承認待ちのリクエストがありません</div>
        )}
      </div>
    </Modal>

    {/* Reject Reason Modal */}
    <Modal
      title="拒否理由を入力してください"
      open={rejectModalVisible}
      onCancel={() => {
        setRejectModalVisible(false)
        setRejectingRequest(null)
        setRejectReason('')
      }}
      onOk={confirmReject}
      okText="拒否"
      cancelText="キャンセル"
      okButtonProps={{ danger: true }}
    >
      <Input.TextArea
        placeholder="拒否理由（オプション）"
        rows={4}
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
      />
    </Modal>
    </>
  )
}
