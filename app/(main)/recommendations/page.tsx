'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, Button, Spin, Empty, Avatar, message } from 'antd'
import { UserOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useFindManyPlace, useFindManyFavorite, useCreateFavorite, useDeleteManyFavorite } from '@/lib/api/generated'
import { getApiPlacesOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useMe } from '@/lib/hooks/use-me'
import { useEffect, useMemo, useState } from 'react'
import { getPresignedUrl } from '@/lib/utils/presigned-url'

export default function RecommendationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useMe()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [displayLimit, setDisplayLimit] = useState(6) // Limit for displaying recommendations
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // Fetch places from API
  const { data: placesResponse, isLoading: isLoadingAPI } = useQuery(
    getApiPlacesOptions({
      query: {
        limit: '100' // Fetch more to filter by distance and keywords
      }
    })
  )
  console.log('🌐 Fetched places from API:', placesResponse?.places?.length || 0)
  // Fetch places from Database
  const { data: dbPlaces, isLoading: isLoadingDB } = useFindManyPlace({
    where: {
      isActive: true
    },
    include: {
      reviews: {
        select: {
          rating: true
        }
      },
      media: {
        where: {
          isActive: true,
          isPendingApproval: false
        },
        orderBy: {
          sortOrder: 'asc'
        },
        take: 1
      },
      _count: {
        select: {
          reviews: true
        }
      }
    }
  })

  const isLoadingPlaces = isLoadingAPI || isLoadingDB

  // Keywords to filter places
  const keywords = [
    'khu vui chơi',
    'sân chơi',
    'công viên trẻ em',
    'trung tâm vui chơi',
    'công viên',
    'khu du lịch',
    'vườn bách thú'
  ]

  // Fetch user's favorites
  const { data: userFavorites, isLoading: isLoadingFavorites } = useFindManyFavorite({
    where: user ? {
      userId: user.id
    } : undefined,
    include: {
      place: true
    }
  })

  // Redirect to dashboard if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/dashboard')
    }
  }, [authLoading, isAuthenticated, router])

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          console.log('📍 Got user location:', position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log('⚠️ Location not available:', error.message)
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      )
    }
  }, [])

  // Create favorite mutation
  const { mutate: createFavorite } = useCreateFavorite({
    onSuccess: () => {
      message.success('お気に入りに追加しました')
    },
    onError: () => {
      message.error('お気に入りの追加に失敗しました')
    }
  })

  // Delete favorite mutation
  const { mutate: deleteFavorite } = useDeleteManyFavorite({
    onSuccess: () => {
      message.success('お気に入りから削除しました')
    },
    onError: () => {
      message.error('お気に入りの削除に失敗しました')
    }
  })

  // Calculate average age of user's kids
  const avgKidAge = user?.numberOfKids && user.numberOfKids > 0 ? Math.floor((0 + 18) / 2) : 5 // Default to 5 if no kids

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  // Format distance text
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`
    } else {
      return `${Math.round(distanceKm)}km`
    }
  }

  // Smart recommendation logic based on user profile
  const recommendedPlaces = useMemo(() => {
    if (!user) return []

    // Merge places from API and Database
    const allPlaces = []
    const seenIds = new Set<string>()

    // Add places from API
    if (placesResponse?.places) {
      for (const place of placesResponse.places) {
        if (!seenIds.has(place.id)) {
          allPlaces.push({
            ...place,
            source: 'api',
            averageRating: place.averageRating || 0,
            totalReviews: place.totalReviews || 0
          })
          seenIds.add(place.id)
        }
      }
    }

    // Add places from Database
    if (dbPlaces) {
      for (const place of dbPlaces) {
        if (!seenIds.has(place.id)) {
          // Calculate average rating from reviews
          const avgRating = place.reviews && place.reviews.length > 0
            ? place.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / place.reviews.length
            : place.averageRating || 0
          
          allPlaces.push({
            ...place,
            source: 'db',
            averageRating: avgRating,
            totalReviews: place._count?.reviews || 0,
            imageUrl: place.media?.[0]?.fileUrl || place.imageUrl
          })
          seenIds.add(place.id)
        }
      }
    }

    return allPlaces
      .filter((place) => {
        // Filter by distance: must be within 20km if location is available
        if (userLocation && place.latitude && place.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            place.latitude,
            place.longitude
          )
          if (distance > 20) return false // Max 20km
        }

        return true
      })
      .map((place) => {
        let score = 0
        
        // 1. Age suitability (40% weight)
        const kidsAges = user.numberOfKids > 0 
          ? Array.from({ length: user.numberOfKids }, (_, i) => 3 + i * 2) // Estimate kids ages
          : [avgKidAge]
        
        const ageMatch = kidsAges.some(kidAge => 
          kidAge >= (place.minAge || 0) && kidAge <= (place.maxAge || 18)
        )
        if (ageMatch) score += 40
        
        // 2. Rating (30% weight)
        const ratingScore = (place.averageRating / 5) * 30
        score += ratingScore
        
        // 3. Number of reviews (15% weight) - more reviews = more trusted
        const reviewScore = Math.min((place.totalReviews / 10) * 15, 15)
        score += reviewScore
        
        // 4. Place type variety (15% weight)
        // Prefer OUTDOOR for families with kids, INDOOR as alternative
        if (user.numberOfKids > 0 && place.placeType === 'OUTDOOR') {
          score += 15
        } else if (place.placeType === 'INDOOR') {
          score += 10
        }

        // Calculate distance if user location is available
        let distance = null
        let distanceText = ''
        if (userLocation && place.latitude && place.longitude) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            place.latitude,
            place.longitude
          )
          distanceText = formatDistance(distance)
        }
        
        return {
          ...place,
          matchScore: Math.round(score),
          ageMatch,
          distance,
          distanceText,
        }
      })
      .filter(place => place.matchScore >= 50) // Only show places with >50% match
      .sort((a, b) => {
        // Sort by distance first (if available), then by match score
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance
        }
        return b.matchScore - a.matchScore
      })
  }, [placesResponse, dbPlaces, user, avgKidAge, userLocation])

  // Transform file paths to presigned URLs for DB images
  useEffect(() => {
    if (recommendedPlaces.length > 0) {
      const transformUrls = async () => {
        const urls: Record<string, string> = {}
        for (const place of recommendedPlaces) {
          // Only transform URLs from database (not from API)
          if (place.source === 'db' && place.imageUrl && place.imageUrl.startsWith('places/')) {
            urls[place.id] = await getPresignedUrl(place.imageUrl)
          }
        }
        setImageUrls(urls)
      }
      transformUrls()
    }
  }, [recommendedPlaces])

  // Display limited recommendations
  const displayedPlaces = recommendedPlaces.slice(0, displayLimit)
  const hasMore = recommendedPlaces.length > displayLimit

  // Count nearby places (using filtered places)
  const nearbyCount = recommendedPlaces.length
  
  // Count saved favorites
  const savedCount = userFavorites?.length || 0

  // Check if place is favorited
  const isFavorited = (placeId: string) => {
    return userFavorites?.some(fav => fav.placeId === placeId) || false
  }

  // Toggle favorite
  const handleToggleFavorite = (placeId: string) => {
    if (!user) return

    const favorited = isFavorited(placeId)
    
    if (favorited) {
      // Remove from favorites
      deleteFavorite({
        where: {
          userId: user.id,
          placeId: placeId
        }
      })
    } else {
      // Add to favorites
      createFavorite({
        data: {
          userId: user.id,
          placeId: placeId
        }
      })
    }
  }

  // Show loading while checking auth
  if (authLoading || isLoadingPlaces || isLoadingFavorites) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* User Info Card */}
      <Card className="shadow-md border-2 border-pink-300">
        <div className="flex items-start gap-4">
          <Avatar size={64} icon={<UserOutlined />} className="bg-pink-500" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
            <p className="text-gray-600 mb-3">
              ユーザー情報に基づいたパーソナライズ
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                👶 {user.numberOfKids}人の子供
              </span>
              <span className="px-4 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                📍 {user.address || '住所未設定'}
              </span>
              {/* <button 
                className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200"
                onClick={() => router.push('/profile')}
              >
                追加設定
              </button> */}
            </div>
            {/* <div className="mt-4">
              <button 
                className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                onClick={() => router.push('/search')}
              >
                🔍 他の検索
              </button>
            </div> */}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        {/* Nearby Spots Card */}
        <Card className="shadow-md border-2 border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <EnvironmentOutlined className="text-2xl text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-700">近くのスポット</h3>
              <p className="text-2xl font-bold text-gray-900">{nearbyCount}</p>
            </div>
          </div>
        </Card>

        {/* Saved Spots Card */}
        <Card 
          className="shadow-md border-2 border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/favorites')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
              <HeartFilled className="text-2xl text-pink-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-700">保存済み</h3>
              <p className="text-2xl font-bold text-gray-900">{savedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">あなたへのおすすめ</h2>
        
        {recommendedPlaces.length === 0 ? (
          <Card>
            <Empty description="おすすめの場所が見つかりませんでした" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPlaces.map((place) => {
              const avgRating = place.averageRating || 0
              const reviewCount = place.totalReviews || 0
              const imageUrl = place.imageUrl
              const linkId = place.id
              const favorited = isFavorited(place.id)

              return (
                <Card
                  key={place.id}
                  className="shadow-md hover:shadow-xl transition-shadow relative overflow-hidden"
                  bodyStyle={{ padding: 0 }}
                >
                  <div className="relative h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                      </div>
                    )}
                    {/* Heart icon for favorite */}
                    <div className="absolute top-3 right-3">
                      {favorited ? (
                        <HeartFilled 
                          className="text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(place.id)
                          }}
                        />
                      ) : (
                        <HeartOutlined 
                          className="text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(place.id)
                          }}
                        />
                      )}
                    </div>
                    {/* Match score badge */}
                    {place.matchScore >= 70 && (
                      <div className="absolute top-3 left-3 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {place.matchScore}% マッチ
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="text-lg font-bold line-clamp-2 min-h-14">
                      {place.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 min-h-10">
                      {place.address || '住所情報なし'}
                    </p>

                    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold">{avgRating > 0 ? avgRating.toFixed(1) : 'なし'}</span>
                        <span className="text-gray-500">({reviewCount})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>👶</span>
                        <span className="font-semibold">
                          {place.minAge !== null && place.maxAge !== null 
                            ? `${place.minAge}-${place.maxAge}歳` 
                            : 'なし'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{place.placeType === 'OUTDOOR' ? '🌳' : place.placeType === 'INDOOR' ? '🏢' : '❓'}</span>
                        <span className="font-semibold">
                          {place.placeType === 'OUTDOOR' ? '屋外' : place.placeType === 'INDOOR' ? '屋内' : 'なし'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-600">💰</span>
                        <span className="font-semibold">
                          {(place as any).price === 0 
                            ? '無料' 
                            : (place as any).price !== null && (place as any).price !== undefined
                              ? `${((place as any).price as number).toLocaleString()}円`
                              : 'なし'
                          }
                        </span>
                      </span>
                    </div>

                    {/* Distance */}
                    {place.distanceText && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <EnvironmentOutlined className="text-blue-500" />
                        <span className="font-medium">{place.distanceText}</span>
                      </div>
                    )}

                    <Button
                      type="primary"
                      block
                      size="large"
                      className="mt-4 h-12 font-semibold rounded-lg"
                      onClick={() => router.push(`/places/${linkId}`)}
                    >
                      詳細を見る
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              type="default"
              size="large"
              className="px-8 h-12 font-semibold rounded-lg"
              onClick={() => setDisplayLimit(prev => prev + 6)}
            >
              もっと見る ({recommendedPlaces.length - displayLimit}件)
            </Button>
          </div>
        )}
      </div>

      
    </div>
  )
}

