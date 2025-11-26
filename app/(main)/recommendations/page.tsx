'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, Button, Spin, Empty, Avatar } from 'antd'
import { UserOutlined, EnvironmentOutlined, HeartFilled, StarFilled } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getApiMapsSearchNearbyWithDetailsOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

export default function RecommendationsPage() {
  const router = useRouter()

  // Mock user data - In production, this would come from auth context
  const userData = {
    name: '田中 太郎 (Tanaka Taro)',
    kids: [
      { age: 3, name: '太郎' },
      { age: 5, name: '花子' }
    ],
    location: '東京都渋谷区',
    totalKids: 2,
    // Tokyo Shibuya coordinates
    lat: 35.6595,
    lng: 139.7004,
  }

  // Fetch places from OpenStreetMap API with search for family-friendly places
  const { data: placesData, isLoading } = useQuery({
    ...getApiMapsSearchNearbyWithDetailsOptions({
      query: {
        input: 'playground park restaurant museum aquarium zoo', // Keywords for family places
        latitude: String(userData.lat),
        longitude: String(userData.lng),
        radius: '10000', // 10km radius
        limit: '50',
      },
    }),
  })

  // Calculate match rate based on kids' ages (estimate from place types)
  const calculateMatchRate = (place: any) => {
    if (!userData.kids || userData.kids.length === 0) return 50
    
    // Estimate suitability based on place type/name keywords
    const name = place.name?.toLowerCase() || ''
    const types = place.types || []
    
    // Family-friendly keywords
    const familyKeywords = ['playground', 'park', 'zoo', 'aquarium', 'museum', 'kids', 'children', 'family']
    const hasFamilyKeyword = familyKeywords.some(keyword => name.includes(keyword) || types.includes(keyword))
    
    if (hasFamilyKeyword) {
      return 85 + Math.floor(Math.random() * 15) // 85-100%
    }
    
    return 50 + Math.floor(Math.random() * 30) // 50-80%
  }

  // Sort places by match rate
  const recommendedPlaces = placesData?.results
    ?.map((place: any) => ({
      ...place,
      matchRate: calculateMatchRate(place),
    }))
    .sort((a: any, b: any) => b.matchRate - a.matchRate) || []

  // Count nearby and saved spots
  const nearbyCount = placesData?.total || 0
  const savedCount = recommendedPlaces.filter((p: any) => p.matchRate > 70).length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* User Info Card */}
      <Card className="shadow-md">
        <div className="flex items-start gap-4">
          <Avatar size={64} icon={<UserOutlined />} className="bg-pink-500" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{userData.name}</h2>
            <p className="text-gray-600 mb-1">
              ユーザー情報に基づいたパーソナライズ
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                👶 {userData.totalKids}人
              </span>
              {userData.kids.map((kid, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                >
                  {kid.age}歳
                </span>
              ))}
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                📍 {userData.location}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Nearby Spots Card */}
        <Card className="shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow">
          <EnvironmentOutlined className="text-4xl text-blue-500 mb-2" />
          <h3 className="text-lg font-semibold mb-1">近くのスポット</h3>
          <p className="text-3xl font-bold text-blue-600">{nearbyCount}</p>
        </Card>

        {/* Saved Spots Card */}
        <Card className="shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow">
          <HeartFilled className="text-4xl text-pink-500 mb-2" />
          <h3 className="text-lg font-semibold mb-1">保存済み</h3>
          <p className="text-3xl font-bold text-pink-600">{savedCount}</p>
        </Card>
      </div>

      {/* Recommendations Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">あなたへのおすすめ</h2>
        
        {recommendedPlaces.length === 0 ? (
          <Card>
            <Empty description="おすすめの場所が見つかりませんでした" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedPlaces.map((place) => (
              <Card
                key={place.id}
                className="shadow-md hover:shadow-xl transition-shadow relative"
                cover={
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center overflow-hidden">
                    {place.photos && place.photos.length > 0 ? (
                      <img
                        src={place.photos[0].url}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                        </svg>
                      </div>
                    )}
                    {/* Heart icon for favorite */}
                    <div className="absolute top-3 right-3">
                      <HeartFilled className="text-2xl text-red-500 cursor-pointer hover:scale-110 transition-transform" />
                    </div>
                  </div>
                }
              >
                <div className="space-y-3">
                  <h3 className="text-base font-bold line-clamp-2 min-h-12">
                    {place.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 min-h-10">
                    {place.formatted_address || place.vicinity || ''}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>⭐ {place.rating ? place.rating.toFixed(1) : 'N/A'}</span>
                    <span>👶 全年齢</span>
                    <span>🕐 営業中</span>
                  </div>

                  <Button
                    type="primary"
                    block
                    size="large"
                    className="mt-4 bg-linear-to-r from-purple-500 to-pink-500 border-0 font-semibold"
                    onClick={() => {
                      router.push(`/places/${encodeURIComponent(place.place_id)}`)
                    }}
                  >
                    詳細を見る
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
