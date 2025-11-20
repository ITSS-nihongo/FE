'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Spin, Avatar, Empty, Input, message, Modal, Rate } from 'antd'
import { UserOutlined, EnvironmentOutlined, ClockCircleOutlined, StarFilled, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiMapsPlaceDetailsOptions, postApiPlacesImportFromMapMutation, postApiReviewsMutation, getApiReviewsPlaceByPlaceIdOptions, getApiPlacesOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useState, useEffect } from 'react'

const { TextArea } = Input

export default function PlaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const placeId = params.id as string
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [placeType, setPlaceType] = useState<'INDOOR' | 'OUTDOOR'>('OUTDOOR')
  const [minAge, setMinAge] = useState(0)
  const [maxAge, setMaxAge] = useState(18)
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(null)

  // Fetch place details using generated hook
  const { data: placeData, isLoading, error } = useQuery({
    ...getApiMapsPlaceDetailsOptions({
      query: {
        place_id: placeId,
      },
    }),
    enabled: !!placeId,
  })

  // Check if place is saved in database
  const { data: savedPlacesData } = useQuery({
    ...getApiPlacesOptions({
      query: {
        limit: '1000', // Get all places to search
      },
    }),
  })

  // Find saved place by externalPlaceId
  useEffect(() => {
    if (savedPlacesData?.places) {
      const found = savedPlacesData.places.find(
        (p) => p.externalPlaceId === placeId
      )
      if (found) {
        setSavedPlaceId(found.id)
      }
    }
  }, [savedPlacesData, placeId])

  // Fetch reviews if place is saved
  const { data: reviewsData } = useQuery({
    ...getApiReviewsPlaceByPlaceIdOptions({
      path: {
        placeId: savedPlaceId!,
      },
    }),
    enabled: !!savedPlaceId,
  })

  // Save place mutation
  const savePlaceMutation = useMutation({
    ...postApiPlacesImportFromMapMutation(),
    onSuccess: (data) => {
      message.success('地点を保存しました')
      setSavedPlaceId(data.id)
      queryClient.invalidateQueries({ queryKey: ['getApiPlaces'] })
    },
    onError: (error: any) => {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('already exists')) {
        message.info('この地点は既に保存されています')
      } else {
        message.error('地点の保存に失敗しました')
      }
    },
  })

  // Submit review mutation
  const submitReviewMutation = useMutation({
    ...postApiReviewsMutation(),
    onSuccess: () => {
      message.success('レビューを投稿しました')
      setIsReviewModalOpen(false)
      setReviewComment('')
      setReviewRating(5)
      queryClient.invalidateQueries({ queryKey: ['getApiReviewsPlaceByPlaceId', { path: { placeId: savedPlaceId } }] })
    },
    onError: (error: any) => {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('already reviewed')) {
        message.error('この地点を既にレビューしています')
      } else {
        message.error('レビューの投稿に失敗しました')
      }
    },
  })

  const handleSavePlace = () => {
    Modal.confirm({
      title: '地点を保存',
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block mb-2">タイプ:</label>
            <select
              className="w-full p-2 border rounded"
              value={placeType}
              onChange={(e) => setPlaceType(e.target.value as 'INDOOR' | 'OUTDOOR')}
            >
              <option value="INDOOR">屋内</option>
              <option value="OUTDOOR">屋外</option>
            </select>
          </div>
          <div>
            <label className="block mb-2">最小年齢:</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              min={0}
              max={18}
            />
          </div>
          <div>
            <label className="block mb-2">最大年齢:</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              min={0}
              max={18}
            />
          </div>
        </div>
      ),
      onOk: () => {
        savePlaceMutation.mutate({
          body: {
            place_id: placeId,
            placeType,
            minAge,
            maxAge,
          },
        })
      },
    })
  }

  const handleSubmitReview = () => {
    if (!savedPlaceId) {
      message.warning('レビューするには、まず地点を保存してください')
      return
    }

    if (!reviewComment.trim()) {
      message.warning('コメントを入力してください')
      return
    }

    submitReviewMutation.mutate({
      body: {
        placeId: savedPlaceId,
        rating: reviewRating,
        comment: reviewComment,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (error || !placeData?.result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <Empty description="地点情報が見つかりませんでした" />
          <div className="text-center mt-4">
            <Button type="primary" onClick={() => router.back()}>
              戻る
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const place = placeData.result

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full px-6 py-6 space-y-6">
      {/* Main Image */}
      <div className="relative w-full h-96 bg-linear-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl overflow-hidden">
        {place.photos && place.photos.length > 0 && place.photos[0].url ? (
          <img
            src={place.photos[0].url}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback nếu ảnh lỗi
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-32 h-32 mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <p className="text-lg font-medium">写真準備中</p>
          </div>
        )}
      </div>

      {/* Place Name and Info Cards */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-center flex-1">{place.name}</h1>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="large"
            onClick={handleSavePlace}
            loading={savePlaceMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600"
          >
            地点を保存
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Rating Card - Only show if rating exists */}
          {place.rating && (
            <Card className="text-center">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarFilled
                      key={star}
                      className={star <= Math.round(place.rating!) ? 'text-yellow-400' : 'text-gray-300'}
                      style={{ fontSize: '20px' }}
                    />
                  ))}
                </div>
                <p className="text-lg font-bold m-0">
                  {place.rating.toFixed(1)}/5
                </p>
                {place.user_ratings_total && (
                  <p className="text-sm text-gray-500 m-0">({place.user_ratings_total} レビュー)</p>
                )}
              </div>
            </Card>
          )}

          {/* Location Card */}
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <EnvironmentOutlined className="text-2xl mb-2" />
              <p className="text-sm m-0 line-clamp-2">
                {place.vicinity || place.formatted_address.split(',')[0]}
              </p>
            </div>
          </Card>

          {/* Hours Card - Only show if hours exist */}
          {place.opening_hours?.open_now !== undefined && (
            <Card className="text-center">
              <div className="flex flex-col items-center">
                <ClockCircleOutlined className="text-2xl mb-2" />
                <p className="text-sm font-semibold m-0 mb-1">
                  {place.opening_hours.open_now ? '営業中' : '営業時間外'}
                </p>
                {place.opening_hours.weekday_text?.[0] && (
                  <p className="text-xs text-gray-600 m-0">
                    {place.opening_hours.weekday_text[0].split(': ')[1]}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sub Images Gallery */}
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {place.photos && place.photos.length > 1 && place.photos.slice(1, 4).map((photo, index) => (
          <div key={index} className="aspect-video bg-linear-to-br from-blue-50 to-purple-50 rounded-xl overflow-hidden">
            {photo.url ? (
              <img
                src={photo.url}
                alt={`${place.name} - Photo ${index + 2}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}
          </div>
        ))}
        {/* Fill remaining slots with placeholders */}
        {Array.from({ length: Math.max(0, 3 - (place.photos?.length || 0) + 1) }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="aspect-video bg-linear-to-br from-gray-100 to-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400"
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <p className="text-xs mt-2">画像なし</p>
          </div>
        ))}
      </div>

      {/* Additional Details */}
      <Card className="mt-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">詳細情報</h2>
        
        <div className="space-y-4">
          {/* Address */}
          <div className="flex items-start gap-3 pb-4 border-b">
            <EnvironmentOutlined className="text-xl text-blue-500 mt-1" />
            <div className="flex-1">
              <p className="font-semibold mb-1">住所</p>
              <p className="text-gray-700">{place.formatted_address}</p>
            </div>
          </div>

          {/* Phone */}
          {place.phone_number && (
            <div className="flex items-start gap-3 pb-4 border-b">
              <span className="text-xl text-blue-500 mt-1">📞</span>
              <div className="flex-1">
                <p className="font-semibold mb-1">電話番号</p>
                <a href={`tel:${place.phone_number}`} className="text-blue-600 hover:underline">
                  {place.phone_number}
                </a>
              </div>
            </div>
          )}

          {/* Website */}
          {place.website && (
            <div className="flex items-start gap-3 pb-4 border-b">
              <span className="text-xl text-blue-500 mt-1">🌐</span>
              <div className="flex-1">
                <p className="font-semibold mb-1">ウェブサイト</p>
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {place.website}
                </a>
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {place.opening_hours && place.opening_hours.weekday_text && (
            <div className="flex items-start gap-3 pb-4 border-b">
              <ClockCircleOutlined className="text-xl text-blue-500 mt-1" />
              <div className="flex-1">
                <p className="font-semibold mb-2">営業時間</p>
                <div className="space-y-1">
                  {place.opening_hours.weekday_text.map((text, index) => (
                    <p key={index} className="text-gray-700 text-sm">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Types */}
          {place.types && place.types.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xl text-blue-500 mt-1">🏷️</span>
              <div className="flex-1">
                <p className="font-semibold mb-2">カテゴリー</p>
                <div className="flex flex-wrap gap-2">
                  {place.types.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Reviews Section - Show from DB if place is saved */}
      {reviewsData && reviewsData.reviews && reviewsData.reviews.length > 0 && (
        <Card className="mt-8 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold m-0">レビュー</h2>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <StarFilled className="text-yellow-400" />
                <span className="text-xl font-bold">{reviewsData.averageRating.toFixed(1)}</span>
                <span className="text-gray-500">({reviewsData.total} レビュー)</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {reviewsData.reviews.map((review) => (
              <Card key={review.id} className="bg-gray-50">
                <div className="flex gap-4">
                  <Avatar size={48} icon={<UserOutlined />} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold m-0">{review.user?.name || '匿名'}</p>
                        <p className="text-xs text-gray-500 m-0">
                          {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarFilled
                            key={star}
                            className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}
                            style={{ fontSize: '16px' }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm m-0">{review.comment}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Write Review Button */}
      <div className="max-w-6xl mx-auto">
        <Button
          type="primary"
          size="large"
          block
          className="mt-6 bg-linear-to-r from-purple-500 to-pink-500 border-0 h-12 text-lg font-semibold"
          onClick={() => {
            if (!savedPlaceId) {
              message.warning('レビューするには、まず地点を保存してください')
              return
            }
            setIsReviewModalOpen(true)
          }}
          disabled={!savedPlaceId}
        >
          {savedPlaceId ? 'レビューを書く' : '地点を保存してレビュー'}
        </Button>
      </div>

      {/* Copyright Footer */}
      <div className="text-center text-xs text-gray-500 py-8 border-t mt-12">
        © 2025 TheWeekend. All rights reserved.
      </div>
      </div>

      {/* Review Modal */}
      <Modal
        title="レビューを書く"
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4 py-4">
          <div className="text-center">
            <Rate
              value={reviewRating}
              onChange={setReviewRating}
              style={{ fontSize: 40 }}
              className="mb-4"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-semibold">コメント</label>
            <TextArea
              rows={6}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="レビューを入力してください。"
              className="w-full"
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            className="bg-linear-to-r from-purple-500 to-pink-500 border-0 h-12 text-lg font-semibold mt-6"
            onClick={handleSubmitReview}
          >
            投稿する
          </Button>
        </div>
      </Modal>
    </div>
  )
}
