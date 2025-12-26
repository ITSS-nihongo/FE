'use client'

import { useRouter } from 'next/navigation'
import { Input, Card, Slider, Rate, Avatar } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useFindManyPlace } from '@/lib/api/generated'
import { useState, useEffect } from 'react'
import { getPresignedUrl } from '@/lib/utils/presigned-url'

export default function DashboardPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 8])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // Fetch places data từ ZenStack
  const { data: placesData, isLoading } = useFindManyPlace({
    where: searchText ? {
      OR: [
        { name: { contains: searchText, mode: 'insensitive' } },
        { address: { contains: searchText, mode: 'insensitive' } }
      ]
    } : undefined,
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
    take: 4,
    orderBy: {
      averageRating: 'desc' // Sort by highest rating
    }
  })

  // Transform file paths to presigned URLs
  useEffect(() => {
    if (placesData) {
      const transformUrls = async () => {
        const urls: Record<string, string> = {}
        for (const place of placesData) {
          const firstMedia = place.media?.[0]
          if (firstMedia?.fileUrl) {
            urls[place.id] = await getPresignedUrl(firstMedia.fileUrl)
          }
        }
        setImageUrls(urls)
      }
      transformUrls()
    }
  }, [placesData])

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchText)}&minAge=${ageRange[0]}&maxAge=${ageRange[1]}`)
    }
  }

  // Calculate average rating
  const calculateAvgRating = (place: any) => {
    if (!place.reviews || place.reviews.length === 0) return 0
    const sum = place.reviews.reduce((acc: number, review: any) => acc + review.rating, 0)
    return sum / place.reviews.length
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
            {placesData?.map((place) => {
              const avgRating = calculateAvgRating(place)
              const reviewCount = place._count?.reviews || 0

              // Use externalPlaceId for the link, fallback to regular id if not available
              const linkId = place.externalPlaceId || place.id

              // Get presigned URL from state
              const imageUrl = imageUrls[place.id]

              return (
                <Link key={place.id} href={`/places/${linkId}`}>
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
                      <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]">
                        {place.name}
                      </h3>

                      <div className="flex items-center gap-1">
                        <Rate disabled value={avgRating} allowHalf className="text-sm" />
                        <span className="text-xs text-gray-500">
                          ({reviewCount}レビュー)
                        </span>
                      </div>

                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {!isLoading && (!placesData || placesData.length === 0) && (
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
