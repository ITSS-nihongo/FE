'use client'

import { tokenManager } from '@/lib/utils/token'
import { useRouter } from 'next/navigation'
import { Input, Card, Slider, Rate, Avatar } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useFindManyPlace } from '@/lib/api/generated'
import { useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [ageRange, setAgeRange] = useState<[number, number]>([1, 8])

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
      _count: {
        select: {
          reviews: true
        }
      }
    },
    take: 4,
    orderBy: {
      createdAt: 'desc'
    }
  })

  const handleLogout = () => {
    tokenManager.removeToken()
    router.push('/login')
  }

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchText)}`)
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
      <div className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 text-white rounded-2xl p-8 md:p-12">
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
                  className="bg-cyan-400 hover:bg-cyan-500 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  onClick={handleSearch}
                >
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
              min={1}
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

              return (
                <Link key={place.id} href={`/places/${place.id}`}>
                  <Card
                    hoverable
                    cover={
                      <div className="h-40 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-lg">Image</span>
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
          background: linear-gradient(90deg, #ec4899 0%, #a855f7 100%);
        }
        .custom-slider .ant-slider-handle {
          border-color: #ec4899;
        }
      `}</style>
    </div>
  )
}
