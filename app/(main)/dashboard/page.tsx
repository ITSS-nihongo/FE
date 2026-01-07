'use client'

import { useRouter } from 'next/navigation'
import { Input, Card, Slider, Rate } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { translateJapaneseToVietnamese, translateVietnameseToJapanese, isJapanese } from '@/lib/utils/translate'
import { useFindManyPlace } from '@/lib/api/generated'
import { useQueries } from '@tanstack/react-query'
import { getApiMediaOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

export default function DashboardPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 8])
  const [randomPlaces, setRandomPlaces] = useState<any[]>([])
  const [translatedPlaces, setTranslatedPlaces] = useState<Map<string, { name: string; address: string }>>(new Map())

  // Fetch places from database
  const { data: placesData, isLoading } = useFindManyPlace({
    where: {
      isActive: true
    },
    take: 20 // Fetch more places to have a better random selection
  })

  // Translate and randomize places when data is loaded
  useEffect(() => {
    const translateAndSetPlaces = async () => {
      if (placesData && placesData.length > 0) {
        // Prioritize places with images
        const placesWithImages = placesData.filter((p: any) => p.imageUrl)
        const placesWithoutImages = placesData.filter((p: any) => !p.imageUrl)

        // Shuffle both arrays
        const shuffledWithImages = [...placesWithImages].sort(() => Math.random() - 0.5)
        const shuffledWithoutImages = [...placesWithoutImages].sort(() => Math.random() - 0.5)

        // Take up to 4 places, prioritizing ones with images
        const selected = [
          ...shuffledWithImages.slice(0, 4),
          ...shuffledWithoutImages.slice(0, Math.max(0, 4 - shuffledWithImages.length))
        ].slice(0, 4)

        setRandomPlaces(selected)

        // Translate place names and addresses
        const translationMap = new Map<string, { name: string; address: string }>()

        for (const place of selected) {
          const translatedName = await translateVietnameseToJapanese(place.name)
          const translatedAddress = await translateVietnameseToJapanese(place.address)
          translationMap.set(place.id, {
            name: translatedName,
            address: translatedAddress,
          })
        }

        setTranslatedPlaces(translationMap)
      }
    }

    translateAndSetPlaces()
  }, [placesData])

  // Fetch media for each selected place (like place detail page)
  const mediaQueries = useQueries({
    queries: randomPlaces.map((place) => ({
      ...getApiMediaOptions({
        query: {
          placeId: place.id,
          limit: '1' // Only get first image
        }
      }),
      enabled: !!place.id,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }))
  })

  // Compute media map reactively from queries (no useEffect needed)
  const placeMediaMap = useMemo(() => {
    const mediaMap = new Map<string, any>()
    randomPlaces.forEach((place, index) => {
      const queryResult = mediaQueries[index]
      if (queryResult?.data?.media && queryResult.data.media.length > 0) {
        mediaMap.set(place.id, queryResult.data.media[0])
      }
    })
    return mediaMap
  }, [randomPlaces, mediaQueries])

  const handleSearch = async () => {
    if (searchText.trim()) {
      let searchQuery = searchText.trim()

      // If text is in Japanese, translate to Vietnamese
      if (isJapanese(searchQuery)) {
        searchQuery = await translateJapaneseToVietnamese(searchQuery)
      }

      router.push(`/search?q=${encodeURIComponent(searchQuery)}&minAge=${ageRange[0]}&maxAge=${ageRange[1]}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-white rounded-2xl p-8 md:p-12" style={{ backgroundColor: '#BC41C7' }}>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">
          子供の遊び場を探す
        </h1>
        <p className="text-center text-lg mb-8">
          あなたの近くの何千もの楽しい場所を発見してください
        </p>

        {/* Search Box */}
        <div className="bg-white rounded-lg p-6 max-w-2xl mx-auto">
          <div className="mb-4">
            <Input
              size="large"
              placeholder="場所の場所と名前を入力してください"
              prefix={<SearchOutlined className="text-gray-400" />}
              suffix={
                <button
                  className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                  onClick={handleSearch}
                >
                  <SearchOutlined />
                  検索
                </button>
              }
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              className="search-input"
            />
          </div>

          {/* Age Range Slider */}
          <div className="text-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">対象年齢: {ageRange[0]}-{ageRange[1]}歳</span>
            </div>
            <Slider
              range
              min={0}
              max={18}
              value={ageRange}
              onChange={(value) => setAgeRange(value as [number, number])}
              tooltip={{ formatter: (value) => `${value}歳` }}
              className="custom-slider"
            />
          </div>
        </div>
      </div>

      {/* Places Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">おすすめの場所</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} loading={true} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {randomPlaces?.map((place) => {
              const translated = translatedPlaces.get(place.id)
              const displayName = translated?.name || place.name
              const displayAddress = translated?.address || place.address
              // Use externalPlaceId if available, otherwise use id (matching search page logic)
              const linkId = place.externalPlaceId || place.id
              // Get media for this place (like detail page)
              const mediaData = placeMediaMap.get(place.id)

              return (
                <Link key={place.id} href={`/places/${encodeURIComponent(linkId)}`} passHref legacyBehavior>
                  <a style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Card
                      hoverable
                      onClick={() => router.push(`/places/${encodeURIComponent(linkId)}`)}
                      style={{ cursor: 'pointer' }}
                      cover={
                        // Prioritize user uploaded media first (like detail page), then imageUrl from Goong
                        mediaData?.fileUrl ? (
                          <div className="h-40 bg-gray-100 overflow-hidden">
                            <img
                              src={mediaData.fileUrl}
                              alt={mediaData.altText || displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        ) : place.imageUrl ? (
                          <div className="h-40 bg-gray-100 overflow-hidden">
                            <img
                              src={place.imageUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                              </svg>
                            </div>
                          </div>
                        )
                      }
                      className="h-full"
                    >
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base line-clamp-2 min-h-12">
                          {displayName}
                        </h3>

                        <p className="text-xs text-gray-500 line-clamp-1">
                          {displayAddress}
                        </p>

                        <div className="flex items-center gap-1">
                          <Rate disabled value={place.averageRating || 0} allowHalf className="text-sm" />
                          <span className="text-xs text-gray-500">
                            ({place.totalReviews || 0}レビュー)
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {place.placeType === 'INDOOR' ? '屋内' : '屋外'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {place.minAge}-{place.maxAge}歳
                          </span>
                        </div>
                      </div>
                    </Card>
                  </a>
                </Link>
              )
            })}
          </div>
        )}

        {!isLoading && (!randomPlaces || randomPlaces.length === 0) && (
          <Card>
            <p className="text-center text-gray-500 py-8">
              場所が見つかりませんでした
            </p>
          </Card>
        )}
      </div>

      {/* Profile Button - Top Right */}
      <style jsx global>{`
        .search-input .ant-input-suffix {
          margin-left: 8px;
        }
        .custom-slider .ant-slider-rail {
          background-color: #e5e7eb;
        }
        .custom-slider .ant-slider-track {
          background: #BC41C7;
        }
        .custom-slider .ant-slider-handle {
          border-color: #BC41C7;
        }
      `}</style>
    </div>
  )
}
