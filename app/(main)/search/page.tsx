'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Spin, message, Modal } from 'antd'
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiMapsAutocompleteOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

const { Option } = Select

// Generate UUID v4 for session token (per Goong API recommendation)
function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [sortBy, setSortBy] = useState('relevant')
  const [searchText, setSearchText] = useState('')
  const [sessionToken] = useState(() => generateSessionToken()) // Generate once per component mount
  
  // Location state (optional for Goong Autocomplete)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Query params for autocomplete
  const [autocompleteParams, setAutocompleteParams] = useState<{
    input: string
    location?: string
    limit?: string
    radius?: string
  } | null>(null)
  
  // Use generated hook for autocomplete
  const { data: autocompleteData, isLoading: isSearching } = useQuery({
    ...getApiMapsAutocompleteOptions({
      query: autocompleteParams as any,
    }),
    enabled: !!autocompleteParams,
  })

  // Read search query from URL params on mount
  useEffect(() => {
    const qParam = searchParams.get('q')
    if (qParam) {
      console.log('📖 Reading search query from URL:', qParam)
      setSearchText(qParam)
      // Auto-trigger search when location is available
      if (location) {
        handleSearch(qParam)
      }
    }
  }, [searchParams, location])

  // Get user location (optional - for location biased search)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
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

  // Search function using generated hook
  const handleSearchAPI = (keyword: string) => {
    if (!keyword || keyword.trim() === '') {
      setAutocompleteParams(null)
      return
    }

    const params: any = {
      input: keyword.trim(),
      limit: '20',
      sessiontoken: sessionToken, // Add session token to group requests
    }

    // Add location bias if available
    if (location && location.lat !== 0 && location.lng !== 0) {
      params.location = `${location.lat},${location.lng}`
      params.radius = '50' // 50km radius
    }

    setAutocompleteParams(params)
  }

  // Update predictions when data changes
  useEffect(() => {
    if (autocompleteData) {
      console.log('🔍 Autocomplete response:', autocompleteData)
    }
  }, [autocompleteData])

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

  // Get predictions from query data
  const predictions = autocompleteData?.predictions || []

  // Sort predictions
  const sortedPredictions = useMemo(() => {
    const sorted = [...predictions]
    
    if (sortBy === 'rating') {
      // Goong doesn't provide rating in autocomplete, keep original order
      return sorted
    }
    
    return sorted
  }, [predictions, sortBy])

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Bar with Back Button and Search */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          size="large"
          onClick={() => router.push('/dashboard')}
        >
          ← 戻る
        </Button>
        
        <div className="flex-1 flex gap-3">
          <Input
            size="large"
            placeholder="場所を検索... (例: 公園、遊び場、レストラン)"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearchClick}
            className="flex-1"
          />
          <Button
            type="primary"
            size="large"
            onClick={handleSearchClick}
            className="bg-blue-500 hover:bg-blue-600 border-0"
            loading={isSearching}
          >
            検索
          </Button>
        </div>
      </div>

      {/* Search Result Header - Pink Box */}
      <div className="bg-linear-to-r from-pink-400 to-purple-400 rounded-lg p-8 text-white text-center">
        <h1 className="text-3xl font-bold">検索結果</h1>
      </div>

      {/* Filters and Sort Section */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-gray-700 font-medium">並び替え:</span>
          <Select 
            value={sortBy} 
            onChange={setSortBy} 
            style={{ width: 200 }}
            size="large"
          >
            <Option value="relevant">最も関連度の高い</Option>
            <Option value="newest">新着順</Option>
            <Option value="rating">評価順</Option>
            <Option value="price">料金順</Option>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <Button size="large">
            フィルター
          </Button>
          <div className="flex gap-2">
            <Button size="large">屋内</Button>
            <Button size="large">屋外</Button>
          </div>
        </div>
      </div>

      {/* Results List */}
      {isSearching ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">検索中...</p>
        </div>
      ) : sortedPredictions.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <SearchOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              検索結果が見つかりませんでした
            </p>
            <p className="text-gray-400 text-sm">
              別のキーワードやフィルターを試してください
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPredictions.map((prediction: any) => {
            return (
              <Card 
                key={prediction.place_id} 
                className="hover:shadow-xl transition-shadow border border-gray-200"
                bodyStyle={{ padding: 0 }}
              >
                <div className="flex gap-0">
                  {/* Image */}
                  <div 
                    className="w-64 h-48 bg-gray-300 shrink-0 flex items-center justify-center cursor-pointer"
                    onClick={() => router.push(`/places/${encodeURIComponent(prediction.place_id)}`)}
                  >
                    <span className="text-gray-500 text-4xl font-bold">Image</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <h3 
                        className="text-2xl font-bold text-gray-900 mb-3 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => router.push(`/places/${encodeURIComponent(prediction.place_id)}`)}
                      >
                        {prediction.structured_formatting?.main_text || prediction.description}
                      </h3>
                      
                      <div className="flex items-start gap-2 text-base text-gray-700 mb-3">
                        <EnvironmentOutlined className="text-lg mt-1" />
                        <span>{prediction.description}</span>
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      block
                      className="mt-4 bg-pink-500 hover:bg-pink-600 border-0 text-lg h-12"
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

      {/* Copyright Footer */}
      <div className="text-center text-xs text-gray-500 py-8 border-t mt-8">
        © 2025 TheWeekend. All rights reserved.
      </div>
    </div>
  )
}
