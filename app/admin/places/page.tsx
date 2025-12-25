'use client'

import { useState, useMemo } from 'react'
import { Button, Modal, Table, message, Tag, Card, Descriptions, Input, Badge, Checkbox, Image } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { useFindManyPlace, useFindManyPlaceUpdateRequest, useUpdatePlaceUpdateRequest, useUpdatePlace, useFindManyMedia, useUpdateMedia, useDeleteMedia } from '@/lib/api/generated'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

export default function AdminPlacesPage() {
  const queryClient = useQueryClient()
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedRequests, setSelectedRequests] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({}) // { requestId: [fieldNames] }
  const [pendingMedia, setPendingMedia] = useState<any[]>([])

  // Fetch all places
  const { data: places, isLoading: placesLoading } = useFindManyPlace({
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Fetch all pending update requests
  const { data: allRequests } = useFindManyPlaceUpdateRequest({
    include: {
      place: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Fetch all media (including pending approval)
  const { data: allMedia } = useFindManyMedia({
    where: {
      isActive: true
    },
    include: {
      place: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Update media mutation
  const updateMediaMutation = useUpdateMedia({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Media', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`処理に失敗しました: ${error.message}`)
    }
  })

  // Delete media mutation
  const deleteMediaMutation = useDeleteMedia({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Media', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`削除に失敗しました: ${error.message}`)
    }
  })

  // Filter places based on search
  const filteredPlaces = useMemo(() => {
    if (!places) return []
    if (!searchText) return places
    
    const lowerSearch = searchText.toLowerCase()
    return places.filter(place => 
      place.name?.toLowerCase().includes(lowerSearch) ||
      place.address?.toLowerCase().includes(lowerSearch)
    )
  }, [places, searchText])

  // Count pending requests per place (including media)
  const requestCountByPlace = useMemo(() => {
    const counts: Record<string, number> = {}
    
    // Count field update requests
    allRequests?.forEach((req: any) => {
      if (req.status === 'PENDING') {
        counts[req.placeId] = (counts[req.placeId] || 0) + 1
      }
    })
    
    // Count pending media
    allMedia?.forEach((media: any) => {
      if (media.isPendingApproval === true) {
        counts[media.placeId] = (counts[media.placeId] || 0) + 1
      }
    })
    
    return counts
  }, [allRequests, allMedia])

  // Update place mutation
  const updatePlaceMutation = useUpdatePlace({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Place', 'findMany'] })
    }
  })

  // Update request mutation
  const updateRequestMutation = useUpdatePlaceUpdateRequest({
    onSuccess: () => {
      message.success('リクエストを処理しました')
      queryClient.invalidateQueries({ queryKey: ['PlaceUpdateRequest', 'findMany'] })
      setIsRequestModalOpen(false)
      setSelectedPlace(null)
      setSelectedRequests([])
      setRejectionReason('')
    },
    onError: (error: any) => {
      message.error(`処理に失敗しました: ${error.message}`)
    }
  })

  const handleViewRequests = (place: any) => {
    const placeRequests = allRequests?.filter((req: any) => req.placeId === place.id) || []
    const placeMedia = allMedia?.filter((media: any) => media.placeId === place.id && media.isPendingApproval === true) || []
    setSelectedPlace(place)
    setSelectedRequests(placeRequests)
    setPendingMedia(placeMedia)
    
    // Initialize selected fields for each request (all fields selected by default)
    const initialSelected: Record<string, string[]> = {}
    placeRequests.forEach((req: any) => {
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
    
    setIsRequestModalOpen(true)
  }

  const handleApproveRequest = async (request: any) => {
    const selected = selectedFields[request.id] || []
    
    if (selected.length === 0) {
      message.warning('承認するフィールドを選択してください')
      return
    }

    try {
      // Update place with only selected fields
      const updateData: any = {
        updatedAt: new Date()
      }
      
      if (selected.includes('description') && request.description !== null) {
        updateData.description = request.description
      }
      if (selected.includes('area') && request.area !== null) {
        updateData.area = request.area
      }
      if (selected.includes('openingTime') && request.openingTime !== null) {
        updateData.openingTime = request.openingTime
      }
      if (selected.includes('closingTime') && request.closingTime !== null) {
        updateData.closingTime = request.closingTime
      }
      if (selected.includes('minAge') && request.minAge !== null) {
        updateData.minAge = request.minAge
      }
      if (selected.includes('maxAge') && request.maxAge !== null) {
        updateData.maxAge = request.maxAge
      }
      if (selected.includes('price') && request.price !== null) {
        updateData.price = request.price
      }

      await updatePlaceMutation.mutateAsync({
        where: { id: request.placeId },
        data: updateData
      })

      // Mark request as approved
      await updateRequestMutation.mutateAsync({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date()
        }
      })
      
      message.success(`${selected.length}件のフィールドを承認しました`)
    } catch (error) {
      console.error('Error approving request:', error)
      message.error('承認に失敗しました')
    }
  }

  const handleRejectRequest = async (request: any) => {
    if (!rejectionReason.trim()) {
      message.warning('拒否理由を入力してください')
      return
    }

    try {
      await updateRequestMutation.mutateAsync({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason,
          reviewedAt: new Date()
        }
      })
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting request:', error)
      message.error('拒否に失敗しました')
    }
  }

  const handleApproveMedia = async (media: any) => {
    try {
      await updateMediaMutation.mutateAsync({
        where: { id: media.id },
        data: {
          isPendingApproval: false
        }
      })
      
      // Remove from pending media list
      setPendingMedia(prev => prev.filter(m => m.id !== media.id))
      message.success('メディアを承認しました')
    } catch (error) {
      console.error('Error approving media:', error)
      message.error('メディアの承認に失敗しました')
    }
  }

  const handleRejectMedia = async (media: any) => {
    try {
      // Xóa media record khỏi database
      await deleteMediaMutation.mutateAsync({
        where: { id: media.id }
      })
      
      // Remove from pending media list
      setPendingMedia(prev => prev.filter(m => m.id !== media.id))
      message.success('メディアを削除しました')
    } catch (error) {
      console.error('Error deleting media:', error)
      message.error('メディアの削除に失敗しました')
    }
  }

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

  const columns = [
    {
      title: '地点名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'タイプ',
      dataIndex: 'placeType',
      key: 'placeType',
      render: (type: string) => (
        <Tag color={type === 'INDOOR' ? 'blue' : 'green'}>
          {type === 'INDOOR' ? '屋内' : '屋外'}
        </Tag>
      ),
    },
    {
      title: '年齢範囲',
      key: 'ageRange',
      render: (_: any, record: any) => `${record.minAge || 0}歳 - ${record.maxAge || 18}歳`,
    },
    {
      title: 'レビュー',
      dataIndex: 'totalReviews',
      key: 'totalReviews',
      align: 'center' as const,
    },
    {
      title: '更新リクエスト',
      key: 'requests',
      align: 'center' as const,
      render: (_: any, record: any) => {
        const count = requestCountByPlace[record.id] || 0
        return (
          <Badge count={count} showZero={false}>
            <Tag color={count > 0 ? 'orange' : 'default'}>
              {count}件
            </Tag>
          </Badge>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewRequests(record)}
          disabled={!requestCountByPlace[record.id]}
        >
          リクエスト確認
        </Button>
      ),
    },
  ]

  const requestColumns = [
    {
      title: '送信者',
      key: 'user',
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium">{record.user.name}</div>
          <div className="text-xs text-gray-500">{record.user.email}</div>
        </div>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          PENDING: 'orange',
          APPROVED: 'green',
          REJECTED: 'red'
        }
        const labels = {
          PENDING: '承認待ち',
          APPROVED: '承認済み',
          REJECTED: '拒否'
        }
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>
      },
    },
    {
      title: '送信日',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        record.status === 'PENDING' ? (
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleApproveRequest(record)}
              className="bg-green-500 hover:!bg-green-600"
            >
              承認
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '拒否理由を入力してください',
                  content: (
                    <Input.TextArea
                      placeholder="拒否理由"
                      rows={4}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  ),
                  onOk: () => handleRejectRequest(record),
                  okText: '拒否',
                  cancelText: 'キャンセル',
                  okButtonProps: { danger: true }
                })
              }}
            >
              拒否
            </Button>
          </div>
        ) : (
          <span className="text-gray-400">処理済み</span>
        )
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-white px-8 py-6">
      <div className="w-full mx-auto">
        <h1 className="text-2xl font-bold text-pink-500 mb-8">施設管理</h1>

        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <Input
              size="large"
              placeholder="地点名または住所で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-gray-400" />}
              className="rounded-full border-2 border-pink-500 hover:border-pink-600 focus:border-pink-600"
            />
          </div>
        </div>

        {/* Places Table */}
        <Table
          columns={columns}
          dataSource={filteredPlaces}
          rowKey="id"
          loading={placesLoading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `合計 ${total} 件`,
          }}
        />
      </div>

      {/* Requests Modal */}
      <Modal
        title={<div className="text-lg font-bold">更新リクエスト - {selectedPlace?.name}</div>}
        open={isRequestModalOpen}
        onCancel={() => {
          setIsRequestModalOpen(false)
          setSelectedPlace(null)
          setSelectedRequests([])
          setPendingMedia([])
        }}
        footer={null}
        width={1200}
        centered
      >
        <div className="space-y-6">
          {/* Field Update Requests */}
          {selectedRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-600">フィールド更新リクエスト</h3>
              {selectedRequests.map((request: any) => (
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
                          onClick={() => handleApproveRequest(request)}
                          className="bg-green-500 hover:!bg-green-600"
                          disabled={!selectedFields[request.id]?.length}
                        >
                          選択したフィールドを承認
                        </Button>
                        <Button
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => {
                            Modal.confirm({
                              title: '拒否理由を入力してください',
                              content: (
                                <Input.TextArea
                                  placeholder="拒否理由"
                                  rows={4}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                              ),
                              onOk: () => handleRejectRequest(request),
                              okText: '拒否',
                              cancelText: 'キャンセル',
                              okButtonProps: { danger: true }
                            })
                          }}
                        >
                          拒否
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
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
                          onClick={() => handleApproveMedia(media)}
                          className="bg-green-500 hover:!bg-green-600"
                        >
                          承認
                        </Button>
                        <Button
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => handleRejectMedia(media)}
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
    </div>
  )
}
