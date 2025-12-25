'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Spin, message, Modal, AutoComplete, List, Rate } from 'antd'
import { SearchOutlined, EnvironmentOutlined, ClockCircleOutlined, FilterOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiMapsV2AutocompleteOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useFindManyPlace } from '@/lib/api/generated'
import Link from 'next/link'

const { Option } = Select

// Generate UUID v4 for session token (per Goong API recommendation)
function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [searchText, setSearchText] = useState('')
  const [sessionToken] = useState(() => generateSessionToken()) // Generate once per component mount
  const [searchRadius, setSearchRadius] = useState<string>('50') // Default 50km radius
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Sorting and filtering states
  const [sortBy, setSortBy] = useState<string>('relevant') // relevant, newest, rating, price
  const [placeTypeFilter, setPlaceTypeFilter] = useState<string>('all') // all, INDOOR, OUTDOOR
  const [ageFilter, setAgeFilter] = useState<{ min: number; max: number } | null>(null)
  
  // Debounced search states
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<any>(null)

  // Location state (optional for Goong Autocomplete)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

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

  // Query params for autocomplete
  const [autocompleteParams, setAutocompleteParams] = useState<{
    input: string
    location?: string
    limit?: string
    sessiontoken?: string
  } | null>(null)

  // Use generated hook for Goong autocomplete (for suggestions)
  const { data: searchData, isLoading: isSearching, isFetching } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: autocompleteParams as any,
    }),
    enabled: !!autocompleteParams,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  // Fetch places from database with filters
  const { data: dbPlaces, isLoading: isLoadingDB } = useFindManyPlace({
    where: {
      isActive: true,
      ...(searchText && {
        OR: [
          { name: { contains: searchText, mode: 'insensitive' } },
          { address: { contains: searchText, mode: 'insensitive' } },
          { description: { contains: searchText, mode: 'insensitive' } }
        ]
      }),
      ...(placeTypeFilter !== 'all' && {
        placeType: placeTypeFilter as 'INDOOR' | 'OUTDOOR'
      })
    },
    include: {
      reviews: {
        select: {
          rating: true
        }
      },
      media: {
        where: {
          isActive: true
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
    },
    orderBy: sortBy === 'newest' ? { createdAt: 'desc' } :
             sortBy === 'rating' ? { averageRating: 'desc' } :
             sortBy === 'price' ? { price: 'asc' } :
             { createdAt: 'desc' } // default for 'relevant' and others
  })

  // Get user location (optional - for location biased search)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          console.log('✅ Got user location:', position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log('⚠️ Location not available:', error.message)
          // Still allow search without location
          setLocation({ lat: 0, lng: 0 })
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      )
    } else {
      // Geolocation not supported
      setLocation({ lat: 0, lng: 0 })
    }
  }, [])

  // Debounce function for search input
  const debounceSearch = useCallback((value: string) => {
    setIsTyping(true)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchText(value)
      setIsTyping(false)
    }, 300) // 300ms debounce
  }, [])

  // Search function using Goong autocomplete
  const handleSearchAPI = useCallback((keyword: string) => {
    if (!keyword || keyword.trim() === '') {
      setAutocompleteParams(null)
      return
    }

    const params: any = {
      input: keyword.trim(),
      limit: '20',
      sessiontoken: sessionToken,
      more_compound: 'true', // Include district, commune, province info
    }

    // Add location bias if available
    if (location && location.lat !== 0 && location.lng !== 0) {
      params.location = `${location.lat},${location.lng}`
      params.radius = searchRadius // Add radius parameter
    }

    setAutocompleteParams(params)
  }, [location, sessionToken, searchRadius])

  // Effect for debounced search
  useEffect(() => {
    if (debouncedSearchText.length >= 2) {
      handleSearchAPI(debouncedSearchText)
    }
  }, [debouncedSearchText, handleSearchAPI])

  // Update predictions when data changes
  useEffect(() => {
    if (searchData) {
      console.log('🔍 Search response:', searchData)
    }
  }, [searchData])

  // Read search query and age filter from URL params on mount
  useEffect(() => {
    const qParam = searchParams.get('q')
    const minAgeParam = searchParams.get('minAge')
    const maxAgeParam = searchParams.get('maxAge')
    
    if (qParam) {
      console.log('📖 Reading search query from URL:', qParam)
      setSearchText(qParam)
      setDebouncedSearchText(qParam)
      // Auto-trigger search
      handleSearchAPI(qParam)
    }
    
    if (minAgeParam && maxAgeParam) {
      const minAge = parseInt(minAgeParam)
      const maxAge = parseInt(maxAgeParam)
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        setAgeFilter({ min: minAge, max: maxAge })
        console.log('📖 Reading age filter from URL:', minAge, '-', maxAge)
      }
    }
  }, [searchParams, handleSearchAPI])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleSearch = (keyword?: string) => {
    const searchKeyword = keyword || searchText
    if (!searchKeyword || searchKeyword.trim() === '') {
      message.warning('検索キーワードを入力してください')
      return
    }

    handleSearchAPI(searchKeyword)
  }

  const handleSearchClick = () => {
    handleSearch()
  }

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setSearchText(value)
    debounceSearch(value)
  }

  // Get predictions from autocomplete data
  const predictions = searchData?.predictions || []

  // Calculate average rating for a place
  const calculateAvgRating = (place: any) => {
    if (place.averageRating) return place.averageRating
    if (!place.reviews || place.reviews.length === 0) return 0
    const sum = place.reviews.reduce((acc: number, review: any) => acc + review.rating, 0)
    return sum / place.reviews.length
  }

  // Filter and sort database places based on filters and sortBy
  const sortedDBPlaces = useMemo(() => {
    if (!dbPlaces) return []
    
    let places = [...dbPlaces]
    
    // Apply age filter (client-side)
    if (ageFilter) {
      places = places.filter(place => {
        // Check if place's min and max age are both within the filter range
        const placeMinAge = place.minAge || 0
        const placeMaxAge = place.maxAge || 18
        return (
          placeMinAge >= ageFilter.min && placeMaxAge <= ageFilter.max
        )
      })
    }
    
    // Apply sorting
    if (sortBy === 'rating') {
      return places.sort((a, b) => calculateAvgRating(b) - calculateAvgRating(a))
    } else if (sortBy === 'newest') {
      return places.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === 'price') {
      return places.sort((a, b) => (a.price || 0) - (b.price || 0))
    }
    
    return places
  }, [dbPlaces, sortBy, ageFilter])

  // Get predictions from API (already filtered and sorted by relevance)
  const results = predictions

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-full px-6 py-6 space-y-6">
        {/* Back Button - Outside, Top Right */}
        <div className="flex justify-end">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="text-base font-medium">戻る</span>
          </button>
        </div>

        {/* White Container with Pink Header and Filters */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-6">
          {/* Pink Header and Filters - 3 columns layout */}
          <div className="flex items-stretch gap-4">
            {/* Column 1: Pink Box - Search Result (50%) */}
            <div className="flex-[0.5] bg-[#BC41C7] text-white rounded-xl px-8 py-6 flex items-center justify-center">
              <h1 className="text-2xl font-bold whitespace-nowrap">検索結果</h1>
            </div>

            {/* Column 2: Sort by (25%) */}
            <div className="flex-[0.25] flex items-center gap-2">
              <span className="text-gray-700 font-medium whitespace-nowrap">並べ替え:</span>
              <Select
                value={sortBy}
                onChange={setSortBy}
                className="flex-1"
                size="large"
              >
                <Option value="relevant">最も関連性の高い</Option>
                <Option value="rating">最高評価</Option>
                <Option value="newest">最新</Option>
                <Option value="price">チケット価格</Option>
              </Select>
            </div>

            {/* Column 3: Place Type Filter (25%) */}
            <div className="flex-[0.25] flex items-center">
              <Select
                value={placeTypeFilter}
                onChange={setPlaceTypeFilter}
                className="w-full"
                size="large"
                placeholder="フィルター"
              >
                <Option value="all">フィルター</Option>
                <Option value="INDOOR">屋内</Option>
                <Option value="OUTDOOR">屋外</Option>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(isLoadingDB || isSearching) && (
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">検索中...</p>
          </div>
        )}

        {/* Database Results */}
        {!isLoadingDB && !isSearching && sortedDBPlaces.length > 0 && (
          <div className="space-y-6">
            {sortedDBPlaces.map((place: any) => {
              const avgRating = calculateAvgRating(place)
              const reviewCount = place._count?.reviews || 0
              const firstMedia = place.media?.[0]
              const imageUrl = firstMedia?.fileUrl
              const linkId = place.externalPlaceId || place.id

              return (
                <Card
                  key={place.id}
                  className="hover:shadow-lg transition-shadow border border-gray-200 rounded-lg overflow-hidden w-full"
                  bodyStyle={{ padding: 0 }}
                >
                  <div className="flex w-full">
                    {/* Image */}
                    <Link href={`/places/${linkId}`} className="shrink-0">
                      <div className="w-80 h-64 bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={firstMedia?.altText || place.name}
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
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <Link href={`/places/${linkId}`}>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4 cursor-pointer hover:text-pink-600 transition-colors">
                            {place.name}
                          </h3>
                        </Link>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-base text-gray-700">
                            <EnvironmentOutlined className="text-lg mt-1 text-gray-500" />
                            <span>{place.address || 'なし'}</span>
                          </div>

                          <div className="flex items-center gap-3 text-base text-gray-900 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500 text-xl">★</span>
                              <span className="font-semibold">{avgRating > 0 ? avgRating.toFixed(1) : 'なし'}</span>
                              <span className="text-gray-600">({reviewCount})</span>
                            </div>
                            <span>•</span>
                            <span>
                              {place.minAge !== null && place.maxAge !== null 
                                ? `${place.minAge}-${place.maxAge}歳` 
                                : 'なし'}
                            </span>
                            <span>•</span>
                            <span>
                              {place.price === 0 
                                ? '無料' 
                                : place.price !== null && place.price !== undefined
                                  ? `${place.price.toLocaleString()}円`
                                  : 'なし'}
                            </span>
                            <span>•</span>
                            <span>
                              {userLocation && place.latitude && place.longitude
                                ? formatDistance(calculateDistance(userLocation.lat, userLocation.lng, place.latitude, place.longitude))
                                : 'なし'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        block
                        className="mt-4 bg-white hover:bg-pink-50 border-2 border-pink-500 text-pink-500 hover:text-pink-600 hover:border-pink-600 text-lg h-12 rounded-lg font-medium"
                        onClick={() => router.push(`/places/${linkId}`)}
                      >
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* API Results (not affected by filters, shown below DB results) */}
        {!isSearching && results.length > 0 && (
          <div className="space-y-6">
            {results.map((prediction: any) => {
              return (
                <Card
                  key={prediction.place_id}
                  className="hover:shadow-lg transition-shadow border border-gray-200 rounded-lg overflow-hidden w-full"
                  bodyStyle={{ padding: 0 }}
                >
                  <div className="flex w-full">
                    {/* Image Placeholder */}
                    <div
                      className="w-80 h-64 bg-gray-100 shrink-0 flex items-center justify-center cursor-pointer"
                      onClick={() => router.push(`/places/${encodeURIComponent(prediction.place_id)}`)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <h3
                          className="text-2xl font-bold text-gray-900 mb-4 cursor-pointer hover:text-pink-600 transition-colors"
                          onClick={() => router.push(`/places/${encodeURIComponent(prediction.place_id)}`)}
                        >
                          {prediction.structured_formatting?.main_text || prediction.description}
                        </h3>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-base text-gray-700">
                            <EnvironmentOutlined className="text-lg mt-1 text-gray-500" />
                            <span>{prediction.structured_formatting?.secondary_text || prediction.description || 'なし'}</span>
                          </div>

                          <div className="flex items-center gap-3 text-base text-gray-900 flex-wrap">
                            <span>★ なし (0)</span>
                            <span>•</span>
                            <span>なし歳</span>
                            <span>•</span>
                            <span>なし円</span>
                            <span>•</span>
                            <span>なし</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        block
                        className="mt-4 bg-white hover:bg-pink-50 border-2 border-pink-500 text-pink-500 hover:text-pink-600 hover:border-pink-600 text-lg h-12 rounded-lg font-medium"
                        onClick={() => router.push(`/places/${encodeURIComponent(prediction.place_id)}`)}
                      >
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* No Results */}
        {!isLoadingDB && !isSearching && sortedDBPlaces.length === 0 && results.length === 0 && (
          <Card className="rounded-lg">
            <div className="text-center py-12">
              <SearchOutlined className="text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                検索結果が見つかりませんでした
              </p>
              <p className="text-gray-400 text-sm">
                別のキーワードやフィルターを試してください
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pb-8 flex items-center justify-center">
        <Spin size="large" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  )
}
