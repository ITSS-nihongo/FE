'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, Button, Spin, Empty, Avatar, message } from 'antd'
import { UserOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useFindManyFavorite, useCreateFavorite, useDeleteManyFavorite, useFindManyPlace } from '@/lib/api/generated'
import { getApiMapsV2AutocompleteOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useMe } from '@/lib/hooks/use-me'
import { useEffect, useMemo, useState } from 'react'

export default function RecommendationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useMe()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [displayLimit, setDisplayLimit] = useState(6) // Limit for displaying recommendations
  const [allPlaces, setAllPlaces] = useState<any[]>([])

  // Keywords for fetching family-friendly places
  const keywords = [
    'công viên',
    'khu vui chơi',
    'sân chơi trẻ em',
    'trung tâm vui chơi',
    'khu du lịch',
    'công viên trẻ em',
  ]

  // Fetch places from Goong API using autocomplete for each keyword
  const { data: placesData1, isLoading: isLoading1 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[0],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '20',
        radius: '20000', // 20km radius in meters
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData2, isLoading: isLoading2 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[1],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '20',
        radius: '20000',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData3, isLoading: isLoading3 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[2],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '20',
        radius: '20000',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData4, isLoading: isLoading4 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[3],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '20',
        radius: '20000',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const isLoadingPlaces = isLoading1 || isLoading2 || isLoading3 || isLoading4

  // Fetch user's favorites
  const { data: userFavorites, isLoading: isLoadingFavorites } = useFindManyFavorite({
    where: user ? {
      userId: user.id
    } : undefined,
    include: {
      place: true
    }
  })

  // Combine places from all keyword searches and remove duplicates
  useEffect(() => {
    const allPredictions = [
      ...(placesData1?.predictions || []),
      ...(placesData2?.predictions || []),
      ...(placesData3?.predictions || []),
      ...(placesData4?.predictions || []),
    ]

    if (allPredictions.length > 0) {
      // Remove duplicates by place_id
      const uniquePlaces = Array.from(
        new Map(allPredictions.map(p => [p.place_id, p])).values()
      )
      
      console.log('🌐 Fetched unique places from Goong API:', uniquePlaces.length)
      setAllPlaces(uniquePlaces)
    }
  }, [placesData1, placesData2, placesData3, placesData4])

  // Get list of external place IDs to query database
  const externalPlaceIds = useMemo(() => {
    return allPlaces.map(p => p.place_id)
  }, [allPlaces])

  // Query database for places that already exist (by externalPlaceId)
  const { data: dbPlaces, isLoading: isLoadingDbPlaces } = useFindManyPlace({
    where: externalPlaceIds.length > 0 ? {
      externalPlaceId: {
        in: externalPlaceIds
      },
      isActive: true
    } : undefined,
    include: {
      media: {
        where: {
          isActive: true,
          isPendingApproval: false
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
  }, {
    enabled: externalPlaceIds.length > 0
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
    if (!user || !userLocation || allPlaces.length === 0) return []

    console.log('🎯 Calculating recommendations for', allPlaces.length, 'places')
    console.log('💾 Found', dbPlaces?.length || 0, 'places in database')

    // Create a map of external place IDs to database places for quick lookup
    const dbPlaceMap = new Map(
      (dbPlaces || []).map(dbPlace => [dbPlace.externalPlaceId, dbPlace])
    )

    return allPlaces
      .map((prediction) => {
        let score = 50 // Base score for being in keyword search results
        
        // Check if this place exists in the database
        const dbPlace = dbPlaceMap.get(prediction.place_id)
        
        if (dbPlace) {
          // Use data from database
          console.log('✅ Using DB data for:', dbPlace.name)
          
          // Calculate average rating from reviews
          const reviews = (dbPlace as any).reviews || []
          const avgRating = reviews.length > 0
            ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
            : 0
          const totalReviews = reviews.length
          
          // Boost score if place is in database
          score += 20
          
          // Boost score based on ratings
          if (avgRating >= 4) score += 15
          else if (avgRating >= 3) score += 10
          
          // Boost score based on number of reviews
          if (totalReviews >= 10) score += 10
          else if (totalReviews >= 5) score += 5
          
          // Age compatibility scoring
          if (dbPlace.minAge !== null && dbPlace.maxAge !== null) {
            if (avgKidAge >= dbPlace.minAge && avgKidAge <= dbPlace.maxAge) {
              score += 20 // Perfect age match
            } else if (avgKidAge < dbPlace.minAge) {
              const ageDiff = dbPlace.minAge - avgKidAge
              score -= ageDiff * 2 // Penalty for too young
            } else {
              const ageDiff = avgKidAge - dbPlace.maxAge
              score -= ageDiff * 2 // Penalty for too old
            }
          }
          
          // Calculate distance if coordinates available
          let distance = null
          let distanceText = '20km以内'
          if (dbPlace.latitude !== null && dbPlace.longitude !== null) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              dbPlace.latitude,
              dbPlace.longitude
            )
            distanceText = formatDistance(distance)
            
            // Distance-based scoring
            if (distance < 5) score += 15
            else if (distance < 10) score += 10
            else if (distance < 15) score += 5
          }
          
          return {
            id: dbPlace.id,
            name: dbPlace.name,
            address: dbPlace.address || prediction.structured_formatting?.secondary_text || prediction.description,
            imageUrl: (dbPlace as any).media && (dbPlace as any).media.length > 0 ? (dbPlace as any).media[0].fileUrl : null,
            averageRating: Number(avgRating.toFixed(1)),
            totalReviews: totalReviews,
            minAge: dbPlace.minAge,
            maxAge: dbPlace.maxAge,
            placeType: dbPlace.placeType,
            price: dbPlace.price,
            latitude: dbPlace.latitude,
            longitude: dbPlace.longitude,
            externalPlaceId: dbPlace.externalPlaceId,
            matchScore: Math.round(score),
            distance,
            distanceText,
          }
        } else {
          // Use data from Goong API only
          console.log('📍 Using API data for:', prediction.structured_formatting?.main_text)
          
          return {
            id: prediction.place_id,
            name: prediction.structured_formatting?.main_text || prediction.description,
            address: prediction.structured_formatting?.secondary_text || prediction.description,
            imageUrl: null,
            averageRating: 0,
            totalReviews: 0,
            minAge: null,
            maxAge: null,
            placeType: null,
            price: null,
            latitude: null,
            longitude: null,
            externalPlaceId: prediction.place_id,
            matchScore: Math.round(score),
            distance: null,
            distanceText: '20km以内',
          }
        }
      })
      .filter(place => place.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [allPlaces, user, userLocation, dbPlaces, avgKidAge])

  // Display limited recommendations
  const displayedPlaces = recommendedPlaces.slice(0, displayLimit)
  console.log('📍 Displaying', displayedPlaces, 'of', recommendedPlaces, 'recommended places')
  const hasMore = recommendedPlaces.length > displayLimit

  // Count nearby places (using filtered places)
  const nearbyCount = recommendedPlaces.length
  
  // Count saved favorites
  const savedCount = userFavorites?.length || 0

  // Check if place is favorited (by externalPlaceId)
  const isFavorited = (placeId: string) => {
    // For Goong places, check by externalPlaceId
    return userFavorites?.some(fav => fav.place?.externalPlaceId === placeId) || false
  }

  // Toggle favorite - works for both DB places and API-only places
  const handleToggleFavorite = (place: any) => {
    if (!user) return

    // First, try to find the database place by externalPlaceId
    const dbPlace = dbPlaces?.find(p => p.externalPlaceId === place.externalPlaceId)
    
    if (!dbPlace) {
      message.warning('この地点を保存してからお気に入りに追加してください')
      return
    }

    const favorited = isFavorited(place.externalPlaceId)
    
    if (favorited) {
      // Remove from favorites
      deleteFavorite({
        where: {
          userId: user.id,
          placeId: dbPlace.id
        }
      })
    } else {
      // Add to favorites
      createFavorite({
        data: {
          userId: user.id,
          placeId: dbPlace.id
        }
      })
    }
  }

  // Show loading while checking auth
  if (authLoading || isLoadingPlaces || isLoadingFavorites || isLoadingDbPlaces) {
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
              // Use place_id from Goong API (externalPlaceId)
              const linkId = encodeURIComponent(place.externalPlaceId)
              const favorited = isFavorited(place.externalPlaceId)

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
                            handleToggleFavorite(place)
                          }}
                        />
                      ) : (
                        <HeartOutlined 
                          className="text-3xl cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(place)
                          }}
                        />
                      )}
                    </div>
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
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <EnvironmentOutlined className="text-blue-500" />
                      <span className="font-medium">{place.distanceText}</span>
                    </div>

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

