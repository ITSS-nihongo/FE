'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button, Table, message, Tag, Badge, Input } from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { useFindManyPlace, useFindManyPlaceUpdateRequest, useUpdatePlaceUpdateRequest, useUpdatePlace, useFindManyMedia, useUpdateMedia, useDeleteMedia } from '@/lib/api/generated'
import { useQueryClient } from '@tanstack/react-query'
import { getPresignedUrl } from '@/lib/utils/presigned-url'
import RequestDetailModal from '@/components/features/places/request-detail-modal'

export default function AdminPlacesPage() {
  const queryClient = useQueryClient()
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedRequests, setSelectedRequests] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [pendingMedia, setPendingMedia] = useState<any[]>([])
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})

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

  // Fetch all media using ZenStack (includes pending approval)
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

  // Transform media file paths to presigned URLs
  useEffect(() => {
    if (allMedia) {
      const transformUrls = async () => {
        const urls: Record<string, string> = {}
        for (const media of allMedia) {
          if (media.fileUrl) {
            urls[media.id] = await getPresignedUrl(media.fileUrl)
          }
        }
        setMediaUrls(urls)
      }
      transformUrls()
    }
  }, [allMedia])

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
    },
    onError: (error: any) => {
      message.error(`処理に失敗しました: ${error.message}`)
    }
  })

  const handleViewRequests = (place: any) => {
    const placeRequests = allRequests?.filter((req: any) => req.placeId === place.id) || []
    const placeMedia = allMedia?.filter((media: any) => media.placeId === place.id && media.isPendingApproval === true) || []

    // Transform media file paths to presigned URLs
    const mediaWithPresignedUrls = placeMedia.map((media: any) => ({
      ...media,
      fileUrl: mediaUrls[media.id] || media.fileUrl  // Use presigned URL if available
    }))

    setSelectedPlace(place)
    setSelectedRequests(placeRequests)
    setPendingMedia(mediaWithPresignedUrls)
    setIsRequestModalOpen(true)
  }

  const handleApproveRequest = async (request: any, selectedFields: string[]) => {
    if (selectedFields.length === 0) {
      message.warning('承認するフィールドを選択してください')
      return
    }

    try {
      // Update place with only selected fields
      const updateData: any = {
        updatedAt: new Date()
      }

      if (selectedFields.includes('description') && request.description !== null) {
        updateData.description = request.description
      }
      if (selectedFields.includes('area') && request.area !== null) {
        updateData.area = request.area
      }
      if (selectedFields.includes('openingTime') && request.openingTime !== null) {
        updateData.openingTime = request.openingTime
      }
      if (selectedFields.includes('closingTime') && request.closingTime !== null) {
        updateData.closingTime = request.closingTime
      }
      if (selectedFields.includes('minAge') && request.minAge !== null) {
        updateData.minAge = request.minAge
      }
      if (selectedFields.includes('maxAge') && request.maxAge !== null) {
        updateData.maxAge = request.maxAge
      }
      if (selectedFields.includes('price') && request.price !== null) {
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

      // Update local state to reflect the change
      setSelectedRequests(prev => prev.map(r =>
        r.id === request.id ? { ...r, status: 'APPROVED' } : r
      ))

      message.success(`${selectedFields.length}件のフィールドを承認しました`)
    } catch (error) {
      console.error('Error approving request:', error)
      message.error('承認に失敗しました')
    }
  }

  const handleRejectRequest = async (request: any, reason: string) => {
    try {
      await updateRequestMutation.mutateAsync({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason?.trim() || null,
          reviewedAt: new Date()
        }
      })

      // Update local state to reflect the change
      setSelectedRequests(prev => prev.map(r =>
        r.id === request.id ? { ...r, status: 'REJECTED', rejectionReason: reason?.trim() || null } : r
      ))

      message.success('リクエストを拒否しました')
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

  const handleCloseModal = () => {
    setIsRequestModalOpen(false)
    setSelectedPlace(null)
    setSelectedRequests([])
    setPendingMedia([])
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
      <RequestDetailModal
        isOpen={isRequestModalOpen}
        onClose={handleCloseModal}
        selectedPlace={selectedPlace}
        selectedRequests={selectedRequests}
        pendingMedia={pendingMedia}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onApproveMedia={handleApproveMedia}
        onRejectMedia={handleRejectMedia}
      />
    </div>
  )
}