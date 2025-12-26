'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Spin, Avatar, Empty, Input, message, Modal, Rate, Upload, Image, Form, TimePicker, Select } from 'antd'
import {
  UserOutlined, EnvironmentOutlined, ClockCircleOutlined, StarFilled,
  SaveOutlined, CheckCircleFilled, PlusOutlined, DeleteOutlined, HeartFilled, HeartOutlined,
  PlayCircleOutlined, FileImageOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiMapsV2PlaceDetailsOptions, postApiPlacesImportFromMapMutation, getApiPlacesOptions, uploadFileMutation, patchApiPlacesByPlaceIdMutation, getApiMediaOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useCreateReview, useFindManyReview } from '@/lib/api/generated'
import { useUpdatePlace, useFindManyPlace } from '@/lib/api/generated'
import { useCreateFavorite, useDeleteFavorite, useFindManyFavorite } from '@/lib/api/generated/favorite'
import { useFindManyMedia, useCreateMedia, useDeleteMedia } from '@/lib/api/generated/media'
import { useCreatePlaceUpdateRequest } from '@/lib/api/generated'
import { useMe } from '@/lib/hooks/use-me'
import { useState, useEffect } from 'react'

const { TextArea } = Input

export default function PlaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const placeId = params.id as string
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isUpdatePlaceModalOpen, setIsUpdatePlaceModalOpen] = useState(false)
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(null)
  const [updateUploadedFiles, setUpdateUploadedFiles] = useState<{ id?: string, url: string, type: 'IMAGE' | 'VIDEO', fileName: string, previewUrl?: string }[]>([])
  const [showAllGallery, setShowAllGallery] = useState(false)

  // Get current user
  const { userId, isAuthenticated } = useMe()

  // Form instances
  const [reviewForm] = Form.useForm()
  const [saveForm] = Form.useForm()
  const [updatePlaceForm] = Form.useForm()

  // Fetch place details using Goong API v2
  const { data: placeData, isLoading, error } = useQuery({
    ...getApiMapsV2PlaceDetailsOptions({
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
  const savedPlace = savedPlacesData?.places?.find(
    (place: any) => place.externalPlaceId === placeId
  )

  useEffect(() => {
    if (savedPlace) {
      setSavedPlaceId(savedPlace.id)
    }
  }, [savedPlace])

  // Fetch saved place details from ZenStack (for updated info)
  const { data: savedPlaceDetails } = useFindManyPlace({
    where: {
      externalPlaceId: placeId,
      isActive: true
    },
    take: 1
  }, {
    enabled: !!placeId,
  })

  // Use the first saved place if available
  const savedPlaceData = savedPlaceDetails?.[0]

  // Check if current place is favorited by user
  const { data: userFavorites } = useFindManyFavorite({
    where: {
      userId: userId!,
      placeId: savedPlaceId!
    }
  }, {
    enabled: !!userId && !!savedPlaceId && isAuthenticated,
  })

  const isFavorited = userFavorites && userFavorites.length > 0

  // Add/remove favorite mutations
  const addFavoriteMutation = useCreateFavorite({
    onSuccess: () => {
      message.success('お気に入りに追加しました')
      queryClient.invalidateQueries({ queryKey: ['Favorite', 'findMany'] })
    },
    onError: () => {
      message.error('お気に入りの追加に失敗しました')
    }
  })

  const removeFavoriteMutation = useDeleteFavorite({
    onSuccess: () => {
      message.success('お気に入りから削除しました')
      queryClient.invalidateQueries({ queryKey: ['Favorite', 'findMany'] })
    },
    onError: () => {
      message.error('お気に入りの削除に失敗しました')
    }
  })

  // Fetch reviews using ZenStack
  const { data: reviewsData } = useFindManyReview({
    where: {
      placeId: savedPlaceId!,
    },
    include: {
      user: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  }, {
    enabled: !!savedPlaceId,
  })

  // Fetch media files for the place using OpenAPI (returns presigned URLs)
  const { data: mediaResponse } = useQuery({
    ...getApiMediaOptions({
      query: {
        placeId: savedPlaceId!,
        limit: '100'
      }
    }),
    enabled: !!savedPlaceId,
  })

  const mediaData = mediaResponse?.media

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

  // Update place with additional information using ZenStack
  const updatePlaceMutation = useUpdatePlace({
    onSuccess: () => {
      message.success('地点情報を更新しました')
      queryClient.invalidateQueries({ queryKey: ['getApiPlaces'] })
      queryClient.invalidateQueries({ queryKey: ['getApiMapsV2PlaceDetails'] })
      queryClient.invalidateQueries({ queryKey: ['Place', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`地点情報の更新に失敗しました: ${error.message}`)
    }
  })

  // Create update request mutation
  const createUpdateRequestMutation = useCreatePlaceUpdateRequest({
    onSuccess: () => {
      message.success('更新リクエストを送信しました。管理者の承認をお待ちください。')
      setIsUpdatePlaceModalOpen(false)
      resetUpdatePlaceForm()
      queryClient.invalidateQueries({ queryKey: ['PlaceUpdateRequest', 'findMany'] })
    },
    onError: (error: any) => {
      message.error(`更新リクエストの送信に失敗しました: ${error.message}`)
    }
  })

  // Submit review mutation using ZenStack
  const submitReviewMutation = useCreateReview({
    onSuccess: () => {
      message.success('レビューを投稿しました')
      setIsReviewModalOpen(false)
      resetReviewForm()
      queryClient.invalidateQueries({ queryKey: ['Review', 'findMany'] })
      queryClient.invalidateQueries({ queryKey: ['getApiPlaces'] })
    },
    onError: (error: any) => {
      console.error('Review creation error:', error)
      const errorMsg = error?.message || error?.error?.message || ''

      if (errorMsg.includes('already reviewed') || errorMsg.includes('Unique constraint')) {
        message.error('この地点を既にレビューしています')
      } else if (errorMsg.includes('Foreign key constraint') || errorMsg.includes('userId_fkey')) {
        message.error('ユーザー認証に問題があります。再度ログインしてください。')
      } else if (errorMsg.includes('placeId')) {
        message.error('地点情報に問題があります。ページを更新してください。')
      } else {
        message.error(`レビューの投稿に失敗しました: ${errorMsg}`)
      }
    },
  })

  // Media creation mutation
  const createMediaMutation = useCreateMedia({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Media', 'findMany'] })
    },
    onError: (error: any) => {
      console.error('Media creation error:', error)
      message.error('メディアファイルの保存に失敗しました')
    }
  })

  // Media deletion mutation
  const deleteMediaMutation = useDeleteMedia({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Media', 'findMany'] })
      message.success('メディアファイルを削除しました')
    },
    onError: (error: any) => {
      console.error('Media deletion error:', error)
      message.error('メディアファイルの削除に失敗しました')
    }
  })

  // Upload file mutation using presigned URL
  const uploadFileMut = useMutation({
    mutationFn: async (file: File) => {
      try {
        // Step 1: Get presigned URL from backend
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const presignedResponse = await fetch(`${backendUrl}/api/minio/presigned-upload-url?fileName=${encodeURIComponent(file.name)}&folder=places`)
        if (!presignedResponse.ok) {
          throw new Error('Failed to get presigned URL')
        }
        const presignedData = await presignedResponse.json()

        console.log('Presigned data:', presignedData)

        // Step 2: Upload file to MinIO using presigned URL
        const uploadResponse = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to MinIO')
        }

        console.log('Upload successful, public URL:', presignedData.publicUrl)

        // Step 3: Determine media type based on file type
        const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'

        // Step 4: Return file data
        return {
          fileUrl: presignedData.publicUrl,  // File path for DB
          fileName: presignedData.fileName,
          mediaType,
          fileSize: file.size,
          mimeType: file.type,
          previewUrl: presignedData.previewUrl  // Presigned URL for preview
        }
      } catch (error) {
        console.error('Upload process error:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      // This will be handled by specific upload handlers
      message.success(`${data.mediaType === 'VIDEO' ? '動画' : '画像'}をアップロードしました`)
    },
    onError: (error) => {
      message.error('ファイルのアップロードに失敗しました')
      console.error('Upload error:', error)
    },
  })

  // Reset review form
  const resetReviewForm = () => {
    reviewForm.resetFields()
  }

  // Reset update place form
  const resetUpdatePlaceForm = () => {
    updatePlaceForm.resetFields()
    setUpdateUploadedFiles([])
  }

  // Handle file upload for place update
  const handleUpdateFileUpload = (file: File) => {
    const uploadMutation = {
      mutateAsync: uploadFileMut.mutateAsync,
      mutate: (file: File) => {
        uploadFileMut.mutateAsync(file).then((data) => {
          setUpdateUploadedFiles(prev => [...prev, {
            url: data.fileUrl,  // This is the file path for DB storage
            type: data.mediaType as 'IMAGE' | 'VIDEO',
            fileName: data.fileName,
            previewUrl: data.previewUrl  // Add preview URL for immediate display
          }])
          message.success(`${data.mediaType === 'VIDEO' ? '動画' : '画像'}をアップロードしました`)
        }).catch((error) => {
          message.error('ファイルのアップロードに失敗しました')
          console.error('Upload error:', error)
        })
      }
    }
    uploadMutation.mutate(file)
  }

  // Remove uploaded file (for update)
  const handleRemoveUpdateFile = (fileUrl: string) => {
    setUpdateUploadedFiles(prev => prev.filter(item => item.url !== fileUrl))
  }

  // Delete media file from database
  const handleDeleteMedia = (mediaId: string) => {
    deleteMediaMutation.mutate({
      where: { id: mediaId }
    })
  }

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!userId || !savedPlaceId) {
      message.warning('お気に入りに追加するには、まずログインして地点を保存してください')
      return
    }

    if (isFavorited && userFavorites?.[0]) {
      removeFavoriteMutation.mutate({
        where: { id: userFavorites[0].id }
      })
    } else {
      addFavoriteMutation.mutate({
        data: {
          userId: userId,
          placeId: savedPlaceId
        }
      })
    }
  }

  const handleSavePlace = () => {
    const modal = Modal.confirm({
      title: '地点を保存',
      width: 500,
      content: (
        <div className="mt-4">
          <Form
            form={saveForm}
            layout="vertical"
            initialValues={{
              placeType: 'OUTDOOR',
              minAge: 0,
              maxAge: 18
            }}
          >
            <Form.Item
              label="タイプ"
              name="placeType"
              rules={[{ required: true, message: 'タイプを選択してください' }]}
            >
              <Select size="large">
                <Select.Option value="INDOOR">屋内</Select.Option>
                <Select.Option value="OUTDOOR">屋外</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="最小年齢"
              name="minAge"
              rules={[{ required: true, message: '最小年齢を入力してください' }]}
            >
              <Input
                type="number"
                min={0}
                max={18}
                size="large"
                suffix="歳"
              />
            </Form.Item>

            <Form.Item
              label="最大年齢"
              name="maxAge"
              rules={[{ required: true, message: '最大年齢を入力してください' }]}
            >
              <Input
                type="number"
                min={0}
                max={18}
                size="large"
                suffix="歳"
              />
            </Form.Item>
          </Form>
        </div>
      ),
      onOk: () => {
        return saveForm.validateFields().then((values) => {
          savePlaceMutation.mutate({
            body: {
              place_id: placeId,
              placeType: values.placeType,
              minAge: values.minAge,
              maxAge: values.maxAge,
            },
          })
        })
      },
      onCancel: () => {
        saveForm.resetFields()
      }
    })
  }

  const handleSubmitReview = () => {
    if (!savedPlaceId) {
      message.warning('レビューするには、まず地点を保存してください')
      return
    }

    // Validate user authentication
    if (!userId) {
      message.error('ログインが必要です。再度ログインしてください。')
      return
    }

    reviewForm.validateFields().then(async (values) => {
      try {
        console.log('Creating review with data:', {
          rating: values.rating,
          comment: values.comment,
          placeId: savedPlaceId,
          userId: userId
        })

        submitReviewMutation.mutate({
          data: {
            rating: values.rating,
            comment: values.comment,
            placeId: savedPlaceId,
            userId: userId,
          },
        })
      } catch (error) {
        console.error('Error in review submission:', error)
        message.error('レビューの投稿中にエラーが発生しました')
      }
    }).catch((errorInfo) => {
      console.log('Validation failed:', errorInfo)
    })
  }

  const handleUpdatePlace = () => {
    if (!savedPlaceId) {
      message.warning('地点を更新するには、まず地点を保存してください')
      return
    }

    if (!userId) {
      message.error('ログインが必要です。再度ログインしてください。')
      return
    }

    updatePlaceForm.validateFields().then(async (values) => {
      try {
        // Create update request instead of directly updating
        const requestData: any = {
          placeId: savedPlaceId,
          userId: userId,
        }

        // Only include fields that have values
        if (values.description) requestData.description = values.description
        if (values.area) requestData.area = parseFloat(values.area)
        if (values.openingTime) requestData.openingTime = values.openingTime.format('HH:mm')
        if (values.closingTime) requestData.closingTime = values.closingTime.format('HH:mm')
        if (values.minAge !== undefined && values.minAge !== '') requestData.minAge = parseInt(values.minAge)
        if (values.maxAge !== undefined && values.maxAge !== '') requestData.maxAge = parseInt(values.maxAge)
        if (values.price !== undefined && values.price !== '') requestData.price = parseFloat(values.price)

        await createUpdateRequestMutation.mutateAsync({
          data: requestData
        })

        // Save uploaded files as Media records with pending approval
        if (updateUploadedFiles.length > 0) {
          for (let i = 0; i < updateUploadedFiles.length; i++) {
            const file = updateUploadedFiles[i]
            await createMediaMutation.mutateAsync({
              data: {
                fileName: file.fileName,
                fileUrl: file.url,
                mediaType: file.type,
                placeId: savedPlaceId,
                uploadedBy: userId,
                sortOrder: (mediaData?.length || 0) + i,
                isActive: true,
                isPendingApproval: true // Requires admin approval
              }
            })
          }
          message.info('アップロードされたメディアは管理者の承認待ちです')
        }

        setIsUpdatePlaceModalOpen(false)
        resetUpdatePlaceForm()
        queryClient.invalidateQueries({ queryKey: ['Media', 'findMany'] })
      } catch (error) {
        console.error('Error in place update request:', error)
        message.error('更新リクエストの送信中にエラーが発生しました')
      }
    }).catch((errorInfo) => {
      console.log('Validation failed:', errorInfo)
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <Spin size="large" />
      </div>
    )
  }

  if (error || !placeData?.result) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <Empty description="地点情報が見つかりませんでした" />
          <div className="mt-6">
            <Button type="primary" onClick={() => router.back()}>
              戻る
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const place = placeData.result

  // Calculate average rating from reviews
  const averageRating = reviewsData && reviewsData.length > 0
    ? reviewsData.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewsData.length
    : place.rating || 0

  const totalReviews = reviewsData?.length || place.user_ratings_total || 0

  return (
    <div className="min-h-screen bg-white w-full pb-20">
      {/* Main Image - Full Width */}
      <div className="w-full max-h-[500px] overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* Prioritize user uploaded media first, then fallback to Goong API photos */}
        {mediaData && mediaData.length > 0 && mediaData[0].mediaType === 'IMAGE' ? (
          <img
            src={mediaData[0].fileUrl}
            alt={mediaData[0].altText || place.name}
            className="w-full h-auto max-h-[500px] object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : place.photos && place.photos.length > 0 && place.photos[0].url ? (
          <img
            src={place.photos[0].url}
            alt={place.name}
            className="w-full h-auto max-h-[500px] object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <p className="text-lg font-medium">写真準備中</p>
          </div>
        )}
      </div>

      <div className="w-full px-4 py-6 space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">{place.name}</h1>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rating */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center shadow-sm h-16">
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarFilled
                    key={star}
                    style={{ fontSize: '18px' }}
                    className={star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-200'}
                  />
                ))}
              </div>
              <span className="font-bold text-lg ml-2">{averageRating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm">({totalReviews})</span>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center shadow-sm h-16">
            <div className="flex items-center gap-2 truncate w-full justify-center px-2">
              <EnvironmentOutlined className="text-lg" />
              <span className="font-bold text-sm truncate">
                {place.vicinity || place.formatted_address?.split(',')[0] || place.name}
              </span>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center shadow-sm h-16">
            <div className="flex items-center gap-2">
              <ClockCircleOutlined className="text-lg" />
              <span className="font-bold text-sm">
                {savedPlaceData?.openingTime && savedPlaceData?.closingTime
                  ? `${savedPlaceData.openingTime}-${savedPlaceData.closingTime}`
                  : place.opening_hours?.open_now !== undefined
                    ? place.opening_hours.open_now ? '営業中' : '営業時間外'
                    : '営業時間不明'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {(place.phone_number || place.website || place.editorial_summary?.overview || savedPlaceData?.description || savedPlaceData?.area || savedPlaceData?.openingTime) && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">詳細情報</h3>
            <div className="space-y-3">
              {place.phone_number && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">📞</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">電話番号</p>
                    <a href={`tel:${place.phone_number}`} className="text-base font-medium text-green-600 hover:underline">
                      {place.phone_number}
                    </a>
                  </div>
                </div>
              )}

              {place.website && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">🌐</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ウェブサイト</p>
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-blue-600 hover:underline"
                    >
                      公式サイトを見る
                    </a>
                  </div>
                </div>
              )}

              {place.formatted_address && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <EnvironmentOutlined className="text-gray-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">住所</p>
                    <p className="text-base font-medium">{place.formatted_address}</p>
                  </div>
                </div>
              )}

              {/* Enhanced description - prioritize user-added info */}
              {(savedPlaceData?.description || place.editorial_summary?.overview) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                    <span className="text-purple-600 text-sm font-bold">ℹ️</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">説明</p>
                    <p className="text-base">{savedPlaceData?.description || place.editorial_summary?.overview}</p>
                    {savedPlaceData?.description && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full mt-1 inline-block">
                        ユーザー追加情報
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Area information from saved data */}
              {savedPlaceData?.area && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 text-sm font-bold">📏</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">面積</p>
                    <p className="text-base font-medium">{savedPlaceData.area} m²</p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full mt-1 inline-block">
                      ユーザー追加情報
                    </span>
                  </div>
                </div>
              )}

              {/* Enhanced opening hours - prioritize saved data */}
              {(savedPlaceData?.openingTime && savedPlaceData?.closingTime) ? (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                    <ClockCircleOutlined className="text-orange-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">営業時間</p>
                    <p className="text-base font-medium">
                      {savedPlaceData.openingTime} - {savedPlaceData.closingTime}
                    </p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full mt-1 inline-block">
                      ユーザー追加情報
                    </span>
                  </div>
                </div>
              ) : place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 1 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                    <ClockCircleOutlined className="text-orange-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">営業時間</p>
                    <div className="space-y-1">
                      {place.opening_hours.weekday_text.map((time, index) => (
                        <p key={index} className="text-sm">{time}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Age range information */}
              {(savedPlaceData?.minAge !== undefined && savedPlaceData?.maxAge !== undefined) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-pink-600 text-sm font-bold">👶</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">適用年齢</p>
                    <p className="text-base font-medium">{savedPlaceData.minAge}歳 - {savedPlaceData.maxAge}歳</p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full mt-1 inline-block">
                      ユーザー追加情報
                    </span>
                  </div>
                </div>
              )}

              {/* Price information */}
              {savedPlaceData?.price !== null && savedPlaceData?.price !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-bold">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">料金</p>
                    <p className="text-base font-medium">
                      {savedPlaceData.price === 0 ? '無料' : `${savedPlaceData.price.toLocaleString()}円`}
                    </p>
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full mt-1 inline-block">
                      ユーザー追加情報
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">ギャラリー</h3>
            {(mediaData && mediaData.length > 4) && (
              <button
                onClick={() => setShowAllGallery(!showAllGallery)}
                className="text-purple-500 text-sm font-medium hover:underline"
              >
                {showAllGallery ? '表示を減らす' : `すべて見る (${mediaData.length})`}
              </button>
            )}
          </div>

          {/* User uploaded media prioritized */}
          {mediaData && mediaData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mediaData.slice(0, showAllGallery ? mediaData.length : 4).map((media: any, index: number) => (
                <div key={media.id} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square">
                  {media.mediaType === 'IMAGE' ? (
                    <div className="w-full h-full">
                      <Image
                        src={media.fileUrl}
                        alt={media.altText || `Gallery ${index + 1}`}
                        width="100%"
                        height="100%"
                        className="object-cover"
                        preview={{
                          mask: <div className="text-white">プレビュー</div>
                        }}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        src={media.fileUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all">
                        <PlayCircleOutlined className="text-white text-3xl" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                      {media.mediaType === 'IMAGE' ? '画像' : '動画'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback to original Goong API photos */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
              <div className="h-full rounded-3xl overflow-hidden bg-gray-100">
                {place.photos && place.photos.length > 1 ? (
                  <img
                    src={place.photos[1].url}
                    alt="Gallery 1"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <FileImageOutlined className="text-4xl mb-2" />
                    <p>写真準備中</p>
                  </div>
                )}
              </div>
              <div className="grid grid-rows-2 gap-4 h-full">
                <div className="rounded-3xl overflow-hidden bg-gray-100">
                  {place.photos && place.photos.length > 2 ? (
                    <img
                      src={place.photos[2].url}
                      alt="Gallery 2"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      写真準備中
                    </div>
                  )}
                </div>
                <div className="rounded-3xl overflow-hidden bg-gray-100">
                  {place.photos && place.photos.length > 3 ? (
                    <img
                      src={place.photos[3].url}
                      alt="Gallery 3"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      写真準備中
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="pt-4">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold m-0">レビュー</h2>
            <button className="text-purple-500 text-sm font-medium hover:underline">
              すべてを見る
            </button>
          </div>

          <div className="space-y-4">
            {reviewsData?.map((review: any) => {
              return (
                <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex gap-3">
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      className="shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{review.user?.name || '匿名ユーザー'}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Rate disabled defaultValue={review.rating} className="text-sm text-yellow-400" />
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {(!reviewsData || reviewsData.length === 0) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-sm">レビューはまだありません。</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            {/* Show login prompt if not authenticated */}
            {!isAuthenticated && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                <p className="text-purple-700 text-sm mb-3">
                  レビューやお気に入り機能を利用するにはログインが必要です
                </p>
                <Button
                  size="large"
                  className="bg-purple-500 hover:bg-purple-400 border-0 h-12 rounded-full text-white font-bold text-base shadow-md"
                  onClick={() => router.push('/login')}
                >
                  ログインする
                </Button>
              </div>
            )}

            {/* Favorite Button - Only show when authenticated */}
            {isAuthenticated && savedPlaceId && (
              <Button
                size="large"
                block
                icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
                className={`h-12 rounded-full font-bold text-base shadow-md ${isFavorited
                  ? 'bg-red-500 hover:bg-red-400 border-0 text-white'
                  : 'bg-white hover:bg-red-50 border-red-300 text-red-500'
                  }`}
                onClick={handleToggleFavorite}
                loading={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
              >
                {isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
              </Button>
            )}

            {/* Update Place Button - Only show when authenticated */}
            {isAuthenticated && savedPlaceId && (
              <Button
                size="large"
                block
                className="bg-blue-500 hover:bg-blue-400 border-0 h-12 rounded-full text-white font-bold text-base shadow-md"
                onClick={() => setIsUpdatePlaceModalOpen(true)}
              >
                地点情報を更新
              </Button>
            )}

            {/* Write Review Button - Only show when authenticated */}
            {isAuthenticated && (
              <Button
                type="primary"
                size="large"
                block
                className="bg-[#C058D3] hover:bg-[#b04cc3] border-0 h-12 rounded-full text-white font-bold text-base shadow-md"
                onClick={() => {
                  if (!savedPlaceId) {
                    handleSavePlace()
                  } else {
                    setIsReviewModalOpen(true)
                  }
                }}
              >
                {savedPlaceId ? 'レビューを書く' : '保存してレビューを書く'}
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Review Modal */}
      <Modal
        title={<div className="text-center text-lg font-bold">レビューを書く</div>}
        open={isReviewModalOpen}
        onCancel={() => {
          setIsReviewModalOpen(false)
          resetReviewForm()
        }}
        footer={null}
        centered
        width={700}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={reviewForm}
          layout="vertical"
          initialValues={{
            rating: 5,
            comment: ''
          }}
          className="space-y-6 py-4"
        >
          {/* Rating Section */}
          <div className="text-center">
            <Form.Item name="rating">
              <Rate
                style={{ fontSize: 36 }}
                className="text-yellow-400"
              />
            </Form.Item>
          </div>

          {/* Comment Section */}
          <Form.Item
            name="comment"
            rules={[{ required: true, message: 'コメントを入力してください' }]}
          >
            <TextArea
              rows={4}
              placeholder="レビューを入力してください。"
              className="rounded-xl"
            />
          </Form.Item>

          {/* Submit Button */}
          <Form.Item className="mb-0">
            <Button
              type="primary"
              size="large"
              block
              className="bg-[#C058D3] hover:bg-[#b04cc3] border-0 h-12 rounded-full text-white font-bold"
              onClick={handleSubmitReview}
              loading={submitReviewMutation.isPending}
            >
              レビューを投稿
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Place Modal */}
      <Modal
        title={<div className="text-center text-lg font-bold">地点情報を更新</div>}
        open={isUpdatePlaceModalOpen}
        onCancel={() => {
          setIsUpdatePlaceModalOpen(false)
          resetUpdatePlaceForm()
        }}
        footer={null}
        centered
        width={700}
        className="rounded-2xl overflow-hidden"
      >
        <Form
          form={updatePlaceForm}
          layout="vertical"
          initialValues={{
            description: savedPlaceData?.description || '',
            area: savedPlaceData?.area || '',
            openingTime: null,
            closingTime: null,
            minAge: savedPlaceData?.minAge || 0,
            maxAge: savedPlaceData?.maxAge || 18,
            price: savedPlaceData?.price || ''
          }}
          className="space-y-6 py-4"
        >
          {/* Place Information Section */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="text-base font-bold text-gray-900 mb-4">
              地点の詳細情報を更新
            </h4>

            {/* Additional Description */}
            <Form.Item
              label="詳細説明"
              name="description"
            >
              <Input.TextArea
                placeholder="この場所について詳しく教えてください（設備、特徴など）"
                rows={3}
                className="rounded-lg"
              />
            </Form.Item>

            {/* Area */}
            <Form.Item
              label="面積"
              name="area"
            >
              <Input
                placeholder="面積を入力"
                suffix="m²"
                className="rounded-lg"
              />
            </Form.Item>

            {/* Price */}
            <Form.Item
              label="料金"
              name="price"
              rules={[
                {
                  validator(_, value) {
                    if (value === undefined || value === '') return Promise.resolve()
                    const num = Number(value)
                    if (isNaN(num) || num < 0) {
                      return Promise.reject(new Error('0円以上で入力してください'))
                    }
                    return Promise.resolve()
                  },
                }
              ]}
            >
              <Input
                type="number"
                placeholder="料金を入力（0円で無料）"
                suffix="円"
                className="rounded-lg"
                min={0}
              />
            </Form.Item>
            <p className="text-xs text-gray-500 -mt-4 mb-4">
              入場料金を入力してください（無料の場合は0を入力）
            </p>

            {/* Age Range Section */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">適用年齢</h5>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  label="最小年齢"
                  name="minAge"
                  rules={[
                    {
                      validator(_, value) {
                        if (value === undefined || value === '') return Promise.resolve()
                        const num = Number(value)
                        if (isNaN(num) || num < 0 || num > 18) {
                          return Promise.reject(new Error('0歳から18歳の間で入力してください'))
                        }
                        return Promise.resolve()
                      },
                    }
                  ]}
                >
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    className="rounded-lg"
                    suffix="歳"
                    placeholder="最小年齢"
                  />
                </Form.Item>

                <Form.Item
                  label="最大年齢"
                  name="maxAge"
                  dependencies={['minAge']}
                  rules={[
                    {
                      validator(_, value) {
                        if (value === undefined || value === '') return Promise.resolve()
                        const num = Number(value)
                        if (isNaN(num) || num < 0 || num > 18) {
                          return Promise.reject(new Error('0歳から18歳の間で入力してください'))
                        }
                        return Promise.resolve()
                      },
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const minAge = Number(getFieldValue('minAge'))
                        const maxAge = Number(value)
                        if (!isNaN(minAge) && !isNaN(maxAge) && minAge > maxAge) {
                          return Promise.reject(new Error('最大年齢は最小年齢より大きくしてください'))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    className="rounded-lg"
                    suffix="歳"
                    placeholder="最大年齢"
                  />
                </Form.Item>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                この地点に適した子どもの年齢範囲を設定してください
              </p>
            </div>

            {/* Opening Hours */}
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="開店時間"
                name="openingTime"
              >
                <TimePicker
                  format="HH:mm"
                  placeholder="開店時間を選択"
                  size="large"
                  className="w-full rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label="閉店時間"
                name="closingTime"
              >
                <TimePicker
                  format="HH:mm"
                  placeholder="閉店時間を選択"
                  size="large"
                  className="w-full rounded-lg"
                />
              </Form.Item>
            </div>

            {/* Media Upload for Place */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">地点の写真・動画を追加</label>
              <Upload
                listType="picture-card"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUpdateFileUpload(file)
                  return false // Prevent default upload
                }}
                accept="image/*,video/*"
              >
                {updateUploadedFiles.length < 10 && (
                  <div className="flex flex-col items-center justify-center p-2">
                    <PlusOutlined className="text-lg mb-1" />
                    <span className="text-xs">ファイルを追加</span>
                  </div>
                )}
              </Upload>

              {/* Display uploaded files */}
              {updateUploadedFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {updateUploadedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type === 'IMAGE' ? (
                        <Image
                          src={file.previewUrl || file.url}
                          alt={`Update uploaded ${index + 1}`}
                          className="rounded-lg object-cover"
                          width={80}
                          height={80}
                        />
                      ) : (
                        <div className="relative w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                          <video
                            src={file.previewUrl || file.url}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <PlayCircleOutlined className="text-white text-sm" />
                          </div>
                        </div>
                      )}
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveUpdateFile(file.url)}
                        size="small"
                      />
                      <div className="absolute bottom-1 left-1">
                        <span className="text-xs bg-black bg-opacity-70 text-white px-1 rounded">
                          {file.type === 'IMAGE' ? '画像' : '動画'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                地点の写真・動画は最大10ファイルまで追加できます。
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Form.Item className="mb-0">
            <Button
              type="primary"
              size="large"
              block
              className="bg-blue-500 hover:bg-blue-400 border-0 h-12 rounded-full text-white font-bold"
              onClick={handleUpdatePlace}
              loading={updatePlaceMutation.isPending || uploadFileMut.isPending || createMediaMutation.isPending}
            >
              {uploadFileMut.isPending ? 'アップロード中...' : '地点情報を更新'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}