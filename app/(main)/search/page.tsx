'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Rate, Button, Input, Select, Spin, message, Modal } from 'antd'
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiMapsSearchNearbyWithDetailsOptions, postApiPlacesImportFromMapMutation } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

const { Option } = Select

// Place type mapping: Japanese label -> Track-Asia API type
const PLACE_TYPE_MAP: Record<string, string> = {
  'all': 'all',
  'playground': 'playground',
  'park': 'park',
  'amusement_park': 'amusement_park',
  'zoo': 'zoo',
  'aquarium': 'aquarium',
  'museum': 'museum',
  'restaurant': 'restaurant',
  'cafe': 'cafe',
  'shopping_mall': 'shopping_mall',
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [sortBy, setSortBy] = useState('distance')
  const [filterType, setFilterType] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  
  // Location state (REQUIRED for this API)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Search trigger state
  const [shouldSearch, setShouldSearch] = useState(false)
  const [searchParams_query, setSearchParams_query] = useState<{
    input: string
    latitude: string
    longitude: string
    radius?: string
    type?: string
  } | null>(null)
  
  // Debug: Track shouldSearch changes
  useEffect(() => {
    console.log('🚀 shouldSearch changed:', shouldSearch)
  }, [shouldSearch])

  // Try to get user location on mount (REQUIRED)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          console.log('✅ Got user location:', position.coords.latitude, position.coords.longitude)
          message.success('現在地を取得しました')
        },
        (error) => {
          console.error('❌ Location error:', error.message)
          message.error('位置情報の取得に失敗しました。位置情報を許可してください。')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      message.error('このブラウザは位置情報をサポートしていません')
    }
  }, [])

  // Fetch places from Track-Asia Combined API (autocomplete + details + distance filter)
  const searchQuery = useQuery({
    ...getApiMapsSearchNearbyWithDetailsOptions({
      query: searchParams_query as any,
    }),
    enabled: shouldSearch && !!searchParams_query && !!location,
  })

  const { data: searchData, isLoading, refetch, error } = searchQuery
  
  // Debug logging
  useEffect(() => {
    console.log('📦 Frontend received data:', {
      searchData,
      hasResults: (searchData as any)?.results?.length || 0,
      total: (searchData as any)?.total || 0,
      searched: (searchData as any)?.searched || 0,
    })
    if (error) {
      console.error('❌ Frontend error:', error)
    }
  }, [searchData, error])

  // Import place mutation - Sử dụng generated mutation hook
  const importPlaceMutation = useMutation({
    ...postApiPlacesImportFromMapMutation(),
    onSuccess: () => {
      message.success('場所をデータベースに保存しました！')
      setIsImportModalOpen(false)
      setSelectedPlace(null)
    },
    onError: (error: any) => {
      if (error.error?.includes('already exists')) {
        message.warning('この場所は既にデータベースに登録されています')
      } else {
        message.error(error.error || '保存に失敗しました')
      }
    },
  })

  const handleSearch = () => {
    if (!searchText || searchText.trim() === '') {
      message.warning('検索キーワードを入力してください')
      return
    }
    
    if (!location) {
      message.warning('位置情報を取得してください')
      return
    }
    
    // Set search params và trigger query
    const queryParams: {
      input: string
      latitude: string
      longitude: string
      radius?: string
      type?: string
    } = {
      input: searchText.trim(),
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      radius: '1000',
    }
    
    // Map filterType sang Track-Asia API type
    if (filterType !== 'all' && PLACE_TYPE_MAP[filterType]) {
      queryParams.type = PLACE_TYPE_MAP[filterType]
    }
    
    console.log('🔍 Search params:', queryParams)
    
    setSearchParams_query(queryParams)
    setShouldSearch(true)
  }

  const handleImportPlace = (place: any) => {
    console.log('🔵 Importing place:', place.place_id)
    setSelectedPlace(place)
    setIsImportModalOpen(true)
  }

  const confirmImport = () => {
    if (selectedPlace) {
      console.log('💾 Importing place with details:', {
        place_id: selectedPlace.place_id,
        name: selectedPlace.name,
        address: selectedPlace.formatted_address,
      })
      
      importPlaceMutation.mutate({
        body: {
          place_id: selectedPlace.place_id,
          placeType: 'OUTDOOR',
          minAge: 1,
          maxAge: 12,
        }
      })
    }
  }

  // Extract places from response - results từ combined API
  const places = useMemo(() => {
    const results = (searchData as any)?.results || []
    console.log('🎯 Places extracted:', {
      searchDataExists: !!searchData,
      resultsLength: results.length,
      total: (searchData as any)?.total,
      searched: (searchData as any)?.searched,
      firstPlace: results[0]
    })
    return results
  }, [searchData])
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Display state:', {
      shouldSearch,
      isLoading,
      hasSearchData: !!searchData,
      placesCount: places.length,
      hasLocation: !!location,
      hasSearchParams: !!searchParams_query
    })
  }, [shouldSearch, isLoading, searchData, places.length, location, searchParams_query])

  // Calculate distance between two coordinates (Haversine formula) - Bỏ đi vì không cần location nữa
  // const calculateDistance = ...

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="bg-gradient-to-r from-pink-400 to-purple-500">
        <div className="space-y-3">
          {/* Location indicator (optional) */}
          {location && (
            <div className="flex items-center gap-2 text-sm /80">
              <EnvironmentOutlined />
              <span>現在地を利用して検索結果を最適化します</span>
              <span> ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</span>
            </div>
          )}
          
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                size="large"
                placeholder="場所を検索... (例: 公園、遊び場、レストラン)"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
              />
            </div>
            <Button
              type="primary"
              size="large"
              onClick={handleSearch}
              className="bg-cyan-400 hover:bg-cyan-500 border-0"
              loading={isLoading}
            >
              検索
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">検索結果</h1>
        
        <div className="flex gap-4">
          {/* Sort */}
          <Select value={sortBy} onChange={setSortBy} style={{ width: 180 }}>
            <Option value="distance">並べ替え: 距離が近い順</Option>
            <Option value="rating">並べ替え: 評価が高い順</Option>
            <Option value="newest">並べ替え: 新着順</Option>
          </Select>

          {/* Filter */}
          <Select value={filterType} onChange={setFilterType} style={{ width: 200 }}>
            <Option value="all">すべてのタイプ</Option>
            <Option value="playground">遊び場</Option>
            <Option value="park">公園</Option>
            <Option value="amusement_park">遊園地</Option>
            <Option value="zoo">動物園</Option>
            <Option value="aquarium">水族館</Option>
            <Option value="museum">博物館</Option>
            <Option value="restaurant">レストラン</Option>
            <Option value="cafe">カフェ</Option>
            <Option value="shopping_mall">ショッピングモール</Option>
          </Select>
        </div>
      </div>

      {/* Results List */}
      {!shouldSearch && !searchData ? (
        <Card>
          <div className="text-center py-8">
            <SearchOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              場所を検索してください
            </p>
            <p className="text-gray-400 text-sm">
              公園、遊び場、レストランなどを検索できます（半径1000m）
            </p>
          </div>
        </Card>
      ) : !location ? (
        <Card>
          <div className="text-center py-8">
            <EnvironmentOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              位置情報を許可してから検索してください
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">検索中...</p>
        </div>
      ) : places.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            検索結果が見つかりませんでした
          </p>
          <p className="text-center text-sm text-gray-400">
            別のフィルターを試してください
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {places.length}件の場所が見つかりました
          </div>
          {places.map((place: any) => {
            return (
              <Card key={place.place_id} className="hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-48 h-32 bg-gray-200 rounded shrink-0 flex items-center justify-center">
                    <span className="text-gray-400">Image</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {place.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <EnvironmentOutlined />
                          <span>{place.formatted_address}</span>
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-sm text-blue-600 font-medium">
                            📍 現在地から {place.distance}m
                          </div>
                          {place.duration !== undefined && place.duration > 0 && (
                            <div className="text-sm text-green-600 font-medium">
                              🚗 {place.duration >= 3600 
                                ? `${Math.floor(place.duration / 3600)}時間${Math.round((place.duration % 3600) / 60)}分`
                                : `${Math.round(place.duration / 60)}分`}
                            </div>
                          )}
                        </div>
                        {place.rating && (
                          <div className="text-sm">
                            <span className="text-yellow-500">⭐ {place.rating}</span>
                            {place.user_ratings_total && (
                              <span className="text-gray-500 ml-2">
                                ({place.user_ratings_total} レビュー)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      {place.types && place.types.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {place.types.slice(0, 3).map((type: string) => (
                            <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      type="primary"
                      className="w-full"
                      onClick={() => handleImportPlace(place)}
                    >
                      この場所を保存
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Copyright Footer */}
      <div className="text-center text-xs text-gray-500 py-4 border-t">
        © 2025 TheWeekend. All rights reserved.
      </div>

      {/* Import Modal */}
      <Modal
        title="この場所をデータベースに保存"
        open={isImportModalOpen}
        onOk={confirmImport}
        onCancel={() => {
          setIsImportModalOpen(false)
          setSelectedPlace(null)
        }}
        confirmLoading={importPlaceMutation.isPending}
        okText="保存"
        cancelText="キャンセル"
      >
        <div className="space-y-3">
          <p>この場所をデータベースに保存しますか？</p>
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-semibold text-lg">
              {selectedPlace?.name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedPlace?.formatted_address}
            </p>
            {selectedPlace?.types && (
              <div className="flex gap-2 flex-wrap mt-2">
                {selectedPlace.types.slice(0, 3).map((type: string) => (
                  <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {type}
                  </span>
                ))}
              </div>
            )}
            {selectedPlace?.rating && (
              <div className="mt-2 text-sm">
                <span className="text-yellow-500">⭐ {selectedPlace.rating}</span>
                {selectedPlace?.user_ratings_total && (
                  <span className="text-gray-500 ml-2">
                    ({selectedPlace.user_ratings_total} レビュー)
                  </span>
                )}
              </div>
            )}
            <div className="mt-2 text-sm text-blue-600">
              📍 現在地から {selectedPlace?.distance}m
            </div>
          </div>
          <p className="text-xs text-gray-500">
            ※ 保存後、この場所の詳細情報を編集できます（年齢範囲、料金など）
          </p>
        </div>
      </Modal>
    </div>
  )
}
