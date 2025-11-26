'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Spin, message, Modal, AutoComplete, List } from 'antd'
import { SearchOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiMapsV2AutocompleteOptions } from '@/lib/api/generated-openAPI/@tanstack/react-query.gen'

const { Option } = Select

// Generate UUID v4 for session token (per Goong API recommendation)
function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [searchText, setSearchText] = useState('')
  const [sessionToken] = useState(() => generateSessionToken()) // Generate once per component mount
  const [searchRadius, setSearchRadius] = useState<string>('50') // Default 50km radius
  
  // Debounced search states
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<any>(null)

  // Location state (optional for Goong Autocomplete)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

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

  // Read search query from URL params on mount
  useEffect(() => {
    const qParam = searchParams.get('q')
    if (qParam) {
      console.log('📖 Reading search query from URL:', qParam)
      setSearchText(qParam)
      setDebouncedSearchText(qParam)
      // Auto-trigger search
      handleSearchAPI(qParam)
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

  // Get predictions from API (already filtered and sorted by relevance)
  const results = predictions

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

        <div className="flex-1 flex gap-3 relative">
          {/* Search Input with Suggestions Dropdown */}
          <div className="flex-1 relative">
            <Input
              ref={searchInputRef}
              size="large"
              placeholder="場所を検索... (例: 公園、遊び場、レストラン)"
              prefix={<SearchOutlined />}
              suffix={
                (isTyping || isFetching) && searchText.length >= 2 ? (
                  <Spin size="small" />
                ) : null
              }
              value={searchText}
              onChange={(e) => handleInputChange(e.target.value)}
              onPressEnter={handleSearchClick}
              className="w-full"
              autoComplete="off"
            />
          </div>
          
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
        {searchText && (
          <div className="mt-2 text-pink-100">
            「{searchText}」の検索結果 
            {searchData?.predictions && (
              <span className="ml-2">({searchData.predictions.length}件)</span>
            )}
          </div>
        )}
      </div>

      {/* API Supported Filters */}
      <div className="flex justify-start items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-700 font-medium">検索範囲:</span>
          <Select
            value={searchRadius}
            onChange={setSearchRadius}
            style={{ width: 150 }}
            size="large"
            disabled={!location || (location.lat === 0 && location.lng === 0)}
          >
            <Option value="1">1km</Option>
            <Option value="5">5km</Option>
            <Option value="10">10km</Option>
            <Option value="25">25km</Option>
            <Option value="50">50km</Option>
            <Option value="100">100km</Option>
          </Select>
          {(!location || (location.lat === 0 && location.lng === 0)) && (
            <span className="text-gray-400 text-sm">位置情報が必要です</span>
          )}
        </div>
      </div>

      {/* Results List */}
      {isSearching ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">検索中...</p>
        </div>
      ) : results.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <SearchOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              検索結果が見つかりませんでした
            </p>
            <p className="text-gray-400 text-sm">
              別のキーワードを試してください
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((prediction: any) => {
            return (
              <Card
                key={prediction.place_id}
                className="hover:shadow-xl transition-shadow border border-gray-200"
                bodyStyle={{ padding: 0 }}
              >
                <div className="flex gap-0">
                  {/* Image Placeholder */}
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
                        <span>{prediction.structured_formatting?.secondary_text || prediction.description}</span>
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
