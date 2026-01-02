'use client'

import { useRouter } from 'next/navigation'
import { Input, Card, Slider, Rate, Avatar } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getApiMapsV2AutocompleteOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useState, useEffect } from 'react'
import { translateJapaneseToVietnamese, isJapanese } from '@/lib/utils/translate'

export default function DashboardPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 8])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [randomPlaces, setRandomPlaces] = useState<any[]>([])

  // Keywords for fetching recommendations
  const keywords = [
    'công viên',
    'khu vui chơi',
    'sân chơi trẻ em',
    'trung tâm vui chơi',
  ]

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.log('⚠️ Location not available:', error.message)
          // Use default location (Hanoi)
          setUserLocation({ lat: 21.0285, lng: 105.8542 })
        }
      )
    } else {
      // Use default location (Hanoi)
      setUserLocation({ lat: 21.0285, lng: 105.8542 })
    }
  }, [])

  // Fetch places from Goong API using autocomplete
  const { data: placesData1 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[0],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '10',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData2 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[1],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '10',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData3 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[2],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '10',
      } as any,
    }),
    enabled: !!userLocation,
  })

  const { data: placesData4 } = useQuery({
    ...getApiMapsV2AutocompleteOptions({
      query: {
        input: keywords[3],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined,
        limit: '10',
      } as any,
    }),
    enabled: !!userLocation,
  })

  // Combine and randomize places when data is loaded
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
      
      // Shuffle and take 4 random places
      const shuffled = [...uniquePlaces].sort(() => Math.random() - 0.5)
      setRandomPlaces(shuffled.slice(0, 4))
    }
  }, [placesData1, placesData2, placesData3, placesData4])

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

        {!userLocation ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} loading={true} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {randomPlaces?.map((place) => {
              // Use place_id from Goong API
              const linkId = place.place_id

              return (
                <Link key={place.place_id} href={`/places/${encodeURIComponent(linkId)}`}>
                  <Card
                    hoverable
                    cover={
                      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                        </div>
                      </div>
                    }
                    className="h-full"
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base line-clamp-2 min-h-12">
                        {place.structured_formatting?.main_text || place.description}
                      </h3>

                      <div className="flex items-center gap-1">
                        <Rate disabled value={0} allowHalf className="text-sm" />
                        <span className="text-xs text-gray-500">
                          (0レビュー)
                        </span>
                      </div>

                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {userLocation && (!randomPlaces || randomPlaces.length === 0) && (
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
