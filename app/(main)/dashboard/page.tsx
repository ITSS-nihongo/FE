'use client'

import { useRouter } from 'next/navigation'
import { Input, Card, Slider, Rate, Avatar } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getApiPlacesOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'
import { useState, useEffect } from 'react'
import { getPresignedUrl } from '@/lib/utils/presigned-url'
import { translateJapaneseToVietnamese, isJapanese } from '@/lib/utils/translate'

export default function DashboardPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 8])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // Fetch all places from API
  const { data: placesResponse, isLoading } = useQuery(
    getApiPlacesOptions({
      query: {
        limit: '20' // Fetch 20 places only
      }
    })
  )

  // Filter places by keywords
  const keywords = [
    'khu vui chơi',
    'sân chơi',
    'công viên trẻ em',
    'trung tâm vui chơi',
    'công viên',
    'khu du lịch',
    'vườn bách thú'
  ]

  // Randomize and select 4 places
  const [randomPlaces, setRandomPlaces] = useState<any[]>([])

  useEffect(() => {
    if (placesResponse?.places && placesResponse.places.length > 0) {
      // Filter places by keywords
      const filtered = placesResponse.places.filter((place) => 
        keywords.some(keyword => 
          place.name.toLowerCase().startsWith(keyword.toLowerCase())
        )
      )
      
      if (filtered.length > 0) {
        // Shuffle and take 4 random places
        const shuffled = [...filtered].sort(() => Math.random() - 0.5)
        setRandomPlaces(shuffled.slice(0, 4))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesResponse])

  // Transform file paths to presigned URLs
  useEffect(() => {
    if (randomPlaces.length > 0) {
      const transformUrls = async () => {
        const urls: Record<string, string> = {}
        for (const place of randomPlaces) {
          if (place.imageUrl) {
            urls[place.id] = await getPresignedUrl(place.imageUrl)
          }
        }
        setImageUrls(urls)
      }
      transformUrls()
    }
  }, [randomPlaces])

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
              // Get presigned URL from state
              const imageUrl = imageUrls[place.id]

              return (
                <Link key={place.id} href={`/places/${place.id}`}>
                  <Card
                    hoverable
                    cover={
                      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
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
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    }
                    className="h-full"
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base line-clamp-2 min-h-12">
                        {place.name}
                      </h3>

                      <div className="flex items-center gap-1">
                        <Rate disabled value={place.averageRating} allowHalf className="text-sm" />
                        <span className="text-xs text-gray-500">
                          ({place.totalReviews}レビュー)
                        </span>
                      </div>

                    </div>
                  </Card>
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
