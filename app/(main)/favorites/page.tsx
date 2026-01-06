'use client'

import { useState, useEffect } from 'react'
import { Card, Rate, Button, Modal, Empty, Spin, message } from 'antd'
import { HeartFilled, HeartOutlined, EnvironmentOutlined, ClockCircleOutlined, StarFilled } from '@ant-design/icons'
import { useFindManyFavorite, useDeleteFavorite } from '@/lib/api/generated/favorite'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/hooks/use-me'
import { batchTranslateVietnameseToJapanese } from '@/lib/utils/translate'

export default function FavoritesPage() {
  const router = useRouter()
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Translation states for Vietnamese to Japanese
  const [translations, setTranslations] = useState<Map<string, string>>(new Map())
  const [isTranslating, setIsTranslating] = useState(false)

  // Get current user
  const { userId, isAuthenticated } = useMe()

  // Fetch user's favorites
  const { data: favorites, isLoading: favoritesLoading } = useFindManyFavorite({
    where: {
      userId: userId!
    },
    include: {
      place: {
        include: {
          media: {
            where: {
              isActive: true,
              isPendingApproval: false,
              mediaType: 'IMAGE'
            },
            take: 1,
            orderBy: {
              sortOrder: 'asc'
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        }
      }
    }
  }, {
    enabled: !!userId && isAuthenticated,
  })

  // Remove favorite mutation
  const removeFavoriteMutation = useDeleteFavorite({
    onSuccess: () => {
      message.success('お気に入りから削除しました')
      queryClient.invalidateQueries({ queryKey: ['Favorite', 'findMany'] })
    },
    onError: () => {
      message.error('お気に入りの削除に失敗しました')
    }
  })

  const handleRemoveFavorite = (favoriteId: string) => {
    removeFavoriteMutation.mutate({
      where: { id: favoriteId }
    })
  }

  // Navigate to place detail page (same logic as other pages)
  const handleViewDetail = (place: any) => {
    const linkId = place.externalPlaceId || place.id
    router.push(`/places/${linkId}`)
  }

  // Translate place names and addresses from Vietnamese to Japanese
  useEffect(() => {
    const translatePlaces = async () => {
      if (!favorites || favorites.length === 0) return

      // Collect all texts that need translation
      const textsToTranslate: string[] = []

      favorites.forEach((favorite: any) => {
        const place = favorite.place
        if (place?.name && !translations.has(place.name)) {
          textsToTranslate.push(place.name)
        }
        if (place?.address && !translations.has(place.address)) {
          textsToTranslate.push(place.address)
        }
      })

      if (textsToTranslate.length === 0) return

      setIsTranslating(true)
      try {
        const newTranslations = await batchTranslateVietnameseToJapanese(textsToTranslate)

        // Merge with existing translations
        setTranslations(prev => {
          const merged = new Map(prev)
          newTranslations.forEach((value, key) => {
            merged.set(key, value)
          })
          return merged
        })
      } catch (error) {
        console.error('Failed to translate places:', error)
      } finally {
        setIsTranslating(false)
      }
    }

    translatePlaces()
  }, [favorites])

  if (favoritesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full pb-20">
      <div className="w-full px-4 py-6 space-y-8">

        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black mb-2">お気に入りの場所</h1>
          <p className="text-gray-600">
            気になった遊び場・お出かけスポットをいつでも振り返れる、あなた専用のリストです。
          </p>
          {/* Translation Loading Indicator */}
          {isTranslating && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Spin size="small" />
              <span>日本語に翻訳中...</span>
            </div>
          )}
        </div>

        {/* Favorites Grid */}
        {favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite: any) => {
              const place = favorite.place
              // Calculate average rating from reviews
              const reviews = place.reviews || []
              const avgRating = reviews.length > 0
                ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
                : 0
              const totalReviews = reviews.length
              // Get first image from media
              const imageUrl = place.media && place.media.length > 0 ? place.media[0].fileUrl : null

              return (
                <Card
                  key={favorite.id}
                  className="rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  cover={
                    <div >
                      {/* {place.photos && place.photos.length > 0 ? (
                        <img
                          src={place.photos[0]}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                        </div>
                      )} */}

                      {/* Heart Icon - Remove from favorites */}
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="absolute top-3 right-3 rounded-full p-2 hover:scale-110 transition-transform"
                      >
                        <HeartFilled className="text-red-500 text-2xl drop-shadow-lg" />
                      </button>
                    </div>
                  }
                >
                  <div className="p-4 space-y-3">
                    {/* Place Name */}
                    <h3 className="font-bold text-lg text-black line-clamp-2">
                      {translations.get(place.name) || place.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <Rate disabled value={Number(avgRating)} allowHalf className="text-sm" />
                      <span className="text-sm font-medium">{avgRating > 0 ? avgRating.toFixed(1) : 'なし'}</span>
                      <span className="text-xs text-gray-400">({totalReviews})</span>
                    </div>

                    {/* Age Range */}
                    {(place.minAge !== undefined && place.maxAge !== undefined) && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span className="font-medium">対象年齢:</span>
                        <span>{place.minAge}歳 - {place.maxAge}歳</span>
                      </div>
                    )}

                    {/* Price/Type */}
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <span className="font-medium">料金:</span>
                      <span>
                        {place.price === 0
                          ? '無料'
                          : place.price !== null && place.price !== undefined
                            ? `${place.price.toLocaleString()}円`
                            : 'なし'
                        }
                      </span>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-1 text-sm text-gray-600">
                      <EnvironmentOutlined className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">
                        {place.address
                          ? (translations.get(place.address) || place.address)
                          : (place.vicinity || 'ダム周辺道路')
                        }
                      </span>
                    </div>

                    {/* Detail Button - Navigate to place details page */}
                    <Button
                      type="primary"
                      block
                      className="mt-4 bg-white hover:bg-pink-50 border-2 border-pink-500 text-pink-500 hover:text-pink-600 hover:border-pink-600 rounded-lg h-10 font-medium"
                      onClick={() => handleViewDetail(place)}
                    >
                      詳細を見る
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Empty
              description="まだお気に入りの場所がありません"
              className="text-gray-500"
            />
            <div className="mt-6">
              <Link href="/dashboard">
                <Button type="primary" className="bg-purple-500 hover:bg-purple-400 border-0 rounded-lg">
                  場所を探す
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Detail Modal */}
      <Modal
        title={null}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        centered
        width={600}
        className="rounded-2xl overflow-hidden"
      >
        {selectedPlace && (
          <div className="space-y-6">
            {/* Image */}
            <div className="w-full max-h-96 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {selectedPlace.media && selectedPlace.media.length > 0 ? (
                <img
                  src={selectedPlace.media[0].fileUrl}
                  alt={selectedPlace.media[0].altText || selectedPlace.name}
                  className="w-full h-auto max-h-96 object-cover"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-64 flex flex-col items-center justify-center text-gray-400">
                          <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                          <p class="text-sm font-medium mt-2">画像を読み込めませんでした</p>
                        </div>
                      `
                    }
                  }}
                />
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <p className="text-sm font-medium mt-2">写真準備中</p>
                </div>
              )}
            </div>

            {/* Place Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-black">{selectedPlace.name}</h2>

              {/* Rating */}
              <div className="flex items-center gap-2">
                {(() => {
                  const reviews = selectedPlace.reviews || []
                  const avgRating = reviews.length > 0
                    ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
                    : 0
                  return (
                    <>
                      <Rate disabled value={Number(avgRating)} allowHalf className="text-base" />
                      <span className="font-medium">
                        {avgRating > 0 ? avgRating.toFixed(1) : 'なし'}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({selectedPlace.reviews?.length || 0}件のレビュー)
                      </span>
                    </>
                  )
                })()}
              </div>

              {/* Details - 2 columns */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {/* Left Column */}
                <div className="space-y-2">
                  {/* Age Range */}
                  {(selectedPlace.minAge !== undefined && selectedPlace.maxAge !== undefined) && (
                    <div>
                      <span className="font-medium text-gray-800">対象年齢: </span>
                      <span className="text-gray-600">{selectedPlace.minAge}歳 - {selectedPlace.maxAge}歳</span>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <span className="font-medium text-gray-800">料金: </span>
                    <span className="text-gray-600">
                      {selectedPlace.price === 0
                        ? '無料'
                        : selectedPlace.price !== null && selectedPlace.price !== undefined
                          ? `${selectedPlace.price.toLocaleString()}円`
                          : 'なし'
                      }
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* Opening Hours */}
                  <div>
                    <span className="font-medium text-gray-800">営業時間: </span>
                    <span className="text-gray-600">
                      {selectedPlace.openingTime && selectedPlace.closingTime
                        ? `${selectedPlace.openingTime} - ${selectedPlace.closingTime}`
                        : '8:00-18:00'
                      }
                    </span>
                  </div>

                  {/* Type */}
                  <div>
                    <span className="font-medium text-gray-800">施設タイプ: </span>
                    <span className="text-gray-600">{selectedPlace.placeType === 'OUTDOOR' ? '屋外' : '屋内'}</span>
                  </div>

                  {/* Address */}
                  <div>
                    <span className="font-medium text-gray-800">住所: </span>
                    <span className="text-gray-600">{selectedPlace.address || selectedPlace.vicinity || 'ダム周辺道路'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedPlace.description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedPlace.description}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-4">
                <Button
                  block
                  size="large"
                  className="rounded-lg"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
